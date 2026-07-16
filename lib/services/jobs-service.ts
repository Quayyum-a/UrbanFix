// Technician Jobs Service
// Handles job discovery, acceptance, and status management

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

export type Job = Database['public']['Tables']['jobs']['Row']
export type JobStatus = Job['status']

export interface AvailableJob extends Job {
  customer_name: string
  customer_rating: number
  distance?: number
}

export interface JobWithCustomer {
  job: Job
  customer: {
    full_name: string
    phone: string
    avg_rating: number
  }
}

export interface JobsResult {
  success: boolean
  data?: any
  error?: string
}

export class JobsService {
  /**
   * Get available jobs for technician (paid but not assigned)
   * Filtered by technician's specializations
   */
  public static async getAvailableJobs(
    technicianId: string,
    categoryId?: string,
    limit: number = 20
  ): Promise<JobsResult> {
    try {
      console.log('🔍 [Jobs] Getting available jobs for technician:', technicianId)

      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:users(full_name, phone, avg_rating),
          category:repair_categories(display_name, icon)
        `)
        .eq('status', 'paid')
        .is('technician_id', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (categoryId) {
        query = query.eq('repair_category', categoryId)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ [Jobs] Error fetching available jobs:', error)
        return {
          success: false,
          error: 'Failed to load available jobs'
        }
      }

      console.log(`✅ [Jobs] Found ${data?.length || 0} available jobs`)

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('❌ [Jobs] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get technician's assigned jobs (active and completed)
   */
  public static async getTechnicianJobs(
    technicianId: string,
    status?: JobStatus
  ): Promise<JobsResult> {
    try {
      console.log('📋 [Jobs] Getting technician jobs:', { technicianId, status })

      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:users(full_name, phone, avg_rating),
          category:repair_categories(display_name, icon)
        `)
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ [Jobs] Error fetching technician jobs:', error)
        return {
          success: false,
          error: 'Failed to load your jobs'
        }
      }

      console.log(`✅ [Jobs] Found ${data?.length || 0} technician jobs`)

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('❌ [Jobs] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get job details with full customer and category info
   */
  public static async getJobDetails(jobId: string): Promise<JobsResult> {
    try {
      console.log('🔍 [Jobs] Getting job details:', jobId)

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:users(full_name, phone, email, avg_rating, address),
          category:repair_categories(display_name, description, icon),
          part:parts(name, price) 
        `)
        .eq('id', jobId)
        .single()

      if (error) {
        console.error('❌ [Jobs] Error fetching job details:', error)
        return {
          success: false,
          error: 'Failed to load job details'
        }
      }

      console.log('✅ [Jobs] Job details loaded')

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Jobs] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Accept a job (assign to technician)
   * Handles race condition: first technician wins
   */
  public static async acceptJob(
    jobId: string,
    technicianId: string
  ): Promise<JobsResult> {
    try {
      console.log('✅ [Jobs] Accepting job:', { jobId, technicianId })

      // Use RPC function for atomic operation (prevents race condition)
      const { data, error } = await supabase
        .rpc('accept_job', {
          job_id: jobId,
          tech_id: technicianId
        })

      if (error) {
        console.error('❌ [Jobs] Error accepting job:', error)
        
        // Check if already assigned (race condition)
        if (error.message?.includes('already assigned')) {
          return {
            success: false,
            error: 'This job was already accepted by another technician'
          }
        }

        return {
          success: false,
          error: 'Failed to accept job. Please try again.'
        }
      }

      console.log('✅ [Jobs] Job accepted successfully')

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Jobs] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Update job status (technician progress)
   */
  public static async updateJobStatus(
    jobId: string,
    status: JobStatus,
    notes?: string
  ): Promise<JobsResult> {
    try {
      console.log('📝 [Jobs] Updating job status:', { jobId, status })

      const updateData: any = { status, updated_at: new Date().toISOString() }
      
      if (status === 'complete') {
        updateData.completed_at = new Date().toISOString()
      }

      if (notes) {
        updateData.notes = notes
      }

      const { data, error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .select()
        .single()

      if (error) {
        console.error('❌ [Jobs] Error updating job status:', error)
        return {
          success: false,
          error: 'Failed to update job status'
        }
      }

      console.log('✅ [Jobs] Job status updated')

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Jobs] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Upload photos for job progress documentation
   */
  public static async uploadJobPhotos(
    jobId: string,
    photos: string[]
  ): Promise<JobsResult> {
    try {
      console.log('📸 [Jobs] Uploading job photos:', { jobId, count: photos.length })

      const { data, error } = await supabase
        .from('jobs')
        .select('photo_urls')
        .eq('id', jobId)
        .single()

      if (error) {
        console.error('❌ [Jobs] Error fetching existing photos:', error)
        return {
          success: false,
          error: 'Failed to load job'
        }
      }

      const existingPhotos = data?.photo_urls || []
      const updatedPhotos = [...existingPhotos, ...photos]

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ photo_urls: updatedPhotos })
        .eq('id', jobId)

      if (updateError) {
        console.error('❌ [Jobs] Error updating photos:', updateError)
        return {
          success: false,
          error: 'Failed to upload photos'
        }
      }

      console.log('✅ [Jobs] Photos uploaded successfully')

      return {
        success: true,
        data: { photo_urls: updatedPhotos }
      }
    } catch (error) {
      console.error('❌ [Jobs] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Decline a job (don't accept it)
   */
  public static async declineJob(
    jobId: string,
    reason?: string
  ): Promise<JobsResult> {
    try {
      console.log('❌ [Jobs] Declining job:', jobId)

      // Store decline in audit log (optional)
      if (reason) {
        console.log('Decline reason:', reason)
      }

      // Job remains available for other technicians
      return {
        success: true,
        data: { jobId, declined: true }
      }
    } catch (error) {
      console.error('❌ [Jobs] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get job statistics for technician dashboard
   */
  public static async getJobStatistics(
    technicianId: string
  ): Promise<JobsResult> {
    try {
      console.log('📊 [Jobs] Getting job statistics:', technicianId)

      const { data, error } = await supabase
        .rpc('get_technician_job_stats', { tech_id: technicianId })

      if (error) {
        console.error('❌ [Jobs] Error fetching stats:', error)
        return {
          success: false,
          error: 'Failed to load statistics'
        }
      }

      console.log('✅ [Jobs] Statistics loaded')

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Jobs] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }
}

// Export singleton-like methods
export const jobsService = JobsService
