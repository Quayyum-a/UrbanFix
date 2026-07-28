// Unified profile setup screen - combines name + location collection in one clean interface
// Replaces the previous two-screen flow (ProfileSetup + CompleteProfile)

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert
} from 'react-native'
import * as Location from 'expo-location'
import { LocationAccuracy } from 'expo-location'
import { PermissionsAndroid } from 'react-native'
import { Button } from '@/components/ui/Button'
import type { UserRole } from '@/lib/auth'

interface UnifiedProfileSetupProps {
  phone: string
  role: UserRole
  onComplete: (fullName: string, latitude?: number, longitude?: number, address?: string) => void
  onError: (error: string) => void
  loading?: boolean
}

export function UnifiedProfileSetup({
  phone,
  role,
  onComplete,
  onError,
  loading = false
}: UnifiedProfileSetupProps) {
  const [fullName, setFullName] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
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

    // For customers, require first and last name
    if (role === 'customer') {
      const hasSpace = /\s/.test(trimmedName)
      if (!hasSpace) {
        return { isValid: false, error: 'Please enter your first and last name' }
      }
    }

    // Basic name validation
    const nameRegex = /^[a-zA-Z\s\-'.]+$/
    if (!nameRegex.test(trimmedName)) {
      return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' }
    }

    return { isValid: true }
  }, [role])

  // Request location permission
  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need your location to show you nearby services',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel'
          }
        )
        return granted === PermissionsAndroid.RESULTS.GRANTED
      } catch (err) {
        console.warn(err)
        return false
      }
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync()
      return status === 'granted'
    }
  }, [])

  // Get current location
  const handleGetLocation = useCallback(async () => {
    setLocationLoading(true)
    setValidationError(null)
    try {
      const hasPermission = await requestLocationPermission()
      if (!hasPermission) {
        setValidationError('Location permission required to continue')
        setLocationLoading(false)
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: LocationAccuracy.Highest
      })
      const { latitude: lat, longitude: lng } = location.coords
      setLatitude(lat)
      setLongitude(lng)

      // Try to get readable address via reverse geocoding
      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng
        })

        if (geocoded && geocoded.length > 0) {
          const place = geocoded[0]
          let addressText = ''

          // Build address from available fields
          if (place.name) {
            addressText = place.name
          } else if (place.city && place.region) {
            addressText = `${place.city}, ${place.region}`
          } else if (place.city) {
            addressText = place.city
          } else if (place.street && place.city) {
            addressText = `${place.street}, ${place.city}`
          } else {
            addressText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          }

          setAddress(addressText)
        } else {
          setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        }
      } catch (geoErr) {
        // Fallback to coordinates if geocoding fails
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      }
    } catch (err) {
      console.error('Location error:', err)
      setValidationError('Unable to get location. Please try again.')
    } finally {
      setLocationLoading(false)
    }
  }, [requestLocationPermission])

  // Validate form and submit
  const handleSubmit = useCallback(async () => {
    try {
      setValidationError(null)

      // Validate name
      const nameValidation = validateFullName(fullName)
      if (!nameValidation.isValid) {
        setValidationError(nameValidation.error)
        return
      }

      // For customers, location is required
      if (role === 'customer' && (!latitude || !longitude)) {
        setValidationError('Please share your location to continue')
        return
      }

      // For customers, address can be any length - backend will handle formatting
      // even if reverse geocoding returns a short address like "Alimosho"

      setIsSubmitting(true)
      onComplete(fullName.trim(), latitude || undefined, longitude || undefined, address || undefined)
    } catch (error) {
      const errorMessage = 'Failed to complete profile. Please try again.'
      setValidationError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [fullName, latitude, longitude, address, role, validateFullName, onComplete, onError])

  const nameValidation = validateFullName(fullName)
  const hasLocation = latitude !== null && longitude !== null
  const isReady = nameValidation.isValid && (role === 'technician' || hasLocation)
  const canSubmit = isReady && !isSubmitting && !loading && !locationLoading

  const roleLabel = role === 'customer' ? 'customer' : 'technician'

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
              <Text style={styles.badgeEmoji}>{role === 'customer' ? '👤' : '🔧'}</Text>
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              {role === 'customer'
                ? 'Tell us your name and location so we can help you better'
                : 'Tell us your name so customers know who they\'re booking'}
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
                placeholder={role === 'customer' ? 'First and last name' : 'Your full name'}
                placeholderTextColor="#9CA3AF"
                autoFocus
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                editable={!isSubmitting && !loading}
                returnKeyType="next"
              />
              <Text style={styles.helperText}>
                This is visible to other users
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

            {/* Location (for customers only) */}
            {role === 'customer' && (
              <View style={styles.field}>
                <Text style={styles.label}>
                  Location <Text style={styles.required}>*</Text>
                </Text>
                <Pressable
                  style={[
                    styles.locationButton,
                    hasLocation && styles.locationButtonDone,
                    locationLoading && styles.locationButtonLoading
                  ]}
                  onPress={handleGetLocation}
                  disabled={locationLoading || isSubmitting || loading}
                >
                  <View style={styles.locationButtonContent}>
                    {locationLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={styles.locationButtonText}>Getting location...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.locationButtonIcon}>📍</Text>
                        <Text style={styles.locationButtonText}>
                          {hasLocation ? 'Update Location' : 'Share My Location'}
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>

                {address && (
                  <View style={styles.addressBox}>
                    <Text style={styles.addressLabel}>Your Location:</Text>
                    <Text style={styles.addressValue}>{address}</Text>
                  </View>
                )}

                {validationError && !hasLocation && role === 'customer' && (
                  <Text style={styles.errorText}>{validationError}</Text>
                )}
              </View>
            )}

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
            <Text style={styles.infoTitle}>You're almost done!</Text>
            <Text style={styles.infoText}>
              {role === 'customer'
                ? 'After this, you\'ll be able to request repairs from our technicians'
                : 'After this, you\'ll be able to accept repair requests'}
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
    paddingTop: 28,
    paddingBottom: 36
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  badgeEmoji: {
    fontSize: 28
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21
  },
  form: {
    gap: 20,
    marginBottom: 28
  },
  field: {
    gap: 10
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 0.3
  },
  required: {
    color: '#DC2626'
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF'
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2'
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    paddingHorizontal: 2,
    marginTop: 2
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12
  },
  phoneText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    flex: 1
  },
  locationButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  locationButtonDone: {
    backgroundColor: '#059669'
  },
  locationButtonLoading: {
    opacity: 0.8
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  locationButtonIcon: {
    fontSize: 18,
    marginRight: 10
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  addressBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12
  },
  addressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500'
  },
  addressValue: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '600'
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10
  },
  errorBoxText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 18
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    paddingHorizontal: 2,
    marginTop: 4
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center'
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
    textAlign: 'center'
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 19
  }
})
