// Integration tests for SplashScreen navigation flow
// Tests the complete flow: index → splash → login

import React from 'react'
import { render, act } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import IndexScreen from '@/app/index'
import SplashScreen from '@/app/splash'

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}))

// Mock authentication hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// Mock react-native's Animated for splash screen
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native')
  ReactNative.Animated.timing = jest.fn(() => ({
    start: jest.fn((callback) => {
      if (callback) callback()
    }),
  }))
  ReactNative.Animated.spring = jest.fn(() => ({
    start: jest.fn(),
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

const mockAuthInitialized = {
  isAuthenticated: false,
  role: null,
  loading: false,
  initialized: true,
}

const mockAuthLoading = {
  isAuthenticated: false,
  role: null,
  loading: true,
  initialized: false,
}

const mockAuthenticatedCustomer = {
  isAuthenticated: true,
  role: 'customer',
  loading: false,
  initialized: true,
}

describe('Splash Screen Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Index Screen Navigation', () => {
    test('redirects new users to splash screen', () => {
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthInitialized)
      
      render(<IndexScreen />)
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/splash')
    })

    test('redirects authenticated customer to customer dashboard', () => {
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthenticatedCustomer)
      
      render(<IndexScreen />)
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/customer')
    })

    test('waits for auth initialization before redirecting', () => {
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthLoading)
      
      render(<IndexScreen />)
      
      // Should not redirect while loading
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })
  })

  describe('Splash Screen Navigation', () => {
    test('navigates to login screen after animation timeout', () => {
      render(<SplashScreen />)
      
      // Initially should not navigate
      expect(mockRouter.replace).not.toHaveBeenCalled()
      
      // Fast forward through splash duration and fade animation
      act(() => {
        jest.advanceTimersByTime(3000) // 2.5s splash + 0.5s fade
      })
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login')
    })

    test('displays UrbanFix branding during splash', () => {
      const { getByText, getByTestId } = render(<SplashScreen />)
      
      // Check branding elements
      expect(getByText('UrbanFix')).toBeTruthy()
      expect(getByText('Trusted Mobile Repairs')).toBeTruthy()
      expect(getByTestId('splash-screen-container')).toBeTruthy()
    })
  })

  describe('Complete Navigation Flow', () => {
    test('follows correct flow for new user: index → splash → login', async () => {
      // Step 1: Index screen redirects to splash
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthInitialized)
      const { unmount: unmountIndex } = render(<IndexScreen />)
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/splash')
      unmountIndex()
      
      // Reset mock calls
      mockRouter.replace.mockClear()
      
      // Step 2: Splash screen shows and then redirects to login
      const { unmount: unmountSplash } = render(<SplashScreen />)
      
      act(() => {
        jest.advanceTimersByTime(3000)
      })
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login')
      unmountSplash()
    })

    test('bypasses splash for returning authenticated users', () => {
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthenticatedCustomer)
      
      render(<IndexScreen />)
      
      // Should go directly to customer dashboard, bypassing splash
      expect(mockRouter.replace).toHaveBeenCalledWith('/customer')
      expect(mockRouter.replace).not.toHaveBeenCalledWith('/splash')
    })
  })

  describe('Animation and Timing', () => {
    test('starts logo animations on splash screen mount', () => {
      const { Animated } = require('react-native')
      
      render(<SplashScreen />)
      
      expect(Animated.parallel).toHaveBeenCalled()
      expect(Animated.timing).toHaveBeenCalled()
      expect(Animated.spring).toHaveBeenCalled()
    })

    test('respects 2.5 second splash duration', () => {
      render(<SplashScreen />)
      
      // Should not navigate before 2.5 seconds
      act(() => {
        jest.advanceTimersByTime(2400)
      })
      expect(mockRouter.replace).not.toHaveBeenCalled()
      
      // Should start fade after 2.5 seconds
      act(() => {
        jest.advanceTimersByTime(100)
      })
      
      // Should navigate after fade completes
      act(() => {
        jest.advanceTimersByTime(500)
      })
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login')
    })
  })
})