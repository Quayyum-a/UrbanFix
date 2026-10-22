// Phone vibration for things worth noticing. Never throws.
import * as Haptics from 'expo-haptics'
import { Platform, Vibration } from 'react-native'
import type { LiveKind } from './liveEvents'

export function buzz(kind: LiveKind) {
  try {
    if (kind === 'new_order') {
      // Long double buzz: hard to miss while working on another phone.
      if (Platform.OS === 'android') Vibration.vibrate([0, 450, 200, 450])
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
    } else if (kind === 'milestone') {
      if (Platform.OS === 'android') Vibration.vibrate(300)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    }
  } catch {
    // Vibration is a nice-to-have.
  }
}
