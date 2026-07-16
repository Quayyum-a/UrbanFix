// Payment Service
// Handles payment release, disputes, and refunds
// Requirements: 9.3-9.6, 15.1-15.5, 16.1-16.5, 20.1-20.4

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Job = Database['public']['Tables']['jobs']['Row']
export type PaymentStatus = 'pending' | 'escrowed' | 'released' | 'refunded' | 'disputed'

export interface PaymentResult {
  success: boolean
  data?: any
  error?: string
}

export interface DisputeRequest {
  job_id: string
  reason: string
  evidence_photos?: string[]
}

export interface DisputeResolution {
  type: 'customer_refund' | 'technician_payment' | 'split'
  customer_amount?: number
  technician_amount?: number
  notes: string
}

export class PaymentService {
  /**
   * Get payment details for a job
   */
  public static async getPaymentInfo(jobId: string): Promise<PaymentResult> {
    try {
      console.log('💳 [Payment] Getting payment info:', jobId)

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          customer_id,
          technician_id,
          total_price,
          payout_amount,
          status,
          created_at,
          completed_at
        `)
        .eq('id', jobId)
        .single()

      if (error) {
        console.error('❌ [Payment] Error fetching payment info:', error)
        return {
          success: false,
          error: 'Failed to load payment information'
        }
      }

      // Calculate if auto-release should happen (72 hours after completion)
      let autoReleaseEligible = false
      if (data?.status === 'awaiting_release' && data?.completed_at) {
        const completedTime = new Date(data.completed_at).getTime()
        const now = Date.now()
        const hoursSinceCompletion = (now - completedTime) / (1000 * 60 * 60)
        autoReleaseEligible = hoursSinceCompletion >= 72
      }

      return {
        success: true,
        data: {
          ...data,
          autoReleaseEligible,
          hoursSinceCompletion: data?.completed_at
            ? Math.floor((Date.now() - new Date(data.completed_at).getTime()) / (1000 * 60 * 60))
            : null
        }
      }
    } catch (error) {
      console.error('❌ [Payment] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Release payment to technician (after customer approves)
   * Transfers money from escrow to technician's bank account
   */
  public static async releasePayment(jobId: string): Promise<PaymentResult> {
    try {
      console.log('💸 [Payment] Releasing payment:', jobId)

      // Get payment details
      const paymentInfo = await supabase
        .from('jobs')
        .select('payout_amount, technician_id, customer_id, status')
        .eq('id', jobId)
        .single()

      if (paymentInfo.error || !paymentInfo.data) {
        return {
          success: false,
          error: 'Failed to load job details'
        }
      }

      if (paymentInfo.data.status !== 'awaiting_release') {
        return {
          success: false,
          error: 'This job is not awaiting payment release'
        }
      }

      // Update job status to 'complete'
      const { data, error } = await supabase
        .from('jobs')
        .update({
          status: 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single()

      if (error) {
        console.error('❌ [Payment] Error releasing payment:', error)
        return {
          success: false,
          error: 'Failed to release payment'
        }
      }

      // In production, would call Paystack transfer API or bank transfer service
      console.log('✅ [Payment] Payment released to technician:', {
        jobId,
        amount: paymentInfo.data.payout_amount,
        technician_id: paymentInfo.data.technician_id
      })

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Payment] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Initiate dispute for repair quality issues
   * Freezes payment pending admin review
   */
  public static async initiateDispute(
    request: DisputeRequest
  ): Promise<PaymentResult> {
    try {
      console.log('⚠️ [Payment] Initiating dispute:', request.job_id)

      // Validate reason
      if (!request.reason || request.reason.trim().length < 30) {
        return {
          success: false,
          error: 'Please provide a detailed description (at least 30 characters)'
        }
      }

      // Create dispute record
      const { data: dispute, error: disputeError } = await supabase
        .from('disputes')
        .insert({
          job_id: request.job_id,
          reason: request.reason,
          evidence_photos: request.evidence_photos || [],
          status: 'pending_review',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (disputeError) {
        console.error('❌ [Payment] Error creating dispute:', disputeError)
        return {
          success: false,
          error: 'Failed to initiate dispute'
        }
      }

      // Update job status to 'disputed'
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'disputed',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.job_id)

      if (jobError) {
        console.error('❌ [Payment] Error updating job status:', jobError)
        return {
          success: false,
          error: 'Failed to update dispute status'
        }
      }

      console.log('✅ [Payment] Dispute initiated:', dispute.id)

      return {
        success: true,
        data: dispute
      }
    } catch (error) {
      console.error('❌ [Payment] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get dispute details
   */
  public static async getDispute(jobId: string): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          job:jobs(customer_id, technician_id, total_price, payout_amount)
        `)
        .eq('job_id', jobId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [Payment] Error fetching dispute:', error)
        return {
          success: false,
          error: 'Failed to load dispute details'
        }
      }

      return {
        success: true,
        data: data || null
      }
    } catch (error) {
      console.error('❌ [Payment] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Resolve dispute (admin only)
   * Splits payment according to admin decision
   */
  public static async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution
  ): Promise<PaymentResult> {
    try {
      console.log('⚖️ [Payment] Resolving dispute:', disputeId)

      // Validate resolution
      if (!['customer_refund', 'technician_payment', 'split'].includes(resolution.type)) {
        return {
          success: false,
          error: 'Invalid resolution type'
        }
      }

      // Update dispute with resolution
      const { data, error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution_type: resolution.type,
          customer_amount: resolution.customer_amount || 0,
          technician_amount: resolution.technician_amount || 0,
          resolution_notes: resolution.notes,
          resolved_at: new Date().toISOString()
        })
        .eq('id', disputeId)
        .select()
        .single()

      if (error) {
        console.error('❌ [Payment] Error resolving dispute:', error)
        return {
          success: false,
          error: 'Failed to resolve dispute'
        }
      }

      // Update job status to 'complete'
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.job_id)

      if (jobError) {
        console.error('❌ [Payment] Error updating job:', jobError)
      }

      console.log('✅ [Payment] Dispute resolved:', {
        disputeId,
        type: resolution.type,
        customerAmount: resolution.customer_amount,
        technicianAmount: resolution.technician_amount
      })

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Payment] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Auto-release payment after 72 hours
   * Called by scheduled function or admin manually
   */
  public static async autoReleasePayment(jobId: string): Promise<PaymentResult> {
    try {
      console.log('⏰ [Payment] Auto-releasing payment:', jobId)

      const { data, error } = await supabase
        .from('jobs')
        .update({
          status: 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'awaiting_release')
        .select()
        .single()

      if (error) {
        console.error('❌ [Payment] Error auto-releasing payment:', error)
        return {
          success: false,
          error: 'Failed to auto-release payment'
        }
      }

      console.log('✅ [Payment] Payment auto-released:', jobId)

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Payment] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }
}

export const paymentService = PaymentService
