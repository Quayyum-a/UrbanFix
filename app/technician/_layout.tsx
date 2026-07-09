// Technician bottom tab navigation layout
// 4 tabs: Dashboard, Jobs, Messages, Profile
// Mirrors the customer layout pattern with role-appropriate tabs

import React from 'react'
import { Platform, Pressable } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, touchTargets } from '@/constants/theme'
import * as Haptics from 'expo-haptics'

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
  const handleTabPress = () => {
    // Haptic feedback on tab press — matches customer layout pattern
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={size || 24}
                color={focused ? colors.primary : colors.text.secondary}
              />
            ),
            tabBarAccessibilityLabel: `${tab.label} tab`,
          }}
        />
      ))}
    </Tabs>
  )
}
