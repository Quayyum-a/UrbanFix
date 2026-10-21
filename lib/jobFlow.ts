// What each person sees and can do at each stage of a repair.
// Mirrors the state machine in the database (which enforces it).
import type { JobStatus, Role } from './types'

export type Tone = 'neutral' | 'action' | 'good' | 'warn' | 'bad'

export const STATUS_LABEL: Record<JobStatus, string> = {
  requested: 'Waiting for technician',
  accepted: 'Technician to check device',
  quoted: 'Price ready, please pay',
  declined: 'Declined',
  cancelled: 'Cancelled',
  payment_submitted: 'Confirming payment',
  paid: 'Paid, device next',
  in_repair: 'Being repaired',
  awaiting_confirmation: 'Ready, please check',
  completed: 'Completed',
  warranty: 'Warranty repair',
  disputed: 'Issue raised',
  refunded: 'Refunded',
}

export type Action =
  | 'accept' | 'decline' | 'cancel' | 'pay' | 'decline_quote' | 'record_intake' | 'mark_ready' | 'confirm' | 'dispute'
  | 'review' | 'claim_warranty'
  | 'admin_confirm_payment' | 'admin_reject_payment' | 'admin_cancel' | 'admin_resolve' | 'admin_payout' | 'admin_part_payout'

export interface FlowOpts {
  reviewed?: boolean
  payoutDue?: boolean
  partPayoutDue?: boolean
  /** Customer: warranty still open and not used yet. */
  canClaimWarranty?: boolean
}

/** Actions available to `role` at `status`, the main one first. */
export function actionsFor(role: Role, status: JobStatus, opts: FlowOpts = {}): Action[] {
  if (role === 'customer') {
    switch (status) {
      case 'requested':
      case 'accepted': return ['cancel']
      case 'quoted': return ['pay', 'decline_quote']
      case 'payment_submitted':
      case 'paid':
      case 'in_repair':
      case 'warranty': return ['dispute']
      case 'awaiting_confirmation': return ['confirm', 'dispute']
      case 'completed': return [...(opts.reviewed ? [] : ['review' as const]), ...(opts.canClaimWarranty ? ['claim_warranty' as const] : [])]
      default: return []
    }
  }
  if (role === 'technician') {
    switch (status) {
      case 'requested': return ['accept', 'decline']
      case 'accepted': return ['record_intake', 'cancel']
      case 'quoted': return ['cancel']
      case 'paid': return ['record_intake']
      case 'in_repair':
      case 'warranty': return ['mark_ready']
      default: return []
    }
  }
  const admin: Action[] = []
  switch (status) {
    case 'payment_submitted': admin.push('admin_confirm_payment', 'admin_reject_payment', 'admin_cancel'); break
    case 'requested':
    case 'accepted':
    case 'quoted': admin.push('admin_cancel'); break
    case 'disputed': admin.push('admin_resolve'); break
    case 'completed':
    case 'warranty': if (opts.payoutDue) admin.push('admin_payout'); break
    default: break
  }
  if (opts.partPayoutDue) admin.unshift('admin_part_payout')
  return admin
}

/** Does this person need to do something now? (Used for badges and sorting.) */
export function needsMe(role: Role, status: JobStatus, opts: FlowOpts = {}): boolean {
  const a = actionsFor(role, status, opts)
  const passive: Action[] = ['cancel', 'dispute', 'admin_cancel', 'claim_warranty']
  return a.length > 0 && !passive.includes(a[0]!)
}

export function tone(role: Role, status: JobStatus): Tone {
  if (status === 'completed') return 'good'
  if (['declined', 'cancelled', 'refunded'].includes(status)) return 'neutral'
  if (status === 'disputed') return 'bad'
  return needsMe(role, status) ? 'action' : 'warn'
}

/** One sentence telling this person what happens next. */
export function nextStep(role: Role, status: JobStatus, ctx: { mode: 'visit' | 'drop_off'; other: string; hoursLeft?: number | null }): string {
  const { mode, other } = ctx
  if (role === 'customer') {
    switch (status) {
      case 'requested': return `${other} will accept or decline your request soon.`
      case 'accepted': return mode === 'visit'
        ? `${other} accepted and will come for the device. They'll record its IMEI and condition, then confirm the final price. You don't pay until then.`
        : `${other} accepted. Take your device to their shop. They'll record its IMEI and condition in front of you, then confirm the final price. You don't pay until then.`
      case 'quoted': return `${other} checked your device and confirmed the price below. Pay UrbanFix to start the repair. We hold your money until you confirm the fix.`
      case 'payment_submitted': return "We're confirming your transfer. This usually takes a few minutes."
      case 'paid': return 'Payment confirmed. The technician will record your device next.'
      case 'in_repair': return `${other} is repairing your device. Check the IMEI and photos below match your device.`
      case 'awaiting_confirmation': return `Repair finished. Check your device works, then confirm to release payment${ctx.hoursLeft != null ? ` (auto-confirms in ${ctx.hoursLeft}h)` : ''}.`
      case 'completed': return 'Repair complete. Thanks for using UrbanFix.'
      case 'warranty': return `${other} will fix the problem under warranty at no extra cost.`
      case 'disputed': return "UrbanFix is reviewing the issue. Your money stays held until it's resolved."
      case 'refunded': return 'Your money was refunded.'
      case 'declined': return `${other} couldn't take this repair. Book another technician.`
      case 'cancelled': return 'This request was cancelled.'
    }
  }
  if (role === 'technician') {
    switch (status) {
      case 'requested': return 'New request. Accept it if you can do this repair.'
      case 'accepted': return mode === 'visit'
        ? `Contact ${other}, collect the device, then record its IMEI and photos and confirm the final price.`
        : `When ${other} brings the device, record its IMEI and photos in front of them and confirm the final price.`
      case 'quoted': return `Waiting for ${other} to pay. You'll see it here once UrbanFix confirms the money.`
      case 'payment_submitted': return 'The customer says they paid. UrbanFix is confirming it.'
      case 'paid': return 'Paid and held by UrbanFix. Record the device to start the repair.'
      case 'in_repair': return 'Paid. The part money is on its way to you. When done, describe the fix and add photos.'
      case 'awaiting_confirmation': return `Waiting for ${other} to confirm${ctx.hoursLeft != null ? `. Auto-confirms in ${ctx.hoursLeft}h` : ''}.`
      case 'completed': return 'Completed. Your repair fee is on its way.'
      case 'warranty': return 'The customer claimed warranty. Fix it at no extra cost, then mark it ready.'
      case 'disputed': return 'The customer raised an issue. UrbanFix will contact you.'
      case 'refunded': return 'The customer was refunded.'
      case 'declined': return 'You declined this request.'
      case 'cancelled': return 'This request was cancelled.'
    }
  }
  switch (status) {
    case 'payment_submitted': return 'Check the bank account for this transfer, then confirm or reject.'
    case 'disputed': return 'Review the evidence and chat, then release to the technician or refund the customer.'
    default: return STATUS_LABEL[status]
  }
}

/** Progress for the customer's tracker (0-based step index, of 5). */
export const PROGRESS_STEPS = ['Requested', 'Checked', 'Paid', 'Repaired', 'Done'] as const
export function progressIndex(status: JobStatus): number {
  switch (status) {
    case 'requested':
    case 'accepted': return 0
    case 'quoted':
    case 'payment_submitted': return 1
    case 'paid':
    case 'in_repair':
    case 'warranty': return 2
    case 'awaiting_confirmation': return 3
    case 'completed': return 4
    default: return -1
  }
}

export function hoursLeft(readyAt: string | null, windowHours: number, now = Date.now()): number | null {
  if (!readyAt) return null
  const ms = new Date(readyAt).getTime() + windowHours * 3600_000 - now
  return Math.max(0, Math.ceil(ms / 3600_000))
}

export function warrantyOpen(warrantyUntil: string | null, claimedAt: string | null, now = Date.now()): boolean {
  return !!warrantyUntil && !claimedAt && new Date(warrantyUntil).getTime() > now
}
