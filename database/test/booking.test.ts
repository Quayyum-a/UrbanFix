import { Db, expectFail, User } from './harness'

let db: Db
let admin: User, tech: User
beforeAll(async () => {
  db = await Db.fresh()
  admin = await db.admin()
  tech = await db.technician({
    admin,
    services: [['smartphone', 'screen_replacement', 2_500_000], ['smartphone', 'battery_replacement', 1_500_000],
      ['laptop', 'screen_replacement', 8_000_000], ['tablet', 'screen_replacement', 3_000_000]],
  })
})
afterAll(async () => { await db.close() })

describe('find_technicians', () => {
  test('lists approved, available technicians offering the repair, with their price', async () => {
    const c = await db.customer()
    const rows = await db.as(c).rpc('find_technicians', ['smartphone', 'screen_replacement'])
    const me = rows.find((r) => r.technician_id === tech.id)
    expect(me).toMatchObject({ shop_name: 'Emeka Phone Clinic', price_kobo: 2_500_000, jobs_done: 0, used_before: false })
    expect(await db.as(c).rpc('find_technicians', ['desktop', 'power_supply'])).toHaveLength(0)
  })

  test('never lists suspended technicians or inactive services', async () => {
    const t2 = await db.technician({ admin, services: [['desktop', 'power_supply', 900_000]] })
    const c = await db.customer()
    const ids = async () => (await db.as(c).rpc('find_technicians', ['desktop', 'power_supply'])).map((r) => r.technician_id)
    expect(await ids()).toEqual([t2.id])
    await db.as(t2).rpc('save_service', ['desktop', 'power_supply', 900_000, false])
    expect(await ids()).toEqual([])
    await db.as(t2).rpc('save_service', ['desktop', 'power_supply', 900_000, true])
    await db.as(admin).rpc('admin_review_technician', [t2.id, false, 'Suspended for testing'])
    expect(await ids()).toEqual([])
  })
})

describe('create_job', () => {
  test('price, commission and payout come from the server, not the app', async () => {
    const c = await db.customer()
    const job = await db.book(c, tech)
    expect(job).toMatchObject({
      status: 'requested', customer_id: c.id, technician_id: tech.id,
      price_kobo: 2_500_000, commission_kobo: 250_000, payout_kobo: 2_250_000, is_repeat: false,
      service_mode: 'visit', brand: 'Samsung', model: 'Galaxy A54',
    })
    expect(job.code).toMatch(/^UF-[0-9A-F]{6}$/)
  })

  test('the price is locked at booking even if the technician changes it later', async () => {
    const c = await db.customer()
    const job = await db.book(c, tech, { category: 'battery_replacement' })
    await db.as(tech).rpc('save_service', ['smartphone', 'battery_replacement', 9_900_000, true])
    expect((await db.job(job.id)).price_kobo).toBe(1_500_000)
    await db.as(tech).rpc('save_service', ['smartphone', 'battery_replacement', 1_500_000, true])
  })

  test('drop-off needs no address and stores none; visit requires one', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech, { mode: 'drop_off', address: 'ignored even if sent' })
    expect(j.address).toBeNull()
    const c2 = await db.customer()
    await expectFail(db.book(c2, tech, { address: null }), 'address the technician should come to')
    await expectFail(db.book(c2, tech, { address: 'Ikeja' }), 'at least 10 characters')
    await expectFail(db.book(c2, tech, { mode: 'pickup_by_drone' }), 'Choose whether')
  })

  test('refuses repairs the technician does not offer, unknown technicians and bad device types', async () => {
    const c = await db.customer()
    await expectFail(db.book(c, tech, { device: 'desktop', category: 'power_supply' }), 'doesn\'t offer that repair')
    await expectFail(db.book(c, tech, { device: 'toaster' }), 'doesn\'t offer that repair')
    const fake = { id: '00000000-0000-0000-0000-000000000001', phone: '', email: '' }
    await expectFail(db.book(c, fake), 'isn\'t taking jobs')
  })

  test('cannot book unapproved, offline or suspended technicians', async () => {
    const c = await db.customer()
    const pending = await db.technician({ approve: false })
    await expectFail(db.book(c, pending), 'isn\'t taking jobs')
    const t = await db.technician({ admin })
    await db.as(t).rpc('set_availability', [false])
    await expectFail(db.book(c, t), 'isn\'t taking jobs')
  })

  test('only customers can book; technicians cannot book themselves', async () => {
    await expectFail(db.as(tech).rpc('create_job', [tech.id, 'smartphone', 'screen_replacement', null, null, null, 'drop_off', null]), 'Only the customer')
    await expectFail(db.as(admin).rpc('create_job', [tech.id, 'smartphone', 'screen_replacement', null, null, null, 'drop_off', null]), 'Only the customer')
    const unfinished = await db.authUser()
    await expectFail(db.as(unfinished).rpc('create_job', [tech.id, 'smartphone', 'screen_replacement', null, null, null, 'drop_off', null]), 'Finish setting up')
  })

  test('no duplicate open requests for the same repair with the same technician', async () => {
    const c = await db.customer()
    await db.book(c, tech)
    await expectFail(db.book(c, tech), 'already have this request open')
  })

  test('at most 3 open (unpaid) requests at a time', async () => {
    const c = await db.customer()
    await db.book(c, tech, { device: 'smartphone', category: 'screen_replacement' })
    await db.book(c, tech, { device: 'smartphone', category: 'battery_replacement' })
    await db.book(c, tech, { device: 'laptop', category: 'screen_replacement' })
    await expectFail(db.book(c, tech, { device: 'tablet', category: 'screen_replacement' }), 'You have 3 repairs waiting')
  })

  test('at most 10 bookings in 24 hours (spam protection)', async () => {
    const c = await db.customer()
    for (let i = 0; i < 10; i++) {
      const j = await db.book(c, tech)
      await db.as(c).rpc('cancel_job', [j.id, null])
    }
    await expectFail(db.book(c, tech), 'Too many bookings today')
  })

  test('validates free-text lengths', async () => {
    const c = await db.customer()
    const call = (brand: string, model: string, note: string) =>
      db.as(c).rpc('create_job', [tech.id, 'smartphone', 'screen_replacement', brand, model, note, 'drop_off', null])
    await expectFail(call('x'.repeat(41), '', ''), 'Brand is too long')
    await expectFail(call('', 'x'.repeat(61), ''), 'Model is too long')
    await expectFail(call('', '', 'x'.repeat(501)), 'under 500')
  })

  test('repeat customers get the lower commission', async () => {
    const c = await db.customer()
    const job = await db.readyJob(c, tech, admin)
    await db.as(c).rpc('confirm_completion', [job.id])
    const again = await db.book(c, tech, { category: 'battery_replacement' })
    expect(again).toMatchObject({ is_repeat: true, price_kobo: 1_500_000, commission_kobo: 75_000, payout_kobo: 1_425_000 })
    const listed = await db.as(c).rpc('find_technicians', ['smartphone', 'screen_replacement'])
    expect(listed[0]).toMatchObject({ technician_id: tech.id, used_before: true, jobs_done: 1 })
  })
})

describe('accept, decline and cancel', () => {
  test('technician accepts or declines only requests sent to them', async () => {
    const c = await db.customer()
    const other = await db.technician({ admin })
    const j1 = await db.book(c, tech)
    await expectFail(db.as(other).rpc('accept_job', [j1.id]), 'Repair not found')
    await expectFail(db.as(c).rpc('accept_job', [j1.id]), 'Only the technician')
    const accepted = await db.as(tech).one('accept_job', [j1.id])
    expect(accepted.status).toBe('accepted')
    await expectFail(db.as(tech).rpc('accept_job', [j1.id]), 'This repair is accepted')
    await expectFail(db.as(tech).rpc('decline_job', [j1.id, null]), 'This repair is accepted')
  })

  test('declined requests are final', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    const d = await db.as(tech).one('decline_job', [j.id, 'Out of stock for this model'])
    expect(d).toMatchObject({ status: 'declined', status_note: 'Out of stock for this model' })
    await expectFail(db.as(tech).rpc('accept_job', [j.id]), 'This repair is declined')
    await expectFail(db.as(c).rpc('submit_payment', [j.id, 'Ada transfer']), 'This repair is declined')
    await expectFail(db.as(c).rpc('send_message', [j.id, 'hello?']), 'closed')
  })

  test('customer can cancel before paying, not after', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    const cancelled = await db.as(c).one('cancel_job', [j.id, 'Fixed it myself'])
    expect(cancelled.status).toBe('cancelled')

    const j2 = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j2.id])
    await db.as(c).rpc('submit_payment', [j2.id, 'Ada Obi transfer'])
    await expectFail(db.as(c).rpc('cancel_job', [j2.id, null]), 'already sent payment')
    await db.as(admin).rpc('admin_confirm_payment', [j2.id])
    await expectFail(db.as(c).rpc('cancel_job', [j2.id, null]), 'This repair is paid')
  })

  test('technician can cancel an accepted job only with a reason, never after payment', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await expectFail(db.as(tech).rpc('cancel_job', [j.id, 'busy']), 'This repair is requested')
    await db.as(tech).rpc('accept_job', [j.id])
    await expectFail(db.as(tech).rpc('cancel_job', [j.id, null]), 'Tell the customer why')
    const done = await db.as(tech).one('cancel_job', [j.id, 'Part not available until next month'])
    expect(done.status).toBe('cancelled')
    const paid = await db.paidJob(await db.customer(), tech, admin)
    await expectFail(db.as(tech).rpc('cancel_job', [paid.id, 'Changed my mind']), 'This repair is paid')
  })

  test('strangers cannot cancel other people\'s jobs', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    const stranger = await db.customer()
    await expectFail(db.as(stranger).rpc('cancel_job', [j.id, null]), 'Repair not found')
  })
})
