// Works out what changed between two refreshes of "my repairs" so the app can
// buzz and show a short note: a new order for a technician, a milestone for
// anyone, or a new chat message. Pure, so it is easy to test.
import { deviceName } from '@/constants/catalog'
import { STATUS_LABEL } from './jobFlow'
import type { JobStatus, JobSummary, Role } from './types'

export type LiveKind = 'new_order' | 'milestone' | 'message'

export interface LiveEvent {
  kind: LiveKind
  jobId: string
  title: string
  text: string
}

const CUSTOMER_TEXT: Partial<Record<JobStatus, string>> = {
  accepted: 'Your technician accepted. Take your device to them, or wait for their visit.',
  quoted: 'Your final price is ready. Tap to see it and pay.',
  declined: 'The technician declined. You can book someone else.',
  cancelled: 'This repair was cancelled.',
  in_repair: 'Payment confirmed. Your repair has started.',
  paid: 'Payment confirmed.',
  awaiting_confirmation: 'Your device is ready. Check it, then confirm.',
  completed: 'Repair complete. Thank you for using UrbanFix.',
  warranty: 'Your warranty repair has started.',
  refunded: 'Your refund has been sent.',
  disputed: 'UrbanFix is looking into the issue.',
}

const TECH_TEXT: Partial<Record<JobStatus, string>> = {
  payment_submitted: 'The customer has paid. UrbanFix is confirming it.',
  in_repair: 'Payment confirmed. You can start the repair.',
  paid: 'Payment confirmed. You can start the repair.',
  completed: 'The customer confirmed the repair. Your payout is on the way.',
  cancelled: 'This repair was cancelled.',
  declined: 'This repair was closed.',
  disputed: 'The customer raised an issue. UrbanFix will contact you.',
  warranty: 'The customer made a warranty claim. Please check the device again.',
  refunded: 'This repair was refunded.',
}

const ADMIN_TEXT: Partial<Record<JobStatus, string>> = {
  payment_submitted: 'A customer says they paid. Check the bank and confirm.',
  disputed: 'A customer raised an issue.',
}

function milestoneText(role: Role, status: JobStatus): string | null {
  const table = role === 'customer' ? CUSTOMER_TEXT : role === 'technician' ? TECH_TEXT : ADMIN_TEXT
  return table[status] ?? null
}

/**
 * Compare the last known status of each repair with the fresh list.
 * `known` is null on the very first load: nothing buzzes for what was already there.
 */
export function diffJobs(
  role: Role,
  known: Record<string, JobStatus> | null,
  next: JobSummary[],
  unreadBefore: Record<string, number> | null,
  unreadNow: Record<string, number>,
): LiveEvent[] {
  if (!known) return []
  const events: LiveEvent[] = []
  for (const j of next) {
    const device = deviceName(j.brand, j.model, j.device_type)
    const before = known[j.id]
    if (before === undefined) {
      if (role === 'technician' && j.status === 'requested') {
        events.push({ kind: 'new_order', jobId: j.id, title: 'New repair request', text: `${device}. Tap to accept or decline.` })
      }
      continue
    }
    if (before !== j.status) {
      const text = milestoneText(role, j.status)
      if (text) events.push({ kind: 'milestone', jobId: j.id, title: `${device}: ${STATUS_LABEL[j.status]}`, text })
    }
  }
  if (unreadBefore) {
    for (const [jobId, n] of Object.entries(unreadNow)) {
      if (n > (unreadBefore[jobId] ?? 0)) {
        const j = next.find((x) => x.id === jobId)
        const who = j?.other_party ?? 'UrbanFix'
        events.push({ kind: 'message', jobId, title: `New message from ${who}`, text: 'Tap to open the chat.' })
      }
    }
  }
  // Most important first: new orders, then milestones, then messages.
  const rank: Record<LiveKind, number> = { new_order: 0, milestone: 1, message: 2 }
  return events.sort((a, b) => rank[a.kind] - rank[b.kind])
}
