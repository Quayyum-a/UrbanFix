// Authentication guard component for protecting routes
// Implements Requirements 2.5: Role-based access control

import React, { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'

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

    if (!isAuthenticated) {
      router.replace('/auth/login')
      return
    }

    // Route protected areas to the matching role's home if roles mismatch
    if (currentRoute.startsWith('/customer') && role !== 'customer') {
      router.replace(role === 'technician' ? '/technician' : '/auth/login')
    } else if (currentRoute.startsWith('/technician') && role !== 'technician') {
      router.replace(role === 'customer' ? '/customer' : '/auth/login')
    }
  }, [isAuthenticated, role, segments, router, initialized, loading])

  // Don't show loading spinner - let the app routes handle their own loading states
  // This allows splash screen to show properly
  return <>{children}</>
}