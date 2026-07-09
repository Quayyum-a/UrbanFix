// OTP input component with 6-digit verification
// Implements Requirements 1.3: OTP verification and JWT session creation

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Alert
} from 'react-native'
import { phoneAuthService } from '@/lib/auth'

interface OTPInputProps {
  phone: string
  onVerificationSuccess: () => void
  onError: (error: string) => void
  loading?: boolean
  onBack: () => void
}

export function OTPInput({ 
  phone, 
  onVerificationSuccess, 
  onError, 
  loading = false,
  onBack 
}: OTPInputProps) {
  const [otp, setOTP] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  
  // Refs for input fields
  const inputRefs = useRef<(TextInput | null)[]>([])

  // Format phone for display
  const formatPhoneForDisplay = (phoneNumber: string): string => {
    return phoneNumber.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')
  }

  // Check if this is a test number
  const isTestNumber = phone === '+2348066025051' || phone === '+2348012345678'

  // Start resend timer with 10 minutes (600 seconds)
  useEffect(() => {
    // Initialize with 10 minutes countdown
    setResendTimer(600)
  }, [])

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Format timer display (MM:SS)
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle OTP input change
  const handleOTPChange = useCallback((value: string, index: number) => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '')
    
    if (numericValue.length <= 1) {
      const newOTP = [...otp]
      newOTP[index] = numericValue
      setOTP(newOTP)
      
      // Auto-focus next input
      if (numericValue && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }
      
      // Clear error when user starts typing
      if (error) {
        setError(null)
      }
      
      // Auto-verify when all 6 digits are entered
      const isComplete = newOTP.every(digit => digit !== '') && newOTP[5] !== ''
      if (isComplete) {
        handleVerifyOTP(newOTP.join(''))
      }
    }
  }, [otp, error])

  // Handle backspace
  const handleKeyPress = useCallback(({ nativeEvent }: any, index: number) => {
    if (nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [otp])

  // Verify OTP
  const handleVerifyOTP = useCallback(async (otpCode?: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const codeToVerify = otpCode || otp.join('')
      
      console.log('🔐 [OTPInput] Starting verification...')
      console.log('📱 Phone:', phone)
      console.log('🔢 OTP:', codeToVerify)
      
      if (codeToVerify.length !== 6) {
        console.log('❌ [OTPInput] Invalid length:', codeToVerify.length)
        setError('Please enter all 6 digits')
        setIsLoading(false)
        return
      }

      console.log('📤 [OTPInput] Calling phoneAuthService.verifyOTP...')
      
      // Add timeout to prevent hanging
      const verifyPromise = phoneAuthService.verifyOTP(phone, codeToVerify)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Verification timeout')), 30000) // 30 second timeout
      })
      
      const result = await Promise.race([verifyPromise, timeoutPromise]) as any
      console.log('📥 [OTPInput] Result:', JSON.stringify(result, null, 2))
      
      if (result.success) {
        console.log('✅ [OTPInput] Verification successful!')
        onVerificationSuccess()
      } else {
        const errorMessage = result.error || 'Invalid verification code'
        console.error('❌ [OTPInput] Verification failed:', errorMessage)
        setError(errorMessage)
        onError(errorMessage)
        
        // Clear OTP inputs on error
        setOTP(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error: any) {
      console.error('❌ [OTPInput] Unexpected error:', error)
      const errorMessage = error.message === 'Verification timeout' 
        ? 'Verification took too long. Please try again or check your internet connection.'
        : 'Network error. Please try again.'
      setError(errorMessage)
      onError(errorMessage)
      
      // Clear OTP inputs on error
      setOTP(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
      console.log('🏁 [OTPInput] Verification complete, loading set to false')
    }
  }, [otp, phone, onVerificationSuccess, onError])

  // Resend OTP
  const handleResendOTP = useCallback(async () => {
    try {
      setIsResending(true)
      setError(null)
      
      const result = await phoneAuthService.sendOTP(phone)
      
      if (result.success) {
        setResendTimer(600) // Reset to 10 minutes
        setOTP(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        
        Alert.alert(
          'Code Sent',
          'A new verification code has been sent to your phone.',
          [{ text: 'OK' }]
        )
      } else {
        const errorMessage = result.error || 'Failed to resend code'
        setError(errorMessage)
        onError(errorMessage)
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.'
      setError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsResending(false)
    }
  }, [phone, onError])

  // Check if OTP is complete
  const isComplete = otp.every(digit => digit !== '')
  const canVerify = isComplete && !isLoading && !loading
  const canResend = resendTimer === 0 && !isResending && !isLoading && !loading

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to{'\n'}
            <Text style={styles.phoneNumber}>{formatPhoneForDisplay(phone)}</Text>
          </Text>
          {isTestNumber && (
            <View style={styles.testModeContainer}>
              <Text style={styles.testModeText}>
                🧪 Test Mode: Use your configured test OTP
              </Text>
            </View>
          )}
        </View>

        <View style={styles.otpContainer}>
          <View style={styles.otpInputs}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                  error && styles.otpInputError
                ]}
                value={digit}
                onChangeText={(value) => handleOTPChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                autoFocus={index === 0}
                editable={!isLoading && !loading}
                secureTextEntry={false}
              />
            ))}
          </View>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <Pressable
            onPress={() => handleVerifyOTP()}
            disabled={!canVerify}
            style={[
              styles.verifyButton,
              !canVerify && styles.verifyButtonDisabled
            ]}
          >
            {isLoading || loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.verifyButtonText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            )}
          </Pressable>

          <View style={styles.resendContainer}>
            {canResend ? (
              <Pressable
                onPress={handleResendOTP}
                disabled={isResending}
                style={styles.resendButton}
              >
                {isResending ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#ff5722" size="small" />
                    <Text style={styles.resendText}>Sending...</Text>
                  </View>
                ) : (
                  <Text style={styles.resendText}>
                    Didn't receive the code? <Text style={styles.resendLink}>Resend</Text>
                  </Text>
                )}
              </Pressable>
            ) : (
              <Text style={styles.timerText}>
                Resend code in {formatTimer(resendTimer)}
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => {
              console.log('Change phone number button pressed')
              onBack()
            }}
            style={styles.backButton}
            disabled={isLoading || loading}
          >
            <Text style={styles.backText}>← Change Phone Number</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            The verification code expires in 10 minutes
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
  phoneNumber: {
    fontWeight: '600',
    color: '#111827'
  },
  testModeContainer: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF4E6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB020'
  },
  testModeText: {
    fontSize: 14,
    color: '#B45309',
    fontWeight: '600',
    textAlign: 'center'
  },
  otpContainer: {
    marginBottom: 32
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#FFFFFF'
  },
  otpInputFilled: {
    borderColor: '#ff5722', // UrbanFix emergency orange
    backgroundColor: '#FFF4F2'
  },
  otpInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 4
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 20,
    textAlign: 'center'
  },
  actionsContainer: {
    gap: 16
  },
  verifyButton: {
    backgroundColor: '#ff5722', // UrbanFix emergency orange
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff5722',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  verifyButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
    shadowOpacity: 0
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  resendContainer: {
    alignItems: 'center'
  },
  resendButton: {
    paddingVertical: 8
  },
  resendText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center'
  },
  resendLink: {
    color: '#ff5722', // UrbanFix emergency orange
    fontWeight: '600'
  },
  timerText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 44, // Accessibility compliance
  },
  backText: {
    fontSize: 16,
    color: '#ff5722', // UrbanFix emergency orange
    fontWeight: '600'
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 'auto',
    paddingBottom: 32
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18
  }
})