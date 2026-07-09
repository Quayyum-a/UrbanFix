import { useState, useCallback, useEffect } from 'react'
import { PricingService } from '@/lib/services/pricing-service'
import type {
  RepairCategory,
  TechnicianPricing,
  CategoryWithPricing,
  SetPricingDTO,
  BulkPricingDTO,
  TechnicianForCategory,
  PopularCategory,
  TopTechnicianByCategory,
  PricingResult,
} from '@/types/pricing.types'

interface UsePricingOptions {
  technicianId?: string
  autoFetchCategories?: boolean
}

interface UsePricingReturn {
  // Repair Categories
  categories: RepairCategory[]
  categoriesLoading: boolean
  categoriesError: string | null
  fetchCategories: () => Promise<void>

  // Technician Pricing
  technicianPricing: CategoryWithPricing[]
  pricingLoading: boolean
  pricingError: string | null
  fetchTechnicianPricing: (technicianId: string) => Promise<void>
  setPricing: (pricing: SetPricingDTO) => Promise<PricingResult>
  setBulkPricing: (bulk: BulkPricingDTO) => Promise<PricingResult>
  updateAvailability: (
    technicianId: string,
    categoryId: string,
    isAvailable: boolean
  ) => Promise<PricingResult>
  deletePricing: (technicianId: string, categoryId: string) => Promise<PricingResult>

  // Technician Search
  findTechniciansForCategory: (
    categoryId: string,
    minRating?: number,
    limit?: number
  ) => Promise<PricingResult>

  // Analytics
  popularCategories: PopularCategory[]
  topTechnicians: TopTechnicianByCategory[]
  analyticsLoading: boolean
  fetchAnalytics: () => Promise<void>

  // Stats
  updatePricingStats: (
    technicianId: string,
    categoryId: string,
    newRating: number
  ) => Promise<PricingResult>
  getCategoryPriceRange: (categoryId: string) => Promise<PricingResult>
}

export function usePricing(options: UsePricingOptions = {}): UsePricingReturn {
  const { technicianId, autoFetchCategories = true } = options

  // Repair Categories
  const [categories, setCategories] = useState<RepairCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  // Technician Pricing
  const [technicianPricing, setTechnicianPricing] = useState<CategoryWithPricing[]>([])
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Analytics
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([])
  const [topTechnicians, setTopTechnicians] = useState<TopTechnicianByCategory[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  // Fetch all repair categories
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true)
    setCategoriesError(null)
    try {
      const result = await PricingService.getAllRepairCategories()
      if (result.success && result.data) {
        setCategories(result.data)
      } else {
        setCategoriesError(result.error || 'Failed to load repair categories')
        setCategories([])
      }
    } catch (error) {
      setCategoriesError('Network error. Please check your connection.')
      setCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  // Fetch technician's pricing
  const fetchTechnicianPricing = useCallback(async (techId: string) => {
    setPricingLoading(true)
    setPricingError(null)
    try {
      const result = await PricingService.getTechnicianPricing(techId)
      if (result.success && result.data) {
        setTechnicianPricing(result.data)
      } else {
        setPricingError(result.error || 'Failed to load pricing')
        setTechnicianPricing([])
      }
    } catch (error) {
      setPricingError('Network error. Please check your connection.')
      setTechnicianPricing([])
    } finally {
      setPricingLoading(false)
    }
  }, [])

  // Set pricing for a category
  const setPricing = useCallback(async (pricing: SetPricingDTO) => {
    if (!technicianId) {
      return { success: false, error: 'Technician ID required' }
    }
    try {
      const result = await PricingService.setPricing(technicianId, pricing)
      if (result.success && result.data) {
        // Update local state
        setTechnicianPricing((prev) => {
          const existingIndex = prev.findIndex(
            (p) => p.category_id === pricing.repair_category_id
          )
          if (existingIndex >= 0) {
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              technician_price: pricing.labor_price,
              is_available: pricing.is_available ?? true,
            }
            return updated
          }
          return [
            ...prev,
            {
              category_id: pricing.repair_category_id,
              category_name: '',
              display_name: '',
              description: null,
              device_types: [],
              suggested_min_price: 0,
              suggested_max_price: 0,
              technician_price: pricing.labor_price,
              is_available: pricing.is_available ?? true,
              jobs_completed: 0,
              average_rating: 0,
            },
          ]
        })
      }
      return result
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' }
    }
  }, [technicianId])

  // Set bulk pricing
  const setBulkPricing = useCallback(async (bulk: BulkPricingDTO) => {
    try {
      const result = await PricingService.setBulkPricing(bulk)
      if (result.success && result.data) {
        // Refresh technician pricing
        await fetchTechnicianPricing(bulk.technician_id)
      }
      return result
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' }
    }
  }, [fetchTechnicianPricing])

  // Update availability
  const updateAvailability = useCallback(
    async (techId: string, categoryId: string, isAvailable: boolean) => {
      try {
        const result = await PricingService.updateAvailability(techId, categoryId, isAvailable)
        if (result.success) {
          setTechnicianPricing((prev) =>
            prev.map((p) =>
              p.category_id === categoryId ? { ...p, is_available: isAvailable } : p
            )
          )
        }
        return result
      } catch (error) {
        return { success: false, error: 'Network error. Please check your connection.' }
      }
    },
    []
  )

  // Delete pricing
  const deletePricing = useCallback(
    async (techId: string, categoryId: string) => {
      try {
        const result = await PricingService.deletePricing(techId, categoryId)
        if (result.success) {
          setTechnicianPricing((prev) =>
            prev.map((p) =>
              p.category_id === categoryId ? { ...p, technician_price: null, is_available: false } : p
            )
          )
        }
        return result
      } catch (error) {
        return { success: false, error: 'Network error. Please check your connection.' }
      }
    },
    []
  )

  // Find technicians for a category
  const findTechniciansForCategory = useCallback(
    async (categoryId: string, minRating = 0, limit = 10) => {
      try {
        return await PricingService.findTechniciansForCategory(categoryId, minRating, limit)
      } catch (error) {
        return { success: false, error: 'Network error. Please check your connection.' }
      }
    },
    []
  )

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const [popularResult, topResult] = await Promise.all([
        PricingService.getPopularCategories(),
        PricingService.getTopTechniciansByCategory(),
      ])
      if (popularResult.success && popularResult.data) {
        setPopularCategories(popularResult.data)
      }
      if (topResult.success && topResult.data) {
        setTopTechnicians(topResult.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  // Update pricing stats after job completion
  const updatePricingStats = useCallback(
    async (techId: string, categoryId: string, newRating: number) => {
      try {
        return await PricingService.updatePricingStats(techId, categoryId, newRating)
      } catch (error) {
        return { success: false, error: 'Network error. Please check your connection.' }
      }
    },
    []
  )

  // Get category price range
  const getCategoryPriceRange = useCallback(async (categoryId: string) => {
    try {
      return await PricingService.getCategoryPriceRange(categoryId)
    } catch (error) {
      return { success: false, error: 'Network error. Please check your connection.' }
    }
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetchCategories) {
      fetchCategories()
    }
  }, [autoFetchCategories, fetchCategories])

  useEffect(() => {
    if (technicianId) {
      fetchTechnicianPricing(technicianId)
    }
  }, [technicianId, fetchTechnicianPricing])

  return {
    // Repair Categories
    categories,
    categoriesLoading,
    categoriesError,
    fetchCategories,

    // Technician Pricing
    technicianPricing,
    pricingLoading,
    pricingError,
    fetchTechnicianPricing,
    setPricing,
    setBulkPricing,
    updateAvailability,
    deletePricing,

    // Technician Search
    findTechniciansForCategory,

    // Analytics
    popularCategories,
    topTechnicians,
    analyticsLoading,
    fetchAnalytics,

    // Stats
    updatePricingStats,
    getCategoryPriceRange,
  }
}