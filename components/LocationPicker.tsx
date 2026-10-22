// "Use my location" in one tap. Falls back to picking an area only if the
// phone's location is off or we can't place it.
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { AREAS } from '@/constants/catalog'
import { colors, font, spacing } from '@/constants/theme'
import { detectArea, type DetectResult } from '@/lib/location'
import { Button, Card, Chips, Small } from './ui'

export function LocationPicker({ area, onChange, title = 'Your area', why, compact }: {
  area: string | null
  onChange: (area: string, address: string | null) => void
  title?: string
  why?: string
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<Extract<DetectResult, { ok: false }> | null>(null)

  const detect = async () => {
    setBusy(true); setFailed(null)
    const r = await detectArea()
    setBusy(false)
    if (r.ok) onChange(r.area, r.address)
    else setFailed(r)
  }

  const message = failed?.reason === 'denied'
    ? 'Location is off for UrbanFix. Pick your area instead.'
    : failed?.reason === 'outside'
      ? `We're not in ${failed.nearby ?? 'your area'} yet. Pick the closest area we cover.`
      : failed ? "Couldn't find your location. Pick your area instead." : null

  return (
    <Card style={compact ? { marginBottom: spacing.md } : undefined} testID="location-picker">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: area || why ? spacing.xs : spacing.md }}>
        <Ionicons name={area ? 'location' : 'location-outline'} size={22} color={area ? colors.success : colors.primary} />
        <Text style={[font.bodyStrong, { flex: 1 }]}>{area ? `${title}: ${area}` : title}</Text>
      </View>
      {!area && why ? <Small style={{ marginBottom: spacing.md }}>{why}</Small> : null}
      {message ? <Small style={{ color: colors.warning, marginBottom: spacing.sm }}>{message}</Small> : null}
      {failed ? (
        <Chips options={AREAS.map((a) => ({ value: a, label: a }))} value={area} onChange={(a) => onChange(a, null)} testID="area-chips" />
      ) : (
        <Button title={area ? 'Update from my location' : 'Use my location'} kind={area ? 'ghost' : 'primary'} icon="navigate-outline"
          onPress={() => void detect()} loading={busy} testID="use-location" style={area ? { marginBottom: 0 } : undefined} />
      )}
    </Card>
  )
}
