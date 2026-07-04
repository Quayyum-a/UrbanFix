import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, typography, spacing, radius } from '@/constants/theme'
import { Card } from '@/components/ui'

interface PricingBreakdownProps {
  partPrice: number
  labourPrice: number
  platformFee: number
  totalPrice: number
  style?: ViewStyle
}

export function PricingBreakdown({
  partPrice,
  labourPrice,
  platformFee,
  totalPrice,
  style,
}: PricingBreakdownProps) {
  const formatPrice = (price: number) => `₦${(price / 100).toLocaleString()}`

  return (
    <Card variant="outlined" style={[styles.container, style]}>
      <Text style={styles.title}>Pricing Breakdown</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Part cost</Text>
        <Text style={styles.value}>{formatPrice(partPrice)}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Labour</Text>
        <Text style={styles.value}>{formatPrice(labourPrice)}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Service fee</Text>
        <Text style={styles.value}>{formatPrice(platformFee)}</Text>
      </View>
      
      <View style={styles.separator} />
      
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatPrice(totalPrice)}</Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  
  title: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  label: {
    ...typography.bodyLg,
    color: colors.text.secondary,
  },
  
  value: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '500',
  },
  
  separator: {
    height: 1,
    backgroundColor: colors.outline,
    marginVertical: spacing.sm,
  },
  
  totalLabel: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
  },
  
  totalValue: {
    ...typography.bodyLg,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },
})