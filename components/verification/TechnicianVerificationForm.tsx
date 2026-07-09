// Technician verification form component
// Multi-step form for NIN, documents, and bank account details collection
// Requirements: 4.1, 4.2, 4.3

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { DocumentUploadCard } from './DocumentUploadCard'
import { 
  NINValidationService, 
  BVNValidationService, 
  BankAccountValidationService 
} from '@/lib/services/nin-validation'
import type { UploadResult } from '@/lib/services/document-upload'

// Nigerian banks list
const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '526', name: 'Parallex Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
].sort((a, b) => a.name.localeCompare(b.name))

export interface VerificationData {
  nin: string
  bvn: string
  accountNumber: string
  bankCode: string
  bankName: string
  accountName?: string
  idCardUrl?: string
  idCardPath?: string
  addressProofUrl?: string
  addressProofPath?: string
}

export interface TechnicianVerificationFormProps {
  userId: string
  onSubmit: (data: VerificationData) => Promise<void>
  initialData?: Partial<VerificationData>
}

type Step = 'nin' | 'documents' | 'bank'

export function TechnicianVerificationForm({
  userId,
  onSubmit,
  initialData
}: TechnicianVerificationFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>('nin')
  const [submitting, setSubmitting] = useState(false)
  
  // Form data
  const [nin, setNIN] = useState(initialData?.nin || '')
  const [ninError, setNINError] = useState<string | null>(null)
  
  const [bvn, setBVN] = useState(initialData?.bvn || '')
  const [bvnError, setBVNError] = useState<string | null>(null)
  
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '')
  const [accountNumberError, setAccountNumberError] = useState<string | null>(null)
  
  const [selectedBank, setSelectedBank] = useState<typeof NIGERIAN_BANKS[0] | null>(
    initialData?.bankCode 
      ? NIGERIAN_BANKS.find(b => b.code === initialData.bankCode) || null
      : null
  )
  const [showBankPicker, setShowBankPicker] = useState(false)
  
  const [idCardUrl, setIdCardUrl] = useState(initialData?.idCardUrl)
  const [idCardPath, setIdCardPath] = useState(initialData?.idCardPath)
  
  const [addressProofUrl, setAddressProofUrl] = useState(initialData?.addressProofUrl)
  const [addressProofPath, setAddressProofPath] = useState(initialData?.addressProofPath)

  // Validate NIN step
  const validateNINStep = useCallback(() => {
    const validation = NINValidationService.validateNIN(nin)
    if (!validation.isValid) {
      setNINError(validation.error || 'Invalid NIN')
      return false
    }
    setNINError(null)
    return true
  }, [nin])

  // Validate documents step
  const validateDocumentsStep = useCallback(() => {
    if (!idCardUrl || !idCardPath) {
      Alert.alert('Missing Document', 'Please upload your ID card')
      return false
    }
    if (!addressProofUrl || !addressProofPath) {
      Alert.alert('Missing Document', 'Please upload your address proof')
      return false
    }
    return true
  }, [idCardUrl, idCardPath, addressProofUrl, addressProofPath])

  // Validate bank details step
  const validateBankStep = useCallback(() => {
    // Validate BVN
    const bvnValidation = BVNValidationService.validateBVN(bvn)
    if (!bvnValidation.isValid) {
      setBVNError(bvnValidation.error || 'Invalid BVN')
      return false
    }
    setBVNError(null)

    // Validate account number
    const accountValidation = BankAccountValidationService.validateAccountNumber(accountNumber)
    if (!accountValidation.isValid) {
      setAccountNumberError(accountValidation.error || 'Invalid account number')
      return false
    }
    setAccountNumberError(null)

    // Validate bank selection
    if (!selectedBank) {
      Alert.alert('Bank Required', 'Please select your bank')
      return false
    }

    return true
  }, [bvn, accountNumber, selectedBank])

  // Handle next button
  const handleNext = useCallback(() => {
    if (currentStep === 'nin') {
      if (validateNINStep()) {
        setCurrentStep('documents')
      }
    } else if (currentStep === 'documents') {
      if (validateDocumentsStep()) {
        setCurrentStep('bank')
      }
    }
  }, [currentStep, validateNINStep, validateDocumentsStep])

  // Handle back button
  const handleBack = useCallback(() => {
    if (currentStep === 'documents') {
      setCurrentStep('nin')
    } else if (currentStep === 'bank') {
      setCurrentStep('documents')
    }
  }, [currentStep])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateBankStep()) {
      return
    }

    try {
      setSubmitting(true)

      const data: VerificationData = {
        nin: NINValidationService.validateNIN(nin).formatted!,
        bvn: BVNValidationService.validateBVN(bvn).formatted!,
        accountNumber: BankAccountValidationService.validateAccountNumber(accountNumber).formatted!,
        bankCode: selectedBank!.code,
        bankName: selectedBank!.name,
        idCardUrl,
        idCardPath,
        addressProofUrl,
        addressProofPath
      }

      await onSubmit(data)
    } catch (error) {
      console.error('❌ [Verification] Submit error:', error)
      Alert.alert(
        'Submission Failed',
        'Failed to submit verification. Please try again.',
        [{ text: 'OK' }]
      )
    } finally {
      setSubmitting(false)
    }
  }, [
    nin, bvn, accountNumber, selectedBank,
    idCardUrl, idCardPath, addressProofUrl, addressProofPath,
    validateBankStep, onSubmit
  ])

  // Progress indicator
  const getStepNumber = (step: Step): number => {
    switch (step) {
      case 'nin': return 1
      case 'documents': return 2
      case 'bank': return 3
    }
  }

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {(['nin', 'documents', 'bank'] as Step[]).map((step, index) => {
        const stepNumber = index + 1
        const isActive = currentStep === step
        const isCompleted = getStepNumber(currentStep) > stepNumber

        return (
          <View key={step} style={styles.progressStep}>
            <View style={[
              styles.progressCircle,
              isActive && styles.progressCircleActive,
              isCompleted && styles.progressCircleCompleted
            ]}>
              {isCompleted ? (
                <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
              ) : (
                <Text style={[
                  styles.progressNumber,
                  isActive && styles.progressNumberActive
                ]}>
                  {stepNumber}
                </Text>
              )}
            </View>
            {index < 2 && (
              <View style={[
                styles.progressLine,
                isCompleted && styles.progressLineCompleted
              ]} />
            )}
          </View>
        )
      })}
    </View>
  )

  // Step 1: NIN Collection
  const renderNINStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: National Identity Number</Text>
      <Text style={styles.stepDescription}>
        Enter your 11-digit NIN for identity verification
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>NIN *</Text>
        <TextInput
          style={[styles.input, ninError && styles.inputError]}
          value={nin}
          onChangeText={(text) => {
            setNIN(text)
            setNINError(null)
          }}
          placeholder="12345678901"
          keyboardType="number-pad"
          maxLength={11}
          autoFocus
        />
        {ninError && (
          <Text style={styles.errorText}>{ninError}</Text>
        )}
        <Text style={styles.inputHint}>
          Your NIN is required for technician verification
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Your NIN will be securely stored and used only for verification purposes
        </Text>
      </View>
    </View>
  )

  // Step 2: Document Upload
  const renderDocumentsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Identity Documents</Text>
      <Text style={styles.stepDescription}>
        Upload clear photos of your ID card and address proof
      </Text>

      <DocumentUploadCard
        title="Government-Issued ID Card"
        description="Upload your National ID, Driver's License, or International Passport"
        documentType="id_card"
        userId={userId}
        onUploadComplete={(result: UploadResult) => {
          setIdCardUrl(result.url)
          setIdCardPath(result.path)
        }}
        initialUrl={idCardUrl}
      />

      <DocumentUploadCard
        title="Proof of Address"
        description="Upload a recent utility bill, bank statement, or tenancy agreement"
        documentType="address_proof"
        userId={userId}
        onUploadComplete={(result: UploadResult) => {
          setAddressProofUrl(result.url)
          setAddressProofPath(result.path)
        }}
        initialUrl={addressProofUrl}
      />
    </View>
  )

  // Step 3: Bank Account Details
  const renderBankStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Bank Account Details</Text>
      <Text style={styles.stepDescription}>
        Enter your bank details for receiving payments
      </Text>

      {/* BVN */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Bank Verification Number (BVN) *</Text>
        <TextInput
          style={[styles.input, bvnError && styles.inputError]}
          value={bvn}
          onChangeText={(text) => {
            setBVN(text)
            setBVNError(null)
          }}
          placeholder="12345678901"
          keyboardType="number-pad"
          maxLength={11}
        />
        {bvnError && (
          <Text style={styles.errorText}>{bvnError}</Text>
        )}
        <Text style={styles.inputHint}>
          Required for account verification
        </Text>
      </View>

      {/* Bank Selection */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Bank *</Text>
        <Pressable
          style={styles.selectButton}
          onPress={() => setShowBankPicker(!showBankPicker)}
        >
          <Text style={[
            styles.selectButtonText,
            !selectedBank && styles.selectButtonPlaceholder
          ]}>
            {selectedBank?.name || 'Select your bank'}
          </Text>
          <Ionicons 
            name={showBankPicker ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={colors.text.secondary} 
          />
        </Pressable>

        {showBankPicker && (
          <ScrollView style={styles.bankPicker} nestedScrollEnabled>
            {NIGERIAN_BANKS.map((bank) => (
              <Pressable
                key={bank.code}
                style={[
                  styles.bankOption,
                  selectedBank?.code === bank.code && styles.bankOptionSelected
                ]}
                onPress={() => {
                  setSelectedBank(bank)
                  setShowBankPicker(false)
                }}
              >
                <Text style={[
                  styles.bankOptionText,
                  selectedBank?.code === bank.code && styles.bankOptionTextSelected
                ]}>
                  {bank.name}
                </Text>
                {selectedBank?.code === bank.code && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Account Number */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Account Number *</Text>
        <TextInput
          style={[styles.input, accountNumberError && styles.inputError]}
          value={accountNumber}
          onChangeText={(text) => {
            setAccountNumber(text)
            setAccountNumberError(null)
          }}
          placeholder="0123456789"
          keyboardType="number-pad"
          maxLength={10}
        />
        {accountNumberError && (
          <Text style={styles.errorText}>{accountNumberError}</Text>
        )}
        <Text style={styles.inputHint}>
          10-digit NUBAN account number
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="shield-checkmark" size={20} color={colors.success} />
        <Text style={styles.infoText}>
          Your bank details are encrypted and securely stored. Payments will be transferred to this account after job completion.
        </Text>
      </View>
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderProgressIndicator()}

        {currentStep === 'nin' && renderNINStep()}
        {currentStep === 'documents' && renderDocumentsStep()}
        {currentStep === 'bank' && renderBankStep()}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep !== 'nin' && (
            <Pressable
              style={styles.backButton}
              onPress={handleBack}
              disabled={submitting}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          )}

          {currentStep === 'bank' ? (
            <Pressable
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </>
              ) : (
                <Text style={styles.submitButtonText}>Submit for Verification</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressCircleActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  progressCircleCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  progressNumber: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.secondary
  },
  progressNumberActive: {
    color: colors.onPrimary
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.outline,
    marginHorizontal: spacing.xs / 2
  },
  progressLineCompleted: {
    backgroundColor: colors.success
  },
  stepContainer: {
    marginBottom: spacing.xl
  },
  stepTitle: {
    ...typography.headlineMd,
    color: colors.text.primary,
    marginBottom: spacing.xs
  },
  stepDescription: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    marginBottom: spacing.lg
  },
  inputContainer: {
    marginBottom: spacing.lg
  },
  inputLabel: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs
  },
  input: {
    ...typography.bodyLg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    minHeight: 56
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorContainer
  },
  inputHint: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    marginTop: spacing.xs / 2
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56
  },
  selectButtonText: {
    ...typography.bodyLg,
    color: colors.text.primary
  },
  selectButtonPlaceholder: {
    color: colors.text.secondary
  },
  bankPicker: {
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    marginTop: spacing.xs
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  bankOptionSelected: {
    backgroundColor: colors.primaryContainer
  },
  bankOptionText: {
    ...typography.bodyLg,
    color: colors.text.primary
  },
  bankOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600'
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginTop: spacing.md
  },
  infoText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flex: 1
  },
  backButtonText: {
    ...typography.buttonText,
    color: colors.text.secondary,
    marginLeft: spacing.xs
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flex: 2,
    ...shadows.level2
  },
  nextButtonText: {
    ...typography.buttonText,
    color: colors.onPrimary,
    marginRight: spacing.xs
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flex: 2,
    gap: spacing.xs,
    ...shadows.level2
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    ...typography.buttonText,
    color: colors.onPrimary
  }
})
