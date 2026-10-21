import { actionsFor, hoursLeft, needsMe, nextStep, progressIndex, STATUS_LABEL, warrantyOpen } from '@/lib/jobFlow'
import type { JobStatus, Role } from '@/lib/types'

const ALL: JobStatus[] = ['requested', 'accepted', 'quoted', 'declined', 'cancelled', 'payment_submitted', 'paid', 'in_repair',
  'awaiting_confirmation', 'completed', 'warranty', 'disputed', 'refunded']
const ROLES: Role[] = ['customer', 'technician', 'admin']

// What the database allows (database/migrations/003_model_pricing.sql). The app must
// never offer a button the server will refuse, and every server action must be reachable.
const SERVER_ALLOWS: Record<string, { role: Role; statuses: JobStatus[] }> = {
  accept: { role: 'technician', statuses: ['requested'] },
  decline: { role: 'technician', statuses: ['requested'] },
  record_intake: { role: 'technician', statuses: ['accepted', 'paid'] },
  pay: { role: 'customer', statuses: ['quoted'] },
  decline_quote: { role: 'customer', statuses: ['quoted'] },
  mark_ready: { role: 'technician', statuses: ['in_repair', 'warranty'] },
  confirm: { role: 'customer', statuses: ['awaiting_confirmation'] },
  dispute: { role: 'customer', statuses: ['payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation', 'warranty'] },
  review: { role: 'customer', statuses: ['completed'] },
  claim_warranty: { role: 'customer', statuses: ['completed'] },
  admin_confirm_payment: { role: 'admin', statuses: ['payment_submitted'] },
  admin_reject_payment: { role: 'admin', statuses: ['payment_submitted'] },
  admin_cancel: { role: 'admin', statuses: ['requested', 'accepted', 'quoted', 'payment_submitted'] },
  admin_resolve: { role: 'admin', statuses: ['disputed'] },
  admin_payout: { role: 'admin', statuses: ['completed', 'warranty'] },
  admin_part_payout: { role: 'admin', statuses: ALL }, // depends on whether part money is due, not the stage
}
const CANCEL: Record<Role, JobStatus[]> = { customer: ['requested', 'accepted', 'quoted'], technician: ['accepted', 'quoted'], admin: [] }
const EVERYTHING = { payoutDue: true, partPayoutDue: true, canClaimWarranty: true }

describe('actionsFor', () => {
  test.each(ALL.flatMap((s) => ROLES.map((r) => [r, s] as const)))('%s at %s only offers what the server allows', (role, status) => {
    for (const a of actionsFor(role, status, EVERYTHING)) {
      if (a === 'cancel') { expect(CANCEL[role]).toContain(status); continue }
      const rule = SERVER_ALLOWS[a]!
      expect(rule.role).toBe(role)
      expect(rule.statuses).toContain(status)
    }
  })

  test('every server action is reachable from the app', () => {
    for (const [action, rule] of Object.entries(SERVER_ALLOWS)) {
      expect(rule.statuses.some((s) => actionsFor(rule.role, s, EVERYTHING).includes(action as never))).toBe(true)
    }
  })

  test('customers cannot pay before the technician has confirmed the price', () => {
    for (const s of ['requested', 'accepted'] as JobStatus[]) expect(actionsFor('customer', s)).not.toContain('pay')
    expect(actionsFor('customer', 'quoted')[0]).toBe('pay')
  })

  test('terminal states have nothing to do except a due part payout for admins', () => {
    for (const s of ['declined', 'cancelled', 'refunded'] as JobStatus[]) {
      for (const r of ROLES) expect(actionsFor(r, s)).toEqual([])
    }
  })

  test('warranty claim only while open; review disappears once reviewed', () => {
    expect(actionsFor('customer', 'completed', { canClaimWarranty: false })).toEqual(['review'])
    expect(actionsFor('customer', 'completed', { reviewed: true, canClaimWarranty: true })).toEqual(['claim_warranty'])
    expect(actionsFor('customer', 'completed', { reviewed: true })).toEqual([])
  })

  test('main actions come first', () => {
    expect(actionsFor('technician', 'accepted')[0]).toBe('record_intake')
    expect(actionsFor('customer', 'awaiting_confirmation')[0]).toBe('confirm')
    expect(actionsFor('admin', 'in_repair', { partPayoutDue: true })[0]).toBe('admin_part_payout')
  })
})

describe('needsMe', () => {
  test('passive options are not "your turn"', () => {
    expect(needsMe('customer', 'accepted')).toBe(false)
    expect(needsMe('customer', 'quoted')).toBe(true)
    expect(needsMe('technician', 'accepted')).toBe(true)
    expect(needsMe('technician', 'quoted')).toBe(false)
    expect(needsMe('customer', 'completed', { reviewed: true, canClaimWarranty: true })).toBe(false)
  })
})

describe('copy and progress', () => {
  test('every status has a label and a next-step sentence for every role', () => {
    for (const s of ALL) {
      expect(STATUS_LABEL[s]).toBeTruthy()
      for (const r of ROLES) expect(nextStep(r, s, { mode: 'visit', other: 'Emeka' }).length).toBeGreaterThan(5)
    }
  })
  test('progress moves forward through the happy path', () => {
    expect((['requested', 'quoted', 'in_repair', 'awaiting_confirmation', 'completed'] as JobStatus[]).map(progressIndex)).toEqual([0, 1, 2, 3, 4])
    expect(progressIndex('cancelled')).toBe(-1)
  })
  test('countdowns', () => {
    const now = Date.parse('2026-10-14T12:00:00Z')
    expect(hoursLeft('2026-10-14T11:00:00Z', 72, now)).toBe(71)
    expect(hoursLeft(null, 72, now)).toBeNull()
    expect(warrantyOpen('2026-10-20T00:00:00Z', null, now)).toBe(true)
    expect(warrantyOpen('2026-10-20T00:00:00Z', '2026-10-15T00:00:00Z', now)).toBe(false)
    expect(warrantyOpen('2026-10-13T00:00:00Z', null, now)).toBe(false)
    expect(warrantyOpen(null, null, now)).toBe(false)
  })
})
