// Splash screen with animated UrbanFix logo reveal
// Entry point that shows for 2.5 seconds before transitioning to login

import React, { useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native'
import { useRouter } from 'expo-router'
import { colors, spacing, typography } from '@/constants/theme'

const { width, height } = Dimensions.get('window')

export default function SplashScreen() {
  const router = useRouter()
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const logoTranslateY = useRef(new Animated.Value(50)).current
  const fadeOut = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Start the logo reveal animation
    const revealAnimation = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ])

    // Start fade-slide transition after 3 seconds
    const transitionTimer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Navigate to login screen after animation completes
        router.replace('/auth/login')
      })
    }, 3000) // 3 seconds display time

    // Start the reveal animation
    revealAnimation.start()

    // Cleanup timer on unmount
    return () => clearTimeout(transitionTimer)
  }, [router, logoOpacity, logoScale, logoTranslateY, fadeOut])

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={colors.primary}
        translucent={false}
      />
      <Animated.View 
        testID="splash-screen-container"
        style={[
          styles.container,
          {
            opacity: fadeOut
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logo,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateY }
                ]
              }
            ]}
          >
            {/* UrbanFix Logo */}
            <Animated.Text style={styles.logoText}>
              UrbanFix
            </Animated.Text>
            <Animated.Text style={styles.taglineText}>
              Trusted Mobile Repairs
            </Animated.Text>
          </Animated.View>
        </View>

        {/* Bottom brand indicator */}
        <View style={styles.brandContainer}>
          <View style={styles.brandIndicator} />
        </View>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, // Deep Trust Blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
  },
  logo: {
    alignItems: 'center',
  },
  logoText: {
    ...typography.displayLg,
    fontSize: 42,
    color: colors.onPrimary, // White text
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  taglineText: {
    ...typography.bodyLg,
    color: colors.onPrimaryContainer, // Light blue text
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  brandContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    alignItems: 'center',
  },
  brandIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.secondary, // Emergency Orange
    borderRadius: 2,
  },
})