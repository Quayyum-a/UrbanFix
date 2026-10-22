import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { LiveUpdates } from '@/components/LiveUpdates'
import { colors } from '@/constants/theme'
import { useSession } from '@/lib/session'

export default function RootLayout() {
  const init = useSession((s) => s.init)
  useEffect(() => init(), [init])

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen name="book" options={{ headerShown: true, title: 'Book a repair' }} />
        <Stack.Screen name="job/[id]/index" options={{ headerShown: true, title: 'Repair' }} />
        <Stack.Screen name="job/[id]/chat" options={{ headerShown: true, title: 'Chat' }} />
        <Stack.Screen name="technician-setup" options={{ headerShown: true, title: 'Get approved' }} />
        <Stack.Screen name="admin-technician/[id]" options={{ headerShown: true, title: 'Review technician' }} />
      </Stack>
      <LiveUpdates />
    </SafeAreaProvider>
  )
}
