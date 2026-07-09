// Part Request Form Component
// Allows technicians to request parts not in the catalogue
// Requirements: 25.1, 25.2

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '@/constants/theme'
import { PartRequestService } from '@/lib/services/part-request-service'
import type { CreatePartRequestDTO, PartRequestFormData, PartRequestFormErrors } from '@/types/parts-request.types'

interface PartRequestFormProps {
  technicianId: string
  onSuccess?: (requestId: string) => void
  onCancel?: () => void
  initialData?: Partial<PartRequestFormData>
}

export function PartRequestForm({
  technicianId,
  onSuccess,
  onCancel,
  initialData
}: PartRequestFormProps) {
  const [formData, setFormData] = useState<PartRequestFormData>({
    device_brand: initialData?.device_brand || '',
    device_model: initialData?.device_model || '',
    repair_category: initialData?.repair_category || '',
    part_name: initialData?.part_name || '',
    part_description: initialData?.part_description || '',
    estimated_price: initialData?.estimated_price || ''
  })

  const [errors, setErrors] = useState<PartRequestFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: PartRequestFormErrors = {}

    // Device brand validation
    if (!formData.device_brand.trim()) {
      newErrors.device_brand = 'Device brand is required'
    }

    // Device model validation
    if (!formData.device_model.trim()) {
      newErrors.device_model = 'Device model is required'
    }

    // Repair category validation
    if (!formData.repair_category.trim()) {
      newErrors.repair_category = 'Repair category is required'
    }

    // Part name validation
    if (!formData.part_name.trim()) {
      newErrors.part_name = 'Part name is required'
    } else if (formData.part_name.length < 3) {
      newErrors.part_name = 'Part name must be at least 3 characters'
    }

    // Part description validation
    if (!formData.part_description.trim()) {
      newErrors.part_description = 'Description is required'
    } else if (formData.part_description.length < 10) {
      newErrors.part_description = 'Description must be at least 10 characters'
    }

    // Estimated price validation
    if (!formData.estimated_price) {
      newErrors.estimated_price = 'Estimated price is required'
    } else {
      const price = parseFloat(formData.estimated_price)
      if (isNaN(price) || price <= 0) {
        newErrors.estimated_price = 'Price must be greater than 0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkForDuplicates = async (): Promise<boolean> => {
    if (!formData.device_brand || !formData.device_model || !formData.repair_category || !formData.part_name) {
      return false
    }

    setCheckingDuplicate(true)
    const result = await PartRequestService.checkDuplicateRequest(
      technicianId,
      formData.device_brand,
      formData.device_model,
      formData.repair_category,
      formData.part_name
    )
    setCheckingDuplicate(false)

    if (result.success && result.data) {
      Alert.alert(
        'Duplicate Request',
        'You already have a pending request for a similar part. Please wait for review or update your existing request.',
        [{ text: 'OK' }]
      )
      return true
    }

    return false
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form')
      return
    }

    // Check for duplicates
    const hasDuplicate = await checkForDuplicates()
    if (hasDuplicate) {
      return
    }

    setSubmitting(true)

    // Convert price from Naira to kobo
    const priceInKobo = PartRequestService.nairaToKobo(parseFloat(formData.estimated_price))

    const requestData: CreatePartRequestDTO = {
      device_brand: formData.device_brand.trim(),
      device_model: formData.device_model.trim(),
      repair_category: formData.repair_category.trim(),
      part_name: formData.part_name.trim(),
      part_description: formData.part_description.trim(),
      estimated_price: priceInKobo
    }

    const result = await PartRequestService.createRequest(technicianId, requestData)

    setSubmitting(false)

    if (result.success && result.data) {
      Alert.alert(
        'Request Submitted',
        'Your part request has been submitted for admin review. You will be notified when it is reviewed.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                device_brand: '',
                device_model: '',
                repair_category: '',
                part_name: '',
                part_description: '',
                estimated_price: ''
              })
              setErrors({})
              if (result.data) {
                onSuccess?.(result.data.id)
              }
            }
          }
        ]
      )
    } else {
      Alert.alert('Error', result.error || 'Failed to submit request. Please try again.')
    }
  }

  const updateField = (field: keyof PartRequestFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="add-circle-outline" size={48} color={colors.primary} />
          <Text style={styles.title}>Request New Part</Text>
          <Text style={styles.subtitle}>
            Can't find a part in our catalogue? Submit a request and we'll review it.
          </Text>
        </View>

        {/* Device Brand */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Device Brand *</Text>
          <TextInput
            style={[styles.input, errors.device_brand && styles.inputError]}
            placeholder="e.g., Apple, Samsung, Google"
            value={formData.device_brand}
            onChangeText={(value) => updateField('device_brand', value)}
            autoCapitalize="words"
          />
          {errors.device_brand && (
            <Text style={styles.errorText}>{errors.device_brand}</Text>
          )}
        </View>

        {/* Device Model */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Device Model *</Text>
          <TextInput
            style={[styles.input, errors.device_model && styles.inputError]}
            placeholder="e.g., iPhone 14 Pro, Galaxy S23"
            value={formData.device_model}
            onChangeText={(value) => updateField('device_model', value)}
            autoCapitalize="words"
          />
          {errors.device_model && (
            <Text style={styles.errorText}>{errors.device_model}</Text>
          )}
        </View>

        {/* Repair Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Repair Category *</Text>
          <TextInput
            style={[styles.input, errors.repair_category && styles.inputError]}
            placeholder="e.g., screen_replacement, battery_replacement"
            value={formData.repair_category}
            onChangeText={(value) => updateField('repair_category', value)}
            autoCapitalize="none"
          />
          {errors.repair_category && (
            <Text style={styles.errorText}>{errors.repair_category}</Text>
          )}
        </View>

        {/* Part Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Part Name *</Text>
          <TextInput
            style={[styles.input, errors.part_name && styles.inputError]}
            placeholder="e.g., OLED Display Assembly"
            value={formData.part_name}
            onChangeText={(value) => updateField('part_name', value)}
            autoCapitalize="words"
          />
          {errors.part_name && (
            <Text style={styles.errorText}>{errors.part_name}</Text>
          )}
        </View>

        {/* Part Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Part Description * (min 10 characters)</Text>
          <TextInput
            style={[styles.textArea, errors.part_description && styles.inputError]}
            placeholder="Provide detailed description of the part, including specifications, compatibility, and any special requirements..."
            value={formData.part_description}
            onChangeText={(value) => updateField('part_description', value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {formData.part_description.length} characters
          </Text>
          {errors.part_description && (
            <Text style={styles.errorText}>{errors.part_description}</Text>
          )}
        </View>

        {/* Estimated Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estimated Price (₦) *</Text>
          <TextInput
            style={[styles.input, errors.estimated_price && styles.inputError]}
            placeholder="e.g., 50000"
            value={formData.estimated_price}
            onChangeText={(value) => updateField('estimated_price', value)}
            keyboardType="decimal-pad"
          />
          {errors.estimated_price && (
            <Text style={styles.errorText}>{errors.estimated_price}</Text>
          )}
          <Text style={styles.helpText}>
            Enter your best estimate in Naira. Admin will review and may adjust.
          </Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Your request will be reviewed by our admin team. If approved, the part will be added to
            the catalogue and you'll be notified.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {onCancel && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onCancel}
              disabled={submitting}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || checkingDuplicate}
          >
            {submitting || checkingDuplicate ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#fff" />
                <Text style={styles.buttonPrimaryText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    marginBottom: 30
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8
  },
  input: {
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text
  },
  textArea: {
    minHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text
  },
  inputError: {
    borderColor: colors.error
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'right'
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    marginLeft: 8,
    lineHeight: 18
  },
  actions: {
    flexDirection: 'row',
    gap: 12
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  buttonPrimary: {
    backgroundColor: colors.primary
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  }
})
