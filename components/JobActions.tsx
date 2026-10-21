// The action panel on a repair: exactly what the viewer can do right now.
import * as Clipboard from 'expo-clipboard'
import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { PhotoPicker } from '@/components/PhotoPicker'
import { PriceBreakdown } from '@/components/PriceBreakdown'
import { Banner, Button, Card, Chips, Choice, ErrorText, Field, P, Row, Small, Stars } from '@/components/ui'
import { isDeviceType, partModeOf, REPAIRS } from '@/constants/catalog'
import { colors, font, spacing } from '@/constants/theme'
import * as api from '@/lib/api'
import { actionsFor, warrantyOpen } from '@/lib/jobFlow'
import { DEFAULT_FEES, getFeeSettings, platformFee, type FeeSettings } from '@/lib/pricing'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import type { DeviceModel, Grade, GradeOption, JobDetails, Service, TechnicianPrivate } from '@/lib/types'
import { deviceIdProblem, formatNaira, parseNairaToKobo, textProblem } from '@/lib/validation'

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
  const actions = actionsFor(role, d.job.status, {
    reviewed: !!d.review,
    payoutDue: d.job.payout_status === 'due',
    partPayoutDue: d.job.part_payout_status === 'due',
    canClaimWarranty: warrantyOpen(d.job.warranty_until, d.job.warranty_claimed_at),
  })
  if (!actions.length) return null
  if (role === 'customer') return <CustomerActions d={d} onChanged={onChanged} actions={actions} />
  if (role === 'technician') return <TechnicianActions d={d} onChanged={onChanged} actions={actions} />
  return <AdminActions d={d} onChanged={onChanged} actions={actions} />
}

// ------------------------------------------------------------------ customer
function CustomerActions({ d, onChanged, actions }: Props & { actions: string[] }) {
  const { job, breakdown: b } = d
  const profile = useSession((s) => s.profile)
  const a = useAction(onChanged)
  const [payer, setPayer] = useState(profile?.full_name ?? '')
  const [form, setForm] = useState<'dispute' | 'warranty' | 'decline' | null>(null)
  const [reason, setReason] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const copy = (v: string) => { void Clipboard.setStringAsync(v); Alert.alert('Copied', v) }
  const reasonErr = textProblem(reason, { min: 10, max: 500, field: 'what went wrong' })
  const total = formatNaira(b.total_kobo)

  return (
    <View>
      {actions.includes('pay') && d.payment_account ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
          <Text style={font.heading}>Price confirmed: {total}</Text>
          <Small style={{ marginBottom: spacing.sm }}>The technician checked your device. Here's what you pay:</Small>
          <PriceBreakdown partKobo={b.part_kobo} partPending={false} gradeLabel={b.grade_label} partLabel={b.part_label}
            serviceChargeKobo={b.service_charge_kobo} needsPart={b.part_kobo > 0 || !!b.grade} wasKobo={b.estimate_kobo} />
          <View style={{ height: spacing.md }} />
          <Text style={font.bodyStrong}>Transfer {total} to UrbanFix</Text>
          <Small style={{ marginBottom: spacing.xs }}>We hold it and only pay the technician after you confirm the repair.</Small>
          <Row label="Bank" value={d.payment_account.bank_name} />
          <Row label="Account number" value={d.payment_account.account_number} onPress={() => copy(d.payment_account!.account_number)} />
          <Row label="Account name" value={d.payment_account.account_name} />
          <Row label="Narration" value={job.code} onPress={() => copy(job.code)} />
          <Button title="Copy account number" kind="secondary" icon="copy-outline" onPress={() => copy(d.payment_account!.account_number)} style={{ marginTop: spacing.sm }} />
          <Field label="Name on the account you paid from" value={payer} onChangeText={setPayer} maxLength={60}
            hint="This helps us match your transfer quickly." />
          <Button title={`I've sent ${total}`} kind="accent" testID="paid"
            loading={a.busy === 'pay'} disabled={payer.trim().length < 4}
            onPress={() => void a.run('pay', () => api.submitPayment(job.id, payer))} />
          {form === 'decline' ? (
            <>
              <Field label="Why? (optional)" value={reason} onChangeText={setReason} maxLength={200} />
              <Button title="Decline price and get my device back" kind="danger" loading={a.busy === 'decline'} testID="decline-quote-send"
                onPress={() => void a.run('decline', () => api.declineQuote(job.id, reason))} />
            </>
          ) : <Button title="I don't want to pay this" kind="ghost" onPress={() => { setReason(''); setForm('decline') }} testID="decline-quote" />}
        </Card>
      ) : null}

      {actions.includes('confirm') ? (
        <Card style={{ borderColor: colors.success, borderWidth: 1.5 }}>
          <Text style={font.heading}>Is your device working?</Text>
          <Small style={{ marginBottom: spacing.md }}>Check it properly. Confirming releases the payment to the technician.</Small>
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

      {actions.includes('claim_warranty') ? (
        form === 'warranty' ? (
          <Card>
            <Text style={font.heading}>Use your warranty</Text>
            <Small style={{ marginBottom: spacing.md }}>The technician will fix it again at no extra cost.</Small>
            <Field label="What's wrong now?" value={reason} onChangeText={setReason} multiline maxLength={500}
              error={reason ? reasonErr : null} testID="warranty-reason" />
            <Button title="Send warranty claim" kind="accent" disabled={!!reasonErr} loading={a.busy === 'warranty'} testID="warranty-send"
              onPress={() => void a.run('warranty', () => api.claimWarranty(job.id, reason))} />
            <Button title="Never mind" kind="ghost" onPress={() => setForm(null)} />
          </Card>
        ) : (
          <Button title={`Problem again? Use warranty (until ${new Date(job.warranty_until!).toLocaleDateString()})`} kind="secondary"
            icon="shield-checkmark-outline" onPress={() => { setReason(''); setForm('warranty') }} testID="claim-warranty" />
        )
      ) : null}

      {actions.includes('dispute') ? (
        form === 'dispute' ? (
          <Card>
            <Text style={font.heading}>Report a problem</Text>
            <Small style={{ marginBottom: spacing.md }}>Your payment stays held while UrbanFix looks into it.</Small>
            <Field label="What went wrong?" value={reason} onChangeText={setReason} multiline maxLength={500}
              error={reason ? reasonErr : null} testID="dispute-reason" />
            <Button title="Send to UrbanFix" kind="danger" disabled={!!reasonErr} loading={a.busy === 'dispute'} testID="dispute-send"
              onPress={() => void a.run('dispute', () => api.raiseDispute(job.id, reason))} />
            <Button title="Never mind" kind="ghost" onPress={() => setForm(null)} />
          </Card>
        ) : (
          <Button title={job.status === 'awaiting_confirmation' ? "Something's wrong" : 'Report a problem'} kind="danger"
            icon="alert-circle-outline" onPress={() => { setReason(''); setForm('dispute') }} testID="dispute" />
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
  const [photos, setPhotos] = useState<string[]>([])
  const [fixNotes, setFixNotes] = useState('')
  const [parts, setParts] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)

  if (actions.includes('accept')) {
    return (
      <View>
        <Button title={`Accept · you earn about ${formatNaira(job.payout_kobo ?? 0)}`} kind="accent" icon="checkmark" testID="accept"
          loading={a.busy === 'accept'} onPress={() => void a.run('accept', () => api.acceptJob(job.id))} />
        {job.part_pending ? <Small style={{ marginBottom: spacing.sm }}>Plus the part, which you price after checking the device.</Small> : null}
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

  const cancelButton = actions.includes('cancel') ? (
    declining ? (
      <Card>
        <Field label="Why can't you do this job?" value={reason} onChangeText={setReason} maxLength={200}
          error={reason && reason.trim().length < 5 ? 'At least 5 characters.' : null} />
        <Button title="Cancel job" kind="danger" disabled={reason.trim().length < 5} loading={a.busy === 'cancel'}
          onPress={() => void a.run('cancel', () => api.cancelJob(job.id, reason))} />
      </Card>
    ) : <Button title="I can't do this job" kind="ghost" onPress={() => setDeclining(true)} />
  ) : null

  if (actions.includes('record_intake')) {
    return (
      <View>
        <QuoteForm d={d} onChanged={onChanged} legacy={job.status === 'paid'} />
        {cancelButton}
      </View>
    )
  }

  if (actions.includes('mark_ready')) {
    const warranty = job.status === 'warranty'
    const notesErr = textProblem(fixNotes, { min: 5, max: 500, field: 'what you fixed' })
    return (
      <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
        <Text style={font.heading}>{warranty ? 'Fix it under warranty' : 'Finish the repair'}</Text>
        {warranty ? <Banner tone="warn" text={`Customer says: ${job.warranty_reason ?? ''}`} /> : null}
        {!warranty && job.grade ? (
          <Small style={{ marginBottom: spacing.md }}>The customer paid for: {d.breakdown.grade_label}{job.part_label ? ` (${job.part_label})` : ''}. Fit that grade and show it in your photos.</Small>
        ) : null}
        <Field label="What did you fix?" value={fixNotes} onChangeText={setFixNotes} multiline maxLength={500}
          error={triedSubmit ? notesErr : null} testID="fix-notes" />
        {!warranty ? (
          <Field label="Parts replaced (leave empty if none)" placeholder="e.g. Screen (GX OLED)" value={parts}
            onChangeText={setParts} maxLength={300} />
        ) : null}
        <PhotoPicker bucket="job-photos" folder={job.id} prefix={warranty ? 'warranty' : 'done'} value={photos} onChange={setPhotos}
          label="Photos of the repaired device and the new part (1 to 4)" />
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

  return cancelButton
}

/** Technician records the device and confirms model, problem, part quality and the final price. */
function QuoteForm({ d, onChanged, legacy }: Props & { legacy: boolean }) {
  const { job } = d
  const a = useAction(onChanged)
  const [imei, setImei] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [triedSubmit, setTriedSubmit] = useState(false)
  // Model, problem and quality start as the customer chose; the technician can correct them.
  const [modelId, setModelId] = useState<number | null>(job.model_id)
  const [modelName, setModelName] = useState(job.model ?? '')
  const [models, setModels] = useState<DeviceModel[] | null>(null)
  const [changingModel, setChangingModel] = useState(false)
  const [category, setCategory] = useState(job.category)
  const [grade, setGrade] = useState<Grade | null>(job.grade)
  const [grades, setGrades] = useState<GradeOption[] | null>(null)
  const [partInput, setPartInput] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES)

  const mode = partModeOf(job.device_type, category)
  useEffect(() => {
    void getFeeSettings().then(setFees)
    void api.getMyTechnician().then((t) => setServices(t?.services ?? [])).catch(() => {})
  }, [])
  useEffect(() => {
    // Models of the same brand, for correcting the customer's pick.
    if (!job.model_id) return
    const load = async () => {
      try {
        const { data } = await supabase.from('device_models').select('brand').eq('id', job.model_id).maybeSingle()
        setModels(data ? await api.listModels(job.device_type, data.brand) : [])
      } catch { setModels([]) }
    }
    void load()
  }, [job.model_id, job.device_type])
  useEffect(() => {
    if (mode === 'none') return
    let live = true
    api.gradeOptions(modelId, category).then((g) => { if (live) setGrades(g) }).catch(() => { if (live) setGrades([]) })
    return () => { live = false }
  }, [modelId, category, mode])

  const listed = grades?.find((g) => g.grade === grade)?.part_kobo ?? null
  const needsPartInput = mode !== 'none' && listed == null
  const typedPart = partInput === '' ? null : parseNairaToKobo(partInput)
  const partKobo = mode === 'none' ? 0 : (listed ?? typedPart ?? 0)
  const noPart = mode === 'inspection' && partInput.trim() === '0'
  const labour = category === job.category ? (job.labour_kobo ?? 0)
    : (services.find((s) => s.device_type === job.device_type && s.category === category && s.is_active)?.price_kobo ?? null)
  const fee = platformFee(partKobo, job.is_repeat, fees)
  const offered = isDeviceType(job.device_type)
    ? REPAIRS[job.device_type].filter((r) => r.category === job.category || services.some((s) => s.device_type === job.device_type && s.category === r.category && s.is_active))
    : []

  const idErr = deviceIdProblem(imei)
  const partErr = needsPartInput && !noPart
    ? (typedPart == null ? 'Enter the part price in naira.' : typedPart < 50_000 ? 'At least ₦500.' : null)
    : null

  const submit = () => {
    setTriedSubmit(true)
    if (idErr) return
    if (!photos.length) { a.setError('Add at least one photo of the device.'); return }
    if (legacy) { void a.run('intake', () => api.recordIntake(job.id, { identifier: imei, notes, photos })); return }
    if (mode !== 'none' && !grade && !noPart) { a.setError('Choose the part quality.'); return }
    if (partErr) return
    if (labour == null) { a.setError('Add this repair to your prices first (Account → Shop, prices, bank and ID).'); return }
    const run = () => a.run('intake', () => api.recordIntake(job.id, {
      identifier: imei, notes, photos,
      modelId, modelText: modelId ? null : modelName, category,
      grade: noPart ? null : grade, partKobo: needsPartInput ? (noPart ? 0 : typedPart) : null,
    }))
    confirmThen('Send price to customer?', `They'll pay ${formatNaira(partKobo + labour + fee)} to UrbanFix before you start.`, 'Send price', () => void run())
  }

  return (
    <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
      <Text style={font.heading}>{legacy ? 'Record the device you received' : 'Check the device and confirm the price'}</Text>
      <Small style={{ marginBottom: spacing.md }}>Do this in front of the customer. The customer pays after you send the price.</Small>
      <Field label="IMEI or serial number" value={imei} onChangeText={setImei} autoCapitalize="characters" maxLength={32}
        hint="On phones, dial *#06#. On laptops, check the sticker underneath." error={triedSubmit || imei.length >= 15 ? idErr : null} testID="imei" />
      <Field label="Condition notes (optional)" placeholder="e.g. Screen cracked top-left, small dent on frame" value={notes}
        onChangeText={setNotes} multiline maxLength={500} />
      <PhotoPicker bucket="job-photos" folder={job.id} prefix="intake" value={photos} onChange={setPhotos} label="Photos of the device now (1 to 4)" />

      {!legacy ? (
        <>
          <Text style={[font.label, { marginBottom: spacing.xs }]}>Model</Text>
          {changingModel && models?.length ? (
            <View style={{ marginBottom: spacing.md }}>
              {models.map((m) => (
                <Choice key={m.id} title={m.name} subtitle={m.hint ?? undefined} selected={m.id === modelId}
                  onPress={() => { setModelId(m.id); setModelName(m.name); setChangingModel(false) }} />
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={font.bodyStrong}>{modelName || 'Not set'}</Text>
              {models?.length ? <Button title="Wrong model?" kind="ghost" onPress={() => setChangingModel(true)} style={{ minHeight: 36, marginBottom: 0 }} /> : null}
            </View>
          )}
          {offered.length > 1 ? (
            <Chips label="Problem" value={category} onChange={(c) => { setCategory(c); setPartInput('') }}
              options={offered.map((r) => ({ value: r.category, label: r.label }))} />
          ) : null}
          {mode !== 'none' ? (
            <Chips<Grade> label="Part quality" value={grade} onChange={(g) => { setGrade(g); setPartInput('') }} testID="quote-grade"
              options={(grades ?? []).map((g) => ({ value: g.grade, label: g.part_kobo != null ? `${g.label} · ${formatNaira(g.part_kobo)}` : g.label }))} />
          ) : null}
          {needsPartInput ? (
            <Field label="Part price (₦)" placeholder="What the part costs" keyboardType="number-pad" value={partInput}
              onChangeText={(t) => setPartInput(t.replace(/[^0-9]/g, '').slice(0, 7))}
              hint={mode === 'inspection' ? 'Enter 0 if no part is needed.' : 'This model has no listed price yet. Enter what the part costs.'}
              error={triedSubmit ? partErr : null} testID="part-price" />
          ) : null}
          {labour != null ? (
            <Card style={{ backgroundColor: colors.background }}>
              <Small>Customer pays</Small>
              <PriceBreakdown partKobo={partKobo} partPending={false} gradeLabel={noPart ? null : (grades?.find((g) => g.grade === grade)?.label)}
                partLabel={grades?.find((g) => g.grade === grade)?.market_label} serviceChargeKobo={labour + fee}
                needsPart={mode !== 'none' && !noPart} />
              <Row label="You get" value={`${formatNaira(partKobo + labour)} (part ${formatNaira(partKobo)} when they pay, fee ${formatNaira(labour)} when they confirm)`} />
            </Card>
          ) : null}
        </>
      ) : null}

      <Button title={legacy ? 'Save and start repair' : 'Send price to customer'} kind="accent" testID="save-intake" loading={a.busy === 'intake'} onPress={submit} />
      <ErrorText error={a.error} />
    </Card>
  )
}

// --------------------------------------------------------------------- admin
function PayoutCard({ title, amount, bank, onPaid, busy }: {
  title: string; amount: number; bank: TechnicianPrivate | null; onPaid: (ref: string) => void; busy: boolean
}) {
  const [ref, setRef] = useState('')
  return (
    <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
      <Text style={font.heading}>{title} {formatNaira(amount)}</Text>
      {bank ? (
        <>
          <Row label="Bank" value={bank.bank_name ?? 'Not added yet'} />
          <Row label="Account" value={bank.account_number ?? '-'} onPress={() => { void Clipboard.setStringAsync(bank.account_number ?? '') }} />
          <Row label="Name" value={bank.account_name ?? '-'} />
        </>
      ) : <Small>Loading bank details…</Small>}
      <Field label="Transfer reference" value={ref} onChangeText={setRef} maxLength={60} />
      <Button title="Mark as sent" kind="accent" disabled={ref.trim().length < 4} loading={busy} onPress={() => onPaid(ref)} />
    </Card>
  )
}

function AdminActions({ d, onChanged, actions }: Props & { actions: string[] }) {
  const { job } = d
  const a = useAction(onChanged)
  const [note, setNote] = useState('')
  const [ref, setRef] = useState('')
  const [outcome, setOutcome] = useState<'release' | 'refund' | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [bank, setBank] = useState<TechnicianPrivate | null>(null)

  const needsBank = actions.includes('admin_payout') || actions.includes('admin_part_payout')
  useEffect(() => {
    if (needsBank) api.adminTechnicianDetails(job.technician_id).then((r) => setBank(r?.private ?? null)).catch(() => {})
  }, [needsBank, job.technician_id])
  const labour = useMemo(() => job.labour_kobo ?? 0, [job.labour_kobo])

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

      {actions.includes('admin_part_payout') ? (
        <PayoutCard title="Send part money" amount={job.part_kobo} bank={bank} busy={a.busy === 'part'}
          onPaid={(r) => void a.run('part', () => api.adminMarkPartPayoutPaid(job.id, r))} />
      ) : null}

      {actions.includes('admin_resolve') ? (
        <Card style={{ borderColor: colors.danger, borderWidth: 1.5 }}>
          <Text style={font.heading}>Resolve the issue</Text>
          <P muted>{job.dispute_reason}</P>
          {job.part_payout_status === 'paid' ? <Banner tone="warn" text={`Part money (${formatNaira(job.part_kobo)}) was already sent to the technician.`} /> : null}
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
        <PayoutCard title="Send repair fee" amount={labour} bank={bank} busy={a.busy === 'payout'}
          onPaid={(r) => void a.run('payout', () => api.adminMarkPayoutPaid(job.id, r))} />
      ) : null}

      {actions.includes('admin_cancel') ? (
        <Button title="Cancel this job" kind="ghost" loading={a.busy === 'cancel'}
          onPress={() => confirmThen('Cancel job?', 'The customer and technician will see it as cancelled.', 'Cancel job',
            () => void a.run('cancel', () => api.cancelJob(job.id, 'Cancelled by UrbanFix')), true)} />
      ) : null}
      <ErrorText error={a.error} />
    </View>
  )
}
