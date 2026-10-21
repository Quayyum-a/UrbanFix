import { Db, expectFail, User } from './harness'

let db: Db
let admin: User, tech: User
// Repair fees (labour only) in kobo.
const LABOUR = 500_000
beforeAll(async () => {
  db = await Db.fresh()
  admin = await db.admin()
  tech = await db.technician({
    admin,
    services: [['smartphone', 'screen_replacement', LABOUR], ['smartphone', 'battery_replacement', 500_000],
      ['smartphone', 'software_issues', 400_000], ['smartphone', 'water_damage', 800_000],
      ['laptop', 'screen_replacement', 800_000], ['tablet', 'screen_replacement', 700_000]],
  })
})
afterAll(async () => { await db.close() })

describe('platform fee', () => {
  // ₦1,500 + 5% of the part, rounded up to ₦500, capped at ₦15,000; half for repeat customers.
  test.each([
    [0, false, 150_000], [800_000, false, 200_000], [1_400_000, false, 250_000], [3_700_000, false, 350_000],
    [8_500_000, false, 600_000], [15_000_000, false, 900_000], [100_000_000, false, 1_500_000], [800_000, true, 100_000],
  ])('part %d kobo, repeat %p → fee %d kobo', async (part, repeat, fee) => {
    const { rows } = await db.root.query('SELECT public._platform_fee($1, $2) AS f', [part, repeat])
    expect(rows[0].f).toBe(fee)
  })

  test('your example: iPhone 7 battery ₦8,000 + ₦5,000 repair + ₦2,000 = ₦15,000', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech, { model: 'iPhone 7', category: 'battery_replacement', grade: 'standard' })
    expect(j).toMatchObject({ part_kobo: 800_000, labour_kobo: 500_000, commission_kobo: 200_000, price_kobo: 1_500_000, payout_kobo: 1_300_000 })
  })

  test('fee settings are not changeable from the app', async () => {
    const c = await db.customer()
    for (const u of [c, tech, admin]) {
      await expectFail(db.as(u).sql('UPDATE public.settings SET fee_rate_bps = 0'), /permission denied/)
      await expectFail(db.as(u).sql('SELECT public._platform_fee(100, false)'), /permission denied/)
    }
  })
})

describe('grade_options', () => {
  test('lists the three grades with approved prices and part types', async () => {
    const c = await db.customer()
    const rows = await db.as(c).rpc('grade_options', [await db.modelId('iPhone X'), 'screen_replacement'])
    expect(rows.map((r) => [r.grade, r.label, r.market_label, r.part_kobo, r.warranty_days])).toEqual([
      ['standard', 'Standard', 'Incell', 1_400_000, 7],
      ['high', 'High quality', 'JK', 2_500_000, 14],
      ['premium', 'Premium', 'GX OLED', 3_700_000, 14],
    ])
  })

  test('unpriced models come back with empty prices', async () => {
    const c = await db.customer()
    const rows = await db.as(c).rpc('grade_options', [await db.modelId('iPhone 16 Pro Max'), 'screen_replacement'])
    expect(rows.map((r) => r.part_kobo)).toEqual([null, null, null])
  })
})

describe('find_technicians', () => {
  test('shows each technician the part, one service charge and the total for the exact model and grade', async () => {
    const c = await db.customer()
    const rows = await db.as(c).rpc('find_technicians', ['smartphone', 'screen_replacement', await db.modelId('iPhone X'), 'standard'])
    expect(rows.find((r) => r.technician_id === tech.id)).toMatchObject({
      part_kobo: 1_400_000, service_charge_kobo: LABOUR + 250_000, total_kobo: 1_400_000 + LABOUR + 250_000, part_pending: false,
    })
    // There is no field that splits the service charge into repair fee and UrbanFix fee.
    expect(Object.keys(rows[0])).not.toEqual(expect.arrayContaining(['labour_kobo']))
    expect(Object.keys(rows[0])).not.toEqual(expect.arrayContaining(['commission_kobo']))
  })

  test('unpriced part: total is the service charge, flagged as part pending', async () => {
    const c = await db.customer()
    const rows = await db.as(c).rpc('find_technicians', ['smartphone', 'screen_replacement', await db.modelId('iPhone 16 Pro Max'), 'premium'])
    expect(rows[0]).toMatchObject({ part_kobo: 0, service_charge_kobo: LABOUR + 150_000, part_pending: true })
  })

  test('repairs with no part are never pending', async () => {
    const c = await db.customer()
    const rows = await db.as(c).rpc('find_technicians', ['smartphone', 'software_issues', null, null])
    expect(rows[0]).toMatchObject({ part_kobo: 0, service_charge_kobo: 400_000 + 150_000, part_pending: false })
  })

  test('rejects made-up grades', async () => {
    const c = await db.customer()
    await expectFail(db.as(c).rpc('find_technicians', ['smartphone', 'screen_replacement', null, 'original']), 'part quality')
  })

  test('never lists suspended technicians or inactive services', async () => {
    const t2 = await db.technician({ admin, services: [['desktop', 'power_supply', 900_000]] })
    const c = await db.customer()
    const ids = async () => (await db.as(c).rpc('find_technicians', ['desktop', 'power_supply', null, 'standard'])).map((r) => r.technician_id)
    expect(await ids()).toEqual([t2.id])
    await db.as(t2).rpc('save_service', ['desktop', 'power_supply', 900_000, false])
    expect(await ids()).toEqual([])
    await db.as(t2).rpc('save_service', ['desktop', 'power_supply', 900_000, true])
    await db.as(admin).rpc('admin_review_technician', [t2.id, false, 'Suspended for testing'])
    expect(await ids()).toEqual([])
  })
})

describe('create_job', () => {
  test('price comes from the price list and the technician\'s fee; nothing comes from the app', async () => {
    const c = await db.customer()
    const job = await db.book(c, tech)
    expect(job).toMatchObject({
      status: 'requested', brand: 'iPhone', model: 'iPhone X', grade: 'premium', part_label: 'GX OLED',
      part_kobo: 3_700_000, labour_kobo: LABOUR, commission_kobo: 350_000, price_kobo: 4_550_000,
      payout_kobo: 4_200_000, estimate_kobo: 4_550_000, price_confirmed: false, part_pending: false, warranty_days: 14,
    })
    expect(job.code).toMatch(/^UF-[0-9A-F]{6}$/)
  })

  test('prices are locked at booking: later price-list or fee changes don\'t affect it', async () => {
    const c = await db.customer()
    const job = await db.book(c, tech)
    await db.as(admin).rpc('admin_set_part_price', [await db.modelId('iPhone X'), 'screen_replacement', 'premium', 9_900_000, 'GX OLED'])
    await db.as(tech).rpc('save_service', ['smartphone', 'screen_replacement', 2_000_000, true])
    expect((await db.job(job.id)).price_kobo).toBe(4_550_000)
    await db.as(admin).rpc('admin_set_part_price', [await db.modelId('iPhone X'), 'screen_replacement', 'premium', 3_700_000, 'GX OLED'])
    await db.as(tech).rpc('save_service', ['smartphone', 'screen_replacement', LABOUR, true])
  })

  test('unlisted model: typed name, part priced after inspection', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech, { brand: 'other_android', model: null, modelText: 'Oppo A78' })
    expect(j).toMatchObject({ brand: 'Other Android', model: 'Oppo A78', model_id: null, part_kobo: 0, part_pending: true, price_kobo: LABOUR + 150_000 })
  })

  test('no-part repairs ignore any grade sent', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech, { category: 'software_issues', grade: 'premium' })
    expect(j).toMatchObject({ grade: null, part_kobo: 0, part_pending: false, warranty_days: 7 })
  })

  test.each([
    [{ brand: 'nokia', model: null, modelText: 'Nokia 105' }, 'device brand'],
    [{ brand: 'samsung', model: 'iPhone X' }, ''],
    [{ model: null, modelText: '' }, 'model name'],
    [{ model: null, modelText: 'x'.repeat(61) }, 'model name'],
    [{ grade: null }, 'part quality'],
    [{ grade: 'original' }, 'part quality'],
    [{ category: 'teleport' }, 'what\'s wrong'],
    [{ device: 'laptop', brand: 'iphone', model: null, modelText: 'Some laptop' }, 'device brand'],
  ])('rejects %p', async (over, msg) => {
    const c = await db.customer()
    await expectFail(db.book(c, tech, over as never), msg ? msg : /model from the list|No model/)
  })

  test('a model id from another brand or device type is refused', async () => {
    const c = await db.customer()
    const samsung = await db.modelId('Galaxy A54', 'smartphone', 'samsung')
    await expectFail(db.as(c).rpc('create_job', [tech.id, 'smartphone', 'iphone', samsung, null, 'screen_replacement', 'standard', null, 'drop_off', null]),
      'model from the list')
    const mac = await db.modelId('MacBook Air (M1 or newer)', 'laptop', 'macbook')
    await expectFail(db.as(c).rpc('create_job', [tech.id, 'smartphone', 'iphone', mac, null, 'screen_replacement', 'standard', null, 'drop_off', null]),
      'model from the list')
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

  test('refuses repairs the technician does not offer and unavailable technicians', async () => {
    const c = await db.customer()
    await expectFail(db.book(c, tech, { device: 'desktop', brand: 'hp', model: 'HP All-in-One', category: 'power_supply' }), 'doesn\'t offer that repair')
    const pending = await db.technician({ approve: false })
    await expectFail(db.book(c, pending), 'isn\'t taking jobs')
    const t = await db.technician({ admin })
    await db.as(t).rpc('set_availability', [false])
    await expectFail(db.book(c, t), 'isn\'t taking jobs')
  })

  test('only customers can book', async () => {
    const args = [tech.id, 'smartphone', 'iphone', null, 'iPhone X', 'screen_replacement', 'standard', null, 'drop_off', null]
    await expectFail(db.as(tech).rpc('create_job', args), 'Only the customer')
    await expectFail(db.as(admin).rpc('create_job', args), 'Only the customer')
  })

  test('limits: no duplicates, 3 open requests, 10 a day', async () => {
    const c = await db.customer()
    await db.book(c, tech)
    await expectFail(db.book(c, tech), 'already have this request open')
    await db.book(c, tech, { category: 'battery_replacement', grade: 'standard' })
    await db.book(c, tech, { category: 'software_issues' })
    await expectFail(db.book(c, tech, { category: 'water_damage' }), 'You have 3 repairs waiting')

    const c2 = await db.customer()
    for (let i = 0; i < 10; i++) {
      const j = await db.book(c2, tech)
      await db.as(c2).rpc('cancel_job', [j.id, null])
    }
    await expectFail(db.book(c2, tech), 'Too many bookings today')
  })

  test('quoted jobs count as open requests', async () => {
    const c = await db.customer()
    await db.quotedJob(c, tech)
    await expectFail(db.book(c, tech), 'already have this request open')
  })

  test('repeat customers get half the UrbanFix fee', async () => {
    const c = await db.customer()
    await db.completedJob(c, tech, admin)
    const again = await db.book(c, tech, { model: 'iPhone 7', category: 'battery_replacement', grade: 'standard' })
    expect(again).toMatchObject({ is_repeat: true, part_kobo: 800_000, commission_kobo: 100_000, price_kobo: 1_400_000 })
  })
})

describe('accept, decline and cancel', () => {
  test('technician accepts or declines only their own requests', async () => {
    const c = await db.customer()
    const other = await db.technician({ admin })
    const j = await db.book(c, tech)
    await expectFail(db.as(other).rpc('accept_job', [j.id]), 'Repair not found')
    await expectFail(db.as(c).rpc('accept_job', [j.id]), 'Only the technician')
    expect((await db.as(tech).one('accept_job', [j.id])).status).toBe('accepted')
    await expectFail(db.as(tech).rpc('accept_job', [j.id]), 'This repair is accepted')
  })

  test('declined requests are final', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    const d = await db.as(tech).one('decline_job', [j.id, 'Out of stock for this model'])
    expect(d).toMatchObject({ status: 'declined', status_note: 'Out of stock for this model' })
    await expectFail(db.as(tech).rpc('accept_job', [j.id]), 'This repair is declined')
    await expectFail(db.as(c).rpc('send_message', [j.id, 'hello?']), 'closed')
  })

  test('customer can cancel until they pay', async () => {
    const c = await db.customer()
    for (const stage of ['requested', 'accepted', 'quoted']) {
      const j = await db.book(c, tech)
      if (stage !== 'requested') await db.as(tech).rpc('accept_job', [j.id])
      if (stage === 'quoted') await db.quote(tech, j.id)
      expect((await db.as(c).one('cancel_job', [j.id, null])).status).toBe('cancelled')
    }
    const j = await db.quotedJob(c, tech)
    await db.as(c).rpc('submit_payment', [j.id, 'Ada Obi transfer'])
    await expectFail(db.as(c).rpc('cancel_job', [j.id, null]), 'already sent payment')
  })

  test('technician can cancel after accepting (with a reason) but not after payment', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await expectFail(db.as(tech).rpc('cancel_job', [j.id, 'busy now']), 'This repair is requested')
    await db.as(tech).rpc('accept_job', [j.id])
    await expectFail(db.as(tech).rpc('cancel_job', [j.id, null]), 'Tell the customer why')
    expect((await db.as(tech).one('cancel_job', [j.id, 'Part not available until next month'])).status).toBe('cancelled')
    const paid = await db.paidJob(await db.customer(), tech, admin)
    await expectFail(db.as(tech).rpc('cancel_job', [paid.id, 'Changed my mind']), 'This repair is in repair')
  })

  test('strangers cannot cancel other people\'s jobs', async () => {
    const j = await db.book(await db.customer(), tech)
    await expectFail(db.as(await db.customer()).rpc('cancel_job', [j.id, null]), 'Repair not found')
  })
})
