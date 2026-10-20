// On-screen number pad for the 6-digit PIN: no keyboard to open, submits
// automatically on the 6th digit.
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '@/constants/theme'
import { PIN_LENGTH } from '@/lib/validation'
import { tap } from './ui'

export function PinPad({ value, onChange, onComplete, busy, disabled }: {
  value: string
  onChange: (v: string) => void
  onComplete: (pin: string) => void
  busy?: boolean
  disabled?: boolean
}) {
  const press = (d: string) => {
    if (busy || disabled || value.length >= PIN_LENGTH) return
    tap()
    const next = value + d
    onChange(next)
    if (next.length === PIN_LENGTH) onComplete(next)
  }
  const back = () => {
    if (busy || disabled || !value) return
    tap()
    onChange(value.slice(0, -1))
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']
  return (
    <View>
      <View style={styles.dots} accessibilityLabel={`${value.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotOn]} />
        ))}
        {busy ? <ActivityIndicator style={{ marginLeft: spacing.md }} color={colors.primary} /> : null}
      </View>
      <View style={styles.grid}>
        {keys.map((k, i) => k === '' ? <View key={i} style={styles.key} /> : (
          <Pressable
            key={i}
            testID={`pin-${k}`}
            accessibilityRole="button"
            accessibilityLabel={k === 'del' ? 'Delete' : k}
            onPress={() => (k === 'del' ? back() : press(k))}
            style={({ pressed }) => [styles.key, styles.keyOn, pressed && { backgroundColor: colors.primarySoft }]}
          >
            {k === 'del' ? <Ionicons name="backspace-outline" size={26} color={colors.text} />
              : <Text style={[font.title, { fontWeight: '600' }]}>{k}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary },
  dotOn: { backgroundColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  key: { width: '31%', height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  keyOn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
})
