// PartCard Component
// Displays a single part with pricing for selection in booking flow

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, CheckBox } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'

export interface PartCardProps {
  part: {
    id: string
    part_name: string
    part_price: number
    formatted_price: string
    repair_category: string
  }
  isSelected: boolean
  onPress: () => void
  showCheckbox?: boolean
}

export default function PartCard({
  part,
  isSelected,
  onPress,
  showCheckbox = true
}: PartCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${part.part_name}, ${part.formatted_price}`}
      accessibilityHint={isSelected ? 'Selected. Tap to deselect.' : 'Not selected. Tap to select.'}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.partName}>{part.part_name}</Text>
          <Text style={styles.category}>{part.repair_category.replace(/_/g, ' ')}</Text>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.price}>{part.formatted_price}</Text>
          {showCheckbox && (
            <CheckBox
              value={isSelected}
              onValueChange={() => {}}
              tintColors={{ true: colors.primary, false: colors.outline }}
              disabled
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.level1,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceContainerHighest,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  info: {
    flex: 1,
  },
  partName: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
  },
  category: {
    ...typography.bodySm,
    color: colors.text.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  price: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
  },
})