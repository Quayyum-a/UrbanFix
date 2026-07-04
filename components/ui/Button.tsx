import React, { useRef, useCallback } from 'react'
import {
  Animated,
  Pressable,
  Text,
  StyleSheet,
  PressableProps,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { colors, typography, radius, spacing, touchTargets, animations } from '@/constants/theme'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'small' | 'medium' | 'large'

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  onPress: () => void
}

/**
 * Button component with variants and accessibility
 *
 * Requirements: 2.6, 8.1, 8.2, 9.1
 *
 * - Primary, Secondary, Ghost, and Danger variants
 * - 44px minimum touch target (WCAG 2.1 AA)
 * - 0.95 scale press animation with 150ms duration
 * - Haptic feedback on press (when expo-haptics is available)
 * - ActivityIndicator loading state
 * - Full accessibility attributes
 */
export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  onPress,
  accessibilityLabel,
  ...props
}: ButtonProps) {
  // Animated value for press scale animation (Requirement 8.2)
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: animations.fast, // 150ms
      useNativeDriver: true,
    }).start()
  }, [scaleAnim])

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: animations.fast, // 150ms
      useNativeDriver: true,
    }).start()
  }, [scaleAnim])

  const handlePress = useCallback(() => {
    if (disabled || loading) return

    // Haptic feedback for primary actions (Requirement 8.1)
    // Graceful no-op if expo-haptics is not available
    try {
      // Dynamic require to avoid hard dependency when not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Haptics = require('expo-haptics')
      if (variant === 'primary' || variant === 'danger') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      } else {
        Haptics.selectionAsync()
      }
    } catch {
      // expo-haptics not available — skip haptic feedback
    }

    onPress()
  }, [disabled, loading, variant, onPress])

  // Loading indicator color based on variant
  const indicatorColor =
    variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.onPrimary

  return (
    <Animated.View
      style={[{ transform: [{ scale: scaleAnim }] }, style]}
      // Ensure accessibility wrapper doesn't interfere
    >
      <Pressable
        style={[
          styles.base,
          styles[variant],
          styles[`${size}Size`],
          disabled && styles.disabled,
        ]}
        disabled={disabled || loading}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        // Accessibility (Requirements 9.1, 9.2)
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{
          disabled: disabled || loading,
          busy: loading,
        }}
        testID={props.testID}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={indicatorColor}
            accessibilityLabel="Loading"
            testID="button-loading-indicator"
          />
        ) : (
          <Text
            style={[
              styles.text,
              styles[`${variant}Text`],
              styles[`${size}Text`],
              disabled && styles.disabledText,
              textStyle,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    // Default min height ensures touch target compliance (Requirement 9.1)
    minHeight: touchTargets.minSize, // 44px baseline
    paddingHorizontal: spacing.lg,
  },

  // ── Variants ────────────────────────────────────────────────────────────────

  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // ── Sizes ───────────────────────────────────────────────────────────────────
  // All sizes maintain ≥44px minHeight for accessibility (Requirement 9.1)

  smallSize: {
    minHeight: touchTargets.minSize, // 44px — accessibility minimum
    paddingHorizontal: spacing.md,
  },
  mediumSize: {
    minHeight: touchTargets.buttonHeight, // 56px — comfortable default
    paddingHorizontal: spacing.lg,
  },
  largeSize: {
    minHeight: 64,
    paddingHorizontal: spacing.xl,
  },

  // ── States ──────────────────────────────────────────────────────────────────

  disabled: {
    opacity: 0.5,
  },

  // ── Text ────────────────────────────────────────────────────────────────────

  text: {
    ...typography.buttonText,
    textAlign: 'center',
  },
  primaryText: {
    color: colors.onPrimary,
  },
  secondaryText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.onError,
  },
  ghostText: {
    color: colors.primary,
  },

  // Text size overrides per button size
  smallText: {
    fontSize: 14,
    lineHeight: 18,
  },
  mediumText: {
    fontSize: 16,
    lineHeight: 20,
  },
  largeText: {
    fontSize: 18,
    lineHeight: 24,
  },

  disabledText: {
    color: colors.text.disabled,
  },
})
