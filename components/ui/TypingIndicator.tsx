/**
 * Animated three-dot typing indicator for the chat system.
 *
 * Requirements: 8.3, 8.4
 *
 * Three dots animate up/down in staggered sequence (150ms apart) using
 * Animated.loop + Animated.sequence. The entire indicator fades in/out
 * based on the `visible` prop.
 */

import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { colors, animations } from '@/constants/theme'

const DOT_SIZE = 8
const DOT_GAP = 4
const DOT_STAGGER_MS = 150
const BOUNCE_HEIGHT = 6
const BOUNCE_DURATION = 400

export interface TypingIndicatorProps {
  /** When true the indicator fades in and dots animate; when false it fades out */
  visible: boolean
}

/**
 * TypingIndicator
 *
 * Renders three dots that bounce in sequence to indicate the other party
 * is composing a message. Fades in/out gracefully with `visible`.
 */
export function TypingIndicator({ visible }: TypingIndicatorProps) {
  // Opacity for the whole indicator
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current

  // Individual bounce animations for each dot
  const dot1Anim = useRef(new Animated.Value(0)).current
  const dot2Anim = useRef(new Animated.Value(0)).current
  const dot3Anim = useRef(new Animated.Value(0)).current

  // Bounce loop ref so we can stop it
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: animations.fast, // 150ms
      useNativeDriver: true,
    }).start()
  }, [visible, fadeAnim])

  useEffect(() => {
    if (!visible) {
      if (bounceLoopRef.current) {
        bounceLoopRef.current.stop()
        bounceLoopRef.current = null
      }
      // Reset dot positions when hidden
      dot1Anim.setValue(0)
      dot2Anim.setValue(0)
      dot3Anim.setValue(0)
      return
    }

    const makeBounce = (anim: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: -BOUNCE_HEIGHT,
          duration: BOUNCE_DURATION / 2,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: BOUNCE_DURATION / 2,
          useNativeDriver: true,
        }),
        // Pause at bottom before next cycle
        Animated.delay(DOT_STAGGER_MS * 2),
      ])

    bounceLoopRef.current = Animated.loop(
      Animated.parallel([
        makeBounce(dot1Anim, 0),
        makeBounce(dot2Anim, DOT_STAGGER_MS),
        makeBounce(dot3Anim, DOT_STAGGER_MS * 2),
      ]),
    )
    bounceLoopRef.current.start()

    return () => {
      if (bounceLoopRef.current) {
        bounceLoopRef.current.stop()
        bounceLoopRef.current = null
      }
    }
  }, [visible, dot1Anim, dot2Anim, dot3Anim])

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      accessibilityLabel="Typing"
      accessibilityRole="progressbar"
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {([dot1Anim, dot2Anim, dot3Anim] as Animated.Value[]).map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            { transform: [{ translateY: anim }] },
            index > 0 && { marginLeft: DOT_GAP },
          ]}
        />
      ))}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure the component has a minimum touch-friendly height
    minHeight: 44,
    paddingHorizontal: 12,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.text.secondary,
  },
})
