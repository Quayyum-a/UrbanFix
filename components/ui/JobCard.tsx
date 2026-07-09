import React from 'react'
import { View, Text, StyleSheet, Pressable, ViewStyle, Animated } from 'react-native'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { StatusBadge, type JobStatus } from '@/components/ui'
import { DeviceType } from '@/constants/deviceTypes'

interface JobCardProps {
  id: string
  deviceType?: DeviceType
  deviceBrand: string
  deviceModel: string
  repairCategory: string
  status: JobStatus
  totalPrice: number
  createdAt: string
  progressPercentage?: number // 0-100 for active repairs
  onPress: () => void
  style?: ViewStyle
}

/**
 * Device icon mapping for visual representation
 * Maps device types to unicode symbols for quick visual recognition
 */
const deviceIcons: Record<DeviceType | string, string> = {
  smartphone: '📱',
  laptop: '💻',
  tablet: '📑',
  desktop: '🖥️',
  other: '⚙️',
}

/**
 * JobCard component for repair display
 *
 * Requirements: 7.1, 7.8
 *
 * Displays:
 * - Device icon based on category
 * - Device brand and model name
 * - Repair category description
 * - Current job status with semantic colors
 * - Total price in Nigerian Naira with proper formatting
 * - Creation date
 * - Progress indicator for active repairs
 */
export const JobCard = React.memo(function JobCard({
  id,
  deviceType = 'other',
  deviceBrand,
  deviceModel,
  repairCategory,
  status,
  totalPrice,
  createdAt,
  progressPercentage,
  onPress,
  style,
}: JobCardProps) {
  const deviceName = `${deviceBrand} ${deviceModel}`
  const deviceIcon = deviceIcons[deviceType] || deviceIcons.other
  const isActive = status === 'repair_started'
  const showProgress = isActive && progressPercentage !== undefined && progressPercentage >= 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        style,
      ]}
      accessible
      accessibilityLabel={`Repair job: ${deviceName}`}
      accessibilityHint={`${repairCategory}, ${status}`}
      accessibilityRole="button"
    >
      {/* Header with icon, device name, and status badge */}
      <View style={styles.header}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceIcon}>{deviceIcon}</Text>
          <View style={styles.deviceDetails}>
            <Text style={styles.deviceName} numberOfLines={1}>
              {deviceName}
            </Text>
            <Text style={styles.repairCategory} numberOfLines={1}>
              {repairCategory}
            </Text>
          </View>
        </View>
        <StatusBadge status={status} size="small" />
      </View>

      {/* Progress indicator for active repairs */}
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(Math.max(progressPercentage, 0), 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progressPercentage)}% complete</Text>
        </View>
      )}

      {/* Footer with pricing and date */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.price}>
            ₦{(totalPrice / 100).toLocaleString('en-NG')}
          </Text>
        </View>
        <Text style={styles.date}>
          {new Date(createdAt).toLocaleDateString('en-NG', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
    </Pressable>
  )
})

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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },

  deviceInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: spacing.sm,
    alignItems: 'flex-start',
  },

  deviceIcon: {
    fontSize: 24,
    marginRight: spacing.xs,
  },

  deviceDetails: {
    flex: 1,
  },

  deviceName: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },

  repairCategory: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },

  progressContainer: {
    marginBottom: spacing.sm,
  },

  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
  },

  progressText: {
    ...typography.labelMd,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  priceLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
    marginBottom: 2,
  },

  price: {
    ...typography.bodyLg,
    color: colors.primary,
    fontWeight: '700',
  },

  date: {
    ...typography.labelMd,
    color: colors.text.secondary,
  },
})