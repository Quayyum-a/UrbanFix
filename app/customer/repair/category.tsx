import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { usePartsCatalogue } from '@/hooks/usePartsCatalogue'
import { repairCategoryLabels, estimatedRepairTimes } from '@/constants/repairCategories'
import { PricingBreakdown } from '@/components/ui/PricingBreakdown'

interface CategoryScreenParams {
  deviceType: string
  brand: string
  model: string
}

interface PartWithPricing {
  id: string
  part_name: string
  part_price: number
  formatted_price: string
}

export default function RepairCategoryScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<CategoryScreenParams>()
  const deviceType = params.deviceType || 'smartphone'
  const brand = params.brand || ''
  const model = params.model || ''

  const {
    parts,
    partsLoading,
    partsError,
    fetchPartsForRepair,
    categories,
    categoriesLoading,
    fetchRepairCategories,
  } = usePartsCatalogue({ autoFetchBrands: false })

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [selectedPart, setSelectedPart] = useState<PartWithPricing | null>(null)
  const [technicianLabourPrice, setTechnicianLabourPrice] = useState<number>(0)

  // Fetch categories on mount
  useEffect(() => {
    if (brand && model) {
      fetchRepairCategories(brand, model)
    }
  }, [brand, model, fetchRepairCategories])

  // Fetch parts when category changes
  useEffect(() => {
    if (brand && model && selectedCategory) {
      fetchPartsForRepair(brand, model, selectedCategory)
    }
  }, [brand, model, selectedCategory, fetchPartsForRepair])

  // Format category label
  const formatCategoryLabel = useCallback(
    (category: string) => {
      return repairCategoryLabels[category] || category
    },
    []
  )

  // Get estimated repair time
  const getRepairTime = useCallback(
    (category: string) => {
      const hours = estimatedRepairTimes[category] || 2
      return hours === 1 ? '~1 hour' : `~${hours} hours`
    },
    []
  )

  // Get platform fee (10%)
  const platformFee = useMemo(() => {
    if (!selectedPart || technicianLabourPrice === 0) return 0
    const subtotal = selectedPart.part_price + technicianLabourPrice
    return Math.round(subtotal * 0.1)
  }, [selectedPart, technicianLabourPrice])

  const totalPrice = useMemo(() => {
    if (!selectedPart || technicianLabourPrice === 0) return 0
    return selectedPart.part_price + technicianLabourPrice + platformFee
  }, [selectedPart, technicianLabourPrice, platformFee])

  const handleCategoryPress = useCallback(
    (category: string) => {
      if (selectedCategory === category) {
        setSelectedCategory(null)
        setSelectedPart(null)
        setExpandedCategory(null)
      } else {
        setSelectedCategory(category)
        setExpandedCategory(category)
        // Reset part selection when category changes
        setSelectedPart(null)
      }
    },
    [selectedCategory]
  )

  const handlePartPress = useCallback((part: PartWithPricing) => {
    setSelectedPart(part)
  }, [])

  const handleContinue = useCallback(() => {
    if (!selectedCategory || !selectedPart) return

    const bookingData = {
      deviceType,
      brand,
      model,
      repairCategory: selectedCategory,
      partId: selectedPart.id,
      partPrice: selectedPart.part_price,
      partName: selectedPart.part_name,
      labourPrice: technicianLabourPrice,
      platformFee,
      totalPrice,
    }

    router.push({
      pathname: '/customer/repair/technicians',
      params: bookingData,
    })
  }, [
    deviceType,
    brand,
    model,
    selectedCategory,
    selectedPart,
    technicianLabourPrice,
    platformFee,
    totalPrice,
    router,
  ])

  if (categoriesLoading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading repair categories...</Text>
      </SafeAreaView>
    )
  }

  const canContinue = !!selectedCategory && !!selectedPart && technicianLabourPrice > 0

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>What needs fixing?</Text>
            <Text style={styles.subtitle}>
              {brand} {model} • Select repair type
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: selectedCategory ? '66%' : '33%' },
              ]}
            />
          </View>
          <View style={styles.progressSteps}>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepActive]} />
              <Text style={styles.stepLabel}>Device</Text>
            </View>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.stepCircle,
                  selectedCategory ? styles.stepActive : styles.stepInactive,
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  selectedCategory ? styles.stepActiveText : styles.stepInactiveText,
                ]}
              >
                Repair
              </Text>
            </View>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.stepCircle,
                  canContinue ? styles.stepActive : styles.stepInactive,
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  canContinue ? styles.stepActiveText : styles.stepInactiveText,
                ]}
              >
                Technician
              </Text>
            </View>
          </View>
        </View>

        {/* Categories List */}
        <View style={styles.categoriesContainer}>
          {categoriesError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{categoriesError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchRepairCategories(brand, model)}
                accessibilityLabel="Retry loading categories"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {categories.length === 0 && !categoriesLoading && !categoriesError ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="construct" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyTitle}>No repair categories available</Text>
              <Text style={styles.emptyText}>
                We don&apos;t have repair options for {brand} {model} yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>

        {/* Selected Category Details - Parts & Pricing */}
        {selectedCategory && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailsHeader}>
              <View style={styles.detailsTitleRow}>
                <Ionicons
                  name="construct"
                  size={24}
                  color={colors.primary}
                  style={styles.detailsIcon}
                />
                <View>
                  <Text style={styles.detailsTitle}>{formatCategoryLabel(selectedCategory)}</Text>
                  <Text style={styles.detailsSubtitle}>
                    {getRepairTime(selectedCategory)} • Parts + Labour
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.changeCategoryButton}
                onPress={() => setSelectedCategory(null)}
                accessibilityLabel="Change repair category"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Parts Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Part</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the replacement part needed for this repair
              </Text>

              {partsLoading && (
                <View style={styles.partsLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading parts...</Text>
                </View>
              )}

              {partsError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{partsError}</Text>
                </View>
              )}

              {parts.length === 0 && !partsLoading && !partsError ? (
                <View style={styles.emptyPartsContainer}>
                  <Ionicons name="cube-outline" size={32} color={colors.text.secondary} />
                  <Text style={styles.emptyTitle}>No parts in catalogue</Text>
                  <Text style={styles.emptySubtitle}>
                    Contact technician for custom pricing
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={parts}
                  renderItem={renderPartItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.partsListContent}
                  ItemSeparatorComponent={() => <View style={styles.partsSeparator} />}
                />
              )}
            </View>

            {/* Labour Price Input (Technician will set this) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Labour Cost</Text>
              <Text style={styles.sectionSubtitle}>
                Set by technician based on repair complexity
              </Text>
              <TouchableOpacity
                style={[
                  styles.labourPriceButton,
                  technicianLabourPrice > 0 && styles.labourPriceButtonFilled,
                ]}
                onPress={() => setTechnicianLabourPrice(Math.round(totalPrice * 0.3))}
                accessibilityLabel="Set labour price"
              >
                {technicianLabourPrice > 0 ? (
                  <>
                    <Text style={styles.labourPriceDisplay}>
                      ₦{(technicianLabourPrice / 100).toLocaleString('en-NG')}
                    </Text>
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={colors.primary}
                      style={styles.labourEditIcon}
                    />
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color={colors.primary}
                      style={styles.labourAddIcon}
                    />
                    <Text style={styles.labourPriceHint}>Set labour price</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Pricing Breakdown */}
            {selectedPart && technicianLabourPrice > 0 && (
              <View style={styles.section}>
                <PricingBreakdown
                  partPrice={selectedPart.part_price}
                  labourPrice={technicianLabourPrice}
                  platformFee={platformFee}
                  totalPrice={totalPrice}
                />
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                canContinue ? styles.continueButtonEnabled : styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!canContinue}
              accessibilityLabel="Continue to technician selection"
              accessibilityState={{ disabled: !canContinue }}
            >
              <Text style={styles.continueButtonText}>
                {canContinue ? 'Continue to Technician Selection' : 'Select part and set labour price'}
              </Text>
              {canContinue && (
                <Ionicons name="chevron-forward" size={24} color={colors.onSecondary} />
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

// Render category item
function renderCategoryItem({ item }: { item: string }) {
  const isSelected = false // Will be set by parent
  const isExpanded = false
  const label = repairCategoryLabels[item] || item
  const time = estimatedRepairTimes[item] || 2

  return (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        isSelected && styles.categoryItemSelected,
        isExpanded && styles.categoryItemExpanded,
      ]}
      onPress={() => {}}
      activeOpacity={0.8}
      accessibilityLabel={`${label} repair`}
      accessibilityHint={`Estimated time: ${time === 1 ? '1 hour' : `${time} hours`}`}
    >
      <View style={styles.categoryMain}>
        <View style={styles.categoryIcon}>
          <Text style={styles.categoryEmoji}>{getCategoryEmoji(item)}</Text>
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{label}</Text>
          <View style={styles.categoryMeta}>
            <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.categoryTime}>
              {time === 1 ? '~1 hour' : `~${time} hours`}
            </Text>
          </View>
        </View>
        <View style={styles.categoryArrow}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.text.secondary}
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}

// Get emoji for repair category
function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    screen_replacement: '📱',
    battery_replacement: '🔋',
    charging_port_repair: '🔌',
    water_damage_repair: '💧',
    camera_repair: '📷',
    speaker_repair: '🔊',
    microphone_repair: '🎤',
    software_issues: '💻',
    back_glass_replacement: '🔍',
    keyboard_replacement: '⌨️',
    motherboard_repair: '🧠',
    hard_drive_upgrade: '💾',
    ram_upgrade: '🧮',
    hinge_repair: '📐',
    touchpad_repair: '🖱️',
    data_recovery: '💾',
    general_diagnostic: '🔍',
    other: '🔧',
  }
  return emojis[category] || '🔧'
}

// Render part item
function renderPartItem({ item }: { item: PartWithPricing }) {
  return (
    <TouchableOpacity
      style={styles.partItem}
      onPress={() => {}}
      activeOpacity={0.85}
      accessibilityLabel={`${item.part_name}, ${item.formatted_price}`}
    >
      <View style={styles.partInfo}>
        <Text style={styles.partName}>{item.part_name}</Text>
        <Text style={styles.partPrice}>{item.formatted_price}</Text>
      </View>
      <Ionicons name="radio-button-off" size={24} color={colors.text.secondary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyLg,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.outline,
  },
  stepActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  stepInactive: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.outline,
  },
  stepLabel: {
    ...typography.labelSm,
    textAlign: 'center',
  },
  stepActiveText: {
    color: colors.primary,
    fontWeight: '600',
  },
  stepInactiveText: {
    color: colors.text.secondary,
  },
  categoriesContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  separator: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  categoryItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.level1,
  },
  categoryItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryContainer,
  },
  categoryItemExpanded: {
    paddingBottom: spacing.lg,
  },
  categoryMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryTime: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  categoryArrow: {
    paddingLeft: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: radius.sm,
  },
  retryButtonText: {
    ...typography.labelMd,
    color: colors.onError,
    fontWeight: '600',
  },
  detailsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.level2,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailsIcon: {
    marginRight: spacing.sm,
  },
  detailsTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  detailsSubtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  changeCategoryButton: {
    padding: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  partsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyPartsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  partsListContent: {
    paddingBottom: spacing.md,
  },
  partsSeparator: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
  },
  partInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  partName: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '500',
  },
  partPrice: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '600',
  },
  labourPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  labourPriceButtonFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  labourPriceDisplay: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
  },
  labourEditIcon: {
    marginLeft: spacing.sm,
  },
  labourAddIcon: {
    marginRight: spacing.sm,
  },
  labourPriceHint: {
    ...typography.bodyLg,
    color: colors.primary,
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    ...shadows.level2,
  },
  continueButtonEnabled: {
    backgroundColor: colors.secondary,
  },
  continueButtonDisabled: {
    backgroundColor: colors.outline,
  },
  continueButtonText: {
    ...typography.buttonText,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
})