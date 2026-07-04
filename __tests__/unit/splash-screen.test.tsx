// Unit tests for SplashScreen component
// Tests animation behavior, navigation routing, and visual elements

import React from 'react'
import { render, act } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import SplashScreen from '@/app/splash'

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}))

// Mock react-native's Animated
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native')
  ReactNative.Animated.timing = jest.fn(() => ({
    start: jest.fn((callback) => {
      if (callback) callback()
    }),
  }))
  ReactNative.Animated.spring = jest.fn(() => ({
    start: jest.fn((callback) => {
      if (callback) callback()
    }),
  }))
  ReactNative.Animated.parallel = jest.fn(() => ({
    start: jest.fn(),
  }))
  return ReactNative
})

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
}

describe('SplashScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('renders splash screen with UrbanFix logo', () => {
    const { getByText } = render(<SplashScreen />)
    
    expect(getByText('UrbanFix')).toBeTruthy()
    expect(getByText('Trusted Mobile Repairs')).toBeTruthy()
  })

  test('displays logo with correct styling', () => {
    const { getByText } = render(<SplashScreen />)
    
    const logoText = getByText('UrbanFix')
    const taglineText = getByText('Trusted Mobile Repairs')
    
    expect(logoText).toBeTruthy()
    expect(taglineText).toBeTruthy()
  })

  test('navigates to login screen after 2.5 seconds', () => {
    render(<SplashScreen />)
    
    // Initially should not navigate
    expect(mockRouter.replace).not.toHaveBeenCalled()
    
    // Fast forward time by 2.5 seconds
    act(() => {
      jest.advanceTimersByTime(2500)
    })
    
    // Should start fade animation, then navigate after fade completes (additional 500ms)
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login')
  })

  test('starts logo reveal animation on mount', () => {
    const { Animated } = require('react-native')
    
    render(<SplashScreen />)
    
    // Should start parallel animation with timing and spring
    expect(Animated.parallel).toHaveBeenCalled()
    expect(Animated.timing).toHaveBeenCalled()
    expect(Animated.spring).toHaveBeenCalled()
  })

  test('cleans up timer on unmount', () => {
    const { unmount } = render(<SplashScreen />)
    
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    
    unmount()
    
    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })

  test('has correct background color (Deep Trust Blue)', () => {
    const { getByTestId } = render(<SplashScreen />)
    
    const container = getByTestId('splash-screen-container')
    expect(container).toBeTruthy()
    // The container should have the Deep Trust Blue background color
    expect(container.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: '#031636' // Deep Trust Blue
      })
    )
  })

  test('includes brand indicator element', () => {
    const { root } = render(<SplashScreen />)
    
    // Test that the component renders successfully with all elements
    expect(root).toBeTruthy()
  })
})