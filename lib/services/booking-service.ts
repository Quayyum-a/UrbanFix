// Booking Service
// Handles customer repair booking flow with payment integration

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Job = Database['public']['Tables']['jobs']['Row']

export interface BookingRequest {
  customer_id: string
  device_brand: string
  device_model: string
  repair_category: string
  part_id?: string | null
  part_price: number
  labour_price: number
  platform_fee: number
  total_price: number
  payout_amount: number
  photo_urls?: string[]
  pickup_address: string
  notes?: string
}

export interface BookingResult {
  success: boolean
  data?: any
  error?: string
}

export interface PaymentInitRequest {
  email: string
  amount: number
  reference: string
  currency?: string
}

export class BookingService {
  /**
   * Create a booking and initialize payment
   * Returns booking ID and payment reference
   */
  public static async createBooking(
    request: BookingRequest
  ): Promise<BookingResult> {
    try {
      console.log('📝 [Booking] Creating booking:', {
        customer_id: request.customer_id,
        device: `${request.device_brand} ${request.device_model}`,
        category: request.repair_category,
        total: request.total_price
      })

      // Create booking with 'booked' status (payment pending)
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          customer_id: request.customer_id,
          device_brand: request.device_brand,
          device_model: request.device_model,
          repair_category: request.repair_category,
          part_id: request.part_id || null,
          part_price: request.part_price,
          labour_price: request.labour_price,
          platform_fee: request.platform_fee,
          total_price: request.total_price,
          payout_amount: request.payout_amount,
          photo_urls: request.photo_urls || [],
          pickup_address: request.pickup_address,
          notes: request.notes || null,
          status: 'booked'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [Booking] Error creating booking:', error)
        return {
          success: false,
          error: 'Failed to create booking. Please try again.'
        }
      }

      console.log('✅ [Booking] Booking created:', data.id)

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Booking] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Confirm payment and update booking status to 'paid'
   * Called after successful Paystack payment
   */
  public static async confirmPayment(
    jobId: string,
    paymentReference: string
  ): Promise<BookingResult> {
    try {
      console.log('💳 [Booking] Confirming payment:', { jobId, reference: paymentReference })

      const { data, error } = await supabase
        .from('jobs')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single()

      if (error) {
        console.error('❌ [Booking] Error confirming payment:', error)
        return {
          success: false,
          error: 'Failed to confirm payment'
        }
      }

      console.log('✅ [Booking] Payment confirmed')

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Booking] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get booking details
   */
  public static async getBooking(jobId: string): Promise<BookingResult> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:users(full_name, phone),
          category:repair_categories(display_name, description),
          part:parts(name)
        `)
        .eq('id', jobId)
        .single()

      if (error) {
        console.error('❌ [Booking] Error fetching booking:', error)
        return {
          success: false,
          error: 'Failed to load booking details'
        }
      }

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Booking] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get customer's bookings
   */
  public static async getCustomerBookings(
    customerId: string,
    status?: string
  ): Promise<BookingResult> {
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          category:repair_categories(display_name, icon)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ [Booking] Error fetching bookings:', error)
        return {
          success: false,
          error: 'Failed to load bookings'
        }
      }

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('❌ [Booking] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Cancel booking (before payment)
   */
  public static async cancelBooking(jobId: string): Promise<BookingResult> {
    try {
      console.log('❌ [Booking] Cancelling booking:', jobId)

      const { data, error } = await supabase
        .from('jobs')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single()

      if (error) {
        console.error('❌ [Booking] Error cancelling booking:', error)
        return {
          success: false,
          error: 'Failed to cancel booking'
        }
      }

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Booking] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Calculate pricing for booking
   * Gets part price from catalogue and combines with labour price
   */
  public static calculateTotalPrice(
    partPrice: number,
    labourPrice: number,
    platformFeePercentage: number = 10
  ): {
    partPrice: number
    labourPrice: number
    platformFee: number
    totalPrice: number
    payoutAmount: number
  } {
    const platformFee = Math.round((labourPrice + partPrice) * (platformFeePercentage / 100))
    const totalPrice = partPrice + labourPrice + platformFee
    const payoutAmount = totalPrice - platformFee

    return {
      partPrice,
      labourPrice,
      platformFee,
      totalPrice,
      payoutAmount
    }
  }
}

// Export singleton methods
export const bookingService = BookingService
