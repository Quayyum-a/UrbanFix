// Authentication screen for returning users (login flow)
// Flow: phone number → PIN verification → dashboard

import React, { useState, useCallback } from 'react'
import { SafeAreaView, StatusBar, View, Text, Pressable, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { PhoneInput } from '@/components/auth/PhoneInput'
import { PINInput } from '@/components/auth/PINInput'
import { useAuth } from '@/hooks/useAuth'
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
    clearError
  } = useAuth()

  const [currentStep, setCurrentStep] = useState<'phone' | 'pin'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [forgotPinPending, setForgotPinPending] = useState(false)

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

  // Handle phone number checked - move to PIN step
  const handlePhoneContinue = useCallback((phone: string) => {
    setPhoneNumber(phone)
    setCurrentStep('pin')
    clearError()
  }, [clearError])

  // Handle PIN verified (returning user)
  const handlePINSuccess = useCallback(() => {
    clearError()
    // Returning user: submitPIN already loaded the profile and set the store's
    // role/isAuthenticated state, the redirect effect above handles navigation
  }, [clearError])

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
            onSubmit={checkPhone}
            onContinue={handlePhoneContinue}
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
              mode='verify' // Always verify for returning users
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