// PIN input component with 4-digit entry
// Used both to create a PIN (new users) and verify a PIN (returning users)

import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable
} from 'react-native'

interface PINInputProps {
  phone: string
  mode: 'create' | 'verify'
  onSubmit: (pin: string) => Promise<{ success: boolean; error?: string | undefined }>
  onSuccess: () => void
  onError: (error: string) => void
  loading?: boolean
  onBack: () => void
}

const PIN_LENGTH = 4

export function PINInput({
  phone,
  mode,
  onSubmit,
  onSuccess,
  onError,
  loading = false,
  onBack
}: PINInputProps) {
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRefs = useRef<(TextInput | null)[]>([])

  const formatPhoneForDisplay = (phoneNumber: string): string => {
    return phoneNumber.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')
  }

  const handleSubmitPIN = useCallback(async (code: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await onSubmit(code)

      if (result.success) {
        onSuccess()
      } else {
        const message = result.error || 'Invalid PIN. Please try again.'
        setError(message)
        onError(message)
        setPin(Array(PIN_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      const message = 'Network error. Please try again.'
      setError(message)
      onError(message)
    } finally {
      setIsLoading(false)
    }
  }, [onSubmit, onSuccess, onError])

  const handlePinChange = useCallback((value: string, index: number) => {
    const numericValue = value.replace(/[^0-9]/g, '')

    if (numericValue.length <= 1) {
      const newPin = [...pin]
      newPin[index] = numericValue
      setPin(newPin)

      if (numericValue && index < PIN_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus()
      }

      if (error) {
        setError(null)
      }

      const isComplete = newPin.every(digit => digit !== '')
      if (isComplete) {
        handleSubmitPIN(newPin.join(''))
      }
    }
  }, [pin, error, handleSubmitPIN])

  const handleKeyPress = useCallback(({ nativeEvent }: any, index: number) => {
    if (nativeEvent.key === 'Backspace' && pin[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [pin])

  const isComplete = pin.every(digit => digit !== '')
  const canSubmit = isComplete && !isLoading && !loading

  const title = mode === 'create' ? 'Create Your PIN' : 'Enter Your PIN'
  const subtitle = mode === 'create'
    ? 'Choose a 4-digit PIN to secure your account'
    : 'Enter your 4-digit PIN to continue'

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {subtitle}{'\n'}
            <Text style={styles.phoneNumber}>{formatPhoneForDisplay(phone)}</Text>
          </Text>
        </View>

        <View style={styles.pinContainer}>
          <View style={styles.pinInputs}>
            {pin.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => { inputRefs.current[index] = ref }}
                style={[
                  styles.pinInput,
                  digit && styles.pinInputFilled,
                  error && styles.pinInputError
                ]}
                value={digit}
                onChangeText={(value) => handlePinChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                autoFocus={index === 0}
                editable={!isLoading && !loading}
                secureTextEntry
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
            onPress={() => handleSubmitPIN(pin.join(''))}
            disabled={!canSubmit}
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled
            ]}
          >
            {isLoading || loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>
                  {mode === 'create' ? 'Creating...' : 'Verifying...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'create' ? 'Create PIN' : 'Verify PIN'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onBack}
            style={styles.backButton}
            disabled={isLoading || loading}
          >
            <Text style={styles.backText}>← Change Phone Number</Text>
          </Pressable>
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
  pinContainer: {
    marginBottom: 32
  },
  pinInputs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16
  },
  pinInput: {
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#FFFFFF'
  },
  pinInputFilled: {
    borderColor: '#ff5722', // UrbanFix emergency orange
    backgroundColor: '#FFF4F2'
  },
  pinInputError: {
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
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
    shadowOpacity: 0
  },
  submitButtonText: {
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
  backButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 44
  },
  backText: {
    fontSize: 16,
    color: '#ff5722', // UrbanFix emergency orange
    fontWeight: '600'
  }
})
