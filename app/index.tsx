// Root index page that redirects to splash screen on first load
// Entry point that shows splash screen for new app launches

import React, { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'

export default function IndexScreen() {
  const router = useRouter()
  const { isAuthenticated, role, initialized } = useAuth()

  useEffect(() => {
    if (!initialized) {
      return
    }

    // Check if user is already authenticated
    if (isAuthenticated && role) {
      // Skip splash and redirect to role-specific home
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
          router.replace('/splash')
          break
      }
    } else {
      // Show splash screen for new users
      router.replace('/splash')
    }
  }, [isAuthenticated, role, initialized, router])

  // Return null since we're redirecting immediately
  return null
}