// useResponsive — tracks screen dimensions, device class, orientation,
// and provides safe-spacing helpers that update on device rotation.

import { useState, useEffect } from 'react'
import { Dimensions, PixelRatio, type ScaledSize } from 'react-native'

const SMALL_PHONE_MAX = 375   // exclusive upper bound for "small phone"
const TABLET_MIN = 768        // inclusive lower bound for "tablet"

export interface UseResponsiveReturn {
  /** Current window width in logical pixels */
  width: number
  /** Current window height in logical pixels */
  height: number
  /** Width < 375 (e.g. iPhone SE 1st gen) */
  isSmallPhone: boolean
  /** 375 <= width < 768 (standard phones) */
  isPhone: boolean
  /** width >= 768 (iPads, large Android tablets) */
  isTablet: boolean
  /** height > width */
  isPortrait: boolean
  /** width >= height */
  isLandscape: boolean
  /** Horizontal content padding: 16 (small) | 24 (normal) | 32 (tablet) */
  horizontalPadding: number
  /** Max content width: full width on phones, capped at 600 on tablets */
  contentMaxWidth: number
  /** System font scale factor from PixelRatio */
  fontScale: number
}

function buildState(dims: ScaledSize): UseResponsiveReturn {
  const { width, height } = dims

  const isSmallPhone = width < SMALL_PHONE_MAX
  const isTablet = width >= TABLET_MIN
  const isPhone = !isSmallPhone && !isTablet

  const isPortrait = height > width
  const isLandscape = width >= height

  const horizontalPadding = isTablet ? 32 : isSmallPhone ? 16 : 24
  const contentMaxWidth = isTablet ? Math.min(width, 600) : width

  const fontScale = PixelRatio.getFontScale()

  return {
    width,
    height,
    isSmallPhone,
    isPhone,
    isTablet,
    isPortrait,
    isLandscape,
    horizontalPadding,
    contentMaxWidth,
    fontScale,
  }
}

export function useResponsive(): UseResponsiveReturn {
  const [state, setState] = useState<UseResponsiveReturn>(() =>
    buildState(Dimensions.get('window'))
  )

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setState(buildState(window))
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return state
}
