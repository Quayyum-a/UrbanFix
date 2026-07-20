// Authentication store using Zustand and the PIN-based auth services
// Flow: phone entry -> PIN (create/verify) -> role selection -> profile setup

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { pinAuthService, phoneValidator, authSessionManager, type UserRole } from '@/lib/auth'
import type { Database } from '@/types/database.types'

type UsersRow = Database['public']['Tables']['users']['Row']

export interface AuthResult {
  success: boolean
  error?: string | undefined
  isNewUser?: boolean | undefined
  user?: UsersRow
}

interface AuthState {
  // Core auth state
  userProfile: UsersRow | null
  // Kept in sync with userProfile - some screens (admin, root layout) read this directly
  user: UsersRow | null
  role: UserType | null
  loading: boolean
  initialized: boolean

  // Authentication flow state
  isAuthenticating: boolean
  authStep: AuthStep
  phoneNumber: string | null
  isNewUser: boolean

  // Error handling
  error: string | null
}

interface AuthActions {
  // Authentication actions
  checkPhone: (phone: string) => Promise<AuthResult>
  submitPIN: (pin: string) => Promise<AuthResult>
  selectRole: (role: UserRole) => void
  completeRegistration: (
    phone: string,
    fullName: string,
    role: UserRole,
    latitude?: number,
    longitude?: number,
    address?: string | null
  ) => Promise<AuthResult>
  signOut: () => Promise<void>
  initialize: () => Promise<void>

  // Utility methods
  isAuthenticated: () => boolean
  hasRole: (role: UserRole) => boolean
  clearError: () => void
  goToStep: (step: AuthState['authStep']) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  userProfile: null,
  user: null,
  role: null,
  loading: true,
  initialized: false,
  isAuthenticating: false,
  authStep: 'phone',
  phoneNumber: null,
  isNewUser: false,
  error: null,

  // Check whether a phone number belongs to a returning user (has a PIN) or a new one
  checkPhone: async (phone: string): Promise<AuthResult> => {
    try {
      set({ isAuthenticating: true, error: null })

      const validation = phoneValidator.validate(phone)
      if (!validation.isValid) {
        const errorMessage = validation.error || 'Invalid phone number'
        set({ error: errorMessage, isAuthenticating: false })
        return { success: false, error: errorMessage }
      }

      const formattedPhone = validation.formatted!
      const pinExists = await pinAuthService.isPINExists(formattedPhone)

      set({
        phoneNumber: formattedPhone,
        isNewUser: !pinExists,
        authStep: 'pin',
        isAuthenticating: false
      })

      return { success: true, isNewUser: !pinExists }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.'
      set({ error: errorMessage, isAuthenticating: false })
      return { success: false, error: errorMessage }
    }
  },

  // Create a PIN (new users) or verify a PIN (returning users)
  submitPIN: async (pin: string): Promise<AuthResult> => {
    const { phoneNumber, isNewUser } = get()

    if (!phoneNumber) {
      const errorMessage = 'Phone number missing. Please start over.'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    }

    try {
      set({ isAuthenticating: true, error: null })

      if (isNewUser) {
        const result = await pinAuthService.createPIN(phoneNumber, pin)

        if (result.success) {
          set({ authStep: 'role-selection', isAuthenticating: false })
          return { success: true }
        }

        set({ error: result.error ?? null, isAuthenticating: false })
        return { success: false, error: result.error }
      }

      const result = await pinAuthService.verifyPIN(phoneNumber, pin)

      if (result.success) {
        const { data: userRow, error: lookupError } = await supabase
          .from('users')
          .select('*')
          .eq('phone', phoneNumber)
          .single()

        if (lookupError || !userRow) {
          const errorMessage = 'Signed in, but failed to load your profile. Please try again.'
          set({ error: errorMessage, isAuthenticating: false })
          return { success: false, error: errorMessage }
        }

        await authSessionManager.createSession(
          userRow,
          `session_${userRow.id}`,
          `refresh_${userRow.id}`
        )

        set({
          userProfile: userRow,
          user: userRow,
          role: userRow.role as UserRole,
          authStep: 'complete',
          isAuthenticating: false
        })

        return { success: true, user: userRow }
      }

      // Verification failed - if it's because no PIN exists yet, route to PIN creation
      if (result.isNewUser) {
        set({ isNewUser: true, isAuthenticating: false })
      } else {
        set({ error: result.error ?? null, isAuthenticating: false })
      }

      return { success: false, error: result.error, isNewVar: result.isNewVar }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.'
      set({ error: errorMessage, isAuthenticating: false })
      return { success: false, error: errorMessage }
    }
  },

  selectRole: (role: UserRole) => {
    set({ authStep: 'profile-setup', error: null })
  },

  // Modified to accept optional location fields
  completeRegistration: async (
    phone: string,
    fullName: string,
    role: UserRole,
    latitude?: number,
    longitude?: number,
    address?: string | null
  ): Promise<AuthResult> => {
    try {
      set({ isAuthenticating: true, error: null })

      const trimmedName = fullName.trim()
      if (trimmedName.length < 2) {
        const errorMessage = 'Please enter your full name (minimum 2 characters)'
        set({ error: errorMessage, isAuthenticating: false })
        return { success: false, error: errorMessage }
      }

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .insert({
          phone,
          role,
          full_name: trimmedName
        } as Database['public']['Tables']['users']['Insert'])
        .select()
        .single()

      if (userError || !userRow) {
        const errorMessage = userError?.code === '23505'
          ? 'This phone number is already registered'
          : 'Failed to complete registration. Please try again.'
        set({ error: errorMessage, isAuthenticating: false })
        return { success: false, error: errorMessage }
      }

      if (role === 'customer') {
        // Prepare location value if coordinates provided
        let locationValue: any = null
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          // Attempt to create a PostGIS point string.
          // Note: This is a simplified approach; in production you would use
          // a proper GIS library or backend function.
          locationValue = `POINT(${longitude} ${latitude})`
        }

        const { error: profileError } = await supabase
          .from('customer_profiles')
          .insert({
            user_id: userRow.id,
            location: locationValue,
            address_text: address ?? null
          } as Database['public']['Tables']['customer_profiles']['Insert'])

        if (profileError) {
          const errorMessage = 'Failed to create customer profile. Please try again.'
          set({ error: errorMessage, isAuthenticating: false })
          return { success: false, error: errorMessage }
        }
      }

      await authSessionManager.createSession(
        userRow,
        `session_${userRow.id}`,
        `refresh_${userRow.id}`
      )

      set({
        userProfile: userRow,
        user: userRow,
        role: userRow.role as UserRole,
        authStep: 'complete',
        isAuthenticating: false
      })

      return { success: true, user: userRow }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.'
      set({ error: errorMessage, isAuthenticating: false })
      return { success: false, error: errorMessage }
    }
  },

  signOut: async () => {
    try {
      set({ loading: true })
      await authSessionManager.clearSession()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      set({
        userProfile: null,
        user: null,
        role: null,
        authStep: 'phone',
        phoneNumber: null,
        isNewUser: false,
        error: null,
        loading: false
      })
    }
  },

  initialize: async () => {
    set({ loading: false, initialized: true, authStep: 'phone' })

    try {
      const session = await authSessionManager.getCurrentSession()

      if (session) {
        set({
          userProfile: session.userProfile,
          user: session.userProfile,
          role: session.user.role,
          authStep: 'complete'
        })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ error: 'Failed to initialize authentication' })
    }
  },

  // Utility methods
  isAuthenticated: () => {
    return !!get().userProfile
  },

  hasRole: (role: UserRole): boolean => {
    return get().role === role
  },

  clearError: () => set({ error: null }),

  goToStep: (step) => set({ authStep: step, error: null })
}))