// Role selection component for new users
// Implements Requirements 2.1, 2.2, 2.3, 2.4: Immutable role assignment

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native'
import { colors } from '@/constants/theme'
import type { UserRole } from '@/lib/auth'

interface RoleOption {
  role: UserRole
  title: string
  description: string
  iconSource: any
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
    iconSource: require('@/assets/customer-role-icon.png'),
    features: [
      'Book device repairs',
      'Track repair progress',
      'Secure payment protection'
    ]
  },
  {
    role: 'technician',
    title: 'I fix devices',
    description: 'Provide repair services and earn income',
    iconSource: require('@/assets/technician-role-icon.png'),
    features: [
      'Accept repair jobs',
      'Set your own pricing',
      'Receive secure payments'
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

  const getButtonText = () => {
    if (!selectedRole) return 'Select a role to continue'
    
    if (selectedRole === 'customer') {
      return '📱 Continue as Customer'
    } else {
      return '🔧 Continue as Technician'
    }
  }

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
                    <Image
                      source={option.iconSource}
                      style={styles.roleIcon}
                      resizeMode="contain"
                      defaultSource={option.iconSource}
                    />
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
                          <View style={styles.featureBullet}>
                            <Text style={styles.featureCheckmark}>✓</Text>
                          </View>
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
          
          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={[
              styles.continueButton,
              selectedRole && styles.continueButtonActive,
              !canContinue && styles.continueButtonDisabled
            ]}
          >
            {isSubmitting || loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={[
                  styles.continueButtonText,
                  selectedRole && styles.continueButtonTextActive
                ]}>
                  Please wait...
                </Text>
              </View>
            ) : (
              <Text style={[
                styles.continueButtonText,
                selectedRole && styles.continueButtonTextActive
              ]}>
                {getButtonText()}
              </Text>
            )}
          </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32
  },
  header: {
    marginBottom: 28,
    alignItems: 'flex-start'
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'left'
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'left',
    lineHeight: 20
  },
  rolesContainer: {
    gap: 14,
    marginBottom: 28
  },
  roleCard: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF'
  },
  roleCardSelected: {
    borderColor: '#1E3A8A',
    borderWidth: 2,
    backgroundColor: '#EFF6FF'
  },
  roleCardDisabled: {
    opacity: 0.5
  },
  roleCardContent: {
    gap: 14
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  roleIcon: {
    width: 56,
    height: 56
  },
  roleTitleContainer: {
    flex: 1,
    paddingTop: 2
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2
  },
  roleTitleSelected: {
    color: '#111827'
  },
  roleDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18
  },
  roleDescriptionSelected: {
    color: '#6B7280'
  },
  radioButton: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 2
  },
  radioButtonSelected: {
    borderColor: '#1E3A8A',
    borderWidth: 2,
    backgroundColor: '#1E3A8A'
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4
  },
  featuresContainer: {
    gap: 10,
    paddingTop: 4
  },
  featuresTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  featuresTitleSelected: {
    color: '#6B7280'
  },
  featuresList: {
    gap: 7
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  featureBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    marginTop: 1
  },
  featureCheckmark: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    lineHeight: 16
  },
  featureText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    lineHeight: 18
  },
  featureTextSelected: {
    color: '#374151'
  },
  footer: {
    gap: 14
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    backgroundColor: '#FEFCE8',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontWeight: '500',
    lineHeight: 18
  },
  continueButton: {
    backgroundColor: '#E8E8E8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  continueButtonActive: {
    backgroundColor: colors.primary
  },
  continueButtonDisabled: {
    opacity: 0.6
  },
  continueButtonText: {
    color: '#999999',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  continueButtonTextActive: {
    color: '#FFFFFF'
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  }
})
