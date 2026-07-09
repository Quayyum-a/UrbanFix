import React, { useCallback } from 'react'
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { deviceTypes, type DeviceType } from '@/constants/deviceTypes'
import { usePartsCatalogue } from '@/hooks/usePartsCatalogue'

export default function DeviceTypeScreen() {
  const { deviceType: paramDeviceType } = useLocalSearchParams()
  const { loading: brandsLoading, error: brandsError } = usePartsCatalogue()

  // If deviceType is passed as param, navigate directly to brand selection
  if (paramDeviceType && deviceTypes.includes(paramDeviceType as DeviceType)) {
    // Use setTimeout to avoid navigation during render
    setTimeout(() => {
      router.replace(`/customer/repair/brand?deviceType=${paramDeviceType}`)
    }, 0)
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const handleDeviceTypePress = useCallback((type: DeviceType) => {
    router.push(`/customer/repair/brand?deviceType=${type}`)
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>What needs fixing?</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>Select your device type to get started</Text>
      </View>

      <View style={styles.grid}>
        {deviceTypes.map((type) => {
          const config = DEVICE_TYPE_CONFIG[type]
          return (
            <TouchableOpacity
              key={type}
              style={[styles.card, config.color && styles[config.color as keyof typeof styles]]}
              onPress={() => handleDeviceTypePress(type)}
              activeOpacity={0.85}
              accessibilityLabel={`${config.label} repair`}
              accessibilityHint={`Tap to book a ${config.label.toLowerCase()} repair`}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.emoji}>{config.icon}</Text>
              </View>
              <Text style={styles.cardTitle}>{config.label}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {config.subtitle}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {brandsError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{brandsError}</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

// Device type configuration
const DEVICE_TYPE_CONFIG: Record<DeviceType, { icon: string; label: string; subtitle: string; color?: string }> = {
  smartphone: {
    icon: '📱',
    label: 'Phone',
    subtitle: 'iPhone, Samsung, Google Pixel, and more',
    color: 'cardPrimary',
  },
  laptop: {
    icon: '💻',
    label: 'Laptop',
    subtitle: 'MacBook, Dell, HP, Lenovo, and more',
    color: 'cardSecondary',
  },
  tablet: {
    icon: '📑',
    label: 'Tablet',
    subtitle: 'iPad, Galaxy Tab, and more',
    color: 'cardTertiary',
  },
  desktop: {
    icon: '🖥️',
    label: 'Desktop',
    subtitle: 'Custom builds, all-in-ones, workstations',
    color: 'cardQuaternary',
  },
  other: {
    icon: '🔧',
    label: 'Other',
    subtitle: 'Gaming consoles, wearables, and more',
    color: 'cardQuinary',
  },
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: 48, // Balance the back button
  },
  headerSpacer: {
    width: 48,
  },
  subtitleContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  grid: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.level2,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cardPrimary: {
    borderColor: colors.primary,
  },
  cardSecondary: {
    borderColor: colors.secondary,
  },
  cardTertiary: {
    borderColor: colors.tertiary,
  },
  cardQuaternary: {
    borderColor: colors.quaternary,
  },
  cardQuinary: {
    borderColor: colors.outline,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emoji: {
    fontSize: 32,
  },
  cardTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyLg,
    color: colors.text.secondary,
  },
  errorContainer: {
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
})