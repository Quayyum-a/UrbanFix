// Responsive utility functions — usable outside of React components
// Base design width is 375px (iPhone standard)

import { Dimensions, PixelRatio } from 'react-native'

const BASE_WIDTH = 375
const TABLET_BREAKPOINT = 768
const SMALL_PHONE_BREAKPOINT = 375
const MAX_FONT_SCALE_MULTIPLIER = 1.3

function getWindowWidth(): number {
  return Dimensions.get('window').width
}

/**
 * Scale a size linearly relative to the 375px base width.
 * e.g. scale(16) on a 414px screen → ~17.7
 */
export function scale(size: number): number {
  const width = getWindowWidth()
  return (width / BASE_WIDTH) * size
}

/**
 * Scale a font size, but cap system font scaling at MAX_FONT_SCALE_MULTIPLIER (1.3×).
 * This prevents oversized text on accessibility-heavy font settings.
 */
export function scaleFont(size: number): number {
  const fontScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE_MULTIPLIER)
  return Math.round(size * fontScale)
}

/**
 * Return a value based on the current screen width:
 * - small  : width < 375  (iPhone SE / compact phones)
 * - normal : 375 <= width < 768 (standard phones)
 * - large  : width >= 768 (tablets) — falls back to normal if not provided
 */
export function responsive<T>(small: T, normal: T, large?: T): T {
  const width = getWindowWidth()
  if (width >= TABLET_BREAKPOINT) {
    return large !== undefined ? large : normal
  }
  if (width < SMALL_PHONE_BREAKPOINT) {
    return small
  }
  return normal
}

/**
 * Clamp a numeric value between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
