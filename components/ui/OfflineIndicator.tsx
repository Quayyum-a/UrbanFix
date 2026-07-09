/**
 * OfflineIndicator — animated banner that appears when the device is offline
 *
 * Requirements: 10.5, 11.3
 *
 * - Uses NetInfo from @react-native-community/netinfo to detect connectivity
 * - Positioned absolute at the top of the screen, full width, height 40px
 * - Background: colors.text.secondary (dark), white text
 * - "cloud-offline" Ionicons icon + "No internet connection" label
 * - Slides down from -40 to 0 when offline, slides back up when online
 * - accessibilityRole="alert", accessibilityLiveRegion="assertive"
 */

import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, animations } from '@/constants/theme'

// ─── Constants ────────────────────────────────────────────────────────────────

const BANNER_HEIGHT = 40

// ─── Component ────────────────────────────────────────────────────────────────

export function OfflineIndicator(): React.ReactElement {
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT)).current

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected

      Animated.timing(translateY, {
        toValue: isOffline ? 0 : -BANNER_HEIGHT,
        duration: animations.normal,
        useNativeDriver: true,
      }).start()
    })

    return () => {
      unsubscribe()
    }
  }, [translateY])

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      pointerEvents="none"
    >
      <Ionicons
        name="cloud-offline"
        size={16}
        color={colors.text.inverse}
        style={styles.icon}
      />
      <Text style={styles.label}>No internet connection</Text>
    </Animated.View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    backgroundColor: colors.text.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  icon: {
    marginRight: spacing.xs / 2,
  },
  label: {
    ...typography.labelMd,
    color: colors.text.inverse,
  },
})
