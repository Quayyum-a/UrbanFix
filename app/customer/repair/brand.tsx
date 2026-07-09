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
  TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { usePartsCatalogue } from '@/hooks/usePartsCatalogue'
import { repairCategoryLabels } from '@/constants/repairCategories'

interface BrandScreenParams {
  deviceType: string
}

export default function BrandSelectionScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<BrandScreenParams>()
  const deviceType = params.deviceType || 'smartphone'

  const {
    brands,
    brandsLoading,
    brandsError,
    fetchBrands,
    models,
    modelsLoading,
    modelsError,
    fetchModels,
  } = usePartsCatalogue({ autoFetchBrands: true })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)

  // Filter brands based on search
  const filteredBrands = brands.filter((brand) =>
    brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Navigate to model selection when brand is selected
  const handleBrandPress = useCallback(
    (brand: string) => {
      setSelectedBrand(brand)
      // Pre-fetch models for smoother transition
      fetchModels(brand)
      router.push({
        pathname: '/customer/repair/brand-model',
        params: { deviceType, brand },
      })
    },
    [deviceType, fetchModels, router]
  )

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text)
  }, [])

  const renderBrandItem = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        style={styles.brandItem}
        onPress={() => handleBrandPress(item)}
        activeOpacity={0.8}
        accessibilityLabel={`Select ${item}`}
        accessibilityHint="Tap to view models for this brand"
      >
        <View style={styles.brandIcon}>
          <Text style={styles.brandEmoji}>{getBrandEmoji(item)}</Text>
        </View>
        <Text style={styles.brandName}>{item}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    ),
    [handleBrandPress]
  )

  if (brandsLoading && brands.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading brands...</Text>
      </SafeAreaView>
    )
  }

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
            <Text style={styles.title}>Select Brand</Text>
            <Text style={styles.subtitle}>
              What {deviceType === 'smartphone' ? 'phone' : deviceType} brand do you have?
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={22} color={colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search brands..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholderTextColor={colors.text.secondary}
              autoCapitalize="none"
            />
            {searchQuery && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                accessibilityLabel="Clear search"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Brands List */}
        <View style={styles.listContainer}>
          {brandsError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{brandsError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchBrands}
                accessibilityLabel="Retry loading brands"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {filteredBrands.length === 0 && !brandsLoading && !brandsError ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-off" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No brands found for "${searchQuery}"`
                  : 'No brands available'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredBrands}
              renderItem={renderBrandItem}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                !brandsLoading && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No brands available</Text>
                  </View>
                )
              }
            />
          )}
        </View>

        {/* Popular Brands Section (if we have data) */}
        {brands.length > 0 && filteredBrands.length === brands.length && (
          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Popular Brands</Text>
            <View style={styles.popularBrandsContainer}>
              {getPopularBrands(deviceType).map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={styles.popularBrandChip}
                  onPress={() => handleBrandPress(brand)}
                  accessibilityLabel={`Popular brand: ${brand}`}
                >
                  <Text style={styles.popularBrandText}>{brand}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

// Helper function to get emoji for brand
function getBrandEmoji(brand: string): string {
  const emojis: Record<string, string> = {
    Apple: '🍎',
    Samsung: '📱',
    Google: '🔍',
    Huawei: '🌸',
    Xiaomi: '📱',
    Oppo: '📱',
    Vivo: '📱',
    Realme: '📱',
    OnePlus: '1️⃣',
    Tecno: '📱',
    Infinix: '📱',
    Itel: '📱',
    Nokia: '📱',
    Dell: '💻',
    HP: '💻',
    Lenovo: '💻',
    Asus: '💻',
    Acer: '💻',
    MSI: '💻',
    Toshiba: '💻',
    Sony: '💻',
    Amazon: '📦',
    Microsoft: '🪟',
    Custom: '🔧',
    Other: '❓',
  }
  return emojis[brand] || '📱'
}

// Get popular brands for device type
function getPopularBrands(deviceType: string): string[] {
  const popular: Record<string, string[]> = {
    smartphone: ['Apple', 'Samsung', 'Google', 'Xiaomi', 'Tecno', 'Infinix'],
    laptop: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer'],
    tablet: ['Apple', 'Samsung', 'Huawei', 'Lenovo', 'Amazon', 'Microsoft'],
    desktop: ['Dell', 'HP', 'Lenovo', 'Asus', 'Custom Build'],
    other: ['Other'],
  }
  return popular[deviceType] || popular.smartphone
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
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyLg,
    color: colors.text.primary,
  },
  listContainer: {
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
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadows.level1,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  brandEmoji: {
    fontSize: 22,
  },
  brandName: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyText: {
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
  popularSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  popularBrandsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  popularBrandChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  popularBrandText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
})