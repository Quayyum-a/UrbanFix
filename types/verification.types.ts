// TypeScript types for technician verification
// Generated from database schema: 002_technician_verification_schema.sql

export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export type DocumentType = 'id_card' | 'address_proof'

export interface TechnicianVerification {
  id: string
  user_id: string
  
  // Identity Information
  nin: string
  nin_verified: boolean
  
  // Bank Account Details
  bvn: string
  account_number: string
  bank_code: string
  bank_name: string
  account_name: string | null
  
  // Verification Status
  status: VerificationStatus
  
  // Admin Review
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  
  // Metadata
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface VerificationDocument {
  id: string
  verification_id: string
  
  // Document Details
  document_type: DocumentType
  
  // Storage Information
  file_url: string
  file_path: string
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  
  // Metadata
  uploaded_at: string
  created_at: string
}

export interface VerificationStatistics {
  pending_count: number
  approved_count: number
  rejected_count: number
  total_count: number
  avg_review_time_hours: number | null
}

// DTO for creating verification
export interface CreateVerificationDTO {
  nin: string
  bvn: string
  account_number: string
  bank_code: string
  bank_name: string
  account_name?: string
}

// DTO for uploading document
export interface UploadDocumentDTO {
  verification_id: string
  document_type: DocumentType
  file_url: string
  file_path: string
  file_name?: string
  file_size?: number
  mime_type?: string
}

// DTO for admin review
export interface ReviewVerificationDTO {
  verification_id: string
  status: 'approved' | 'rejected'
  rejection_reason?: string
}

// Complete verification with documents
export interface VerificationWithDocuments extends TechnicianVerification {
  documents: VerificationDocument[]
}
