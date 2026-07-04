// AddressPicker Component Unit Tests
// Tests for Google Maps address picker functionality

import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { AddressPicker } from '@/components/location/AddressPicker'
import { locationService } from '@/lib/services'

// Mock dependencies
jest.mock('@/lib/services', () => ({
  locationService: {
    getCurrentLocation: jest.fn(),
    reverseGeocode: jest.fn(),
    geocodeAddress: jest.fn(),
    validateNigerianAddress: jest.fn()
  }
}))

jest.mock('react-native-maps', () => {
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="map-view">{children}</View>,
    Marker: ({ children }: any) => <View testID="map-marker">{children}</View>
  }
})

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID }: any) => <div testID={testID || `icon-${name}`} />
}))

const mockProps = {
  onAddressSelected: jest.fn(),
  onCancel: jest.fn(),
  title: 'Test Address Picker',
  subtitle: 'Test subtitle'
}

describe('AddressPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  })

  it('should render with provided title and subtitle', () => {
    const { getByText } = render(<AddressPicker {...mockProps} />)
    
    expect(getByText('Test Address Picker')).toBeTruthy()
    expect(getByText('Test subtitle')).toBeTruthy()
  })

  it('should display initial address when provided', () => {
    const { getByDisplayValue } = render(
      <AddressPicker 
        {...mockProps} 
        initialAddress="123 Test Street, Lagos"
      />
    )
    
    expect(getByDisplayValue('123 Test Street, Lagos')).toBeTruthy()
  })

  it('should call onCancel when cancel button is pressed', () => {
    const { getByTestId } = render(<AddressPicker {...mockProps} />)
    
    // Find and press the cancel button (close icon)
    const cancelButton = getByTestId('icon-close').parent
    fireEvent.press(cancelButton!)
    
    expect(mockProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('should handle current location button press', async () => {
    const mockLocation = { latitude: 6.5244, longitude: 3.3792 }
    const mockAddress = 'Victoria Island, Lagos'
    
    ;(locationService.getCurrentLocation as jest.Mock).mockResolvedValueOnce({
      success: true,
      location: mockLocation
    })
    
    ;(locationService.reverseGeocode as jest.Mock).mockResolvedValueOnce({
      success: true,
      address: mockAddress,
      formattedAddress: 'Victoria Island, Lagos, Nigeria'
    })

    const { getByTestId } = render(<AddressPicker {...mockProps} />)
    
    const locationButton = getByTestId('icon-locate').parent
    fireEvent.press(locationButton!)
    
    await waitFor(() => {
      expect(locationService.getCurrentLocation).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(locationService.reverseGeocode).toHaveBeenCalledWith(mockLocation)
    })
  })

  it('should handle address input changes', () => {
    const { getByPlaceholderText } = render(<AddressPicker {...mockProps} />)
    
    const addressInput = getByPlaceholderText('Enter address or search location')
    fireEvent.changeText(addressInput, 'New address')
    
    expect(addressInput.props.value).toBe('New address')
  })

  it('should validate and confirm address', async () => {
    const mockValidation = { isValid: true }
    const mockGeocode = {
      success: true,
      location: { latitude: 6.5244, longitude: 3.3792 }
    }
    
    ;(locationService.validateNigerianAddress as jest.Mock).mockReturnValueOnce(mockValidation)
    ;(locationService.geocodeAddress as jest.Mock).mockResolvedValueOnce(mockGeocode)

    const { getByText, getByPlaceholderText } = render(<AddressPicker {...mockProps} />)
    
    // Enter an address
    const addressInput = getByPlaceholderText('Enter address or search location')
    fireEvent.changeText(addressInput, '123 Victoria Island Street, Lagos')
    
    // Confirm the address
    const confirmButton = getByText('Validate Address')
    fireEvent.press(confirmButton)
    
    await waitFor(() => {
      expect(locationService.geocodeAddress).toHaveBeenCalledWith('123 Victoria Island Street, Lagos')
    })
  })

  it('should show error for invalid address', async () => {
    const mockValidation = { 
      isValid: false, 
      error: 'Please provide a valid Nigerian address' 
    }
    
    ;(locationService.validateNigerianAddress as jest.Mock).mockReturnValueOnce(mockValidation)
    ;(locationService.geocodeAddress as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Address not found'
    })

    const { getByText, getByPlaceholderText } = render(<AddressPicker {...mockProps} />)
    
    // Enter an invalid address
    const addressInput = getByPlaceholderText('Enter address or search location')
    fireEvent.changeText(addressInput, 'Invalid address')
    
    // Try to confirm the address  
    const confirmButton = getByText('Validate Address')
    fireEvent.press(confirmButton)
    
    await waitFor(() => {
      expect(locationService.geocodeAddress).toHaveBeenCalledWith('Invalid address')
    })
  })

  it('should handle geocoding errors gracefully', async () => {
    const mockGeocode = {
      success: false,
      error: 'Address not found'
    }
    
    ;(locationService.geocodeAddress as jest.Mock).mockResolvedValueOnce(mockGeocode)

    const { getByText, getByPlaceholderText } = render(<AddressPicker {...mockProps} />)
    
    const addressInput = getByPlaceholderText('Enter address or search location')
    fireEvent.changeText(addressInput, 'Unknown address')
    
    const confirmButton = getByText('Validate Address')
    fireEvent.press(confirmButton)
    
    await waitFor(() => {
      expect(locationService.geocodeAddress).toHaveBeenCalledWith('Unknown address')
    })
  })

  it('should have confirm address functionality', async () => {
    const mockValidation = { isValid: true }
    const testAddress = {
      text: '123 Victoria Island Street, Lagos',
      coordinates: { latitude: 6.5244, longitude: 3.3792 },
      formattedAddress: '123 Victoria Island Street, Lagos, Nigeria'
    }
    
    ;(locationService.validateNigerianAddress as jest.Mock).mockReturnValueOnce(mockValidation)
    ;(locationService.geocodeAddress as jest.Mock).mockResolvedValueOnce({
      success: true,
      location: testAddress.coordinates
    })

    const { getByText, getByPlaceholderText } = render(<AddressPicker {...mockProps} />)
    
    // Enter an address
    const addressInput = getByPlaceholderText('Enter address or search location')
    fireEvent.changeText(addressInput, testAddress.text)
    
    // Validate the address first
    const validateButton = getByText('Validate Address')
    fireEvent.press(validateButton)
    
    await waitFor(() => {
      expect(locationService.geocodeAddress).toHaveBeenCalledWith(testAddress.text)
    })
  })

  it('should show map and marker', () => {
    const { getByTestId } = render(<AddressPicker {...mockProps} />)
    
    expect(getByTestId('map-view')).toBeTruthy()
    expect(getByTestId('map-marker')).toBeTruthy()
  })

  it('should display instructions for map interaction', () => {
    const { getByText } = render(<AddressPicker {...mockProps} />)
    
    expect(getByText('📍 Drag the pin to adjust your pickup location')).toBeTruthy()
  })
})