// Initial pricing setup form for technicians
// Used during onboarding after verification approval

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '@/constants/theme'
import { PricingService } from '@/lib/services/pricing-service'
import type { CategoryWithPricing, SetPricingDTO } from '@/types/pricing.types'

interface PricingSetupFormProps {
  technicianId: string
  onComplete: () => void
  onSkip?: () => void
}

interface PricingFormData {
  [categoryId: string]: {
    price: string
    isAvailable: boolean
  }
}

export function PricingSetupForm({ 
  technicianId, 
  onComplete, 
  onSkip 
}: PricingSetupFormProps) {
  const [categories, setCategories] = useState<CategoryWithPricing[]>([])
  const [formData, setFormData] = useState<PricingFormData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)

      const result = await PricingService.getTechnicianPricing(technicianId)

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to load repair categories')
        return
      }

      const categoriesData = result.data as CategoryWithPricing[]
      setCategories(categoriesData)

      // Initialize form data with existing prices or suggested prices
      const initialData: PricingFormData = {}
      categoriesData.forEach(cat => {
        initialData[cat.category_id] = {
          price: cat.technician_price 
            ? String(cat.technician_price)
            : String(cat.suggested_min_price),
          isAvailable: cat.technician_price ? cat.is_available : true
        }
      })
      setFormData(initialData)
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const updatePrice = (categoryId: string, price: string) => {
    // Only allow numbers
    const cleaned = price.replace(/[^0-9]/g, '')
    setFormData(prev => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], price: cleaned }
    }))
  }

  const toggleAvailability = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      [categoryId]: { 
        ...prev[categoryId], 
        isAvailable: !prev[categoryId].isAvailable 
      }
    }))
  }

  const handleSave = async () => {
    try {
      // Validate at least one category has a price
      const pricingToSave: SetPricingDTO[] = []

      for (const [categoryId, data] of Object.entries(formData)) {
        const price = parseInt(data.price)
        if (price > 0) {
          pricingToSave.push({
            repair_category_id: categoryId,
            labor_price: price,
            is_available: data.isAvailable
          })
        }
      }

      if (pricingToSave.length === 0) {
        Alert.alert(
          'No Prices Set',
          'Please set prices for at least one repair category'
        )
        return
      }

      setSaving(true)

      const result = await PricingService.setBulkPricing({
        technician_id: technicianId,
        pricing: pricingToSave
      })

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to save prices')
        return
      }

      Alert.alert(
        'Success!',
        `You've set prices for ${pricingToSave.length} repair categories. You can update them anytime.`,
        [{ text: 'Continue', onPress: onComplete }]
      )
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading repair categories...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Set Your Prices</Text>
        <Text style={styles.subtitle}>
          Set labor prices for repairs you can perform. You can skip categories 
          you don't offer and update prices anytime.
        </Text>
      </View>

      {/* Category List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {categories.map(category => {
          const isExpanded = expandedCategories.has(category.category_id)
          const formValue = formData[category.category_id]
          const price = parseInt(formValue?.price || '0')

          return (
            <View key={category.category_id} style={styles.categoryCard}>
              {/* Category Header */}
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category.category_id)}
              >
                <View style={styles.categoryHeaderLeft}>
                  <Text style={styles.categoryName}>{category.display_name}</Text>
                  <Text style={styles.suggestedPrice}>
                    Suggested: ₦{category.suggested_min_price.toLocaleString()} - 
                    ₦{category.suggested_max_price.toLocaleString()}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.gray}
                />
              </TouchableOpacity>

              {/* Expanded Content */}
              {isExpanded && (
                <View style={styles.categoryContent}>
                  {category.description && (
                    <Text style={styles.categoryDescription}>
                      {category.description}
                    </Text>
                  )}

                  {/* Device Types */}
                  <View style={styles.deviceTypes}>
                    <Text style={styles.deviceTypesLabel}>Applies to:</Text>
                    <View style={styles.deviceTypesContainer}>
                      {category.device_types.map(type => (
                        <View key={type} style={styles.deviceTypeBadge}>
                          <Text style={styles.deviceTypeText}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Price Input */}
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.inputLabel}>Your Labor Price (₦)</Text>
                    <View style={styles.priceInputWrapper}>
                      <Text style={styles.currencySymbol}>₦</Text>
                      <TextInput
                        style={styles.priceInput}
                        value={formValue?.price}
                        onChangeText={(text) => updatePrice(category.category_id, text)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={theme.colors.gray}
                      />
                    </View>
                    {price > 0 && (
                      <Text style={styles.priceFormatted}>
                        ₦{price.toLocaleString()}
                      </Text>
                    )}
                  </View>

                  {/* Availability Toggle */}
                  {price > 0 && (
                    <TouchableOpacity
                      style={styles.availabilityToggle}
                      onPress={() => toggleAvailability(category.category_id)}
                    >
                      <View style={styles.availabilityLeft}>
                        <Ionicons
                          name={formValue?.isAvailable ? 'checkmark-circle' : 'close-circle'}
                          size={24}
                          color={formValue?.isAvailable ? theme.colors.success : theme.colors.gray}
                        />
                        <Text style={styles.availabilityText}>
                          {formValue?.isAvailable ? 'Available' : 'Not Available'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            disabled={saving}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Prices</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
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
  header: {
    padding: 20,
    backgroundColor: theme.colors.background
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden'
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  categoryHeaderLeft: {
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
    color: theme.colors.gray
  },
  categoryContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
  },
  categoryDescription: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 12,
    lineHeight: 20
  },
  deviceTypes: {
    marginBottom: 16
  },
  deviceTypesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  deviceTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  deviceTypeBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  deviceTypeText: {
    fontSize: 12,
    color: theme.colors.text
  },
  priceInputContainer: {
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF'
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
  priceFormatted: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 4,
    marginLeft: 16
  },
  availabilityToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  availabilityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12
  },
  skipButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
})
