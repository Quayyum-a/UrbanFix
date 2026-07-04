import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, typography, spacing } from '@/constants/theme'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description?: string
  buttonTitle?: string
  onButtonPress?: () => void
  style?: ViewStyle
}

export function EmptyState({
  title,
  description,
  buttonTitle,
  onButtonPress,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      {buttonTitle && onButtonPress && (
        <Button
          title={buttonTitle}
          onPress={onButtonPress}
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
  
  title: {
    ...typography.headlineSm,
    color: colors.text.primary,
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