import { useFocusEffect } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Text } from 'react-native'
import { Card, ErrorText, Loading, Row, Screen, Small, Stars, Title } from '@/components/ui'
import { font, spacing } from '@/constants/theme'
import { friendlyError, myEarnings } from '@/lib/api'
import type { Earnings } from '@/lib/types'
import { formatNaira } from '@/lib/validation'

export default function EarningsScreen() {
  const [e, setE] = useState<Earnings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try { setE(await myEarnings()); setError(null) } catch (err) { setError(friendlyError(err)) } finally { setRefreshing(false) }
  }, [])
  useFocusEffect(useCallback(() => { void load() }, [load]))

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <Title sub="What you've earned through UrbanFix, after fees.">Earnings</Title>
      <ErrorText error={error} />
      {!e ? <Loading /> : (
        <>
          <Card>
            <Small>Paid to your bank</Small>
            <Text style={[font.title, { marginBottom: spacing.sm }]}>{formatNaira(e.paid_kobo)}</Text>
            <Row label="On its way (job confirmed)" value={formatNaira(e.due_kobo)} />
            <Row label="Held in escrow (jobs in progress)" value={formatNaira(e.in_escrow_kobo)} />
            <Row label="Completed repairs" value={String(e.completed_jobs)} />
          </Card>
          <Card>
            <Small>Your rating</Small>
            {e.reviews ? (
              <>
                <Stars value={Math.round(Number(e.rating ?? 0))} size={26} />
                <Small style={{ marginTop: spacing.xs }}>{Number(e.rating).toFixed(1)} from {e.reviews} review{e.reviews === 1 ? '' : 's'}</Small>
              </>
            ) : <Small>No ratings yet. Customers rate you after confirming a repair.</Small>}
          </Card>
          <Small>Payouts are sent to the bank account in your profile after the customer confirms the repair (or automatically after 72 hours).</Small>
        </>
      )}
    </Screen>
  )
}
