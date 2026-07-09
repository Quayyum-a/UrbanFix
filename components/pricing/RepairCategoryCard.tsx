// Repair category card for customer repair booking
// Displays category with price range and available technicians

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '@/constants/theme'
import { PricingService } from '@/lib/services/pricing-service'
import type { RepairCategory } from '@/types/pricing.types'

interface RepairCategoryCardProps {
  category: RepairCategory
  onPress: () => void
  showPriceRange?: boolean
}

export function RepairCategoryCard({
  category,
  onPress,
  showPriceRange = true
}: RepairCategoryCardProps) {
  const [priceRange, setPriceRange] = useState<{
    min: number | null
    max: number | null
    count: number
  } | null>(null)
  const [loading, setLoading] = useState(showPriceRange)

  useEffect(() => {
    if (showPriceRange) {
      loadPriceRange()
    }
  }, [category.id])

  const loadPriceRange = async () => {
    try {
      setLoading(true)
      const result = await PricingService.getCategoryPriceRange(category.id)
      if (result.success) {
        setPriceRange(result.data)
      }
    } catch (error) {
      console.error('Failed to load price range:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderEstimatedTime = () => {
    if (!category.estimated_duration_hours) return null
    
    const hours = category.estimated_duration_hours
    if (hours < 1) {
      return `${hours * 60} mins`
    } else if (hours === 1) {
      return '1 hour'
    } else {
      return `${hours} hours`
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Category Name & Description */}
        <View style={styles.headerSection}>
          <Text style={styles.categoryName}>{category.display_name}</Text>
          {category.description && (
            <Text style={styles.description} numberOfLines={2}>
              {category.description}
            </Text>
          )}
        </View>

        {/* Device Types */}
        <View style={styles.deviceTypesRow}>
          {category.device_types.slice(0, 3).map(type => (
            <View key={type} style={styles.deviceTypeBadge}>
              <Text style={styles.deviceTypeText}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </View>
          ))}
          {category.device_types.length > 3 && (
            <View style={styles.deviceTypeBadge}>
              <Text style={styles.deviceTypeText}>
                +{category.device_types.length - 3}
              </Text>
            </View>
          )}
        </View>

        {/* Price Range & Info */}
        <View style={styles.infoSection}>
          {/* Price Range */}
          {showPriceRange && (
            <View style={styles.priceContainer}>
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : priceRange && priceRange.count > 0 ? (
                <>
                  <View style={styles.priceRange}>
                    <Text style={styles.priceLabel}>From</Text>
                    <Text style={styles.price}>
                      ₦{priceRange.min?.toLocaleString()}
                    </Text>
                  </View>
                  {priceRange.max !== priceRange.min && (
                    <View style={styles.priceRange}>
                      <Text style={styles.priceLabel}>to</Text>
                      <Text style={styles.price}>
                        ₦{priceRange.max?.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.technicianCount}>
                    {priceRange.count} technician{priceRange.count > 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.suggestedPriceText}>
                  ₦{category.suggested_min_price.toLocaleString()} - 
                  ₦{category.suggested_max_price.toLocaleString()}
                </Text>
              )}
            </View>
          )}

          {/* Estimated Time */}
          {category.estimated_duration_hours && (
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={16} color={theme.colors.gray} />
              <Text style={styles.timeText}>{renderEstimatedTime()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow Icon */}
      <Ionicons name="chevron-forward" size={24} color={theme.colors.gray} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  cardContent: {
    flex: 1
  },
  headerSection: {
    marginBottom: 8
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  description: {
    fontSize: 13,
    color: theme.colors.gray,
    lineHeight: 18
  },
  deviceTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  deviceTypeBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  deviceTypeText: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: '500'
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  priceRange: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4
  },
  priceLabel: {
    fontSize: 11,
    color: theme.colors.gray
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary
  },
  technicianCount: {
    fontSize: 11,
    color: theme.colors.gray,
    marginLeft: 4
  },
  suggestedPriceText: {
    fontSize: 13,
    color: theme.colors.gray,
    fontWeight: '500'
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.gray
  }
})
