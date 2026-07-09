/**
 * Snackbar component — animated slide-up notification bar
 *
 * Requirements: 10.5, 10.8
 *
 * - Types: 'info' | 'success' | 'error' | 'warning'
 * - Slides in from the bottom using Animated.Value
 * - Positioned above the bottom tab bar (safe area)
 * - Color-coded per type:
 *     success  → green (#2ecc71)
 *     error    → Emergency Orange (#FF5722)
 *     warning  → amber (#e0a030)
 *     info     → Deep Trust Blue (#031636)
 * - Optional action label / callback
 * - Auto-dismisses after `duration` ms (default 3000ms)
 */

import React, { useEffect, useRef, useCallback } from 'react'
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, typography, spacing, radius, animations } from '@/constants/theme'

export type SnackbarType = 'info' | 'success' | 'error' | 'warning'

export interface SnackbarProps {
  /** Text displayed in the snackbar */
  message: string
  /** Visual variant — controls background colour */
  type?: SnackbarType
  /**
   * How long (ms) to stay visible before auto-dismissing.
   * Pass 0 to disable auto-dismiss.
   * @default 3000
   */
  duration?: number
  /** Label for the optional action button */
  actionLabel?: string
  /** Called when the action button is pressed */
  onAction?: () => void
  /** Whether the snackbar is visible */
  visible: boolean
  /** Called when the snackbar has finished dismissing */
  onDismiss: () => void
}

const SLIDE_UP_DISTANCE = 100 // px — travels this far during slide-in/out
const TAB_BAR_HEIGHT = 60 // estimated bottom tab bar height

/** Background colour for each snackbar type */
const typeColors: Record<SnackbarType, string> = {
  success: colors.success,
  error: colors.secondary, // Emergency Orange (#FF5722)
  warning: colors.warning,
  info: colors.primary,    // Deep Trust Blue (#031636)
}

export function Snackbar({
  message,
  type = 'info',
  duration = 3000,
  actionLabel,
  onAction,
  visible,
  onDismiss,
}: SnackbarProps) {
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(SLIDE_UP_DISTANCE)).current
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: SLIDE_UP_DISTANCE,
      duration: animations.normal,
      useNativeDriver: true,
    }).start(() => {
      onDismiss()
    })
  }, [translateY, onDismiss])

  useEffect(() => {
    // Clear any pending timer
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current)
      dismissTimer.current = null
    }

    if (visible) {
      // Slide in
      Animated.timing(translateY, {
        toValue: 0,
        duration: animations.normal,
        useNativeDriver: true,
      }).start()

      // Schedule auto-dismiss
      if (duration > 0) {
        dismissTimer.current = setTimeout(() => {
          dismiss()
        }, duration)
      }
    } else {
      // Slide out (handles external `visible` toggle)
      Animated.timing(translateY, {
        toValue: SLIDE_UP_DISTANCE,
        duration: animations.normal,
        useNativeDriver: true,
      }).start()
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current)
      }
    }
  }, [visible, duration, dismiss, translateY])

  const handleAction = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current)
    }
    onAction?.()
    dismiss()
  }, [onAction, dismiss])

  const bottomOffset = insets.bottom + TAB_BAR_HEIGHT + spacing.sm

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: typeColors[type], bottom: bottomOffset },
        { transform: [{ translateY }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>

      {actionLabel ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    minHeight: 48,
    // Elevation — appear above tab bar content
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
    zIndex: 1000,
  },

  message: {
    ...typography.bodyMd,
    color: colors.text.inverse,
    flex: 1,
    marginRight: spacing.sm,
  },

  actionButton: {
    // Ensure 44px touch target (Requirement 9.1)
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },

  actionText: {
    ...typography.labelMd,
    color: colors.text.inverse,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
