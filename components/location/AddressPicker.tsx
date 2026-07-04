// AddressPicker Component
// Google Maps integration with current location detection and drag-to-adjust functionality
// Implements Requirements 21.1, 21.2, 21.3, 21.4, 21.5

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native'
import MapView, { Marker, Region } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '@/components/ui/Button'
import { locationService } from '@/lib/services'
import type { LocationCoordinates } from '@/lib/services'

interface AddressPickerProps {
  onAddressSelected: (address: {
    text: string
    coordinates: LocationCoordinates
    formattedAddress?: string
  }) => void
  onCancel: () => void
  initialAddress?: string
  initialCoordinates?: LocationCoordinates
  title?: string
  subtitle?: string
}

interface AddressSuggestion {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

const { width, height } = Dimensions.get('window')

export function AddressPicker({
  onAddressSelected,
  onCancel,
  initialAddress = '',
  initialCoordinates,
  title = 'Select Address',
  subtitle = 'Choose your pickup location'
}: AddressPickerProps) {
  // Default to Lagos, Nigeria if no initial coordinates provided
  const defaultRegion: Region = {
    latitude: initialCoordinates?.latitude || 6.5244,
    longitude: initialCoordinates?.longitude || 3.3792,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  }

  const [region, setRegion] = useState<Region>(defaultRegion)
  const [markerCoordinate, setMarkerCoordinate] = useState<LocationCoordinates>(
    initialCoordinates || {
      latitude: defaultRegion.latitude,
      longitude: defaultRegion.longitude
    }
  )
  const [addressText, setAddressText] = useState(initialAddress)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [isGeocodingManual, setIsGeocodingManual] = useState(false)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [validatedAddress, setValidatedAddress] = useState<{
    text: string
    coordinates: LocationCoordinates
    formattedAddress?: string
  } | null>(null)

  const mapRef = useRef<MapView>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Get current location and center map
  const handleGetCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true)
    try {
      const result = await locationService.getCurrentLocation()
      
      if (result.success && result.location) {
        const newRegion: Region = {
          ...result.location,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }
        
        setRegion(newRegion)
        setMarkerCoordinate(result.location)
        
        // Animate map to new location
        mapRef.current?.animateToRegion(newRegion, 1000)
        
        // Get address for this location
        await reverseGeocodeLocation(result.location)
      } else {
        Alert.alert(
          'Location Error',
          result.error || 'Unable to get current location',
          [{ text: 'OK', style: 'default' }]
        )
      }
    } catch (error) {
      console.error('Get current location error:', error)
      Alert.alert('Error', 'Failed to get current location')
    } finally {
      setIsLoadingLocation(false)
    }
  }, [])

  // Reverse geocode coordinates to get address
  const reverseGeocodeLocation = useCallback(async (coordinates: LocationCoordinates) => {
    setIsLoadingAddress(true)
    try {
      const result = await locationService.reverseGeocode(coordinates)
      
      if (result.success && result.address) {
        setAddressText(result.address)
        setValidatedAddress({
          text: result.address,
          coordinates,
          formattedAddress: result.formattedAddress
        })
      }
    } catch (error) {
      console.error('Reverse geocode error:', error)
    } finally {
      setIsLoadingAddress(false)
    }
  }, [])

  // Handle map marker drag
  const handleMarkerDragEnd = useCallback(
    async (event: any) => {
      const { coordinate } = event.nativeEvent
      setMarkerCoordinate(coordinate)
      await reverseGeocodeLocation(coordinate)
    },
    [reverseGeocodeLocation]
  )

  // Handle region change (when user pans/zooms map)
  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion)
  }, [])

  // Geocode manually entered address
  const geocodeManualAddress = useCallback(async (address: string) => {
    if (!address.trim()) return
    
    setIsGeocodingManual(true)
    try {
      const result = await locationService.geocodeAddress(address.trim())
      
      if (result.success && result.location) {
        const newRegion: Region = {
          ...result.location,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }
        
        setRegion(newRegion)
        setMarkerCoordinate(result.location)
        mapRef.current?.animateToRegion(newRegion, 1000)
        
        setValidatedAddress({
          text: address.trim(),
          coordinates: result.location
        })
      } else {
        Alert.alert(
          'Address Not Found',
          result.error || 'Could not find this address',
          [{ text: 'OK', style: 'default' }]
        )
      }
    } catch (error) {
      console.error('Geocode manual address error:', error)
      Alert.alert('Error', 'Failed to find address location')
    } finally {
      setIsGeocodingManual(false)
    }
  }, [])

  // Handle address text input change
  const handleAddressInputChange = useCallback((text: string) => {
    setAddressText(text)
    setValidatedAddress(null)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Don't search for very short text
    if (text.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    // Debounce the search to avoid too many API calls
    searchTimeoutRef.current = setTimeout(() => {
      fetchAddressSuggestions(text.trim())
    }, 500)
  }, [])

  // Fetch address suggestions from Google Places API
  const fetchAddressSuggestions = useCallback(async (query: string) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.warn('Google Maps API key not configured')
        return
      }

      const encodedQuery = encodeURIComponent(query)
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&types=address&components=country:ng&key=${apiKey}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.status === 'OK' && data.predictions) {
        const addressSuggestions: AddressSuggestion[] = data.predictions.map((prediction: any) => ({
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || ''
        }))
        
        setSuggestions(addressSuggestions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Address suggestions error:', error)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [])

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(async (suggestion: AddressSuggestion) => {
    setAddressText(suggestion.description)
    setShowSuggestions(false)
    setSuggestions([])
    
    // Geocode the selected suggestion
    await geocodeManualAddress(suggestion.description)
  }, [geocodeManualAddress])

  // Handle address confirmation
  const handleConfirmAddress = useCallback(() => {
    if (!validatedAddress) {
      // If no validated address, try to geocode current text
      if (addressText.trim()) {
        geocodeManualAddress(addressText.trim())
        return
      }
      
      Alert.alert(
        'Address Required',
        'Please enter a valid address or drag the pin to your location',
        [{ text: 'OK', style: 'default' }]
      )
      return
    }

    // Validate using our Nigerian address validator
    const validation = locationService.validateNigerianAddress(validatedAddress.text)
    if (!validation.isValid) {
      Alert.alert(
        'Invalid Address',
        validation.error || 'Please provide a more complete Nigerian address',
        [{ text: 'OK', style: 'default' }]
      )
      return
    }

    onAddressSelected(validatedAddress)
  }, [validatedAddress, addressText, geocodeManualAddress, onAddressSelected])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={addressText}
            onChangeText={handleAddressInputChange}
            placeholder="Enter address or search location"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={() => geocodeManualAddress(addressText)}
          />
          {(isLoadingAddress || isGeocodingManual) && (
            <ActivityIndicator size="small" color="#031636" style={styles.searchLoader} />
          )}
        </View>

        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleGetCurrentLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#031636" />
          ) : (
            <Ionicons name="locate" size={20} color="#031636" />
          )}
        </TouchableOpacity>
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="always">
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={suggestion.placeId}
              style={[
                styles.suggestionItem,
                index === suggestions.length - 1 && styles.suggestionItemLast
              ]}
              onPress={() => handleSuggestionSelect(suggestion)}
            >
              <Ionicons name="location-outline" size={16} color="#6B7280" style={styles.suggestionIcon} />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionMainText} numberOfLines={1}>
                  {suggestion.mainText}
                </Text>
                {suggestion.secondaryText && (
                  <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                    {suggestion.secondaryText}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          loadingEnabled={true}
          mapType="standard"
        >
          <Marker
            coordinate={markerCoordinate}
            draggable
            onDragEnd={handleMarkerDragEnd}
            title="Pickup Location"
            description={addressText || "Drag to adjust location"}
          >
            <View style={styles.customMarker}>
              <Ionicons name="location" size={32} color="#FF5722" />
            </View>
          </Marker>
        </MapView>

        <View style={styles.mapOverlay}>
          <Text style={styles.mapInstruction}>
            📍 Drag the pin to adjust your pickup location
          </Text>
        </View>
      </View>

      <View style={styles.addressPreview}>
        {validatedAddress ? (
          <View style={styles.validatedAddressContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.validatedAddressText} numberOfLines={2}>
              {validatedAddress.text}
            </Text>
          </View>
        ) : (
          <Text style={styles.addressPreviewText}>
            {addressText || 'Address will appear here when location is selected'}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title={validatedAddress ? 'Confirm Address' : 'Validate Address'}
          onPress={handleConfirmAddress}
          disabled={isLoadingAddress || isGeocodingManual}
          variant={validatedAddress ? 'primary' : 'secondary'}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 50,
    paddingBottom: 16
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  cancelButton: {
    padding: 8
  },
  headerText: {
    flex: 1,
    alignItems: 'center'
  },
  headerSpacer: {
    width: 40
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827'
  },
  searchLoader: {
    marginLeft: 8
  },
  currentLocationButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 200
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  suggestionItemLast: {
    borderBottomWidth: 0
  },
  suggestionIcon: {
    marginRight: 12
  },
  suggestionText: {
    flex: 1
  },
  suggestionMainText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500'
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2
  },
  mapContainer: {
    flex: 1,
    position: 'relative'
  },
  map: {
    width: '100%',
    height: '100%'
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  mapInstruction: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500'
  },
  addressPreview: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  validatedAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  validatedAddressText: {
    flex: 1,
    fontSize: 14,
    color: '#059669',
    fontWeight: '500'
  },
  addressPreviewText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic'
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  }
})