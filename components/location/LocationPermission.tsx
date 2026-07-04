// LocationPermission Component
// Location permission request with benefit explanation and permission status handling
// Implements Requirements 21.1, 21.5

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui/Button'
import { locationService } from '@/lib/services'

interface LocationPermissionProps {
  onPermissionGranted: () => void
  onPermissionDenied: () => void
  onSkip?: () => void
  showSkipOption?: boolean
  title?: string
  subtitle?: string
}

type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'checking'

export function LocationPermission({
  onPermissionGranted,
  onPermissionDenied,
  onSkip,
  showSkipOption = false,
  title = 'Enable Location Services',
  subtitle = 'Help us provide better pickup and delivery services'
}: LocationPermissionProps) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown')
  const [isRequesting, setIsRequesting] = useState(false)

  // Check current permission status on mount
  useEffect(() => {
    checkCurrentPermissionStatus()
  }, [])

  const checkCurrentPermissionStatus = useCallback(async () => {
    setPermissionStatus('checking')
    try {
      const hasPermission = await locationService.hasLocationPermissions()
      setPermissionStatus(hasPermission ? 'granted' : 'unknown')
      
      if (hasPermission) {
        onPermissionGranted()
      }
    } catch (error) {
      console.error('Check permission status error:', error)
      setPermissionStatus('unknown')
    }
  }, [onPermissionGranted])

  const handleRequestPermission = useCallback(async () => {
    setIsRequesting(true)
    try {
      const result = await locationService.requestLocationPermissions()
      
      if (result.granted) {
        setPermissionStatus('granted')
        onPermissionGranted()
      } else {
        setPermissionStatus('denied')
        
        if (!result.canAskAgain) {
          // Permission permanently denied - show settings alert
          Alert.alert(
            'Location Permission Required',
            'Location access has been denied. To enable location services, please go to Settings and allow location access for UrbanFix.',
            [
              { text: 'Cancel', style: 'cancel', onPress: onPermissionDenied },
              { 
                text: 'Open Settings', 
                style: 'default',
                onPress: () => {
                  Linking.openSettings()
                  onPermissionDenied()
                }
              }
            ]
          )
        } else {
          onPermissionDenied()
        }
      }
    } catch (error) {
      console.error('Request permission error:', error)
      setPermissionStatus('denied')
      Alert.alert(
        'Permission Error',
        'Unable to request location permission. Please try again.',
        [{ text: 'OK', style: 'default', onPress: onPermissionDenied }]
      )
    } finally {
      setIsRequesting(false)
    }
  }, [onPermissionGranted, onPermissionDenied])

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip()
    } else {
      onPermissionDenied()
    }
  }, [onSkip, onPermissionDenied])

  if (permissionStatus === 'checking') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={48} color="#031636" />
          </View>
          <Text style={styles.title}>Checking Location Access...</Text>
        </View>
      </View>
    )
  }

  if (permissionStatus === 'granted') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, styles.successIconContainer]}>
            <Ionicons name="checkmark-circle" size={48} color="#059669" />
          </View>
          <Text style={styles.title}>Location Access Enabled</Text>
          <Text style={styles.subtitle}>
            Great! We can now help you with precise pickup locations.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={64} color="#031636" />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Why we need location access:</Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="navigate-circle" size={20} color="#031636" style={styles.benefitIcon} />
            <Text style={styles.benefitText}>
              Automatically detect your current address for faster pickup booking
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="map" size={20} color="#031636" style={styles.benefitIcon} />
            <Text style={styles.benefitText}>
              Show nearby technicians and provide accurate distance estimates
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="time" size={20} color="#031636" style={styles.benefitIcon} />
            <Text style={styles.benefitText}>
              Enable precise pickup scheduling and real-time tracking updates
            </Text>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="shield-checkmark" size={20} color="#031636" style={styles.benefitIcon} />
            <Text style={styles.benefitText}>
              Verify pickup locations to ensure your device reaches the right technician
            </Text>
          </View>
        </View>

        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed" size={16} color="#6B7280" style={styles.privacyIcon} />
          <Text style={styles.privacyText}>
            Your location data is only used for service delivery and is never shared with third parties.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isRequesting ? 'Requesting Access...' : 'Enable Location Services'}
            onPress={handleRequestPermission}
            disabled={isRequesting}
            style={styles.primaryButton}
          />

          {showSkipOption && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isRequesting}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {permissionStatus === 'denied' && (
          <View style={styles.errorContainer}>
            <Ionicons name="information-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>
              Location access was denied. You can manually enter addresses, but some features will be limited.
            </Text>
          </View>
        )}

        <View style={styles.alternativeContainer}>
          <Text style={styles.alternativeTitle}>Don't want to share your location?</Text>
          <Text style={styles.alternativeText}>
            You can still use UrbanFix by manually entering pickup addresses. However, some convenience features like automatic location detection won't be available.
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#EFF6FF',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  successIconContainer: {
    backgroundColor: '#D1FAE5'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  benefitIcon: {
    marginRight: 12,
    marginTop: 2
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 32,
    width: '100%'
  },
  privacyIcon: {
    marginRight: 8
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16
  },
  buttonContainer: {
    width: '100%',
    gap: 12
  },
  primaryButton: {
    marginBottom: 8
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: '100%'
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 20,
    marginLeft: 8
  },
  alternativeContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    width: '100%'
  },
  alternativeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  alternativeText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16
  }
})