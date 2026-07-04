import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
import { AddressManagement } from '@/components/location/AddressManagement'

describe('AddressManagement Component', () => {
  const mockOnAddressSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders correctly with default props', async () => {
    const { getByText } = render(
      <AddressManagement onAddressSelect={mockOnAddressSelect} />
    )

    await waitFor(() => {
      expect(getByText('Saved Addresses')).toBeTruthy()
    })
  })

  test('renders empty state when no addresses are saved', async () => {
    const { getByText } = render(
      <AddressManagement onAddressSelect={mockOnAddressSelect} />
    )

    await waitFor(() => {
      expect(getByText('No Saved Addresses')).toBeTruthy()
    })
  })
})