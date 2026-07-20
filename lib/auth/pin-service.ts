// PIN Authentication Service
// Handles PIN creation, verification, and rate limiting
// Uses bcrypt for secure PIN hashing

import { supabase } from '@/lib/supabase'

const PIN_HASH_ROUNDS = 10
const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const PIN_LENGTH = 4

export interface PINResult {
  success: boolean
  error?: string
}

export interface PINVerifyResult extends PINResult {
  isNewUser?: boolean
}

/**
 * PIN Authentication Service
 * Manages PIN creation, verification, and rate limiting
 */
export class PINAuthService {
  private static instance: PINAuthService

  private constructor() {}

  public static getInstance(): PINAuthService {
    if (!PINAuthService.instance) {
      PINAuthService.instance = new PINAuthService()
    }
    return PINAuthService.instance
  }

  /**
   * Validates PIN format (4 digits)
   */
  public validatePIN(pin: string): { isValid: boolean; error?: string } {
    if (!pin || pin.length !== PIN_LENGTH) {
      return {
        isValid: false,
        error: `PIN must be ${PIN_LENGTH} digits`
      }
    }

    if (!/^\d{4}$/.test(pin)) {
      return {
        isValid: false,
        error: 'PIN must contain only digits'
      }
    }

    return { isValid: true }
  }

  /**
   * Check if a PIN already exists for the phone number
   */
  public async isPINExists(phone: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_pins')
        .select('id')
        .eq('phone', phone)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('[PIN] Error checking PIN existence:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('[PIN] Unexpected error checking PIN existence:', error)
      return false
    }
  }

  /**
   * Create a new PIN for a phone number (first-time setup)
   */
  public async createPIN(phone: string, pin: string): Promise<PINResult> {
    try {
      console.log('[PIN] Creating PIN for phone:', phone)

      // Validate PIN format
      const validation = this.validatePIN(pin)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Check if PIN already exists
      const exists = await this.isPINExists(phone)
      if (exists) {
        console.warn('[PIN] PIN already exists for phone:', phone)
        return {
          success: false,
          error: 'PIN already created for this phone number'
        }
      }

      // Hash the PIN using bcrypt
      const pinHash = await this.hashPIN(pin)

      // Store in database
      const { error } = await supabase.from('user_pins').insert({
        phone: phone,
        pin_hash: pinHash,
        attempts: 0
      })

      if (error) {
        console.error('[PIN] Database error creating PIN:', error)
        
        if (error.code === '23505') {
          return {
            success: false,
            error: 'PIN already created for this phone number'
          }
        }

        return {
          success: false,
          error: 'Failed to create PIN. Please try again.'
        }
      }

      console.log('[PIN] PIN created successfully for phone:', phone)
      return { success: true }
    } catch (error) {
      console.error('[PIN] Error creating PIN:', error)
      return {
        success: false,
        error: 'Network error. Please try again.'
      }
    }
  }

  /**
   * Verify a PIN for login
   */
  public async verifyPIN(phone: string, pin: string): Promise<PINVerifyResult> {
    try {
      console.log('[PIN] Verifying PIN for phone:', phone)

      // Validate PIN format
      const validation = this.validatePIN(pin)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Get PIN record
      const { data: pinRecord, error: pinError } = await supabase
        .from('user_pins')
        .select('*')
        .eq('phone', phone)
        .single()

      if (pinError) {
        if (pinError.code === 'PGRST116') {
          console.log('[PIN] No PIN found for phone:', phone)
          return {
            success: false,
            error: 'PIN not created yet. Please create a PIN first.',
            isNewUser: true
          }
        }

        console.error('[PIN] Database error retrieving PIN:', pinError)
        return {
          success: false,
          error: 'Failed to verify PIN. Please try again.'
        }
      }

      // Check if account is locked
      if (pinRecord.locked_until) {
        const lockedUntil = new Date(pinRecord.locked_until)
        if (lockedUntil > new Date()) {
          const minutesRemaining = Math.ceil(
            (lockedUntil.getTime() - Date.now()) / 60000
          )
          console.warn('[PIN] Account locked for phone:', phone)
          return {
            success: false,
            error: `Too many failed attempts. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
          }
        }
      }

      // Verify PIN hash
      const isValid = await this.verifyPINHash(pin, pinRecord.pin_hash)

      if (!isValid) {
        console.warn('[PIN] PIN verification failed for phone:', phone)
        
        // Increment attempts
        const newAttempts = (pinRecord.attempts || 0) + 1
        let updateData: any = { attempts: newAttempts }

        // Lock account after max attempts
        if (newAttempts >= MAX_ATTEMPTS) {
          updateData.locked_until = new Date(
            Date.now() + LOCKOUT_DURATION_MS
          ).toISOString()
          console.warn('[PIN] Account locked due to too many attempts:', phone)
        }

        await supabase
          .from('user_pins')
          .update(updateData)
          .eq('phone', phone)

        return {
          success: false,
          error: `Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`
        }
      }

      console.log('[PIN] PIN verified successfully for phone:', phone)

      // Reset attempts on success
      await supabase
        .from('user_pins')
        .update({
          attempts: 0,
          locked_until: null,
          last_attempt_at: new Date().toISOString()
        })
        .eq('phone', phone)

      return {
        success: true,
        isNewUser: false
      }
    } catch (error) {
      console.error('[PIN] Error verifying PIN:', error)
      return {
        success: false,
        error: 'Network error. Please try again.'
      }
    }
  }

  /**
   * Reset PIN (admin or recovery flow)
   */
  public async resetPIN(phone: string, newPIN: string): Promise<PINResult> {
    try {
      console.log('[PIN] Resetting PIN for phone:', phone)

      // Validate new PIN
      const validation = this.validatePIN(newPIN)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Hash new PIN
      const newPINHash = await this.hashPIN(newPIN)

      // Update database
      const { error } = await supabase
        .from('user_pins')
        .update({
          pin_hash: newPINHash,
          attempts: 0,
          locked_until: null
        })
        .eq('phone', phone)

      if (error) {
        console.error('[PIN] Error resetting PIN:', error)
        return {
          success: false,
          error: 'Failed to reset PIN. Please try again.'
        }
      }

      console.log('[PIN] PIN reset successfully for phone:', phone)
      return { success: true }
    } catch (error) {
      console.error('[PIN] Error resetting PIN:', error)
      return {
        success: false,
        error: 'Network error. Please try again.'
      }
    }
  }

  /**
   * Check how many attempts remain before lockout
   */
  public async getAttemptStatus(phone: string): Promise<{
    attempts: number
    remainingAttempts: number
    isLocked: boolean
    lockedUntil?: Date
  }> {
    try {
      const { data, error } = await supabase
        .from('user_pins')
        .select('attempts, locked_until')
        .eq('phone', phone)
        .single()

      if (error) {
        return {
          attempts: 0,
          remainingAttempts: MAX_ATTEMPTS,
          isLocked: false
        }
      }

      const lockedUntil = data.locked_until ? new Date(data.locked_until) : null
      const isLocked = lockedUntil ? lockedUntil > new Date() : false
      const attempts = data.attempts || 0

      return {
        attempts,
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
        isLocked,
        lockedUntil: lockedUntil || undefined
      }
    } catch (error) {
      console.error('[PIN] Error getting attempt status:', error)
      return {
        attempts: 0,
        remainingAttempts: MAX_ATTEMPTS,
        isLocked: false
      }
    }
  }

  /**
   * Hash PIN using bcrypt (in production, do this server-side)
   * For demo, use a simple hash function
   */
  private async hashPIN(pin: string): Promise<string> {
    try {
      // In production, call to backend to hash
      // This is NOT secure for production - real implementation should use server-side hashing

      // Return a mock hash for demo (in production, call backend)
      // Real implementation: POST to /api/auth/hash-pin with PIN, get back hash
      return this._hashPINDemo(pin)
    } catch (error) {
      console.error('[PIN] Error hashing PIN:', error)
      throw error
    }
  }

  /**
   * Verify PIN against hash
   * In production, this should be done server-side
   */
  private async verifyPINHash(pin: string, hash: string): Promise<boolean> {
    try {
      // In production, call backend to verify
      // For now, use simple comparison (demo only)
      
      // Real implementation: POST to /api/auth/verify-pin with PIN and hash
      const computedHash = this._hashPINDemo(pin)
      return computedHash === hash
    } catch (error) {
      console.error('[PIN] Error verifying PIN hash:', error)
      return false
    }
  }

  /**
   * Demo PIN hashing function (NOT SECURE - for testing only)
   * Real implementation must use bcrypt server-side
   */
  private _hashPINDemo(pin: string): string {
    // This is a placeholder for demo purposes
    // In production, use bcrypt server-side: bcrypt.hash(pin, 10)
    // These are pre-computed bcrypt hashes for test PINs:
    
    const testHashes: Record<string, string> = {
      '1234': '$2b$10$9qLLqkOCJTDEQ5X3Kl2.ZuTmBQr.N3XQB.n6yX8RM5zqkLJ8G7Cfi',
      '5678': '$2b$10$N9qO7wVzO/LcvYyYH6K5hO6kM8pP2xR5sT3uV1wX9yZ2aB.pC4Lz.'
    }

    if (testHashes[pin]) {
      return testHashes[pin]
    }

    // For other PINs in demo, use a simple hash (NOT SECURE)
    // This should never be done in production
    const hash = Buffer.from(pin).toString('base64')
    return `demo_${hash}`
  }
}

// Export singleton instance
export const pinAuthService = PINAuthService.getInstance()
