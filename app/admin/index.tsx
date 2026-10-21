// Admin to-do list: payments to confirm, technicians to approve, issues, payouts.
import { router, useFocusEffect } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { JobItem } from '@/components/JobItem'
import { Button, Card, Chips, Empty, ErrorText, Loading, Screen, Small, Title } from '@/components/ui'
import { font, spacing } from '@/constants/theme'
import * as api from '@/lib/api'
import type { Job, Technician } from '@/lib/types'
import { displayPhone, formatNaira } from '@/lib/validation'

type Tab = 'payments' | 'technicians' | 'issues' | 'payouts'
type PendingTech = Technician & { profiles: { full_name: string; phone: string } | null }

export default function AdminHome() {
  const [tab, setTab] = useState<Tab>('payments')
  const [payments, setPayments] = useState<Job[] | null>(null)
  const [issues, setIssues] = useState<Job[] | null>(null)
  const [payouts, setPayouts] = useState<Job[] | null>(null)
  const [partPayouts, setPartPayouts] = useState<Job[] | null>(null)
  const [techs, setTechs] = useState<PendingTech[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const [p, i, o, parts, t] = await Promise.all([
        api.adminJobs(['payment_submitted']),
        api.adminJobs(['disputed']),
        api.adminJobs(null, 'repair_fee'),
        api.adminJobs(null, 'part'),
        api.adminPendingTechnicians(),
      ])
      setPayments(p); setIssues(i); setPayouts(o); setPartPayouts(parts); setTechs(t); setError(null)
    } catch (e) {
      setError(api.friendlyError(e))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    void load()
    const t = setInterval(() => void load(), 20000)
    return () => clearInterval(t)
  }, [load]))

  const quickConfirm = (j: Job) => Alert.alert(
    `Confirm ${formatNaira(j.price_kobo)}?`,
    `Only if a transfer from "${j.payment_reference}" with narration ${j.code} has arrived.`,
    [{ text: 'Cancel', style: 'cancel' }, {
      text: 'Confirm', onPress: async () => {
        setBusy(j.id)
        try { await api.adminConfirmPayment(j.id); await load() } catch (e) { Alert.alert('Not confirmed', api.friendlyError(e)) } finally { setBusy(null) }
      },
    }],
  )

  const runAutoRelease = async () => {
    setBusy('auto')
    try {
      const n = await api.adminAutoRelease()
      Alert.alert('Done', n ? `${n} job${n === 1 ? '' : 's'} released for payout.` : 'No jobs were overdue.')
      await load()
    } catch (e) { Alert.alert('Failed', api.friendlyError(e)) } finally { setBusy(null) }
  }

  const count = (x: unknown[] | null) => (x ? ` (${x.length})` : '')
  const loading = payments === null

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <Title>UrbanFix admin</Title>
      <Chips<Tab> value={tab} onChange={setTab} options={[
        { value: 'payments', label: `Payments${count(payments)}` },
        { value: 'technicians', label: `Technicians${count(techs)}` },
        { value: 'issues', label: `Issues${count(issues)}` },
        { value: 'payouts', label: `Payouts${payouts && partPayouts ? ` (${payouts.length + partPayouts.length})` : ''}` },
      ]} />
      <ErrorText error={error} />
      {loading ? <Loading /> : null}

      {!loading && tab === 'payments' ? (payments!.length ? payments!.map((j) => (
        <View key={j.id}>
          <JobItem job={j} role="admin" subtitle={`${j.code} · paid from "${j.payment_reference}"`} />
          <Button title={`Received ${formatNaira(j.price_kobo)}. Confirm`} kind="accent" loading={busy === j.id}
            onPress={() => quickConfirm(j)} style={{ marginTop: -spacing.sm, marginBottom: spacing.lg }} />
        </View>
      )) : <Empty icon="card-outline" title="No payments to confirm" />) : null}

      {!loading && tab === 'technicians' ? (techs!.length ? techs!.map((t) => (
        <Card key={t.id} onPress={() => router.push(`/admin-technician/${t.id}`)} accessibilityLabel={`Review ${t.shop_name}`}>
          <Text style={font.bodyStrong}>{t.shop_name}</Text>
          <Small>{t.profiles?.full_name} · {displayPhone(t.profiles?.phone)} · {t.area}</Small>
          <Small>Submitted {t.submitted_at ? new Date(t.submitted_at).toLocaleString() : ''}</Small>
        </Card>
      )) : <Empty icon="people-outline" title="No technicians waiting" />) : null}

      {!loading && tab === 'issues' ? (issues!.length ? issues!.map((j) => <JobItem key={j.id} job={j} role="admin" subtitle={j.dispute_reason ?? j.code} />)
        : <Empty icon="happy-outline" title="No open issues" />) : null}

      {!loading && tab === 'payouts' ? (
        <>
          {partPayouts!.length ? <Small style={{ marginBottom: spacing.sm }}>Part money (send after payment so they can buy the part)</Small> : null}
          {partPayouts!.map((j) => (
            <JobItem key={`p-${j.id}`} job={{ ...j, payout_kobo: j.part_kobo }} role="admin" amount="payout" subtitle={`${j.code} · part money`} />
          ))}
          {payouts!.length ? <Small style={{ marginBottom: spacing.sm }}>Repair fees (customer confirmed)</Small> : null}
          {payouts!.map((j) => (
            <JobItem key={`f-${j.id}`} job={{ ...j, payout_kobo: j.labour_kobo ?? 0 }} role="admin" amount="payout" subtitle={`${j.code} · repair fee`} />
          ))}
          {!payouts!.length && !partPayouts!.length ? <Empty icon="wallet-outline" title="No payouts due" /> : null}
          <Button title="Release overdue confirmations" kind="secondary" loading={busy === 'auto'} onPress={runAutoRelease} />
          <Small>Releases repairs the customer hasn't confirmed or disputed within 72 hours of being marked ready.</Small>
        </>
      ) : null}
    </Screen>
  )
}
