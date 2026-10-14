// What each person sees and can do at each stage of a repair.
// Mirrors the state machine in database/urbanfix.sql (which enforces it).
import type { JobStatus, Role } from './types'

export type Tone = 'neutral' | 'action' | 'good' | 'warn' | 'bad'

export const STATUS_LABEL: Record<JobStatus, string> = {
  requested: 'Waiting for technician',
  accepted: 'Waiting for payment',
  declined: 'Declined',
  cancelled: 'Cancelled',
  payment_submitted: 'Confirming payment',
  paid: 'Paid, device next',
  in_repair: 'Being repaired',
  awaiting_confirmation: 'Ready, please check',
  completed: 'Completed',
  disputed: 'Issue raised',
  refunded: 'Refunded',
}

export type Action =
  | 'accept' | 'decline' | 'cancel' | 'pay' | 'record_intake' | 'mark_ready' | 'confirm' | 'dispute' | 'review'
  | 'admin_confirm_payment' | 'admin_reject_payment' | 'admin_cancel' | 'admin_resolve' | 'admin_payout'

/** Actions available to `role` at `status`, the main one first. */
export function actionsFor(role: Role, status: JobStatus, opts: { reviewed?: boolean; payoutDue?: boolean } = {}): Action[] {
  if (role === 'customer') {
    switch (status) {
      case 'requested': return ['cancel']
      case 'accepted': return ['pay', 'cancel']
      case 'payment_submitted':
      case 'paid':
      case 'in_repair': return ['dispute']
      case 'awaiting_confirmation': return ['confirm', 'dispute']
      case 'completed': return opts.reviewed ? [] : ['review']
      default: return []
    }
  }
  if (role === 'technician') {
    switch (status) {
      case 'requested': return ['accept', 'decline']
      case 'accepted': return ['cancel']
      case 'paid': return ['record_intake']
      case 'in_repair': return ['mark_ready']
      default: return []
    }
  }
  switch (status) {
    case 'payment_submitted': return ['admin_confirm_payment', 'admin_reject_payment', 'admin_cancel']
    case 'requested':
    case 'accepted': return ['admin_cancel']
    case 'disputed': return ['admin_resolve']
    case 'completed': return opts.payoutDue ? ['admin_payout'] : []
    default: return []
  }
}

/** Does this person need to do something now? (Used for badges and sorting.) */
export function needsMe(role: Role, status: JobStatus, opts: { reviewed?: boolean; payoutDue?: boolean } = {}): boolean {
  const a = actionsFor(role, status, opts)
  const passive: Action[] = ['cancel', 'dispute', 'admin_cancel']
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
      case 'accepted': return `${other} accepted. Pay UrbanFix to lock in the repair. We hold the money until you confirm the fix.`
      case 'payment_submitted': return "We're confirming your transfer. This usually takes a few minutes."
      case 'paid': return mode === 'visit'
        ? `Payment confirmed. ${other} will contact you to come for the device.`
        : `Payment confirmed. Take your device to ${other}. They'll record its IMEI and condition in front of you.`
      case 'in_repair': return `${other} recorded your device's IMEI and condition below. Check they match your device.`
      case 'awaiting_confirmation': return `Repair finished. Check your device works, then confirm to release payment${ctx.hoursLeft != null ? ` (auto-confirms in ${ctx.hoursLeft}h)` : ''}.`
      case 'completed': return 'Repair complete. Thanks for using UrbanFix.'
      case 'disputed': return "UrbanFix is reviewing the issue. Your money stays held until it's resolved."
      case 'refunded': return 'Your money was refunded.'
      case 'declined': return `${other} couldn't take this repair. Book another technician.`
      case 'cancelled': return 'This request was cancelled.'
    }
  }
  if (role === 'technician') {
    switch (status) {
      case 'requested': return 'New request. Accept it if you can do the repair at this price.'
      case 'accepted': return `Waiting for ${other} to pay. You'll be notified here once UrbanFix confirms it.`
      case 'payment_submitted': return 'The customer says they paid. UrbanFix is confirming it.'
      case 'paid': return mode === 'visit'
        ? `Paid and held by UrbanFix. Contact ${other}, collect the device and record its IMEI and photos.`
        : `Paid and held by UrbanFix. When ${other} drops off the device, record its IMEI and photos.`
      case 'in_repair': return 'When the repair is done, describe the fix, list any parts you replaced and add photos.'
      case 'awaiting_confirmation': return `Waiting for ${other} to confirm${ctx.hoursLeft != null ? `. Auto-confirms in ${ctx.hoursLeft}h` : ''}.`
      case 'completed': return 'Completed. Your payout is on its way.'
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
export const PROGRESS_STEPS = ['Requested', 'Paid', 'Received', 'Repaired', 'Done'] as const
export function progressIndex(status: JobStatus): number {
  switch (status) {
    case 'requested':
    case 'accepted':
    case 'payment_submitted': return 0
    case 'paid': return 1
    case 'in_repair': return 2
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
