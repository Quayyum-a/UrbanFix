// Parts Request System Types
// Requirements: 25.1, 25.2, 25.3, 25.4, 25.5

/**
 * Parts request status enum
 */
export type PartRequestStatus = 'pending' | 'approved' | 'rejected'

/**
 * Parts request entity from database
 */
export interface PartRequest {
  id: string
  technician_id: string
  device_brand: string
  device_model: string
  repair_category: string
  part_name: string
  part_description: string
  estimated_price: number // in kobo
  status: PartRequestStatus
  reviewed_by?: string | null
  reviewed_at?: string | null
  rejection_reason?: string | null
  added_part_id?: string | null
  created_at: string
  updated_at: string
}

/**
 * Parts request with technician and reviewer details
 * Returned from get_parts_requests_with_details function
 */
export interface PartRequestWithDetails extends PartRequest {
  technician_name: string
  technician_phone: string
  reviewer_name?: string | null
}

/**
 * DTO for creating a new part request
 * Requirements: 25.2
 */
export interface CreatePartRequestDTO {
  device_brand: string
  device_model: string
  repair_category: string
  part_name: string
  part_description: string // min 10 characters
  estimated_price: number // in kobo, must be > 0
}

/**
 * DTO for updating a pending part request
 */
export interface UpdatePartRequestDTO {
  device_brand?: string
  device_model?: string
  repair_category?: string
  part_name?: string
  part_description?: string
  estimated_price?: number
}

/**
 * DTO for approving a part request
 * Requirements: 25.4
 */
export interface ApprovePartRequestDTO {
  request_id: string
  final_price: number // in kobo - admin can adjust technician's estimate
}

/**
 * DTO for rejecting a part request
 * Requirements: 25.4
 */
export interface RejectPartRequestDTO {
  request_id: string
  rejection_reason: string // must explain why request was rejected
}

/**
 * Result from approve_part_request function
 */
export interface ApprovePartRequestResult {
  success: boolean
  part_id?: string | null
  error_message?: string | null
}

/**
 * Result from reject_part_request function
 */
export interface RejectPartRequestResult {
  success: boolean
  error_message?: string | null
}

/**
 * Statistics about parts requests
 */
export interface PartRequestStats {
  pending_requests: number
  approved_requests: number
  rejected_requests: number
  unique_technicians: number
  unique_brands: number
  unique_categories: number
}

/**
 * Most requested parts data
 */
export interface MostRequestedPart {
  device_brand: string
  device_model: string
  repair_category: string
  part_name: string
  request_count: number
  approved_count: number
  rejected_count: number
  pending_count: number
}

/**
 * Filter parameters for getting parts requests
 */
export interface PartRequestFilters {
  status?: PartRequestStatus
  technician_id?: string
  limit?: number
}

/**
 * Service result wrapper for parts request operations
 */
export interface PartRequestResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Notification payload for part request approval
 * Requirements: 25.5
 */
export interface PartRequestNotification {
  request_id: string
  technician_id: string
  status: 'approved' | 'rejected'
  part_name: string
  device_brand: string
  device_model: string
  rejection_reason?: string
  added_part_id?: string
}

/**
 * Form validation for part request creation
 */
export interface PartRequestFormData {
  device_brand: string
  device_model: string
  repair_category: string
  part_name: string
  part_description: string
  estimated_price: string // string for form input, converted to number in kobo
}

/**
 * Form validation errors
 */
export interface PartRequestFormErrors {
  device_brand?: string
  device_model?: string
  repair_category?: string
  part_name?: string
  part_description?: string
  estimated_price?: string
}

/**
 * List result with pagination
 */
export interface PartRequestListResult {
  requests: PartRequestWithDetails[]
  total: number
  has_more: boolean
}

/**
 * In-app notification for part request status updates
 * Requirements: 25.5
 */
export interface PartRequestNotificationDB {
  id: string
  user_id: string
  request_id: string
  title: string
  body: string
  type: 'approved' | 'rejected'
  read: boolean
  created_at: string
}

/**
 * Notification with request details
 */
export interface PartRequestNotificationWithDetails extends PartRequestNotificationDB {
  request?: PartRequest
}
