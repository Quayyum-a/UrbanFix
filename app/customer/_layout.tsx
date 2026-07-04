import React from 'react'
import { Platform } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, touchTargets } from '@/constants/theme'
import * as Haptics from 'expo-haptics'

// Import screen components
import CustomerHomeScreen from './index'
import RepairsScreen from './repairs/index'
import MessagesScreen from './messages/index'
import ProfileScreen from './profile'
import BookScreen from './book'

const Tab = createBottomTabNavigator()

// Tab configuration with Material Design icons and labels
const TAB_CONFIG = [
  {
    name: 'home',
    component: CustomerHomeScreen,
    label: 'Home',
    icon: 'home',
    activeIcon: 'home'
  },
  {
    name: 'repairs',
    component: RepairsScreen,
    label: 'Repairs',
    icon: 'construct-outline',
    activeIcon: 'construct'
  },
  {
    name: 'book',
    component: BookScreen,
    label: 'Book',
    icon: 'add-circle-outline',
    activeIcon: 'add-circle'
  },
  {
    name: 'messages',
    component: MessagesScreen,
    label: 'Messages',
    icon: 'chatbubble-outline',
    activeIcon: 'chatbubble'
  },
  {
    name: 'profile',
    component: ProfileScreen,
    label: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person'
  }
] as const

export default function CustomerLayout() {
  const handleTabPress = () => {
    // Provide haptic feedback for tab navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  return (
    <Tab.Navigator
      screenOptions={{
        // Header configuration
        headerShown: false,
        
        // Tab bar styling
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.outline,
          height: Platform.OS === 'ios' ? 88 : 68, // Account for iOS safe area
          paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.sm,
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.xs,
          elevation: 8, // Android shadow
          shadowColor: colors.primary, // iOS shadow
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        
        // Tab bar item styling
        tabBarItemStyle: {
          paddingVertical: spacing.xs / 2,
          minHeight: touchTargets.minSize, // Accessibility compliance
        },
        
        // Tab bar label styling
        tabBarLabelStyle: {
          ...typography.labelMd,
          fontSize: 10,
          marginTop: 2,
          fontWeight: '500',
        },
        
        // Active tab styling
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        
        // Tab bar press behavior
        tabBarButton: (props) => (
          <props.children
            {...props}
            onPress={(e) => {
              handleTabPress()
              props.onPress?.(e)
            }}
          />
        ),
      }}
      
      // Screen listeners for additional interactions
      screenListeners={{
        tabPress: (e) => {
          // Additional tab press handling if needed
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
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
            tabBarTestID: `tab-${tab.name}`,
          }}
        />
      ))}
    </Tab.Navigator>
  )
}