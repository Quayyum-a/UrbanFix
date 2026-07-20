// Auth Session Manager
// Handles session creation, persistence, and restoration
// Uses AsyncStorage for cross-app-restart persistence

import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const SESSION_STORAGE_KEY = '@urbanfix_auth_session'
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
const REFRESH_BEFORE_MS = 5 * 60 * 1000 // Refresh 5 minutes before expiry

/**
 * Session data structure
 */
export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: {
    id: string
    phone: string
    role: 'customer' | 'technician'
  }
  userProfile: Database['public']['Tables']['users']['Row'] | null
  createdAt: number
}

/**
 * Auth Session Manager
 * Manages JWT session persistence and restoration
 */
export class AuthSessionManager {
  private static instance: AuthSessionManager
  private currentSession: AuthSession | null = null
  private refreshTimer: NodeJS.Timeout | null = null

  private constructor() {}

  public static getInstance(): AuthSessionManager {
    if (!AuthSessionManager.instance) {
      AuthSessionManager.instance = new AuthSessionManager()
    }
    return AuthSessionManager.instance
  }

  /**
   * Create a new session after successful authentication
   */
  public async createSession(
    user: Database['public']['Tables']['users']['Row'],
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    try {
      console.log('[Session] Creating new session for user:', user.phone)

      const expiresAt = Date.now() + SESSION_EXPIRY_MS

      const session: AuthSession = {
        accessToken,
        refreshToken,
        expiresAt,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role as 'customer' | 'technician'
        },
        userProfile: user,
        createdAt: Date.now()
      }

      // Store in memory
      this.currentSession = session

      // Persist to AsyncStorage
      await this.persistSession(session)

      // Set up refresh timer
      this.scheduleTokenRefresh()

      console.log('[Session] Session created successfully')
    } catch (error) {
      console.error('[Session] Error creating session:', error)
      throw error
    }
  }

  /**
   * Retrieve current session from memory or AsyncStorage
   */
  public async getCurrentSession(): Promise<AuthSession | null> {
    try {
      // Check memory first
      if (this.currentSession && !this.isSessionExpired(this.currentSession)) {
        console.log('[Session] Using session from memory')
        return this.currentSession
      }

      // Try to restore from AsyncStorage
      const session = await this.restoreSession()

      if (session && !this.isSessionExpired(session)) {
        console.log('[Session] Restored session from AsyncStorage')
        this.currentSession = session
        this.scheduleTokenRefresh()
        return session
      }

      console.log('[Session] No valid session found')
      return null
    } catch (error) {
      console.error('[Session] Error getting current session:', error)
      return null
    }
  }

  /**
   * Invalidate and clear the current session
   */
  public async clearSession(): Promise<void> {
    try {
      console.log('[Session] Clearing session')

      // Clear from memory
      this.currentSession = null

      // Cancel refresh timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer)
        this.refreshTimer = null
      }

      // Clear from AsyncStorage
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY)

      // Sign out from Supabase
      try {
        await supabase.auth.signOut()
      } catch (e) {
        console.warn('[Session] Error signing out from Supabase:', e)
      }

      console.log('[Session] Session cleared successfully')
    } catch (error) {
      console.error('[Session] Error clearing session:', error)
    }
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession()
    return !!session && !this.isSessionExpired(session)
  }

  /**
   * Get user ID from current session
   */
  public async getUserId(): Promise<string | null> {
    const session = await this.getCurrentSession()
    return session?.user.id || null
  }

  /**
   * Get user phone from current session
   */
  public async getUserPhone(): Promise<string | null> {
    const session = await this.getCurrentSession()
    return session?.user.phone || null
  }

  /**
   * Get user role from current session
   */
  public async getUserRole(): Promise<'customer' | 'technician' | null> {
    const session = await this.getCurrentSession()
    return session?.user.role || null
  }

  /**
   * Refresh access token before expiry
   */
  public async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.currentSession) {
        console.warn('[Session] No session to refresh')
        return false
      }

      console.log('[Session] Refreshing access token')

      // In production, call backend refresh endpoint
      // For now, we'll assume token is still valid
      // Real implementation would be:
      // const response = await fetch('/api/auth/refresh', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${this.currentSession.refreshToken}` }
      // })

      const newExpiresAt = Date.now() + SESSION_EXPIRY_MS
      this.currentSession.expiresAt = newExpiresAt

      // Persist updated session
      await this.persistSession(this.currentSession)

      // Schedule next refresh
      this.scheduleTokenRefresh()

      console.log('[Session] Access token refreshed')
      return true
    } catch (error) {
      console.error('[Session] Error refreshing token:', error)
      return false
    }
  }

  /**
   * Persist session to AsyncStorage
   */
  private async persistSession(session: AuthSession): Promise<void> {
    try {
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(session)
      )
      console.log('[Session] Session persisted to storage')
    } catch (error) {
      console.error('[Session] Error persisting session:', error)
    }
  }

  /**
   * Restore session from AsyncStorage
   */
  private async restoreSession(): Promise<AuthSession | null> {
    try {
      const sessionStr = await AsyncStorage.getItem(SESSION_STORAGE_KEY)

      if (!sessionStr) {
        console.log('[Session] No session found in storage')
        return null
      }

      const session = JSON.parse(sessionStr) as AuthSession

      console.log('[Session] Session restored from storage')
      return session
    } catch (error) {
      console.error('[Session] Error restoring session:', error)
      return null
    }
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: AuthSession): boolean {
    const isExpired = Date.now() > session.expiresAt
    if (isExpired) {
      console.log('[Session] Session expired')
    }
    return isExpired
  }

  /**
   * Schedule token refresh before expiry
   */
  private scheduleTokenRefresh(): void {
    if (!this.currentSession) return

    // Cancel existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    // Calculate when to refresh (5 minutes before expiry)
    const now = Date.now()
    const refreshTime = this.currentSession.expiresAt - REFRESH_BEFORE_MS - now

    if (refreshTime > 0) {
      console.log('[Session] Scheduling token refresh in', refreshTime / 1000, 'seconds')

      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken()
      }, refreshTime)
    }
  }

  /**
   * Get time until session expires (in seconds)
   */
  public async getTimeUntilExpiry(): Promise<number | null> {
    const session = await this.getCurrentSession()
    if (!session) return null

    const secondsRemaining = Math.max(
      0,
      Math.floor((session.expiresAt - Date.now()) / 1000)
    )

    return secondsRemaining
  }
}

// Export singleton instance
export const authSessionManager = AuthSessionManager.getInstance()
