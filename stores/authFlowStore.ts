// Auth Flow State Store
// Global state management for authentication flow using Zustand

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware/devtools'

/**
 * Auth flow steps in sequence
 */
export type AuthStep =
  | 'phone-entry'
  | 'pin-entry'
  | 'basic-profile'
  | 'role-selection'
  | 'customer-onboarding'
  | 'technician-onboarding'
  | 'complete'

/**
 * User role
 */
export type UserRole = 'customer' | 'technician'

/**
 * Basic profile data
 */
export interface BasicProfileData {
  fullName: string
  email: string
  avatarUrl?: string
}

/**
 * Customer-specific onboarding data
 */
export interface CustomerOnboardingData {
  address: string
  city: string
  state: string
  postalCode: string
  latitude?: number
  longitude?: number
}

/**
 * Technician-specific onboarding data
 */
export interface TechnicianOnboardingData {
  nin: string
  ninDocUrl: string
  shopAddress: string
  bankName: string
  bankAccountNumber: string
  bankAccountName: string
}

/**
 * Auth Flow State
 */
export interface AuthFlowState {
  // Current step in the flow
  step: AuthStep

  // Form data
  phone: string | null
  pin: string | null
  basicProfile: BasicProfileData | null
  selectedRole: UserRole | null
  roleData: {
    customer?: CustomerOnboardingData
    technician?: TechnicianOnboardingData
  }

  // State flags
  loading: boolean
  error: string | null
  isReturningUser: boolean
  pinCreatedForCurrentPhone: boolean

  // Attempt tracking
  pinAttempts: number
  maxPinAttempts: number

  // Actions
  setStep: (step: AuthStep) => void
  setPhone: (phone: string) => void
  setPIN: (pin: string) => void
  setBasicProfile: (data: BasicProfileData) => void
  setRole: (role: UserRole) => void
  setCustomerOnboarding: (data: CustomerOnboardingData) => void
  setTechnicianOnboarding: (data: TechnicianOnboardingData) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setIsReturningUser: (isReturning: boolean) => void
  setPinCreatedForCurrentPhone: (created: boolean) => void
  incrementPinAttempts: () => void
  resetPinAttempts: () => void
  reset: () => void
}

/**
 * Initial state
 */
const initialState = {
  step: 'phone-entry' as AuthStep,
  phone: null,
  pin: null,
  basicProfile: null,
  selectedRole: null,
  roleData: {},
  loading: false,
  error: null,
  isReturningUser: false,
  pinCreatedForCurrentPhone: false,
  pinAttempts: 0,
  maxPinAttempts: 3
}

/**
 * Auth Flow Store
 * Manages entire authentication flow state
 */
export const useAuthFlowStore = create<AuthFlowState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setStep: (step: AuthStep) =>
        set(
          (state) => {
            state.step = step
          },
          false,
          'setStep'
        ),

      setPhone: (phone: string) =>
        set(
          (state) => {
            state.phone = phone
            state.error = null
          },
          false,
          'setPhone'
        ),

      setPIN: (pin: string) =>
        set(
          (state) => {
            state.pin = pin
            state.error = null
          },
          false,
          'setPIN'
        ),

      setBasicProfile: (data: BasicProfileData) =>
        set(
          (state) => {
            state.basicProfile = data
            state.error = null
          },
          false,
          'setBasicProfile'
        ),

      setRole: (role: UserRole) =>
        set(
          (state) => {
            state.selectedRole = role
            state.error = null
          },
          false,
          'setRole'
        ),

      setCustomerOnboarding: (data: CustomerOnboardingData) =>
        set(
          (state) => {
            state.roleData.customer = data
            state.error = null
          },
          false,
          'setCustomerOnboarding'
        ),

      setTechnicianOnboarding: (data: TechnicianOnboardingData) =>
        set(
          (state) => {
            state.roleData.technician = data
            state.error = null
          },
          false,
          'setTechnicianOnboarding'
        ),

      setLoading: (loading: boolean) =>
        set(
          (state) => {
            state.loading = loading
          },
          false,
          'setLoading'
        ),

      setError: (error: string | null) =>
        set(
          (state) => {
            state.error = error
          },
          false,
          'setError'
        ),

      setIsReturningUser: (isReturning: boolean) =>
        set(
          (state) => {
            state.isReturningUser = isReturning
          },
          false,
          'setIsReturningUser'
        ),

      setPinCreatedForCurrentPhone: (created: boolean) =>
        set(
          (state) => {
            state.pinCreatedForCurrentPhone = created
          },
          false,
          'setPinCreatedForCurrentPhone'
        ),

      incrementPinAttempts: () =>
        set(
          (state) => {
            state.pinAttempts = Math.min(
              state.pinAttempts + 1,
              state.maxPinAttempts
            )
          },
          false,
          'incrementPinAttempts'
        ),

      resetPinAttempts: () =>
        set(
          (state) => {
            state.pinAttempts = 0
          },
          false,
          'resetPinAttempts'
        ),

      reset: () =>
        set(
          (state) => {
            return initialState
          },
          false,
          'reset'
        )
    })),
    {
      name: 'AuthFlowStore',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
)
