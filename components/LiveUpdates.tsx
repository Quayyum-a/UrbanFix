// Keeps "my repairs" fresh while the app is open and shows a short note at the
// top of the screen when something happens (new order, milestone, message).
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font, radius, shadow, spacing } from '@/constants/theme'
import { useLive } from '@/lib/live'
import type { LiveEvent } from '@/lib/liveEvents'
import { useSession } from '@/lib/session'

export const LIVE_POLL_MS = 8000
const TOAST_MS = 6000

export function LiveUpdates() {
  const status = useSession((s) => s.status)
  const role = useSession((s) => s.profile?.role ?? null)
  const setRole = useLive((s) => s.setRole)
  const load = useLive((s) => s.load)
  const reset = useLive((s) => s.reset)

  useEffect(() => {
    if (status !== 'ready' || !role) { reset(); return }
    setRole(role)
    void load()
    let timer: ReturnType<typeof setInterval> | null = setInterval(() => void load(), LIVE_POLL_MS)
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void load()
        if (!timer) timer = setInterval(() => void load(), LIVE_POLL_MS)
      } else if (timer) {
        clearInterval(timer); timer = null
      }
    })
    return () => { if (timer) clearInterval(timer); sub.remove() }
  }, [status, role, setRole, load, reset])

  return <Toast />
}

function Toast() {
  const toast = useLive((s) => s.toast)
  const dismiss = useLive((s) => s.dismissToast)
  const insets = useSafeAreaInsets()
  const [y] = useState(() => new Animated.Value(-160))

  useEffect(() => {
    if (!toast) return
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start()
    const t = setTimeout(() => {
      Animated.timing(y, { toValue: -160, duration: 200, useNativeDriver: true }).start(() => dismiss())
    }, TOAST_MS)
    return () => clearTimeout(t)
  }, [toast, y, dismiss])

  if (!toast) return null
  const open = (e: LiveEvent) => {
    dismiss()
    router.push(e.kind === 'message' ? `/job/${e.jobId}/chat` : `/job/${e.jobId}`)
  }
  const icon = toast.kind === 'new_order' ? 'flash' : toast.kind === 'message' ? 'chatbubble-ellipses' : 'checkmark-circle'
  const tint = toast.kind === 'new_order' ? colors.accent : toast.kind === 'message' ? colors.danger : colors.success

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.sm, transform: [{ translateY: y }] }]}>
      <Pressable onPress={() => open(toast)} style={styles.toast} accessibilityRole="button"
        accessibilityLabel={`${toast.title}. ${toast.text}`} accessibilityLiveRegion="assertive" testID="live-toast">
        <View style={[styles.icon, { backgroundColor: tint }]}>
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={font.bodyStrong} numberOfLines={1}>{toast.title}</Text>
          <Text style={font.small} numberOfLines={2}>{toast.text}</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={12} accessibilityLabel="Dismiss" testID="live-toast-close">
          <Ionicons name="close" size={20} color={colors.textFaint} />
        </Pressable>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 1000, elevation: 20 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
})
