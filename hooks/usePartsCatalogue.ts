import { useState, useEffect, useCallback } from 'react'
import { PartsCatalogueService } from '@/lib/services/parts-catalogue-service'
import type {
  PartsCatalogue,
  PartsSearchParams,
  PartsSearchResult,
  PartsCatalogueResult,
} from '@/types/parts-catalogue.types'

interface UsePartsCatalogueOptions {
  autoFetchBrands?: boolean
  initialParams?: PartsSearchParams
}

interface UsePartsCatalogueReturn {
  // Brands
  brands: string[]
  brandsLoading: boolean
  brandsError: string | null
  fetchBrands: () => Promise<void>

  // Models
  models: string[]
  modelsLoading: boolean
  modelsError: string | null
  fetchModels: (brand: string) => Promise<void>

  // Repair Categories
  categories: string[]
  categoriesLoading: boolean
  categoriesError: string | null
  fetchRepairCategories: (brand: string, model: string) => Promise<void>
  fetchAllRepairCategories: () => Promise<void>

  // Parts
  parts: Array<PartsCatalogue & { formatted_price: string }>
  partsLoading: boolean
  partsError: string | null
  fetchPartsForRepair: (brand: string, model: string, category: string) => Promise<void>
  searchParts: (term: string, limit?: number) => Promise<void>
  getAllParts: (params?: PartsSearchParams) => Promise<PartsSearchResult | null>

  // Admin
  createPart: (partData: any) => Promise<PartsCatalogueResult>
  updatePart: (partId: string, partData: any) => Promise<PartsCatalogueResult>
  deletePart: (partId: string) => Promise<PartsCatalogueResult>
  bulkCreateParts: (parts: any[]) => Promise<PartsCatalogueResult>
  getStats: () => Promise<PartsCatalogueResult>
}

export function usePartsCatalogue(options: UsePartsCatalogueOptions = {}): UsePartsCatalogueReturn {
  const { autoFetchBrands = true, initialParams } = options

  // State
  const [brands, setBrands] = useState<string[]>([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [brandsError, setBrandsError] = useState<string | null>(null)

  const [models, setModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  const [categories, setCategories] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  const [parts, setParts] = useState<Array<PartsCatalogue & { formatted_price: string }>>([])
  const [partsLoading, setPartsLoading] = useState(false)
  const [partsError, setPartsError] = useState<string | null>(null)

  // Fetch brands
  const fetchBrands = useCallback(async () => {
    setBrandsLoading(true)
    setBrandsError(null)
    try {
      const result = await PartsCatalogueService.getDeviceBrands()
      if (result.success && result.data) {
        setBrands(result.data)
      } else {
        setBrandsError(result.error || 'Failed to load brands')
        setBrands([])
      }
    } catch (error) {
      setBrandsError('Network error. Please check your connection.')
      setBrands([])
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  // Fetch models for a brand
  const fetchModels = useCallback(async (brand: string) => {
    setModelsLoading(true)
    setModelsError(null)
    try {
      const result = await PartsCatalogueService.getDeviceModels(brand)
      if (result.success && result.data) {
        setModels(result.data)
      } else {
        setModelsError(result.error || 'Failed to load models')
        setModels([])
      }
    } catch (error) {
      setModelsError('Network error. Please check your connection.')
      setModels([])
    } finally {
      setModelsLoading(false)
    }
  }, [])

  // Fetch repair categories for a device
  const fetchRepairCategories = useCallback(async (brand: string, model: string) => {
    setCategoriesLoading(true)
    setCategoriesError(null)
    try {
      const result = await PartsCatalogueService.getRepairCategoriesForDevice(brand, model)
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

  // Fetch all repair categories
  const fetchAllRepairCategories = useCallback(async () => {
    setCategoriesLoading(true)
    setCategoriesError(null)
    try {
      const result = await PartsCatalogueService.getAllRepairCategories()
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

  // Fetch parts for a specific repair
  const fetchPartsForRepair = useCallback(
    async (deviceBrand: string, deviceModel: string, repairCategory: string) => {
      setPartsLoading(true)
      setPartsError(null)
      try {
        const result = await PartsCatalogueService.getPartsWithPricing(
          deviceBrand,
          deviceModel,
          repairCategory
        )
        if (result.success && result.data) {
          // Format prices for display
          const formattedParts = (result.data as Array<PartsCatalogue & { formatted_price: string }>).map(
            (part) => ({
              ...part,
              formatted_price: new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(part.part_price / 100),
            })
          )
          setParts(formattedParts)
        } else {
          setPartsError(result.error || 'Failed to load parts')
          setParts([])
        }
      } catch (error) {
        setPartsError('Network error. Please check your connection.')
        setParts([])
      } finally {
        setPartsLoading(false)
      }
    },
    []
  )

  // Search parts
  const searchParts = useCallback(async (term: string, limit = 20) => {
    setPartsLoading(true)
    setPartsError(null)
    try {
      const result = await PartsCatalogueService.searchParts(term, limit)
      if (result.success && result.data) {
        const formattedParts = (result.data as Array<PartsCatalogue & { formatted_price: string }>).map(
          (part) => ({
            ...part,
            formatted_price: new Intl.NumberFormat('en-NG', {
              style: 'currency',
              currency: 'NGN',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(part.part_price / 100),
          })
        )
        setParts(formattedParts)
      } else {
        setPartsError(result.error || 'Search failed')
        setParts([])
      }
    } catch (error) {
      setPartsError('Network error. Please check your connection.')
      setParts([])
    } finally {
      setPartsLoading(false)
    }
  }, [])

  // Get all parts with pagination
  const getAllParts = useCallback(async (params?: PartsSearchParams) => {
    setPartsLoading(true)
    setPartsError(null)
    try {
      const result = await PartsCatalogueService.getAllParts(params || initialParams)
      if (result.success && result.data) {
        return result.data
      } else {
        setPartsError(result.error || 'Failed to load parts')
        return null
      }
    } catch (error) {
      setPartsError('Network error. Please check your connection.')
      return null
    } finally {
      setPartsLoading(false)
    }
  }, [initialParams])

  // Admin: Create part
  const createPart = useCallback(async (partData: any) => {
    return await PartsCatalogueService.createPart(partData)
  }, [])

  // Admin: Update part
  const updatePart = useCallback(async (partId: string, partData: any) => {
    return await PartsCatalogueService.updatePart(partId, partData)
  }, [])

  // Admin: Delete part
  const deletePart = useCallback(async (partId: string) => {
    return await PartsCatalogueService.deletePart(partId)
  }, [])

  // Admin: Bulk create parts
  const bulkCreateParts = useCallback(async (partsData: any[]) => {
    return await PartsCatalogueService.bulkCreateParts(partsData)
  }, [])

  // Admin: Get stats
  const getStats = useCallback(async () => {
    return await PartsCatalogueService.getStats()
  }, [])

  // Auto-fetch brands on mount
  useEffect(() => {
    if (autoFetchBrands) {
      fetchBrands()
    }
  }, [autoFetchBrands, fetchBrands])

  return {
    // Brands
    brands,
    brandsLoading,
    brandsError,
    fetchBrands,

    // Models
    models,
    modelsLoading,
    modelsError,
    fetchModels,

    // Repair Categories
    categories,
    categoriesLoading,
    categoriesError,
    fetchRepairCategories,
    fetchAllRepairCategories,

    // Parts
    parts,
    partsLoading,
    partsError,
    fetchPartsForRepair,
    searchParts,
    getAllParts,

    // Admin
    createPart,
    updatePart,
    deletePart,
    bulkCreateParts,
    getStats,
  }
}