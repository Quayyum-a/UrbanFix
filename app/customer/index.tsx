// CustomerHomeScreen - Complete implementation for Task 9.1
// Implements header with location toggle, search bar, categories grid, and promotional banner

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { deviceTypes, type DeviceType } from '@/constants/deviceTypes'

// Mock data for development
const REPAIR_CATEGORIES = [
  { id: 'smartphone', icon: '📱', label: 'Phone', type: 'smartphone' as DeviceType },
  { id: 'laptop', icon: '💻', label: 'Laptop', type: 'laptop' as DeviceType },
  { id: 'tablet', icon: '📑', label: 'Tablet', type: 'tablet' as DeviceType },
  { id: 'desktop', icon: '🖥️', label: 'Desktop', type: 'desktop' as DeviceType },
]

const SAVED_ADDRESSES = [
  { id: 'home', label: 'Home', address: 'Victoria Island, Lagos' },
  { id: 'work', label: 'Work', address: 'Ikeja, Lagos' },
]

export default function CustomerHomeScreen() {
  const { userProfile } = useAuth()
  const [selectedAddress, setSelectedAddress] = useState(SAVED_ADDRESSES[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false)
    }, 2000)
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

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Location Toggle */}
      <View style={styles.locationSection}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={styles.locationText}>{selectedAddress.address}</Text>
        </View>
        
        <View style={styles.addressToggle}>
          {SAVED_ADDRESSES.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.toggleButton,
                selectedAddress.id === address.id && styles.toggleButtonActive
              ]}
              onPress={() => setSelectedAddress(address)}
              accessibilityLabel={`Switch to ${address.label} address`}
            >
              <Text style={[
                styles.toggleButtonText,
                selectedAddress.id === address.id && styles.toggleButtonTextActive
              ]}>
                {address.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
    <View style={styles.searchSection}>
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
    <View style={styles.categoriesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <TouchableOpacity accessibilityLabel="See all categories">
          <Text style={styles.seeAllButton}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.categoriesGrid}>
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
      style={styles.promotionBanner}
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
        {renderCategories()}
        {renderPromotionalBanner()}
        
        {/* Spacer for bottom navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingHorizontal: spacing.md,
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
  },
  
  addressToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    padding: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  
  toggleButtonActive: {
    backgroundColor: colors.primary,
    ...shadows.level1,
  },
  
  toggleButtonText: {
    ...typography.labelMd,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  
  toggleButtonTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
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
    paddingHorizontal: spacing.md,
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
    paddingHorizontal: spacing.md,
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
    gap: spacing.sm,
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
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    minHeight: 160,
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
    height: spacing.xl,
  },
})