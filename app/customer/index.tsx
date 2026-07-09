// CustomerHomeScreen - Complete implementation for Tasks 9.1, 9.4, 9.6
// Implements header with location toggle, search bar, categories grid, promotional banner,
// nearby technicians horizontal scroll, active repair status card, and FAB

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'
import { useResponsive } from '@/hooks/useResponsive'
import { responsive } from '@/utils/responsive'
import { type DeviceType } from '@/constants/deviceTypes'
import { TechnicianCard } from '@/components/ui/TechnicianCard'

// Mock data for development
const REPAIR_CATEGORIES = [
  { id: 'smartphone', icon: '📱', label: 'Phone', type: 'smartphone' as DeviceType },
  { id: 'laptop', icon: '💻', label: 'Laptop', type: 'laptop' as DeviceType },
  { id: 'tablet', icon: '📑', label: 'Tablet', type: 'tablet' as DeviceType },
  { id: 'desktop', icon: '🖥️', label: 'Desktop', type: 'desktop' as DeviceType },
]

const MOCK_NEARBY_TECHNICIANS = [
  {
    id: 'tech-1',
    name: 'Emeka Okafor',
    rating: 4.9,
    jobCount: 127,
    isVerified: true,
    labourPrice: 500000, // ₦5,000 in kobo
    distance: '0.8 km',
    isAvailable: true,
    specialties: ['iPhone', 'Samsung', 'Screen Repair'],
  },
  {
    id: 'tech-2',
    name: 'Adaeze Nwosu',
    rating: 4.7,
    jobCount: 89,
    isVerified: true,
    labourPrice: 350000,
    distance: '1.2 km',
    isAvailable: true,
    specialties: ['Laptop', 'MacBook', 'Battery'],
  },
  {
    id: 'tech-3',
    name: 'Chidi Eze',
    rating: 4.5,
    jobCount: 62,
    isVerified: false,
    labourPrice: 250000,
    distance: '2.1 km',
    isAvailable: false,
    specialties: ['Android', 'Tablet'],
  },
  {
    id: 'tech-4',
    name: 'Ngozi Obi',
    rating: 4.8,
    jobCount: 203,
    isVerified: true,
    labourPrice: 600000,
    distance: '2.5 km',
    isAvailable: true,
    specialties: ['Desktop', 'Printer', 'Networking'],
  },
]

// Mock active repair job — set to null to hide the section
const MOCK_ACTIVE_JOB = {
  id: 'job-abc123',
  deviceType: 'iPhone 14 Pro',
  issue: 'Screen Replacement',
  status: 'in_progress' as const,
  technicianName: 'Emeka Okafor',
  estimatedCompletion: '2:30 PM today',
  progress: 60, // percentage
}

export default function CustomerHomeScreen() {
  const { userProfile } = useAuth()
  const insets = useSafeAreaInsets()
  const { horizontalPadding } = useResponsive()
  const [currentLocation, setCurrentLocation] = useState<string | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch user's current location on mount
  useEffect(() => {
    fetchCurrentLocation()
  }, [])

  const fetchCurrentLocation = async () => {
    try {
      setLoadingLocation(true)
      console.log('📍 [Home] Fetching current location...')
      
      // Check if we have permission
      const { status } = await Location.getForegroundPermissionsAsync()
      
      if (status !== 'granted') {
        console.log('⚠️ [Home] Location permission not granted, using default')
        setCurrentLocation('Lagos, Nigeria')
        setLoadingLocation(false)
        return
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      })
      
      console.log('📍 [Home] Got coordinates:', location.coords)

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      })

      if (addresses && addresses.length > 0) {
        const address = addresses[0]
        // Format: "Neighborhood, City" or "City, State"
        const formattedLocation = [
          address?.district || address?.subregion,
          address?.city || address?.region
        ].filter(Boolean).join(', ') || 'Lagos, Nigeria'
        
        console.log('📍 [Home] Location resolved:', formattedLocation)
        setCurrentLocation(formattedLocation)
      } else {
        console.log('⚠️ [Home] No address found, using default')
        setCurrentLocation('Lagos, Nigeria')
      }
    } catch (error) {
      console.error('❌ [Home] Error fetching location:', error)
      setCurrentLocation('Lagos, Nigeria')
    } finally {
      setLoadingLocation(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    // Refresh location and data
    fetchCurrentLocation().finally(() => {
      setTimeout(() => {
        setRefreshing(false)
      }, 1000)
    })
  }, [])

  const handleCategoryPress = (category: typeof REPAIR_CATEGORIES[0]) => {
    // TODO: Navigate to repair booking with category pre-selected
    console.log('Category selected:', category)
  }

  const handleSearchPress = () => {
    // TODO: Navigate to search/booking screen
    console.log('Search pressed with query:', searchQuery)
  }

  const handlePromotionPress = () => {
    // TODO: Navigate to promotion details
    console.log('Promotion pressed')
  }

  const handleTechnicianPress = (technicianId: string) => {
    // TODO: Navigate to technician profile
    console.log('Technician pressed:', technicianId)
  }

  const handleViewActiveJob = () => {
    // TODO: Navigate to active job tracking screen
    console.log('View active job pressed')
  }

  const handleFABPress = () => {
    // TODO: Navigate to repair booking flow
    console.log('FAB pressed — start new repair request')
  }

  const renderHeader = () => (
    <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
      {/* Location Section */}
      <View style={styles.locationSection}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color={colors.primary} />
          {loadingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.locationLoader} />
          ) : (
            <Text style={styles.locationText}>{currentLocation || 'Lagos, Nigeria'}</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.changeLocationButton}
          onPress={fetchCurrentLocation}
          accessibilityLabel="Refresh location"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* User Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>
          Good morning, {userProfile?.full_name?.split(' ')[0] || 'there'}! 👋
        </Text>
        <Text style={styles.subGreeting}>What can we fix for you today?</Text>
      </View>
    </View>
  )

  const renderSearchBar = () => (
    <View style={[styles.searchSection, { paddingHorizontal: horizontalPadding }]}>
      <TouchableOpacity 
        style={styles.searchBar}
        onPress={handleSearchPress}
        accessibilityLabel="Search for repairs"
        accessibilityHint="Tap to start booking a repair"
      >
        <Ionicons name="search" size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <Text style={styles.searchPlaceholder}>What needs fixing?</Text>
        <Ionicons name="options" size={20} color={colors.primary} style={styles.filterIcon} />
      </TouchableOpacity>
    </View>
  )

  const renderCategories = () => (
    <View style={[styles.categoriesSection, { paddingHorizontal: horizontalPadding }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <TouchableOpacity accessibilityLabel="See all categories">
          <Text style={styles.seeAllButton}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.categoriesGrid, { gap: responsive(spacing.xs, spacing.sm, spacing.md) }]}>
        {REPAIR_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryItem}
            onPress={() => handleCategoryPress(category)}
            accessibilityLabel={`${category.label} repairs`}
            accessibilityHint="Tap to book repair for this device type"
          >
            <View style={[
              styles.categoryIcon,
              category.id === 'smartphone' && styles.categoryIconPrimary
            ]}>
              <Text style={styles.categoryEmoji}>{category.icon}</Text>
            </View>
            <Text style={styles.categoryLabel}>{category.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderPromotionalBanner = () => (
    <TouchableOpacity
      style={[
        styles.promotionBanner,
        {
          marginHorizontal: horizontalPadding,
          minHeight: responsive(140, 160, 200),
        },
      ]}
      onPress={handlePromotionPress}
      activeOpacity={0.9}
      accessibilityLabel="Summer promotion banner"
      accessibilityHint="20% off iPhone screen repairs this weekend"
    >
      <View style={styles.promotionContent}>
        <View style={styles.promotionBadge}>
          <Text style={styles.promotionBadgeText}>SUMMER DEAL</Text>
        </View>
        
        <Text style={styles.promotionTitle}>
          20% Off iPhone Screen{'\n'}Repairs this weekend.
        </Text>
        
        <View style={styles.promotionAction}>
          <Text style={styles.promotionActionText}>Claim Discount</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
        </View>
      </View>
      
      {/* Decorative gradient overlay */}
      <View style={styles.promotionOverlay} />
    </TouchableOpacity>
  )

  // Task 9.6 — Active repair status card (shown only when customer has an ongoing job)
  const renderActiveRepairCard = () => {
    if (!MOCK_ACTIVE_JOB) return null

    const job = MOCK_ACTIVE_JOB
    const statusLabel =
      job.status === 'in_progress' ? 'In Progress' :
      job.status === 'pending' ? 'Awaiting Technician' : 'Completed'

    return (
      <View style={[styles.activeJobSection, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Repair</Text>
          <TouchableOpacity
            onPress={handleViewActiveJob}
            accessibilityLabel="View active repair details"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAllButton}>View Details</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.activeJobCard}
          onPress={handleViewActiveJob}
          activeOpacity={0.9}
          accessibilityLabel={`Active repair: ${job.deviceType} - ${job.issue}`}
          accessibilityHint="Tap to view repair status"
          accessibilityRole="button"
        >
          {/* Status pill */}
          <View style={styles.activeJobStatusRow}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>{statusLabel}</Text>
            </View>
            <Text style={styles.activeJobEta}>Est. {job.estimatedCompletion}</Text>
          </View>

          {/* Device & issue */}
          <Text style={styles.activeJobDevice}>{job.deviceType}</Text>
          <Text style={styles.activeJobIssue}>{job.issue}</Text>

          {/* Technician info */}
          <View style={styles.activeJobTechRow}>
            <Ionicons name="person-circle-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.activeJobTechName}>{job.technicianName}</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${job.progress}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>{job.progress}% complete</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Task 9.4 — Nearby technicians horizontal scroll
  const renderNearbyTechnicians = () => (
    <View style={[styles.techniciansSection, { paddingHorizontal: horizontalPadding }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nearby Technicians</Text>
        <TouchableOpacity
          accessibilityLabel="See all nearby technicians"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.seeAllButton}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_NEARBY_TECHNICIANS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.techniciansList}
        ItemSeparatorComponent={() => <View style={styles.technicianSeparator} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={4}
        windowSize={5}
        renderItem={({ item }) => (
          <TechnicianCard
            id={item.id}
            name={item.name}
            rating={item.rating}
            jobCount={item.jobCount}
            isVerified={item.isVerified}
            labourPrice={item.labourPrice}
            distance={item.distance}
            isAvailable={item.isAvailable}
            specialties={item.specialties}
            onPress={() => handleTechnicianPress(item.id)}
            style={StyleSheet.flatten([styles.technicianCard, { width: responsive(240, 280, 320) }])}
          />
        )}
      />
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={colors.background}
        translucent={false}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {renderHeader()}
        {renderSearchBar()}
        {/* Task 9.6 — Active repair card shown when customer has an ongoing job */}
        {renderActiveRepairCard()}
        {renderCategories()}
        {renderPromotionalBanner()}
        {/* Task 9.4 — Nearby technicians horizontal scroll */}
        {renderNearbyTechnicians()}
        
        {/* Spacer for bottom navigation + FAB clearance */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Task 9.6 — Floating Action Button for quick repair requests */}
      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: insets.bottom + 16 + 56 },
        ]}
        onPress={handleFABPress}
        activeOpacity={0.85}
        accessibilityLabel="Request a repair"
        accessibilityHint="Tap to start a new repair request"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color={colors.onSecondary} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  // Header Section
  header: {
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  
  locationSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  locationText: {
    ...typography.headlineSm,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '600',
    flex: 1,
  },
  
  locationLoader: {
    marginLeft: spacing.xs,
  },
  
  changeLocationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  
  greetingSection: {
    marginTop: spacing.xs,
  },
  
  greeting: {
    ...typography.headlineMd,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  
  subGreeting: {
    ...typography.bodyLg,
    color: colors.text.secondary,
  },

  // Search Section
  searchSection: {
    paddingVertical: spacing.md,
  },
  
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: spacing.md,
    height: 56, // Touch target compliance
    ...shadows.level1,
  },
  
  searchIcon: {
    marginRight: spacing.sm,
  },
  
  searchPlaceholder: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    flex: 1,
  },
  
  filterIcon: {
    marginLeft: spacing.sm,
  },

  // Categories Section
  categoriesSection: {
    marginBottom: spacing.lg,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '600',
  },
  
  seeAllButton: {
    ...typography.buttonText,
    color: colors.secondary,
  },
  
  categoriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  categoryItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  categoryIconPrimary: {
    backgroundColor: colors.primaryContainer,
  },
  
  categoryEmoji: {
    fontSize: 24,
  },
  
  categoryLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Promotional Banner
  promotionBanner: {
    marginBottom: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.level2,
  },
  
  promotionContent: {
    padding: spacing.lg,
    justifyContent: 'center',
    flex: 1,
    zIndex: 2,
  },
  
  promotionBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  
  promotionBadgeText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  promotionTitle: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    lineHeight: 32,
    marginBottom: spacing.md,
  },
  
  promotionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  
  promotionActionText: {
    ...typography.buttonText,
    color: colors.onPrimary,
  },
  
  promotionOverlay: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },

  // Bottom spacing
  bottomSpacer: {
    height: spacing.xl * 2, // Extra room for FAB
  },

  // ── Task 9.6 — Active Repair Status Card ──────────────────────────────────
  activeJobSection: {
    marginBottom: spacing.lg,
  },

  activeJobCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    ...shadows.level2,
  },

  activeJobStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.full,
    gap: spacing.xs,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },

  statusPillText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '600',
  },

  activeJobEta: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },

  activeJobDevice: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },

  activeJobIssue: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },

  activeJobTechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },

  activeJobTechName: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },

  progressBarContainer: {
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
  },

  progressLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
    textAlign: 'right',
  },

  // ── Task 9.4 — Nearby Technicians Horizontal Scroll ───────────────────────
  techniciansSection: {
    marginBottom: spacing.lg,
  },

  // Reuse sectionHeader defined above but scoped here for clarity
  techniciansList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },

  technicianSeparator: {
    width: spacing.sm,
  },

  technicianCard: {
    marginBottom: 0, // Override default bottom margin from TechnicianCard styles
  },

  // ── Task 9.6 — Floating Action Button ─────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary, // Emergency Orange (#FF5722)
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.level3,
  },
})