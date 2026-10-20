import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import React from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, View, type TextInputProps, type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, font, radius, shadow, spacing, TOUCH } from '@/constants/theme'
import type { Tone } from '@/lib/jobFlow'

export function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

// ---------------------------------------------------------------- layout
export function Screen({ children, scroll = true, refreshing, onRefresh, footer, edges }: {
  children: React.ReactNode
  scroll?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  footer?: React.ReactNode
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
}) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, { flex: 1 }]}>{children}</View>
  )
  return (
    <SafeAreaView style={styles.safe} edges={edges ?? ['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={font.title} accessibilityRole="header">{children}</Text>
      {sub ? <Text style={[font.body, { color: colors.textMuted, marginTop: spacing.xs }]}>{sub}</Text> : null}
    </View>
  )
}

export function Heading({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <Text style={[font.heading, { marginTop: spacing.lg, marginBottom: spacing.sm }, style]} accessibilityRole="header">{children}</Text>
}

export function P({ children, muted, strong, center, style }: {
  children: React.ReactNode; muted?: boolean; strong?: boolean; center?: boolean; style?: object
}) {
  return (
    <Text style={[strong ? font.bodyStrong : font.body, muted && { color: colors.textMuted }, center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  )
}

export function Small({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[font.small, style]}>{children}</Text>
}

export function Card({ children, style, onPress, accessibilityLabel, testID }: {
  children: React.ReactNode; style?: ViewStyle; onPress?: () => void; accessibilityLabel?: string; testID?: string
}) {
  if (!onPress) return <View style={[styles.card, style]} testID={testID}>{children}</View>
  return (
    <Pressable
      testID={testID}
      onPress={() => { tap(); onPress() }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  )
}

export function Row({ label, value, onPress }: { label: string; value: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={[font.small, { flex: 1 }]}>{label}</Text>
      <Text style={[font.bodyStrong, { flex: 1.4, textAlign: 'right' }]} selectable>{value}</Text>
    </Pressable>
  )
}

// ---------------------------------------------------------------- controls
type ButtonKind = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost'

export function Button({ title, onPress, kind = 'primary', loading, disabled, icon, testID, style }: {
  title: string
  onPress: () => void
  kind?: ButtonKind
  loading?: boolean
  disabled?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  testID?: string
  style?: ViewStyle
}) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    accent: { bg: colors.accent, fg: '#fff', border: colors.accent },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.border },
    danger: { bg: colors.surface, fg: colors.danger, border: colors.dangerSoft },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[kind]
  const off = disabled || loading
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => { tap(); onPress() }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        off && { opacity: 0.5 },
        pressed && !off && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon ? <Ionicons name={icon} size={20} color={palette.fg} /> : null}
          <Text style={[font.bodyStrong, { color: palette.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  )
}

export function Field({ label, error, hint, style, ...props }: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[font.label, { marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.md }, error ? { borderColor: colors.danger } : null, style]}
        {...props}
      />
      {error ? <Text style={[font.small, { color: colors.danger, marginTop: spacing.xs }]} accessibilityLiveRegion="polite">{error}</Text>
        : hint ? <Text style={[font.small, { marginTop: spacing.xs }]}>{hint}</Text> : null}
    </View>
  )
}

export function Chips<T extends string>({ options, value, onChange, label, testID }: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  label?: string
  testID?: string
}) {
  return (
    <View style={{ marginBottom: spacing.lg }} testID={testID}>
      {label ? <Text style={[font.label, { marginBottom: spacing.xs }]}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((o) => {
          const on = o.value === value
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              onPress={() => { tap(); onChange(o.value) }}
              style={[styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[font.bodyStrong, { fontSize: 15, color: on ? colors.onPrimary : colors.text }]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function Choice({ title, subtitle, icon, selected, onPress, testID }: {
  title: string; subtitle?: string; icon?: keyof typeof Ionicons.glyphMap; selected?: boolean; onPress: () => void; testID?: string
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => { tap(); onPress() }}
      style={({ pressed }) => [styles.choice, selected && { borderColor: colors.primary, backgroundColor: colors.primarySoft }, pressed && { opacity: 0.85 }]}
    >
      {icon ? <Ionicons name={icon} size={26} color={colors.primary} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={font.bodyStrong}>{title}</Text>
        {subtitle ? <Text style={font.small}>{subtitle}</Text> : null}
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={22} color={selected ? colors.primary : colors.textFaint} />
    </Pressable>
  )
}

// ---------------------------------------------------------------- feedback
export function Pill({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const t = {
    neutral: [colors.border, colors.textMuted],
    action: [colors.accentSoft, colors.accent],
    good: [colors.successSoft, colors.success],
    warn: [colors.warningSoft, colors.warning],
    bad: [colors.dangerSoft, colors.danger],
  }[tone]
  return (
    <View style={[styles.pill, { backgroundColor: t[0] }]}>
      <Text style={[font.label, { color: t[1] }]}>{text}</Text>
    </View>
  )
}

export function Banner({ text, tone = 'warn', icon }: { text: string; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = {
    neutral: [colors.primarySoft, colors.primary],
    action: [colors.accentSoft, colors.accent],
    good: [colors.successSoft, colors.success],
    warn: [colors.warningSoft, colors.warning],
    bad: [colors.dangerSoft, colors.danger],
  }[tone]
  return (
    <View style={[styles.banner, { backgroundColor: t[0] }]} accessibilityLiveRegion="polite">
      <Ionicons name={icon ?? (tone === 'bad' ? 'alert-circle' : tone === 'good' ? 'checkmark-circle' : 'information-circle')} size={20} color={t[1]} />
      <Text style={[font.body, { color: colors.text, flex: 1 }]}>{text}</Text>
    </View>
  )
}

export function ErrorText({ error }: { error: string | null | undefined }) {
  if (!error) return null
  return <Banner text={error} tone="bad" />
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Small style={{ marginTop: spacing.md }}>{label}</Small> : null}
    </View>
  )
}

export function Empty({ icon = 'file-tray-outline', title, text, action }: {
  icon?: keyof typeof Ionicons.glyphMap; title: string; text?: string; action?: React.ReactNode
}) {
  return (
    <View style={[styles.center, { paddingVertical: spacing.xxl }]}>
      <Ionicons name={icon} size={44} color={colors.textFaint} />
      <P strong center style={{ marginTop: spacing.md }}>{title}</P>
      {text ? <P muted center style={{ marginTop: spacing.xs }}>{text}</P> : null}
      {action ? <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  )
}

export function Stars({ value, onChange, size = 34 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole={onChange ? 'adjustable' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          onPress={() => { tap(); onChange?.(n) }}
          accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
          hitSlop={6}
        >
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? '#F5A623' : colors.textFaint} />
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  footer: { padding: spacing.lg, paddingTop: spacing.sm, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  button: { minHeight: TOUCH + 6, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  input: { minHeight: TOUCH + 4, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, ...font.body },
  chip: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: spacing.sm, minHeight: 64 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  banner: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, alignItems: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
})
