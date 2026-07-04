// JWT Session Management Service
// Implements Requirements 1.3: JWT session management with automatic refresh

import { supabase } from '@/lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Session, User } from '@supabase/supabase-js'

export interface SessionInfo {
  session: Session
  user: User
  role: 'customer' | 'technician' | 'admin'
  expiresAt: number
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
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000 // Refresh 5 minutes before expiry

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
   */
  private async handleSessionUpdate(session: Session): Promise<void> {
    try {
      if (!session.user) {
        return
      }

      // Get user role from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (error || !userData) {
        console.error('Failed to fetch user role:', error)
        return
      }

      const sessionInfo: SessionInfo = {
        session,
        user: session.user,
        role: userData.role,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).getTime() : 0
      }

      this.currentSession = sessionInfo
      
      // Persist session info
      await AsyncStorage.setItem(
        this.SESSION_STORAGE_KEY, 
        JSON.stringify(sessionInfo)
      )

      // Set up automatic refresh
      this.scheduleTokenRefresh(sessionInfo.expiresAt)

    } catch (error) {
      console.error('Handle session update error:', error)
    }
  }

  /**
   * Clear session data
   */
  private async clearSession(): Promise<void> {
    try {
      this.currentSession = null
      await AsyncStorage.removeItem(this.SESSION_STORAGE_KEY)
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer)
        this.refreshTimer = null
      }
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
   * Get current session info
   */
  public async getCurrentSession(): Promise<SessionInfo | null> {
    if (this.currentSession) {
      return this.currentSession
    }

    // Try to restore from storage
    try {
      const storedSession = await AsyncStorage.getItem(this.SESSION_STORAGE_KEY)
      if (storedSession) {
        const sessionInfo: SessionInfo = JSON.parse(storedSession)
        
        // Validate session is still valid
        const validation = await this.validateSession(sessionInfo)
        if (validation.isValid && validation.session) {
          this.currentSession = validation.session
          return validation.session
        }
      }
    } catch (error) {
      console.error('Restore session error:', error)
    }

    // Get fresh session from Supabase
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (session && !error) {
        await this.handleSessionUpdate(session)
        return this.currentSession
      }
    } catch (error) {
      console.error('Get fresh session error:', error)
    }

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