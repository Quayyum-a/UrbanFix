// Authentication guard component for protecting routes
// Implements Requirements 2.5: Role-based access control

import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { roleService } from '@/lib/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const segments = useSegments()
  const { isAuthenticated, role, loading, initialized } = useAuth()

  useEffect(() => {
    if (!initialized || loading) {
      return
    }

    const currentRoute = `/${segments.join('/')}`
    
    // Check route access
    const checkRouteAccess = async () => {
      try {
        const accessResult = await roleService.checkRouteAccess(currentRoute)
        
        if (!accessResult.allowed && accessResult.redirectTo) {
          router.replace(accessResult.redirectTo)
        }
      } catch (error) {
        console.error('Route access check error:', error)
        // On error, redirect to login for safety
        if (!isAuthenticated) {
          router.replace('/auth/login')
        }
      }
    }

    checkRouteAccess()
  }, [isAuthenticated, role, segments, router, initialized, loading])

  // Show loading spinner while initializing or loading
  if (!initialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  }
})