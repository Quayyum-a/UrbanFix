import React from 'react'
import { render } from '@testing-library/react-native'
import CustomerHomeScreen from '@/app/customer/index'

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    userProfile: {
      full_name: 'John Doe',
      avatar_url: null,
    }
  })
}))

describe('CustomerHomeScreen', () => {
  it('should render without crashing', () => {
    const { getByText } = render(<CustomerHomeScreen />)
    
    // Check if greeting is displayed
    expect(getByText(/Good morning, John!/)).toBeTruthy()
    
    // Check if search placeholder is displayed
    expect(getByText('What needs fixing?')).toBeTruthy()
    
    // Check if categories are displayed
    expect(getByText('Phone')).toBeTruthy()
    expect(getByText('Laptop')).toBeTruthy()
    expect(getByText('Tablet')).toBeTruthy()
    expect(getByText('Desktop')).toBeTruthy()
    
    // Check if promotional banner is displayed
    expect(getByText(/20% Off iPhone Screen/)).toBeTruthy()
  })
  
  it('should display location toggle', () => {
    const { getByText } = render(<CustomerHomeScreen />)
    
    expect(getByText('Home')).toBeTruthy()
    expect(getByText('Work')).toBeTruthy()
  })
})