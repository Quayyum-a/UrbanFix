// Rating & Review Service
// Handles customer ratings and reviews for technicians
// Requirements: 17.1-17.5, 18.1-18.5

import { supabase } from '@/lib/supabase'

export interface RatingRequest {
  job_id: string
  technician_id: string
  customer_id: string
  rating: number // 1-5
  review?: string
}

export interface RatingResult {
  success: boolean
  data?: any
  error?: string
}

export class RatingService {
  /**
   * Submit rating and review for completed job
   */
  public static async submitRating(
    request: RatingRequest
  ): Promise<RatingResult> {
    try {
      console.log('⭐ [Rating] Submitting rating:', {
        jobId: request.job_id,
        rating: request.rating,
        hasReview: !!request.review
      })

      // Validate rating
      if (request.rating < 1 || request.rating > 5) {
        return {
          success: false,
          error: 'Rating must be between 1 and 5'
        }
      }

      // Validate review length if provided
      if (request.review && request.review.length > 500) {
        return {
          success: false,
          error: 'Review must be less than 500 characters'
        }
      }

      // Create rating record
      const { data, error } = await supabase
        .from('ratings')
        .insert({
          job_id: request.job_id,
          technician_id: request.technician_id,
          customer_id: request.customer_id,
          rating: request.rating,
          review: request.review || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [Rating] Error submitting rating:', error)
        return {
          success: false,
          error: 'Failed to submit rating'
        }
      }

      // Update technician's average rating (triggers RPC or trigger)
      await this.updateTechnicianRating(request.technician_id)

      console.log('✅ [Rating] Rating submitted successfully')

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Rating] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get all ratings for a technician
   */
  public static async getTechnicianRatings(
    technicianId: string,
    limit: number = 10
  ): Promise<RatingResult> {
    try {
      console.log('📊 [Rating] Getting technician ratings:', technicianId)

      const { data, error } = await supabase
        .from('ratings')
        .select(`
          *,
          customer:users(full_name, avatar_url),
          job:jobs(device_brand, device_model, repair_category)
        `)
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ [Rating] Error fetching ratings:', error)
        return {
          success: false,
          error: 'Failed to load ratings'
        }
      }

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('❌ [Rating] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get technician rating summary
   */
  public static async getTechnicianRatingSummary(
    technicianId: string
  ): Promise<RatingResult> {
    try {
      console.log('📈 [Rating] Getting rating summary:', technicianId)

      const { data, error } = await supabase
        .from('technician_profiles')
        .select('avg_rating, total_reviews, completed_jobs')
        .eq('user_id', technicianId)
        .single()

      if (error) {
        console.error('❌ [Rating] Error fetching summary:', error)
        return {
          success: false,
          error: 'Failed to load rating summary'
        }
      }

      return {
        success: true,
        data: {
          averageRating: data?.avg_rating || 0,
          totalReviews: data?.total_reviews || 0,
          completedJobs: data?.completed_jobs || 0
        }
      }
    } catch (error) {
      console.error('❌ [Rating] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Update technician's average rating
   * Called after new rating is submitted
   */
  private static async updateTechnicianRating(
    technicianId: string
  ): Promise<void> {
    try {
      // Get all ratings for technician
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('rating')
        .eq('technician_id', technicianId)

      if (ratingsError || !ratings) {
        console.error('Error fetching ratings for update:', ratingsError)
        return
      }

      // Calculate average
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0

      // Update technician profile
      await supabase
        .from('technician_profiles')
        .update({
          avg_rating: parseFloat(avgRating.toFixed(2)),
          total_reviews: ratings.length
        })
        .eq('user_id', technicianId)

      console.log('✅ [Rating] Technician rating updated:', {
        technicianId,
        avgRating: parseFloat(avgRating.toFixed(2)),
        totalReviews: ratings.length
      })
    } catch (error) {
      console.error('❌ [Rating] Error updating technician rating:', error)
    }
  }

  /**
   * Check if customer can rate a job
   * (Job must be complete and not already rated)
   */
  public static async canRateJob(jobId: string): Promise<RatingResult> {
    try {
      // Check job status
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', jobId)
        .single()

      if (jobError || !job) {
        return {
          success: false,
          error: 'Job not found'
        }
      }

      if (job.status !== 'complete') {
        return {
          success: false,
          error: 'Job must be complete before rating'
        }
      }

      // Check if already rated
      const { data: existingRating, error: ratingError } = await supabase
        .from('ratings')
        .select('id')
        .eq('job_id', jobId)
        .single()

      if (ratingError && ratingError.code !== 'PGRST116') {
        return {
          success: false,
          error: 'Error checking rating status'
        }
      }

      if (existingRating) {
        return {
          success: false,
          error: 'This job has already been rated'
        }
      }

      return {
        success: true,
        data: { canRate: true }
      }
    } catch (error) {
      console.error('❌ [Rating] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get customer's rating for a specific job
   */
  public static async getJobRating(jobId: string): Promise<RatingResult> {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('job_id', jobId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [Rating] Error fetching rating:', error)
        return {
          success: false,
          error: 'Failed to load rating'
        }
      }

      return {
        success: true,
        data: data || null
      }
    } catch (error) {
      console.error('❌ [Rating] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }
}

export const ratingService = RatingService
