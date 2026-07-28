// Authentication screen for returning users (login flow)
// Flow: phone number → PIN verification → dashboard

import React, { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SafeAreaView, StatusBar, View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { PhoneInput } from '@/components/auth/PhoneInput'
import { PINInput } from '@/components/auth/PINInput'
import { UnifiedProfileSetup } from '@/components/auth/UnifiedProfileSetup'
import { RoleSelection } from '@/components/auth/RoleSelection'
import { useAuth } from '@/hooks/useAuth'
import { phoneValidator } from '@/lib/auth'
import { useAuthStore } from '@/stores/authStore'
import { UserRole } from '@/lib/auth'

export default function LoginScreen() {
  const router = useRouter()
  const {
    checkPhone,
    submitPIN,
    isAuthenticated,
    isNewUser,
    role,
    loading,
    error,
    clearError,
    completeRegistration
  } = useAuth()

  const [currentStep, setCurrentStep] = useState<'phone' | 'pin' | 'role-selection' | 'profile-setup-unified'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [forgotPinPending, setForgotPinPending] = useState(false)
  const [pinMode, setPinMode] = useState<'create' | 'verify'>('verify') // Track PIN mode: create or verify
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [pendingFullName, setPendingFullName] = useState('')

  // Redirect to dashboard when authenticated
  // (This effect runs after successful PIN verification)
  // Note: We also handle redirect in _layout.tsx but we keep it here for immediate feedback
  const redirectIfAuthenticated = React.useCallback(() => {
    if (isAuthenticated && role) {
      switch (role) {
        case 'customer':
          router.replace('/customer')
          break
        case 'technician':
          router.replace('/technician')
          break
        case 'admin':
          router.replace('/admin')
          break
        default:
          router.replace('/')
      }
    }
  }, [isAuthenticated, role, router])

  React.useEffect(() => {
    redirectIfAuthenticated()
  }, [isAuthenticated, role, redirectIfAuthenticated])

  const handleError = useCallback((errorMessage: string) => {
    Alert.alert('Error', errorMessage, [{ text: 'OK' }])
  }, [])

  // Handle profile setup completion (name + location) for new users
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

  const handlePhoneSubmit = useCallback(
    async (phone: string): Promise<{ success: boolean; error?: string | undefined; isNewUser?: boolean | undefined }> => {
      try {
        // Validate phone format
        const validation = phoneValidator.validate(phone)
        if (!validation.isValid) {
          return { success: false, error: validation.error }
        }

        const formattedPhone = validation.formatted!
        setPhoneNumber(formattedPhone)

        // Check if user exists in the database to determine if new or returning
        // We do this check here instead of relying on PIN verification to fail
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('phone', formattedPhone)
          .single()

        const isReturningUser = !!existingUser && !userError
        const isNewUser = !isReturningUser

        // Update auth store's phoneNumber and isNewUser flag
        useAuthStore.setState({ phoneNumber: formattedPhone, isNewUser })

        // Immediately move to PIN step (optimistic update)
        setCurrentStep('pin')
        // Set PIN mode based on whether user is new or returning
        setPinMode(isNewUser ? 'create' : 'verify')
        clearError()

        return { success: true, isNewUser }
      } catch (err) {
        console.error('[LOGIN] Error in handlePhoneSubmit:', err)
        setCurrentStep('phone')
        return { success: false, error: 'Network error. Please try again.' }
      }
    },
    [router, clearError, supabase]
  )

  // Handle role selected after PIN creation (for new users)
  const handleRoleSelected = useCallback((role: UserRole) => {
    setSelectedRole(role)
    setCurrentStep('profile-setup-unified')
    clearError()
  }, [clearError])

  // Handle PIN verified/saved
  const handlePINSuccess = useCallback(() => {
    clearError()
    // For new users: PIN was created, need to go to role selection
    // For returning users: PIN was verified, profile loaded, redirect handled by effect
    if (isNewUser) {
      // New user needs to select role - transition to role selection step
      setCurrentStep('role-selection')
    } else {
      // Returning user: submitPIN already loaded the profile and set the store's
      // role/isAuthenticated state, the redirect effect above handles navigation
    }
  }, [clearError, isNewUser])

  const handleBack = useCallback(() => {
    if (currentStep === 'pin') {
      setCurrentStep('phone')
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
          <View style={{ flex: 1 }}>
            <PINInput
              phone={phoneNumber}
              mode={pinMode}
              onSubmit={submitPIN}
              onSuccess={handlePINSuccess}
              onError={handleError}
              loading={loading}
              onBack={handleBack}
            />
            {/* Forgot PIN link */}
            <View style={styles.forgotPinContainer}>
              <Pressable onPress={() => {
                setForgotPinPending(true)
              }}>
                <Text style={styles.forgotPinText}>Forgot PIN?</Text>
              </Pressable>
            </View>
          </View>
        )

      case 'role-selection':
        return (
          <RoleSelection
            onRoleSelected={handleRoleSelected}
            onError={handleError}
            loading={loading}
          />
        )

      case 'profile-setup-unified':
        return (
          <UnifiedProfileSetup
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

  // Handle navigation to forgot PIN screen
  // We'll handle this via a modal or navigation; for simplicity, we'll navigate
  // when the flag is set.
  React.useEffect(() => {
    if (forgotPinPending) {
      router.push('/auth/reset-pin')
      setForgotPinPending(false)
    }
  }, [forgotPinPending, router])

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
    paddingTop: 40,
    paddingBottom: 20
  },
  forgotPinContainer: {
    alignItems: 'center',
    marginTop: 12
  },
  forgotPinText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline'
  }
})
