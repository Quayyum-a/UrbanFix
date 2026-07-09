import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  ImageProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SkeletonLine } from './LoadingSkeleton'
import { colors } from '@/constants/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OptimizedImageProps extends ImageProps {
  /**
   * Ionicons icon name to show when the image fails to load.
   * @default 'image-outline'
   */
  fallbackIcon?: string
  /**
   * Whether to show a SkeletonLine placeholder while the image loads.
   * @default true
   */
  showSkeleton?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for RN Image with:
 * - SkeletonLine placeholder during loading
 * - Fade-in animation on load completion
 * - Fallback Ionicons icon on error
 *
 * Requirements: 12.1, 12.2, 12.4, 12.5
 */
export function OptimizedImage({
  fallbackIcon = 'image-outline',
  showSkeleton = true,
  style,
  onLoad,
  onError,
  ...imageProps
}: OptimizedImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Extract numeric width/height from style for the skeleton placeholder
  const flatStyle = StyleSheet.flatten(style) as ViewStyle | undefined
  const width = flatStyle?.width as number | string | undefined
  const height = (flatStyle?.height as number | undefined) ?? 48

  useEffect(() => {
    if (status === 'loaded') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [status, fadeAnim])

  const handleLoad: ImageProps['onLoad'] = event => {
    setStatus('loaded')
    onLoad?.(event)
  }

  const handleError: ImageProps['onError'] = event => {
    setStatus('error')
    onError?.(event)
  }

  if (status === 'error') {
    return (
      <View
        style={[styles.container, style as ViewStyle, styles.fallbackContainer]}
        accessible
        accessibilityLabel="Image unavailable"
      >
        <Ionicons
          name={fallbackIcon as 'image-outline'}
          size={Math.min(Number(height) * 0.5, 32)}
          color={colors.text.secondary}
        />
      </View>
    )
  }

  return (
    <View style={[styles.container, style as ViewStyle]}>
      {/* Skeleton placeholder — visible while loading */}
      {showSkeleton && status === 'loading' && (
        <SkeletonLine
          width={width ?? '100%'}
          height={height}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {/* Image fades in when loaded */}
      <Animated.Image
        {...imageProps}
        style={[style, { opacity: fadeAnim }]}
        onLoad={handleLoad}
        onError={handleError}
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHighest,
  },
})
