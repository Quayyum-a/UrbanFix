// Root application layout with authentication initialization
// Sets up auth context and route guarding

import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthGuard } from '@/components/auth'
import { useAuth } from '@/hooks/useAuth'

export default function RootLayout() {
  const { initialize } = useAuth()

  // Initialize authentication on app startup
  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splash" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="customer" />
        <Stack.Screen name="technician" />
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="auto" />
    </AuthGuard>
  )
}