// Enhanced Authentication store using Zustand and integrated auth services
// Integrates with phone-auth, JWT, and role services

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { 
  phoneAuthService, 
  jwtService, 
  roleService,
  type AuthResult,
  type UserRole 
} from '@/lib/auth'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

interface AuthState {
  // Core auth state
  user: User | null
  userProfile: Database['public']['Tables']['users']['Row'] | null
  role: UserRole | null
  loading: boolean
  initialized: boolean
  
  // Authentication flow state
  isAuthenticating: boolean
  authStep: 'phone' | 'otp' | 'role-selection' | 'profile-setup' | 'complete'
  phoneNumber: string | null
  
  // Error handling
  error: string | null
}

interface AuthActions {
  // State management
  setUser: (user: User | null) => void
  setUserProfile: (profile: Database['public']['Tables']['users']['Row'] | null) => void
  setRole: (role: UserRole | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAuthStep: (step: AuthState['authStep']) => void
  setPhoneNumber: (phone: string | null) => void
  
  // Authentication actions
  sendOTP: (phone: string) => Promise<AuthResult>
  verifyOTP: (phone: string, otp: string) => Promise<AuthResult>
  completeRegistration: (phone: string, fullName: string, role: UserRole) => Promise<AuthResult>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  
  // Utility methods
  isAuthenticated: () => boolean
  hasRole: (role: UserRole) => boolean
  canAccess: (permission: keyof import('@/lib/auth').RolePermissions) => Promise<boolean>
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  userProfile: null,
  role: null,
  loading: true,
  initialized: false,
  isAuthenticating: false,
  authStep: 'phone',
  phoneNumber: null,
  error: null,
  
  // State setters
  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAuthStep: (step) => set({ authStep: step }),
  setPhoneNumber: (phone) => set({ phoneNumber: phone }),
  
  // Authentication actions
  sendOTP: async (phone: string): Promise<AuthResult> => {
    try {
      set({ isAuthenticating: true, error: null, phoneNumber: phone })
      
      const result = await phoneAuthService.sendOTP(phone)
      
      if (result.success) {
        set({ authStep: 'otp' })
      } else {
        set({ error: result.error || 'Failed to send verification code' })
      }
      
      return result
    } catch (error) {
      const errorMessage = 'Network error. Please try again.'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      set({ isAuthenticating: false })
    }
  },
  
  verifyOTP: async (phone: string, otp: string): Promise<AuthResult> => {
    try {
      set({ isAuthenticating: true, error: null })
      
      const result = await phoneAuthService.verifyOTP(phone, otp)
      
      if (result.success && result.session) {
        set({ user: result.session.user })
        
        if (result.needsRoleSelection) {
          set({ authStep: 'role-selection' })
        } else if (result.user) {
          set({ 
            userProfile: result.user,
            role: result.user.role,
            authStep: 'complete'
          })
          // Update role service
          roleService.setRole(result.user.role)
        }
      } else {
        set({ error: result.error || 'Invalid verification code' })
      }
      
      return result
    } catch (error) {
      const errorMessage = 'Network error. Please try again.'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      set({ isAuthenticating: false })
    }
  },
  
  completeRegistration: async (phone: string, fullName: string, role: UserRole): Promise<AuthResult> => {
    try {
      set({ isAuthenticating: true, error: null })
      
      const result = await phoneAuthService.completeRegistration(phone, fullName, role)
      
      if (result.success && result.user) {
        set({ 
          userProfile: result.user,
          role: result.user.role,
          authStep: 'complete'
        })
        // Update role service
        roleService.setRole(result.user.role)
      } else {
        set({ error: result.error || 'Registration failed' })
      }
      
      return result
    } catch (error) {
      const errorMessage = 'Network error. Please try again.'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      set({ isAuthenticating: false })
    }
  },
  
  signOut: async () => {
    try {
      set({ loading: true })
      await phoneAuthService.signOut()
      roleService.clearRole()
      set({ 
        user: null, 
        userProfile: null,
        role: null, 
        authStep: 'phone',
        phoneNumber: null,
        error: null
      })
    } catch (error) {
      console.error('Error signing out:', error)
      set({ error: 'Failed to sign out. Please try again.' })
    } finally {
      set({ loading: false })
    }
  },
  
  initialize: async () => {
    console.log('🚀 [AuthStore] Starting initialization...')

    // Set initialized immediately so app doesn't hang
    set({ loading: false, initialized: true, authStep: 'phone' })
    console.log('✅ [AuthStore] Initialized flag set to true')

    try {
      // Get current session from JWT service - this will attempt:
      // 1. Cached session
      // 2. Stored session from memory
      // 3. Restoration from persistent refresh token (handles app restart)
      // 4. Fresh session from Supabase
      console.log('🔄 [AuthStore] Getting current session from JWT service...')
      const session = await jwtService.getCurrentSession()

      if (session) {
        console.log('✅ [AuthStore] Session found, role:', session.role)
        set({
          user: session.user,
          role: session.role,
          authStep: 'complete'
        })

        // Get user profile
        console.log('👤 [AuthStore] Fetching user profile...')
        const userProfile = await phoneAuthService.getCurrentUser()
        if (userProfile) {
          console.log('✅ [AuthStore] User profile found:', userProfile.full_name)
          set({ userProfile })
        } else {
          console.warn('⚠️ [AuthStore] User profile not found despite valid session')
        }

        // Update role service
        roleService.setRole(session.role)
      } else {
        console.log('ℹ️ [AuthStore] No session found, user needs to login')
      }

      // Listen for auth changes from Supabase
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 [AuthStore] Auth state change event:', event)
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ [AuthStore] User signed in')
            set({ user: session.user })

            const userProfile = await phoneAuthService.getCurrentUser()
            if (userProfile) {
              set({
                userProfile,
                role: userProfile.role,
                authStep: 'complete'
              })
              roleService.setRole(userProfile.role)
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 [AuthStore] User signed out')
            set({
              user: null,
              userProfile: null,
              role: null,
              authStep: 'phone',
              phoneNumber: null,
              error: null
            })
            roleService.clearRole()
          }
        } catch (error) {
          console.error('❌ [AuthStore] Auth state change error:', error)
        }
      })

      console.log('✅ [AuthStore] Initialization complete')
    } catch (error) {
      console.error('❌ [AuthStore] Initialization error:', error)
      set({ error: 'Failed to initialize authentication' })
    }
  },
  
  // Utility methods
  isAuthenticated: (): boolean => {
    const { user, userProfile } = get()
    return !!(user && userProfile)
  },
  
  hasRole: (role: UserRole): boolean => {
    const { role: currentRole } = get()
    return currentRole === role
  },
  
  canAccess: async (permission: keyof import('@/lib/auth').RolePermissions): Promise<boolean> => {
    try {
      const result = await roleService.checkAccess(permission)
      return result.allowed
    } catch (error) {
      console.error('Access check error:', error)
      return false
    }
  },
  
  clearError: () => set({ error: null })
}))
