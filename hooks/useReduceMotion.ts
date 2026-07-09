import { useState, useEffect } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Returns `true` when the user has enabled "Reduce Motion" in system settings.
 * When true, callers should use instant/zero-duration transitions instead of animated ones.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    // Check the initial value
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled)
    })

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotion(enabled)
      }
    )

    return () => {
      subscription.remove()
    }
  }, [])

  return reduceMotion
}
