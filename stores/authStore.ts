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
  setPhoneForAuth: (phone: string) => void // Just store the phone, don't change step
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

  // Check whether a phone number belongs to a returning user (exists in users table) or is new
  checkPhone: async (phone: string): Promise<AuthResult> => {
    try {
      set({ isAuthenticating: true, error: null })

      console.log('[AUTH] checkPhone called with:', phone)

      const validation = phoneValidator.validate(phone)
      console.log('[AUTH] Phone validation result:', validation)

      if (!validation.isValid) {
        const errorMessage = validation.error || 'Invalid phone number'
        console.log('[AUTH] Phone validation failed:', errorMessage)
        set({ error: errorMessage, isAuthenticating: false })
        return { success: false, error: errorMessage }
      }

      const formattedPhone = validation.formatted!
      console.log('[AUTH] Formatted phone:', formattedPhone)

      // Check if user exists in users table (not user_pins)
      // Use limit(1) instead of .single() to avoid error when no results
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', formattedPhone)
        .limit(1)

      const existingUser = users && users.length > 0 ? users[0] : null
      console.log('[AUTH] User lookup - exists:', !!existingUser, 'error:', userError?.message)

      // If user exists, they are a returning user
      const isReturningUser = !!existingUser

      console.log('[AUTH] isNewUser:', !isReturningUser)

      set({
        phoneNumber: formattedPhone,
        isNewUser: !isReturningUser,
        authStep: 'pin',
        isAuthenticating: false
      })

      return { success: true, isNewUser: !isReturningUser }
    } catch (error) {
      console.error('[AUTH] checkPhone error:', error)
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
        // For customers, create a profile with address info
        // Database constraint requires address >= 10 chars OR NULL
        let addressValue = address && address.trim() ? address.trim() : null

        // If address too short, expand it to meet constraint
        if (addressValue && addressValue.length < 10) {
          addressValue = addressValue + ', Nigeria - Awaiting detailed address'
        }

        // If no address provided, use descriptive default
        if (!addressValue) {
          addressValue = 'Address to be updated by user during onboarding'
        }

        console.log('[AUTH] Creating customer profile with address:', addressValue, 'length:', addressValue.length)

        const profileData: any = {
          user_id: userRow.id,
          address_text: addressValue,
          onboarding_completed: false
        }

        if (latitude !== undefined && longitude !== undefined) {
          profileData.location = `POINT(${longitude} ${latitude})`
          console.log('[AUTH] Storing location:', profileData.location)
        }

        const { error: profileError } = await supabase
          .from('customer_profiles')
          .insert(profileData)

        if (profileError) {
          console.error('[AUTH] Customer profile creation error:', profileError)
          const errorMessage = 'Failed to create customer profile. Please try again.'
          set({ error: errorMessage, isAuthenticating: false })
          return { success: false, error: errorMessage }
        }

        console.log('[AUTH] Customer profile created successfully')
      } else if (role === 'technician') {
        // For technicians, create a basic profile (will be completed during onboarding)
        console.log('[AUTH] Creating technician profile for user:', userRow.id)

        const { error: profileError } = await supabase
          .from('technician_profiles')
          .insert({
            user_id: userRow.id,
            nin: '',  // Will be filled during onboarding
            shop_address: '',  // Will be filled during onboarding
            bank_name: '',  // Will be filled during onboarding
            bank_account_number: '',  // Will be filled during onboarding
            bank_account_name: '',  // Will be filled during onboarding
            paystack_recipient_code: null,
            verification_status: 'pending',
            is_available: false
          } as any)

        if (profileError) {
          console.error('[AUTH] Technician profile creation error:', profileError)
          const errorMessage = 'Failed to create technician profile. Please try again.'
          set({ error: errorMessage, isAuthenticating: false })
          return { success: false, error: errorMessage }
        }

        console.log('[AUTH] Technician profile created successfully')
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
