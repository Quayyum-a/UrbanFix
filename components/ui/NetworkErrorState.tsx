import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing } from '@/constants/theme'
import { Button } from './Button'

interface NetworkErrorStateProps {
  onRetry?: () => void
  style?: ViewStyle
}

/**
 * NetworkErrorState — specialized error state for connection issues.
 *
 * Requirements: 7.6, 10.2, 10.7
 */
export function NetworkErrorState({ onRetry, style }: NetworkErrorStateProps) {
  return (
    <View
      style={[styles.container, style]}
      accessible
      accessibilityRole="none"
      accessibilityLabel="No Internet Connection. Check your connection and try again."
    >
      <Ionicons
        name="cloud-offline"
        size={64}
        color={colors.text.secondary}
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />

      <Text style={styles.title}>No Internet Connection</Text>

      <Text style={styles.subtitle}>Check your connection and try again</Text>

      {onRetry && (
        <Button
          title="Try Again"
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
