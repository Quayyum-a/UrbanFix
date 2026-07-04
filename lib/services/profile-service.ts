// Profile Management Service
// Handles customer and technician profile operations
// Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.5

import { supabase } from '@/lib/supabase'
import { locationService } from './location-service'
import { uploadService } from './upload-service'
import type { Database } from '@/types/database.types'

export type CustomerProfile = Database['public']['Tables']['customer_profiles']['Row'] & {
  user: Database['public']['Tables']['users']['Row']
}

export type TechnicianProfile = Database['public']['Tables']['technician_profiles']['Row'] & {
  user: Database['public']['Tables']['users']['Row']
}

export interface ProfileUpdateData {
  full_name?: string
  avatar_url?: string
  location?: {
    latitude: number
    longitude: number
  }
  address_text?: string
  shop_address?: string
}

interface ProfileResult {
  success: boolean
  error?: string
  profile?: CustomerProfile | TechnicianProfile
}

export class ProfileService {
  private static instance: ProfileService

  private constructor() {}

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService()
    }
    return ProfileService.instance
  }

  /**
   * Get customer profile by user ID
   */
  async getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select(`
          *,
          user:users(*)
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Get customer profile error:', error)
        return null
      }

      return data as CustomerProfile
    } catch (error) {
      console.error('Get customer profile error:', error)
      return null
    }
  }

  /**
   * Get technician profile by user ID
   */
  async getTechnicianProfile(userId: string): Promise<TechnicianProfile | null> {
    try {
      const { data, error } = await supabase
        .from('technician_profiles')
        .select(`
          *,
          user:users(*)
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Get technician profile error:', error)
        return null
      }

      return data as TechnicianProfile
    } catch (error) {
      console.error('Get technician profile error:', error)
      return null
    }
  }

  /**
   * Update user basic information (name, avatar)
   */
  async updateUserInfo(userId: string, updateData: {
    full_name?: string
    avatar_url?: string
  }): Promise<ProfileResult> {
    try {
      if (!updateData.full_name && !updateData.avatar_url) {
        return {
          success: false,
          error: 'No data provided for update'
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Update user info error:', error)
        return {
          success: false,
          error: 'Failed to update profile information'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Update user info error:', error)
      return {
        success: false,
        error: 'Network error occurred'
      }
    }
  }

  /**
   * Complete customer profile setup with location and address
   * Implements Requirements 3.3, 3.4: Location permission and address services
   */
  async completeCustomerProfile(userId: string, profileData: {
    address_text: string
    location?: {
      latitude: number
      longitude: number
    }
  }): Promise<ProfileResult> {
    try {
      // Validate address
      if (!profileData.address_text || profileData.address_text.trim().length < 10) {
        return {
          success: false,
          error: 'Please provide a valid pickup address (minimum 10 characters)'
        }
      }

      let location = profileData.location
      
      // If no location provided, try to geocode the address
      if (!location) {
        const geocodeResult = await locationService.geocodeAddress(profileData.address_text)
        if (geocodeResult.success && geocodeResult.location) {
          location = geocodeResult.location
        }
      }

      // Prepare update data
      const updateData: any = {
        address_text: profileData.address_text.trim()
      }

      // Add location as PostGIS point if available
      if (location) {
        updateData.location = `POINT(${location.longitude} ${location.latitude})`
      }

      const { data, error } = await supabase
        .from('customer_profiles')
        .upsert(updateData)
        .eq('user_id', userId)
        .select(`
          *,
          user:users(*)
        `)
        .single()

      if (error) {
        console.error('Complete customer profile error:', error)
        return {
          success: false,
          error: 'Failed to save profile information'
        }
      }

      return { 
        success: true,
        profile: data as CustomerProfile 
      }
    } catch (error) {
      console.error('Complete customer profile error:', error)
      return {
        success: false,
        error: 'Network error occurred'
      }
    }
  }

  /**
   * Initialize technician profile (basic setup for verification workflow)
   * Full technician verification is handled in Task 5.1
   */
  async initializeTechnicianProfile(userId: string, profileData: {
    shop_address?: string
  }): Promise<ProfileResult> {
    try {
      const updateData: any = {
        user_id: userId,
        verification_status: 'pending' as const
      }

      if (profileData.shop_address) {
        if (profileData.shop_address.trim().length < 10) {
          return {
            success: false,
            error: 'Please provide a valid shop address (minimum 10 characters)'
          }
        }
        updateData.shop_address = profileData.shop_address.trim()
      }

      const { data, error } = await supabase
        .from('technician_profiles')
        .upsert(updateData)
        .select(`
          *,
          user:users(*)
        `)
        .single()

      if (error) {
        console.error('Initialize technician profile error:', error)
        return {
          success: false,
          error: 'Failed to initialize technician profile'
        }
      }

      return { 
        success: true,
        profile: data as TechnicianProfile 
      }
    } catch (error) {
      console.error('Initialize technician profile error:', error)
      return {
        success: false,
        error: 'Network error occurred'
      }
    }
  }

  /**
   * Upload and update profile avatar
   * Implements Requirements 3.2: Profile photo upload
   */
  async updateAvatar(userId: string, imageUri: string): Promise<ProfileResult> {
    try {
      // Upload image to Supabase Storage
      const uploadResult = await uploadService.uploadProfileImage(userId, imageUri)
      
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload image'
        }
      }

      // Update user record with new avatar URL
      const updateResult = await this.updateUserInfo(userId, {
        avatar_url: uploadResult.url
      })

      return updateResult
    } catch (error) {
      console.error('Update avatar error:', error)
      return {
        success: false,
        error: 'Failed to update profile picture'
      }
    }
  }

  /**
   * Update customer address and location
   */
  async updateCustomerAddress(userId: string, addressData: {
    address_text: string
    location?: {
      latitude: number
      longitude: number
    }
  }): Promise<ProfileResult> {
    try {
      if (!addressData.address_text || addressData.address_text.trim().length < 10) {
        return {
          success: false,
          error: 'Please provide a valid address (minimum 10 characters)'
        }
      }

      let location = addressData.location
      
      // Try to geocode if no coordinates provided
      if (!location) {
        const geocodeResult = await locationService.geocodeAddress(addressData.address_text)
        if (geocodeResult.success && geocodeResult.location) {
          location = geocodeResult.location
        }
      }

      const updateData: any = {
        address_text: addressData.address_text.trim()
      }

      if (location) {
        updateData.location = `POINT(${location.longitude} ${location.latitude})`
      }

      const { data, error } = await supabase
        .from('customer_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select(`
          *,
          user:users(*)
        `)
        .single()

      if (error) {
        console.error('Update customer address error:', error)
        return {
          success: false,
          error: 'Failed to update address'
        }
      }

      return { 
        success: true,
        profile: data as CustomerProfile 
      }
    } catch (error) {
      console.error('Update customer address error:', error)
      return {
        success: false,
        error: 'Network error occurred'
      }
    }
  }

  /**
   * Check if profile setup is complete for user role
   */
  async isProfileComplete(userId: string, role: 'customer' | 'technician'): Promise<boolean> {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        return false
      }

      // Basic user info required
      if (!userData.full_name || userData.full_name.trim().length < 2) {
        return false
      }

      if (role === 'customer') {
        const { data: customerData, error: customerError } = await supabase
          .from('customer_profiles')
          .select('address_text')
          .eq('user_id', userId)
          .single()

        if (customerError || !customerData) {
          return false
        }

        // Customer needs address
        return !!(customerData.address_text && customerData.address_text.trim().length >= 10)
      } else if (role === 'technician') {
        const { data: technicianData, error: technicianError } = await supabase
          .from('technician_profiles')
          .select('verification_status')
          .eq('user_id', userId)
          .single()

        if (technicianError || !technicianData) {
          return false
        }

        // Technician profile should exist (basic setup complete)
        return true
      }

      return false
    } catch (error) {
      console.error('Check profile complete error:', error)
      return false
    }
  }

  /**
   * Get profile completion status with details
   */
  async getProfileCompletionStatus(userId: string, role: 'customer' | 'technician'): Promise<{
    isComplete: boolean
    missing: string[]
    profile?: CustomerProfile | TechnicianProfile
  }> {
    try {
      const missing: string[] = []

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        return {
          isComplete: false,
          missing: ['User profile not found']
        }
      }

      if (!userData.full_name || userData.full_name.trim().length < 2) {
        missing.push('Full name')
      }

      if (role === 'customer') {
        const profile = await this.getCustomerProfile(userId)
        
        if (!profile) {
          missing.push('Customer profile')
        } else if (!profile.address_text || profile.address_text.trim().length < 10) {
          missing.push('Pickup address')
        }

        return {
          isComplete: missing.length === 0,
          missing,
          profile: profile || undefined
        }
      } else if (role === 'technician') {
        const profile = await this.getTechnicianProfile(userId)
        
        if (!profile) {
          missing.push('Technician profile')
        }

        return {
          isComplete: missing.length === 0,
          missing,
          profile: profile || undefined
        }
      }

      return {
        isComplete: false,
        missing: ['Invalid role']
      }
    } catch (error) {
      console.error('Get profile completion status error:', error)
      return {
        isComplete: false,
        missing: ['System error']
      }
    }
  }
}

// Export singleton instance
export const profileService = ProfileService.getInstance()