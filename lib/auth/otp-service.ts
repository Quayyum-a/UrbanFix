// OTP service with rate limiting and validation
// Implements Requirements 1.5: Rate limiting (3 attempts per 15 minutes)

import AsyncStorage from '@react-native-async-storage/async-storage'

export interface RateLimitResult {
  allowed: boolean
  error?: string
  attemptsRemaining?: number
  resetTime?: Date
}

export interface OTPAttempt {
  timestamp: number
  type: 'send' | 'verify_failed'
}

export class OTPService {
  private static instance: OTPService
  private readonly SEND_RATE_LIMIT = 3 // Max OTP sends per window
  private readonly VERIFY_RATE_LIMIT = 3 // Max failed verifications per window
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes in ms
  private readonly OTP_VALIDITY = 5 * 60 * 1000 // 5 minutes in ms

  private constructor() {}

  public static getInstance(): OTPService {
    if (!OTPService.instance) {
      OTPService.instance = new OTPService()
    }
    return OTPService.instance
  }

  /**
   * Check if phone number is within rate limit for sending OTP
   */
  public async checkRateLimit(phone: string): Promise<RateLimitResult> {
    try {
      const key = `otp_send_${phone}`
      const attemptsJson = await AsyncStorage.getItem(key)
      
      if (!attemptsJson) {
        return { allowed: true }
      }

      const attempts: OTPAttempt[] = JSON.parse(attemptsJson)
      const now = Date.now()
      const windowStart = now - this.RATE_LIMIT_WINDOW

      // Filter attempts within the current window
      const recentAttempts = attempts.filter(attempt => 
        attempt.timestamp > windowStart && attempt.type === 'send'
      )

      if (recentAttempts.length >= this.SEND_RATE_LIMIT) {
        const oldestAttempt = Math.min(...recentAttempts.map(a => a.timestamp))
        const resetTime = new Date(oldestAttempt + this.RATE_LIMIT_WINDOW)
        
        return {
          allowed: false,
          error: `Too many attempts. Please try again in ${Math.ceil((resetTime.getTime() - now) / 60000)} minutes.`,
          attemptsRemaining: 0,
          resetTime
        }
      }

      return {
        allowed: true,
        attemptsRemaining: this.SEND_RATE_LIMIT - recentAttempts.length
      }
    } catch (error) {
      console.error('Rate limit check error:', error)
      // Default to allowing on error to not block legitimate users
      return { allowed: true }
    }
  }

  /**
   * Check rate limit for OTP verification attempts
   */
  public async checkOTPVerificationLimit(phone: string): Promise<RateLimitResult> {
    try {
      const key = `otp_verify_${phone}`
      const attemptsJson = await AsyncStorage.getItem(key)
      
      if (!attemptsJson) {
        return { allowed: true }
      }

      const attempts: OTPAttempt[] = JSON.parse(attemptsJson)
      const now = Date.now()
      const windowStart = now - this.RATE_LIMIT_WINDOW

      // Filter failed verification attempts within the current window
      const recentFailures = attempts.filter(attempt => 
        attempt.timestamp > windowStart && attempt.type === 'verify_failed'
      )

      if (recentFailures.length >= this.VERIFY_RATE_LIMIT) {
        const oldestAttempt = Math.min(...recentFailures.map(a => a.timestamp))
        const resetTime = new Date(oldestAttempt + this.RATE_LIMIT_WINDOW)
        
        return {
          allowed: false,
          error: `Too many failed attempts. Please try again in ${Math.ceil((resetTime.getTime() - now) / 60000)} minutes.`,
          attemptsRemaining: 0,
          resetTime
        }
      }

      return {
        allowed: true,
        attemptsRemaining: this.VERIFY_RATE_LIMIT - recentFailures.length
      }
    } catch (error) {
      console.error('Verification rate limit check error:', error)
      // Default to allowing on error
      return { allowed: true }
    }
  }

  /**
   * Record an OTP send attempt
   */
  public async recordOTPAttempt(phone: string): Promise<void> {
    try {
      const key = `otp_send_${phone}`
      const attemptsJson = await AsyncStorage.getItem(key)
      
      let attempts: OTPAttempt[] = []
      if (attemptsJson) {
        attempts = JSON.parse(attemptsJson)
      }

      // Add new attempt
      attempts.push({
        timestamp: Date.now(),
        type: 'send'
      })

      // Clean up old attempts (older than rate limit window)
      const windowStart = Date.now() - this.RATE_LIMIT_WINDOW
      attempts = attempts.filter(attempt => attempt.timestamp > windowStart)

      await AsyncStorage.setItem(key, JSON.stringify(attempts))
    } catch (error) {
      console.error('Record OTP attempt error:', error)
    }
  }

  /**
   * Record a failed OTP verification attempt
   */
  public async recordFailedVerification(phone: string): Promise<void> {
    try {
      const key = `otp_verify_${phone}`
      const attemptsJson = await AsyncStorage.getItem(key)
      
      let attempts: OTPAttempt[] = []
      if (attemptsJson) {
        attempts = JSON.parse(attemptsJson)
      }

      // Add failed verification attempt
      attempts.push({
        timestamp: Date.now(),
        type: 'verify_failed'
      })

      // Clean up old attempts
      const windowStart = Date.now() - this.RATE_LIMIT_WINDOW
      attempts = attempts.filter(attempt => attempt.timestamp > windowStart)

      await AsyncStorage.setItem(key, JSON.stringify(attempts))
    } catch (error) {
      console.error('Record failed verification error:', error)
    }
  }

  /**
   * Clear rate limiting for a phone number (on successful verification)
   */
  public async clearRateLimit(phone: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`otp_send_${phone}`)
      await AsyncStorage.removeItem(`otp_verify_${phone}`)
    } catch (error) {
      console.error('Clear rate limit error:', error)
    }
  }

  /**
   * Generate a 6-digit OTP (for testing purposes)
   */
  public generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Validate OTP format
   */
  public validateOTPFormat(otp: string): boolean {
    return /^[0-9]{6}$/.test(otp)
  }

  /**
   * Check if OTP is within validity window (5 minutes)
   */
  public isOTPValid(otpTimestamp: number): boolean {
    return (Date.now() - otpTimestamp) <= this.OTP_VALIDITY
  }

  /**
   * Get remaining time for rate limit reset
   */
  public async getRateLimitResetTime(phone: string): Promise<Date | null> {
    try {
      const sendKey = `otp_send_${phone}`
      const verifyKey = `otp_verify_${phone}`
      
      const [sendAttemptsJson, verifyAttemptsJson] = await Promise.all([
        AsyncStorage.getItem(sendKey),
        AsyncStorage.getItem(verifyKey)
      ])

      let earliestResetTime: number | null = null

      // Check send attempts
      if (sendAttemptsJson) {
        const sendAttempts: OTPAttempt[] = JSON.parse(sendAttemptsJson)
        const recentSendAttempts = sendAttempts.filter(attempt => 
          attempt.type === 'send' && 
          (Date.now() - attempt.timestamp) < this.RATE_LIMIT_WINDOW
        )

        if (recentSendAttempts.length >= this.SEND_RATE_LIMIT) {
          const oldestSend = Math.min(...recentSendAttempts.map(a => a.timestamp))
          const resetTime = oldestSend + this.RATE_LIMIT_WINDOW
          earliestResetTime = earliestResetTime ? Math.min(earliestResetTime, resetTime) : resetTime
        }
      }

      // Check verify attempts
      if (verifyAttemptsJson) {
        const verifyAttempts: OTPAttempt[] = JSON.parse(verifyAttemptsJson)
        const recentVerifyAttempts = verifyAttempts.filter(attempt => 
          attempt.type === 'verify_failed' && 
          (Date.now() - attempt.timestamp) < this.RATE_LIMIT_WINDOW
        )

        if (recentVerifyAttempts.length >= this.VERIFY_RATE_LIMIT) {
          const oldestVerify = Math.min(...recentVerifyAttempts.map(a => a.timestamp))
          const resetTime = oldestVerify + this.RATE_LIMIT_WINDOW
          earliestResetTime = earliestResetTime ? Math.min(earliestResetTime, resetTime) : resetTime
        }
      }

      return earliestResetTime ? new Date(earliestResetTime) : null
    } catch (error) {
      console.error('Get rate limit reset time error:', error)
      return null
    }
  }
}

// Export singleton instance
export const otpService = OTPService.getInstance()