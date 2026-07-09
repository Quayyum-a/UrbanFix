import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { TechnicianCard } from '@/components/ui/TechnicianCard'
import { useAuth } from '@/hooks/useAuth'
import { usePricing } from '@/hooks/usePricing'

interface TechnicianSelectionScreenParams {
  deviceType: string
  brand: string
  model: string
  repairCategory: string
  partId?: string
  partPrice?: string
  partName?: string
  labourPrice?: string
  platformFee?: string
  totalPrice?: string
}

export default function TechnicianSelectionScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<TechnicianSelectionScreenParams>()
  const { userProfile } = useAuth()

  const deviceType = params.deviceType || 'smartphone'
  const brand = params.brand || ''
  const model = params.model || ''
  const repairCategory = params.repairCategory || ''
  const partId = params.partId || ''
  const partPrice = parseInt(params.partPrice || '0', 10)
  const partName = params.partName || ''
  const labourPrice = parseInt(params.labourPrice || '0', 10)
  const platformFee = parseInt(params.platformFee || '0', 10)
  const totalPrice = parseInt(params.totalPrice || '0', 10)

  const {
    technicians,
    techniciansLoading,
    techniciansError,
    findTechniciansForCategory,
  } = usePricing()

  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianForCategory | null>(null)
  const [minRating, setMinRating] = useState(0)
  const [showFilter, setShowFilter] = useState(false)

  // We need to get the category ID from the repair category name
  // This would normally come from the repair_categories table
  const categoryId = getCategoryId(repairCategory)

  useEffect(() => {
    if (categoryId) {
      fetchTechnicians()
    }
  }, [categoryId, minRating])

  const fetchTechnicians = useCallback(async () => {
    if (!categoryId) return

    try {
      const result = await findTechniciansForCategory(categoryId, minRating, 20)
      if (!result.success) {
        console.error('Failed to find technicians:', result.error)
      }
    } catch (error) {
      console.error('Error fetching technicians:', error)
    }
  }, [categoryId, minRating, findTechniciansForCategory])

  const handleTechnicianPress = useCallback(
    (technician: TechnicianForCategory) => {
      setSelectedTechnician(technician)
    },
    []
  )

  const handleContinue = useCallback(() => {
    if (!selectedTechnician) return

    // Navigate to booking confirmation with technician selected
    router.push({
      pathname: '/customer/repair/confirm',
      params: {
        deviceType,
        brand,
        model,
        repairCategory,
        partId,
        partPrice: partPrice.toString(),
        partName,
        technicianId: selectedTechnician.technician_id,
        technicianName: selectedTechnician.technician_name,
        labourPrice: selectedTechnician.labor_price.toString(),
        platformFee: platformFee.toString(),
        totalPrice: (partPrice + selectedTechnician.labor_price + platformFee).toString(),
      },
    })
  }, [
    router,
    selectedTechnician,
    deviceType,
    brand,
    model,
    repairCategory,
    partId,
    partPrice,
    partName,
    platformFee,
  ])

  const formatPrice = useCallback((price: number) => {
    return `₦${(price / 100).toLocaleString('en-NG')}`
  }, [])

  if (techniciansLoading && technicians.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Finding technicians...</Text>
      </SafeAreaView>
    )
  }

  const hasTechnicians = technicians.length > 0

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
            <Text style={styles.title}>Choose Technician</Text>
            <Text style={styles.subtitle}>
              {technicians.length} technicians available for {repairCategoryLabels[repairCategory] || repairCategory}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Repair Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Your Repair</Text>
          </View>
          <View style={styles.summaryDetails}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{brand} {model}</Text>
              <Text style={styles.summaryValue}>
                {repairCategoryLabels[repairCategory] || repairCategory}
              </Text>
            </View>
            {partName && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Part: {partName}</Text>
                <Text style={styles.summaryValue}>{formatPrice(partPrice)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilter(!showFilter)}
            accessibilityLabel="Filter technicians"
          >
            <Ionicons
              name={showFilter ? 'filter-outline' : 'filter-off-outline'}
              size={20}
              color={minRating > 0 ? colors.primary : colors.text.secondary}
            />
            <Text style={styles.filterButtonText}>
              {minRating > 0 ? `Rating ≥ ${minRating}` : 'Filters'}
            </Text>
          </TouchableOpacity>

          {showFilter && (
            <View style={styles.filterOptions}>
              <Text style={styles.filterOptionTitle}>Minimum Rating</Text>
              <View style={styles.ratingFilters}>
                {[0, 3, 4, 4.5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingFilterChip,
                      minRating === rating && styles.ratingFilterChipActive,
                    ]}
                    onPress={() => setMinRating(rating)}
                  >
                    <Text
                      style={[
                        styles.ratingFilterText,
                        minRating === rating && styles.ratingFilterTextActive,
                      ]}
                    >
                      {rating === 0 ? 'Any' : `${rating}+ ★`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Technicians List */}
        <View style={styles.listContainer}>
          {techniciansError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{techniciansError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchTechnicians}
                accessibilityLabel="Retry"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {!hasTechnicians && !techniciansLoading && !techniciansError ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-circle-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyTitle}>No technicians available</Text>
              <Text style={styles.emptyText}>
                No technicians currently offer {repairCategoryLabels[repairCategory] || repairCategory} for {brand} {model}
              </Text>
            </View>
          ) : (
            <FlatList
              data={technicians}
              renderItem={({ item }) => (
                <TechnicianCard
                  id={item.technician_id}
                  name={item.technician_name}
                  rating={item.average_rating}
                  jobCount={item.jobs_completed}
                  isVerified={true} // Would come from technician verification status
                  labourPrice={item.labor_price}
                  distance={`${item.distance_km?.toFixed(1) || '?'} km`}
                  isAvailable={true}
                  specialties={[]} // Could be fetched from technician profile
                  onPress={() => handleTechnicianPress(item)}
                  style={styles.technicianCard}
                />
              )}
              keyExtractor={(item) => item.technician_id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                !techniciansLoading && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-circle-outline" size={48} color={colors.text.secondary} />
                    <Text style={styles.emptyTitle}>No technicians found</Text>
                    <Text style={styles.emptyText}>
                      Try adjusting your filters
                    </Text>
                  </View>
                )
              }
            />
          )}

          {/* Selected Technician Summary */}
          {selectedTechnician && (
            <View style={styles.selectedSummary}>
              <View style={styles.selectedCard}>
                <View style={styles.selectedHeader}>
                  <Text style={styles.selectedTitle}>Selected Technician</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedTechnician(null)}
                    accessibilityLabel="Change technician"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedTechnician.technician_name}</Text>
                  <View style={styles.selectedMeta}>
                    <View style={styles.selectedMetaItem}>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={styles.selectedMetaText}>
                        {selectedTechnician.average_rating.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.selectedMetaItem}>
                      <Ionicons name="briefcase" size={14} color={colors.text.secondary} />
                      <Text style={styles.selectedMetaText}>
                        {selectedTechnician.jobs_completed} jobs
                      </Text>
                    </View>
                    <View style={styles.selectedMetaItem}>
                      <Ionicons name="location" size={14} color={colors.text.secondary} />
                      <Text style={styles.selectedMetaText}>
                        {selectedTechnician.distance_km?.toFixed(1) || '?'} km away
                      </Text>
                    </View>
                  </View>
                  <View style={styles.selectedPrice}>
                    <Text style={styles.selectedPriceLabel}>Labour Cost</Text>
                    <Text style={styles.selectedPriceValue}>
                      {formatPrice(selectedTechnician.labor_price)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Continue Button */}
        {selectedTechnician && (
          <View style={styles.continueButtonContainer}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.9}
              accessibilityLabel="Continue to booking"
            >
              <Text style={styles.continueButtonText}>
                Continue to Booking
              </Text>
              <Ionicons name="chevron-forward" size={24} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

// Helper to get category ID from category name
function getCategoryId(categoryName: string): string | null {
  // This would normally come from the repair_categories table
  // For now, we'll map common category names to UUIDs
  // In production, this should be fetched from the database
  const categoryMap: Record<string, string> = {
    screen_replacement: '00000000-0000-0000-0000-000000000001',
    battery_replacement: '00000000-0000-0000-0000-000000000002',
    charging_port_repair: '00000000-0000-0000-0000-000000000003',
    water_damage_repair: '00000000-0000-0000-0000-000000000004',
    camera_repair: '00000000-0000-0000-0000-000000000005',
    speaker_repair: '00000000-0000-0000-0000-000000000006',
    microphone_repair: '00000000-0000-0000-0000-000000000007',
    software_issues: '00000000-0000-0000-0000-000000000008',
    back_glass_replacement: '00000000-0000-0000-0000-000000000009',
    keyboard_replacement: '00000000-0000-0000-0000-000000000010',
    motherboard_repair: '00000000-0000-0000-0000-000000000011',
    hard_drive_upgrade: '00000000-0000-0000-0000-000000000012',
    ram_upgrade: '00000000-0000-0000-0000-000000000013',
    hinge_repair: '00000000-0000-0000-0000-000000000014',
    touchpad_repair: '00000000-0000-0000-0000-000000000015',
    data_recovery: '00000000-0000-0000-0000-000000000016',
    general_diagnostic: '00000000-0000-0000-0000-000000000017',
    other: '00000000-0000-0000-0000-000000000018',
  }
  return categoryMap[categoryName] || null
}

// Import repair category labels
import { repairCategoryLabels } from '@/constants/repairCategories'

// Type for technician from pricing service
interface TechnicianForCategory {
  technician_id: string
  technician_name: string
  labor_price: number
  jobs_completed: number
  average_rating: number
  phone: string
  distance_km?: number
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
  summaryCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.level1,
  },
  summaryHeader: {
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '700',
  },
  summaryDetails: {
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  summaryValue: {
    ...typography.bodyMd,
    color: colors.text.primary,
    fontWeight: '600',
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterButtonText: {
    ...typography.labelMd,
    color: colors.text.primary,
    fontWeight: '500',
  },
  filterOptions: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterOptionTitle: {
    ...typography.labelMd,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  ratingFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ratingFilterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  ratingFilterChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  ratingFilterText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  ratingFilterTextActive: {
    color: colors.onPrimaryContainer,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.outlineVariant,
  },
  technicianCard: {
    width: '100%',
    marginBottom: 0,
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
  selectedSummary: {
    marginTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  selectedCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.level2,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectedTitle: {
    ...typography.headlineSm,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  selectedInfo: {
    gap: spacing.md,
  },
  selectedName: {
    ...typography.bodyLg,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  selectedMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  selectedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedMetaText: {
    ...typography.bodySm,
    color: colors.onPrimaryContainer,
    fontWeight: '500',
  },
  selectedPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  selectedPriceLabel: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
  },
  selectedPriceValue: {
    ...typography.headlineSm,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
  },
  continueButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadows.level2,
  },
  continueButtonText: {
    ...typography.buttonText,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 100,
  },
})