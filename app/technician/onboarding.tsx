// Technician Onboarding Screen
// Complete verification process for new technicians
// Requirements: 4.1-4.8

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, radius } from '@/constants/theme'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface OnboardingData {
  nin: string
  nin_doc_url: string | null
  shop_address: string
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  guarantor_name: string
  guarantor_phone: string
  guarantor_email: string
}

export default function TechnicianOnboardingScreen() {
  const router = useRouter()
  const userProfile = useAuthStore(state => state.userProfile)
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState<OnboardingData>({
    nin: '',
    nin_doc_url: null,
    shop_address: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    guarantor_name: '',
    guarantor_phone: '',
    guarantor_email: ''
  })

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true
      })

      if (result.canceled) return

      setUploading(true)
      const file = result.assets[0]

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userProfile?.id}_${Date.now()}.${fileExt}`
      const filePath = `nin-documents/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, {
          uri: file.uri,
          name: fileName,
          type: file.mimeType || 'application/octet-stream'
        } as any)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath)

      setFormData({ ...formData, nin_doc_url: publicUrl })
      Alert.alert('Success', 'Document uploaded successfully')
    } catch (error) {
      console.error('Document upload error:', error)
      Alert.alert('Error', 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const validateForm = (): boolean => {
    if (!formData.nin || formData.nin.length !== 11) {
      Alert.alert('Error', 'Please enter a valid 11-digit NIN')
      return false
    }

    if (!formData.nin_doc_url) {
      Alert.alert('Error', 'Please upload your NIN document')
      return false
    }

    if (!formData.shop_address || formData.shop_address.length < 10) {
      Alert.alert('Error', 'Please enter your complete shop address')
      return false
    }

    if (!formData.bank_name || !formData.bank_account_number || !formData.bank_account_name) {
      Alert.alert('Error', 'Please complete all bank details')
      return false
    }

    if (!formData.guarantor_name || !formData.guarantor_phone) {
      Alert.alert('Error', 'Please provide guarantor information')
      return false
    }

    if (!formData.guarantor_phone.match(/^\+234[0-9]{10}$/)) {
      Alert.alert('Error', 'Guarantor phone must be in format +234XXXXXXXXXX')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)

      // Create technician profile
      const { error: profileError } = await supabase
        .from('technician_profiles')
        .insert({
          user_id: userProfile?.id,
          nin: formData.nin,
          nin_doc_url: formData.nin_doc_url,
          shop_address: formData.shop_address,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          bank_account_name: formData.bank_account_name,
          verification_status: 'pending'
        })

      if (profileError) throw profileError

      // Create verification record with guarantor info
      const { error: verificationError } = await supabase
        .from('technician_verifications')
        .insert({
          user_id: userProfile?.id,
          nin: formData.nin,
          nin_document_url: formData.nin_doc_url,
          bank_name: formData.bank_name,
          account_number: formData.bank_account_number,
          account_holder_name: formData.bank_account_name,
          guarantor_name: formData.guarantor_name,
          guarantor_phone: formData.guarantor_phone,
          guarantor_email: formData.guarantor_email,
          status: 'pending'
        })

      if (verificationError) throw verificationError

      Alert.alert(
        'Verification Submitted!',
        'Your documents have been submitted for review. You will be notified once approved (usually within 24-48 hours).',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/technician')
          }
        ]
      )
    } catch (error: any) {
      console.error('Onboarding error:', error)
      Alert.alert('Error', error.message || 'Failed to submit verification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Technician Verification</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '0%' }]} />
            </View>
            <Text style={styles.progressText}>Step 1 of 1</Text>
          </View>

          {/* Intro */}
          <View style={styles.introCard}>
            <Ionicons name="shield-checkmark" size={48} color={colors.secondary} />
            <Text style={styles.introTitle}>Join UrbanFix as a Verified Technician</Text>
            <Text style={styles.introText}>
              Complete this one-time verification to start accepting repair jobs and earning income.
            </Text>
          </View>

          {/* NIN Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="card" size={20} color={colors.primary} /> National ID (NIN)
            </Text>
            
            <Text style={styles.label}>NIN Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.nin}
              onChangeText={(text) => setFormData({ ...formData, nin: text })}
              placeholder="Enter 11-digit NIN"
              keyboardType="number-pad"
              maxLength={11}
            />

            <Text style={styles.label}>Upload NIN Document *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleDocumentPick}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name={formData.nin_doc_url ? "checkmark-circle" : "cloud-upload"}
                    size={24}
                    color={formData.nin_doc_url ? colors.success : colors.primary}
                  />
                  <Text style={styles.uploadButtonText}>
                    {formData.nin_doc_url ? 'Document Uploaded ✓' : 'Upload NIN Card/Slip'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Shop Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="location" size={20} color={colors.primary} /> Shop Address
            </Text>
            
            <Text style={styles.label}>Complete Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.shop_address}
              onChangeText={(text) => setFormData({ ...formData, shop_address: text })}
              placeholder="E.g., Shop 12, Computer Village, Ikeja, Lagos"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Bank Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="cash" size={20} color={colors.primary} /> Bank Account
            </Text>
            
            <Text style={styles.label}>Bank Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.bank_name}
              onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
              placeholder="E.g., GTBank, Access Bank"
            />

            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.bank_account_number}
              onChangeText={(text) => setFormData({ ...formData, bank_account_number: text })}
              placeholder="10-digit account number"
              keyboardType="number-pad"
              maxLength={10}
            />

            <Text style={styles.label}>Account Holder Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.bank_account_name}
              onChangeText={(text) => setFormData({ ...formData, bank_account_name: text })}
              placeholder="Full name as on bank account"
            />
          </View>

          {/* Guarantor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="people" size={20} color={colors.primary} /> Guarantor Information
            </Text>
            
            <Text style={styles.label}>Guarantor Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.guarantor_name}
              onChangeText={(text) => setFormData({ ...formData, guarantor_name: text })}
              placeholder="Full name of guarantor"
            />

            <Text style={styles.label}>Guarantor Phone *</Text>
            <TextInput
              style={styles.input}
              value={formData.guarantor_phone}
              onChangeText={(text) => setFormData({ ...formData, guarantor_phone: text })}
              placeholder="+234XXXXXXXXXX"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Guarantor Email (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.guarantor_email}
              onChangeText={(text) => setFormData({ ...formData, guarantor_email: text })}
              placeholder="guarantor@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={colors.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Why do we need this?</Text>
              <Text style={styles.infoText}>
                • NIN verification ensures platform security{'\n'}
                • Bank details for seamless earnings payouts{'\n'}
                • Guarantor for trust and accountability
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  keyboardView: {
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: spacing.md
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md
  },
  backButton: {
    padding: spacing.xs
  },
  headerTitle: {
    ...typography.headlineSm,
    color: colors.text.primary
  },
  progressContainer: {
    marginBottom: spacing.lg
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 2,
    marginBottom: spacing.xs
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 2
  },
  progressText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center'
  },
  introCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  introTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center'
  },
  introText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20
  },
  section: {
    marginBottom: spacing.lg
  },
  sectionTitle: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md
  },
  label: {
    ...typography.bodyMd,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.bodyMd,
    color: colors.text.primary,
    marginBottom: spacing.md
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  uploadButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md
  },
  uploadButtonText: {
    ...typography.bodyMd,
    color: colors.text.primary,
    marginTop: spacing.xs
  },
  infoCard: {
    backgroundColor: colors.secondary + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.sm
  },
  infoTitle: {
    ...typography.bodyMd,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs
  },
  infoText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    lineHeight: 20
  },
  submitButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitButtonText: {
    ...typography.buttonText,
    color: '#fff'
  }
})
