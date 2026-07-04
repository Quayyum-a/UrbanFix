import React, { useCallback, useRef } from 'react'
import {
  ViewProps,
  ViewStyle,
  StyleSheet,
  Pressable,
  View,
  Animated,
} from 'react-native'
import { colors, radius, spacing, shadows, animations } from '@/constants/theme'

export type CardVariant = 'default' | 'outlined' | 'elevated'

export interface CardProps extends ViewProps {
  variant?: CardVariant
  children: React.ReactNode
  style?: ViewStyle
  /**
   * When provided, the card becomes pressable with a 0.95 scale press animation.
   * Accessibility role is automatically set to 'button'.
   */
  onPress?: () => void
  /**
   * Accessible label for screen readers. Required when onPress is provided
   * to give context about what the card action does.
   */
  accessibilityLabel?: string
  /**
   * Additional accessibility hint describing the result of pressing the card.
   */
  accessibilityHint?: string
}

const PRESS_SCALE = 0.95

export function Card({
  variant = 'default',
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: CardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: PRESS_SCALE,
      duration: animations.fast, // 150ms per design spec
      useNativeDriver: true,
    }).start()
  }, [scaleAnim])

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: animations.fast,
      useNativeDriver: true,
    }).start()
  }, [scaleAnim])

  const cardStyle = [styles.base, styles[variant], style]

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          style={cardStyle}
          {...props}
        >
          {children}
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <View
      accessibilityRole="none"
      style={cardStyle}
      {...props}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, // 12px per design spec
    padding: spacing.md,
  },

  /** White background with a subtle border */
  default: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },

  /** Enhanced border for emphasis */
  outlined: {
    borderWidth: 2,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },

  /** Drop shadow with tonal layering */
  elevated: {
    ...shadows.level2,
    borderWidth: 0,
    backgroundColor: colors.surfaceContainerLow,
  },
})
