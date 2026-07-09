// TypeScript types for Parts Catalogue System
// Based on database schema from 001_initial_schema.sql

export interface PartsCatalogue {
  id: string
  device_brand: string
  device_model: string
  repair_category: string
  part_name: string
  part_price: number // in kobo (Nigerian currency subunit)
  is_active: boolean
  created_at: string
  updated_at: string
}

// DTO for creating a new part
export interface CreatePartDTO {
  device_brand: string
  device_model: string
  repair_category: string
  part_name: string
  part_price: number // in kobo
  is_active?: boolean
}

// DTO for updating an existing part
export interface UpdatePartDTO {
  device_brand?: string
  device_model?: string
  repair_category?: string
  part_name?: string
  part_price?: number
  is_active?: boolean
}

// Part with formatted pricing for display
export interface PartWithPricing extends PartsCatalogue {
  formatted_price: string // formatted as ₦X,XXX
  formatted_price_kobo: string // formatted as X,XXX kobo
}

// Search/filter parameters for parts catalogue
export interface PartsSearchParams {
  device_brand?: string
  device_model?: string
  repair_category?: string
  part_name?: string
  is_active?: boolean
  limit?: number
  offset?: number
}

// Search result with pagination
export interface PartsSearchResult {
  parts: PartsCatalogue[]
  total: number
  has_more: boolean
}

// Part pricing for a specific repair category
export interface RepairCategoryPricing {
  repair_category: string
  parts: PartsCatalogue[]
  total_parts: number
  min_price: number
  max_price: number
}

// Device model with available repairs
export interface DeviceModel {
  brand: string
  model: string
  repair_categories: string[]
  parts_count: number
}

// Admin stats for parts catalogue
export interface PartsCatalogueStats {
  total_parts: number
  active_parts: number
  inactive_parts: number
  brands_count: number
  models_count: number
  categories_count: number
}

// Response wrapper for service methods
export interface PartsCatalogueResult {
  success: boolean
  data?: any
  error?: string
}