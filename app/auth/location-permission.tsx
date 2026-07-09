// Location permission request screen
// Requests location access for finding nearby technicians

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  Platform
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography } from '@/constants/theme'

export default function LocationPermissionScreen() {
  const router = useRouter()
  const [isRequesting, setIsRequesting] = useState(false)

  const handleRequestPermission = async () => {
    try {
      setIsRequesting(true)
      console.log('📍 [Location] Requesting location permission...')
      
      const { status } = await Location.requestForegroundPermissionsAsync()
      
      if (status === 'granted') {
        console.log('✅ [Location] Permission granted')
        
        // Get current location
        try {
          const location = await Location.getCurrentPositionAsync({})
          console.log('📍 [Location] Current position:', location.coords)
        } catch (error) {
          console.warn('⚠️ [Location] Could not get position:', error)
        }
        
        // Navigate to customer home
        router.replace('/customer')
      } else {
        console.log('❌ [Location] Permission denied')
        Alert.alert(
          'Location Access',
          'Location access helps us find nearby technicians. You can enable it later in Settings.',
          [
            {
              text: 'Skip for Now',
              onPress: () => router.replace('/customer')
            },
            {
              text: 'Try Again',
              onPress: handleRequestPermission
            }
          ]
        )
      }
    } catch (error) {
      console.error('❌ [Location] Permission error:', error)
      Alert.alert(
        'Error',
        'Could not request location permission. Please try again.',
        [
          { text: 'Skip', onPress: () => router.replace('/customer') },
          { text: 'Retry', onPress: handleRequestPermission }
        ]
      )
    } finally {
      setIsRequesting(false)
    }
  }

  const handleSkip = () => {
    console.log('⏭️ [Location] User skipped location permission')
    router.replace('/customer')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons 
            name="location" 
            size={80} 
            color={colors.secondary} 
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          Help Us Find Technicians Near You
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          UrbanFix needs access to your location to connect you with verified technicians in your area. We only use your location when you're actively looking for repair services.
        </Text>

        {/* Features */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={28} color={colors.secondary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Find Nearby Technicians</Text>
              <Text style={styles.featureDescription}>
                See trusted repair experts within 5-10 minutes of your location
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="time" size={28} color={colors.secondary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Accurate Time Estimates</Text>
              <Text style={styles.featureDescription}>
                Get real arrival times based on actual distance and traffic
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="car" size={28} color={colors.secondary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Easy Pickup & Delivery</Text>
              <Text style={styles.featureDescription}>
                Technicians can come to your exact location to collect and return your device
              </Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable
            onPress={handleRequestPermission}
            disabled={isRequesting}
            style={[
              styles.allowButton,
              isRequesting && styles.allowButtonDisabled
            ]}
          >
            <Text style={styles.allowButtonText}>
              {isRequesting ? 'Requesting...' : 'Allow Location Access'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSkip}
            disabled={isRequesting}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>
              Skip for Now
            </Text>
          </Pressable>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyContainer}>
          <View style={styles.privacyIconRow}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={styles.privacyTitle}>Your Privacy Matters</Text>
          </View>
          <Text style={styles.privacyNote}>
            We only access your location when you're booking a repair. Your location is never shared with technicians until you confirm a booking. You can disable this anytime in your phone's Settings.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.xl,
    alignItems: 'center'
  },
  iconContainer: {
    marginBottom: spacing.lg,
    marginTop: spacing.xxl
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm
  },
  description: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg
  },
  featuresList: {
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.md
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  featureIcon: {
    marginRight: spacing.md,
    marginTop: 2
  },
  featureContent: {
    flex: 1
  },
  featureTitle: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4
  },
  featureDescription: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    lineHeight: 20
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: spacing.lg
  },
  allowButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  allowButtonDisabled: {
    opacity: 0.5
  },
  allowButtonText: {
    ...typography.buttonText,
    color: colors.onSecondary
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center'
  },
  skipButtonText: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    fontWeight: '500'
  },
  privacyContainer: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.success
  },
  privacyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs
  },
  privacyTitle: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.xs
  },
  privacyNote: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    lineHeight: 20
  }
})
