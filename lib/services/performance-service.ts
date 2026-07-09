// Technician performance tracking service
// Handles earnings, metrics, and performance data retrieval

import { supabase } from '@/lib/supabase'
import type {
  TechnicianPerformanceSummary,
  EarningHistoryItem,
  TechnicianReview,
  EarningsByCategory,
  PerformanceLeaderboardEntry,
  UpdatePayoutDTO,
  EarningsFilterOptions,
  PerformanceDashboardData,
  PerformanceResult
} from '@/types/performance.types'

export class PerformanceService {
  /**
   * Get technician performance summary
   * Requirements: 18.1, 18.2, 18.3
   */
  public static async getPerformanceSummary(
    technicianId: string
  ): Promise<PerformanceResult> {
    try {
      console.log('📊 [Performance] Getting performance summary for:', technicianId)

      const { data, error } = await supabase
        .rpc('get_technician_performance', { technician_user_id: technicianId })
        .single()

      if (error) {
        console.error('❌ [Performance] Get summary error:', error)
        return {
          success: false,
          error: 'Failed to load performance summary'
        }
      }

      console.log('✅ [Performance] Summary loaded:', data)

      return {
        success: true,
        data: data as TechnicianPerformanceSummary
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get technician earnings history with pagination
   * Requirements: 18.5
   */
  public static async getEarningsHistory(
    technicianId: string,
    options: EarningsFilterOptions = {}
  ): Promise<PerformanceResult> {
    try {
      console.log('💰 [Performance] Getting earnings history for:', technicianId)

      const { limit = 20, offset = 0 } = options

      const { data, error } = await supabase
        .rpc('get_technician_earnings_history', {
          technician_user_id: technicianId,
          limit_count: limit,
          offset_count: offset
        })

      if (error) {
        console.error('❌ [Performance] Get earnings history error:', error)
        return {
          success: false,
          error: 'Failed to load earnings history'
        }
      }

      console.log(`✅ [Performance] Found ${data.length} earnings records`)

      return {
        success: true,
        data: data as EarningHistoryItem[]
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get technician recent reviews
   * Requirements: 18.4
   */
  public static async getRecentReviews(
    technicianId: string,
    limit: number = 5
  ): Promise<PerformanceResult> {
    try {
      console.log('⭐ [Performance] Getting recent reviews for:', technicianId)

      const { data, error } = await supabase
        .rpc('get_technician_recent_reviews', {
          technician_user_id: technicianId,
          limit_count: limit
        })

      if (error) {
        console.error('❌ [Performance] Get reviews error:', error)
        return {
          success: false,
          error: 'Failed to load reviews'
        }
      }

      console.log(`✅ [Performance] Found ${data.length} reviews`)

      return {
        success: true,
        data: data as TechnicianReview[]
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get earnings breakdown by category
   * Requirements: 18.1
   */
  public static async getEarningsByCategory(
    technicianId: string
  ): Promise<PerformanceResult> {
    try {
      console.log('📈 [Performance] Getting earnings by category for:', technicianId)

      const { data, error } = await supabase
        .from('technician_earnings_by_category')
        .select('*')
        .eq('technician_id', technicianId)
        .order('total_earnings', { ascending: false })

      if (error) {
        console.error('❌ [Performance] Get earnings by category error:', error)
        return {
          success: false,
          error: 'Failed to load earnings breakdown'
        }
      }

      console.log(`✅ [Performance] Found ${data.length} category breakdowns`)

      return {
        success: true,
        data: data as EarningsByCategory[]
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get complete performance dashboard data
   * Combines all relevant metrics in one call
   * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
   */
  public static async getDashboardData(
    technicianId: string
  ): Promise<PerformanceResult> {
    try {
      console.log('🎯 [Performance] Getting complete dashboard data for:', technicianId)

      // Fetch all data in parallel
      const [summaryResult, earningsResult, reviewsResult, categoryResult] = await Promise.all([
        this.getPerformanceSummary(technicianId),
        this.getEarningsHistory(technicianId, { limit: 10 }),
        this.getRecentReviews(technicianId, 5),
        this.getEarningsByCategory(technicianId)
      ])

      // Check for errors
      if (!summaryResult.success) {
        return summaryResult
      }

      const dashboardData: PerformanceDashboardData = {
        summary: summaryResult.data,
        recent_earnings: earningsResult.success ? earningsResult.data : [],
        recent_reviews: reviewsResult.success ? reviewsResult.data : [],
        earnings_by_category: categoryResult.success ? categoryResult.data : []
      }

      console.log('✅ [Performance] Dashboard data loaded successfully')

      return {
        success: true,
        data: dashboardData
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get total earnings
   * Requirements: 18.1
   */
  public static async getTotalEarnings(
    technicianId: string
  ): Promise<PerformanceResult> {
    try {
      console.log('💵 [Performance] Getting total earnings for:', technicianId)

      const { data, error } = await supabase
        .rpc('get_technician_total_earnings', { technician_user_id: technicianId })

      if (error) {
        console.error('❌ [Performance] Get total earnings error:', error)
        return {
          success: false,
          error: 'Failed to load total earnings'
        }
      }

      console.log('✅ [Performance] Total earnings:', data)

      return {
        success: true,
        data: data as number
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get pending payouts
   * Requirements: 18.5
   */
  public static async getPendingPayouts(
    technicianId: string
  ): Promise<PerformanceResult> {
    try {
      console.log('⏳ [Performance] Getting pending payouts for:', technicianId)

      const { data, error } = await supabase
        .rpc('get_technician_pending_payouts', { technician_user_id: technicianId })

      if (error) {
        console.error('❌ [Performance] Get pending payouts error:', error)
        return {
          success: false,
          error: 'Failed to load pending payouts'
        }
      }

      console.log('✅ [Performance] Pending payouts:', data)

      return {
        success: true,
        data: data as number
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get average job completion time
   * Requirements: 18.2
   */
  public static async getAvgCompletionTime(
    technicianId: string
  ): Promise<PerformanceResult> {
    try {
      console.log('⏱️ [Performance] Getting avg completion time for:', technicianId)

      const { data, error } = await supabase
        .rpc('get_technician_avg_completion_time', { technician_user_id: technicianId })

      if (error) {
        console.error('❌ [Performance] Get avg completion time error:', error)
        return {
          success: false,
          error: 'Failed to load completion time'
        }
      }

      console.log('✅ [Performance] Avg completion time:', data)

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Update payout status (Admin/System only)
   * Requirements: 18.5
   */
  public static async updatePayoutStatus(
    update: UpdatePayoutDTO
  ): Promise<PerformanceResult> {
    try {
      console.log('💸 [Performance] Updating payout status:', update.earning_id)

      const { data, error } = await supabase
        .from('technician_earnings')
        .update({
          paid_out: true,
          payout_reference: update.payout_reference,
          paid_out_at: update.paid_out_at || new Date().toISOString()
        })
        .eq('id', update.earning_id)
        .select()
        .single()

      if (error) {
        console.error('❌ [Performance] Update payout status error:', error)
        return {
          success: false,
          error: 'Failed to update payout status'
        }
      }

      console.log('✅ [Performance] Payout status updated')

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get performance leaderboard (for motivation/gamification)
   * Requirements: 27.1
   */
  public static async getPerformanceLeaderboard(
    limit: number = 10
  ): Promise<PerformanceResult> {
    try {
      console.log('🏆 [Performance] Getting performance leaderboard')

      const { data, error } = await supabase
        .from('technician_performance_leaderboard')
        .select('*')
        .limit(limit)

      if (error) {
        console.error('❌ [Performance] Get leaderboard error:', error)
        return {
          success: false,
          error: 'Failed to load leaderboard'
        }
      }

      console.log(`✅ [Performance] Found ${data.length} leaderboard entries`)

      return {
        success: true,
        data: data as PerformanceLeaderboardEntry[]
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get earnings for a specific time period
   */
  public static async getEarningsByPeriod(
    technicianId: string,
    startDate: string,
    endDate: string
  ): Promise<PerformanceResult> {
    try {
      console.log('📅 [Performance] Getting earnings for period:', startDate, '-', endDate)

      const { data, error } = await supabase
        .from('technician_earnings')
        .select('*')
        .eq('technician_id', technicianId)
        .gte('job_completed_at', startDate)
        .lte('job_completed_at', endDate)
        .order('job_completed_at', { ascending: false })

      if (error) {
        console.error('❌ [Performance] Get earnings by period error:', error)
        return {
          success: false,
          error: 'Failed to load earnings for period'
        }
      }

      const totalEarnings = data.reduce((sum, earning) => sum + earning.net_earnings, 0)

      console.log(`✅ [Performance] Found ${data.length} earnings (₦${totalEarnings.toLocaleString()})`)

      return {
        success: true,
        data: {
          earnings: data,
          total: totalEarnings,
          count: data.length
        }
      }
    } catch (error) {
      console.error('❌ [Performance] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }
}
