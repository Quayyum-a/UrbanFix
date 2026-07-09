// Pricing management screen for technicians
// Allows updating prices and availability for existing categories

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '@/constants/theme'
import { PricingService } from '@/lib/services/pricing-service'
import type { CategoryWithPricing } from '@/types/pricing.types'

interface PricingManagementScreenProps {
  technicianId: string
}

export function PricingManagementScreen({ technicianId }: PricingManagementScreenProps) {
  const [categories, setCategories] = useState<CategoryWithPricing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [saving, setSaving] = useState(false)

  // Filter options
  const [filter, setFilter] = useState<'all' | 'set' | 'unset'>('all')

  useEffect(() => {
    loadPricing()
  }, [])

  const loadPricing = async () => {
    try {
      const result = await PricingService.getTechnicianPricing(technicianId)

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to load pricing')
        return
      }

      setCategories(result.data as CategoryWithPricing[])
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadPricing()
  }

  const startEdit = (categoryId: string, currentPrice: number | null) => {
    setEditingCategory(categoryId)
    setEditPrice(currentPrice ? String(currentPrice) : '')
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setEditPrice('')
  }

  const savePrice = async (categoryId: string) => {
    try {
      const price = parseInt(editPrice)

      if (isNaN(price) || price <= 0) {
        Alert.alert('Invalid Price', 'Please enter a valid price greater than 0')
        return
      }

      setSaving(true)

      const result = await PricingService.setPricing(technicianId, {
        repair_category_id: categoryId,
        labor_price: price,
        is_available: true
      })

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to save price')
        return
      }

      // Update local state
      setCategories(prev =>
        prev.map(cat =>
          cat.category_id === categoryId
            ? { ...cat, technician_price: price, is_available: true }
            : cat
        )
      )

      setEditingCategory(null)
      setEditPrice('')
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailability = async (categoryId: string, currentAvailability: boolean) => {
    try {
      const result = await PricingService.updateAvailability(
        technicianId,
        categoryId,
        !currentAvailability
      )

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update availability')
        return
      }

      // Update local state
      setCategories(prev =>
        prev.map(cat =>
          cat.category_id === categoryId
            ? { ...cat, is_available: !currentAvailability }
            : cat
        )
      )
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    }
  }

  const deletePrice = async (categoryId: string, categoryName: string) => {
    Alert.alert(
      'Remove Price',
      `Remove your pricing for ${categoryName}? You can add it back anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await PricingService.deletePricing(technicianId, categoryId)
            if (result.success) {
              setCategories(prev =>
                prev.map(cat =>
                  cat.category_id === categoryId
                    ? { ...cat, technician_price: null, is_available: false }
                    : cat
                )
              )
            } else {
              Alert.alert('Error', result.error || 'Failed to remove price')
            }
          }
        }
      ]
    )
  }

  const filteredCategories = categories.filter(cat => {
    if (filter === 'set') return cat.technician_price !== null
    if (filter === 'unset') return cat.technician_price === null
    return true
  })

  const stats = {
    total: categories.length,
    set: categories.filter(c => c.technician_price !== null).length,
    available: categories.filter(c => c.technician_price !== null && c.is_available).length
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your pricing...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.set}</Text>
          <Text style={styles.statLabel}>Prices Set</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.available}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total - stats.set}</Text>
          <Text style={styles.statLabel}>Unset</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({categories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'set' && styles.filterTabActive]}
          onPress={() => setFilter('set')}
        >
          <Text style={[styles.filterText, filter === 'set' && styles.filterTextActive]}>
            Set ({stats.set})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unset' && styles.filterTabActive]}
          onPress={() => setFilter('unset')}
        >
          <Text style={[styles.filterText, filter === 'unset' && styles.filterTextActive]}>
            Unset ({stats.total - stats.set})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCategories.map(category => {
          const isEditing = editingCategory === category.category_id
          const hasPrice = category.technician_price !== null

          return (
            <View key={category.category_id} style={styles.categoryCard}>
              {/* Category Info */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.display_name}</Text>
                  <Text style={styles.suggestedPrice}>
                    Suggested: ₦{category.suggested_min_price.toLocaleString()} - 
                    ₦{category.suggested_max_price.toLocaleString()}
                  </Text>
                  {category.description && (
                    <Text style={styles.categoryDescription} numberOfLines={2}>
                      {category.description}
                    </Text>
                  )}
                </View>

                {hasPrice && !isEditing && category.is_available && (
                  <View style={styles.availableBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.availableText}>Active</Text>
                  </View>
                )}
              </View>

              {/* Current Price or Edit Mode */}
              {isEditing ? (
                <View style={styles.editContainer}>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.currencySymbol}>₦</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={editPrice}
                      onChangeText={(text) => setEditPrice(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      placeholder="Enter price"
                      placeholderTextColor={theme.colors.gray}
                      autoFocus
                    />
                  </View>
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelEdit}
                      disabled={saving}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButtonSmall}
                      onPress={() => savePrice(category.category_id)}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {hasPrice ? (
                    <View style={styles.priceContainer}>
                      <Text style={styles.yourPriceLabel}>Your Price:</Text>
                      <Text style={styles.yourPriceValue}>
                        ₦{category.technician_price!.toLocaleString()}
                      </Text>
                      {category.jobs_completed > 0 && (
                        <Text style={styles.statsText}>
                          {category.jobs_completed} jobs • ⭐ {category.average_rating.toFixed(1)}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noPriceText}>No price set</Text>
                  )}

                  {/* Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => startEdit(category.category_id, category.technician_price)}
                    >
                      <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                      <Text style={styles.actionButtonText}>
                        {hasPrice ? 'Edit Price' : 'Set Price'}
                      </Text>
                    </TouchableOpacity>

                    {hasPrice && (
                      <>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => toggleAvailability(category.category_id, category.is_available)}
                        >
                          <Ionicons
                            name={category.is_available ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={theme.colors.gray}
                          />
                          <Text style={styles.actionButtonText}>
                            {category.is_available ? 'Make Unavailable' : 'Make Available'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => deletePrice(category.category_id, category.display_name)}
                        >
                          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                          <Text style={[styles.actionButtonText, styles.deleteText]}>Remove</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              )}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.gray
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF'
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.gray
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    alignItems: 'center'
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  categoryInfo: {
    flex: 1
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  suggestedPrice: {
    fontSize: 13,
    color: theme.colors.gray,
    marginBottom: 4
  },
  categoryDescription: {
    fontSize: 13,
    color: theme.colors.gray,
    marginTop: 4
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  availableText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success
  },
  priceContainer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 12
  },
  yourPriceLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 4
  },
  yourPriceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4
  },
  statsText: {
    fontSize: 12,
    color: theme.colors.gray
  },
  noPriceText: {
    fontSize: 14,
    color: theme.colors.gray,
    fontStyle: 'italic',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 12
  },
  editContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: 8
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    paddingVertical: 12
  },
  editActions: {
    flexDirection: 'row',
    gap: 8
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text
  },
  saveButtonSmall: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.background
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text
  },
  deleteText: {
    color: theme.colors.error
  }
})
