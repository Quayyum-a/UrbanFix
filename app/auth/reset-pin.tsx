// Reset PIN screen
// For demo purposes only: simulates OTP sending without actually sending SMS
// In production, this should be backed by a secure verification endpoint

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { pinAuthService } from '@/lib/auth'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { checkPhone, clearError } = useAuth()

  const [step, setStep] = useState<'phone' | 'otp' | 'newPin' | 'confirmPin' | 'success'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendOTP = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // First, check if phone exists
      const result = await checkPhone(phone)
      if (!result.success) {
        // checkPhone already set error in store
        setError('Phone number not found')
        setLoading(false)
        return
      }
      // Generate a 6-digit OTP (for demo, we don't actually send SMS)
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOtp(otp)
      // In a real app, we would send this via SMS here
      // For demo, we'll just log it (in actual dev, you might see it in console)
      console.log('OTP for', phone, ':', otp) // eslint-disable-line no-console
      setStep('otp')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [checkPhone])

  const verifyOTP = useCallback(() => {
    if (otp === generatedOtp) {
      setStep('newPin')
    } else {
      setError('Invalid code. Please try again.')
    }
  }, [otp, generatedOtp])

  const validatePin = (pin: string) => {
    return /^\d{4}$/.test(pin)
  }

  const handleReset = useCallback(async () => {
    if (!validatePin(newPin)) {
      setError('PIN must be exactly 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    try {
      setLoading(true)
      setError(null)
      await pinAuthService.resetPIN(phone, newPin)
      setStep('success')
    } catch (err) {
      setError('Failed to reset PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [phone, newPin, confirmPin, pinAuthService])

  const renderContent = () => {
    switch (step) {
      case 'phone':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Reset your PIN</Text>
            <Text style={styles.subTitle}>
              Enter your phone number to reset your PIN
            </Text>
            <TextInput
              style={styles.input}
              placeholder="+234 XXXX XXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button title="Send Code" onPress={sendOTP} disabled={loading} />
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        )
      case 'otp':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.subTitle}>
              We sent a 6-digit code to {phone.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
            />
            <Button title="Verify" onPress={verifyOTP} disabled={loading} />
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        )
      case 'newPin':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Set new PIN</Text>
            <Text style={styles.subTitle}>
              Choose a new 4-digit PIN for your account
            </Text>
            <TextInput
              style={styles.input}
              placeholder="• • • •"
              keyboardType="number-pad"
              value={newPin}
              onChangeText={setNewPin}
              maxLength={4}
              secureTextEntry
            />
            <Button title="Continue" onPress={() => setStep('confirmPin')} disabled={loading} />
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        )
      case 'confirmPin':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Confirm new PIN</Text>
            <Text style={styles.subTitle}>
              Enter your new PIN again to confirm
            </Text>
            <TextInput
              style={styles.input}
              placeholder="• • • •"
              keyboardType="number-pad"
              value={confirmPin}
              onChangeText={setConfirmPin}
              maxLength={4}
              secureTextEntry
            />
            <Button title="Reset PIN" onPress={handleReset} disabled={loading} />
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        )
      case 'success':
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Success!</Text>
            <Text style={styles.subTitle}>
              Your PIN has been reset. You can now log in with your new PIN.
            </Text>
            <Button title="Go to Login" onPress={() => router.replace('/auth/login')} />
          </View>
        )
      default:
        return null
    }
  }

  return (
    <View style={styles.root}>
      {renderContent()}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12
  },
  subTitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB'
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12
  }
})