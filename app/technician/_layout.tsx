// Technician bottom tab navigation layout
// 4 tabs: Dashboard, Jobs, Messages, Profile
// Mirrors the customer layout pattern with role-appropriate tabs
// Only shows tabs for verified technicians

import React, { useEffect, useState } from 'react'
import { Platform, Pressable, View, ActivityIndicator } from 'react-native'
import { Tabs, useRouter, useSegments } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, touchTargets } from '@/constants/theme'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// Tab configuration for technician role
const TAB_CONFIG = [
  {
    name: 'index',
    label: 'Dashboard',
    icon: 'grid-outline' as const,
    activeIcon: 'grid' as const,
  },
  {
    name: 'jobs',
    label: 'Jobs',
    icon: 'construct-outline' as const,
    activeIcon: 'construct' as const,
  },
  {
    name: 'pricing',
    label: 'Pricing',
    icon: 'pricetag-outline' as const,
    activeIcon: 'pricetag' as const,
  },
  {
    name: 'jobs/index',
    label: 'Jobs',
    icon: 'briefcase-outline' as const,
    activeIcon: 'briefcase' as const,
  },
  {
    name: 'part-requests',
    label: 'Parts',
    icon: 'cube-outline' as const,
    activeIcon: 'cube' as const,
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: 'chatbubble-outline' as const,
    activeIcon: 'chatbubble' as const,
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: 'person-outline' as const,
    activeIcon: 'person' as const,
  },
] as const

export default function TechnicianLayout() {
  const router = useRouter()
  const segments = useSegments()
  const userProfile = useAuthStore(state => state.userProfile)
  const [loading, setLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)

  useEffect(() => {
    checkVerificationStatus()
  }, [userProfile?.id])

  const checkVerificationStatus = async () => {
    console.log('TechnicianLayout: checkVerificationStatus - userProfile:', userProfile)

    if (!userProfile?.id) {
      console.log('TechnicianLayout: No userProfile, setting loading to false')
      setLoading(false)
      return
    }

    try {
      console.log('TechnicianLayout: Fetching technician profile for user:', userProfile.id)

      // Check if technician profile exists
      // For dev mode users (id starts with 'dev-user-'), query by phone instead
      const isDevMode = userProfile.id.startsWith('dev-user-')

      let query = supabase
        .from('technician_profiles')
        .select('verification_status')

      if (isDevMode) {
        console.log('TechnicianLayout: Dev mode detected, querying by phone:', userProfile.phone)
        // Join with users table to query by phone
        query = supabase
          .from('technician_profiles')
          .select('verification_status, user_id, users!inner(phone)')
          .eq('users.phone', userProfile.phone)
      } else {
        query = query.eq('user_id', userProfile.id)
      }

      // Add timeout to prevent hanging
      const queryPromise = query.single()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Technician profile query timeout')), 8000)
      })

      const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      console.log('TechnicianLayout: Profile query result:', { profile, error })

      if (error || !profile) {
        // No profile means technician needs to onboard
        console.log('TechnicianLayout: No technician profile found, redirecting to onboarding')
        setVerificationStatus(null)

        // Only redirect if not already on onboarding screen
        const isOnOnboarding = segments.includes('onboarding')
        console.log('TechnicianLayout: isOnOnboarding?', isOnOnboarding, 'segments:', segments)
        if (!isOnOnboarding) {
          router.replace('/technician/onboarding')
        }
      } else {
        console.log('TechnicianLayout: Setting verification status:', profile.verification_status)
        setVerificationStatus(profile.verification_status as any)

        // If pending or rejected, redirect to pending screen
        if (profile.verification_status !== 'approved') {
          console.log('TechnicianLayout: Verification status:', profile.verification_status, '- redirecting to pending screen')
          router.replace('/technician/verification-pending')
        }
      }
    } catch (error) {
      console.error('TechnicianLayout: Error checking verification:', error)
      // On error, default to not verified and redirect to onboarding
      setVerificationStatus(null)
      const isOnOnboarding = segments.includes('onboarding')
      if (!isOnOnboarding) {
        router.replace('/technician/onboarding')
      }
    } finally {
      console.log('TechnicianLayout: Setting loading to false')
      setLoading(false)
    }
  }

  const handleTabPress = () => {
    // Haptic feedback on tab press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  // If not verified, don't show tabs - just render children
  if (verificationStatus !== 'approved') {
    return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="onboarding" />
      <Tabs.Screen name="jobs" options={{ href: null }} />
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="part-requests" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        // Tab bar styling — Deep Trust Blue active color
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.outline,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.sm,
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.xs,
          elevation: 8,
          shadowColor: colors.primary,
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },

        tabBarItemStyle: {
          paddingVertical: spacing.xs / 2,
          minHeight: touchTargets.minSize,
        },

        tabBarLabelStyle: {
          ...typography.labelMd,
          fontSize: 10,
          marginTop: 2,
          fontWeight: '500',
        },

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,

        // Haptic feedback wrapper for each tab button
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tabBarButton: (props: any) => {
          const { children, onPress, ...restProps } = props
          return (
            <Pressable
              {...restProps}
              onPress={(e) => {
                handleTabPress()
                onPress?.(e)
              }}
            >
              {children}
            </Pressable>
          )
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={size || 24}
              color={focused ? colors.primary : colors.text.secondary}
            />
          ),
          tabBarAccessibilityLabel: 'Dashboard tab',
        }}
      />
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'briefcase' : 'briefcase-outline'}
              size={size || 24}
              color={focused ? colors.primary : colors.text.secondary}
            />
          ),
          tabBarAccessibilityLabel: 'Jobs tab',
        }}
      />
      <Tabs.Screen
        name="pricing"
        options={{
          title: 'Pricing',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'pricetag' : 'pricetag-outline'}
              size={size || 24}
              color={focused ? colors.primary : colors.text.secondary}
            />
          ),
          tabBarAccessibilityLabel: 'Pricing tab',
        }}
      />
      <Tabs.Screen
        name="part-requests"
        options={{
          title: 'Parts',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'cube' : 'cube-outline'}
              size={size || 24}
              color={focused ? colors.primary : colors.text.secondary}
            />
          ),
          tabBarAccessibilityLabel: 'Parts tab',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={size || 24}
              color={focused ? colors.primary : colors.text.secondary}
            />
          ),
          tabBarAccessibilityLabel: 'Messages tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size || 24}
              color={focused ? colors.primary : colors.text.secondary}
            />
          ),
          tabBarAccessibilityLabel: 'Profile tab',
        }}
      />
      {/* Hide onboarding from tabs */}
      <Tabs.Screen
        name="onboarding"
        options={{
          href: null
        }}
      />
    </Tabs>
  )
}
