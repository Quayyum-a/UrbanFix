import { actionsFor, hoursLeft, needsMe, nextStep, progressIndex, STATUS_LABEL } from '@/lib/jobFlow'
import type { JobStatus, Role } from '@/lib/types'

const ALL: JobStatus[] = ['requested', 'accepted', 'declined', 'cancelled', 'payment_submitted', 'paid', 'in_repair',
  'awaiting_confirmation', 'completed', 'disputed', 'refunded']

// What the database allows (see database/urbanfix.sql). The app must never offer
// a button the server will refuse.
const SERVER_ALLOWS: Record<string, { role: Role; statuses: JobStatus[] }> = {
  accept: { role: 'technician', statuses: ['requested'] },
  decline: { role: 'technician', statuses: ['requested'] },
  pay: { role: 'customer', statuses: ['accepted'] },
  record_intake: { role: 'technician', statuses: ['paid'] },
  mark_ready: { role: 'technician', statuses: ['in_repair'] },
  confirm: { role: 'customer', statuses: ['awaiting_confirmation'] },
  dispute: { role: 'customer', statuses: ['payment_submitted', 'paid', 'in_repair', 'awaiting_confirmation'] },
  review: { role: 'customer', statuses: ['completed'] },
  admin_confirm_payment: { role: 'admin', statuses: ['payment_submitted'] },
  admin_reject_payment: { role: 'admin', statuses: ['payment_submitted'] },
  admin_cancel: { role: 'admin', statuses: ['requested', 'accepted', 'payment_submitted'] },
  admin_resolve: { role: 'admin', statuses: ['disputed'] },
  admin_payout: { role: 'admin', statuses: ['completed'] },
}
const CANCEL: Record<Role, JobStatus[]> = { customer: ['requested', 'accepted'], technician: ['accepted'], admin: [] }

describe('actionsFor', () => {
  test.each(ALL.flatMap((s) => (['customer', 'technician', 'admin'] as Role[]).map((r) => [r, s] as const)))(
    '%s at %s only offers what the server allows', (role, status) => {
      for (const a of actionsFor(role, status, { payoutDue: true })) {
        if (a === 'cancel') { expect(CANCEL[role]).toContain(status); continue }
        const rule = SERVER_ALLOWS[a]!
        expect(rule.role).toBe(role)
        expect(rule.statuses).toContain(status)
      }
    })

  test('every server action is reachable from the app', () => {
    for (const [action, rule] of Object.entries(SERVER_ALLOWS)) {
      const reachable = rule.statuses.some((s) => actionsFor(rule.role, s, { payoutDue: true }).includes(action as never))
      expect(reachable).toBe(true)
    }
  })

  test('terminal states have no actions for anyone', () => {
    for (const s of ['declined', 'cancelled', 'refunded'] as JobStatus[]) {
      for (const r of ['customer', 'technician', 'admin'] as Role[]) expect(actionsFor(r, s)).toEqual([])
    }
  })

  test('review disappears once reviewed; payout only when due', () => {
    expect(actionsFor('customer', 'completed', { reviewed: true })).toEqual([])
    expect(actionsFor('admin', 'completed', { payoutDue: false })).toEqual([])
  })

  test('the main action comes first', () => {
    expect(actionsFor('customer', 'accepted')[0]).toBe('pay')
    expect(actionsFor('customer', 'awaiting_confirmation')[0]).toBe('confirm')
    expect(actionsFor('technician', 'requested')[0]).toBe('accept')
  })
})

describe('needsMe', () => {
  test('cancel/dispute alone do not count as "your turn"', () => {
    expect(needsMe('customer', 'requested')).toBe(false)
    expect(needsMe('customer', 'paid')).toBe(false)
    expect(needsMe('customer', 'accepted')).toBe(true)
    expect(needsMe('technician', 'paid')).toBe(true)
    expect(needsMe('technician', 'accepted')).toBe(false)
  })
})

describe('copy and progress', () => {
  test('every status has a label and a next-step sentence for every role', () => {
    for (const s of ALL) {
      expect(STATUS_LABEL[s]).toBeTruthy()
      for (const r of ['customer', 'technician', 'admin'] as Role[]) {
        expect(nextStep(r, s, { mode: 'visit', other: 'Emeka' }).length).toBeGreaterThan(5)
      }
    }
  })
  test('progress moves forward through the happy path', () => {
    const path: JobStatus[] = ['requested', 'paid', 'in_repair', 'awaiting_confirmation', 'completed']
    expect(path.map(progressIndex)).toEqual([0, 1, 2, 3, 4])
    expect(progressIndex('cancelled')).toBe(-1)
  })
  test('auto-release countdown', () => {
    const now = Date.parse('2026-10-14T12:00:00Z')
    expect(hoursLeft('2026-10-14T11:00:00Z', 72, now)).toBe(71)
    expect(hoursLeft('2026-10-10T00:00:00Z', 72, now)).toBe(0)
    expect(hoursLeft(null, 72, now)).toBeNull()
  })
})
