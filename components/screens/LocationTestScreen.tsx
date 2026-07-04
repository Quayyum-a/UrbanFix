// LocationTestScreen Component
// Example screen to demonstrate Google Maps location services integration
// This screen shows how to use AddressPicker and LocationPermission components

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal
} from 'react-native'
import { Button } from '@/components/ui/Button'
import { AddressPicker, LocationPermission } from '@/components/location'
import type { LocationCoordinates } from '@/lib/services'

interface LocationTestScreenProps {
  onBack?: () => void
}

export function LocationTestScreen({ onBack }: LocationTestScreenProps) {
  const [selectedAddress, setSelectedAddress] = useState<{
    text: string
    coordinates: LocationCoordinates
    formattedAddress?: string
  } | null>(null)
  
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [showLocationPermission, setShowLocationPermission] = useState(false)

  const handleAddressSelected = (addressData: {
    text: string
    coordinates: LocationCoordinates
    formattedAddress?: string
  }) => {
    setSelectedAddress(addressData)
    setShowAddressPicker(false)
    
    Alert.alert(
      'Address Selected',
      `Address: ${addressData.text}\nCoordinates: ${addressData.coordinates.latitude}, ${addressData.coordinates.longitude}`,
      [{ text: 'OK' }]
    )
  }

  const handleLocationPermissionGranted = () => {
    setShowLocationPermission(false)
    Alert.alert('Success', 'Location permission granted!', [{ text: 'OK' }])
  }

  const handleLocationPermissionDenied = () => {
    setShowLocationPermission(false)
    Alert.alert('Info', 'Location permission was denied', [{ text: 'OK' }])
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Location Services Demo</Text>
          <Text style={styles.subtitle}>
            Test Google Maps integration and location components
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Picker</Text>
          <Text style={styles.sectionDescription}>
            Interactive map-based address selection with Google Maps integration
          </Text>
          
          <Button
            title="Open Address Picker"
            onPress={() => setShowAddressPicker(true)}
            style={styles.button}
          />
          
          {selectedAddress && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Selected Address:</Text>
              <Text style={styles.resultText}>📍 {selectedAddress.text}</Text>
              <Text style={styles.resultCoords}>
                📐 {selectedAddress.coordinates.latitude.toFixed(6)}, {selectedAddress.coordinates.longitude.toFixed(6)}
              </Text>
              {selectedAddress.formattedAddress && (
                <Text style={styles.resultFormatted}>
                  🗺️ {selectedAddress.formattedAddress}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Permission</Text>
          <Text style={styles.sectionDescription}>
            Request location permissions with clear benefit explanations
          </Text>
          
          <Button
            title="Request Location Permission"
            onPress={() => setShowLocationPermission(true)}
            variant="secondary"
            style={styles.button}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features Demonstrated</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✓ Google Maps integration with react-native-maps</Text>
            <Text style={styles.featureItem}>✓ Current location detection with GPS</Text>
            <Text style={styles.featureItem}>✓ Drag-to-adjust pin functionality</Text>
            <Text style={styles.featureItem}>✓ Address autocomplete suggestions</Text>
            <Text style={styles.featureItem}>✓ Address validation for Nigerian locations</Text>
            <Text style={styles.featureItem}>✓ Geocoding and reverse geocoding</Text>
            <Text style={styles.featureItem}>✓ Location permission handling</Text>
            <Text style={styles.featureItem}>✓ Offline scenario handling</Text>
          </View>
        </View>

        {onBack && (
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
        )}
      </View>

      {/* Address Picker Modal */}
      <Modal
        visible={showAddressPicker}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <AddressPicker
          onAddressSelected={handleAddressSelected}
          onCancel={() => setShowAddressPicker(false)}
          initialAddress={selectedAddress?.text}
          initialCoordinates={selectedAddress?.coordinates}
          title="Demo Address Picker"
          subtitle="Select any location to test the functionality"
        />
      </Modal>

      {/* Location Permission Modal */}
      <Modal
        visible={showLocationPermission}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <LocationPermission
          onPermissionGranted={handleLocationPermissionGranted}
          onPermissionDenied={handleLocationPermissionDenied}
          onSkip={handleLocationPermissionDenied}
          showSkipOption={true}
          title="Demo Location Permission"
          subtitle="Test location permission request flow"
        />
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    padding: 24,
    paddingTop: 60
  },
  header: {
    alignItems: 'center',
    marginBottom: 32
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#031636',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24
  },
  section: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20
  },
  button: {
    marginBottom: 16
  },
  resultContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4
  },
  resultCoords: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: 4
  },
  resultFormatted: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic'
  },
  featureList: {
    gap: 8
  },
  featureItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20
  },
  backButton: {
    marginTop: 16
  }
})