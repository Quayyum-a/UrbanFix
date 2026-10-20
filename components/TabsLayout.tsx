import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router/js-tabs'
import React from 'react'
import { colors } from '@/constants/theme'

export function TabsLayout({ tabs }: { tabs: { name: string; title: string; icon: keyof typeof Ionicons.glyphMap }[] }) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 60 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={color} size={size} /> }}
        />
      ))}
    </Tabs>
  )
}
