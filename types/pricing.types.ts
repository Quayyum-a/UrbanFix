// TypeScript types for technician pricing management
// Generated from database schema: 003_technician_pricing_schema.sql

export interface RepairCategory {
  id: string
  
  // Category Information
  category_name: string
  display_name: string
  description: string | null
  
  // Device Type Applicability
  device_types: string[]
  
  // Platform Defaults
  suggested_min_price: number // in Naira
  suggested_max_price: number // in Naira
  estimated_duration_hours: number | null
  
  // Metadata
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface TechnicianPricing {
  id: string
  technician_id: string
  repair_category_id: string
  
  // Pricing
  labor_price: number // in Naira, excludes parts cost
  
  // Availability
  is_available: boolean
  
  // Performance Metrics
  jobs_completed: number
  average_rating: number // 0-5
  
  // Metadata
  created_at: string
  updated_at: string
}

// DTO for setting/updating technician pricing
export interface SetPricingDTO {
  repair_category_id: string
  labor_price: number
  is_available?: boolean
}

// DTO for bulk pricing setup
export interface BulkPricingDTO {
  technician_id: string
  pricing: SetPricingDTO[]
}

// Combined category with technician's pricing (if exists)
export interface CategoryWithPricing {
  category_id: string
  category_name: string
  display_name: string
  description: string | null
  device_types: string[]
  suggested_min_price: number
  suggested_max_price: number
  technician_price: number | null // null if technician hasn't set price yet
  is_available: boolean
  jobs_completed: number
  average_rating: number
}

// Technician info for category search
export interface TechnicianForCategory {
  technician_id: string
  technician_name: string
  labor_price: number
  jobs_completed: number
  average_rating: number
  phone: string
}

// Complete technician pricing with category details
export interface PricingWithCategory extends TechnicianPricing {
  category: RepairCategory
}

// Analytics: Popular categories
export interface PopularCategory {
  id: string
  display_name: string
  technician_count: number
  average_price: number
  total_jobs_completed: number
}

// Analytics: Top technicians per category
export interface TopTechnicianByCategory {
  category_name: string
  technician_name: string
  labor_price: number
  average_rating: number
  jobs_completed: number
  rank: number
}

// Response wrapper for service methods
export interface PricingResult {
  success: boolean
  data?: any
  error?: string
}
