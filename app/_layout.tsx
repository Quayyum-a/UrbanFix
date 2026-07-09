// Root application layout with authentication initialization
// Sets up auth context, route guarding, and global navigation config
//
// Task 10.2 — Screen transitions and stack navigation:
//   - slide_from_right  (300ms) for standard push transitions
//   - slide_from_bottom (300ms) for modal screens (OTP/profile-setup)
//   - Deep Trust Blue (#031636) header background
//   - Deep link handling via expo-router's built-in Linking config
//
// Task 10.4 — Navigation state persistence:
//   - Saves current route to AsyncStorage when app backgrounds
//   - Restores last route on foreground when user is authenticated
//   - Only restores customer/technician routes (never auth routes)
//   - Saved state expires after 24 hours

import React, { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthGuard } from '@/components/auth'
import { useAuthStore } from '@/stores/authStore'
import { useNavigationPersistence } from '@/hooks/useNavigationPersistence'
import { colors, animations } from '@/constants/theme'

/**
 * Header style shared across all stack screens that show a header.
 * Uses Deep Trust Blue as background with white text/icons.
 */
const HEADER_STYLE = {
  headerStyle: {
    backgroundColor: colors.primary, // Deep Trust Blue #031636
  },
  headerTintColor: colors.onPrimary,  // White back button and title
  headerTitleStyle: {
    color: colors.onPrimary,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  headerBackTitleVisible: false,      // iOS: hide back-button label
  headerShadowVisible: false,         // Flat, modern look
}

/**
 * Standard push transition — slides new screen in from the right.
 * 300ms matches the design spec animation duration.
 */
const SLIDE_FROM_RIGHT = {
  animation: 'slide_from_right' as const,
  animationDuration: animations.normal, // 300ms
}

/**
 * Modal transition — slides new screen in from the bottom.
 * Used for OTP verification and profile setup overlays.
 */
const SLIDE_FROM_BOTTOM = {
  animation: 'slide_from_bottom' as const,
  animationDuration: animations.normal, // 300ms
}

export default function RootLayout() {
  const initialize = useAuthStore(state => state.initialize)
  const initialized = useAuthStore(state => state.initialized)
  const user = useAuthStore(state => state.user)
  const userProfile = useAuthStore(state => state.userProfile)
  const router = useRouter()
  const { savedRoute, clearSavedRoute } = useNavigationPersistence()

  // Initialize authentication on app startup
  useEffect(() => {
    console.log('RootLayout: Initializing auth...')
    initialize().then(() => {
      console.log('RootLayout: Auth initialized successfully')
    }).catch((error) => {
      console.error('RootLayout: Auth initialization failed:', error)
    })
  }, [])

  // Restore last navigation state once auth is confirmed
  useEffect(() => {
    if (!initialized || !user || !userProfile || !savedRoute) return

    console.log('RootLayout: Restoring saved route:', savedRoute)
    clearSavedRoute().then(() => {
      router.replace(savedRoute as Parameters<typeof router.replace>[0])
    }).catch((error) => {
      console.error('RootLayout: Failed to restore saved route:', error)
    })
  }, [initialized, user, userProfile, savedRoute])

  return (
    <AuthGuard>
      <Stack
        screenOptions={{
          // Global default: hide header (tabs and entry screens manage their own)
          headerShown: false,
          // Default slide-from-right for all stack pushes
          ...SLIDE_FROM_RIGHT,
          // Gesture-based back navigation (iOS swipe back)
          gestureEnabled: Platform.OS === 'ios',
          gestureDirection: 'horizontal',
          // Full-screen mode, no transparent backgrounds
          presentation: 'card',
        }}
      >
        {/* Entry point — no transition, instant display */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            animation: 'none',
          }}
        />

        {/* Splash screen — fades in from entry point */}
        <Stack.Screen
          name="splash"
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: animations.slow, // 500ms for splash reveal
          }}
        />

        {/* Auth flow — slides from right as a standard screen push */}
        <Stack.Screen
          name="auth/login"
          options={{
            headerShown: false,
            ...SLIDE_FROM_RIGHT,
          }}
        />

        {/* Location permission — modal from bottom after profile setup */}
        <Stack.Screen
          name="auth/location-permission"
          options={{
            headerShown: true,
            title: 'Enable Location',
            ...HEADER_STYLE,
            ...SLIDE_FROM_BOTTOM,
            presentation: 'modal',
          }}
        />

        {/* Customer tab group — no animation entering tabs */}
        <Stack.Screen
          name="customer"
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: animations.fast, // 150ms — snappy tab reveal
          }}
        />

        {/* Technician tab group — no animation entering tabs */}
        <Stack.Screen
          name="technician"
          options={{
            headerShown: false,
            animation: 'fade',
            animationDuration: animations.fast, // 150ms — snappy tab reveal
          }}
        />
      </Stack>

      {/* StatusBar: light content on Deep Trust Blue backgrounds */}
      <StatusBar style="light" />
    </AuthGuard>
  )
}
