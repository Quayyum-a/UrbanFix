import { router } from 'expo-router'
import React from 'react'
import { Text, View } from 'react-native'
import { deviceName, repairLabel } from '@/constants/catalog'
import { colors, font, spacing } from '@/constants/theme'
import { needsMe, STATUS_LABEL, tone } from '@/lib/jobFlow'
import type { Job, JobSummary, Role } from '@/lib/types'
import { formatNaira } from '@/lib/validation'
import { Card, Pill } from './ui'

export function JobItem({ job, role, amount = 'price', subtitle }: {
  job: JobSummary | Job
  role: Role
  amount?: 'price' | 'payout'
  subtitle?: string
}) {
  const who = 'other_party' in job ? job.other_party : null
  const device = deviceName(job.brand, job.model, job.device_type)
  const urgent = needsMe(role, job.status)
  return (
    <Card
      testID={`job-${job.code}`}
      onPress={() => router.push(`/job/${job.id}`)}
      accessibilityLabel={`${device}, ${STATUS_LABEL[job.status]}`}
      style={urgent ? { borderColor: colors.accent, borderWidth: 1.5 } : undefined}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={font.bodyStrong} numberOfLines={1}>{device}</Text>
          <Text style={font.small} numberOfLines={1}>{repairLabel(job.device_type, job.category)}</Text>
          <Text style={[font.small, { marginTop: 2 }]} numberOfLines={1}>{subtitle ?? [who, job.code].filter(Boolean).join(' · ')}</Text>
        </View>
        <Text style={font.bodyStrong}>{formatNaira(amount === 'payout' ? (job.payout_kobo ?? 0) : job.price_kobo)}</Text>
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <Pill text={urgent && role !== 'admin' ? `Your turn · ${STATUS_LABEL[job.status]}` : STATUS_LABEL[job.status]} tone={tone(role, job.status)} />
      </View>
    </Card>
  )
}
