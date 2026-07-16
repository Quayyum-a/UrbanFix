import { useState, useCallback } from 'react'
import {
  paymentService,
  type DisputeRequest,
  type DisputeResolution
} from '@/lib/services/payment-service'

interface UsePaymentOptions {
  jobId?: string
}

interface UsePaymentReturn {
  // Payment operations
  getPaymentInfo: (jobId: string) => Promise<any>
  releasePayment: (jobId: string) => Promise<boolean>
  autoReleasePayment: (jobId: string) => Promise<boolean>

  // Dispute operations
  initiateDispute: (request: DisputeRequest) => Promise<boolean>
  getDispute: (jobId: string) => Promise<any>
  resolveDispute: (disputeId: string, resolution: DisputeResolution) => Promise<boolean>

  // State
  loading: boolean
  error: string | null
  paymentInfo: any | null
  dispute: any | null
}

export function usePayment(options: UsePaymentOptions = {}): UsePaymentReturn {
  const { jobId } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<any>(null)
  const [dispute, setDispute] = useState<any>(null)

  const getPaymentInfo = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await paymentService.getPaymentInfo(id)
      if (result.success) {
        setPaymentInfo(result.data)
        return result.data
      } else {
        setError(result.error || 'Failed to load payment info')
        return null
      }
    } catch (err) {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const releasePayment = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await paymentService.releasePayment(id)
      if (result.success) {
        setPaymentInfo(result.data)
        return true
      } else {
        setError(result.error || 'Failed to release payment')
        return false
      }
    } catch (err) {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const autoReleasePayment = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await paymentService.autoReleasePayment(id)
      if (result.success) {
        setPaymentInfo(result.data)
        return true
      } else {
        setError(result.error || 'Failed to auto-release payment')
        return false
      }
    } catch (err) {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const initiateDispute = useCallback(async (request: DisputeRequest) => {
    setLoading(true)
    setError(null)
    try {
      const result = await paymentService.initiateDispute(request)
      if (result.success) {
        setDispute(result.data)
        return true
      } else {
        setError(result.error || 'Failed to initiate dispute')
        return false
      }
    } catch (err) {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const getDispute = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await paymentService.getDispute(id)
      if (result.success) {
        setDispute(result.data)
        return result.data
      } else {
        setError(result.error || 'Failed to load dispute')
        return null
      }
    } catch (err) {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const resolveDispute = useCallback(async (disputeId: string, resolution: DisputeResolution) => {
    setLoading(true)
    setError(null)
    try {
      const result = await paymentService.resolveDispute(disputeId, resolution)
      if (result.success) {
        setDispute(result.data)
        return true
      } else {
        setError(result.error || 'Failed to resolve dispute')
        return false
      }
    } catch (err) {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    getPaymentInfo,
    releasePayment,
    autoReleasePayment,
    initiateDispute,
    getDispute,
    resolveDispute,
    loading,
    error,
    paymentInfo,
    dispute
  }
}
