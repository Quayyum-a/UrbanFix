import React from 'react'
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { colors, typography, radius, spacing } from '@/constants/theme'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'
type BadgeSize = 'small' | 'medium' | 'large'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  size?: BadgeSize
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Badge({
  label,
  variant = 'default',
  size = 'medium',
  style,
  textStyle,
}: BadgeProps) {
  const badgeStyle = [
    styles.base,
    styles[variant],
    styles[size],
    style,
  ]

  const badgeTextStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ]

  return (
    <View style={badgeStyle}>
      <Text style={badgeTextStyle}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  
  // Variants
  default: {
    backgroundColor: colors.surfaceContainer,
  },
  success: {
    backgroundColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warning,
  },
  error: {
    backgroundColor: colors.error,
  },
  info: {
    backgroundColor: colors.primary,
  },
  
  // Sizes
  small: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  medium: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  large: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  
  // Text styles
  text: {
    ...typography.labelMd,
    fontWeight: '600',
  },
  
  defaultText: {
    color: colors.text.primary,
  },
  successText: {
    color: colors.surface,
  },
  warningText: {
    color: colors.surface,
  },
  errorText: {
    color: colors.surface,
  },
  infoText: {
    color: colors.surface,
  },
  
  // Text sizes
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
})