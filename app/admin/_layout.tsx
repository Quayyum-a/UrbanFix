// Admin Layout with Navigation
// Provides admin-only navigation structure with role protection

import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/constants/theme'
import { useAuthStore } from '@/stores/authStore'
import { Redirect, useRouter } from 'expo-router'
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'

export default function AdminLayout() {
  const userProfile = useAuthStore(state => state.userProfile)
  const router = useRouter()
  const { logout } = useAuthStore()

  // Protect admin routes - only allow admin role
  if (!userProfile || userProfile.role !== 'admin') {
    return <Redirect href="/" />
  }

  const handleSignout = async () => {
    try {
      await logout()
      router.replace('/auth/login')
    } catch (error) {
      console.error('Signout error:', error)
    }
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
          fontSize: 11,
          fontWeight: '600'
        },
        headerStyle: {
          backgroundColor: colors.primary
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={handleSignout}
            style={styles.signoutButton}
          >
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )
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
        name="technician-management"
        options={{
          title: 'Technicians',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          )
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
      {/* Hidden tabs - still accessible but not in tab bar */}
      <Tabs.Screen
        name="reviews-management"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  signoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8
  }
})
