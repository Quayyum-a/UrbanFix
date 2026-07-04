import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, typography, radius, spacing } from '@/constants/theme'

/**
 * StatusBadge component with semantic colors for job status display
 *
 * Requirements: 7.3, 9.3
 *
 * Maps job statuses to color-coded indicators with proper contrast ratios
 * for accessibility. All status indicators meet WCAG 2.1 AA color contrast
 * standards (minimum 4.5:1 for text on colored background).
 */

export type JobStatus = 
  | 'booked' 
  | 'paid' 
  | 'pickup_scheduled' 
  | 'device_received' 
  | 'repair_started' 
  | 'awaiting_release' 
  | 'disputed' 
  | 'complete' 
  | 'cancelled'

interface StatusBadgeProps {
  status: JobStatus
  size?: 'small' | 'medium'
  style?: ViewStyle
}

/**
 * Status configuration with semantic colors
 * 
 * Color mapping:
 * - success (green): Paid, Complete - positive outcomes
 * - warning (orange): In Progress, Awaiting Release - attention needed
 * - error (red): Disputed, Cancelled - issues requiring action
 * - info (blue): Booked, Scheduled, Device Received - neutral status updates
 * 
 * All colors meet WCAG 2.1 AA contrast ratio (4.5:1 minimum)
 */
const statusConfig: Record<JobStatus, { label: string; backgroundColor: string; textColor: string }> = {
  booked: { 
    label: 'Booked', 
    backgroundColor: colors.primary,
    textColor: colors.onPrimary,
  },
  paid: { 
    label: 'Paid', 
    backgroundColor: '#1b7e3c', // Dark green with WCAG AA contrast
    textColor: colors.onPrimary,
  },
  pickup_scheduled: { 
    label: 'Pickup Scheduled', 
    backgroundColor: colors.primary,
    textColor: colors.onPrimary,
  },
  device_received: { 
    label: 'Device Received', 
    backgroundColor: colors.primary,
    textColor: colors.onPrimary,
  },
  repair_started: { 
    label: 'In Progress', 
    backgroundColor: colors.secondary,
    textColor: colors.text.primary, // Dark text for better contrast
  },
  awaiting_release: { 
    label: 'Awaiting Release', 
    backgroundColor: colors.warning,
    textColor: colors.text.primary, // Dark text for better contrast
  },
  disputed: { 
    label: 'Disputed', 
    backgroundColor: colors.error,
    textColor: colors.onError,
  },
  complete: { 
    label: 'Complete', 
    backgroundColor: '#1b7e3c', // Dark green with WCAG AA contrast
    textColor: colors.onPrimary,
  },
  cancelled: { 
    label: 'Cancelled', 
    backgroundColor: colors.error,
    textColor: colors.onError,
  },
}

export function StatusBadge({ status, size = 'small', style }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  const sizeStyles = size === 'small' 
    ? { paddingVertical: 4, paddingHorizontal: spacing.xs }
    : { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }

  const textSizeStyle = size === 'small'
    ? { fontSize: 10, lineHeight: 14 }
    : { fontSize: 12, lineHeight: 16 }
  
  return (
    <View 
      style={[
        styles.badge,
        sizeStyles,
        { backgroundColor: config.backgroundColor },
        style,
      ]}
      accessible
      accessibilityLabel={`Job status: ${config.label}`}
      accessibilityRole="text"
    >
      <Text 
        style={[
          styles.text,
          textSizeStyle,
          { color: config.textColor },
        ]}
      >
        {config.label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
  },

  text: {
    ...typography.labelMd,
    fontWeight: '600',
  },
})