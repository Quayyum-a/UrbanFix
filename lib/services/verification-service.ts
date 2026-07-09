// Technician verification service
// Handles database operations for technician verification

import { supabase } from '@/lib/supabase'
import type {
  TechnicianVerification,
  VerificationDocument,
  VerificationWithDocuments,
  CreateVerificationDTO,
  UploadDocumentDTO,
  ReviewVerificationDTO,
  VerificationStatistics
} from '@/types/verification.types'

export interface VerificationResult {
  success: boolean
  data?: any
  error?: string
}

export class VerificationService {
  /**
   * Submit technician verification
   * Requirements: 4.1, 4.2, 4.3
   */
  public static async submitVerification(
    userId: string,
    data: CreateVerificationDTO
  ): Promise<VerificationResult> {
    try {
      console.log('📝 [Verification] Submitting verification for user:', userId)

      const { data: verification, error } = await supabase
        .from('technician_verifications')
        .insert({
          user_id: userId,
          nin: data.nin,
          bvn: data.bvn,
          account_number: data.account_number,
          bank_code: data.bank_code,
          bank_name: data.bank_name,
          account_name: data.account_name,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [Verification] Submit error:', error)
        
        if (error.code === '23505') {
          return {
            success: false,
            error: 'You have already submitted a verification request'
          }
        }
        
        return {
          success: false,
          error: 'Failed to submit verification. Please try again.'
        }
      }

      console.log('✅ [Verification] Verification submitted:', verification.id)

      return {
        success: true,
        data: verification
      }
    } catch (error) {
      console.error('❌ [Verification] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Upload verification document
   * Requirements: 4.2
   */
  public static async uploadDocument(
    data: UploadDocumentDTO
  ): Promise<VerificationResult> {
    try {
      console.log('📤 [Verification] Uploading document:', data.document_type)

      const { data: document, error } = await supabase
        .from('verification_documents')
        .insert({
          verification_id: data.verification_id,
          document_type: data.document_type,
          file_url: data.file_url,
          file_path: data.file_path,
          file_name: data.file_name,
          file_size: data.file_size,
          mime_type: data.mime_type
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [Verification] Upload document error:', error)
        return {
          success: false,
          error: 'Failed to save document information'
        }
      }

      console.log('✅ [Verification] Document uploaded:', document.id)

      return {
        success: true,
        data: document
      }
    } catch (error) {
      console.error('❌ [Verification] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get verification for current user
   */
  public static async getMyVerification(
    userId: string
  ): Promise<VerificationResult> {
    try {
      console.log('🔍 [Verification] Getting verification for user:', userId)

      const { data, error } = await supabase
        .from('technician_verifications')
        .select(`
          *,
          documents:verification_documents(*)
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No verification found
          return {
            success: true,
            data: null
          }
        }
        
        console.error('❌ [Verification] Get verification error:', error)
        return {
          success: false,
          error: 'Failed to load verification status'
        }
      }

      console.log('✅ [Verification] Verification found:', data.status)

      return {
        success: true,
        data: data as VerificationWithDocuments
      }
    } catch (error) {
      console.error('❌ [Verification] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get all pending verifications (Admin only)
   * Requirements: 4.7, 19.1
   */
  public static async getPendingVerifications(): Promise<VerificationResult> {
    try {
      console.log('🔍 [Verification] Getting pending verifications')

      const { data, error } = await supabase
        .from('technician_verifications')
        .select(`
          *,
          user:users(id, full_name, phone),
          documents:verification_documents(*)
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })

      if (error) {
        console.error('❌ [Verification] Get pending error:', error)
        return {
          success: false,
          error: 'Failed to load pending verifications'
        }
      }

      console.log(`✅ [Verification] Found ${data.length} pending verifications`)

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Verification] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Approve or reject verification (Admin only)
   * Requirements: 4.7, 4.8, 19.3, 19.4
   */
  public static async reviewVerification(
    review: ReviewVerificationDTO
  ): Promise<VerificationResult> {
    try {
      console.log('👨‍💼 [Verification] Reviewing verification:', review.verification_id)

      const updateData: any = {
        status: review.status
      }

      if (review.status === 'rejected' && review.rejection_reason) {
        updateData.rejection_reason = review.rejection_reason
      }

      const { data, error } = await supabase
        .from('technician_verifications')
        .update(updateData)
        .eq('id', review.verification_id)
        .select()
        .single()

      if (error) {
        console.error('❌ [Verification] Review error:', error)
        return {
          success: false,
          error: 'Failed to update verification status'
        }
      }

      console.log(`✅ [Verification] Verification ${review.status}:`, data.id)

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Verification] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get verification statistics (Admin only)
   * Requirements: 27.1
   */
  public static async getVerificationStatistics(): Promise<VerificationResult> {
    try {
      console.log('📊 [Verification] Getting statistics')

      const { data, error } = await supabase
        .from('verification_statistics')
        .select('*')
        .single()

      if (error) {
        console.error('❌ [Verification] Get statistics error:', error)
        return {
          success: false,
          error: 'Failed to load statistics'
        }
      }

      console.log('✅ [Verification] Statistics loaded')

      return {
        success: true,
        data: data as VerificationStatistics
      }
    } catch (error) {
      console.error('❌ [Verification] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Check if technician can accept jobs
   * Requirements: 8.2
   */
  public static async canAcceptJobs(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('can_accept_jobs', { technician_user_id: userId })

      if (error) {
        console.error('❌ [Verification] Check can accept jobs error:', error)
        return false
      }

      return data === true
    } catch (error) {
      console.error('❌ [Verification] Unexpected error:', error)
      return false
    }
  }

  /**
   * Delete verification (for resubmission)
   */
  public static async deleteVerification(
    verificationId: string
  ): Promise<VerificationResult> {
    try {
      console.log('🗑️ [Verification] Deleting verification:', verificationId)

      const { error } = await supabase
        .from('technician_verifications')
        .delete()
        .eq('id', verificationId)

      if (error) {
        console.error('❌ [Verification] Delete error:', error)
        return {
          success: false,
          error: 'Failed to delete verification'
        }
      }

      console.log('✅ [Verification] Verification deleted')

      return {
        success: true
      }
    } catch (error) {
      console.error('❌ [Verification] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }
}
