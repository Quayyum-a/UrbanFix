// Registration flow screen for new users
// Orchestrates phone input → check if new → PIN create → role selection → profile setup (name) → [for customer: location collection] → completion
// Returning users are redirected to /auth/login

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native'
import { useRouter } from 'expo-router'
import { PhoneInput } from '@/components/auth/PhoneInput'
import { PINInput } from '@/components/auth/PINInput'
import { RoleSelection } from '@/components/auth/RoleSelection'
import { ProfileSetup } from '@/components/auth/ProfileSetup'
import { useAuth } from '@/hooks/useAuth'
import { AuthResult } from '@/stores/authStore'
import type { UserRole } from '@/lib/auth'

type AuthStep = 'phone' | 'pin' | 'role-selection' | 'profile-setup'

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
        setPhoneNumber(phone)
        const result = await checkPhone(phone)
        if (!result.success) {
          // checkPhone already set error in store via setError
          return result
        }
        if (!result.isNewUser) {
          // Existing user: redirect to login
          router.replace('/auth/login')
          // Return a success result to avoid error in PhoneInput
          return { success: true }
        } else {
          // New user: proceed to PIN creation
          setCurrentStep('pin')
          clearError()
          // Return a success result
          return { success: true }
        }
      } catch (err) {
        // Network error etc.
        handleError('Network error. Please try again.')
        return { success: false, error: 'Network error. Please try again.' }
      }
    },
    [checkPhone, router, handleError, clearError]
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
    setCurrentStep('profile-setup')
    clearError()
  }, [clearError])

  // Handle profile setup completion (name only)
  const handleProfileComplete = useCallback(async (fullName: string) => {
    if (!selectedRole) {
      handleError('No role selected')
      return
    }
    setPendingFullName(fullName)
    if (selectedRole === 'technician') {
      // For technicians, we can complete registration now (no location needed)
      try {
        const result = await completeRegistration(phoneNumber, fullName, 'technician' as UserRole)
        if (result.success) {
          // Go to technician dashboard
          router.replace('/technician')
        } else {
          handleError(result.error || 'Registration failed')
        }
      } catch (e) {
        handleError('Network error during registration')
      }
    } else {
      // For customers, go to collect location
      router.push(`/auth/complete-profile?name=${encodeURIComponent(fullName)}&phone=${encodeURIComponent(phoneNumber)}`)
    }
  }, [selectedRole, phoneNumber, completeRegistration, router, handleError])

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'pin':
        setCurrentStep('phone')
        break
      case 'role-selection':
        setCurrentStep('pin')
        break
      case 'profile-setup':
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

      case 'profile-setup':
        return (
          <ProfileSetup
            phone={phoneNumber}
            role={selectedRole!}
            onComplete={handleProfileComplete}
            onError={handleError}
            loading={loading}
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