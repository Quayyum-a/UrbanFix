// Phone input component with Nigerian format validation
// Implements Requirements 1.1: Phone format validation

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable
} from 'react-native'
import { phoneAuthService } from '@/lib/auth'
import type { PhoneValidationResult } from '@/lib/auth'

interface PhoneInputProps {
  onOTPSent: (phone: string) => void
  onError: (error: string) => void
  loading?: boolean
  initialPhone?: string
}

export function PhoneInput({ 
  onOTPSent, 
  onError, 
  loading = false,
  initialPhone = '' 
}: PhoneInputProps) {
  // Extract just the phone number without country code for initial value
  const getPhoneNumber = (fullPhone: string) => {
    return fullPhone.startsWith('+234') ? fullPhone.slice(4) : ''
  }
  
  const [phoneNumber, setPhoneNumber] = useState(getPhoneNumber(initialPhone))
  const [isLoading, setIsLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Real-time phone validation
  const validatePhone = useCallback((fullPhone: string): PhoneValidationResult => {
    return phoneAuthService.validatePhoneNumber(fullPhone)
  }, [])

  // Handle phone input changes (only the numeric part after country code)
  const handlePhoneChange = useCallback((text: string) => {
    // Remove non-numeric characters
    let numbers = text.replace(/[^0-9]/g, '')
    
    // Remove leading 0 if present (Nigerian format)
    if (numbers.startsWith('0')) {
      numbers = numbers.slice(1)
    }
    
    // Limit to 10 digits
    const limitedNumbers = numbers.slice(0, 10)
    
    setPhoneNumber(limitedNumbers)
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null)
    }
  }, [validationError])

  // Get full phone number with country code
  const getFullPhoneNumber = useCallback(() => {
    return `+234${phoneNumber}`
  }, [phoneNumber])

  // Handle send OTP
  const handleSendOTP = useCallback(async () => {
    try {
      console.log('🔘 [PhoneInput] Send OTP button pressed')
      
      // Check terms agreement first
      if (!agreedToTerms) {
        console.log('⚠️ [PhoneInput] Terms not agreed')
        Alert.alert(
          'Terms Required',
          'Please agree to the Terms of Service and Privacy Policy to continue.',
          [{ text: 'OK' }]
        )
        return
      }

      setIsLoading(true)
      setValidationError(null)

      const fullPhone = getFullPhoneNumber()
      console.log('📱 [PhoneInput] Full phone number:', fullPhone)

      // Validate phone number
      const validation = validatePhone(fullPhone)
      if (!validation.isValid) {
        console.log('❌ [PhoneInput] Validation failed:', validation.error)
        setValidationError(validation.error || 'Invalid phone number')
        return
      }

      console.log('📤 [PhoneInput] Calling phoneAuthService.sendOTP...')
      const result = await phoneAuthService.sendOTP(fullPhone)
      console.log('📥 [PhoneInput] Result:', result)
      
      if (result.success) {
        console.log('✅ [PhoneInput] OTP sent successfully')
        onOTPSent(fullPhone)
        Alert.alert(
          'Verification Code Sent',
          `We've sent a 6-digit code to ${fullPhone}. Please enter it below.`,
          [{ text: 'OK' }]
        )
      } else {
        const errorMessage = result.error || 'Failed to send verification code'
        console.error('❌ [PhoneInput] Send failed:', errorMessage)
        setValidationError(errorMessage)
        onError(errorMessage)
      }
    } catch (error) {
      console.error('❌ [PhoneInput] Unexpected error:', error)
      const errorMessage = 'Network error. Please check your connection.'
      setValidationError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [phoneNumber, agreedToTerms, getFullPhoneNumber, validatePhone, onOTPSent, onError])

  // Check if form is valid
  const fullPhone = getFullPhoneNumber()
  const isValid = phoneNumber.length === 10 && validatePhone(fullPhone).isValid
  const canSubmit = isValid && agreedToTerms && !isLoading && !loading

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Your Phone Number</Text>
          <Text style={styles.subtitle}>
            We'll send you a verification code to confirm your number
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <View style={styles.countryCodeContainer}>
              <Text style={styles.countryFlag}>🇳🇬</Text>
              <Text style={styles.countryCodeText}>+234</Text>
            </View>
            <TextInput
              style={[
                styles.phoneInput,
                validationError && styles.phoneInputError
              ]}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder="8066025051"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              autoFocus
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={10}
              editable={!isLoading && !loading}
            />
          </View>
          
          {validationError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          )}
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Format: +234XXXXXXXXXX (Nigerian numbers only)
            </Text>
          </View>
        </View>

        {/* Terms and Conditions Checkbox */}
        <Pressable 
          style={styles.checkboxContainer}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          disabled={isLoading || loading}
        >
          <View style={[
            styles.checkbox,
            agreedToTerms && styles.checkboxChecked
          ]}>
            {agreedToTerms && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to the{' '}
            <Text style={styles.linkText}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSendOTP}
          disabled={!canSubmit}
          style={[
            styles.sendButton,
            !canSubmit && styles.sendButtonDisabled
          ]}
        >
          {isLoading || loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.sendButtonText}>Sending Code...</Text>
            </View>
          ) : (
            <Text style={styles.sendButtonText}>Send Code</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  },
  header: {
    marginBottom: 40,
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24
  },
  inputContainer: {
    marginBottom: 24
  },
  inputWrapper: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF'
  },
  countryCodeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  countryFlag: {
    fontSize: 20,
    lineHeight: 24
  },
  countryCodeText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827'
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#111827',
    backgroundColor: '#FFFFFF'
  },
  phoneInputError: {
    backgroundColor: '#FEF2F2'
  },
  errorContainer: {
    marginTop: 8,
    paddingHorizontal: 4
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 20
  },
  infoContainer: {
    marginTop: 8,
    paddingHorizontal: 4
  },
  infoText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: '#ff5722', // UrbanFix emergency orange
    borderColor: '#ff5722'
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  linkText: {
    color: '#ff5722', // UrbanFix emergency orange for links
    fontWeight: '600'
  },
  sendButton: {
    backgroundColor: '#ff5722', // UrbanFix secondary/emergency orange
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#ff5722',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
    shadowOpacity: 0
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  }
})