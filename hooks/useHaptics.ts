/**
 * Centralized haptics utility hook.
 *
 * Requirements: 8.1, 8.3, 8.4
 *
 * Wraps expo-haptics with graceful no-op fallback for devices that
 * don't support haptic feedback (simulator, older Android, etc.).
 */

import * as Haptics from 'expo-haptics'

export type HapticImpactStyle = 'light' | 'medium' | 'heavy'
export type HapticNotificationType = 'success' | 'warning' | 'error'

export interface UseHapticsReturn {
  /** Physical impact feedback — use for button presses and confirmations */
  impact: (style?: HapticImpactStyle) => void
  /** Selection feedback — use for list selections, toggles, and navigating options */
  selection: () => void
  /** Notification feedback — use for success, warning, and error outcomes */
  notification: (type?: HapticNotificationType) => void
}

const IMPACT_STYLE_MAP: Record<HapticImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
}

const NOTIFICATION_TYPE_MAP: Record<HapticNotificationType, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
}

export function useHaptics(): UseHapticsReturn {
  const impact = (style: HapticImpactStyle = 'medium'): void => {
    try {
      Haptics.impactAsync(IMPACT_STYLE_MAP[style])
    } catch {
      // Haptics not supported on this device — silently no-op
    }
  }

  const selection = (): void => {
    try {
      Haptics.selectionAsync()
    } catch {
      // Haptics not supported on this device — silently no-op
    }
  }

  const notification = (type: HapticNotificationType = 'success'): void => {
    try {
      Haptics.notificationAsync(NOTIFICATION_TYPE_MAP[type])
    } catch {
      // Haptics not supported on this device — silently no-op
    }
  }

  return { impact, selection, notification }
}
