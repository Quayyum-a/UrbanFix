// JWT Session Management Service
// Implements Requirements 1.3: JWT session management with automatic refresh

import { supabase } from '@/lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session, User } from '@supabase/supabase-js'

// Dev mode marker stored in AsyncStorage when a test user logs in
const DEV_MODE_KEY = '@urbanfix_dev_mode'

export interface SessionInfo {
  session: Session
  user: User
  role: 'customer' | 'technician' | 'admin'
  expiresAt: number
}

/**
 * Persistent token storage format
 * Stores refresh token to restore session across app restarts
 */
export interface PersistentSessionData {
  refreshToken: string
  userId: string
  role: 'customer' | 'technician' | 'admin'
  phone: string
  storedAt: number
}

export interface SessionValidationResult {
  isValid: boolean
  session?: SessionInfo
  needsRefresh?: boolean
  error?: string
}

export class JWTService {
  private static instance: JWTService
  private currentSession: SessionInfo | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private readonly SESSION_STORAGE_KEY = 'urbanfix_session'
  private readonly PERSISTENT_TOKEN_KEY = 'urbanfix_refresh_token'
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000 // Refresh 5 minutes before expiry
  private autoRefreshInProgress = false

  private constructor() {
    this.initializeSessionListener()
  }

  public static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService()
    }
    return JWTService.instance
  }

  /**
   * Check if we're in dev mode (test user logged in)
   */
  private async isDevMode(): Promise<boolean> {
    try {
      const devMode = await AsyncStorage.getItem(DEV_MODE_KEY)
      return devMode === 'true'
    } catch {
      return false
    }
  }

  /**
   * Set dev mode flag
   */
  public static async setDevMode(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(DEV_MODE_KEY, enabled ? 'true' : 'false')
    } catch (error) {
      console.error('Set dev mode error:', error)
    }
  }

  /**
   * Initialize session state listener
   */
  private initializeSessionListener(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        switch (event) {
          case 'SIGNED_IN':
            if (session) {
              await this.handleSessionUpdate(session)
            }
            break
          
          case 'SIGNED_OUT':
            await this.clearSession()
            break
          
          case 'TOKEN_REFRESHED':
            if (session) {
              await this.handleSessionUpdate(session)
            }
            break
          
          default:
            // Handle other events if needed
            break
        }
      } catch (error) {
        console.error('Session state change error:', error)
      }
    })
  }

  /**
   * Handle session updates and persist session info
   * Now also persists refresh token for session recovery across app restarts
   */
  private async handleSessionUpdate(session: Session): Promise<void> {
    try {
      if (!session.user) {
        return
      }

      // Get user role from database with retry logic
      let userData = null
      let error = null
      let retries = 3

      while (retries > 0 && !userData) {
        const result = await supabase
          .from('users')
          .select('role, phone')
          .eq('id', session.user.id)
          .single()

        userData = result.data
        error = result.error

        if (!error && userData) {
          break
        }

        // Wait 500ms before retry (gives time for database to sync)
        await new Promise(resolve => setTimeout(resolve, 500))
        retries--
      }

      if (error || !userData) {
        console.error('Failed to fetch user role after retries:', error)
        return
      }

      const sessionInfo: SessionInfo = {
        session,
        user: session.user,
        role: userData.role,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).getTime() : 0
      }

      this.currentSession = sessionInfo

      // Persist session info for current app session
      await AsyncStorage.setItem(
        this.SESSION_STORAGE_KEY,
        JSON.stringify(sessionInfo)
      )

      // Persist refresh token for recovery across app restarts
      // This allows users to stay logged in indefinitely until they explicitly logout
      if (session.refresh_token) {
        const persistentData: PersistentSessionData = {
          refreshToken: session.refresh_token,
          userId: session.user.id,
          role: userData.role,
          phone: userData.phone,
          storedAt: Date.now()
        }

        await AsyncStorage.setItem(
          this.PERSISTENT_TOKEN_KEY,
          JSON.stringify(persistentData)
        )

        console.log('💾 [JWT] Refresh token persisted for session recovery')
      }

      // Set up automatic refresh
      this.scheduleTokenRefresh(sessionInfo.expiresAt)

    } catch (error) {
      console.error('Handle session update error:', error)
    }
  }

  /**
   * Clear session data
   * Removes both current session and persistent token on logout
   */
  private async clearSession(): Promise<void> {
    try {
      this.currentSession = null
      await AsyncStorage.removeItem(this.SESSION_STORAGE_KEY)
      await AsyncStorage.removeItem(this.PERSISTENT_TOKEN_KEY)

      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer)
        this.refreshTimer = null
      }

      console.log('🗑️ [JWT] Session and persistent token cleared on logout')
    } catch (error) {
      console.error('Clear session error:', error)
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }

    const now = Date.now()
    const timeToRefresh = expiresAt - now - this.REFRESH_THRESHOLD

    if (timeToRefresh > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshSession()
        } catch (error) {
          console.error('Automatic refresh error:', error)
        }
      }, timeToRefresh)
    } else if (timeToRefresh > -this.REFRESH_THRESHOLD) {
      // Token is expired but within grace period, refresh immediately
      this.refreshSession().catch(error => {
        console.error('Immediate refresh error:', error)
      })
    }
  }

  /**
   * Restore session from persistent refresh token
   * Called on app launch to automatically re-authenticate user
   */
  private async restoreSessionFromRefreshToken(): Promise<SessionInfo | null> {
    try {
      console.log('🔄 [JWT] Attempting to restore session from persistent token...')

      const persistedData = await AsyncStorage.getItem(this.PERSISTENT_TOKEN_KEY)
      if (!persistedData) {
        console.log('ℹ️ [JWT] No persistent token found')
        return null
      }

      const persistent: PersistentSessionData = JSON.parse(persistedData)
      console.log('✅ [JWT] Found persistent token, attempting refresh...')

      // Use refresh token to get new session
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: persistent.refreshToken
      })

      if (error || !data.session) {
        console.error('❌ [JWT] Failed to refresh from persistent token:', error)
        // Clear invalid persistent token
        await AsyncStorage.removeItem(this.PERSISTENT_TOKEN_KEY)
        return null
      }

      console.log('✅ [JWT] Session restored from refresh token!')

      // Update session with refreshed token
      await this.handleSessionUpdate(data.session)

      return this.currentSession
    } catch (error) {
      console.error('❌ [JWT] Error restoring from refresh token:', error)
      return null
    }
  }

  /**
   * Get current session info
   * Now attempts to restore from persistent token if current session is lost
   */
  public async getCurrentSession(): Promise<SessionInfo | null> {
    console.log('🔍 [JWT] getCurrentSession called')

    // Return cached session if available
    if (this.currentSession) {
      console.log('✅ [JWT] Returning cached session')
      return this.currentSession
    }

    // Try to restore from current session storage
    try {
      console.log('📂 [JWT] Attempting to restore from session storage...')
      const storedSession = await AsyncStorage.getItem(this.SESSION_STORAGE_KEY)
      if (storedSession) {
        console.log('✅ [JWT] Found stored session')
        const sessionInfo: SessionInfo = JSON.parse(storedSession)

        // Validate session is still valid
        const validation = await this.validateSession(sessionInfo)
        if (validation.isValid && validation.session) {
          console.log('✅ [JWT] Stored session is valid')
          this.currentSession = validation.session
          return validation.session
        }
        console.log('⚠️ [JWT] Stored session is invalid or expired')
      } else {
        console.log('ℹ️ [JWT] No stored session found')
      }
    } catch (error) {
      console.error('❌ [JWT] Error restoring stored session:', error)
    }

    // Try to restore from persistent refresh token (app restart recovery)
    console.log('🔄 [JWT] Attempting recovery from persistent token...')
    const restoredSession = await this.restoreSessionFromRefreshToken()
    if (restoredSession) {
      return restoredSession
    }

    // Get fresh session from Supabase (with timeout for dev mode)
    try {
      console.log('🌐 [JWT] Attempting to get fresh session from Supabase...')

      // Add timeout to prevent hanging in dev mode
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
      })

      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any

      if (session && !error) {
        console.log('✅ [JWT] Fresh session found from Supabase')
        await this.handleSessionUpdate(session)
        return this.currentSession
      }
      console.log('ℹ️ [JWT] No fresh session from Supabase')
    } catch (error) {
      console.log('ℹ️ [JWT] Session fetch failed or timed out (expected in dev mode):', error)
    }

    console.log('❌ [JWT] No session available - user needs to login')
    return null
  }

  /**
   * Validate current session and refresh if needed
   */
  public async validateSession(sessionInfo?: SessionInfo): Promise<SessionValidationResult> {
    try {
      const session = sessionInfo || this.currentSession

      if (!session) {
        return {
          isValid: false,
          error: 'No session available'
        }
      }

      const now = Date.now()
      const { expiresAt } = session

      // Check if token is expired
      if (expiresAt && now >= expiresAt) {
        // Try to refresh
        const refreshResult = await this.refreshSession()
        if (refreshResult) {
          return {
            isValid: true,
            session: refreshResult,
            needsRefresh: false
          }
        } else {
          return {
            isValid: false,
            error: 'Session expired and refresh failed'
          }
        }
      }

      // Check if token needs refresh soon
      const needsRefresh = expiresAt && (now >= (expiresAt - this.REFRESH_THRESHOLD))

      return {
        isValid: true,
        session,
        needsRefresh
      }

    } catch (error) {
      console.error('Validate session error:', error)
      return {
        isValid: false,
        error: 'Session validation failed'
      }
    }
  }

  /**
   * Refresh current session
   */
  public async refreshSession(): Promise<SessionInfo | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error || !data.session) {
        console.error('Session refresh error:', error)
        await this.clearSession()
        return null
      }

      // Session update will be handled by the auth state change listener
      return this.currentSession
    } catch (error) {
      console.error('Refresh session error:', error)
      return null
    }
  }

  /**
   * Get access token for API calls
   */
  public async getAccessToken(): Promise<string | null> {
    const session = await this.getCurrentSession()
    
    if (!session) {
      return null
    }

    // Validate session and refresh if needed
    const validation = await this.validateSession(session)
    
    if (!validation.isValid) {
      return null
    }

    if (validation.needsRefresh) {
      const refreshedSession = await this.refreshSession()
      return refreshedSession?.session.access_token || null
    }

    return session.session.access_token
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession()
    if (!session) {
      return false
    }

    const validation = await this.validateSession(session)
    return validation.isValid
  }

  /**
   * Get user role from current session
   */
  public async getUserRole(): Promise<'customer' | 'technician' | 'admin' | null> {
    const session = await this.getCurrentSession()
    return session?.role || null
  }

  /**
   * Sign out and clear all session data
   */
  public async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut()
      await this.clearSession()
    } catch (error) {
      console.error('Sign out error:', error)
      // Clear local session even if server signout fails
      await this.clearSession()
      throw error
    }
  }

  /**
   * Get session expiry information
   */
  public async getSessionExpiry(): Promise<{
    expiresAt: Date | null
    timeToExpiry: number | null
    needsRefresh: boolean
  }> {
    const session = await this.getCurrentSession()
    
    if (!session || !session.expiresAt) {
      return {
        expiresAt: null,
        timeToExpiry: null,
        needsRefresh: false
      }
    }

    const now = Date.now()
    const timeToExpiry = session.expiresAt - now
    const needsRefresh = timeToExpiry <= this.REFRESH_THRESHOLD

    return {
      expiresAt: new Date(session.expiresAt),
      timeToExpiry,
      needsRefresh
    }
  }
}

// Export singleton instance
export const jwtService = JWTService.getInstance()
