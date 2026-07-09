// TypeScript types for technician performance tracking
// Generated from database schema: 004_technician_performance_schema.sql

export interface TechnicianEarning {
  id: string
  technician_id: string
  job_id: string
  
  // Earnings breakdown (in Naira)
  labor_amount: number
  parts_amount: number
  platform_fee: number
  net_earnings: number
  
  // Payment status
  paid_out: boolean
  payout_reference: string | null
  paid_out_at: string | null
  
  // Job completion context
  job_completed_at: string
  repair_category_id: string | null
  
  // Metadata
  created_at: string
  updated_at: string
}

export interface EarningHistoryItem extends TechnicianEarning {
  repair_category_name: string | null
  device_brand: string
  device_model: string
}

export interface TechnicianPerformanceSummary {
  total_earnings: number
  pending_payouts: number
  total_jobs: number
  completed_jobs: number
  average_rating: number
  avg_completion_time_hours: number
  total_reviews: number
  this_month_earnings: number
  this_month_jobs: number
}

export interface TechnicianReview {
  id: string
  job_id: string
  reviewer_name: string
  rating: number
  comment: string | null
  created_at: string
  device_brand: string
  repair_category: string
}

export interface EarningsByCategory {
  technician_id: string
  technician_name: string
  category_name: string | null
  jobs_count: number
  total_earnings: number
  avg_earnings_per_job: number
  paid_earnings: number
  pending_earnings: number
}

export interface PerformanceLeaderboardEntry {
  technician_id: string
  technician_name: string
  total_jobs: number
  total_earnings: number
  average_rating: number
  review_count: number
  jobs_rank: number
  earnings_rank: number
  rating_rank: number
}

// DTO for creating earning record (automated by trigger, but useful for typing)
export interface CreateEarningDTO {
  technician_id: string
  job_id: string
  labor_amount: number
  parts_amount: number
  platform_fee: number
  net_earnings: number
  job_completed_at: string
  repair_category_id?: string
}

// DTO for updating payout status
export interface UpdatePayoutDTO {
  earning_id: string
  payout_reference: string
  paid_out_at?: string
}

// Response wrapper for service methods
export interface PerformanceResult {
  success: boolean
  data?: any
  error?: string
}

// Earnings filter options
export interface EarningsFilterOptions {
  paid_out?: boolean
  start_date?: string
  end_date?: string
  repair_category_id?: string
  limit?: number
  offset?: number
}

// Performance dashboard data (combines multiple metrics)
export interface PerformanceDashboardData {
  summary: TechnicianPerformanceSummary
  recent_earnings: EarningHistoryItem[]
  recent_reviews: TechnicianReview[]
  earnings_by_category: EarningsByCategory[]
}
