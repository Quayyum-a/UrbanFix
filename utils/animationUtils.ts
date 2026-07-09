import { Animated, Easing } from 'react-native'

/**
 * Standard easing curves matching the UrbanFix design spec.
 * Based on Material Design motion guidelines.
 */
export const easings = {
  /** General purpose — elements moving within screen */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Elements entering the screen */
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  /** Elements leaving the screen */
  accelerate: Easing.bezier(0.3, 0, 1, 0.8),
  /** Quick, snappy transitions */
  sharp: Easing.bezier(0.4, 0, 0.6, 1),
}

/**
 * Returns a spring animation config that respects the "Reduce Motion"
 * accessibility setting.  When reduce motion is enabled, the spring
 * uses a very high speed (instant) with no oscillation.
 */
export function springConfig(
  reduceMotion: boolean
): Omit<Animated.SpringAnimationConfig, 'toValue'> {
  if (reduceMotion) {
    return {
      useNativeDriver: true,
      speed: 1000,
      bounciness: 0,
    }
  }

  return {
    useNativeDriver: true,
    speed: 12,
    bounciness: 8,
  }
}

/**
 * Returns a timing animation config that respects the "Reduce Motion"
 * accessibility setting.  When reduce motion is enabled, duration is set
 * to 0 so transitions are instantaneous.
 */
export function timingConfig(
  duration: number,
  reduceMotion: boolean,
  easing: (t: number) => number = easings.standard
): Omit<Animated.TimingAnimationConfig, 'toValue'> {
  return {
    duration: reduceMotion ? 0 : duration,
    easing,
    useNativeDriver: true,
  }
}
