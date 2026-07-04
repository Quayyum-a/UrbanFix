// AddressPicker Component
// Google Maps integration for address selection and autocomplete
// Implements Requirements 21.1, 21.2, 21.3, 21.4, 21.5, 3.2

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker, Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { locationService } from '@/lib/services'
import type { LocationCoordinates } from '@/lib/services'

interface AddressResult {
  id: string
  address: string
  description: string
  coordinates?: LocationCoordinates
}

interface AddressPickerProps {
  initialAddress?: string
  initialCoordinates?: LocationCoordinates
  onAddressSelected: (address: string, coordinates: LocationCoordinates) => void
  onError: (error: string) => void
  placeholder?: string
  disabled?: boolean
}

const { width: screenWidth } = Dimensions.get('window')
const NIGERIAN_REGION: Region = {
  latitude: 9.0765,
  longitude: 7.3986,
  latitudeDelta: 20,
  longitudeDelta: 20
}

export function AddressPicker({
  initialAddress = '',
  initialCoordinates,
  onAddressSelected,
  onError,
  placeholder = 'Search for an address...',
  disabled = false
}: AddressPickerProps) {
  const [searchText, setSearchText] = useState(initialAddress)
  const [suggestions, setSuggestions] = useState<AddressResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mapRegion, setMapRegion] = useState<Region>(
    initialCoordinates
      ? {
          latitude: initialCoordinates.latitude,
          longitude: initialCoordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }
      : NIGERIAN_REGION
  )
  const [selectedCoordinates, setSelectedCoordinates] = useState<LocationCoordinates | null>(
    initialCoordinates || null
  )
  const [isGeocodingMap, setIsGeocodingMap] = useState(false)
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false)

  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const mapRef = useRef<MapView>(null)

  // Google Places Autocomplete
  const searchPlaces = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }

    try {
      setIsSearching(true)

      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        throw new Error('Google Maps API key not configured')
      }

      // Use Places Autocomplete API for Nigerian addresses
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&components=country:ng&types=address&key=${apiKey}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'OK' && data.predictions) {
        const results: AddressResult[] = data.predictions.map((prediction: any) => ({
          id: prediction.place_id,
          address: prediction.description,
          description: prediction.structured_formatting?.main_text || prediction.description
        }))

        setSuggestions(results.slice(0, 5)) // Limit to 5 suggestions
      } else {
        setSuggestions([])
        if (data.status === 'ZERO_RESULTS') {
          // Don't show error for no results, just empty suggestions
        } else {
          console.warn('Places API error:', data.status)
        }
      }
    } catch (error) {
      console.error('Places search error:', error)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Handle search text changes with debouncing
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text)
    }, 500)
  }, [searchPlaces])

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(async (suggestion: AddressResult) => {
    try {
      setSearchText(suggestion.address)
      setSuggestions([])
      setIsSearching(true)

      // Geocode the selected address to get coordinates
      const geocodeResult = await locationService.geocodeAddress(suggestion.address)
      
      if (geocodeResult.success && geocodeResult.location) {
        const coordinates = geocodeResult.location
        setSelectedCoordinates(coordinates)
        
        // Update map region
        const newRegion = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }
        setMapRegion(newRegion)
        
        // Animate map to new location if visible
        if (showMap && mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000)
        }

        onAddressSelected(suggestion.address, coordinates)
      } else {
        onError(geocodeResult.error || 'Could not find location for selected address')
      }
    } catch (error) {
      console.error('Suggestion selection error:', error)
      onError('Failed to select address')
    } finally {
      setIsSearching(false)
    }
  }, [showMap, onAddressSelected, onError])

  // Handle map marker drag
  const handleMarkerDragEnd = useCallback(async (coordinates: LocationCoordinates) => {
    try {
      setIsGeocodingMap(true)
      setSelectedCoordinates(coordinates)

      // Reverse geocode to get address
      const reverseResult = await locationService.reverseGeocode(coordinates)
      
      if (reverseResult.success && reverseResult.address) {
        setSearchText(reverseResult.address)
        setSuggestions([])
        onAddressSelected(reverseResult.address, coordinates)
      } else {
        onError(reverseResult.error || 'Could not determine address for selected location')
      }
    } catch (error) {
      console.error('Marker drag error:', error)
      onError('Failed to determine address for location')
    } finally {
      setIsGeocodingMap(false)
    }
  }, [onAddressSelected, onError])

  // Get current location
  const handleGetCurrentLocation = useCallback(async () => {
    try {
      setGettingCurrentLocation(true)

      const locationResult = await locationService.getCurrentLocation()
      
      if (locationResult.success && locationResult.location) {
        const coordinates = locationResult.location
        setSelectedCoordinates(coordinates)
        
        // Update map region
        const newRegion = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }
        setMapRegion(newRegion)
        
        // Animate map to current location
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000)
        }

        // Reverse geocode to get address
        const reverseResult = await locationService.reverseGeocode(coordinates)
        if (reverseResult.success && reverseResult.address) {
          setSearchText(reverseResult.address)
          setSuggestions([])
          onAddressSelected(reverseResult.address, coordinates)
        }
      } else {
        onError(locationResult.error || 'Failed to get current location')
      }
    } catch (error) {
      console.error('Current location error:', error)
      onError('Failed to access current location')
    } finally {
      setGettingCurrentLocation(false)
    }
  }, [onAddressSelected, onError])

  // Handle map press
  const handleMapPress = useCallback((event: any) => {
    const coordinates = event.nativeEvent.coordinate
    if (coordinates) {
      handleMarkerDragEnd(coordinates)
    }
  }, [handleMarkerDragEnd])

  // Toggle map view
  const toggleMapView = useCallback(() => {
    setShowMap(prev => !prev)
    setSuggestions([]) // Clear suggestions when switching views
  }, [])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchText('')
    setSuggestions([])
    setSelectedCoordinates(null)
  }, [])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons 
            name="search" 
            size={20} 
            color="#9CA3AF" 
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, disabled && styles.searchInputDisabled]}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            editable={!disabled}
            returnKeyType="search"
            autoComplete="street-address"
            textContentType="fullStreetAddress"
          />
          {searchText.length > 0 && (
            <Pressable onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </Pressable>
          )}
          {isSearching && (
            <ActivityIndicator 
              size="small" 
              color="#3B82F6" 
              style={styles.searchSpinner}
            />
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, gettingCurrentLocation && styles.actionButtonDisabled]}
            onPress={handleGetCurrentLocation}
            disabled={disabled || gettingCurrentLocation}
          >
            <Ionicons 
              name="location" 
              size={18} 
              color={gettingCurrentLocation ? "#9CA3AF" : "#3B82F6"}
            />
            <Text style={[
              styles.actionButtonText,
              gettingCurrentLocation && styles.actionButtonTextDisabled
            ]}>
              {gettingCurrentLocation ? 'Finding...' : 'Current'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={toggleMapView}
            disabled={disabled}
          >
            <Ionicons 
              name={showMap ? "list" : "map"} 
              size={18} 
              color="#3B82F6"
            />
            <Text style={styles.actionButtonText}>
              {showMap ? 'List' : 'Map'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {!showMap ? (
          // Search Suggestions List
          <ScrollView 
            style={styles.suggestionsContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion.id}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <Ionicons name="location-outline" size={20} color="#6B7280" />
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionDescription} numberOfLines={1}>
                        {suggestion.description}
                      </Text>
                      <Text style={styles.suggestionAddress} numberOfLines={2}>
                        {suggestion.address}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </Pressable>
                ))}
              </View>
            )}

            {searchText.length > 0 && suggestions.length === 0 && !isSearching && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No addresses found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try a different search term or use the map view
                </Text>
              </View>
            )}

            {searchText.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>Start typing to search</Text>
                <Text style={styles.emptyStateSubtext}>
                  Search for an address or use your current location
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          // Map View
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              region={mapRegion}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass
              showsScale
              mapType="standard"
              provider="google"
            >
              {selectedCoordinates && (
                <Marker
                  coordinate={selectedCoordinates}
                  draggable
                  onDragEnd={(event) => handleMarkerDragEnd(event.nativeEvent.coordinate)}
                  title="Selected Location"
                  description={searchText || 'Drag to adjust position'}
                />
              )}
            </MapView>

            {isGeocodingMap && (
              <View style={styles.mapOverlay}>
                <View style={styles.mapOverlayContent}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.mapOverlayText}>Finding address...</Text>
                </View>
              </View>
            )}

            {/* Map Instructions */}
            <View style={styles.mapInstructions}>
              <Text style={styles.mapInstructionsText}>
                Tap on the map or drag the marker to select your exact location
              </Text>
            </View>
          </View>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    marginBottom: 12
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0
  },
  searchInputDisabled: {
    color: '#9CA3AF'
  },
  clearButton: {
    padding: 4,
    marginLeft: 8
  },
  searchSpinner: {
    marginLeft: 8
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6
  },
  actionButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#9CA3AF'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6'
  },
  actionButtonTextDisabled: {
    color: '#9CA3AF'
  },
  contentContainer: {
    flex: 1
  },
  suggestionsContainer: {
    flex: 1
  },
  suggestionsList: {
    paddingVertical: 8
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8
  },
  suggestionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2
  },
  suggestionAddress: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  },
  mapContainer: {
    flex: 1,
    position: 'relative'
  },
  map: {
    flex: 1
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mapOverlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  mapOverlayText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500'
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  mapInstructionsText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18
  }
})