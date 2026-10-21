// One repair, as seen by the customer, the technician or an admin.
import { Ionicons } from '@expo/vector-icons'
import { Redirect, router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useRef, useState } from 'react'
import { Linking, Text, View } from 'react-native'
import { Evidence } from '@/components/Evidence'
import { PriceBreakdown } from '@/components/PriceBreakdown'
import { JobActions } from '@/components/JobActions'
import { Banner, Button, Card, Empty, Heading, Loading, Pill, Row, Screen, Small, Stars } from '@/components/ui'
import { deviceName, repairLabel } from '@/constants/catalog'
import { colors, font, spacing } from '@/constants/theme'
import { friendlyError, getJob } from '@/lib/api'
import { hoursLeft, nextStep, PROGRESS_STEPS, progressIndex, STATUS_LABEL, tone } from '@/lib/jobFlow'
import { useSession } from '@/lib/session'
import type { JobDetails, PayoutStatus } from '@/lib/types'
import { displayPhone, formatNaira } from '@/lib/validation'

function Progress({ index }: { index: number }) {
  if (index < 0) return null
  return (
    <View style={{ flexDirection: 'row', marginBottom: spacing.lg }} accessibilityLabel={`Step ${index + 1} of ${PROGRESS_STEPS.length}: ${PROGRESS_STEPS[index]}`}>
      {PROGRESS_STEPS.map((s, i) => (
        <View key={s} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ height: 6, alignSelf: 'stretch', marginHorizontal: 2, borderRadius: 3, backgroundColor: i <= index ? colors.success : colors.border }} />
          <Small style={{ fontSize: 11, marginTop: 4, color: i <= index ? colors.text : colors.textFaint }}>{s}</Small>
        </View>
      ))}
    </View>
  )
}

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [d, setD] = useState<JobDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const alive = useRef(true)
  const sessionStatus = useSession((s) => s.status)

  const load = useCallback(async (manual = false) => {
    if (!id) return
    if (manual) setRefreshing(true)
    try {
      const data = await getJob(id)
      if (alive.current) { setD(data); setError(null) }
    } catch (e) {
      if (alive.current) setError(friendlyError(e))
    } finally {
      if (alive.current) setRefreshing(false)
    }
  }, [id])

  useFocusEffect(useCallback(() => {
    alive.current = true
    void load()
    const t = setInterval(() => void load(), 10000)
    return () => { alive.current = false; clearInterval(t) }
  }, [load]))

  if (sessionStatus === 'signed_out') return <Redirect href="/" />

  if (!d) {
    return (
      <Screen scroll={false} edges={['left', 'right']}>
        {error ? <Empty icon="alert-circle-outline" title="Couldn't open this repair" text={error}
          action={<Button title="Try again" onPress={() => void load(true)} />} /> : <Loading />}
      </Screen>
    )
  }

  const { job, viewer_role: role } = d
  const other = role === 'customer' ? (d.technician.shop_name ?? d.technician.name) : d.customer.name
  const otherPhone = role === 'customer' ? d.technician.phone : d.customer.phone
  const device = deviceName(job.brand, job.model, job.device_type)
  const closed = ['declined', 'cancelled'].includes(job.status)

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={() => void load(true)}>
      <Stack.Screen options={{ title: job.code }} />
      {error ? <Banner tone="bad" text={error} /> : null}

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={font.heading}>{device}</Text>
            <Small>{repairLabel(job.device_type, job.category)}</Small>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={font.heading}>{formatNaira(role === 'technician' ? (job.payout_kobo ?? 0) : job.price_kobo)}</Text>
            <Small>{role === 'technician' ? 'you get' : d.breakdown.price_confirmed ? 'total' : 'estimate'}</Small>
          </View>
        </View>
        <View style={{ marginTop: spacing.sm }}><Pill text={STATUS_LABEL[job.status]} tone={tone(role, job.status)} /></View>
      </Card>

      {role !== 'admin' ? <Progress index={progressIndex(job.status)} /> : null}
      {role === 'customer' && job.status !== 'quoted' ? (
        <Card>
          <PriceBreakdown partKobo={d.breakdown.part_kobo} partPending={d.breakdown.part_pending} gradeLabel={d.breakdown.grade_label}
            partLabel={d.breakdown.part_label} serviceChargeKobo={d.breakdown.service_charge_kobo}
            needsPart={d.breakdown.part_kobo > 0 || !!d.breakdown.grade || d.breakdown.part_pending}
            estimate={!d.breakdown.price_confirmed && ['requested', 'accepted'].includes(job.status)} />
          {d.breakdown.warranty_until ? (
            <Small style={{ marginTop: spacing.xs }}>Warranty until {new Date(d.breakdown.warranty_until).toLocaleDateString()}{job.warranty_claimed_at ? ' (used)' : ''}</Small>
          ) : d.breakdown.grade ? <Small style={{ marginTop: spacing.xs }}>{d.breakdown.warranty_days}-day warranty after the repair</Small> : null}
        </Card>
      ) : null}
      <Banner tone="neutral" icon="arrow-forward-circle-outline"
        text={nextStep(role, job.status, { mode: job.service_mode, other, hoursLeft: job.status === 'awaiting_confirmation' ? hoursLeft(job.ready_at, d.auto_release_hours) : null })} />
      {job.status_note && !['completed'].includes(job.status) ? <Banner tone={job.status === 'accepted' ? 'bad' : 'warn'} text={`Note: ${job.status_note}`} /> : null}
      {job.status === 'completed' && job.status_note ? <Banner tone="neutral" text={`UrbanFix decision: ${job.status_note}`} /> : null}

      <JobActions d={d} onChanged={() => void load()} />

      {!closed ? (
        <Button title={`Message ${role === 'admin' ? 'customer and technician' : other}`} kind="secondary" icon="chatbubbles-outline"
          onPress={() => router.push(`/job/${job.id}/chat`)} testID="open-chat" />
      ) : null}

      <Heading>Details</Heading>
      <Card>
        {role !== 'customer' ? <Row label="Customer" value={d.customer.name} /> : null}
        {role !== 'technician' ? <Row label="Technician" value={d.technician.shop_name ?? d.technician.name} /> : null}
        <Row label="How" value={job.service_mode === 'visit' ? 'Technician comes to customer' : 'Customer drops off'} />
        {job.service_mode === 'visit' && job.address ? <Row label="Address" value={job.address} /> : null}
        {job.service_mode === 'drop_off' && d.technician.shop_address ? <Row label="Shop" value={d.technician.shop_address} /> : null}
        {job.issue_note ? <Row label="Notes" value={job.issue_note} /> : null}
        {otherPhone && role !== 'admin' ? <Row label={role === 'customer' ? 'Technician phone' : 'Customer phone'} value={displayPhone(otherPhone)} /> : null}
        {role === 'admin' ? (
          <>
            <Row label="Customer phone" value={displayPhone(d.customer.phone)} />
            <Row label="Technician phone" value={displayPhone(d.technician.phone)} />
            <Row label="Part" value={`${formatNaira(job.part_kobo)}${job.part_label ? ` · ${job.part_label}` : ''}${d.breakdown.grade_label ? ` · ${d.breakdown.grade_label}` : ''}`} />
            <Row label="Repair fee" value={formatNaira(job.labour_kobo ?? 0)} />
            <Row label="UrbanFix fee" value={`${formatNaira(job.commission_kobo ?? 0)}${job.is_repeat ? ' (repeat rate)' : ''}`} />
            <Row label="Part money" value={payoutText(job.part_payout_status, null)} />
            <Row label="Repair fee payout" value={payoutText(job.payout_status, job.payout_reference ?? null)} />
          </>
        ) : null}
        {job.dispute_reason ? <Row label="Issue raised" value={job.dispute_reason} /> : null}
      </Card>
      {otherPhone && role !== 'admin' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button style={{ flex: 1 }} title="Call" kind="secondary" icon="call-outline" onPress={() => void Linking.openURL(`tel:${otherPhone}`)} />
          <Button style={{ flex: 1 }} title="WhatsApp" kind="secondary" icon="logo-whatsapp" onPress={() => void Linking.openURL(`https://wa.me/${otherPhone.replace('+', '')}`)} />
        </View>
      ) : null}

      <Evidence job={job} />

      {d.review ? (
        <Card>
          <Text style={font.bodyStrong}>Customer rating</Text>
          <View style={{ marginVertical: spacing.sm }}><Stars value={d.review.rating} size={22} /></View>
          {d.review.comment ? <Small>"{d.review.comment}"</Small> : null}
        </Card>
      ) : null}

      <Heading>History</Heading>
      {d.events.slice().reverse().map((e) => (
        <View key={e.id} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Ionicons name="ellipse" size={10} color={colors.textFaint} style={{ marginTop: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={font.body}>{STATUS_LABEL[e.to_status]}{e.from_status === e.to_status && e.note ? ` · ${e.note}` : ''}</Text>
            <Small>{new Date(e.created_at).toLocaleString()} · {e.actor_role}</Small>
          </View>
        </View>
      ))}
      <Small style={{ marginTop: spacing.md }}>Repair {job.code}</Small>
    </Screen>
  )
}

function payoutText(status: PayoutStatus | undefined, reference: string | null): string {
  if (status === 'paid') return reference ? `Sent · ${reference}` : 'Sent'
  return status === 'due' ? 'Due now' : 'Not due'
}
