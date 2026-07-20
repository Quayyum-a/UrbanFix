// Customer profile completion screen: collects name (passed from previous step) and location
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar
} from 'react-native'
import { useRouter } from 'expo-router'
import { useRoute } from '@react-navigation/native'
import * as Location from 'expo-location'
import { LocationAccuracy } from 'expo-location'
import { PermissionsAndroid, Platform } from 'react-native'
import { useAuth } from '@/hooks/useAuth'

export default function CompleteProfileScreen() {
  const router = useRouter()
  const route = useRoute()
  const { completeRegistration } = useAuth()

  // Get params passed from register screen
  const { name, phone } = route.params as { name: string; phone: string }

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need your location to show you nearby services.',
            buttonPositive: 'OK'
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

  const getCurrentLocation = useCallback(async () => {
    setLoading(true)
    setError(null)
    setGeocoding(true)
    try {
      const hasPermission = await requestLocationPermission()
      if (!hasPermission) {
        setError('Location permission is required to continue.')
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: LocationAccuracy.Highest
      })
      const { latitude: lat, longitude: lng } = location.coords
      setLatitude(lat)
      setLongitude(lng)

      // Reverse geocode to get a readable address
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        if (geocoded.length > 0) {
          const place = geocoded[0]
          if (place) {
            // Build address from available fields
            let address = ''
            if (place.name) {
              address = place.name
            } else if (place.street && place.city) {
              address = `${place.street}, ${place.city}`
            } else if (place.city && place.region) {
              address = `${place.city}, ${place.region}`
            } else if (place.country) {
              address = place.country
            } else {
              address = `Latitude: ${lat}, Longitude: ${lng}`
            }
            setAddress(address)
          } else {
            setAddress(`Latitude: ${lat}, Longitude: ${lng}`)
          }
        } else {
          setAddress(`Latitude: ${lat}, Longitude: ${lng}`)
        }
      } catch (geoErr) {
        setAddress(`Latitude: ${lat}, Longitude: ${lng}`)
      }
    } catch (err) {
      setError('Failed to get location. Please try again.')
    } finally {
      setLoading(false)
      setGeocoding(false)
    }
  }, [requestLocationPermission])

  const handleContinue = useCallback(async () => {
    if (latitude === null || longitude === null) {
      setError('Please get your location first.')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await completeRegistration(
        phone,
        name,
        'customer' as const,
        latitude,
        longitude,
        address
      )
      setLoading(false)
      if (result.success) {
        // Navigate to customer dashboard
        router.replace('/customer')
      } else {
        setError(result.error || 'Failed to complete profile')
      }
    } catch (err) {
      setLoading(false)
      setError('Network error. Please try again.')
    }
  }, [phone, name, latitude, longitude, address, completeRegistration, router])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.content}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          This only takes a few seconds.
        </Text>

        {/* Name display (read-only) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            editable={false}
          />
        </View>

        {/* Location section */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Location</Text>
          <View style={styles.row}>
            <Button
              title="Use My Current Location"
              onPress={getCurrentLocation}
              disabled={geocoding || loading}
            />
            {geocoding && <ActivityIndicator size="small" color="#ff5722" style={{ marginLeft: 8 }} />}
          </View>
          {address && (
            <Text style={styles.addressText}>{address}</Text>
          )}
        </View>

        {/* Continue button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Continue"
            onPress={handleContinue}
            disabled={!(latitude && longitude && address) || loading}
          />
        </View>

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}
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
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 40
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24
  },
  inputContainer: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    alignSelf: 'flex-start'
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  addressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center'
  },
  buttonContainer: {
    marginTop: 30,
    alignItems: 'center'
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12
  }
})