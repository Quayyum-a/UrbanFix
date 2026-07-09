import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius, spacing } from '@/constants/theme'

// ─── SkeletonLine ─────────────────────────────────────────────────────────────

interface SkeletonLineProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

/**
 * A single shimmer line — the atomic skeleton building block.
 *
 * Requirements: 7.5, 8.4
 */
export function SkeletonLine({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonLineProps) {
  const shimmer = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [shimmer])

  // useNativeDriver: true requires opacity instead of backgroundColor interpolation
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  })

  return (
    <Animated.View
      style={[
        styles.line,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  )
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

/**
 * Generic card-shaped skeleton with 3 lines.
 *
 * Requirements: 7.5
 */
export function SkeletonCard() {
  return (
    <View style={styles.card} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SkeletonLine width="70%" height={18} />
      <SkeletonLine width="50%" height={14} style={styles.gap8} />
      <SkeletonLine width="90%" height={14} style={styles.gap8} />
    </View>
  )
}

// ─── SkeletonTechnicianCard ───────────────────────────────────────────────────

/**
 * Skeleton matching TechnicianCard layout: avatar circle + 2 info lines.
 *
 * Requirements: 7.5
 */
export function SkeletonTechnicianCard() {
  return (
    <View style={styles.card} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.row}>
        {/* Avatar circle */}
        <SkeletonLine width={48} height={48} borderRadius={radius.full} />
        {/* Name + rating lines */}
        <View style={styles.techInfoColumn}>
          <SkeletonLine width="60%" height={16} />
          <SkeletonLine width="40%" height={13} style={styles.gap8} />
        </View>
        {/* Price block */}
        <View style={styles.priceBlock}>
          <SkeletonLine width={56} height={12} />
          <SkeletonLine width={56} height={16} style={styles.gap6} />
        </View>
      </View>
      {/* Specialty tags row */}
      <View style={[styles.row, styles.gap12]}>
        <SkeletonLine width={64} height={22} borderRadius={radius.full} />
        <SkeletonLine width={80} height={22} borderRadius={radius.full} style={styles.marginLeft8} />
      </View>
    </View>
  )
}

// ─── SkeletonJobCard ──────────────────────────────────────────────────────────

/**
 * Skeleton matching JobCard layout: device icon + 3 text lines.
 *
 * Requirements: 7.5
 */
export function SkeletonJobCard() {
  return (
    <View style={styles.card} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Header row: icon + device name + status badge */}
      <View style={[styles.row, styles.spaceBetween]}>
        <View style={styles.row}>
          <SkeletonLine width={32} height={32} borderRadius={radius.md} />
          <View style={styles.deviceInfoColumn}>
            <SkeletonLine width={120} height={16} />
            <SkeletonLine width={80} height={13} style={styles.gap6} />
          </View>
        </View>
        <SkeletonLine width={64} height={22} borderRadius={radius.full} />
      </View>
      {/* Footer row: price + date */}
      <View style={[styles.row, styles.spaceBetween, styles.gap12]}>
        <View>
          <SkeletonLine width={48} height={12} />
          <SkeletonLine width={80} height={16} style={styles.gap6} />
        </View>
        <SkeletonLine width={64} height={12} />
      </View>
    </View>
  )
}

// ─── LoadingSkeleton (default export kept for backward compat) ────────────────

interface LoadingSkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

/**
 * @deprecated Use SkeletonLine instead.
 * Kept for backward compatibility.
 */
export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.sm,
  style,
}: LoadingSkeletonProps) {
  return <SkeletonLine width={width} height={height} borderRadius={borderRadius} style={style} />
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors.surfaceContainerHighest,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  spaceBetween: {
    justifyContent: 'space-between',
  },

  techInfoColumn: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },

  priceBlock: {
    alignItems: 'flex-end',
  },

  deviceInfoColumn: {
    marginLeft: spacing.xs,
  },

  gap6: {
    marginTop: 6,
  },

  gap8: {
    marginTop: spacing.xs,
  },

  gap12: {
    marginTop: 12,
  },

  marginLeft8: {
    marginLeft: spacing.xs,
  },
})
