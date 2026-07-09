/**
 * ValidationFeedback — inline form validation feedback component
 *
 * Requirements: 10.5, 11.3
 *
 * Displays one of three feedback states below a form field:
 *   - error     → Emergency Orange (#FF5722) with close-circle icon
 *   - success   → Success Green (#2ecc71) with checkmark-circle icon
 *   - helperText → secondary color, neutral, no icon
 *
 * Animates in with a fade + slide-down transition when the visible
 * state changes. Returns null when all props are undefined/empty.
 */

import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, animations } from '@/constants/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationFeedbackProps {
  /** Error message — shown in Emergency Orange with close-circle icon */
  error?: string
  /** Success message — shown in green with checkmark-circle icon */
  success?: string
  /** Neutral helper text — shown in secondary color, no icon */
  helperText?: string
}

type FeedbackState = 'error' | 'success' | 'helper' | 'none'

// ─── Component ────────────────────────────────────────────────────────────────

export function ValidationFeedback({
  error,
  success,
  helperText,
}: ValidationFeedbackProps): React.ReactElement | null {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-6)).current

  // Determine which state takes priority: error > success > helperText
  const state: FeedbackState = error
    ? 'error'
    : success
    ? 'success'
    : helperText
    ? 'helper'
    : 'none'

  const hasContent = state !== 'none'

  useEffect(() => {
    if (hasContent) {
      // Reset position then animate in
      fadeAnim.setValue(0)
      translateY.setValue(-6)
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: animations.fast,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: animations.fast,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: animations.fast,
        useNativeDriver: true,
      }).start()
    }
  }, [state, hasContent, fadeAnim, translateY])

  if (!hasContent) {
    return null
  }

  const message = error ?? success ?? helperText ?? ''

  const iconName: React.ComponentProps<typeof Ionicons>['name'] =
    state === 'error'
      ? 'close-circle'
      : state === 'success'
      ? 'checkmark-circle'
      : 'information-circle-outline'

  const textColor =
    state === 'error'
      ? colors.secondary      // Emergency Orange #FF5722
      : state === 'success'
      ? colors.success         // #2ecc71
      : colors.text.secondary  // neutral

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY }] },
      ]}
      accessibilityLiveRegion={state === 'error' ? 'assertive' : 'polite'}
    >
      {state !== 'helper' ? (
        <Ionicons
          name={iconName}
          size={14}
          color={textColor}
          style={styles.icon}
        />
      ) : null}

      <Text
        style={[styles.text, { color: textColor }]}
        accessibilityRole={state === 'error' ? 'alert' : 'text'}
      >
        {message}
      </Text>
    </Animated.View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs / 2,
    paddingHorizontal: 2,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    ...typography.labelMd,
    flexShrink: 1,
  },
})
