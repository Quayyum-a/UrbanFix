// The action panel on a repair: exactly what the viewer can do right now.
import * as Clipboard from 'expo-clipboard'
import React, { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { PhotoPicker } from '@/components/PhotoPicker'
import { Banner, Button, Card, Chips, ErrorText, Field, P, Row, Small, Stars } from '@/components/ui'
import { colors, font, spacing } from '@/constants/theme'
import * as api from '@/lib/api'
import { actionsFor } from '@/lib/jobFlow'
import { useSession } from '@/lib/session'
import type { JobDetails, TechnicianPrivate } from '@/lib/types'
import { deviceIdProblem, formatNaira, textProblem } from '@/lib/validation'

type Props = { d: JobDetails; onChanged: () => void }

/** Runs a server action with loading + error state, then refreshes the job. */
function useAction(onChanged: () => void) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key); setError(null)
    try {
      await fn()
      onChanged()
      return true
    } catch (e) {
      setError(api.friendlyError(e))
      return false
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, run, setError }
}

function confirmThen(title: string, message: string, ok: string, action: () => void, destructive = false) {
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: ok, style: destructive ? 'destructive' : 'default', onPress: action }])
}

export function JobActions({ d, onChanged }: Props) {
  const role = d.viewer_role
  const actions = actionsFor(role, d.job.status, { reviewed: !!d.review, payoutDue: d.job.payout_status === 'due' })
  if (!actions.length) return null
  if (role === 'customer') return <CustomerActions d={d} onChanged={onChanged} actions={actions} />
  if (role === 'technician') return <TechnicianActions d={d} onChanged={onChanged} actions={actions} />
  return <AdminActions d={d} onChanged={onChanged} actions={actions} />
}

// ------------------------------------------------------------------ customer
function CustomerActions({ d, onChanged, actions }: Props & { actions: string[] }) {
  const { job } = d
  const profile = useSession((s) => s.profile)
  const a = useAction(onChanged)
  const [payer, setPayer] = useState(profile?.full_name ?? '')
  const [disputing, setDisputing] = useState(false)
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const copy = (v: string) => { void Clipboard.setStringAsync(v); Alert.alert('Copied', v) }
  const reasonErr = textProblem(reason, { min: 10, max: 500, field: 'what went wrong' })

  return (
    <View>
      {actions.includes('pay') && d.payment_account ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
          <Text style={font.heading}>Pay {formatNaira(job.price_kobo)} to UrbanFix</Text>
          <Small style={{ marginBottom: spacing.sm }}>We hold it safely and only pay the technician after you confirm the repair.</Small>
          <Row label="Bank" value={d.payment_account.bank_name} />
          <Row label="Account number" value={d.payment_account.account_number} onPress={() => copy(d.payment_account!.account_number)} />
          <Row label="Account name" value={d.payment_account.account_name} />
          <Row label="Narration" value={job.code} onPress={() => copy(job.code)} />
          <Button title="Copy account number" kind="secondary" icon="copy-outline" onPress={() => copy(d.payment_account!.account_number)} style={{ marginTop: spacing.sm }} />
          <Field label="Name on the account you paid from" value={payer} onChangeText={setPayer} maxLength={60}
            hint="This helps us match your transfer quickly." />
          <Button title={`I've sent ${formatNaira(job.price_kobo)}`} kind="accent" testID="paid"
            loading={a.busy === 'pay'} disabled={payer.trim().length < 4}
            onPress={() => void a.run('pay', () => api.submitPayment(job.id, payer))} />
        </Card>
      ) : null}

      {actions.includes('confirm') ? (
        <Card style={{ borderColor: colors.success, borderWidth: 1.5 }}>
          <Text style={font.heading}>Is your device working?</Text>
          <Small style={{ marginBottom: spacing.md }}>Check it properly. Confirming releases {formatNaira(job.price_kobo)} to the technician.</Small>
          <Button title="Yes, it works. Release payment" kind="primary" icon="checkmark-circle-outline" testID="confirm"
            loading={a.busy === 'confirm'}
            onPress={() => confirmThen('Release payment?', "Only confirm if your device is fixed. This can't be undone.", 'Release payment',
              () => void a.run('confirm', () => api.confirmCompletion(job.id)))} />
        </Card>
      ) : null}

      {actions.includes('review') ? (
        <Card>
          <Text style={font.heading}>Rate {d.technician.shop_name ?? d.technician.name}</Text>
          <View style={{ marginVertical: spacing.md }}><Stars value={rating} onChange={setRating} /></View>
          {rating ? (
            <>
              <Field label="Comment (optional)" value={comment} onChangeText={setComment} maxLength={500} multiline />
              <Button title="Submit rating" loading={a.busy === 'review'} testID="submit-review"
                onPress={() => void a.run('review', () => api.submitReview(job.id, rating, comment))} />
            </>
          ) : null}
        </Card>
      ) : null}

      {actions.includes('dispute') ? (
        disputing ? (
          <Card>
            <Text style={font.heading}>Report a problem</Text>
            <Small style={{ marginBottom: spacing.md }}>Your payment stays held while UrbanFix looks into it.</Small>
            <Field label="What went wrong?" value={reason} onChangeText={setReason} multiline maxLength={500}
              error={reason ? reasonErr : null} testID="dispute-reason" />
            <Button title="Send to UrbanFix" kind="danger" disabled={!!reasonErr} loading={a.busy === 'dispute'} testID="dispute-send"
              onPress={() => void a.run('dispute', () => api.raiseDispute(job.id, reason))} />
            <Button title="Never mind" kind="ghost" onPress={() => setDisputing(false)} />
          </Card>
        ) : (
          <Button title={job.status === 'awaiting_confirmation' ? "Something's wrong" : 'Report a problem'} kind="danger"
            icon="alert-circle-outline" onPress={() => setDisputing(true)} testID="dispute" />
        )
      ) : null}

      {actions.includes('cancel') ? (
        <Button title="Cancel request" kind="ghost" loading={a.busy === 'cancel'} testID="cancel"
          onPress={() => confirmThen('Cancel this request?', 'You can book again any time.', 'Cancel request',
            () => void a.run('cancel', () => api.cancelJob(job.id, null)), true)} />
      ) : null}
      <ErrorText error={a.error} />
    </View>
  )
}

// ---------------------------------------------------------------- technician
function TechnicianActions({ d, onChanged, actions }: Props & { actions: string[] }) {
  const { job } = d
  const a = useAction(onChanged)
  const [reason, setReason] = useState('')
  const [declining, setDeclining] = useState(false)
  const [imei, setImei] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [fixNotes, setFixNotes] = useState('')
  const [parts, setParts] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)

  if (actions.includes('accept')) {
    return (
      <View>
        <Button title={`Accept · you earn ${formatNaira(job.payout_kobo)}`} kind="accent" icon="checkmark" testID="accept"
          loading={a.busy === 'accept'} onPress={() => void a.run('accept', () => api.acceptJob(job.id))} />
        {declining ? (
          <Card>
            <Field label="Reason (optional, the customer sees this)" value={reason} onChangeText={setReason} maxLength={200} />
            <Button title="Decline request" kind="danger" loading={a.busy === 'decline'} testID="decline-send"
              onPress={() => void a.run('decline', () => api.declineJob(job.id, reason))} />
          </Card>
        ) : <Button title="Decline" kind="ghost" onPress={() => setDeclining(true)} testID="decline" />}
        <ErrorText error={a.error} />
      </View>
    )
  }

  if (actions.includes('cancel')) {
    return (
      <View>
        {declining ? (
          <Card>
            <Field label="Why can't you do this job?" value={reason} onChangeText={setReason} maxLength={200}
              error={reason && reason.trim().length < 5 ? 'At least 5 characters.' : null} />
            <Button title="Cancel job" kind="danger" disabled={reason.trim().length < 5} loading={a.busy === 'cancel'}
              onPress={() => void a.run('cancel', () => api.cancelJob(job.id, reason))} />
          </Card>
        ) : <Button title="I can't do this job" kind="ghost" onPress={() => setDeclining(true)} />}
        <ErrorText error={a.error} />
      </View>
    )
  }

  if (actions.includes('record_intake')) {
    const idErr = deviceIdProblem(imei)
    return (
      <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
        <Text style={font.heading}>Record the device you received</Text>
        <Small style={{ marginBottom: spacing.md }}>Do this in front of the customer. It protects you both if there's a disagreement later.</Small>
        <Field label="IMEI or serial number" value={imei} onChangeText={setImei} autoCapitalize="characters" maxLength={32}
          hint="On phones, dial *#06#. On laptops, check the sticker underneath." error={triedSubmit || imei.length >= 15 ? idErr : null} testID="imei" />
        <Field label="Condition notes (optional)" placeholder="e.g. Screen cracked top-left, small dent on frame" value={notes}
          onChangeText={setNotes} multiline maxLength={500} />
        <PhotoPicker bucket="job-photos" folder={job.id} prefix="intake" value={photos} onChange={setPhotos} label="Photos of the device now (1 to 4)" />
        <Button title="Save and start repair" kind="accent" testID="save-intake" loading={a.busy === 'intake'}
          onPress={() => {
            setTriedSubmit(true)
            if (idErr) return
            if (!photos.length) { a.setError('Add at least one photo of the device.'); return }
            void a.run('intake', () => api.recordIntake(job.id, imei, notes, photos))
          }} />
        <ErrorText error={a.error} />
      </Card>
    )
  }

  if (actions.includes('mark_ready')) {
    const notesErr = textProblem(fixNotes, { min: 5, max: 500, field: 'what you fixed' })
    return (
      <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
        <Text style={font.heading}>Finish the repair</Text>
        <Field label="What did you fix?" value={fixNotes} onChangeText={setFixNotes} multiline maxLength={500}
          error={triedSubmit ? notesErr : null} testID="fix-notes" />
        <Field label="Parts replaced (leave empty if none)" placeholder="e.g. Screen (original), battery" value={parts}
          onChangeText={setParts} maxLength={300} />
        <PhotoPicker bucket="job-photos" folder={job.id} prefix="done" value={photos} onChange={setPhotos}
          label="Photos of the repaired device (1 to 4)" />
        <Button title="Mark as ready for customer" kind="accent" testID="mark-ready" loading={a.busy === 'ready'}
          onPress={() => {
            setTriedSubmit(true)
            if (notesErr) return
            if (!photos.length) { a.setError('Add at least one photo of the repaired device.'); return }
            void a.run('ready', () => api.markReady(job.id, fixNotes, parts, photos))
          }} />
        <ErrorText error={a.error} />
      </Card>
    )
  }
  return null
}

// --------------------------------------------------------------------- admin
function AdminActions({ d, onChanged, actions }: Props & { actions: string[] }) {
  const { job } = d
  const a = useAction(onChanged)
  const [note, setNote] = useState('')
  const [ref, setRef] = useState('')
  const [outcome, setOutcome] = useState<'release' | 'refund' | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [bank, setBank] = useState<TechnicianPrivate | null>(null)

  useEffect(() => {
    if (actions.includes('admin_payout')) {
      api.adminTechnicianDetails(job.technician_id).then((r) => setBank(r?.private ?? null)).catch(() => {})
    }
  }, [job.technician_id, actions.join()])

  return (
    <View>
      {actions.includes('admin_confirm_payment') ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
          <Text style={font.heading}>Confirm payment</Text>
          <Row label="Expected" value={formatNaira(job.price_kobo)} />
          <Row label="Paid from" value={job.payment_reference ?? '-'} />
          <Row label="Narration" value={job.code} />
          <Button title="Money received. Confirm" kind="accent" testID="admin-confirm" loading={a.busy === 'confirm'}
            onPress={() => void a.run('confirm', () => api.adminConfirmPayment(job.id))} />
          {rejecting ? (
            <>
              <Field label="What's wrong? (customer sees this)" value={note} onChangeText={setNote} maxLength={300} />
              <Button title="Reject payment claim" kind="danger" disabled={note.trim().length < 5} loading={a.busy === 'reject'}
                onPress={() => void a.run('reject', () => api.adminRejectPayment(job.id, note))} />
            </>
          ) : <Button title="Not received" kind="ghost" onPress={() => setRejecting(true)} />}
        </Card>
      ) : null}

      {actions.includes('admin_resolve') ? (
        <Card style={{ borderColor: colors.danger, borderWidth: 1.5 }}>
          <Text style={font.heading}>Resolve the issue</Text>
          <P muted>{job.dispute_reason}</P>
          <Chips<'release' | 'refund'> label="Decision" value={outcome} onChange={setOutcome}
            options={[{ value: 'release', label: 'Pay technician' }, { value: 'refund', label: 'Refund customer' }]} />
          {outcome ? (
            <>
              <Field label="Explain the decision (both sides see this)" value={note} onChangeText={setNote} multiline maxLength={500} />
              {outcome === 'refund' ? <Field label="Refund transfer reference" value={ref} onChangeText={setRef} maxLength={60} /> : null}
              <Button title={outcome === 'release' ? 'Release to technician' : `Mark ${formatNaira(job.price_kobo)} refunded`}
                kind={outcome === 'release' ? 'primary' : 'danger'} loading={a.busy === 'resolve'}
                disabled={note.trim().length < 5 || (outcome === 'refund' && ref.trim().length < 4)}
                onPress={() => void a.run('resolve', () => api.adminResolveDispute(job.id, outcome, note, ref))} />
            </>
          ) : null}
        </Card>
      ) : null}

      {actions.includes('admin_payout') ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
          <Text style={font.heading}>Pay the technician {formatNaira(job.payout_kobo)}</Text>
          {bank ? (
            <>
              <Row label="Bank" value={bank.bank_name ?? '-'} />
              <Row label="Account" value={bank.account_number ?? '-'} onPress={() => { void Clipboard.setStringAsync(bank.account_number ?? '') }} />
              <Row label="Name" value={bank.account_name ?? '-'} />
            </>
          ) : <Small>Loading bank details…</Small>}
          <Field label="Transfer reference" value={ref} onChangeText={setRef} maxLength={60} />
          <Button title="Mark payout sent" kind="accent" disabled={ref.trim().length < 4} loading={a.busy === 'payout'}
            onPress={() => void a.run('payout', () => api.adminMarkPayoutPaid(job.id, ref))} />
        </Card>
      ) : null}

      {actions.includes('admin_cancel') ? (
        <Button title="Cancel this job" kind="ghost" loading={a.busy === 'cancel'}
          onPress={() => confirmThen('Cancel job?', 'The customer and technician will see it as cancelled.', 'Cancel job',
            () => void a.run('cancel', () => api.cancelJob(job.id, 'Cancelled by UrbanFix')), true)} />
      ) : null}
      <ErrorText error={a.error} />
      {!actions.length ? <Banner tone="neutral" text="Nothing to do on this job." /> : null}
    </View>
  )
}
