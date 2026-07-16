import { useState, useCallback } from 'react'
import { ratingService, type RatingRequest } from '@/lib/services/rating-service'

interface UseRatingOptions {
  jobId?: string
}

interface UseRatingReturn {
  // Rating operations
  submitRating: (request: RatingRequest) => Promise<boolean>
  getTechnicianRatings: (technicianId: string) => Promise<any[]>
  getRatingSummary: (technicianId: string) => Promise<any>
  canRateJob: (jobId: string) => Promise<boolean>
  getJobRating: (jobId: string) => Promise<any>

  // State
  loading: boolean
  error: string | null
  ratings: any[]
  summary: any | null
}

export function useRating(options: UseRatingOptions = {}): UseRatingReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ratings, setRatings] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  const submitRating = useCallback(async (request: RatingRequest) => {
    setLoading(true)
    setError(null)
    try {
      const result = await ratingService.submitRating(request)
      if (result.success) {
        return true
      } else {
        setError(result.error || 'Failed to submit rating')
        return false
      }
    } catch (err) {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const getTechnicianRatings = useCallback(async (technicianId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await ratingService.getTechnicianRatings(technicianId)
      if (result.success) {
        setRatings(result.data || [])
        return result.data || []
      } else {
        setError(result.error || 'Failed to load ratings')
        return []
      }
    } catch (err) {
      setError('Network error')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getRatingSummary = useCallback(async (technicianId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await ratingService.getTechnicianRatingSummary(technicianId)
      if (result.success) {
        setSummary(result.data)
        return result.data
      } else {
        setError(result.error || 'Failed to load summary')
        return null
      }
    } catch (err) {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const canRateJob = useCallback(async (jobId: string) => {
    try {
      const result = await ratingService.canRateJob(jobId)
      return result.success
    } catch (err) {
      return false
    }
  }, [])

  const getJobRating = useCallback(async (jobId: string) => {
    try {
      const result = await ratingService.getJobRating(jobId)
      if (result.success) {
        return result.data
      }
      return null
    } catch (err) {
      return null
    }
  }, [])

  return {
    submitRating,
    getTechnicianRatings,
    getRatingSummary,
    canRateJob,
    getJobRating,
    loading,
    error,
    ratings,
    summary
  }
}
