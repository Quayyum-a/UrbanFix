// Enhanced Profile Setup Component
// Complete profile setup flow with avatar upload and location services
// Implements Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Pressable,
  Modal
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AvatarUpload } from './AvatarUpload'
import { AddressPicker, LocationPermission } from '@/components/location'
import { profileService, locationService, uploadService } from '@/lib/services'
import type { UserRole } from '@/lib/auth'
import type { LocationCoordinates } from '@/lib/services'

interface EnhancedProfileSetupProps {
  phone: string
  role: UserRole
  userId: string
  onComplete: (profileData: {
    fullName: string
    avatarUrl?: string
    location?: LocationCoordinates
    address?: string
  }) => void
  onError: (error: string) => void
  loading?: boolean
}

interface FormData {
  fullName: string
  avatarUrl: string | null
  address: string
  location: LocationCoordinates | null
  formattedAddress?: string
}

interface FormErrors {
  fullName?: string
  address?: string
  location?: string
}

type ModalType = 'none' | 'locationPermission' | 'addressPicker'

export function EnhancedProfileSetup({ 
  phone, 
  role, 
  userId,
  onComplete, 
  onError, 
  loading = false 
}: EnhancedProfileSetupProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    avatarUrl: null,
    address: '',
    location: null
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [step, setStep] = useState<'basic' | 'location'>('basic')
  const [activeModal, setActiveModal] = useState<ModalType>('none')
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null)

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
  // Validate address (for customers)
  const validateAddress = useCallback((address: string): { isValid: boolean; error?: string } => {
    if (role !== 'customer') {
      return { isValid: true }
    }
    
    if (!address || address.trim().length < 10) {
      return { isValid: false, error: 'Please provide a valid pickup address (minimum 10 characters)' }
    }

    const addressValidation = locationService.validateNigerianAddress(address)
    return addressValidation
  }, [role])

  // Handle name input change
  const handleNameChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, fullName: text }))
    
    if (errors.fullName) {
      setErrors(prev => ({ ...prev, fullName: undefined }))
    }
  }, [errors.fullName])

  // Handle address input change
  const handleAddressChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, address: text }))
    
    if (errors.address) {
      setErrors(prev => ({ ...prev, address: undefined }))
    }
  }, [errors.address])

  // Handle avatar selection
  const handleAvatarSelected = useCallback(async (imageUri: string) => {
    try {
      setUploadingAvatar(true)
      
      const uploadResult = await uploadService.uploadProfileImage(userId, imageUri)
      
      if (uploadResult.success) {
        setFormData(prev => ({ ...prev, avatarUrl: uploadResult.url! }))
      } else {
        Alert.alert('Upload Error', uploadResult.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      Alert.alert('Upload Error', 'Failed to upload profile picture')
    } finally {
      setUploadingAvatar(false)
    }
  }, [userId])

  // Handle avatar removal
  const handleAvatarRemoved = useCallback(() => {
    setFormData(prev => ({ ...prev, avatarUrl: null }))
  }, [])

  // Check location permissions on location step
  const checkLocationPermissions = useCallback(async () => {
    if (hasLocationPermission !== null) return
    
    try {
      const hasPermission = await locationService.hasLocationPermissions()
      setHasLocationPermission(hasPermission)
      
      if (!hasPermission) {
        setActiveModal('locationPermission')
      }
    } catch (error) {
      console.error('Check location permissions error:', error)
      setHasLocationPermission(false)
    }
  }, [hasLocationPermission])

  // Handle location permission granted
  const handleLocationPermissionGranted = useCallback(() => {
    setHasLocationPermission(true)
    setActiveModal('none')
  }, [])

  // Handle location permission denied
  const handleLocationPermissionDenied = useCallback(() => {
    setHasLocationPermission(false)
    setActiveModal('none')
    // User can still proceed with manual address entry
  }, [])

  // Handle address picker selection
  const handleAddressSelected = useCallback((addressData: {
    text: string
    coordinates: LocationCoordinates
    formattedAddress?: string
  }) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.text,
      location: addressData.coordinates,
      formattedAddress: addressData.formattedAddress
    }))
    setErrors(prev => ({ ...prev, address: undefined, location: undefined }))
    setActiveModal('none')
  }, [])

  // Handle address picker cancel
  const handleAddressPickerCancel = useCallback(() => {
    setActiveModal('none')
  }, [])

  // Open address picker
  const handleOpenAddressPicker = useCallback(async () => {
    // Check location permissions first if not checked
    if (hasLocationPermission === null) {
      await checkLocationPermissions()
    }
    
    setActiveModal('addressPicker')
  }, [hasLocationPermission, checkLocationPermissions])
  // Get current location
  const handleGetCurrentLocation = useCallback(async () => {
    try {
      setGettingLocation(true)
      setErrors(prev => ({ ...prev, location: undefined }))

      const locationResult = await locationService.getCurrentLocation()
      
      if (locationResult.success && locationResult.location) {
        setFormData(prev => ({ ...prev, location: locationResult.location! }))
        
        // Try to reverse geocode to get address
        const reverseGeocodeResult = await locationService.reverseGeocode(locationResult.location)
        if (reverseGeocodeResult.success && reverseGeocodeResult.address) {
          setFormData(prev => ({ ...prev, address: reverseGeocodeResult.address! }))
        }
      } else {
        setErrors(prev => ({ 
          ...prev, 
          location: locationResult.error || 'Failed to get current location' 
        }))
      }
    } catch (error) {
      console.error('Get current location error:', error)
      setErrors(prev => ({ ...prev, location: 'Failed to get current location' }))
    } finally {
      setGettingLocation(false)
    }
  }, [])

  // Geocode address to get coordinates
  const geocodeAddress = useCallback(async (address: string) => {
    try {
      const geocodeResult = await locationService.geocodeAddress(address)
      if (geocodeResult.success && geocodeResult.location) {
        setFormData(prev => ({ ...prev, location: geocodeResult.location! }))
        setErrors(prev => ({ ...prev, location: undefined }))
      } else {
        setErrors(prev => ({ 
          ...prev, 
          location: geocodeResult.error || 'Could not find location for this address' 
        }))
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      setErrors(prev => ({ ...prev, location: 'Failed to verify address location' }))
    }
  }, [])
  // Handle step progression
  const handleNextStep = useCallback(async () => {
    if (step === 'basic') {
      // Validate basic information
      const nameValidation = validateFullName(formData.fullName)
      if (!nameValidation.isValid) {
        setErrors(prev => ({ ...prev, fullName: nameValidation.error }))
        return
      }

      // Update user basic info
      try {
        setIsSubmitting(true)
        const updateResult = await profileService.updateUserInfo(userId, {
          full_name: formData.fullName.trim(),
          avatar_url: formData.avatarUrl
        })

        if (!updateResult.success) {
          onError(updateResult.error || 'Failed to update profile')
          return
        }

        // Move to location step for customers, complete for technicians
        if (role === 'customer') {
          setStep('location')
          // Check location permissions when moving to location step
          await checkLocationPermissions()
        } else {
          // For technicians, initialize profile and complete
          const profileResult = await profileService.initializeTechnicianProfile(userId, {})
          if (profileResult.success) {
            onComplete({
              fullName: formData.fullName.trim(),
              avatarUrl: formData.avatarUrl || undefined
            })
          } else {
            onError(profileResult.error || 'Failed to initialize technician profile')
          }
        }
      } catch (error) {
        console.error('Profile update error:', error)
        onError('Failed to update profile')
      } finally {
        setIsSubmitting(false)
      }
    } else if (step === 'location') {
      // Validate address for customers
      const addressValidation = validateAddress(formData.address)
      if (!addressValidation.isValid) {
        setErrors(prev => ({ ...prev, address: addressValidation.error }))
        return
      }

      // Geocode address if no location coordinates
      if (!formData.location && formData.address) {
        await geocodeAddress(formData.address)
        return // Wait for geocoding to complete
      }

      // Complete customer profile
      try {
        setIsSubmitting(true)
        const profileResult = await profileService.completeCustomerProfile(userId, {
          address_text: formData.address.trim(),
          location: formData.location || undefined,
          formatted_address: formData.formattedAddress
        })

        if (profileResult.success) {
          onComplete({
            fullName: formData.fullName.trim(),
            avatarUrl: formData.avatarUrl || undefined,
            location: formData.location || undefined,
            address: formData.address.trim(),
            formattedAddress: formData.formattedAddress
          })
        } else {
          onError(profileResult.error || 'Failed to complete profile')
        }
      } catch (error) {
        console.error('Customer profile completion error:', error)
        onError('Failed to complete profile setup')
      } finally {
        setIsSubmitting(false)
      }
    }
  }, [
    step, 
    formData, 
    role, 
    userId, 
    validateFullName, 
    validateAddress,
    geocodeAddress,
    onComplete,
    onError
  ])
  // Get role-specific content
  const getRoleContent = () => {
    switch (role) {
      case 'customer':
        return {
          title: step === 'basic' ? 'Complete Your Profile' : 'Set Your Location',
          subtitle: step === 'basic' 
            ? 'Tell us your name so technicians know who they\'re helping'
            : 'Where should technicians pick up your devices?',
          nextSteps: step === 'basic' 
            ? 'Next: Set up your location for device pickup'
            : 'Almost done! You can start booking repairs soon.'
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
  const canProceed = step === 'basic' 
    ? validateFullName(formData.fullName).isValid && !uploadingAvatar
    : validateAddress(formData.address).isValid && !gettingLocation
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

          {step === 'basic' && (
            <View style={styles.formContainer}>
              <View style={styles.avatarSection}>
                <Text style={styles.sectionTitle}>Profile Picture</Text>
                <Text style={styles.sectionSubtitle}>
                  Add a photo so others can recognize you
                </Text>
                <AvatarUpload
                  currentAvatarUrl={formData.avatarUrl}
                  onAvatarSelected={handleAvatarSelected}
                  onAvatarRemoved={handleAvatarRemoved}
                  uploading={uploadingAvatar}
                />
              </View>

              <View style={styles.inputSection}>
                <Input
                  label="Full Name *"
                  value={formData.fullName}
                  onChangeText={handleNameChange}
                  placeholder="Enter your first and last name"
                  autoFocus
                  autoComplete="name"
                  textContentType="name"
                  autoCapitalize="words"
                  editable={!isSubmitting && !loading}
                  returnKeyType="done"
                  onSubmitEditing={handleNextStep}
                  error={errors.fullName}
                  helperText="This will be visible to other users on the platform"
                />
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
            </View>
          )}
          {step === 'location' && (
            <View style={styles.formContainer}>
              <View style={styles.locationSection}>
                <Text style={styles.sectionTitle}>Pickup Location</Text>
                <Text style={styles.sectionSubtitle}>
                  Where should technicians pick up your devices for repair?
                </Text>

                <Pressable
                  style={styles.locationButton}
                  onPress={handleGetCurrentLocation}
                  disabled={gettingLocation}
                >
                  <Ionicons 
                    name="location" 
                    size={20} 
                    color={gettingLocation ? '#9CA3AF' : '#3B82F6'} 
                  />
                  <Text style={[
                    styles.locationButtonText,
                    gettingLocation && styles.locationButtonTextDisabled
                  ]}>
                    {gettingLocation ? 'Getting location...' : 'Use current location'}
                  </Text>
                  {gettingLocation && <ActivityIndicator size="small" color="#3B82F6" />}
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={styles.addressPickerButton}
                  onPress={handleOpenAddressPicker}
                >
                  <Ionicons name="map" size={20} color="#031636" />
                  <Text style={styles.addressPickerButtonText}>
                    Choose on Map
                  </Text>
                </Pressable>

                <Input
                  label="Address *"
                  value={formData.address}
                  onChangeText={handleAddressChange}
                  placeholder="Enter your pickup address"
                  multiline
                  numberOfLines={3}
                  textContentType="fullStreetAddress"
                  returnKeyType="done"
                  editable={!isSubmitting && !gettingLocation}
                  error={errors.address || errors.location}
                  helperText="Include street, area, and nearest landmark for easy pickup"
                />

                {formData.location && (
                  <View style={styles.locationInfo}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" />
                    <Text style={styles.locationInfoText}>
                      Location verified ✓
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <Button
            title={
              isSubmitting || loading 
                ? 'Setting up...'
                : step === 'basic' && role === 'customer'
                ? 'Continue'
                : 'Complete Setup'
            }
            onPress={handleNextStep}
            disabled={!canProceed || isSubmitting || loading}
          />

          <View style={styles.footer}>
            <View style={styles.nextStepsContainer}>
              <Text style={styles.nextStepsTitle}>What's next?</Text>
              <Text style={styles.nextStepsText}>{roleContent.nextSteps}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Location Permission Modal */}
      <Modal
        visible={activeModal === 'locationPermission'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <LocationPermission
          onPermissionGranted={handleLocationPermissionGranted}
          onPermissionDenied={handleLocationPermissionDenied}
          onSkip={handleLocationPermissionDenied}
          showSkipOption={true}
          title="Enable Location Services"
          subtitle="Make address selection faster and more accurate"
        />
      </Modal>

      {/* Address Picker Modal */}
      <Modal
        visible={activeModal === 'addressPicker'}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <AddressPicker
          onAddressSelected={handleAddressSelected}
          onCancel={handleAddressPickerCancel}
          initialAddress={formData.address}
          initialCoordinates={formData.location || undefined}
          title="Choose Pickup Location"
          subtitle="Select where technicians should pick up your device"
        />
      </Modal>
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
    gap: 32,
    marginBottom: 32
  },
  avatarSection: {
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20
  },
  inputSection: {
    gap: 16
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
  locationSection: {
    gap: 16
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3B82F6'
  },
  locationButtonTextDisabled: {
    color: '#9CA3AF'
  },
  addressPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#031636',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16
  },
  addressPickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#031636'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB'
  },
  dividerText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500'
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  locationInfoText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500'
  },
  footer: {
    alignItems: 'center',
    marginTop: 32
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