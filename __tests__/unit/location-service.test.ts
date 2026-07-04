// Location Service Unit Tests
// Tests for Google Maps integration and location functionality

import { locationService } from '@/lib/services/location-service'

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    High: 4
  }
}))

// Mock fetch for Google Maps API calls
global.fetch = jest.fn()

describe('LocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up default environment variable
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  })

  describe('validateNigerianAddress', () => {
    it('should reject addresses that are too short', () => {
      const result = locationService.validateNigerianAddress('short')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('at least 10 characters')
    })

    it('should accept valid Nigerian addresses', () => {
      const validAddresses = [
        '123 Victoria Island Street, Lagos',
        'Flat 5, Block B, Garki Estate, Abuja',
        '45 Allen Avenue, Ikeja, Lagos State'
      ]

      validAddresses.forEach(address => {
        const result = locationService.validateNigerianAddress(address)
        expect(result.isValid).toBe(true)
      })
    })

    it('should require Nigerian location keywords', () => {
      const result = locationService.validateNigerianAddress('123 Random Place, Foreign Country')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('valid Nigerian address')
    })

    it('should require minimum address components', () => {
      const result = locationService.validateNigerianAddress('Lagos Lagos')
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('more complete address')
    })
  })

  describe('calculateDistance', () => {
    it('should calculate distance between Lagos and Abuja correctly', () => {
      const lagos = { latitude: 6.5244, longitude: 3.3792 }
      const abuja = { latitude: 9.0579, longitude: 7.4951 }
      
      const distance = locationService.calculateDistance(lagos, abuja)
      
      // Distance between Lagos and Abuja is approximately 530km
      expect(distance).toBeGreaterThan(500)
      expect(distance).toBeLessThan(550)
    })

    it('should return 0 for same coordinates', () => {
      const location = { latitude: 6.5244, longitude: 3.3792 }
      
      const distance = locationService.calculateDistance(location, location)
      
      expect(distance).toBe(0)
    })
  })

  describe('areLocationsClose', () => {
    it('should return true for locations within threshold', () => {
      const location1 = { latitude: 6.5244, longitude: 3.3792 }
      const location2 = { latitude: 6.5245, longitude: 3.3793 } // Very close
      
      const isClose = locationService.areLocationsClose(location1, location2, 100)
      
      expect(isClose).toBe(true)
    })

    it('should return false for locations outside threshold', () => {
      const lagos = { latitude: 6.5244, longitude: 3.3792 }
      const abuja = { latitude: 9.0579, longitude: 7.4951 }
      
      const isClose = locationService.areLocationsClose(lagos, abuja, 1000) // 1km threshold
      
      expect(isClose).toBe(false)
    })
  })

  describe('formatDistance', () => {
    it('should format distances less than 1km in meters', () => {
      expect(locationService.formatDistance(0.5)).toBe('500m')
      expect(locationService.formatDistance(0.123)).toBe('123m')
    })

    it('should format distances less than 10km with one decimal', () => {
      expect(locationService.formatDistance(2.5)).toBe('2.5km')
      expect(locationService.formatDistance(9.7)).toBe('9.7km')
    })

    it('should format distances 10km and above as rounded km', () => {
      expect(locationService.formatDistance(15.7)).toBe('16km')
      expect(locationService.formatDistance(100.2)).toBe('100km')
    })
  })

  describe('formatDisplayAddress', () => {
    it('should return address as-is if within length limit', () => {
      const address = 'Short address'
      const result = locationService.formatDisplayAddress(address, 50)
      
      expect(result).toBe(address)
    })

    it('should truncate at comma if available', () => {
      const address = 'Very long street name that exceeds limit, Lagos, Nigeria'
      const result = locationService.formatDisplayAddress(address, 30)
      
      expect(result).toContain('...')
      expect(result.length).toBeLessThanOrEqual(33) // 30 + '...'
    })

    it('should truncate at space if no comma available', () => {
      const address = 'Very long street name that exceeds the character limit'
      const result = locationService.formatDisplayAddress(address, 30)
      
      expect(result).toContain('...')
      expect(result.length).toBeLessThanOrEqual(33) // 30 + '...'
    })
  })

  describe('geocodeAddress', () => {
    it('should return error for empty address', async () => {
      const result = await locationService.geocodeAddress('')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('valid address')
    })

    it('should return error when API key is not configured', async () => {
      delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      
      const result = await locationService.geocodeAddress('Lagos Nigeria')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('not available')
    })

    it('should handle successful geocoding response', async () => {
      const mockResponse = {
        status: 'OK',
        results: [{
          geometry: {
            location: { lat: 6.5244, lng: 3.3792 }
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.geocodeAddress('Lagos, Nigeria')
      
      expect(result.success).toBe(true)
      expect(result.location).toEqual({
        latitude: 6.5244,
        longitude: 3.3792
      })
    })

    it('should handle zero results response', async () => {
      const mockResponse = {
        status: 'ZERO_RESULTS'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.geocodeAddress('Invalid Address')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('getAddressSuggestions', () => {
    it('should return empty suggestions for short queries', async () => {
      const result = await locationService.getAddressSuggestions('ab')
      
      expect(result.success).toBe(true)
      expect(result.suggestions).toEqual([])
    })

    it('should return error when API key is not configured', async () => {
      delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      
      const result = await locationService.getAddressSuggestions('Lagos')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('not available')
    })

    it('should handle successful autocomplete response', async () => {
      const mockResponse = {
        status: 'OK',
        predictions: [{
          place_id: 'test-place-id',
          description: 'Lagos Island, Lagos, Nigeria',
          structured_formatting: {
            main_text: 'Lagos Island',
            secondary_text: 'Lagos, Nigeria'
          }
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.getAddressSuggestions('Lagos Island')
      
      expect(result.success).toBe(true)
      expect(result.suggestions).toHaveLength(1)
      expect(result.suggestions![0]).toEqual({
        placeId: 'test-place-id',
        description: 'Lagos Island, Lagos, Nigeria',
        mainText: 'Lagos Island',
        secondaryText: 'Lagos, Nigeria'
      })
      expect(result.sessionToken).toBeDefined()
    })
  })

  describe('getPlaceDetails', () => {
    it('should return error for empty place ID', async () => {
      const result = await locationService.getPlaceDetails('')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Place ID is required')
    })

    it('should handle successful place details response', async () => {
      const mockResponse = {
        status: 'OK',
        result: {
          place_id: 'test-place-id',
          name: 'Lagos Island',
          formatted_address: 'Lagos Island, Lagos, Nigeria',
          geometry: {
            location: { lat: 6.4541, lng: 3.3947 }
          },
          address_components: [{
            long_name: 'Lagos Island',
            types: ['locality']
          }, {
            long_name: 'Lagos',
            types: ['administrative_area_level_1']
          }]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.getPlaceDetails('test-place-id')
      
      expect(result.success).toBe(true)
      expect(result.placeId).toBe('test-place-id')
      expect(result.name).toBe('Lagos Island')
      expect(result.formattedAddress).toBe('Lagos Island, Lagos, Nigeria')
      expect(result.location).toEqual({
        latitude: 6.4541,
        longitude: 3.3947
      })
      expect(result.addressComponents).toEqual({
        locality: 'Lagos Island',
        administrativeAreaLevel1: 'Lagos'
      })
    })
  })
})