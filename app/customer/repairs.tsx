import { router } from 'expo-router'
import React from 'react'
import { JobItem } from '@/components/JobItem'
import { Button, Empty, ErrorText, Heading, Loading, Screen, Title } from '@/components/ui'
import { useMyJobs } from '@/lib/useJobs'

const DONE = ['completed', 'refunded', 'cancelled', 'declined']

export default function Repairs() {
  const { jobs, error, refreshing, reload } = useMyJobs()
  const open = (jobs ?? []).filter((j) => !DONE.includes(j.status))
  const past = (jobs ?? []).filter((j) => DONE.includes(j.status))

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Title>My repairs</Title>
      <ErrorText error={error} />
      {jobs === null ? <Loading /> : jobs.length === 0 ? (
        <Empty icon="construct-outline" title="No repairs yet" text="When you book a repair, you'll track it here."
          action={<Button title="Book a repair" onPress={() => router.navigate('/customer')} />} />
      ) : (
        <>
          {open.map((j) => <JobItem key={j.id} job={j} role="customer" />)}
          {past.length ? <Heading>Past</Heading> : null}
          {past.map((j) => <JobItem key={j.id} job={j} role="customer" />)}
        </>
      )}
    </Screen>
  )
}
