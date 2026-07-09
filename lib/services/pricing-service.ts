// Technician pricing management service
// Handles database operations for repair category pricing

import { supabase } from '@/lib/supabase'
import type {
  RepairCategory,
  TechnicianPricing,
  CategoryWithPricing,
  TechnicianForCategory,
  SetPricingDTO,
  BulkPricingDTO,
  PopularCategory,
  TopTechnicianByCategory,
  PricingResult
} from '@/types/pricing.types'

export class PricingService {
  /**
   * Get all active repair categories
   * Requirements: 7.1
   */
  public static async getAllRepairCategories(): Promise<PricingResult> {
    try {
      console.log('📋 [Pricing] Getting all repair categories')

      const { data, error } = await supabase
        .from('repair_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('❌ [Pricing] Get categories error:', error)
        return {
          success: false,
          error: 'Failed to load repair categories'
        }
      }

      console.log(`✅ [Pricing] Found ${data.length} repair categories`)

      return {
        success: true,
        data: data as RepairCategory[]
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get technician's pricing for all categories
   * Uses database function for efficient join
   * Requirements: 7.2
   */
  public static async getTechnicianPricing(
    technicianId: string
  ): Promise<PricingResult> {
    try {
      console.log('💰 [Pricing] Getting pricing for technician:', technicianId)

      const { data, error } = await supabase
        .rpc('get_technician_pricing', { technician_user_id: technicianId })

      if (error) {
        console.error('❌ [Pricing] Get technician pricing error:', error)
        return {
          success: false,
          error: 'Failed to load your pricing'
        }
      }

      console.log(`✅ [Pricing] Found pricing for ${data.length} categories`)

      return {
        success: true,
        data: data as CategoryWithPricing[]
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Set or update technician pricing for a category
   * Requirements: 7.2, 7.3
   */
  public static async setPricing(
    technicianId: string,
    pricing: SetPricingDTO
  ): Promise<PricingResult> {
    try {
      console.log('💵 [Pricing] Setting pricing for category:', pricing.repair_category_id)

      // Use upsert to handle both insert and update
      const { data, error } = await supabase
        .from('technician_pricing')
        .upsert({
          technician_id: technicianId,
          repair_category_id: pricing.repair_category_id,
          labor_price: pricing.labor_price,
          is_available: pricing.is_available ?? true
        }, {
          onConflict: 'technician_id,repair_category_id'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [Pricing] Set pricing error:', error)
        
        if (error.code === '23503') {
          return {
            success: false,
            error: 'Invalid repair category'
          }
        }
        
        if (error.code === '23514') {
          return {
            success: false,
            error: 'Labor price must be greater than 0'
          }
        }

        return {
          success: false,
          error: 'Failed to save pricing. Please try again.'
        }
      }

      console.log('✅ [Pricing] Pricing saved successfully')

      return {
        success: true,
        data: data as TechnicianPricing
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Set pricing for multiple categories at once (bulk setup)
   * Requirements: 7.2
   */
  public static async setBulkPricing(
    bulk: BulkPricingDTO
  ): Promise<PricingResult> {
    try {
      console.log('📦 [Pricing] Setting bulk pricing:', bulk.pricing.length, 'categories')

      // Transform to database format
      const pricingData = bulk.pricing.map(p => ({
        technician_id: bulk.technician_id,
        repair_category_id: p.repair_category_id,
        labor_price: p.labor_price,
        is_available: p.is_available ?? true
      }))

      const { data, error } = await supabase
        .from('technician_pricing')
        .upsert(pricingData, {
          onConflict: 'technician_id,repair_category_id'
        })
        .select()

      if (error) {
        console.error('❌ [Pricing] Bulk pricing error:', error)
        return {
          success: false,
          error: 'Failed to save pricing. Please try again.'
        }
      }

      console.log(`✅ [Pricing] Saved ${data.length} prices successfully`)

      return {
        success: true,
        data: data as TechnicianPricing[]
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Update availability for a category
   * Requirements: 7.3
   */
  public static async updateAvailability(
    technicianId: string,
    categoryId: string,
    isAvailable: boolean
  ): Promise<PricingResult> {
    try {
      console.log('🔄 [Pricing] Updating availability:', isAvailable)

      const { data, error } = await supabase
        .from('technician_pricing')
        .update({ is_available: isAvailable })
        .eq('technician_id', technicianId)
        .eq('repair_category_id', categoryId)
        .select()
        .single()

      if (error) {
        console.error('❌ [Pricing] Update availability error:', error)
        return {
          success: false,
          error: 'Failed to update availability'
        }
      }

      console.log('✅ [Pricing] Availability updated')

      return {
        success: true,
        data: data as TechnicianPricing
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Find available technicians for a repair category
   * Uses database function for efficient search
   * Requirements: 7.4, 7.5
   */
  public static async findTechniciansForCategory(
    categoryId: string,
    minRating: number = 0.0,
    limit: number = 10
  ): Promise<PricingResult> {
    try {
      console.log('🔍 [Pricing] Finding technicians for category:', categoryId)

      const { data, error } = await supabase
        .rpc('find_technicians_for_category', {
          category_id: categoryId,
          min_rating: minRating,
          limit_count: limit
        })

      if (error) {
        console.error('❌ [Pricing] Find technicians error:', error)
        return {
          success: false,
          error: 'Failed to find technicians'
        }
      }

      console.log(`✅ [Pricing] Found ${data.length} technicians`)

      return {
        success: true,
        data: data as TechnicianForCategory[]
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Update technician statistics after job completion
   * Called by job completion workflow
   * Requirements: 18.1, 18.3
   */
  public static async updatePricingStats(
    technicianId: string,
    categoryId: string,
    rating: number
  ): Promise<PricingResult> {
    try {
      console.log('📊 [Pricing] Updating stats after job completion')

      const { error } = await supabase
        .rpc('update_technician_pricing_stats', {
          technician_user_id: technicianId,
          category_id: categoryId,
          new_rating: rating
        })

      if (error) {
        console.error('❌ [Pricing] Update stats error:', error)
        return {
          success: false,
          error: 'Failed to update statistics'
        }
      }

      console.log('✅ [Pricing] Statistics updated')

      return {
        success: true
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get popular repair categories (analytics)
   * Requirements: 27.1
   */
  public static async getPopularCategories(): Promise<PricingResult> {
    try {
      console.log('📈 [Pricing] Getting popular categories')

      const { data, error } = await supabase
        .from('popular_repair_categories')
        .select('*')
        .limit(10)

      if (error) {
        console.error('❌ [Pricing] Get popular categories error:', error)
        return {
          success: false,
          error: 'Failed to load popular categories'
        }
      }

      console.log(`✅ [Pricing] Found ${data.length} popular categories`)

      return {
        success: true,
        data: data as PopularCategory[]
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get top technicians by category (analytics)
   * Requirements: 27.1
   */
  public static async getTopTechniciansByCategory(
    categoryName?: string
  ): Promise<PricingResult> {
    try {
      console.log('🏆 [Pricing] Getting top technicians by category')

      let query = supabase
        .from('top_technicians_by_category')
        .select('*')

      if (categoryName) {
        query = query.eq('category_name', categoryName)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ [Pricing] Get top technicians error:', error)
        return {
          success: false,
          error: 'Failed to load top technicians'
        }
      }

      console.log(`✅ [Pricing] Found ${data.length} top technicians`)

      return {
        success: true,
        data: data as TopTechnicianByCategory[]
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Delete technician pricing for a category
   */
  public static async deletePricing(
    technicianId: string,
    categoryId: string
  ): Promise<PricingResult> {
    try {
      console.log('🗑️ [Pricing] Deleting pricing for category:', categoryId)

      const { error } = await supabase
        .from('technician_pricing')
        .delete()
        .eq('technician_id', technicianId)
        .eq('repair_category_id', categoryId)

      if (error) {
        console.error('❌ [Pricing] Delete pricing error:', error)
        return {
          success: false,
          error: 'Failed to delete pricing'
        }
      }

      console.log('✅ [Pricing] Pricing deleted')

      return {
        success: true
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get price range for a category (min/max from all technicians)
   */
  public static async getCategoryPriceRange(
    categoryId: string
  ): Promise<PricingResult> {
    try {
      console.log('💰 [Pricing] Getting price range for category:', categoryId)

      const { data, error } = await supabase
        .from('technician_pricing')
        .select('labor_price')
        .eq('repair_category_id', categoryId)
        .eq('is_available', true)
        .order('labor_price', { ascending: true })

      if (error) {
        console.error('❌ [Pricing] Get price range error:', error)
        return {
          success: false,
          error: 'Failed to get price range'
        }
      }

      if (data.length === 0) {
        return {
          success: true,
          data: { min: null, max: null, count: 0 }
        }
      }

      const prices = data.map(p => p.labor_price)
      const min = Math.min(...prices)
      const max = Math.max(...prices)

      console.log(`✅ [Pricing] Price range: ₦${min} - ₦${max}`)

      return {
        success: true,
        data: { min, max, count: data.length }
      }
    } catch (error) {
      console.error('❌ [Pricing] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }
}
