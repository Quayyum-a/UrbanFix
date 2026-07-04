// Profile setup component for new users after role selection
// Implements Requirements 3.1, 3.2: Full name entry and profile completion

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView
} from 'react-native'
import { Button } from '@/components/ui/Button'
import type { UserRole } from '@/lib/auth'

interface ProfileSetupProps {
  phone: string
  role: UserRole
  onComplete: (fullName: string) => void
  onError: (error: string) => void
  loading?: boolean
}

export function ProfileSetup({ 
  phone, 
  role, 
  onComplete, 
  onError, 
  loading = false 
}: ProfileSetupProps) {
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
      return { isValid: false, error: 'Name must be at least 2 characters long' }
    }
    
    if (trimmedName.length > 100) {
      return { isValid: false, error: 'Name must be less than 100 characters' }
    }
    
    // Check for at least one space (to encourage first + last name)
    const hasSpace = /\s/.test(trimmedName)
    if (!hasSpace) {
      return { isValid: false, error: 'Please enter your first and last name' }
    }
    
    // Basic name validation (letters, spaces, common punctuation)
    const nameRegex = /^[a-zA-Z\s\-'.]+$/
    if (!nameRegex.test(trimmedName)) {
      return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' }
    }
    
    return { isValid: true }
  }, [])

  // Handle name input change
  const handleNameChange = useCallback((text: string) => {
    setFullName(text)
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null)
    }
  }, [validationError])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true)
      setValidationError(null)

      // Validate full name
      const validation = validateFullName(fullName)
      if (!validation.isValid) {
        setValidationError(validation.error!)
        return
      }

      onComplete(fullName.trim())
    } catch (error) {
      const errorMessage = 'Failed to complete setup. Please try again.'
      setValidationError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [fullName, validateFullName, onComplete, onError])

  // Get role-specific content
  const getRoleContent = () => {
    switch (role) {
      case 'customer':
        return {
          title: 'Complete Your Profile',
          subtitle: 'Tell us your name so technicians know who they\'re helping',
          nextSteps: 'Next: Set up your location for device pickup'
        }
      case 'technician':
        return {
          title: 'Set Up Your Profile',
          subtitle: 'Customers will see this information when booking repairs',
          nextSteps: 'Next: Complete verification and add your business details'
        }
      default:
        return {
          title: 'Complete Your Profile',
          subtitle: 'Tell us a bit about yourself',
          nextSteps: 'Almost done!'
        }
    }
  }

  const roleContent = getRoleContent()
  const validation = validateFullName(fullName)
  const canSubmit = validation.isValid && !isSubmitting && !loading

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.roleIndicator}>
              <Text style={styles.roleEmoji}>
                {role === 'customer' ? '👤' : '🔧'}
              </Text>
            </View>
            <Text style={styles.title}>{roleContent.title}</Text>
            <Text style={styles.subtitle}>{roleContent.subtitle}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={[
                  styles.nameInput,
                  validationError && styles.nameInputError
                ]}
                value={fullName}
                onChangeText={handleNameChange}
                placeholder="Enter your first and last name"
                placeholderTextColor="#9CA3AF"
                autoFocus
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                editable={!isSubmitting && !loading}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              
              {validationError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{validationError}</Text>
                </View>
              )}
              
              <Text style={styles.helperText}>
                This will be visible to other users on the platform
              </Text>
            </View>

            <View style={styles.phoneInfoContainer}>
              <Text style={styles.phoneInfoLabel}>Phone Number</Text>
              <View style={styles.phoneInfoValue}>
                <Text style={styles.phoneInfoText}>
                  {phone.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')}
                </Text>
                <Text style={styles.verifiedBadge}>✓ Verified</Text>
              </View>
            </View>

            <Button
              title={
                isSubmitting || loading 
                  ? 'Setting up...' 
                  : 'Continue'
              }
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.nextStepsContainer}>
              <Text style={styles.nextStepsTitle}>What's next?</Text>
              <Text style={styles.nextStepsText}>{roleContent.nextSteps}</Text>
            </View>
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
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32
  },
  header: {
    alignItems: 'center',
    marginBottom: 40
  },
  roleIndicator: {
    width: 72,
    height: 72,
    backgroundColor: '#EFF6FF',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  roleEmoji: {
    fontSize: 32
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
  formContainer: {
    gap: 24,
    marginBottom: 32
  },
  inputContainer: {
    gap: 8
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4
  },
  nameInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#111827',
    backgroundColor: '#FFFFFF'
  },
  nameInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  errorContainer: {
    paddingHorizontal: 4
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 20
  },
  helperText: {
    fontSize: 13,
    color: '#9CA3AF',
    paddingHorizontal: 4
  },
  phoneInfoContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16
  },
  phoneInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4
  },
  phoneInfoValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  phoneInfoText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500'
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500'
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  continueButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6
  },
  continueButtonText: {
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
    alignItems: 'center'
  },
  nextStepsContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 4
  },
  nextStepsText: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 20
  }
})