// Location Service
// Handles GPS permissions, current location, geocoding, and reverse geocoding
// Implements Requirements 21.1, 21.2, 21.3, 21.4, 21.5

import * as Location from 'expo-location'

export interface LocationCoordinates {
  latitude: number
  longitude: number
}

export interface GeocodeResult {
  success: boolean
  location?: LocationCoordinates
  error?: string
}

export interface ReverseGeocodeResult {
  success: boolean
  address?: string
  formattedAddress?: string
  error?: string
}

export interface LocationPermissionResult {
  granted: boolean
  canAskAgain: boolean
  error?: string
}

export interface AddressComponents {
  streetNumber?: string
  route?: string
  locality?: string
  administrativeAreaLevel1?: string
  country?: string
  postalCode?: string
}

export interface DetailedGeocodeResult extends GeocodeResult {
  formattedAddress?: string
  addressComponents?: AddressComponents
}

export interface PlaceDetailsResult {
  success: boolean
  placeId?: string
  name?: string
  formattedAddress?: string
  location?: LocationCoordinates
  addressComponents?: AddressComponents
  error?: string
}

export class LocationService {
  private static instance: LocationService

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService()
    }
    return LocationService.instance
  }

  /**
   * Request location permissions from user
   */
  async requestLocationPermissions(): Promise<LocationPermissionResult> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync()
      
      if (status === 'granted') {
        return { granted: true, canAskAgain: true }
      }

      return {
        granted: false,
        canAskAgain,
        error: status === 'denied' 
          ? 'Location permission denied. Please enable in device settings.'
          : 'Location permission not available on this device.'
      }
    } catch (error) {
      console.error('Location permission request error:', error)
      return {
        granted: false,
        canAskAgain: false,
        error: 'Failed to request location permissions'
      }
    }
  }

  /**
   * Check if location permissions are granted
   */
  async hasLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      return status === 'granted'
    } catch (error) {
      console.error('Check location permissions error:', error)
      return false
    }
  }

  /**
   * Get current location coordinates
   */
  async getCurrentLocation(): Promise<GeocodeResult> {
    try {
      // Check permissions first
      const hasPermissions = await this.hasLocationPermissions()
      if (!hasPermissions) {
        const permissionResult = await this.requestLocationPermissions()
        if (!permissionResult.granted) {
          return {
            success: false,
            error: permissionResult.error || 'Location permissions required'
          }
        }
      }

      // Get current location with timeout
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // 10 seconds timeout
        distanceInterval: 0
      })

      return {
        success: true,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      }
    } catch (error) {
      console.error('Get current location error:', error)
      
      // Handle specific location errors
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return {
            success: false,
            error: 'Location request timed out. Please try again.'
          }
        }
        if (error.message.includes('unavailable')) {
          return {
            success: false,
            error: 'Location services unavailable. Please enable GPS.'
          }
        }
      }

      return {
        success: false,
        error: 'Unable to get current location. Please try again.'
      }
    }
  }

  /**
   * Geocode address to coordinates using Google Maps API
   * Requires EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in environment
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    try {
      if (!address || address.trim().length < 3) {
        return {
          success: false,
          error: 'Please provide a valid address'
        }
      }

      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.warn('Google Maps API key not configured for geocoding')
        return {
          success: false,
          error: 'Geocoding service not available'
        }
      }

      const encodedAddress = encodeURIComponent(address.trim())
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&components=country:NG&key=${apiKey}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Geocoding API error:', response.status)
        return {
          success: false,
          error: 'Address lookup service temporarily unavailable'
        }
      }

      const data = await response.json()

      if (data.status !== 'OK') {
        console.error('Geocoding status error:', data.status)
        
        if (data.status === 'ZERO_RESULTS') {
          return {
            success: false,
            error: 'Address not found. Please check the address and try again.'
          }
        }
        if (data.status === 'INVALID_REQUEST') {
          return {
            success: false,
            error: 'Invalid address format. Please provide a complete address.'
          }
        }
        
        return {
          success: false,
          error: 'Unable to verify address location'
        }
      }

      if (!data.results || data.results.length === 0) {
        return {
          success: false,
          error: 'Address not found. Please try a more specific address.'
        }
      }

      const result = data.results[0]
      const location = result.geometry?.location

      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return {
          success: false,
          error: 'Unable to determine address coordinates'
        }
      }

      return {
        success: true,
        location: {
          latitude: location.lat,
          longitude: location.lng
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      return {
        success: false,
        error: 'Network error occurred while verifying address'
      }
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates: LocationCoordinates): Promise<ReverseGeocodeResult> {
    try {
      if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
        return {
          success: false,
          error: 'Invalid coordinates provided'
        }
      }

      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.warn('Google Maps API key not configured for reverse geocoding')
        return {
          success: false,
          error: 'Reverse geocoding service not available'
        }
      }

      const { latitude, longitude } = coordinates
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Reverse geocoding API error:', response.status)
        return {
          success: false,
          error: 'Address lookup service temporarily unavailable'
        }
      }

      const data = await response.json()

      if (data.status !== 'OK') {
        console.error('Reverse geocoding status error:', data.status)
        return {
          success: false,
          error: 'Unable to determine address from coordinates'
        }
      }

      if (!data.results || data.results.length === 0) {
        return {
          success: false,
          error: 'No address found for this location'
        }
      }

      // Find the most specific address (usually the first result)
      const result = data.results[0]
      const formattedAddress = result.formatted_address

      // Try to extract a clean street address (without postal code/country)
      let cleanAddress = formattedAddress
      if (cleanAddress) {
        // Remove Nigeria and postal codes from the end
        cleanAddress = cleanAddress
          .replace(/, Nigeria$/, '')
          .replace(/, \d{6}, Nigeria$/, '')
          .replace(/\d{6}$/, '')
          .trim()
      }

      return {
        success: true,
        address: cleanAddress,
        formattedAddress
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      return {
        success: false,
        error: 'Network error occurred while looking up address'
      }
    }
  }

  /**
   * Calculate distance between two points in kilometers
   */
  calculateDistance(
    point1: LocationCoordinates,
    point2: LocationCoordinates
  ): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude)
    const dLon = this.toRadians(point2.longitude - point1.longitude)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Validate Nigerian address format and content
   */
  validateNigerianAddress(address: string): { isValid: boolean; error?: string } {
    if (!address || address.trim().length < 10) {
      return {
        isValid: false,
        error: 'Address must be at least 10 characters long'
      }
    }

    const trimmedAddress = address.trim()

    // Check for common Nigerian location indicators
    const nigerianKeywords = [
      'lagos', 'abuja', 'kano', 'ibadan', 'kaduna', 'port harcourt',
      'benin', 'maiduguri', 'zaria', 'aba', 'jos', 'ilorin',
      'street', 'road', 'avenue', 'close', 'crescent', 'way',
      'estate', 'phase', 'block', 'flat', 'apartment'
    ]

    const hasNigerianKeyword = nigerianKeywords.some(keyword =>
      trimmedAddress.toLowerCase().includes(keyword)
    )

    if (!hasNigerianKeyword) {
      return {
        isValid: false,
        error: 'Please provide a valid Nigerian address with street/area details'
      }
    }

    // Check for minimum address components
    const words = trimmedAddress.split(/\s+/).filter(word => word.length > 1)
    if (words.length < 3) {
      return {
        isValid: false,
        error: 'Please provide a more complete address (street, area, city)'
      }
    }

    return { isValid: true }
  }

  /**
   * Get detailed place information from Google Places API
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
    try {
      if (!placeId) {
        return {
          success: false,
          error: 'Place ID is required'
        }
      }

      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.warn('Google Maps API key not configured for place details')
        return {
          success: false,
          error: 'Place details service not available'
        }
      }

      const fields = 'place_id,name,formatted_address,geometry,address_components'
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`

      const response = await fetch(url)
      
      if (!response.ok) {
        console.error('Place details API error:', response.status)
        return {
          success: false,
          error: 'Place details service temporarily unavailable'
        }
      }

      const data = await response.json()

      if (data.status !== 'OK') {
        console.error('Place details status error:', data.status)
        return {
          success: false,
          error: 'Unable to get place details'
        }
      }

      const result = data.result
      if (!result) {
        return {
          success: false,
          error: 'Place details not found'
        }
      }

      // Extract address components
      const addressComponents: AddressComponents = {}
      if (result.address_components) {
        result.address_components.forEach((component: any) => {
          const types = component.types
          if (types.includes('street_number')) {
            addressComponents.streetNumber = component.long_name
          }
          if (types.includes('route')) {
            addressComponents.route = component.long_name
          }
          if (types.includes('locality') || types.includes('sublocality')) {
            addressComponents.locality = component.long_name
          }
          if (types.includes('administrative_area_level_1')) {
            addressComponents.administrativeAreaLevel1 = component.long_name
          }
          if (types.includes('country')) {
            addressComponents.country = component.long_name
          }
          if (types.includes('postal_code')) {
            addressComponents.postalCode = component.long_name
          }
        })
      }

      // Extract location
      const location = result.geometry?.location
      const coordinates: LocationCoordinates | undefined = location ? {
        latitude: location.lat,
        longitude: location.lng
      } : undefined

      return {
        success: true,
        placeId: result.place_id,
        name: result.name,
        formattedAddress: result.formatted_address,
        location: coordinates,
        addressComponents
      }
    } catch (error) {
      console.error('Place details error:', error)
      return {
        success: false,
        error: 'Failed to get place details'
      }
    }
  }

  /**
   * Get address suggestions from Google Places Autocomplete API
   */
  async getAddressSuggestions(query: string, sessionToken?: string): Promise<{
    success: boolean
    suggestions?: Array<{
      placeId: string
      description: string
      mainText: string
      secondaryText: string
    }>
    sessionToken?: string
    error?: string
  }> {
    try {
      if (!query || query.trim().length < 3) {
        return {
          success: true,
          suggestions: []
        }
      }

      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.warn('Google Maps API key not configured for autocomplete')
        return {
          success: false,
          error: 'Address suggestions service not available'
        }
      }

      // Generate session token for billing optimization if not provided
      const token = sessionToken || Math.random().toString(36).substr(2, 9)
      
      const encodedQuery = encodeURIComponent(query.trim())
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&types=address&components=country:ng&sessiontoken=${token}&key=${apiKey}`

      const response = await fetch(url)
      
      if (!response.ok) {
        console.error('Autocomplete API error:', response.status)
        return {
          success: false,
          error: 'Address suggestions service temporarily unavailable'
        }
      }

      const data = await response.json()

      if (data.status === 'ZERO_RESULTS') {
        return {
          success: true,
          suggestions: [],
          sessionToken: token
        }
      }

      if (data.status !== 'OK') {
        console.error('Autocomplete status error:', data.status)
        return {
          success: false,
          error: 'Unable to get address suggestions'
        }
      }

      const suggestions = (data.predictions || []).map((prediction: any) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting?.main_text || prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text || ''
      }))

      return {
        success: true,
        suggestions,
        sessionToken: token
      }
    } catch (error) {
      console.error('Address suggestions error:', error)
      return {
        success: false,
        error: 'Failed to get address suggestions'
      }
    }
  }

  /**
   * Format address for display
   */
  formatDisplayAddress(address: string, maxLength: number = 50): string {
    if (!address) return ''
    
    if (address.length <= maxLength) return address
    
    // Try to truncate at a comma or space
    const truncated = address.substring(0, maxLength)
    const lastComma = truncated.lastIndexOf(',')
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastComma > maxLength * 0.7) {
      return truncated.substring(0, lastComma) + '...'
    }
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    return truncated + '...'
  }

  /**
   * Check if two locations are close enough (within specified meters)
   */
  areLocationsClose(
    location1: LocationCoordinates,
    location2: LocationCoordinates,
    thresholdMeters: number = 100
  ): boolean {
    const distanceKm = this.calculateDistance(location1, location2)
    const distanceMeters = distanceKm * 1000
    return distanceMeters <= thresholdMeters
  }

  /**
   * Get formatted distance string for display
   */
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000)
      return `${meters}m`
    }
    
    if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`
    }
    
    return `${Math.round(distanceKm)}km`
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance()