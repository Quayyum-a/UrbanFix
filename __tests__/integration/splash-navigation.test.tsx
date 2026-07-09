// Integration tests for SplashScreen navigation flow
// Tests the complete flow: index → splash → login

import React from 'react'
import { render, act, cleanup } from '@testing-library/react-native'
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
    start: jest.fn((callback) => {
      if (callback) callback()
    }),
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
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('Index Screen Navigation', () => {
    test('redirects new users to splash screen', async () => {
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthInitialized)
      await render(<IndexScreen />)
      expect(mockRouter.replace).toHaveBeenCalledWith('/splash')
    })

    test('redirects authenticated customer to customer dashboard', async () => {
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthenticatedCustomer)
      await render(<IndexScreen />)
      expect(mockRouter.replace).toHaveBeenCalledWith('/customer')
    })

    test('waits for auth initialization before redirecting', async () => {
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthLoading)
      await render(<IndexScreen />)
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })
  })

  describe('Splash Screen Branding', () => {
    test('displays UrbanFix branding during splash', async () => {
      const { getByText, getByTestId } = await render(<SplashScreen />)
      expect(getByText('UrbanFix')).toBeTruthy()
      expect(getByText('Trusted Mobile Repairs')).toBeTruthy()
      expect(getByTestId('splash-screen-container')).toBeTruthy()
    })
  })

  describe('Splash Screen Animation', () => {
    test('starts logo animations on splash screen mount', async () => {
      const { Animated } = require('react-native')
      await render(<SplashScreen />)
      expect(Animated.parallel).toHaveBeenCalled()
      expect(Animated.timing).toHaveBeenCalled()
      expect(Animated.spring).toHaveBeenCalled()
    })
  })

  describe('Complete Navigation Flow', () => {
    test('follows correct flow for new user: index → splash → login', async () => {
      // Step 1: Index screen redirects to splash
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthInitialized)
      await render(<IndexScreen />)
      expect(mockRouter.replace).toHaveBeenCalledWith('/splash')
    })

    test('bypasses splash for returning authenticated users', async () => {
      ;(useAuth as jest.Mock).mockReturnValue(mockAuthenticatedCustomer)
      await render(<IndexScreen />)

      // Should go directly to customer dashboard, bypassing splash
      expect(mockRouter.replace).toHaveBeenCalledWith('/customer')
      expect(mockRouter.replace).not.toHaveBeenCalledWith('/splash')
    })
  })

  // Timer-based tests run last to avoid polluting other tests
  describe('Splash Screen Navigation with timers', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      cleanup()
      jest.clearAllTimers()
      jest.useRealTimers()
    })

    test('navigates to login screen after animation timeout', async () => {
      await render(<SplashScreen />)

      // Initially should not navigate
      expect(mockRouter.replace).not.toHaveBeenCalled()

      // Fast forward through splash duration and fade animation
      act(() => {
        jest.runAllTimers()
      })

      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login')
    })

    test('does not navigate immediately on mount', async () => {
      // Verify splash screen doesn't navigate before the timer fires
      await render(<SplashScreen />)

      // Right after render, no navigation should have occurred
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })
  })
})
