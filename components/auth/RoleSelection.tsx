// Role selection component for new users
// Implements Requirements 2.1, 2.2, 2.3, 2.4: Immutable role assignment

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView
} from 'react-native'
import { Button } from '@/components/ui/Button'
import type { UserRole } from '@/lib/auth'

interface RoleOption {
  role: UserRole
  title: string
  description: string
  icon: string
  features: string[]
}

interface RoleSelectionProps {
  onRoleSelected: (role: UserRole) => void
  onError: (error: string) => void
  loading?: boolean
}

const roleOptions: RoleOption[] = [
  {
    role: 'customer',
    title: 'I need repairs',
    description: 'Book device repairs from verified technicians',
    icon: '📱',
    features: [
      'Book device repairs',
      'Track repair progress',
      'Secure payment protection',
      'Rate and review technicians',
      'Chat with technicians'
    ]
  },
  {
    role: 'technician',
    title: 'I fix devices',
    description: 'Provide repair services and earn income',
    icon: '🔧',
    features: [
      'Accept repair jobs',
      'Set your own pricing',
      'Receive secure payments',
      'Build your reputation',
      'Manage your availability'
    ]
  }
]

export function RoleSelection({ onRoleSelected, onError, loading = false }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRoleSelect = useCallback((role: UserRole) => {
    if (!loading && !isSubmitting) {
      setSelectedRole(role)
    }
  }, [loading, isSubmitting])

  const handleContinue = useCallback(async () => {
    if (!selectedRole) {
      onError('Please select your role to continue')
      return
    }

    try {
      setIsSubmitting(true)
      // Role selection is handled by parent component
      onRoleSelected(selectedRole)
    } catch (error) {
      onError('Failed to continue. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedRole, onRoleSelected, onError])

  const canContinue = selectedRole && !loading && !isSubmitting

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Let us know how you plan to use UrbanFix
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {roleOptions.map((option) => {
            const isSelected = selectedRole === option.role
            
            return (
              <Pressable
                key={option.role}
                onPress={() => handleRoleSelect(option.role)}
                style={[
                  styles.roleCard,
                  isSelected && styles.roleCardSelected,
                  (loading || isSubmitting) && styles.roleCardDisabled
                ]}
                disabled={loading || isSubmitting}
              >
                <View style={styles.roleCardContent}>
                  <View style={styles.roleHeader}>
                    <View style={styles.roleIcon}>
                      <Text style={styles.roleIconText}>{option.icon}</Text>
                    </View>
                    <View style={styles.roleTitleContainer}>
                      <Text style={[
                        styles.roleTitle,
                        isSelected && styles.roleTitleSelected
                      ]}>
                        {option.title}
                      </Text>
                      <Text style={[
                        styles.roleDescription,
                        isSelected && styles.roleDescriptionSelected
                      ]}>
                        {option.description}
                      </Text>
                    </View>
                    <View style={[
                      styles.radioButton,
                      isSelected && styles.radioButtonSelected
                    ]}>
                      {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                  </View>
                  
                  <View style={styles.featuresContainer}>
                    <Text style={[
                      styles.featuresTitle,
                      isSelected && styles.featuresTitleSelected
                    ]}>
                      What you can do:
                    </Text>
                    <View style={styles.featuresList}>
                      {option.features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                          <View style={styles.featureBullet} />
                          <Text style={[
                            styles.featureText,
                            isSelected && styles.featureTextSelected
                          ]}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.warningText}>
            ⚠️ Important: Your role cannot be changed later
          </Text>
          
          <Button
            onPress={handleContinue}
            disabled={!canContinue}
            style={[
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled
            ]}
          >
            {isSubmitting || loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.continueButtonText}>Please wait...</Text>
              </View>
            ) : (
              <Text style={styles.continueButtonText}>
                Continue as {selectedRole ? roleOptions.find(r => r.role === selectedRole)?.title.toLowerCase() : 'User'}
              </Text>
            )}
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32
  },
  header: {
    marginBottom: 32,
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
  rolesContainer: {
    gap: 16,
    marginBottom: 32
  },
  roleCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF'
  },
  roleCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF'
  },
  roleCardDisabled: {
    opacity: 0.6
  },
  roleCardContent: {
    gap: 16
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  roleIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  roleIconText: {
    fontSize: 24
  },
  roleTitleContainer: {
    flex: 1
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  roleTitleSelected: {
    color: '#1D4ED8'
  },
  roleDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22
  },
  roleDescriptionSelected: {
    color: '#1E40AF'
  },
  radioButton: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioButtonSelected: {
    borderColor: '#3B82F6'
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6
  },
  featuresContainer: {
    gap: 12
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  },
  featuresTitleSelected: {
    color: '#1D4ED8'
  },
  featuresList: {
    gap: 8
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  featureBullet: {
    width: 6,
    height: 6,
    backgroundColor: '#9CA3AF',
    borderRadius: 3
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1
  },
  featureTextSelected: {
    color: '#1E40AF'
  },
  footer: {
    gap: 16
  },
  warningText: {
    fontSize: 14,
    color: '#D97706',
    textAlign: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
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
  }
})