import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing } from '@/constants/theme'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  subtitle?: string
  onRetry?: () => void
  retryLabel?: string
  style?: ViewStyle
  /**
   * @deprecated use subtitle instead
   */
  description?: string
}

/**
 * ErrorState component — shows an error illustration with retry CTA.
 *
 * Requirements: 7.6, 10.2
 */
export function ErrorState({
  title = 'Something went wrong',
  subtitle,
  onRetry,
  retryLabel = 'Try Again',
  style,
  description,
}: ErrorStateProps) {
  const resolvedSubtitle =
    subtitle ?? description ?? 'Please try again or contact support'

  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="none"
      accessibilityLabel={`${title}. ${resolvedSubtitle}`}
    >
      <Ionicons
        name="alert-circle"
        size={64}
        color={colors.error}
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.subtitle}>{resolvedSubtitle}</Text>

      {onRetry && (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="primary"
          style={styles.button}
        />
      )}
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
