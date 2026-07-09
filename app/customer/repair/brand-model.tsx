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
import { popularSmartphoneModels, deviceBrands } from '@/constants/deviceTypes'

interface ModelScreenParams {
  deviceType: string
  brand: string
}

export default function ModelSelectionScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<ModelScreenParams>()
  const deviceType = params.deviceType || 'smartphone'
  const brand = params.brand || ''

  const {
    models,
    modelsLoading,
    modelsError,
    fetchModels,
    repairCategories,
    repairCategoriesLoading,
    fetchRepairCategories,
  } = usePartsCatalogue({ autoFetchBrands: false })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // Fetch models on mount
  useEffect(() => {
    if (brand) {
      fetchModels(brand)
    }
  }, [brand, fetchModels])

  // Filter models based on search
  const filteredModels = models.filter((model) =>
    model.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleModelPress = useCallback(
    (model: string) => {
      setSelectedModel(model)
      // Pre-fetch repair categories for smoother transition
      fetchRepairCategories(brand, model)
      router.push({
        pathname: '/customer/repair/category',
        params: { deviceType, brand, model },
      })
    },
    [brand, deviceType, fetchRepairCategories, router]
  )

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text)
  }, [])

  const renderModelItem = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        style={styles.modelItem}
        onPress={() => handleModelPress(item)}
        activeOpacity={0.8}
        accessibilityLabel={`Select ${item}`}
        accessibilityHint="Tap to select this model"
      >
        <View style={styles.modelIcon}>
          <Text style={styles.modelEmoji}>{getModelEmoji(deviceType)}</Text>
        </View>
        <Text style={styles.modelName}>{item}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    ),
    [deviceType, handleModelPress]
  )

  if (modelsLoading && models.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading models...</Text>
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
            <Text style={styles.title}>Select Model</Text>
            <Text style={styles.subtitle}>
              What {deviceType === 'smartphone' ? 'phone' : deviceType} model?
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Brand indicator */}
        <View style={styles.brandIndicator}>
          <View style={styles.brandChip}>
            <Text style={styles.brandChipLabel}>{brand}</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Change brand"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons name="close" size={16} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={22} color={colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${brand} models...`}
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

        {/* Models List */}
        <View style={styles.listContainer}>
          {modelsError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{modelsError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchModels(brand)}
                accessibilityLabel="Retry loading models"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {filteredModels.length === 0 && !modelsLoading && !modelsError ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-off" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No models found for "${searchQuery}"`
                  : `No ${brand} models available`}
              </Text>
              <TouchableOpacity
                style={styles.addModelButton}
                onPress={() => handleModelPress('Other')}
                accessibilityLabel="Select Other model"
              >
                <Text style={styles.addModelButtonText}>Select "Other" instead</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredModels}
              renderItem={renderModelItem}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                !modelsLoading && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No models available</Text>
                    <TouchableOpacity
                      style={styles.addModelButton}
                      onPress={() => handleModelPress('Other')}
                      accessibilityLabel="Select Other model"
                    >
                      <Text style={styles.addModelButtonText}>Select "Other" instead</Text>
                    </TouchableOpacity>
                  </View>
                )
              }
            />
          )}

          {/* Popular Models Section */}
          {models.length > 0 && filteredModels.length === models.length && (
            <View style={styles.popularSection}>
              <Text style={styles.sectionTitle}>Popular {brand} Models</Text>
              <View style={styles.popularModelsContainer}>
                {getPopularModels(brand).map((model) => (
                  <TouchableOpacity
                    key={model}
                    style={styles.popularModelChip}
                    onPress={() => handleModelPress(model)}
                    accessibilityLabel={`Popular model: ${model}`}
                  >
                    <Text style={styles.popularModelText}>{model}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

// Helper function to get emoji for model based on device type
function getModelEmoji(deviceType: string): string {
  const emojis: Record<string, string> = {
    smartphone: '📱',
    laptop: '💻',
    tablet: '📑',
    desktop: '🖥️',
    other: '🔧',
  }
  return emojis[deviceType] || '📱'
}

// Get popular models for a brand
function getPopularModels(brand: string): string[] {
  const popular = popularSmartphoneModels[brand as keyof typeof popularSmartphoneModels]
  if (popular) {
    return popular.slice(0, 6)
  }
  // Return first few from the models list
  return []
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
  brandIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  brandChipLabel: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
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
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadows.level1,
  },
  modelIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modelEmoji: {
    fontSize: 22,
  },
  modelName: {
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
  addModelButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  addModelButtonText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
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
  popularModelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  popularModelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  popularModelText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: spacing.xl * 2,
  },
})