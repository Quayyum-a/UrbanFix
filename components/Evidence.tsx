// Shows the intake and repair records with their photos (private, signed links).
import React, { useEffect, useState } from 'react'
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Card, Row, Small } from '@/components/ui'
import { colors, font, radius, spacing } from '@/constants/theme'
import { signedUrls } from '@/lib/photos'
import type { Job } from '@/lib/types'

function Photos({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const key = paths.join('|')
  useEffect(() => {
    let live = true
    signedUrls('job-photos', key ? key.split('|') : []).then((u) => { if (live) setUrls(u) })
    return () => { live = false }
  }, [key])
  return (
    <>
      <View style={styles.grid}>
        {paths.map((p) => (
          <Pressable key={p} onPress={() => setOpen(urls[p] ?? null)} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
            {urls[p] ? <Image source={{ uri: urls[p] }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: colors.border }]} />}
          </Pressable>
        ))}
      </View>
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.full} onPress={() => setOpen(null)} accessibilityLabel="Close photo">
          {open ? <Image source={{ uri: open }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </>
  )
}

export function Evidence({ job }: { job: Job }) {
  if (!job.intake_at && !job.completion_photos.length) return null
  return (
    <>
      {job.intake_at ? (
        <Card>
          <Text style={font.bodyStrong}>Device received</Text>
          <Small>Recorded {new Date(job.intake_at).toLocaleString()}</Small>
          <Row label="IMEI / serial" value={job.intake_identifier ?? '-'} />
          {job.model ? <Row label="Model" value={job.model} /> : null}
          {job.intake_notes ? <Row label="Condition" value={job.intake_notes} /> : null}
          <Photos paths={job.intake_photos} />
        </Card>
      ) : null}
      {job.warranty_done_at ? (
        <Card>
          <Text style={font.bodyStrong}>Warranty fix</Text>
          <Small>Recorded {new Date(job.warranty_done_at).toLocaleString()}</Small>
          <Row label="Problem reported" value={job.warranty_reason ?? '-'} />
          <Row label="What was fixed" value={job.warranty_notes ?? '-'} />
          <Photos paths={job.warranty_photos} />
        </Card>
      ) : null}
      {job.completion_photos.length ? (
        <Card>
          <Text style={font.bodyStrong}>Repair done</Text>
          {job.ready_at ? <Small>Recorded {new Date(job.ready_at).toLocaleString()}</Small> : null}
          <Row label="What was fixed" value={job.repair_notes ?? '-'} />
          <Row label="Parts replaced" value={job.parts_replaced ?? 'None'} />
          <Photos paths={job.completion_photos} />
        </Card>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  full: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
})
