import React from 'react'
import { View, Text, StyleSheet, Pressable, ViewStyle, Image, ScrollView } from 'react-native'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { StarRating, Badge } from '@/components/ui'

interface TechnicianCardProps {
  id: string
  name: string
  rating: number
  jobCount: number
  isVerified: boolean
  labourPrice: number
  distance?: string
  isAvailable?: boolean
  avatarUrl?: string
  specialties?: string[]
  onPress: () => void
  style?: ViewStyle
}

/**
 * TechnicianCard component for displaying technician information
 *
 * Requirements: 7.2, 5.6
 *
 * Displays:
 * - Avatar (image or initials fallback)
 * - Name with verification badge
 * - Star rating with job count
 * - Labour pricing
 * - Distance to customer (optional)
 * - Availability status indicator
 * - Specialty tags as pill-shaped badges
 */
export function TechnicianCard({
  id,
  name,
  rating,
  jobCount,
  isVerified,
  labourPrice,
  distance,
  isAvailable = true,
  avatarUrl,
  specialties = [],
  onPress,
  style,
}: TechnicianCardProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        style,
      ]}
      accessible
      accessibilityLabel={`Technician: ${name}`}
      accessibilityHint={`${isVerified ? 'Verified' : 'Not verified'}, Rating: ${rating}, ${isAvailable ? 'Available' : 'Unavailable'}`}
      accessibilityRole="button"
    >
      {/* Header with avatar, info, and price */}
      <View style={styles.header}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              defaultSource={require('@/assets/images/default-avatar.png')}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {/* Availability Indicator */}
          {isAvailable && <View style={styles.availabilityBadge} />}
        </View>

        {/* Info Section */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {isVerified && (
              <Badge label="Verified" variant="success" size="small" />
            )}
          </View>

          <View style={styles.ratingRow}>
            <StarRating rating={rating} size={14} showRating={false} />
            <Text style={styles.ratingText}>
              {rating.toFixed(1)}
            </Text>
            <Text style={styles.jobCount}>
              ({jobCount})
            </Text>
          </View>
        </View>

        {/* Price Section */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Labour</Text>
          <Text style={styles.price}>
            ₦{(labourPrice / 100).toLocaleString('en-NG')}
          </Text>
          {distance && (
            <Text style={styles.distance}>{distance}</Text>
          )}
        </View>
      </View>

      {/* Specialties Section */}
      {specialties.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.specialtiesContainer}
          scrollEnabled={false}
        >
          <View style={styles.specialtiesList}>
            {specialties.slice(0, 3).map((specialty, index) => (
              <Badge
                key={`${specialty}-${index}`}
                label={specialty}
                variant="info"
                size="small"
                style={styles.specialtyBadge}
              />
            ))}
            {specialties.length > 3 && (
              <Badge
                label={`+${specialties.length - 3}`}
                variant="default"
                size="small"
              />
            )}
          </View>
        </ScrollView>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.level1,
  },

  pressed: {
    opacity: 0.9,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  avatarContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },

  availabilityBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },

  info: {
    flex: 1,
    marginRight: spacing.sm,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  name: {
    ...typography.bodyLg,
    color: colors.text.primary,
    fontWeight: '600',
    marginRight: spacing.xs,
    flex: 1,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ratingText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },

  jobCount: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },

  priceContainer: {
    alignItems: 'flex-end',
  },

  priceLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },

  price: {
    ...typography.bodyLg,
    color: colors.primary,
    fontWeight: '700',
  },

  distance: {
    ...typography.labelMd,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  specialtiesContainer: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },

  specialtiesList: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

  specialtyBadge: {
    marginRight: 0,
  },
})