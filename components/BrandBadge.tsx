// A round, coloured badge for each device brand, so the brand grid is quick to
// scan. To use real brand artwork you have the rights to, put the file in
// assets/brands/ and add it to BRAND_IMAGES below; it then replaces the badge.
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native'
import { colors } from '@/constants/theme'

/** Optional artwork, e.g. samsung: require('@/assets/brands/samsung.png'). */
export const BRAND_IMAGES: Record<string, ImageSourcePropType> = {}

const BRAND_COLORS: Record<string, string> = {
  iphone: '#1d1d1f', macbook: '#1d1d1f', ipad: '#1d1d1f', imac: '#1d1d1f',
  samsung: '#1428a0', tecno: '#0a5cff', infinix: '#0b8a3e', itel: '#d7141a', redmi: '#ff6900',
  hp: '#0096d6', dell: '#007db8', lenovo: '#e2231a', asus: '#00539b', acer: '#5f8f12',
}

const OTHER_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  smartphone: 'phone-portrait-outline', laptop: 'laptop-outline', tablet: 'tablet-portrait-outline', desktop: 'desktop-outline',
}

/** One or two letters from the brand name: "iPhone" → "iP", "Redmi / Xiaomi" → "R", "HP" → "HP". */
export function brandInitials(label: string): string {
  const word = label.split(/[\s/]+/)[0] ?? ''
  if (/^[A-Z]{2,3}$/.test(word)) return word
  if (/^i[A-Z]/.test(word)) return word.slice(0, 2)
  return word.charAt(0).toUpperCase()
}

export function BrandBadge({ brand, label, deviceType, size = 52 }: {
  brand: string; label: string; deviceType: string; size?: number
}) {
  const box = { width: size, height: size, borderRadius: size / 2 }
  const image = BRAND_IMAGES[brand]
  if (image) {
    return <Image source={image} style={[box, styles.image]} resizeMode="contain" accessibilityIgnoresInvertColors testID={`brand-image-${brand}`} />
  }
  const color = BRAND_COLORS[brand]
  if (!color) {
    return (
      <View style={[box, styles.center, { backgroundColor: colors.primarySoft }]} testID={`brand-badge-${brand}`}>
        <Ionicons name={OTHER_ICON[deviceType] ?? 'hardware-chip-outline'} size={size * 0.5} color={colors.primary} />
      </View>
    )
  }
  const initials = brandInitials(label)
  return (
    <View style={[box, styles.center, { backgroundColor: color }]} testID={`brand-badge-${brand}`}>
      <Text style={[styles.text, { fontSize: size * (initials.length > 2 ? 0.3 : 0.38) }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  image: { backgroundColor: '#fff' },
  text: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
})
