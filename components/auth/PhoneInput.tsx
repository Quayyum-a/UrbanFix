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
  Alert
} from 'react-native'
import { Button } from '@/components/ui/Button'
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
  const [phone, setPhone] = useState(initialPhone || '+234')
  const [isLoading, setIsLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Real-time phone validation
  const validatePhone = useCallback((phoneNumber: string): PhoneValidationResult => {
    return phoneAuthService.validatePhoneNumber(phoneNumber)
  }, [])

  // Handle phone input changes
  const handlePhoneChange = useCallback((text: string) => {
    // Ensure +234 prefix is always present
    let formattedText = text
    if (!formattedText.startsWith('+234')) {
      if (formattedText.startsWith('234')) {
        formattedText = '+' + formattedText
      } else if (formattedText.startsWith('0')) {
        formattedText = '+234' + formattedText.slice(1)
      } else if (formattedText.match(/^[0-9]/)) {
        formattedText = '+234' + formattedText
      } else {
        formattedText = '+234'
      }
    }

    // Remove non-numeric characters after +234
    const prefix = '+234'
    const numbers = formattedText.slice(4).replace(/[^0-9]/g, '')
    
    // Limit to 10 digits after +234
    const limitedNumbers = numbers.slice(0, 10)
    formattedText = prefix + limitedNumbers

    setPhone(formattedText)
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null)
    }
  }, [validationError])

  // Handle send OTP
  const handleSendOTP = useCallback(async () => {
    try {
      setIsLoading(true)
      setValidationError(null)

      // Validate phone number
      const validation = validatePhone(phone)
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid phone number')
        return
      }

      const result = await phoneAuthService.sendOTP(phone)
      
      if (result.success) {
        onOTPSent(phone)
        Alert.alert(
          'Verification Code Sent',
          `We've sent a 6-digit code to ${phone}. Please enter it below.`,
          [{ text: 'OK' }]
        )
      } else {
        const errorMessage = result.error || 'Failed to send verification code'
        setValidationError(errorMessage)
        onError(errorMessage)
      }
    } catch (error) {
      const errorMessage = 'Network error. Please check your connection.'
      setValidationError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [phone, validatePhone, onOTPSent, onError])

  // Check if form is valid
  const isValid = validatePhone(phone).isValid
  const canSubmit = isValid && !isLoading && !loading

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
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇳🇬</Text>
            </View>
            <TextInput
              style={[
                styles.phoneInput,
                validationError && styles.phoneInputError
              ]}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="+234XXXXXXXXXX"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              autoFocus
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={14} // +234 (4) + 10 digits
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

        <Button
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
              <Text style={styles.sendButtonText}>Sending...</Text>
            </View>
          ) : (
            <Text style={styles.sendButtonText}>Send Verification Code</Text>
          )}
        </Button>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
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
    marginBottom: 32
  },
  inputWrapper: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF'
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  countryCodeText: {
    fontSize: 20,
    lineHeight: 24
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
    borderColor: '#EF4444',
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
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600'
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18
  }
})