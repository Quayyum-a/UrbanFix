// Part Request Service
// Handles database operations for technician parts requests
// Requirements: 25.1, 25.2, 25.3, 25.4, 25.5

import { supabase } from '@/lib/supabase'
import type {
  PartRequest,
  PartRequestWithDetails,
  CreatePartRequestDTO,
  UpdatePartRequestDTO,
  ApprovePartRequestDTO,
  RejectPartRequestDTO,
  ApprovePartRequestResult,
  RejectPartRequestResult,
  PartRequestStats,
  MostRequestedPart,
  PartRequestFilters,
  PartRequestResult,
  PartRequestListResult,
  PartRequestNotificationDB
} from '@/types/parts-request.types'

export class PartRequestService {
  /**
   * Create a new part request
   * Requirements: 25.1, 25.2
   */
  public static async createRequest(
    technicianId: string,
    requestData: CreatePartRequestDTO
  ): Promise<PartRequestResult<PartRequest>> {
    try {
      console.log('📝 [PartRequest] Creating new part request:', requestData.part_name)

      // Validate required fields
      if (!requestData.device_brand || !requestData.device_model || !requestData.repair_category) {
        return {
          success: false,
          error: 'Device brand, model, and repair category are required'
        }
      }

      if (!requestData.part_name || requestData.part_name.trim().length === 0) {
        return {
          success: false,
          error: 'Part name is required'
        }
      }

      if (!requestData.part_description || requestData.part_description.length < 10) {
        return {
          success: false,
          error: 'Part description must be at least 10 characters'
        }
      }

      if (!requestData.estimated_price || requestData.estimated_price <= 0) {
        return {
          success: false,
          error: 'Estimated price must be greater than 0'
        }
      }

      const { data, error } = await supabase
        .from('parts_requests')
        .insert({
          technician_id: technicianId,
          device_brand: requestData.device_brand,
          device_model: requestData.device_model,
          repair_category: requestData.repair_category,
          part_name: requestData.part_name,
          part_description: requestData.part_description,
          estimated_price: requestData.estimated_price,
          status: 'pending'
        } as any)
        .select()
        .single()

      if (error) {
        console.error('❌ [PartRequest] Create request error:', error)
        return {
          success: false,
          error: 'Failed to submit part request. Please try again.'
        }
      }

      console.log('✅ [PartRequest] Request created successfully:', data.id)

      return {
        success: true,
        data: data as PartRequest
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get all requests for a specific technician
   * Requirements: 25.1
   */
  public static async getRequestsByTechnician(
    technicianId: string,
    status?: string
  ): Promise<PartRequestResult<PartRequest[]>> {
    try {
      console.log('📋 [PartRequest] Getting requests for technician:', technicianId)

      let query = supabase
        .from('parts_requests')
        .select('*')
        .eq('technician_id', technicianId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ [PartRequest] Get technician requests error:', error)
        return {
          success: false,
          error: 'Failed to load your part requests'
        }
      }

      console.log(`✅ [PartRequest] Found ${data.length} requests`)

      return {
        success: true,
        data: data as PartRequest[]
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get a single request by ID
   */
  public static async getRequestById(
    requestId: string
  ): Promise<PartRequestResult<PartRequest>> {
    try {
      console.log('🔍 [PartRequest] Getting request by ID:', requestId)

      const { data, error } = await supabase
        .from('parts_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (error) {
        console.error('❌ [PartRequest] Get request error:', error)
        return {
          success: false,
          error: 'Request not found'
        }
      }

      console.log('✅ [PartRequest] Request found')

      return {
        success: true,
        data: data as PartRequest
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get all pending requests (Admin)
   * Requirements: 25.3
   */
  public static async getAllPendingRequests(
    limit: number = 50
  ): Promise<PartRequestResult<PartRequestWithDetails[]>> {
    try {
      console.log('📋 [PartRequest] Getting all pending requests')

      const { data, error } = await supabase
        .rpc('get_parts_requests_with_details', {
          filter_status: 'pending',
          filter_technician_id: null,
          limit_count: limit
        } as any)

      if (error) {
        console.error('❌ [PartRequest] Get pending requests error:', error)
        return {
          success: false,
          error: 'Failed to load pending requests'
        }
      }

      console.log(`✅ [PartRequest] Found ${data.length} pending requests`)

      return {
        success: true,
        data: data as PartRequestWithDetails[]
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get all requests with filters (Admin)
   * Requirements: 25.3
   */
  public static async getAllRequests(
    filters: PartRequestFilters = {}
  ): Promise<PartRequestResult<PartRequestWithDetails[]>> {
    try {
      console.log('📋 [PartRequest] Getting all requests with filters:', filters)

      const { data, error } = await supabase
        .rpc('get_parts_requests_with_details', {
          filter_status: filters.status || null,
          filter_technician_id: filters.technician_id || null,
          limit_count: filters.limit || 50
        } as any)

      if (error) {
        console.error('❌ [PartRequest] Get all requests error:', error)
        return {
          success: false,
          error: 'Failed to load requests'
        }
      }

      console.log(`✅ [PartRequest] Found ${data.length} requests`)

      return {
        success: true,
        data: data as PartRequestWithDetails[]
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Update a pending request (Technician)
   * Requirements: 25.2
   */
  public static async updateRequest(
    requestId: string,
    updateData: UpdatePartRequestDTO
  ): Promise<PartRequestResult<PartRequest>> {
    try {
      console.log('✏️ [PartRequest] Updating request:', requestId)

      // Validate description length if provided
      if (updateData.part_description && updateData.part_description.length < 10) {
        return {
          success: false,
          error: 'Part description must be at least 10 characters'
        }
      }

      // Validate estimated price if provided
      if (updateData.estimated_price !== undefined && updateData.estimated_price <= 0) {
        return {
          success: false,
          error: 'Estimated price must be greater than 0'
        }
      }

      const { data, error } = await supabase
        .from('parts_requests')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', requestId)
        .eq('status', 'pending') // Only allow updates on pending requests
        .select()
        .single()

      if (error) {
        console.error('❌ [PartRequest] Update request error:', error)
        
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Cannot update request that has already been reviewed'
          }
        }

        return {
          success: false,
          error: 'Failed to update request. Please try again.'
        }
      }

      console.log('✅ [PartRequest] Request updated successfully')

      return {
        success: true,
        data: data as PartRequest
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Approve a part request and add to catalogue (Admin)
   * Requirements: 25.4
   */
  public static async approveRequest(
    adminId: string,
    approvalData: ApprovePartRequestDTO
  ): Promise<PartRequestResult<ApprovePartRequestResult>> {
    try {
      console.log('✅ [PartRequest] Approving request:', approvalData.request_id)

      if (approvalData.final_price <= 0) {
        return {
          success: false,
          error: 'Final price must be greater than 0'
        }
      }

      const { data, error } = await supabase
        .rpc('approve_part_request', {
          request_id: approvalData.request_id,
          admin_user_id: adminId,
          final_price: approvalData.final_price
        } as any)

      if (error) {
        console.error('❌ [PartRequest] Approve request error:', error)
        return {
          success: false,
          error: 'Failed to approve request. Please try again.'
        }
      }

      const result = data[0] as ApprovePartRequestResult

      if (!result.success) {
        console.error('❌ [PartRequest] Approval failed:', result.error_message)
        return {
          success: false,
          error: result.error_message || 'Failed to approve request'
        }
      }

      console.log('✅ [PartRequest] Request approved, part added to catalogue:', result.part_id)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Reject a part request (Admin)
   * Requirements: 25.4
   */
  public static async rejectRequest(
    adminId: string,
    rejectionData: RejectPartRequestDTO
  ): Promise<PartRequestResult<RejectPartRequestResult>> {
    try {
      console.log('❌ [PartRequest] Rejecting request:', rejectionData.request_id)

      if (!rejectionData.rejection_reason || rejectionData.rejection_reason.trim().length === 0) {
        return {
          success: false,
          error: 'Rejection reason is required'
        }
      }

      const { data, error } = await supabase
        .rpc('reject_part_request', {
          request_id: rejectionData.request_id,
          admin_user_id: adminId,
          reason: rejectionData.rejection_reason
        } as any)

      if (error) {
        console.error('❌ [PartRequest] Reject request error:', error)
        return {
          success: false,
          error: 'Failed to reject request. Please try again.'
        }
      }

      const result = data[0] as RejectPartRequestResult

      if (!result.success) {
        console.error('❌ [PartRequest] Rejection failed:', result.error_message)
        return {
          success: false,
          error: result.error_message || 'Failed to reject request'
        }
      }

      console.log('✅ [PartRequest] Request rejected')

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Delete a pending request (Technician or Admin)
   */
  public static async deleteRequest(
    requestId: string
  ): Promise<PartRequestResult<void>> {
    try {
      console.log('🗑️ [PartRequest] Deleting request:', requestId)

      const { error } = await supabase
        .from('parts_requests')
        .delete()
        .eq('id', requestId)
        .eq('status', 'pending') // Only allow deletion of pending requests

      if (error) {
        console.error('❌ [PartRequest] Delete request error:', error)
        
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Cannot delete request that has already been reviewed'
          }
        }

        return {
          success: false,
          error: 'Failed to delete request. Please try again.'
        }
      }

      console.log('✅ [PartRequest] Request deleted')

      return {
        success: true
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get parts request statistics (Admin)
   * Requirements: 27.1
   */
  public static async getStats(): Promise<PartRequestResult<PartRequestStats>> {
    try {
      console.log('📊 [PartRequest] Getting request statistics')

      const { data, error } = await supabase
        .from('parts_request_stats')
        .select('*')
        .single()

      if (error) {
        console.error('❌ [PartRequest] Get stats error:', error)
        return {
          success: false,
          error: 'Failed to load statistics'
        }
      }

      console.log('✅ [PartRequest] Stats loaded:', data)

      return {
        success: true,
        data: data as PartRequestStats
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get most requested parts (Admin analytics)
   * Requirements: 27.1
   */
  public static async getMostRequestedParts(
    limit: number = 10
  ): Promise<PartRequestResult<MostRequestedPart[]>> {
    try {
      console.log('📈 [PartRequest] Getting most requested parts')

      const { data, error } = await supabase
        .from('most_requested_parts')
        .select('*')
        .limit(limit)

      if (error) {
        console.error('❌ [PartRequest] Get most requested parts error:', error)
        return {
          success: false,
          error: 'Failed to load most requested parts'
        }
      }

      console.log(`✅ [PartRequest] Found ${data.length} most requested parts`)

      return {
        success: true,
        data: data as MostRequestedPart[]
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Check if a similar part request already exists for a technician
   * Helps prevent duplicate requests
   */
  public static async checkDuplicateRequest(
    technicianId: string,
    deviceBrand: string,
    deviceModel: string,
    repairCategory: string,
    partName: string
  ): Promise<PartRequestResult<boolean>> {
    try {
      console.log('🔍 [PartRequest] Checking for duplicate request')

      const { data, error } = await supabase
        .from('parts_requests')
        .select('id')
        .eq('technician_id', technicianId)
        .eq('device_brand', deviceBrand)
        .eq('device_model', deviceModel)
        .eq('repair_category', repairCategory)
        .ilike('part_name', partName)
        .eq('status', 'pending')
        .limit(1)

      if (error) {
        console.error('❌ [PartRequest] Check duplicate error:', error)
        // Don't fail on error, just return false
        return {
          success: true,
          data: false
        }
      }

      const hasDuplicate = data && data.length > 0

      console.log('✅ [PartRequest] Duplicate check:', hasDuplicate ? 'Found' : 'None')

      return {
        success: true,
        data: hasDuplicate
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: true,
        data: false // Don't fail on error
      }
    }
  }

  /**
   * Get pending request count for a technician
   * Useful for badge notifications
   */
  public static async getPendingRequestCount(
    technicianId: string
  ): Promise<PartRequestResult<number>> {
    try {
      console.log('🔢 [PartRequest] Getting pending request count')

      const { count, error } = await supabase
        .from('parts_requests')
        .select('id', { count: 'exact', head: true })
        .eq('technician_id', technicianId)
        .eq('status', 'pending')

      if (error) {
        console.error('❌ [PartRequest] Get count error:', error)
        return {
          success: false,
          error: 'Failed to get request count'
        }
      }

      console.log('✅ [PartRequest] Pending count:', count)

      return {
        success: true,
        data: count || 0
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Format price from kobo to Naira string
   */
  public static formatPrice(kobo: number): string {
    const naira = kobo / 100
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(naira)
  }

  /**
   * Convert Naira to kobo (for form inputs)
   */
  public static nairaToKobo(naira: number): number {
    return Math.round(naira * 100)
  }

  /**
   * Convert kobo to Naira (for display)
   */
  public static koboToNaira(kobo: number): number {
    return kobo / 100
  }

  // ===================================================
  // NOTIFICATION METHODS
  // Requirements: 25.5
  // ===================================================

  /**
   * Get notifications for a user
   */
  public static async getNotifications(
    userId: string,
    unreadOnly: boolean = false
  ): Promise<PartRequestResult<PartRequestNotificationDB[]>> {
    try {
      console.log('🔔 [PartRequest] Getting notifications for user:', userId)

      let query = supabase
        .from('part_request_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ [PartRequest] Get notifications error:', error)
        return {
          success: false,
          error: 'Failed to load notifications'
        }
      }

      console.log(`✅ [PartRequest] Found ${data.length} notifications`)

      return {
        success: true,
        data: data as any[]
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Get unread notification count
   */
  public static async getUnreadNotificationCount(
    userId: string
  ): Promise<PartRequestResult<number>> {
    try {
      console.log('🔢 [PartRequest] Getting unread count for user:', userId)

      const { data, error } = await supabase
        .rpc('get_unread_part_request_notification_count', {
          user_uuid: userId
        } as any)

      if (error) {
        console.error('❌ [PartRequest] Get unread count error:', error)
        return {
          success: false,
          error: 'Failed to get notification count'
        }
      }

      console.log('✅ [PartRequest] Unread count:', data)

      return {
        success: true,
        data: data as number
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Mark notification as read
   */
  public static async markNotificationRead(
    notificationId: string
  ): Promise<PartRequestResult<boolean>> {
    try {
      console.log('✓ [PartRequest] Marking notification as read:', notificationId)

      const { data, error } = await supabase
        .rpc('mark_part_request_notification_read', {
          notification_id: notificationId
        } as any)

      if (error) {
        console.error('❌ [PartRequest] Mark read error:', error)
        return {
          success: false,
          error: 'Failed to mark notification as read'
        }
      }

      console.log('✅ [PartRequest] Notification marked as read')

      return {
        success: true,
        data: data as boolean
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  public static async markAllNotificationsRead(
    userId: string
  ): Promise<PartRequestResult<number>> {
    try {
      console.log('✓✓ [PartRequest] Marking all notifications as read for user:', userId)

      const { data, error } = await supabase
        .rpc('mark_all_part_request_notifications_read', {
          user_uuid: userId
        } as any)

      if (error) {
        console.error('❌ [PartRequest] Mark all read error:', error)
        return {
          success: false,
          error: 'Failed to mark all notifications as read'
        }
      }

      console.log(`✅ [PartRequest] Marked ${data} notifications as read`)

      return {
        success: true,
        data: data as number
      }
    } catch (error) {
      console.error('❌ [PartRequest] Unexpected error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Subscribe to real-time notification updates
   * Returns an unsubscribe function
   */
  public static subscribeToNotifications(
    userId: string,
    onNotification: (notification: any) => void
  ) {
    console.log('📡 [PartRequest] Subscribing to notifications for user:', userId)

    const channel = supabase
      .channel('part_request_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'part_request_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 [PartRequest] New notification received:', payload)
          onNotification(payload.new)
        }
      )
      .subscribe()

    return () => {
      console.log('🔌 [PartRequest] Unsubscribing from notifications')
      channel.unsubscribe()
    }
  }
}
