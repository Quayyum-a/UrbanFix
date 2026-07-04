import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, typography, spacing } from '@/constants/theme'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  style?: ViewStyle
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again or contact support if the problem persists.',
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          style={styles.button}
          variant="secondary"
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
  
  title: {
    ...typography.headlineSm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  description: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  button: {
    minWidth: 200,
  },
})