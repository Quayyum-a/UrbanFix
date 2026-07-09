// PartsCataloguePicker Component
// Allows customers to select parts for their repair booking

import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { PartsCatalogueService } from '@/lib/services'
import { PartsCatalogue } from '@/types/parts-catalogue.types'
import PartCard from './PartCard'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'

interface PartsCataloguePickerProps {
  deviceBrand: string
  deviceModel: string
  repairCategory: string
  selectedParts: PartsCatalogue[]
  onPartsChange: (parts: PartsCatalogue[]) => void
  onClose: () => void
  title?: string
  allowMultiple?: boolean
}

export default function PartsCataloguePicker({
  deviceBrand,
  deviceModel,
  repairCategory,
  selectedParts,
  onPartsChange,
  onClose,
  title = 'Select Parts',
  allowMultiple = false
}: PartsCataloguePickerProps) {
  const [parts, setParts] = useState<PartsCatalogue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadParts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await PartsCatalogueService.getPartsForRepair(
        deviceBrand,
        deviceModel,
        repairCategory
      )

      if (result.success && result.data) {
        setParts(result.data)
      } else {
        setError(result.error || 'Failed to load parts')
      }
    } catch (err) {
      console.error('PartsCataloguePicker load error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [deviceBrand, deviceModel, repairCategory])

  useEffect(() => {
    loadParts()
  }, [loadParts])

  const handlePartPress = (part: PartsCatalogue) => {
    if (allowMultiple) {
      const isSelected = selectedParts.some(p => p.id === part.id)
      if (isSelected) {
        onPartsChange(selectedParts.filter(p => p.id !== part.id))
      } else {
        onPartsChange([...selectedParts, part])
      }
    } else {
      // Single selection - replace the array
      onPartsChange([part])
    }
  }

  const isPartSelected = (part: PartsCatalogue) => {
    return selectedParts.some(p => p.id === part.id)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading parts...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadParts}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (parts.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="construct-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No Parts Available</Text>
          <Text style={styles.emptyText}>
            No standard parts found for this repair.
            The technician may request a custom part if needed.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.infoText}>
          {allowMultiple
            ? 'Select all required parts for this repair'
            : 'Select the part needed for this repair'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {parts.map((part) => (
          <PartCard
            key={part.id}
            part={part}
            isSelected={isPartSelected(part)}
            onPress={() => handlePartPress(part)}
            showCheckbox={allowMultiple}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.summaryText}>
          {selectedParts.length} part{selectedParts.length !== 1 ? 's' : ''} selected
          {selectedParts.length > 0 && (
            <>
              {' • Total: '}
              <Text style={styles.totalPrice}>
                {selectedParts.reduce((sum, p) => sum + p.part_price, 0) / 100}
              </Text>
            </>
          )}
        </Text>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.headlineMd,
    color: colors.text.primary,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHighest,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
  },
  infoText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 80, // Space for footer
    gap: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  retryButtonText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  totalPrice: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '700',
  },
  confirmButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  confirmButtonText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    fontWeight: '600',
  },
})