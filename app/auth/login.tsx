// Main authentication flow screen
// Orchestrates phone input → OTP → role selection → profile setup

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
import { OTPInput } from '@/components/auth/OTPInput'
import { RoleSelection } from '@/components/auth/RoleSelection'
import { ProfileSetup } from '@/components/auth/ProfileSetup'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/lib/auth'

type AuthStep = 'phone' | 'otp' | 'role-selection' | 'profile-setup'

export default function LoginScreen() {
  const router = useRouter()
  const {
    sendOTP,
    verifyOTP,
    completeRegistration,
    directSignIn,
    isAuthenticated,
    role,
    loading,
    error,
    clearError
  } = useAuth()
  
  const [currentStep, setCurrentStep] = useState<AuthStep>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && role) {
      // Redirect based on role
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
          break
      }
    }
  }, [isAuthenticated, role, router])

  // Handle errors
  const handleError = useCallback((errorMessage: string) => {
    Alert.alert('Error', errorMessage, [{ text: 'OK' }])
  }, [])

  // Handle OTP sent successfully
  const handleOTPSent = useCallback((phone: string) => {
    setPhoneNumber(phone)
    setCurrentStep('otp')
    clearError()
  }, [clearError])

  // Handle returning user detected
  const handleReturningUserDetected = useCallback(async (phone: string) => {
    try {
      console.log('👤 [Login] Returning user detected:', phone)
      setPhoneNumber(phone)
      clearError()

      // Sign in directly without OTP
      const result = await directSignIn(phone)

      if (result.success && result.user) {
        console.log('✅ [Login] Direct sign-in successful:', result.user.role)
        // Redirect based on role
        setTimeout(() => {
          switch (result.user!.role) {
            case 'customer':
              router.replace('/customer')
              break
            case 'technician':
              router.replace('/technician')
              break
            case 'admin':
              router.replace('/admin')
              break
          }
        }, 500)
      } else {
        console.error('❌ [Login] Direct sign-in failed:', result.error)
        handleError(result.error || 'Failed to sign you in. Please try again.')
      }
    } catch (error) {
      console.error('❌ [Login] Returning user error:', error)
      handleError('Failed to sign you in. Please try again.')
    }
  }, [router, directSignIn, clearError, handleError])

  // Handle OTP verification success
  const handleOTPVerified = useCallback(async () => {
    try {
      clearError()
      
      // Check if user needs role selection or is already complete
      if (isAuthenticated && role) {
        // User already has a role, redirect appropriately
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
        }
      } else {
        // New user needs role selection
        setCurrentStep('role-selection')
      }
    } catch (error) {
      handleError('Verification completed but failed to proceed')
    }
  }, [isAuthenticated, role, router, clearError])

  // Handle role selection
  const handleRoleSelected = useCallback((role: UserRole) => {
    setSelectedRole(role)
    setCurrentStep('profile-setup')
    clearError()
  }, [clearError])

  // Handle profile setup completion
  const handleProfileComplete = useCallback(async (fullName: string) => {
    if (!selectedRole) {
      handleError('No role selected')
      return
    }

    try {
      console.log('📝 [Login] Completing profile:', { fullName, role: selectedRole })
      const result = await completeRegistration(phoneNumber, fullName, selectedRole)
      
      if (result.success) {
        console.log('✅ [Login] Registration successful')
        
        // For customers, go to location permission screen
        // For technicians, go directly to their home
        if (selectedRole === 'customer') {
          console.log('📍 [Login] Navigating to location permission')
          router.replace('/auth/location-permission')
        } else if (selectedRole === 'technician') {
          console.log('🔧 [Login] Navigating to technician home')
          router.replace('/technician')
        } else {
          router.replace('/')
        }
      } else {
        handleError(result.error || 'Registration failed')
      }
    } catch (error) {
      console.error('❌ [Login] Profile completion error:', error)
      handleError('Network error during registration')
    }
  }, [selectedRole, phoneNumber, completeRegistration, router])

  // Handle back navigation
  const handleBack = useCallback(() => {
    console.log('handleBack called, currentStep:', currentStep)
    switch (currentStep) {
      case 'otp':
        console.log('Going back to phone input')
        setCurrentStep('phone')
        break
      case 'role-selection':
        console.log('Going back to OTP')
        setCurrentStep('otp')
        break
      case 'profile-setup':
        console.log('Going back to role selection')
        setCurrentStep('role-selection')
        break
      default:
        console.log('No back action for step:', currentStep)
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
            onOTPSent={handleOTPSent}
            onReturningUserDetected={handleReturningUserDetected}
            onError={handleError}
            loading={loading}
            initialPhone={phoneNumber}
          />
        )
      
      case 'otp':
        return (
          <OTPInput
            phone={phoneNumber}
            onVerificationSuccess={handleOTPVerified}
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
    flex: 1
  }
})
