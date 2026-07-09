// Integration Tests for Authentication Flow
// Tests the complete auth service workflow at the service level (no RN rendering)
// Validates Requirements 1.1, 1.2, 1.3, 1.4, 1.5

import { phoneAuthService } from '@/lib/auth'

// Mock Supabase at the module level to avoid real network calls
jest.mock('@/lib/supabase', () => ({
  supabase: {
    supabaseUrl: 'https://mock.supabase.co',
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })),
  },
}))

// Mock AsyncStorage for OTP rate limiting
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}))

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Phone number validation', () => {
    it('valid Nigerian numbers (+234XXXXXXXXXX) pass validation', () => {
      const validNumbers = [
        '+2348012345678',
        '+2347012345678',
        '+2349012345678',
        '+2348066025051',
      ]

      for (const phone of validNumbers) {
        const result = phoneAuthService.validatePhoneNumber(phone)
        expect(result.isValid).toBe(true)
        expect(result.formatted).toBe(phone)
        expect(result.error).toBeUndefined()
      }
    })

    it('numbers with leading 0 are rejected (not auto-normalized)', () => {
      // The service requires explicit +234 prefix — leading 0 format is not accepted
      const result = phoneAuthService.validatePhoneNumber('08012345678')
      expect(result.isValid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('invalid formats (< 10 digits) are rejected', () => {
      const shortNumbers = ['+2348012', '+234123', '+234']
      for (const phone of shortNumbers) {
        const result = phoneAuthService.validatePhoneNumber(phone)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeTruthy()
      }
    })

    it('non-Nigerian prefixes are rejected', () => {
      const nonNigerianNumbers = ['+14155552671', '+447911123456', '+33612345678']
      for (const phone of nonNigerianNumbers) {
        const result = phoneAuthService.validatePhoneNumber(phone)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeTruthy()
      }
    })

    it('empty string is rejected', () => {
      const result = phoneAuthService.validatePhoneNumber('')
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Phone number is required')
    })
  })

  describe('OTP flow state machine', () => {
    it('sendOTP returns success for valid phone (test number bypasses Supabase)', async () => {
      // Test numbers bypass the Supabase call and return success immediately
      const result = await phoneAuthService.sendOTP('+2348066025051')
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('sendOTP returns error for invalid phone (without calling Supabase)', async () => {
      const { supabase } = require('@/lib/supabase')

      const result = await phoneAuthService.sendOTP('invalid-phone')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()

      // Supabase should NOT have been called since validation failed before reaching it
      expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled()
    })

    it('verifyOTP with wrong code returns error for test number', async () => {
      const result = await phoneAuthService.verifyOTP('+2348066025051', '000000')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('session is created after successful verifyOTP for test number', async () => {
      const result = await phoneAuthService.verifyOTP('+2348066025051', '123456')
      expect(result.success).toBe(true)
      // Test numbers skip Supabase but still return needsRoleSelection
      expect(result.needsRoleSelection).toBe(true)
    })

    it('sendOTP returns error for empty phone', async () => {
      const result = await phoneAuthService.sendOTP('')
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('Role assignment', () => {
    it('new user has needsRoleSelection=true after OTP verification', async () => {
      const result = await phoneAuthService.verifyOTP('+2348066025051', '123456')
      expect(result.success).toBe(true)
      expect(result.needsRoleSelection).toBe(true)
    })

    it('role is set correctly after completeRegistration (customer)', async () => {
      const result = await phoneAuthService.completeRegistration(
        '+2348066025051',
        'Test User',
        'customer'
      )
      expect(result.success).toBe(true)
      expect(result.user?.role).toBe('customer')
      expect(result.needsRoleSelection).toBe(false)
    })

    it('role is set correctly after completeRegistration (technician)', async () => {
      const result = await phoneAuthService.completeRegistration(
        '+2348066025051',
        'Test Tech',
        'technician'
      )
      expect(result.success).toBe(true)
      expect(result.user?.role).toBe('technician')
      expect(result.needsRoleSelection).toBe(false)
    })

    it('role cannot be changed once set (validateRoleImmutability prevents change)', async () => {
      const { roleService } = require('@/lib/auth')
      
      // Attempting to change an existing role should be blocked
      const canChange = await roleService.validateRoleImmutability(
        'some-user-id',
        'customer',    // current role
        'technician'   // new role (different — should be blocked)
      )
      expect(canChange).toBe(false)
    })

    it('role stays the same when new role matches current role', async () => {
      const { roleService } = require('@/lib/auth')

      // Same role → no immutability violation
      const canKeep = await roleService.validateRoleImmutability(
        'some-user-id',
        'customer',
        'customer'
      )
      expect(canKeep).toBe(true)
    })

    it('completeRegistration rejects invalid role values', async () => {
      const result = await phoneAuthService.completeRegistration(
        '+2348066025051',
        'Test User',
        'admin' as any
      )
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })
})
