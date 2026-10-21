// The repair lifecycle: check & quote → pay → part money → repair → confirm →
// repair fee → warranty, plus disputes, refunds and every wrong-state/wrong-person attempt.
import { Db, DENIED, expectFail, OTHER_VALID_IMEI, User, VALID_IMEI } from './harness'

let db: Db
let admin: User, tech: User
beforeAll(async () => {
  db = await Db.fresh()
  admin = await db.admin()
  tech = await db.technician({
    admin,
    services: [['smartphone', 'screen_replacement', 500_000], ['smartphone', 'battery_replacement', 500_000],
      ['smartphone', 'water_damage', 800_000], ['laptop', 'screen_replacement', 800_000]],
  })
})
afterAll(async () => { await db.close() })

describe('the full happy path', () => {
  test('book → accept → check & quote → pay → part money → repair → confirm → repair fee → review', async () => {
    const c = await db.customer()
    const job = await db.book(c, tech, { grade: 'high' })  // iPhone X, JK ₦25,000
    await db.as(tech).rpc('accept_job', [job.id])

    // Phones are shared once accepted so the device can be collected.
    const accepted = await db.as(c).one('get_job', [job.id])
    expect(accepted.technician.phone).toBeTruthy()

    const quoted = await db.quote(tech, job.id)
    expect(quoted).toMatchObject({ status: 'quoted', price_confirmed: true, part_kobo: 2_500_000, labour_kobo: 500_000,
      commission_kobo: 300_000, price_kobo: 3_300_000, payout_kobo: 3_000_000, intake_identifier: VALID_IMEI })

    // The customer sees the part and one service charge, never the split.
    const view = await db.as(c).one('get_job', [job.id])
    expect(view.breakdown).toMatchObject({ part_kobo: 2_500_000, part_label: 'JK', grade_label: 'High quality',
      service_charge_kobo: 800_000, total_kobo: 3_300_000, price_confirmed: true, warranty_days: 14 })
    for (const hidden of ['labour_kobo', 'commission_kobo', 'payout_kobo', 'payout_status', 'part_payout_status']) {
      expect(view.job).not.toHaveProperty(hidden)
    }
    expect(view.payment_account.account_name).toContain('UrbanFix')
    const techView = await db.as(tech).one('get_job', [job.id])
    expect(techView.job).not.toHaveProperty('commission_kobo')
    expect(techView.job.payout_kobo).toBe(3_000_000)
    expect(techView.payment_account).toBeNull()

    await db.as(c).rpc('submit_payment', [job.id, 'Ada Obi GTB 33,000'])
    const paid = await db.as(admin).one('admin_confirm_payment', [job.id])
    expect(paid).toMatchObject({ status: 'in_repair', part_payout_status: 'due', payout_status: 'not_due' })
    expect(Number((await db.as(tech).one('my_earnings')).due_kobo)).toBe(2_500_000)  // the part money

    const partPaid = await db.as(admin).one('admin_mark_part_payout_paid', [job.id, 'GTB-PART-1'])
    expect(partPaid.part_payout_status).toBe('paid')
    await expectFail(db.as(admin).rpc('admin_mark_part_payout_paid', [job.id, 'GTB-PART-1']), 'No part money is due')

    await db.as(tech).upload('job-photos', `${job.id}/after.jpg`)
    await db.as(tech).rpc('mark_ready', [job.id, 'Replaced the screen with JK, tested touch', 'Screen (JK)', [`${job.id}/after.jpg`]])
    const done = await db.as(c).one('confirm_completion', [job.id])
    expect(done).toMatchObject({ status: 'completed', completed_by: 'customer', payout_status: 'due' })
    const days = (new Date(done.warranty_until).getTime() - new Date(done.completed_at).getTime()) / 86400_000
    expect(Math.round(days)).toBe(14)

    const earnings = await db.as(tech).one('my_earnings')
    expect(Number(earnings.due_kobo)).toBe(500_000)
    expect(Number(earnings.paid_kobo)).toBe(2_500_000)

    await db.as(admin).rpc('admin_mark_payout_paid', [job.id, 'GTB-FEE-1'])
    expect(Number((await db.as(tech).one('my_earnings')).paid_kobo)).toBe(3_000_000)
    await db.as(c).rpc('submit_review', [job.id, 5, 'Honest price'])

    const events = (await db.as(c).one('get_job', [job.id])).events.map((e: any) => e.to_status)
    expect(events).toEqual(['requested', 'accepted', 'quoted', 'payment_submitted', 'in_repair', 'in_repair',
      'awaiting_confirmation', 'completed', 'completed'])
  })
})

describe('every action is refused in the wrong state or by the wrong person', () => {
  const stages = ['requested', 'accepted', 'quoted', 'payment_submitted', 'in_repair', 'awaiting_confirmation',
    'completed', 'warranty', 'cancelled'] as const

  async function jobAt(stage: (typeof stages)[number]) {
    const c = await db.customer()
    switch (stage) {
      case 'requested': return { c, job: await db.book(c, tech) }
      case 'accepted': { const j = await db.book(c, tech); return { c, job: await db.as(tech).one('accept_job', [j.id]) } }
      case 'quoted': return { c, job: await db.quotedJob(c, tech) }
      case 'payment_submitted': { const j = await db.quotedJob(c, tech); return { c, job: await db.as(c).one('submit_payment', [j.id, 'Ada transfer']) } }
      case 'in_repair': return { c, job: await db.paidJob(c, tech, admin) }
      case 'awaiting_confirmation': return { c, job: await db.readyJob(c, tech, admin) }
      case 'completed': return { c, job: await db.completedJob(c, tech, admin) }
      case 'warranty': { const j = await db.completedJob(c, tech, admin); return { c, job: await db.as(c).one('claim_warranty', [j.id, 'Screen stopped responding']) } }
      case 'cancelled': { const j = await db.book(c, tech); return { c, job: await db.as(c).one('cancel_job', [j.id, null]) } }
    }
  }

  const actions = (id: string): [string, string, unknown[], string[]][] => [
    ['technician', 'accept_job', [id], ['requested']],
    ['technician', 'decline_job', [id, null], ['requested']],
    ['technician', 'record_intake', [id, VALID_IMEI, null, [`${id}/a.jpg`]], ['accepted']],
    ['customer', 'submit_payment', [id, 'Ada transfer'], ['quoted']],
    ['customer', 'decline_quote', [id, null], ['quoted']],
    ['admin', 'admin_confirm_payment', [id], ['payment_submitted']],
    ['admin', 'admin_reject_payment', [id, 'Not received'], ['payment_submitted']],
    ['technician', 'mark_ready', [id, 'Fixed the screen', null, [`${id}/b.jpg`]], ['in_repair', 'warranty']],
    ['customer', 'confirm_completion', [id], ['awaiting_confirmation']],
    ['customer', 'raise_dispute', [id, 'Screen still flickers after repair'], ['payment_submitted', 'in_repair', 'awaiting_confirmation', 'warranty']],
    ['customer', 'claim_warranty', [id, 'Screen died after three days'], ['completed']],
    ['admin', 'admin_resolve_dispute', [id, 'release', 'Technician fixed it properly', null], []],
    ['admin', 'admin_mark_payout_paid', [id, 'GTB-REF-0001'], ['completed', 'warranty']],
    ['customer', 'submit_review', [id, 5, null], ['completed']],
  ]

  test.each(stages)('at "%s"', async (stage) => {
    const { c, job } = await jobAt(stage)
    const who: Record<string, User> = { customer: c, technician: tech, admin }
    for (const [role, fn, args, allowed] of actions(job.id)) {
      for (const [other, u] of Object.entries(who)) {
        if (other !== role) await expectFail(db.as(u).rpc(fn, args), /Only (the|an)|Repair not found/)
      }
      if (!allowed.includes(stage)) {
        await expectFail(db.as(who[role]!).rpc(fn, args), /This repair is|isn't due|Add at least|photo|didn't finish|Wait for the technician/)
      }
    }
    expect((await db.job(job.id)).status).toBe(stage)
  })
})

describe('checking the device and confirming the price', () => {
  test('customers cannot pay before the technician confirms the price', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j.id])
    await expectFail(db.as(c).rpc('submit_payment', [j.id, 'Ada transfer']), 'Wait for the technician')
  })

  test('wrong model picked by the customer: technician corrects it and the price list re-prices it', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech, { model: 'iPhone X', grade: 'premium' })  // ₦37,000
    await db.as(tech).rpc('accept_job', [j.id])
    const q = await db.quote(tech, j.id, { model: 'iPhone 13 Pro Max' })  // premium ₦85,000
    expect(q).toMatchObject({ model: 'iPhone 13 Pro Max', part_kobo: 8_500_000, estimate_kobo: 4_550_000 })
    expect(q.price_kobo).toBe(8_500_000 + 500_000 + 600_000)
  })

  test('technicians cannot override a listed part price', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j.id])
    const q = await db.quote(tech, j.id, { partKobo: 99_000_000 })
    expect(q.part_kobo).toBe(3_700_000)
  })

  test('unlisted part: technician must enter a sensible price', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech, { model: 'iPhone 16 Pro Max', grade: 'premium' })
    await db.as(tech).rpc('accept_job', [j.id])
    await expectFail(db.quote(tech, j.id), 'Enter the part price')
    await expectFail(db.quote(tech, j.id, { partKobo: 10_000 }), 'between ₦500')
    await expectFail(db.quote(tech, j.id, { partKobo: 300_000_000 }), 'between ₦500')
    await expectFail(db.quote(tech, j.id, { partKobo: 1_500_050 }), 'whole naira')
    const q = await db.quote(tech, j.id, { partKobo: 15_000_000 })
    expect(q).toMatchObject({ part_kobo: 15_000_000, part_label: 'Priced by technician', commission_kobo: 900_000, part_pending: false })
  })

  test('changing the problem uses the technician\'s fee for the new repair, and only repairs they offer', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j.id])
    await expectFail(db.quote(tech, j.id, { category: 'camera' }), 'Add this repair to your prices')
    await expectFail(db.quote(tech, j.id, { category: 'teleport' }), 'Unknown repair')
    const q = await db.quote(tech, j.id, { category: 'water_damage', partKobo: 0 })
    expect(q).toMatchObject({ category: 'water_damage', labour_kobo: 800_000, part_kobo: 0, grade: null })
  })

  test('the customer can decline the price and get the device back', async () => {
    const c = await db.customer()
    const q = await db.quotedJob(c, tech)
    const d = await db.as(c).one('decline_quote', [q.id, 'Too expensive for me'])
    expect(d).toMatchObject({ status: 'cancelled', status_note: 'Price declined: Too expensive for me' })
  })

  test('admin rejecting a payment claim sends it back to the confirmed price', async () => {
    const c = await db.customer()
    const q = await db.quotedJob(c, tech)
    await db.as(c).rpc('submit_payment', [q.id, 'Ada Obi Kuda'])
    const back = await db.as(admin).one('admin_reject_payment', [q.id, 'No transfer with that name arrived'])
    expect(back).toMatchObject({ status: 'quoted', payment_reference: null })
    await db.as(c).rpc('submit_payment', [q.id, 'Ada Obi Kuda again'])
    expect((await db.as(admin).one('admin_confirm_payment', [q.id])).status).toBe('in_repair')
  })
})

describe('device evidence', () => {
  test('IMEI must pass the checksum; serial numbers are accepted', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j.id])
    await db.as(tech).upload('job-photos', `${j.id}/i.jpg`)
    const call = (id: string) => db.as(tech).rpc('record_intake', [j.id, id, null, [`${j.id}/i.jpg`]])
    await expectFail(call('490154203237519'), 'IMEI doesn\'t look right')
    await expectFail(call('000000000000000'), 'real IMEI')
    await expectFail(call('C02X;DROP TABLE'), '4 to 30')
    expect((await db.as(tech).one('record_intake', [j.id, 'c02x-1234abcd', null, [`${j.id}/i.jpg`]])).intake_identifier).toBe('C02X-1234ABCD')
  })

  test('photos: required, max 4, no duplicates, really uploaded to this job by this technician', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j.id])
    const other = await db.book(await db.customer(), tech)
    await db.as(tech).rpc('accept_job', [other.id])
    await db.as(tech).upload('job-photos', `${other.id}/x.jpg`)
    for (const n of [1, 2, 3, 4, 5]) await db.as(tech).upload('job-photos', `${j.id}/p${n}.jpg`)
    const intake = (photos: unknown) => db.as(tech).rpc('record_intake', [j.id, VALID_IMEI, null, photos])
    await expectFail(intake([]), 'at least one photo')
    await expectFail(intake([1, 2, 3, 4, 5].map((n) => `${j.id}/p${n}.jpg`)), 'at most 4')
    await expectFail(intake([`${j.id}/p1.jpg`, `${j.id}/p1.jpg`]), 'twice')
    await expectFail(intake([`${other.id}/x.jpg`]), 'Invalid photo')
    await expectFail(intake([`${j.id}/never-uploaded.jpg`]), 'didn\'t finish uploading')
    await expectFail(intake(['https://evil.example.com/fake.jpg']), 'Invalid photo')
  })

  test('uploads only by the job\'s technician, only while checking, repairing or fixing under warranty', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await expectFail(db.as(tech).upload('job-photos', `${j.id}/early.jpg`), DENIED)
    await db.as(tech).rpc('accept_job', [j.id])
    await expect(db.as(tech).upload('job-photos', `${j.id}/ok.jpg`)).resolves.toHaveLength(1)
    await expectFail(db.as(c).upload('job-photos', `${j.id}/fake.jpg`), DENIED)
    await expectFail(db.as(await db.technician({ admin })).upload('job-photos', `${j.id}/fake.jpg`), DENIED)
    await expectFail(db.as(tech).upload('job-photos', `${j.id}/malware.exe`), DENIED)
    await db.quote(tech, j.id)
    await expectFail(db.as(tech).upload('job-photos', `${j.id}/while-quoted.jpg`), DENIED)
  })

  test('the recorded IMEI can\'t be changed afterwards', async () => {
    const c = await db.customer()
    const j = await db.quotedJob(c, tech)
    await expectFail(db.as(tech).rpc('record_intake', [j.id, OTHER_VALID_IMEI, null, [`${j.id}/intake-1.jpg`]]), 'This repair is quoted')
    expect((await db.job(j.id)).intake_identifier).toBe(VALID_IMEI)
  })

  test('completion needs a description and new photos', async () => {
    const c = await db.customer()
    const j = await db.paidJob(c, tech, admin)
    await db.as(tech).upload('job-photos', `${j.id}/after.jpg`)
    await expectFail(db.as(tech).rpc('mark_ready', [j.id, 'ok', null, [`${j.id}/after.jpg`]]), 'Describe what you fixed')
    await expectFail(db.as(tech).rpc('mark_ready', [j.id, 'Replaced screen', null, [`${j.id}/intake-1.jpg`]]), 'new photos')
    expect((await db.as(tech).one('mark_ready', [j.id, 'Replaced screen', '', [`${j.id}/after.jpg`]])).parts_replaced).toBe('None')
  })
})

describe('part money', () => {
  test('only due once the customer has paid, and only admins mark it sent', async () => {
    const c = await db.customer()
    const q = await db.quotedJob(c, tech)
    await expectFail(db.as(admin).rpc('admin_mark_part_payout_paid', [q.id, 'GTB-1234']), 'No part money is due')
    const p = await db.paidJob(await db.customer(), tech, admin)
    await expectFail(db.as(tech).rpc('admin_mark_part_payout_paid', [p.id, 'GTB-1234']), 'Only an UrbanFix admin')
    await expectFail(db.as(admin).rpc('admin_mark_part_payout_paid', [p.id, 'x']), 'transfer reference')
  })

  test('no part, no part payout', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j.id])
    await db.quote(tech, j.id, { category: 'water_damage', partKobo: 0 })
    await db.as(c).rpc('submit_payment', [j.id, 'Ada transfer'])
    expect((await db.as(admin).one('admin_confirm_payment', [j.id])).part_payout_status).toBe('not_due')
  })
})

describe('warranty', () => {
  test('one claim within the warranty; technician fixes it; repair fee isn\'t paid twice', async () => {
    const c = await db.customer()
    const j = await db.completedJob(c, tech, admin)
    await db.as(admin).rpc('admin_mark_payout_paid', [j.id, 'GTB-FEE-9'])
    await expectFail(db.as(c).rpc('claim_warranty', [j.id, 'bad']), 'at least 10')
    const w = await db.as(c).one('claim_warranty', [j.id, 'Touch stopped working on the left side'])
    expect(w.status).toBe('warranty')

    await db.as(tech).upload('job-photos', `${j.id}/warranty-fix.jpg`)
    const r = await db.as(tech).one('mark_ready', [j.id, 'Replaced faulty screen under warranty', null, [`${j.id}/warranty-fix.jpg`]])
    expect(r).toMatchObject({ status: 'awaiting_confirmation', warranty_notes: 'Replaced faulty screen under warranty',
      warranty_photos: [`${j.id}/warranty-fix.jpg`], completion_photos: [`${j.id}/done-1.jpg`] })

    const done = await db.as(c).one('confirm_completion', [j.id])
    expect(done).toMatchObject({ status: 'completed', payout_status: 'paid' })
    expect(new Date(done.warranty_until).getTime()).toBe(new Date(j.warranty_until).getTime())  // warranty doesn't restart
    await expectFail(db.as(c).rpc('claim_warranty', [j.id, 'It broke again after the fix']), 'already used the warranty')
  })

  test('no claims after the warranty ends', async () => {
    const c = await db.customer()
    const j = await db.completedJob(c, tech, admin)
    await db.root.query("UPDATE public.jobs SET warranty_until = now() - interval '1 minute' WHERE id = $1", [j.id])
    await expectFail(db.as(c).rpc('claim_warranty', [j.id, 'Screen died after three weeks']), 'warranty on this repair has ended')
  })

  test('standard parts get 7 days, high and premium 14, repairs without parts 7', async () => {
    const c = await db.customer()
    const t2 = await db.technician({ admin, services: [['smartphone', 'screen_replacement', 500_000], ['smartphone', 'software_issues', 400_000],
      ['smartphone', 'battery_replacement', 500_000]] })
    expect((await db.book(c, t2, { grade: 'standard' })).warranty_days).toBe(7)
    expect((await db.book(c, t2, { category: 'battery_replacement', model: 'iPhone 7', grade: 'premium' })).warranty_days).toBe(14)
    expect((await db.book(c, t2, { category: 'software_issues' })).warranty_days).toBe(7)
  })
})

describe('disputes and refunds', () => {
  test.each(['payment_submitted', 'in_repair', 'awaiting_confirmation', 'warranty'])('customer can raise an issue at %s', async (stage) => {
    const c = await db.customer()
    let j: any
    if (stage === 'payment_submitted') { j = await db.quotedJob(c, tech); await db.as(c).rpc('submit_payment', [j.id, 'Ada transfer']) }
    if (stage === 'in_repair') j = await db.paidJob(c, tech, admin)
    if (stage === 'awaiting_confirmation') j = await db.readyJob(c, tech, admin)
    if (stage === 'warranty') { j = await db.completedJob(c, tech, admin); await db.as(c).rpc('claim_warranty', [j.id, 'Battery swelling after repair']) }
    const d = await db.as(c).one('raise_dispute', [j.id, 'The technician never fixed it'])
    expect(d.status).toBe('disputed')
    await expectFail(db.as(tech).rpc('mark_ready', [j.id, 'Done now', null, []]), 'This repair is disputed')
  })

  test('refund keeps money already sent recorded as sent, and stops money not yet sent', async () => {
    const c = await db.customer()
    const j = await db.paidJob(c, tech, admin)
    await db.as(admin).rpc('admin_mark_part_payout_paid', [j.id, 'GTB-PART-7'])
    await db.as(c).rpc('raise_dispute', [j.id, 'Technician is not responding'])
    const r = await db.as(admin).one('admin_resolve_dispute', [j.id, 'refund', 'Refunding the customer', 'GTB-RFND-7'])
    expect(r).toMatchObject({ status: 'refunded', part_payout_status: 'paid', payout_status: 'not_due' })

    const c2 = await db.customer()
    const j2 = await db.paidJob(c2, tech, admin)
    await db.as(c2).rpc('raise_dispute', [j2.id, 'Technician is not responding'])
    const r2 = await db.as(admin).one('admin_resolve_dispute', [j2.id, 'refund', 'Refunding the customer', 'GTB-RFND-8'])
    expect(r2).toMatchObject({ part_payout_status: 'not_due', payout_status: 'not_due' })
  })

  test('release completes the job and starts the warranty', async () => {
    const c = await db.customer()
    const j = await db.readyJob(c, tech, admin)
    await db.as(c).rpc('raise_dispute', [j.id, 'I think the part is fake'])
    const rel = await db.as(admin).one('admin_resolve_dispute', [j.id, 'release', 'Part verified as GX', null])
    expect(rel).toMatchObject({ status: 'completed', completed_by: 'admin', payout_status: 'due' })
    expect(rel.warranty_until).toBeTruthy()
  })
})

describe('auto-release', () => {
  test('releases unconfirmed jobs after the window, starting the warranty', async () => {
    const old = await db.readyJob(await db.customer(), tech, admin)
    const recent = await db.readyJob(await db.customer(), tech, admin)
    await db.root.query("UPDATE public.jobs SET ready_at = now() - interval '73 hours' WHERE id = $1", [old.id])
    expect(await db.as(admin).one('admin_auto_release')).toBe(1)
    const o = await db.job(old.id)
    expect(o).toMatchObject({ status: 'completed', completed_by: 'auto', payout_status: 'due' })
    expect(o.warranty_until).toBeTruthy()
    expect((await db.job(recent.id)).status).toBe('awaiting_confirmation')
  })
})

describe('jobs paid before this update', () => {
  test('a job already paid under the old flow goes straight to repair at intake, keeping its price', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.root.query("UPDATE public.jobs SET status = 'paid', paid_at = now() WHERE id = $1", [j.id])
    await db.as(tech).upload('job-photos', `${j.id}/legacy.jpg`)
    const r = await db.as(tech).one('record_intake', [j.id, VALID_IMEI, null, [`${j.id}/legacy.jpg`]])
    expect(r).toMatchObject({ status: 'in_repair', price_kobo: j.price_kobo })
  })
})

describe('reviews', () => {
  test('one review per completed job, 1 to 5 stars', async () => {
    const c = await db.customer()
    const j = await db.readyJob(c, tech, admin)
    await expectFail(db.as(c).rpc('submit_review', [j.id, 5, null]), 'This repair is awaiting confirmation')
    await db.as(c).rpc('confirm_completion', [j.id])
    for (const bad of [0, 6, -1, null]) await expectFail(db.as(c).rpc('submit_review', [j.id, bad, null]), '1 to 5 stars')
    await db.as(c).rpc('submit_review', [j.id, 4, null])
    await expectFail(db.as(c).rpc('submit_review', [j.id, 1, 'changed my mind']), 'already rated')
  })
})
