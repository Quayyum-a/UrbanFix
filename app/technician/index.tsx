// Technician home: approval status, online switch, and jobs that need you first.
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Switch, Text, View } from 'react-native'
import { JobItem } from '@/components/JobItem'
import { Banner, Button, Card, Empty, ErrorText, Heading, Loading, Screen, Small, Title } from '@/components/ui'
import { colors, font, spacing } from '@/constants/theme'
import { friendlyError, setAvailability } from '@/lib/api'
import { needsMe } from '@/lib/jobFlow'
import { useSession } from '@/lib/session'
import { useMyJobs } from '@/lib/useJobs'
import { setupProgress, useMyTechnician } from '@/lib/useTechnician'

const DONE = ['completed', 'refunded', 'cancelled', 'declined']

export default function TechnicianJobs() {
  const profile = useSession((s) => s.profile)
  const { data, reload: reloadTech } = useMyTechnician()
  const { jobs, error, refreshing, reload } = useMyJobs(10000)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  if (!data) return <Screen scroll={false}><Loading /></Screen>
  const { tech } = data
  const progress = setupProgress(data)

  const toggle = async (v: boolean) => {
    setToggling(true); setToggleError(null)
    try { await setAvailability(v); await reloadTech() } catch (e) { setToggleError(friendlyError(e)) } finally { setToggling(false) }
  }

  const all = jobs ?? []
  const mine = all.filter((j) => needsMe('technician', j.status))
  const waiting = all.filter((j) => !DONE.includes(j.status) && !needsMe('technician', j.status))
  const done = all.filter((j) => DONE.includes(j.status)).slice(0, 20)

  return (
    <Screen refreshing={refreshing} onRefresh={() => { void reload(); void reloadTech(true) }}>
      <Title>Hi {profile?.full_name.split(' ')[0]}</Title>

      {tech.status === 'draft' || tech.status === 'rejected' ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
          <Text style={font.heading}>{tech.status === 'rejected' ? 'Update your details' : 'Finish your profile to get jobs'}</Text>
          {tech.status === 'rejected' ? <Small>Reason: {tech.status_reason}</Small> : null}
          <Small style={{ marginBottom: spacing.md }}>
            {[progress.shop, progress.services, progress.bank, progress.identity].filter(Boolean).length} of 4 steps done
          </Small>
          <Button title={tech.status === 'rejected' ? 'Fix and resubmit' : 'Continue setup'} kind="accent" onPress={() => router.push('/technician-setup')} testID="continue-setup" />
        </Card>
      ) : null}
      {tech.status === 'pending' ? <Banner tone="neutral" icon="time-outline" text="UrbanFix is reviewing your profile. You'll be able to go online once approved." /> : null}
      {tech.status === 'suspended' ? <Banner tone="bad" text={`Your account is suspended: ${tech.status_reason ?? ''}. Contact UrbanFix support.`} /> : null}

      {tech.status === 'approved' && !data.priv?.account_number ? (
        <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
          <Text style={font.bodyStrong}>Add your bank account</Text>
          <Small style={{ marginBottom: spacing.md }}>So UrbanFix can pay you when a customer confirms a repair.</Small>
          <Button title="Add bank details" kind="accent" onPress={() => router.push('/technician-setup')} testID="add-bank" />
        </Card>
      ) : null}

      {tech.status === 'approved' ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={font.bodyStrong}>{tech.is_available ? "You're online" : "You're offline"}</Text>
              <Small>{tech.is_available ? 'Customers can book you now.' : "Customers can't see you."}</Small>
            </View>
            <Switch value={tech.is_available} onValueChange={(v) => void toggle(v)} disabled={toggling}
              trackColor={{ true: colors.success, false: colors.border }} accessibilityLabel="Available for jobs" testID="availability" />
          </View>
          <ErrorText error={toggleError} />
        </Card>
      ) : null}

      <ErrorText error={error} />
      {jobs === null ? <Loading /> : (
        <>
          {mine.length ? <Heading>Needs you</Heading> : null}
          {mine.map((j) => <JobItem key={j.id} job={j} role="technician" amount="payout" />)}
          {waiting.length ? <Heading>In progress</Heading> : null}
          {waiting.map((j) => <JobItem key={j.id} job={j} role="technician" amount="payout" />)}
          {!mine.length && !waiting.length ? (
            <Empty icon="briefcase-outline" title="No jobs right now"
              text={tech.status === 'approved' ? (tech.is_available ? "New requests will show up here." : 'Go online to get requests.') : 'Jobs appear here once you are approved.'} />
          ) : null}
          {done.length ? <Heading>Recent</Heading> : null}
          {done.map((j) => <JobItem key={j.id} job={j} role="technician" amount="payout" />)}
        </>
      )}
    </Screen>
  )
}
