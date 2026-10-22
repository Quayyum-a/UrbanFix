import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router/js-tabs'
import React from 'react'
import { colors } from '@/constants/theme'

export function TabsLayout({ tabs }: {
  tabs: { name: string; title: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[]
}) {
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
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={color} size={size} />,
            tabBarBadge: t.badge ? (t.badge > 9 ? '9+' : t.badge) : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.danger, color: '#fff', fontSize: 11, fontWeight: '700' },
            tabBarAccessibilityLabel: t.badge ? `${t.title}, ${t.badge} with new messages` : t.title,
          }}
        />
      ))}
    </Tabs>
  )
}
