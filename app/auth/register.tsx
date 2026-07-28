// Registration flow screen for new users
// Orchestrates phone input → check if new → PIN create → role selection → profile setup (name) → [for customer: location collection] → completion
// Returning users are redirected to /auth/login

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Alert,
  StatusBar
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { PhoneInput } from '@/components/auth/PhoneInput'
import { PINInput } from '@/components/auth/PINInput'
import { RoleSelection } from '@/components/auth/RoleSelection'
import { UnifiedProfileSetup } from '@/components/auth/UnifiedProfileSetup'
import { TechnicianOnboarding } from '@/components/auth/TechnicianOnboarding'
import { useAuth } from '@/hooks/useAuth'
import { AuthResult, useAuthStore } from '@/stores/authStore'
import { phoneValidator } from '@/lib/auth'
import type { UserRole } from '@/lib/auth'

type AuthStep = 'phone' | 'pin' | 'role-selection' | 'customer-profile-setup' | 'technician-onboarding'

export default function RegisterScreen() {
  const router = useRouter()
  const {
    checkPhone,
    submitPIN,
    completeRegistration,
    isAuthenticated,
    isNewUser,
    role,
    loading,
    error,
    clearError
  } = useAuth()

  const [currentStep, setCurrentStep] = useState<AuthStep>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [pendingFullName, setPendingFullName] = useState('')

  // Get useAuthStore to update phoneNumber
  const authStore = useAuthStore()

  // Redirect if already authenticated (should not happen in register flow, but safe)
  useEffect(() => {
    if (isAuthenticated && role) {
      switch (role) {
        case 'customer':
          router.replace('/customer')
          break
        case 'technician':
          router.replace('/technician')
          break
      }
    }
  }, [isAuthenticated, role, router])

  const handleError = useCallback((errorMessage: string) => {
    Alert.alert('Error', errorMessage, [{ text: 'OK' }])
  }, [])

  // Handle phone number submission: check if new or existing user
  const handlePhoneSubmit = useCallback(
    async (phone: string): Promise<AuthResult> => {
      try {
        console.log('[REGISTER] Phone submitted:', phone)
        setPhoneNumber(phone)

        // Immediately move to PIN step (optimistic update)
        setCurrentStep('pin')
        clearError()

        // Check phone in the background (just for validation, not for navigation)
        // We don't use the store's checkPhone because it updates authStep which interferes with local state
        const validation = phoneValidator.validate(phone)
        if (!validation.isValid) {
          console.log('[REGISTER] Validation failed:', validation.error)
          setCurrentStep('phone')
          handleError(validation.error || 'Invalid phone number')
          return { success: false, error: validation.error }
        }

        const formattedPhone = validation.formatted!
        console.log('[REGISTER] Phone validated:', formattedPhone)

        // Update the auth store's phoneNumber so submitPIN can access it
        // Use the store's internal setState to just update phoneNumber without changing authStep
        useAuthStore.setState({ phoneNumber: formattedPhone, isNewUser: true })

        return { success: true }
      } catch (err) {
        console.error('[REGISTER] Error in handlePhoneSubmit:', err)
        setCurrentStep('phone')
        handleError('Network error. Please try again.')
        return { success: false, error: 'Network error. Please try again.' }
      }
    },
    [handleError, clearError]
  )

  // Handle PIN created (new user)
  const handlePINSuccess = useCallback(() => {
    clearError()
    // New user just created their PIN - continue to role selection
    setCurrentStep('role-selection')
  }, [clearError])

  // Handle role selection
  const handleRoleSelected = useCallback((role: UserRole) => {
    setSelectedRole(role)
    // Route to different onboarding flows based on role
    if (role === 'technician') {
      setCurrentStep('technician-onboarding')
    } else {
      setCurrentStep('customer-profile-setup')
    }
    clearError()
  }, [clearError])

  // Handle unified profile setup completion (name + location)
  const handleProfileComplete = useCallback(
    async (
      fullName: string,
      latitude?: number,
      longitude?: number,
      address?: string
    ) => {
      if (!selectedRole) {
        handleError('No role selected')
        return
      }
      setPendingFullName(fullName)
      try {
        const result = await completeRegistration(
          phoneNumber,
          fullName,
          selectedRole,
          latitude,
          longitude,
          address
        )
        if (result.success) {
          // Go to appropriate dashboard
          if (selectedRole === 'technician') {
            router.replace('/technician')
          } else {
            router.replace('/customer')
          }
        } else {
          handleError(result.error || 'Registration failed')
        }
      } catch (e) {
        console.error('Registration error:', e)
        handleError('Network error during registration')
      }
    },
    [selectedRole, phoneNumber, completeRegistration, router, handleError]
  )

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'pin':
        setCurrentStep('phone')
        break
      case 'role-selection':
        setCurrentStep('pin')
        break
      case 'customer-profile-setup':
        setCurrentStep('role-selection')
        break
      case 'technician-onboarding':
        setCurrentStep('role-selection')
        break
      default:
        break
    }
    clearError()
  }, [currentStep, clearError])

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'phone':
        return (
          <PhoneInput
            onSubmit={handlePhoneSubmit}
            onContinue={() => {}} // We handle navigation in handlePhoneSubmit
            onError={handleError}
            loading={loading}
            initialPhone={phoneNumber}
          />
        )

      case 'pin':
        return (
          <PINInput
            phone={phoneNumber}
            mode='create' // Always creating PIN for new users
            onSubmit={submitPIN}
            onSuccess={handlePINSuccess}
            onError={handleError}
            loading={loading}
            onBack={handleBack}
          />
        )

      case 'role-selection':
        return (
          <RoleSelection
            onRoleSelected={handleRoleSelected}
            onError={handleError}
            loading={loading}
          />
        )

      case 'customer-profile-setup':
        return (
          <UnifiedProfileSetup
            phone={phoneNumber}
            role='customer'
            onComplete={handleProfileComplete}
            onError={handleError}
            loading={loading}
          />
        )

      case 'technician-onboarding':
        return (
          <TechnicianOnboarding
            phone={phoneNumber}
            onComplete={handleProfileComplete}
            onError={handleError}
            loading={loading}
            onBack={handleBack}
          />
        )

      default:
        return null
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.content}>
        {renderCurrentStep()}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40
  }
})
