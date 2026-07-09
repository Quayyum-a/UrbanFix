// Root index page that shows splash screen on first load
// Entry point that displays the splash screen immediately

import React, { useEffect } from 'react'
import { View, StyleSheet, Image, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'

const { width, height } = Dimensions.get('window')

export default function IndexScreen() {
  const router = useRouter()
  const { isAuthenticated, role, initialized } = useAuth()

  useEffect(() => {
    console.log('Index screen: initialized =', initialized, 'isAuthenticated =', isAuthenticated, 'role =', role)
    
    // Wait for auth to initialize
    if (!initialized) {
      console.log('Index screen: waiting for auth to initialize')
      return
    }

    // Check if user is already authenticated
    if (isAuthenticated && role) {
      console.log('Index screen: user is authenticated, navigating to', role, 'home')
      // User is logged in - skip splash and go to their home screen
      switch (role) {
        case 'customer':
          router.replace('/customer')
          break
        case 'technician':
          router.replace('/technician')
          break
        case 'admin':
          router.replace('/admin')
          break
        default:
          // Fallback to splash if role is unknown
          console.log('Index screen: unknown role, navigating to splash')
          router.replace('/splash')
          break
      }
    } else {
      // New user or logged out - show splash screen
      console.log('Index screen: user not authenticated, navigating to splash')
      router.replace('/splash')
    }
  }, [isAuthenticated, role, initialized, router])

  // Show actual splash screen image while auth initializes
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/splash.png')}
        style={styles.splashImage}
        resizeMode="cover"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#031636', // Deep Trust Blue
  },
  splashImage: {
    width: width,
    height: height,
  },
})