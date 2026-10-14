// Payment (admin-confirmed escrow), device intake, repair evidence,
// confirmation, disputes, payouts and reviews.
import { Db, DENIED, expectFail, OTHER_VALID_IMEI, User, VALID_IMEI } from './harness'

let db: Db
let admin: User, tech: User
beforeAll(async () => {
  db = await Db.fresh()
  admin = await db.admin()
  tech = await db.technician({ admin })
})
afterAll(async () => { await db.close() })

const ALL_ACTIONS = (jobId: string): [string, string, unknown[]][] => [
  ['technician', 'accept_job', [jobId]],
  ['technician', 'decline_job', [jobId, null]],
  ['customer', 'submit_payment', [jobId, 'Ada transfer']],
  ['admin', 'admin_confirm_payment', [jobId]],
  ['admin', 'admin_reject_payment', [jobId, 'Not received']],
  ['technician', 'record_intake', [jobId, VALID_IMEI, null, [`${jobId}/a.jpg`]]],
  ['technician', 'mark_ready', [jobId, 'Fixed the screen', null, [`${jobId}/b.jpg`]]],
  ['customer', 'confirm_completion', [jobId]],
  ['customer', 'raise_dispute', [jobId, 'Screen still flickers after repair']],
  ['admin', 'admin_resolve_dispute', [jobId, 'release', 'Technician fixed it properly', null]],
  ['admin', 'admin_mark_payout_paid', [jobId, 'GTB-REF-0001']],
  ['customer', 'submit_review', [jobId, 5, null]],
]

describe('the full happy path', () => {
  test('book → accept → pay → confirm → intake → repair → confirm → payout → review, with an audit trail', async () => {
    const c = await db.customer()
    const job = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [job.id])

    // Customer sees UrbanFix's bank account, not the technician's.
    const view = await db.as(c).one('get_job', [job.id])
    expect(view.payment_account.account_name).toContain('UrbanFix')
    expect(view.technician.phone).toBeNull() // no phone numbers before payment
    expect(view.customer.phone).toBeNull()

    await db.as(c).rpc('submit_payment', [job.id, 'Ada Obi GTB 25,000'])
    const paid = await db.as(admin).one('admin_confirm_payment', [job.id])
    expect(paid.status).toBe('paid')

    const afterPay = await db.as(tech).one('get_job', [job.id])
    expect(afterPay.customer.phone).toBe(c.phone)
    expect(afterPay.payment_account).toBeNull() // technicians never see the escrow account

    await db.as(tech).upload('job-photos', `${job.id}/front.jpg`)
    await db.as(tech).upload('job-photos', `${job.id}/back.jpg`)
    const intake = await db.as(tech).one('record_intake', [job.id, ' 4901 5420 3237 518 ', 'Cracked top-left', [`${job.id}/front.jpg`, `${job.id}/back.jpg`]])
    expect(intake).toMatchObject({ status: 'in_repair', intake_identifier: VALID_IMEI })

    await db.as(tech).upload('job-photos', `${job.id}/after.jpg`)
    const ready = await db.as(tech).one('mark_ready', [job.id, 'Replaced the screen, tested touch and display', 'Screen assembly', [`${job.id}/after.jpg`]])
    expect(ready.status).toBe('awaiting_confirmation')

    const done = await db.as(c).one('confirm_completion', [job.id])
    expect(done).toMatchObject({ status: 'completed', completed_by: 'customer', payout_status: 'due' })

    const earnings = await db.as(tech).one('my_earnings')
    expect(Number(earnings.due_kobo)).toBe(2_250_000)

    const payout = await db.as(admin).one('admin_mark_payout_paid', [job.id, 'GTB-TRF-883311'])
    expect(payout).toMatchObject({ payout_status: 'paid', payout_reference: 'GTB-TRF-883311' })
    await expectFail(db.as(admin).rpc('admin_mark_payout_paid', [job.id, 'GTB-TRF-883311']), 'isn\'t due')

    const review = await db.as(c).one('submit_review', [job.id, 5, 'Fast and honest'])
    expect(review.rating).toBe(5)

    const final = await db.as(c).one('get_job', [job.id])
    expect(final.events.map((e: any) => e.to_status)).toEqual(
      ['requested', 'accepted', 'payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation', 'completed', 'completed'])
    expect(final.job.payout_reference).toBeUndefined() // the customer doesn't see payout references
    expect(final.review.comment).toBe('Fast and honest')
  })
})

describe('every action is refused in the wrong state or by the wrong person', () => {
  const stages = ['requested', 'accepted', 'payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation', 'completed', 'cancelled'] as const

  async function jobAt(stage: (typeof stages)[number]) {
    const c = await db.customer()
    if (stage === 'paid') return { c, job: await db.paidJob(c, tech, admin) }
    if (stage === 'in_repair') return { c, job: await db.inRepairJob(c, tech, admin) }
    if (stage === 'awaiting_confirmation') return { c, job: await db.readyJob(c, tech, admin) }
    if (stage === 'completed') {
      const j = await db.readyJob(c, tech, admin)
      return { c, job: await db.as(c).one('confirm_completion', [j.id]) }
    }
    const job = await db.book(c, tech)
    if (stage === 'cancelled') return { c, job: await db.as(c).one('cancel_job', [job.id, null]) }
    if (stage === 'requested') return { c, job }
    await db.as(tech).rpc('accept_job', [job.id])
    if (stage === 'accepted') return { c, job: await db.job(job.id) }
    await db.as(c).rpc('submit_payment', [job.id, 'Ada transfer'])
    return { c, job: await db.job(job.id) }
  }

  const allowed: Record<string, string[]> = {
    accept_job: ['requested'], decline_job: ['requested'], submit_payment: ['accepted'],
    admin_confirm_payment: ['payment_submitted'], admin_reject_payment: ['payment_submitted'],
    record_intake: ['paid'], mark_ready: ['in_repair'], confirm_completion: ['awaiting_confirmation'],
    raise_dispute: ['payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation'],
    admin_resolve_dispute: [], admin_mark_payout_paid: ['completed'], submit_review: ['completed'],
  }

  test.each(stages)('at "%s"', async (stage) => {
    const { c, job } = await jobAt(stage)
    const actors: Record<string, User> = { customer: c, technician: tech, admin }
    for (const [role, fn, args] of ALL_ACTIONS(job.id)) {
      // Wrong person: try the action as every other role.
      for (const [otherRole, who] of Object.entries(actors)) {
        if (otherRole === role) continue
        await expectFail(db.as(who).rpc(fn, args), /Only (the|an)|Repair not found/)
      }
      // Right person, wrong state.
      if (!allowed[fn]!.includes(stage)) {
        await expectFail(db.as(actors[role]!).rpc(fn, args), /This repair is|isn't due|Add at least|photo|didn't finish/)
      }
    }
    // Nothing above changed the job.
    expect((await db.job(job.id)).status).toBe(stage)
  })
})

describe('payment confirmation', () => {
  test('admin can reject a payment claim; customer can try again', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j.id])
    await expectFail(db.as(c).rpc('submit_payment', [j.id, 'ab']), 'name on the account')
    await expectFail(db.as(c).rpc('submit_payment', [j.id, '   ']), 'name on the account')
    await db.as(c).rpc('submit_payment', [j.id, 'Ada Obi Kuda'])
    await expectFail(db.as(admin).rpc('admin_reject_payment', [j.id, '']), 'what\'s wrong')
    const back = await db.as(admin).one('admin_reject_payment', [j.id, 'No transfer with that name arrived'])
    expect(back).toMatchObject({ status: 'accepted', status_note: 'No transfer with that name arrived', payment_reference: null })
    await db.as(c).rpc('submit_payment', [j.id, 'Ada Obi Kuda again'])
    expect((await db.as(admin).one('admin_confirm_payment', [j.id])).status).toBe('paid')
  })

  test('a customer cannot confirm their own payment', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await db.as(tech).rpc('accept_job', [j.id])
    await db.as(c).rpc('submit_payment', [j.id, 'Ada transfer'])
    await expectFail(db.as(c).rpc('admin_confirm_payment', [j.id]), 'Only an UrbanFix admin')
    await expectFail(db.as(tech).rpc('admin_confirm_payment', [j.id]), 'Only an UrbanFix admin')
  })
})

describe('device intake and repair evidence', () => {
  test('IMEI must pass the checksum; serial numbers are accepted', async () => {
    const c = await db.customer()
    const j = await db.paidJob(c, tech, admin)
    await db.as(tech).upload('job-photos', `${j.id}/i.jpg`)
    const call = (id: string) => db.as(tech).rpc('record_intake', [j.id, id, null, [`${j.id}/i.jpg`]])
    await expectFail(call('490154203237519'), 'IMEI doesn\'t look right')
    await expectFail(call('000000000000000'), 'real IMEI')
    await expectFail(call('abc'), '4 to 30')
    await expectFail(call(''), '4 to 30')
    await expectFail(call('C02X;DROP TABLE'), '4 to 30')
    const ok = await db.as(tech).one('record_intake', [j.id, 'c02x-1234abcd', null, [`${j.id}/i.jpg`]])
    expect(ok.intake_identifier).toBe('C02X-1234ABCD')
  })

  test('photos are required, max 4, no duplicates, and must really be uploaded by the technician to this job', async () => {
    const c = await db.customer()
    const j = await db.paidJob(c, tech, admin)
    const other = await db.paidJob(await db.customer(), tech, admin)
    await db.as(tech).upload('job-photos', `${other.id}/x.jpg`)
    for (const n of [1, 2, 3, 4, 5]) await db.as(tech).upload('job-photos', `${j.id}/p${n}.jpg`)
    const intake = (photos: unknown) => db.as(tech).rpc('record_intake', [j.id, VALID_IMEI, null, photos])
    await expectFail(intake([]), 'at least one photo')
    await expectFail(intake(null), 'at least one photo')
    await expectFail(intake([1, 2, 3, 4, 5].map((n) => `${j.id}/p${n}.jpg`)), 'at most 4')
    await expectFail(intake([`${j.id}/p1.jpg`, `${j.id}/p1.jpg`]), 'twice')
    await expectFail(intake([`${other.id}/x.jpg`]), 'Invalid photo')
    await expectFail(intake([`${j.id}/never-uploaded.jpg`]), 'didn\'t finish uploading')
    await expectFail(intake([`${j.id}/../${other.id}/x.jpg`]), 'Invalid photo')
    await expectFail(intake(['https://evil.example.com/fake.jpg']), 'Invalid photo')
    expect((await db.as(tech).one('record_intake', [j.id, VALID_IMEI, null, [`${j.id}/p1.jpg`]])).status).toBe('in_repair')
  })

  test('customers and other technicians cannot upload into a job; nobody can upload before payment', async () => {
    const c = await db.customer()
    const j = await db.book(c, tech)
    await expectFail(db.as(tech).upload('job-photos', `${j.id}/early.jpg`), DENIED)
    await db.as(tech).rpc('accept_job', [j.id])
    await expectFail(db.as(tech).upload('job-photos', `${j.id}/early.jpg`), DENIED)
    await db.as(c).rpc('submit_payment', [j.id, 'Ada transfer'])
    await db.as(admin).rpc('admin_confirm_payment', [j.id])
    await expectFail(db.as(c).upload('job-photos', `${j.id}/fake.jpg`), DENIED)
    const other = await db.technician({ admin })
    await expectFail(db.as(other).upload('job-photos', `${j.id}/fake.jpg`), DENIED)
    await expectFail(db.as(tech).upload('job-photos', `${j.id}/malware.exe`), DENIED)
    await expect(db.as(tech).upload('job-photos', `${j.id}/ok.jpg`)).resolves.toHaveLength(1)
  })

  test('once the repair is marked ready, no more photos can be added', async () => {
    const c = await db.customer()
    const j = await db.readyJob(c, tech, admin)
    await expectFail(db.as(tech).upload('job-photos', `${j.id}/late.jpg`), DENIED)
  })

  test('completion needs a description and new photos (not the intake ones)', async () => {
    const c = await db.customer()
    const j = await db.inRepairJob(c, tech, admin)
    const intakePhoto = `${j.id}/intake-1.jpg`
    await db.as(tech).upload('job-photos', `${j.id}/after.jpg`)
    await expectFail(db.as(tech).rpc('mark_ready', [j.id, 'ok', null, [`${j.id}/after.jpg`]]), 'Describe what you fixed')
    await expectFail(db.as(tech).rpc('mark_ready', [j.id, 'Replaced screen', null, [intakePhoto]]), 'not the intake photos')
    const r = await db.as(tech).one('mark_ready', [j.id, 'Replaced screen', '', [`${j.id}/after.jpg`]])
    expect(r.parts_replaced).toBe('None')
  })

  test('the recorded IMEI can\'t be changed afterwards', async () => {
    const c = await db.customer()
    const j = await db.inRepairJob(c, tech, admin)
    await expectFail(db.as(tech).rpc('record_intake', [j.id, OTHER_VALID_IMEI, null, [`${j.id}/intake-1.jpg`]]), 'This repair is in repair')
    expect((await db.job(j.id)).intake_identifier).toBe(VALID_IMEI)
  })
})

describe('disputes', () => {
  test.each(['payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation'])('customer can raise an issue at %s', async (stage) => {
    const c = await db.customer()
    let j: any
    if (stage === 'paid') j = await db.paidJob(c, tech, admin)
    else if (stage === 'in_repair') j = await db.inRepairJob(c, tech, admin)
    else if (stage === 'awaiting_confirmation') j = await db.readyJob(c, tech, admin)
    else {
      j = await db.book(c, tech)
      await db.as(tech).rpc('accept_job', [j.id])
      await db.as(c).rpc('submit_payment', [j.id, 'Ada transfer'])
    }
    await expectFail(db.as(c).rpc('raise_dispute', [j.id, 'bad']), 'at least 10')
    const d = await db.as(c).one('raise_dispute', [j.id, 'The technician never showed up'])
    expect(d).toMatchObject({ status: 'disputed', dispute_reason: 'The technician never showed up' })
    // Escrow is frozen: the technician can't progress the job.
    await expectFail(db.as(tech).rpc('mark_ready', [j.id, 'Done now', null, []]), 'This repair is disputed')
    await expectFail(db.as(c).rpc('confirm_completion', [j.id]), 'This repair is disputed')
  })

  test('admin refund requires a reference; release pays the technician', async () => {
    const c = await db.customer()
    const j = await db.readyJob(c, tech, admin)
    await db.as(c).rpc('raise_dispute', [j.id, 'Touch is unresponsive on the left side'])
    await expectFail(db.as(admin).rpc('admin_resolve_dispute', [j.id, 'refund', 'Refund approved', null]), 'refund transfer reference')
    await expectFail(db.as(admin).rpc('admin_resolve_dispute', [j.id, 'split', 'Split it fifty-fifty', null]), 'release or refund')
    await expectFail(db.as(admin).rpc('admin_resolve_dispute', [j.id, 'refund', '', 'REF-1']), 'Explain the decision')
    const r = await db.as(admin).one('admin_resolve_dispute', [j.id, 'refund', 'Repair failed; customer refunded', 'GTB-RFND-1'])
    expect(r).toMatchObject({ status: 'refunded', payout_status: 'not_due', refund_reference: 'GTB-RFND-1' })
    await expectFail(db.as(admin).rpc('admin_mark_payout_paid', [j.id, 'X-1234']), 'This repair is refunded')
    await expectFail(db.as(c).rpc('submit_review', [j.id, 1, 'Bad']), 'This repair is refunded')

    const j2 = await db.readyJob(await db.customer(), tech, admin)
    const owner = (await db.job(j2.id)).customer_id
    await db.as({ id: owner, phone: '', email: '' }).rpc('raise_dispute', [j2.id, 'I think the part is fake'])
    const rel = await db.as(admin).one('admin_resolve_dispute', [j2.id, 'release', 'Part verified as original', null])
    expect(rel).toMatchObject({ status: 'completed', completed_by: 'admin', payout_status: 'due' })
  })
})

describe('auto-release', () => {
  test('jobs not confirmed or disputed within the window are released; others are untouched', async () => {
    const c = await db.customer()
    const old = await db.readyJob(c, tech, admin)
    const recent = await db.readyJob(await db.customer(), tech, admin)
    await db.root.query("UPDATE public.jobs SET ready_at = now() - interval '73 hours' WHERE id = $1", [old.id])
    await expectFail(db.as(c).rpc('admin_auto_release'), 'Only an UrbanFix admin')
    const n = await db.as(admin).one('admin_auto_release')
    expect(n).toBe(1)
    expect(await db.job(old.id)).toMatchObject({ status: 'completed', completed_by: 'auto', payout_status: 'due' })
    expect((await db.job(recent.id)).status).toBe('awaiting_confirmation')
  })
})

describe('reviews', () => {
  test('one review per completed job, 1 to 5 stars', async () => {
    const c = await db.customer()
    const j = await db.readyJob(c, tech, admin)
    await expectFail(db.as(c).rpc('submit_review', [j.id, 5, null]), 'This repair is awaiting confirmation')
    await db.as(c).rpc('confirm_completion', [j.id])
    for (const bad of [0, 6, -1, 100, null]) await expectFail(db.as(c).rpc('submit_review', [j.id, bad, null]), '1 to 5 stars')
    await expectFail(db.as(c).rpc('submit_review', [j.id, 4.5, null]), /invalid input syntax for type integer/)
    await db.as(c).rpc('submit_review', [j.id, 4, null])
    await expectFail(db.as(c).rpc('submit_review', [j.id, 1, 'changed my mind']), 'already rated')
    const stranger = await db.customer()
    await expectFail(db.as(stranger).rpc('submit_review', [j.id, 1, 'fake review']), 'Repair not found')
  })
})
