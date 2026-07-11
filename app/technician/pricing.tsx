import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { usePricing } from '@/hooks/usePricing'
import { CategoryWithPricing } from '@/types/pricing.types'

interface PricingSetupScreenParams {
  setup?: 'true'
}

export default function TechnicianPricingScreen() {
  const { userProfile } = useAuth()
  const params = useLocalSearchParams<PricingSetupScreenParams>()
  const isSetup = params.setup === 'true'

  const {
    categories,
    categoriesLoading,
    categoriesError,
    fetchCategories,
    technicianPricing,
    pricingLoading,
    pricingError,
    fetchTechnicianPricing,
    setPricing,
    updateAvailability,
    setBulkPricing,
  } = usePricing({
    technicianId: userProfile?.id,
    autoFetchCategories: true,
  })

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<CategoryWithPricing | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Fetch pricing on mount
  useEffect(() => {
    if (userProfile?.id) {
      fetchTechnicianPricing(userProfile.id)
    }
  }, [userProfile?.id, fetchTechnicianPricing])

  // Merge categories with technician pricing
  const mergedCategories = categories.map((cat) => {
    const techPricing = technicianPricing.find((tp) => tp.category_id === cat.id)
    return {
      ...cat,
      technician_price: techPricing?.technician_price ?? null,
      is_available: techPricing?.is_available ?? true,
      jobs_completed: techPricing?.jobs_completed ?? 0,
      average_rating: techPricing?.average_rating ?? 0,
    }
  })

  // Handle price edit
  const handleEditPress = useCallback((category: typeof mergedCategories[0]) => {
    setEditingCategory(category)
    setPriceInput(category.technician_price?.toString() || '')
  }, [])

  const handleSavePrice = useCallback(async () => {
    if (!editingCategory || !userProfile?.id) return

    const price = parseInt(priceInput.replace(/[^0-9]/g, ''), 10)
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price')
      return
    }

    // Check against suggested range
    if (price < editingCategory.suggested_min_price) {
      Alert.alert(
        'Price Below Minimum',
        `Your price is below the platform suggested minimum of ₦${editingCategory.suggested_min_price.toLocaleString()}. Are you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: savePrice },
        ]
      )
      return
    }

    if (price > editingCategory.suggested_max_price) {
      Alert.alert(
        'Price Above Maximum',
        `Your price is above the platform suggested maximum of ₦${editingCategory.suggested_max_price.toLocaleString()}. Are you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: savePrice },
        ]
      )
      return
    }

    savePrice()
  }, [editingCategory, priceInput, userProfile])

  const savePrice = useCallback(async () => {
    if (!editingCategory || !userProfile?.id) return

    setIsSaving(true)
    const price = parseInt(priceInput.replace(/[^0-9]/g, ''), 10)

    try {
      const result = await setPricing({
        repair_category_id: editingCategory.category_id,
        labor_price: price,
        is_available: editingCategory.is_available,
      })

      if (result.success) {
        setEditingCategory(null)
        setPriceInput('')
      } else {
        Alert.alert('Error', result.error || 'Failed to save price')
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.')
    } finally {
      setIsSaving(false)
    }
  }, [editingCategory, priceInput, setPricing, userProfile])

  // Handle availability toggle
  const handleAvailabilityChange = useCallback(
    async (category: typeof mergedCategories[0]) => {
      if (!userProfile?.id) return

      const newAvailability = !category.is_available
      try {
        const result = await updateAvailability(userProfile.id, category.category_id, newAvailability)
        if (!result.success) {
          Alert.alert('Error', result.error || 'Failed to update availability')
        }
      } catch (error) {
        Alert.alert('Error', 'Network error. Please check your connection.')
      }
    },
    [updateAvailability, userProfile]
  )

  // Format price for display
  const formatPrice = useCallback((price: number | null) => {
    if (price === null || price === undefined) return 'Not set'
    return `₦${price.toLocaleString('en-NG')}`
  }, [])

  // Get category status
  const getCategoryStatus = useCallback((cat: typeof mergedCategories[0]) => {
    if (cat.technician_price === null) return 'not_set'
    if (!cat.is_available) return 'unavailable'
    return 'active'
  }, [])

  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'not_set':
        return 'Set Price'
      case 'unavailable':
        return 'Unavailable'
      case 'active':
        return 'Active'
      default:
        return 'Unknown'
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'not_set':
        return colors.secondary
      case 'unavailable':
        return colors.text.secondary
      case 'active':
        return colors.success
      default:
        return colors.text.secondary
    }
  }, [])

  // Helper functions for progress tracking
  const getCompletionPercentage = useCallback((): number => {
    if (mergedCategories.length === 0) return 0
    const setCount = mergedCategories.filter(cat => cat.technician_price !== null).length
    return (setCount / mergedCategories.length) * 100
  }, [mergedCategories])

  const getSetCount = useCallback((): number => {
    return mergedCategories.filter(cat => cat.technician_price !== null).length
  }, [mergedCategories])

  if (categoriesLoading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {!isSetup && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {isSetup ? 'Set Up Your Pricing' : 'Manage Pricing'}
            </Text>
            <Text style={styles.subtitle}>
              {isSetup
                ? 'Set labor prices for each repair category'
                : 'Update your labor prices and availability'}
            </Text>
          </View>
          {!isSetup && <View style={styles.headerSpacer} />}
        </View>

        {/* Progress Bar (Setup Mode) */}
        {isSetup && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${getCompletionPercentage()}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {getSetCount()} of {mergedCategories.length} categories priced
            </Text>
          </View>
        )}

        {/* Error Banner */}
        {(categoriesError || pricingError) && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.error} style={styles.errorIcon} />
            <Text style={styles.errorText}>
              {categoriesError || pricingError}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchCategories}
              accessibilityLabel="Retry loading categories"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories List */}
        <View style={styles.listContainer}>
          {mergedCategories.map((category) => (
            <CategoryCard
              key={category.category_id}
              category={category}
              isExpanded={expandedCategory === category.category_id}
              onToggleExpand={() =>
                setExpandedCategory(
                  expandedCategory === category.category_id ? null : category.category_id
                )
              }
              onEditPress={handleEditPress}
              onAvailabilityChange={() => handleAvailabilityChange(category)}
              formatPrice={formatPrice}
              getStatus={getCategoryStatus}
              getStatusText={getStatusText}
              getStatusColor={getStatusColor}
            />
          ))}

          {/* Empty State */}
          {mergedCategories.length === 0 && !categoriesLoading && (
            <View style={styles.emptyContainer}>
              <Ionicons name="construct" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyTitle}>No Repair Categories</Text>
              <Text style={styles.emptyText}>
                {categoriesError
                  ? 'Unable to load categories. Please try again.'
                  : 'Check back later for available repair categories.'}
              </Text>
            </View>
          )}
        </View>

        {/* Setup Complete Button */}
        {isSetup && getSetCount() > 0 && (
          <TouchableOpacity
            style={[styles.continueButton, styles.continueButtonEnabled]}
            onPress={() => router.replace('/technician')}
            activeOpacity={0.9}
            accessibilityLabel="Finish setup and go to dashboard"
          >
            <Text style={styles.continueButtonText}>
              Continue to Dashboard
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.onSecondary} />
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Price Edit Modal */}
      <Modal
        visible={editingCategory !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingCategory(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Labor Price</Text>
              <TouchableOpacity
                onPress={() => setEditingCategory(null)}
                accessibilityLabel="Close modal"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalCategoryName}>
                {editingCategory?.display_name}
              </Text>
              <Text style={styles.modalCategoryDesc}>
                {editingCategory?.description}
              </Text>

              {/* Suggested Range */}
              <View style={styles.rangeContainer}>
                <Text style={styles.rangeLabel}>Platform Suggested Range</Text>
                <View style={styles.rangeBar}>
                  <View
                    style={[
                      styles.rangeFill,
                      {
                        width: `${calculateRangePosition(
                          editingCategory?.suggested_min_price || 0,
                          editingCategory?.suggested_max_price || 100000,
                          editingCategory?.suggested_min_price || 0,
                          editingCategory?.suggested_max_price || 100000
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.rangeLabels}>
                  <Text style={styles.rangeLabelText}>
                    Min: ₦{editingCategory?.suggested_min_price.toLocaleString('en-NG')}
                  </Text>
                  <Text style={styles.rangeLabelText}>
                    Max: ₦{editingCategory?.suggested_max_price.toLocaleString('en-NG')}
                  </Text>
                </View>
              </View>

              {/* Price Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Your Labor Price (NGN)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencyPrefix}>₦</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={priceInput}
                    onChangeText={setPriceInput}
                    placeholder="e.g., 15000"
                    keyboardType="numeric"
                    autoFocus
                    maxLength={8}
                  />
                </View>
                {editingCategory && editingCategory.technician_price !== null && (
                  <Text style={styles.currentPrice}>
                    Current: ₦{editingCategory.technician_price.toLocaleString('en-NG')}
                  </Text>
                )}
              </View>

              {/* Quick Set Buttons */}
              <View style={styles.quickSetContainer}>
                <Text style={styles.quickSetLabel}>Quick Set</Text>
                <View style={styles.quickSetButtons}>
                  {getQuickSetValues(editingCategory).map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.quickSetButton,
                        parseInt(priceInput.replace(/[^0-9]/g, ''), 10) === value
                          ? styles.quickSetButtonSelected
                          : null,
                      ]}
                      onPress={() => setPriceInput(value.toString())}
                      accessibilityLabel={`Set to ₦${value.toLocaleString()}`}
                    >
                      <Text
                        style={[
                          styles.quickSetButtonText,
                          parseInt(priceInput.replace(/[^0-9]/g, ''), 10) === value
                            ? styles.quickSetButtonTextSelected
                            : null,
                        ]}
                      >
                        ₦{value.toLocaleString('en-NG')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => {
                    setEditingCategory(null)
                    setPriceInput('')
                  }}
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButtonSave,
                    isSaving ? styles.modalButtonDisabled : null,
                  ]}
                  onPress={handleSavePrice}
                  disabled={isSaving}
                  accessibilityLabel={isSaving ? 'Saving...' : 'Save price'}
                >
                  <Text style={styles.modalButtonSaveText}>
                    {isSaving ? 'Saving...' : 'Save Price'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// Helper functions

function calculateRangePosition(
  min: number,
  max: number,
  rangeMin: number,
  rangeMax: number
): number {
  if (max <= min) return 100
  return ((min - rangeMin) / (rangeMax - rangeMin)) * 100
}

function getQuickSetValues(category: CategoryWithPricing | null): number[] {
  if (!category) return []

  const min = category.suggested_min_price
  const max = category.suggested_max_price
  const mid = Math.round((min + max) / 2)

  const values = [min, mid, max].filter((v, i, arr) => arr.indexOf(v) === i)
  return values
}

// Category Card Component
interface CategoryCardProps {
  category: CategoryWithPricing & { technician_price: number | null; is_available: boolean }
  isExpanded: boolean
  onToggleExpand: () => void
  onEditPress: (category: CategoryWithPricing & { technician_price: number | null; is_available: boolean }) => void
  onAvailabilityChange: () => void
  formatPrice: (price: number | null) => string
  getStatus: (cat: CategoryWithPricing & { technician_price: number | null; is_available: boolean }) => string
  getStatusText: (status: string) => string
  getStatusColor: (status: string) => string
}

function CategoryCard({
  category,
  isExpanded,
  onToggleExpand,
  onEditPress,
  onAvailabilityChange,
  formatPrice,
  getStatus,
  getStatusText,
  getStatusColor,
}: CategoryCardProps) {
  const status = getStatus(category)
  const statusColor = getStatusColor(status)

  return (
    <TouchableOpacity
      style={[styles.categoryCard, status === 'active' && styles.categoryCardActive]}
      onPress={onToggleExpand}
      activeOpacity={0.95}
      accessibilityLabel={`${category.display_name}, ${getStatusText(status)}`}
      accessibilityHint={isExpanded ? 'Tap to collapse' : 'Tap to expand'}
    >
      <View style={styles.categoryMain}>
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: `${category.icon_color || colors.primary}20` },
          ]}
        >
          <Text style={styles.categoryEmoji}>{category.icon || '🔧'}</Text>
        </View>

        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.display_name}</Text>
          <View style={styles.categoryMeta}>
            <Text style={styles.categoryDescription}>{category.description}</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColor },
                ]}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(status)}
              </Text>
              <Text style={styles.priceText}>
                {formatPrice(category.technician_price)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.categoryRight}>
          <View
            style={[
              styles.actionButton,
              category.is_available ? styles.actionButtonOn : styles.actionButtonOff,
            ]}
            onPress={onAvailabilityChange}
            accessibilityLabel={
              category.is_available ? 'Mark as unavailable' : 'Mark as available'
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={category.is_available ? 'toggle-on' : 'toggle-off'}
              size={24}
              color={category.is_available ? colors.success : colors.text.secondary}
            />
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.text.secondary}
          />
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Estimated Duration</Text>
              <Text style={styles.detailValue}>
                {category.estimated_duration_hours}h
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Device Types</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {category.device_types?.join(', ') || 'N/A'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Suggested Range</Text>
              <Text style={styles.detailValue}>
                ₦{category.suggested_min_price.toLocaleString('en-NG')} - ₦{category.suggested_max_price.toLocaleString('en-NG')}
              </Text>
            </View>
          </View>

          {category.jobs_completed > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{category.jobs_completed}</Text>
                <Text style={styles.statLabel}>Jobs Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {category.average_rating.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.editButton, status === 'not_set' && styles.editButtonPrimary]}
            onPress={() => onEditPress(category)}
            activeOpacity={0.8}
            accessibilityLabel={`Edit price for ${category.display_name}`}
          >
            <Ionicons name="create-outline" size={18} color={colors.onPrimary} />
            <Text style={styles.editButtonText}>
              {status === 'not_set' ? 'Set Price' : 'Update Price'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    ...typography.labelMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
  },
  errorIcon: {
    marginRight: spacing.xs,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    flex: 1,
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
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.level1,
  },
  categoryCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer + '20',
  },
  categoryMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
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
    gap: spacing.xs,
  },
  categoryDescription: {
    ...typography.bodySm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.labelMd,
    fontWeight: '500',
  },
  priceText: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionButton: {
    padding: spacing.xs,
  },
  actionButtonOn: {},
  actionButtonOff: {
    opacity: 0.5,
  },
  expandedContent: {
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
    minWidth: 100,
    gap: spacing.xs / 2,
  },
  detailLabel: {
    ...typography.labelSm,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  statValue: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.text.secondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  editButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  editButtonText: {
    ...typography.buttonText,
    color: colors.primary,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
    ...shadows.level3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '700',
  },
  modalBody: {
    gap: spacing.lg,
  },
  modalCategoryName: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '700',
  },
  modalCategoryDesc: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  rangeContainer: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
  },
  rangeLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  rangeBar: {
    height: 8,
    backgroundColor: colors.outline,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  rangeFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabelText: {
    ...typography.labelSm,
    color: colors.text.secondary,
  },
  inputContainer: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: spacing.md,
  },
  currencyPrefix: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  priceInput: {
    flex: 1,
    ...typography.bodyLg,
    color: colors.text.primary,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  currentPrice: {
    ...typography.bodySm,
    color: colors.text.secondary,
  },
  quickSetContainer: {
    gap: spacing.sm,
  },
  quickSetLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
  quickSetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickSetButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  quickSetButtonSelected: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  quickSetButtonText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  quickSetButtonTextSelected: {
    color: colors.onPrimaryContainer,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    ...typography.buttonText,
    color: colors.text.primary,
    fontWeight: '600',
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonSaveText: {
    ...typography.buttonText,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.level2,
  },
  continueButtonEnabled: {
    backgroundColor: colors.primary,
  },
  continueButtonText: {
    ...typography.buttonText,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
})
