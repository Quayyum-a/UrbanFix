import { useState, useCallback } from 'react'
import { bookingService, type BookingRequest } from '@/lib/services/booking-service'

interface UseBookingOptions {
  customerId?: string
}

interface UseBookingReturn {
  // Booking creation
  createBooking: (request: BookingRequest) => Promise<any>
  confirmPayment: (jobId: string, reference: string) => Promise<boolean>
  cancelBooking: (jobId: string) => Promise<boolean>

  // Booking retrieval
  getBooking: (jobId: string) => Promise<any>
  getCustomerBookings: (status?: string) => Promise<any>

  // State
  loading: boolean
  error: string | null

  // Utilities
  calculatePrice: (partPrice: number, labourPrice: number) => any
}

export function useBooking(options: UseBookingOptions = {}): UseBookingReturn {
  const { customerId } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBooking = useCallback(async (request: BookingRequest) => {
    setLoading(true)
    setError(null)
    try {
      const result = await bookingService.createBooking(request)
      if (result.success) {
        return result.data
      } else {
        setError(result.error || 'Failed to create booking')
        return null
      }
    } catch (err) {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const confirmPayment = useCallback(async (jobId: string, reference: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await bookingService.confirmPayment(jobId, reference)
      if (result.success) {
        return true
      } else {
        setError(result.error || 'Failed to confirm payment')
        return false
      }
    } catch (err) {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const cancelBooking = useCallback(async (jobId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await bookingService.cancelBooking(jobId)
      if (result.success) {
        return true
      } else {
        setError(result.error || 'Failed to cancel booking')
        return false
      }
    } catch (err) {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const getBooking = useCallback(async (jobId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await bookingService.getBooking(jobId)
      if (result.success) {
        return result.data
      } else {
        setError(result.error || 'Failed to load booking')
        return null
      }
    } catch (err) {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getCustomerBookings = useCallback(async (status?: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await bookingService.getCustomerBookings(customerId || '', status)
      if (result.success) {
        return result.data || []
      } else {
        setError(result.error || 'Failed to load bookings')
        return []
      }
    } catch (err) {
      setError('Network error')
      return []
    } finally {
      setLoading(false)
    }
  }, [customerId])

  const calculatePrice = useCallback((partPrice: number, labourPrice: number) => {
    return bookingService.calculateTotalPrice(partPrice, labourPrice)
  }, [])

  return {
    createBooking,
    confirmPayment,
    cancelBooking,
    getBooking,
    getCustomerBookings,
    loading,
    error,
    calculatePrice
  }
}
