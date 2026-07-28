// Technician onboarding screen - separate from customer profile setup
// Collects basic info: full name only (no location required)
// Technician-specific verification happens after registration

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable
} from 'react-native'
import { Button } from '@/components/ui/Button'

interface TechnicianOnboardingProps {
  phone: string
  onComplete: (fullName: string, latitude?: number, longitude?: number, address?: string) => void
  onError: (error: string) => void
  loading?: boolean
  onBack: () => void
}

export function TechnicianOnboarding({
  phone,
  onComplete,
  onError,
  loading = false,
  onBack
}: TechnicianOnboardingProps) {
  const [fullName, setFullName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Validate full name
  const validateFullName = useCallback((name: string): { isValid: boolean; error?: string } => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return { isValid: false, error: 'Please enter your full name' }
    }

    if (trimmedName.length < 2) {
      return { isValid: false, error: 'Name must be at least 2 characters' }
    }

    if (trimmedName.length > 100) {
      return { isValid: false, error: 'Name must be less than 100 characters' }
    }

    // Basic name validation
    const nameRegex = /^[a-zA-Z\s\-'.]+$/
    if (!nameRegex.test(trimmedName)) {
      return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' }
    }

    return { isValid: true }
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      setValidationError(null)

      // Validate name
      const nameValidation = validateFullName(fullName)
      if (!nameValidation.isValid) {
        setValidationError(nameValidation.error)
        return
      }

      setIsSubmitting(true)
      // For technicians, no location is required
      // Just pass the name to complete registration
      onComplete(fullName.trim())
    } catch (error) {
      const errorMessage = 'Failed to complete profile. Please try again.'
      setValidationError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [fullName, validateFullName, onComplete, onError])

  const nameValidation = validateFullName(fullName)
  const canSubmit = nameValidation.isValid && !isSubmitting && !loading

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeEmoji}>🔧</Text>
            </View>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>
              Customers will see this information when booking your services
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name Input */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  validationError && fullName && !nameValidation.isValid && styles.inputError
                ]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                autoFocus
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                editable={!isSubmitting && !loading}
                returnKeyType="next"
              />
              <Text style={styles.helperText}>
                This is visible to customers
              </Text>
            </View>

            {/* Phone Display */}
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneDisplay}>
                <Text style={styles.phoneText}>
                  {phone.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')}
                </Text>
                <Text style={styles.badge}>✓ Verified</Text>
              </View>
            </View>

            {/* Validation Error */}
            {validationError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{validationError}</Text>
              </View>
            )}

            {/* Submit Button */}
            <Button
              title={isSubmitting || loading ? 'Setting up...' : 'Continue to Dashboard'}
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Next Steps</Text>
            <Text style={styles.infoText}>
              After this, you'll complete verification and set up your pricing before accepting jobs
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollView: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32
  },
  header: {
    marginBottom: 28,
    alignItems: 'center'
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  badgeEmoji: {
    fontSize: 24
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  },
  form: {
    gap: 16,
    marginBottom: 24
  },
  field: {
    gap: 8
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 0.2
  },
  required: {
    color: '#DC2626'
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF'
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    paddingHorizontal: 2
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  phoneText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 9
  },
  errorBoxText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 16
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 3,
    textAlign: 'center'
  },
  infoText: {
    fontSize: 12,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 17
  }
})
