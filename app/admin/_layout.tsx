// Admin Layout with Navigation
// Provides admin-only navigation structure with role protection

import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/theme'
import { useAuthStore } from '@/stores/authStore'
import { Redirect } from 'expo-router'

export default function AdminLayout() {
  const userProfile = useAuthStore(state => state.userProfile)

  // Protect admin routes - only allow admin role
  if (!userProfile || userProfile.role !== 'admin') {
    return <Redirect href="/" />
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600'
        },
        headerStyle: {
          backgroundColor: colors.primary
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700'
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="verifications"
        options={{
          title: 'Verifications',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          ),
          tabBarBadge: undefined // Can be updated with pending count
        }}
      />
      <Tabs.Screen
        name="part-requests"
        options={{
          title: 'Part Requests',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="disputes"
        options={{
          title: 'Disputes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  )
}
