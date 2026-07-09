import { useState, useEffect } from 'react'
import { AccessibilityInfo, AccessibilityChangeEventName } from 'react-native'

export interface UseAccessibilityReturn {
  /** Whether a screen reader (VoiceOver / TalkBack) is currently active. */
  isScreenReaderEnabled: boolean
  /** Whether bold text is enabled (iOS only; always false on Android). */
  isBoldTextEnabled: boolean
  /** Whether the user has requested reduced motion. */
  reduceMotionEnabled: boolean
}

/**
 * useAccessibility subscribes to the device accessibility settings that are most
 * relevant to UI rendering decisions.
 *
 * - `isScreenReaderEnabled` — true when VoiceOver (iOS) or TalkBack (Android) is on.
 * - `isBoldTextEnabled`     — true when Bold Text is enabled in iOS Settings.
 *                             Always false on Android (unsupported).
 * - `reduceMotionEnabled`   — true when Reduce Motion is enabled in system settings.
 *
 * All values are read once on mount and kept in sync via AccessibilityInfo event
 * listeners, which are cleaned up when the component unmounts.
 */
export function useAccessibility(): UseAccessibilityReturn {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false)
  const [isBoldTextEnabled, setIsBoldTextEnabled] = useState(false)
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false)

  useEffect(() => {
    // Read initial values
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled)
    AccessibilityInfo.isBoldTextEnabled().then(setIsBoldTextEnabled)
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled)

    // Subscribe to changes
    const screenReaderSub = AccessibilityInfo.addEventListener(
      'screenReaderChanged' as AccessibilityChangeEventName,
      setIsScreenReaderEnabled,
    )
    const boldTextSub = AccessibilityInfo.addEventListener(
      'boldTextChanged' as AccessibilityChangeEventName,
      setIsBoldTextEnabled,
    )
    const reduceMotionSub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged' as AccessibilityChangeEventName,
      setReduceMotionEnabled,
    )

    return () => {
      screenReaderSub.remove()
      boldTextSub.remove()
      reduceMotionSub.remove()
    }
  }, [])

  return {
    isScreenReaderEnabled,
    isBoldTextEnabled,
    reduceMotionEnabled,
  }
}
