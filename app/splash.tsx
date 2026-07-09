// Splash screen with UrbanFix branding
// Entry point that shows for 2.5 seconds before transitioning to login

import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native'
import { useRouter } from 'expo-router'

const { width } = Dimensions.get('window')

export default function SplashScreen() {
  const router = useRouter()

  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const fadeOut = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Start logo entrance animations
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start()

    // Start fade-out transition after 2.5 seconds
    const transitionTimer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Navigate to login screen after animation completes
        router.replace('/auth/login')
      })
    }, 2500)

    // Cleanup timer on unmount
    return () => {
      clearTimeout(transitionTimer)
    }
  }, [router, fadeOut, logoOpacity, logoScale, textOpacity])

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#031636"
        translucent={false}
      />
      <Animated.View
        testID="splash-screen-container"
        style={[styles.container, { opacity: fadeOut }]}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text style={styles.logoText}>UrbanFix</Text>
          <Animated.Text style={[styles.tagline, { opacity: textOpacity }]}>
            Trusted Mobile Repairs
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#031636', // Deep Trust Blue
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    width: width * 0.7,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: '#B0BEC5',
    letterSpacing: 0.5,
  },
})
