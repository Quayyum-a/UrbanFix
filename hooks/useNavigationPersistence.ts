// Navigation state persistence hook
// Saves and restores the user's last route across app backgrounding/foregrounding
//
// Requirement 6.8: maintain navigation state across app backgrounding
// - Only restores for authenticated users (never overrides auth redirects)
// - Saved state expires after 24 hours
// - Excludes auth routes from persistence (only customer/technician routes)

import { useEffect, useRef, useState, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usePathname } from 'expo-router'

const NAV_STATE_KEY = '@urbanfix_nav_state'
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

/** Routes that should never be saved or restored (auth and system screens) */
const EXCLUDED_ROUTE_PREFIXES = ['/auth', '/splash', '/']

interface PersistedNavState {
  route: string
  timestamp: number
}

interface UseNavigationPersistenceResult {
  /** The saved route from the last session, if still valid (not expired, not auth route) */
  savedRoute: string | null
  /** Clear the saved route from storage (call after successfully restoring) */
  clearSavedRoute: () => Promise<void>
}

/**
 * Determines whether a route is a valid restorable app route.
 * Only customer and technician routes are eligible — auth/system routes are excluded.
 */
function isRestorableRoute(route: string): boolean {
  if (!route || route === '/') return false
  return EXCLUDED_ROUTE_PREFIXES.every(prefix => {
    // Exact match on '/' or prefix match for longer routes
    if (prefix === '/') return route !== prefix
    return !route.startsWith(prefix)
  })
}

/**
 * Persists and restores navigation state across app backgrounding/foregrounding.
 *
 * Usage in _layout.tsx:
 *   const { savedRoute, clearSavedRoute } = useNavigationPersistence()
 *
 * Then once auth is initialised and user is authenticated, navigate to savedRoute
 * if it is a valid customer/technician path (not an auth route).
 */
export function useNavigationPersistence(): UseNavigationPersistenceResult {
  const pathname = usePathname()
  const pathnameRef = useRef<string>(pathname)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const [savedRoute, setSavedRoute] = useState<string | null>(null)

  // Keep pathnameRef in sync without triggering extra effects
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  // Load persisted route on mount
  useEffect(() => {
    const loadSavedRoute = async (): Promise<void> => {
      try {
        const raw = await AsyncStorage.getItem(NAV_STATE_KEY)
        if (!raw) return

        const parsed: PersistedNavState = JSON.parse(raw)
        const age = Date.now() - parsed.timestamp

        if (age > EXPIRY_MS) {
          // Expired — discard silently
          await AsyncStorage.removeItem(NAV_STATE_KEY)
          return
        }

        if (isRestorableRoute(parsed.route)) {
          setSavedRoute(parsed.route)
        }
      } catch {
        // Storage errors are non-fatal; app continues without restoring
      }
    }

    loadSavedRoute()
  }, [])

  // Save current route when app goes to the background
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus): Promise<void> => {
      const prevState = appStateRef.current
      appStateRef.current = nextState

      const isGoingToBackground =
        (prevState === 'active') && (nextState === 'background' || nextState === 'inactive')

      if (!isGoingToBackground) return

      const currentRoute = pathnameRef.current
      if (!isRestorableRoute(currentRoute)) return

      try {
        const state: PersistedNavState = {
          route: currentRoute,
          timestamp: Date.now(),
        }
        await AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state))
      } catch {
        // Storage errors are non-fatal
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [])

  const clearSavedRoute = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(NAV_STATE_KEY)
      setSavedRoute(null)
    } catch {
      // Non-fatal
    }
  }, [])

  return { savedRoute, clearSavedRoute }
}
