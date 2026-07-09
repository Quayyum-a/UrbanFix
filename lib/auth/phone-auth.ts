// Phone-based authentication service with Nigerian +234 format validation
// Implements Requirements 1.1, 1.2, 1.3, 1.4, 1.5

import { supabase } from '@/lib/supabase'
import { OTPService } from './otp-service'
import type { Database } from '@/types/database.types'

export interface AuthResult {
  success: boolean
  error?: string
  session?: any
  user?: Database['public']['Tables']['users']['Row']
  needsRoleSelection?: boolean
}

export interface PhoneValidationResult {
  isValid: boolean
  formatted?: string
  error?: string
}

export class PhoneAuthService {
  private static instance: PhoneAuthService
  private otpService: OTPService

  private constructor() {
    this.otpService = OTPService.getInstance()
  }

  public static getInstance(): PhoneAuthService {
    if (!PhoneAuthService.instance) {
      PhoneAuthService.instance = new PhoneAuthService()
    }
    return PhoneAuthService.instance
  }

  /**
   * Validates Nigerian phone number format (+234XXXXXXXXXX)
   * Requirement 1.1: Phone format validation
   */
  public validatePhoneNumber(phone: string): PhoneValidationResult {
    // Remove all whitespace and normalize
    const cleanPhone = phone.trim().replace(/\s+/g, '')
    
    // Nigerian phone number format: +234XXXXXXXXXX (exactly 14 characters)
    const nigerianPhoneRegex = /^\+234[0-9]{10}$/
    
    if (!cleanPhone) {
      return {
        isValid: false,
        error: 'Phone number is required'
      }
    }

    if (!nigerianPhoneRegex.test(cleanPhone)) {
      return {
        isValid: false,
        error: 'Please enter a valid Nigerian phone number in format +234XXXXXXXXXX'
      }
    }

    return {
      isValid: true,
      formatted: cleanPhone
    }
  }

  /**
   * Initiates phone authentication by sending OTP
   * Requirement 1.2: OTP delivery within 30 seconds
   * Requirement 1.5: Rate limiting (3 attempts per 15 minutes)
   */
  public async sendOTP(phone: string): Promise<AuthResult> {
    try {
      console.log('📱 [Phone Auth] Sending OTP to:', phone)
      
      // Validate phone format first
      const validation = this.validatePhoneNumber(phone)
      if (!validation.isValid) {
        console.error('❌ [Phone Auth] Validation failed:', validation.error)
        return {
          success: false,
          error: validation.error
        }
      }

      const formattedPhone = validation.formatted!
      console.log('✅ [Phone Auth] Phone validated:', formattedPhone)
      
      // Check if this is a test number - bypass Supabase completely for dev
      const TEST_NUMBERS: Record<string, string> = {
        '+2348066025051': '123456',
        '+2348012345678': '654321'
      }
      
      const isTestNumber = formattedPhone in TEST_NUMBERS
      
      if (isTestNumber) {
        console.log('🧪 [Phone Auth] Test number detected - bypassing SMS send for dev mode')
        console.log('✅ [Phone Auth] Dev mode OTP ready immediately!')
        return {
          success: true
        }
      }
      
      // Check rate limiting
      const rateLimitCheck = await this.otpService.checkRateLimit(formattedPhone)
      if (!rateLimitCheck.allowed) {
        console.error('❌ [Phone Auth] Rate limit exceeded:', rateLimitCheck.error)
        return {
          success: false,
          error: rateLimitCheck.error
        }
      }

      console.log('📤 [Phone Auth] Calling Supabase signInWithOtp...')
      
      // Use Supabase Auth with phone provider
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          // Custom SMS template can be configured in Supabase dashboard
          shouldCreateUser: true,
        }
      })

      if (error) {
        console.error('❌ [Phone Auth] Supabase OTP error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return {
          success: false,
          error: 'Failed to send verification code. Please try again.'
        }
      }

      console.log('✅ [Phone Auth] OTP sent successfully!')
      
      // Track OTP attempt for rate limiting
      await this.otpService.recordOTPAttempt(formattedPhone)

      return {
        success: true
      }
    } catch (error) {
      console.error('❌ [Phone Auth] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      }
    }
  }

  /**
   * Verifies OTP and creates JWT session
   * Requirement 1.3: JWT session token creation for valid OTP
   * Requirement 1.4: Redirect to role selection for new users
   */
  public async verifyOTP(phone: string, otp: string): Promise<AuthResult> {
    try {
      console.log('🔐 [Phone Auth] Starting OTP verification...')
      console.log('📱 [Phone Auth] Phone:', phone)
      console.log('🔢 [Phone Auth] OTP:', otp)
      
      // Validate inputs
      const validation = this.validatePhoneNumber(phone)
      if (!validation.isValid) {
        console.error('❌ [Phone Auth] Phone validation failed:', validation.error)
        return {
          success: false,
          error: validation.error
        }
      }

      if (!otp || otp.length !== 6 || !/^[0-9]{6}$/.test(otp)) {
        console.error('❌ [Phone Auth] OTP validation failed')
        return {
          success: false,
          error: 'Please enter a valid 6-digit verification code'
        }
      }

      const formattedPhone = validation.formatted!
      console.log('✅ [Phone Auth] Phone formatted:', formattedPhone)

      // Check if this is a test number - bypass real verification for development
      const TEST_NUMBERS: Record<string, string> = {
        '+2348066025051': '123456',
        '+2348012345678': '654321'
      }
      
      const isTestNumber = formattedPhone in TEST_NUMBERS
      const expectedOTP = TEST_NUMBERS[formattedPhone]
      
      if (isTestNumber) {
        console.log('🧪 [Phone Auth] Test number detected - using dev mode verification')
        
        if (otp === expectedOTP) {
          console.log('✅ [Phone Auth] Test OTP matches - bypassing all Supabase calls for dev mode')
          
          // For test numbers, completely bypass Supabase and just succeed immediately
          // This allows navigation through the app for testing other features
          
          console.log('ℹ️ [Phone Auth] Dev mode: New user - needs role selection')
          return {
            success: true,
            session: null as any, // Mock session for dev
            needsRoleSelection: true
          }
        } else {
          console.error('❌ [Phone Auth] Test OTP mismatch - expected:', expectedOTP, 'got:', otp)
          return {
            success: false,
            error: `Invalid test OTP. Expected: ${expectedOTP}`
          }
        }
      }

      // For non-test numbers, proceed with normal Supabase verification
      // Check OTP rate limiting
      console.log('⏱️ [Phone Auth] Checking rate limit...')
      const rateLimitCheck = await this.otpService.checkOTPVerificationLimit(formattedPhone)
      if (!rateLimitCheck.allowed) {
        console.error('❌ [Phone Auth] Rate limit exceeded:', rateLimitCheck.error)
        return {
          success: false,
          error: rateLimitCheck.error
        }
      }

      // Verify OTP with Supabase Auth
      console.log('📤 [Phone Auth] Calling Supabase verifyOtp...')
      console.log('🌐 [Phone Auth] Supabase URL:', supabase.supabaseUrl)
      
      const startTime = Date.now()
      
      // Add timeout to Supabase call
      const verifyPromise = supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms'
      }).then(result => {
        const elapsed = Date.now() - startTime
        console.log(`⏱️ [Phone Auth] Supabase call took ${elapsed}ms`)
        return result
      }).catch(error => {
        const elapsed = Date.now() - startTime
        console.log(`⏱️ [Phone Auth] Supabase call failed after ${elapsed}ms`)
        throw error
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.error(`⏱️ [Phone Auth] Timeout triggered after 15000ms`)
          reject(new Error('Supabase verification timeout'))
        }, 15000) // 15 second timeout
      })
      
      console.log('⏳ [Phone Auth] Waiting for response...')
      const response = await Promise.race([verifyPromise, timeoutPromise]) as any
      const { data, error } = response
      
      console.log('📥 [Phone Auth] Supabase response:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session, 
        error: error ? JSON.stringify(error) : null 
      })

      if (error) {
        console.error('❌ [Phone Auth] OTP verification error:', error)
        
        // Track failed verification attempt
        await this.otpService.recordFailedVerification(formattedPhone)
        
        return {
          success: false,
          error: 'Invalid verification code. Please check and try again.'
        }
      }

      if (!data.user || !data.session) {
        console.error('❌ [Phone Auth] Missing user or session in response')
        return {
          success: false,
          error: 'Authentication failed. Please try again.'
        }
      }

      console.log('✅ [Phone Auth] OTP verified, checking user record...')
      
      // Check if user exists in our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', formattedPhone)
        .single()

      console.log('📥 [Phone Auth] User lookup result:', { 
        found: !!userData, 
        error: userError ? userError.code : null 
      })

      if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('❌ [Phone Auth] User lookup error:', userError)
        return {
          success: false,
          error: 'Database error. Please try again.'
        }
      }

      // If user doesn't exist, they need to complete registration with role selection
      if (!userData) {
        console.log('ℹ️ [Phone Auth] New user - needs role selection')
        return {
          success: true,
          session: data.session,
          needsRoleSelection: true
        }
      }

      console.log('✅ [Phone Auth] Existing user found, role:', userData.role)
      
      // Clear rate limiting on successful verification
      await this.otpService.clearRateLimit(formattedPhone)

      return {
        success: true,
        session: data.session,
        user: userData,
        needsRoleSelection: false
      }
    } catch (error: any) {
      console.error('❌ [Phone Auth] Unexpected verify OTP error:', error)
      
      // Check if it's a timeout error
      if (error.message === 'Supabase verification timeout') {
        return {
          success: false,
          error: 'Verification is taking too long. Please check your internet connection and try again.'
        }
      }
      
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      }
    }
  }

  /**
   * Completes user registration with role selection
   * Requirement 2.4: Immutable role assignment
   */
  public async completeRegistration(
    phone: string, 
    fullName: string, 
    role: 'customer' | 'technician'
  ): Promise<AuthResult> {
    try {
      console.log('📝 [Phone Auth] Starting registration:', { phone, fullName, role })
      
      const validation = this.validatePhoneNumber(phone)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      if (!fullName || fullName.trim().length < 2) {
        return {
          success: false,
          error: 'Please enter your full name (minimum 2 characters)'
        }
      }

      if (!['customer', 'technician'].includes(role)) {
        return {
          success: false,
          error: 'Please select a valid role'
        }
      }

      const formattedPhone = validation.formatted!
      const trimmedName = fullName.trim()

      // Check if this is a test number - use dev mode
      const TEST_NUMBERS: Record<string, string> = {
        '+2348066025051': '123456',
        '+2348012345678': '654321'
      }
      
      const isTestNumber = formattedPhone in TEST_NUMBERS
      
      if (isTestNumber) {
        console.log('🧪 [Phone Auth] Test number - using dev mode registration')
        
        // For dev mode, create a mock user ID
        const mockUserId = `dev-user-${formattedPhone.replace('+', '')}`
        
        const mockUserData = {
          id: mockUserId,
          phone: formattedPhone,
          role: role,
          full_name: trimmedName,
          avatar_url: null,
          created_at: new Date().toISOString()
        }
        
        console.log('✅ [Phone Auth] Dev mode registration complete')
        return {
          success: true,
          session: null as any, // Mock session
          user: mockUserData as any,
          needsRoleSelection: false
        }
      }

      // For real numbers, proceed with Supabase
      // Get current session to ensure user is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        return {
          success: false,
          error: 'Session expired. Please start authentication again.'
        }
      }

      // Create user record with immutable role assignment
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          phone: formattedPhone,
          role: role,
          full_name: trimmedName
        })
        .select()
        .single()

      if (userError) {
        console.error('User creation error:', userError)
        
        // Handle duplicate phone number
        if (userError.code === '23505') {
          return {
            success: false,
            error: 'This phone number is already registered'
          }
        }
        
        return {
          success: false,
          error: 'Failed to complete registration. Please try again.'
        }
      }

      // Create role-specific profile
      if (role === 'customer') {
        const { error: profileError } = await supabase
          .from('customer_profiles')
          .insert({
            user_id: session.user.id
          })

        if (profileError) {
          console.error('Customer profile creation error:', profileError)
          return {
            success: false,
            error: 'Failed to create customer profile. Please try again.'
          }
        }
      } else if (role === 'technician') {
        // Technician profile will be created during verification workflow
        // For now, we just ensure the user record is created
      }

      return {
        success: true,
        session: session,
        user: userData,
        needsRoleSelection: false
      }
    } catch (error) {
      console.error('Complete registration error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      }
    }
  }

  /**
   * Gets user data for authenticated session
   */
  public async getCurrentUser(): Promise<Database['public']['Tables']['users']['Row'] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        return null
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Get current user error:', error)
        return null
      }

      return userData
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  /**
   * Signs out current user
   */
  public async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const phoneAuthService = PhoneAuthService.getInstance()