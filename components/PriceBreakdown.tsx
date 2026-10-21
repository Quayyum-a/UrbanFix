// What the customer pays: Part (grade) + Service charge = Total.
// The service charge combines the technician's fee and UrbanFix's fee on purpose.
import React from 'react'
import { Text, View } from 'react-native'
import { colors, font, spacing } from '@/constants/theme'
import { formatNaira } from '@/lib/validation'
import { Row, Small } from './ui'

export function PriceBreakdown({ partKobo, partPending, gradeLabel, partLabel, serviceChargeKobo, needsPart, estimate, wasKobo }: {
  partKobo: number
  partPending: boolean
  gradeLabel?: string | null
  partLabel?: string | null
  serviceChargeKobo: number
  needsPart: boolean
  /** Show "estimate" wording until the technician confirms the price. */
  estimate?: boolean
  /** Previous estimate, shown when the confirmed price differs. */
  wasKobo?: number | null
}) {
  const total = partKobo + serviceChargeKobo
  const partName = [gradeLabel, partLabel].filter(Boolean).join(' · ')
  return (
    <View testID="breakdown">
      {needsPart ? (
        <Row label={`Part${partName ? ` (${partName})` : ''}`} value={partPending ? 'Priced after check' : formatNaira(partKobo)} />
      ) : null}
      <Row label="Service charge" value={formatNaira(serviceChargeKobo)} />
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs }}>
        <Text style={font.bodyStrong}>{estimate ? 'Estimated total' : 'Total'}</Text>
        <Text style={[font.heading, { marginTop: 0, marginBottom: 0 }]}>
          {partPending ? `${formatNaira(total)} + part` : formatNaira(total)}
        </Text>
      </View>
      {wasKobo != null && wasKobo !== total ? (
        <Small>Estimate at booking was {formatNaira(wasKobo)}. The technician confirmed the price after checking your device.</Small>
      ) : null}
      {estimate ? <Small>You only pay after the technician checks your device and confirms this price.</Small> : null}
    </View>
  )
}
