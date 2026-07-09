import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing } from '@/constants/theme'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  subtitle?: string
  /** Ionicons icon name shown above the title */
  icon?: React.ComponentProps<typeof Ionicons>['name']
  /** Label for the optional CTA button */
  actionLabel?: string
  onAction?: () => void
  style?: ViewStyle
  /**
   * @deprecated use subtitle instead
   */
  description?: string
  /**
   * @deprecated use actionLabel instead
   */
  buttonTitle?: string
  /**
   * @deprecated use onAction instead
   */
  onButtonPress?: () => void
}

/**
 * EmptyState component — centered layout with optional icon, title, subtitle, and CTA.
 *
 * Requirements: 7.4, 10.6
 */
export function EmptyState({
  title,
  subtitle,
  icon,
  actionLabel,
  onAction,
  style,
  // legacy props
  description,
  buttonTitle,
  onButtonPress,
}: EmptyStateProps) {
  // Support legacy prop names as fallbacks
  const resolvedSubtitle = subtitle ?? description
  const resolvedActionLabel = actionLabel ?? buttonTitle
  const resolvedOnAction = onAction ?? onButtonPress

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="none"
      accessibilityLabel={`${title}${resolvedSubtitle ? '. ' + resolvedSubtitle : ''}`}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={64}
          color={colors.text.secondary}
          style={styles.icon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}

      <Text style={styles.title}>{title}</Text>

      {resolvedSubtitle ? (
        <Text style={styles.subtitle}>{resolvedSubtitle}</Text>
      ) : null}

      {resolvedActionLabel && resolvedOnAction ? (
        <Button
          title={resolvedActionLabel}
          onPress={resolvedOnAction}
          variant="primary"
          style={styles.button}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  icon: {
    marginBottom: spacing.md,
  },

  title: {
    ...typography.headlineSm,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  button: {
    minWidth: 200,
  },
})
