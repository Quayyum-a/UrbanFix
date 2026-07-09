// Parts Catalogue Service
// Handles database operations for the parts catalogue

import { supabase } from '@/lib/supabase'
import type {
  PartsCatalogue,
  CreatePartDTO,
  UpdatePartDTO,
  PartsSearchParams,
  PartsSearchResult,
  RepairCategoryPricing,
  DeviceModel,
  PartsCatalogueStats,
  PartsCatalogueResult
} from '@/types/parts-catalogue.types'

export class PartsCatalogueService {
  /**
   * Get all active parts from the catalogue
   * Requirements: 6.1
   */
  public static async getAllParts(
    params: PartsSearchParams = {}
  ): Promise<PartsCatalogueResult> {
    try {
      console.log('📦 [PartsCatalogue] Getting parts with params:', params)

      let query = supabase
        .from('parts_catalogue')
        .select('*', { count: 'exact' })

      // Apply filters
      if (params.device_brand) {
        query = query.eq('device_brand', params.device_brand)
      }
      if (params.device_model) {
        query = query.eq('device_model', params.device_model)
      }
      if (params.repair_category) {
        query = query.eq('repair_category', params.repair_category)
      }
      if (params.part_name) {
        query = query.ilike('part_name', `%${params.part_name}%`)
      }
      if (params.is_active !== undefined) {
        query = query.eq('is_active', params.is_active)
      }

      // Apply ordering
      query = query.order('device_brand', { ascending: true })
        .order('device_model', { ascending: true })
        .order('repair_category', { ascending: true })
        .order('part_name', { ascending: true })

      // Apply pagination
      const limit = params.limit || 50
      const offset = params.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('❌ [PartsCatalogue] Get parts error:', error)
        return {
          success: false,
          error: 'Failed to load parts catalogue'
        }
      }

      console.log(`✅ [PartsCatalogue] Found ${data?.length || 0} parts (total: ${count})`)

      return {
        success: true,
        data: {
          parts: data as PartsCatalogue[],
          total: count || 0,
          has_more: (count || 0) > offset + limit
        } as PartsSearchResult
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get a single part by ID
   * Requirements: 6.1
   */
  public static async getPartById(
    partId: string
  ): Promise<PartsCatalogueResult> {
    try {
      console.log('📦 [PartsCatalogue] Getting part by ID:', partId)

      const { data, error } = await supabase
        .from('parts_catalogue')
        .select('*')
        .eq('id', partId)
        .single()

      if (error) {
        console.error('❌ [PartsCatalogue] Get part error:', error)
        return {
          success: false,
          error: 'Part not found'
        }
      }

      console.log('✅ [PartsCatalogue] Part found:', data?.part_name)

      return {
        success: true,
        data: data as PartsCatalogue
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get parts for a specific repair category and device
   * Requirements: 5.4, 6.2, 6.3
   */
  public static async getPartsForRepair(
    deviceBrand: string,
    deviceModel: string,
    repairCategory: string
  ): Promise<PartsCatalogueResult> {
    try {
      console.log('📦 [PartsCatalogue] Getting parts for repair:', deviceBrand, deviceModel, repairCategory)

      const { data, error } = await supabase
        .from('parts_catalogue')
        .select('*')
        .eq('device_brand', deviceBrand)
        .eq('device_model', deviceModel)
        .eq('repair_category', repairCategory)
        .eq('is_active', true)
        .order('part_name', { ascending: true })

      if (error) {
        console.error('❌ [PartsCatalogue] Get repair parts error:', error)
        return {
          success: false,
          error: 'Failed to load parts for this repair'
        }
      }

      console.log(`✅ [PartsCatalogue] Found ${data.length} parts for repair`)

      return {
        success: true,
        data: data as PartsCatalogue[]
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get all unique device brands
   * Requirements: 5.1, 5.2
   */
  public static async getDeviceBrands(): Promise<PartsCatalogueResult> {
    try {
      console.log('📱 [PartsCatalogue] Getting device brands')

      const { data, error } = await supabase
        .from('parts_catalogue')
        .select('device_brand')
        .eq('is_active', true)
        .order('device_brand', { ascending: true })

      if (error) {
        console.error('❌ [PartsCatalogue] Get brands error:', error)
        return {
          success: false,
          error: 'Failed to load device brands'
        }
      }

      // Get unique brands
      const brands = [...new Set(data.map(d => d.device_brand))]

      console.log(`✅ [PartsCatalogue] Found ${brands.length} device brands`)

      return {
        success: true,
        data: brands
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get device models for a specific brand
   * Requirements: 5.1, 5.2
   */
  public static async getDeviceModels(brand: string): Promise<PartsCatalogueResult> {
    try {
      console.log('📱 [PartsCatalogue] Getting device models for brand:', brand)

      const { data, error } = await supabase
        .from('parts_catalogue')
        .select('device_model')
        .eq('device_brand', brand)
        .eq('is_active', true)
        .order('device_model', { ascending: true })

      if (error) {
        console.error('❌ [PartsCatalogue] Get models error:', error)
        return {
          success: false,
          error: 'Failed to load device models'
        }
      }

      // Get unique models
      const models = [...new Set(data.map(d => d.device_model))]

      console.log(`✅ [PartsCatalogue] Found ${models.length} device models`)

      return {
        success: true,
        data: models
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get repair categories for a specific device
   * Requirements: 5.3
   */
  public static async getRepairCategoriesForDevice(
    brand: string,
    model: string
  ): Promise<PartsCatalogueResult> {
    try {
      console.log('🔧 [PartsCatalogue] Getting repair categories for:', brand, model)

      const { data, error } = await supabase
        .from('parts_catalogue')
        .select('repair_category')
        .eq('device_brand', brand)
        .eq('device_model', model)
        .eq('is_active', true)
        .order('repair_category', { ascending: true })

      if (error) {
        console.error('❌ [PartsCatalogue] Get repair categories error:', error)
        return {
          success: false,
          error: 'Failed to load repair categories'
        }
      }

      // Get unique repair categories
      const categories = [...new Set(data.map(d => d.repair_category))]

      console.log(`✅ [PartsCatalogue] Found ${categories.length} repair categories`)

      return {
        success: true,
        data: categories
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get all unique repair categories
   * Requirements: 5.3
   */
  public static async getAllRepairCategories(): Promise<PartsCatalogueResult> {
    try {
      console.log('🔧 [PartsCatalogue] Getting all repair categories')

      const { data, error } = await supabase
        .from('parts_catalogue')
        .select('repair_category')
        .eq('is_active', true)
        .order('repair_category', { ascending: true })

      if (error) {
        console.error('❌ [PartsCatalogue] Get repair categories error:', error)
        return {
          success: false,
          error: 'Failed to load repair categories'
        }
      }

      // Get unique repair categories
      const categories = [...new Set(data.map(d => d.repair_category))]

      console.log(`✅ [PartsCatalogue] Found ${categories.length} repair categories`)

      return {
        success: true,
        data: categories
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Create a new part in the catalogue (Admin only)
   * Requirements: 6.5
   */
  public static async createPart(
    partData: CreatePartDTO
  ): Promise<PartsCatalogueResult> {
    try {
      console.log('➕ [PartsCatalogue] Creating new part:', partData.part_name)

      const { data, error } = await supabase
        .from('parts_catalogue')
        .insert({
          ...partData,
          is_active: partData.is_active ?? true
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [PartsCatalogue] Create part error:', error)

        if (error.code === '23505') {
          return {
            success: false,
            error: 'A part with this brand, model, category, and name already exists'
          }
        }

        return {
          success: false,
          error: 'Failed to create part. Please try again.'
        }
      }

      console.log('✅ [PartsCatalogue] Part created successfully')

      return {
        success: true,
        data: data as PartsCatalogue
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Update an existing part (Admin only)
   * Requirements: 6.5
   */
  public static async updatePart(
    partId: string,
    partData: UpdatePartDTO
  ): Promise<PartsCatalogueResult> {
    try {
      console.log('✏️ [PartsCatalogue] Updating part:', partId)

      const { data, error } = await supabase
        .from('parts_catalogue')
        .update({
          ...partData,
          updated_at: new Date().toISOString()
        })
        .eq('id', partId)
        .select()
        .single()

      if (error) {
        console.error('❌ [PartsCatalogue] Update part error:', error)

        if (error.code === '23505') {
          return {
            success: false,
            error: 'A part with this brand, model, category, and name already exists'
          }
        }

        return {
          success: false,
          error: 'Failed to update part. Please try again.'
        }
      }

      console.log('✅ [PartsCatalogue] Part updated successfully')

      return {
        success: true,
        data: data as PartsCatalogue
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Delete a part (Admin only) - soft delete by setting is_active to false
   * Requirements: 6.5
   */
  public static async deletePart(partId: string): Promise<PartsCatalogueResult> {
    try {
      console.log('🗑️ [PartsCatalogue] Deleting part:', partId)

      const { error } = await supabase
        .from('parts_catalogue')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', partId)

      if (error) {
        console.error('❌ [PartsCatalogue] Delete part error:', error)
        return {
          success: false,
          error: 'Failed to delete part. Please try again.'
        }
      }

      console.log('✅ [PartsCatalogue] Part deleted (soft)')

      return {
        success: true
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get parts catalogue statistics (Admin)
   * Requirements: 27.1
   */
  public static async getStats(): Promise<PartsCatalogueResult> {
    try {
      console.log('📊 [PartsCatalogue] Getting catalogue stats')

      const { data: totalParts, error: totalError } = await supabase
        .from('parts_catalogue')
        .select('id', { count: 'exact', head: true })

      if (totalError) {
        console.error('❌ [PartsCatalogue] Get total parts error:', totalError)
        return {
          success: false,
          error: 'Failed to get stats'
        }
      }

      const { data: activeParts, error: activeError } = await supabase
        .from('parts_catalogue')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)

      if (activeError) {
        console.error('❌ [PartsCatalogue] Get active parts error:', activeError)
        return {
          success: false,
          error: 'Failed to get stats'
        }
      }

      const { data: brands, error: brandsError } = await supabase
        .from('parts_catalogue')
        .select('device_brand')
        .eq('is_active', true)

      if (brandsError) {
        console.error('❌ [PartsCatalogue] Get brands error:', brandsError)
        return {
          success: false,
          error: 'Failed to get stats'
        }
      }

      const { data: models, error: modelsError } = await supabase
        .from('parts_catalogue')
        .select('device_model')
        .eq('is_active', true)

      if (modelsError) {
        console.error('❌ [PartsCatalogue] Get models error:', modelsError)
        return {
          success: false,
          error: 'Failed to get stats'
        }
      }

      const { data: categories, error: categoriesError } = await supabase
        .from('parts_catalogue')
        .select('repair_category')
        .eq('is_active', true)

      if (categoriesError) {
        console.error('❌ [PartsCatalogue] Get categories error:', categoriesError)
        return {
          success: false,
          error: 'Failed to get stats'
        }
      }

      const stats: PartsCatalogueStats = {
        total_parts: totalParts?.length || 0,
        active_parts: activeParts?.length || 0,
        inactive_parts: (totalParts?.length || 0) - (activeParts?.length || 0),
        brands_count: [...new Set(brands?.map(b => b.device_brand) || [])].length,
        models_count: [...new Set(models?.map(m => m.device_model) || [])].length,
        categories_count: [...new Set(categories?.map(c => c.repair_category) || [])].length
      }

      console.log('✅ [PartsCatalogue] Stats:', stats)

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Search parts by name or other criteria
   * Requirements: 6.2, 6.3
   */
  public static async searchParts(
    searchTerm: string,
    limit: number = 20
  ): Promise<PartsCatalogueResult> {
    try {
      console.log('🔍 [PartsCatalogue] Searching parts:', searchTerm)

      const { data, error } = await supabase
        .from('parts_catalogue')
        .select('*')
        .or(`part_name.ilike.%${searchTerm}%,device_brand.ilike.%${searchTerm}%,device_model.ilike.%${searchTerm}%,repair_category.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .order('part_name', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('❌ [PartsCatalogue] Search error:', error)
        return {
          success: false,
          error: 'Search failed. Please try again.'
        }
      }

      console.log(`✅ [PartsCatalogue] Found ${data.length} matching parts`)

      return {
        success: true,
        data: data as PartsCatalogue[]
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get parts with pricing for a specific repair (for booking flow)
   * Returns parts with formatted prices
   * Requirements: 5.4
   */
  public static async getPartsWithPricing(
    deviceBrand: string,
    deviceModel: string,
    repairCategory: string
  ): Promise<PartsCatalogueResult> {
    const result = await this.getPartsForRepair(deviceBrand, deviceModel, repairCategory)

    if (!result.success || !result.data) {
      return result
    }

    // Format prices for display
    const partsWithPricing = (result.data as PartsCatalogue[]).map(part => ({
      ...part,
      formatted_price: this.formatPrice(part.part_price),
      formatted_price_kobo: this.formatPriceKobo(part.part_price)
    }))

    return {
      success: true,
      data: partsWithPricing
    }
  }

  /**
   * Format price from kobo to Naira string
   */
  private static formatPrice(kobo: number): string {
    const naira = kobo / 100
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(naira)
  }

  /**
   * Format price as kobo string
   */
  private static formatPriceKobo(kobo: number): string {
    return new Intl.NumberFormat('en-NG').format(kobo) + ' kobo'
  }

  /**
   * Bulk create parts (Admin only)
   * Requirements: 6.5
   */
  public static async bulkCreateParts(
    parts: CreatePartDTO[]
  ): Promise<PartsCatalogueResult> {
    try {
      console.log('📦 [PartsCatalogue] Bulk creating', parts.length, 'parts')

      const partsData = parts.map(p => ({
        ...p,
        is_active: p.is_active ?? true
      }))

      const { data, error } = await supabase
        .from('parts_catalogue')
        .insert(partsData)
        .select()

      if (error) {
        console.error('❌ [PartsCatalogue] Bulk create error:', error)
        return {
          success: false,
          error: 'Failed to create parts. Please try again.'
        }
      }

      console.log(`✅ [PartsCatalogue] Created ${data.length} parts successfully`)

      return {
        success: true,
        data: data as PartsCatalogue[]
      }
    } catch (error) {
      console.error('❌ [PartsCatalogue] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }
}