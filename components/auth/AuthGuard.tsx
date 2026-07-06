// Authentication guard component for protecting routes
// Implements Requirements 2.5: Role-based access control

import React, { useEffect } from 'react'
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
    
    // Allow splash screen and auth routes without checks
    if (currentRoute === '/splash' || currentRoute === '/' || currentRoute.startsWith('/auth')) {
      return
    }
    
    // Check route access for protected routes
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

  // Don't show loading spinner - let the app routes handle their own loading states
  // This allows splash screen to show properly
  return <>{children}</>
}