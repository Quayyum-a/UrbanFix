// Row shapes returned by the database (see database/urbanfix.sql).

export type Role = 'customer' | 'technician' | 'admin'
export type TechStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'
export type JobStatus =
  | 'requested' | 'accepted' | 'declined' | 'cancelled' | 'payment_submitted' | 'paid'
  | 'in_repair' | 'awaiting_confirmation' | 'completed' | 'disputed' | 'refunded'
export type ServiceMode = 'visit' | 'drop_off'
export type PayoutStatus = 'not_due' | 'due' | 'paid'

export interface Profile {
  id: string
  role: Role
  full_name: string
  phone: string
  area: string | null
  address: string | null
}

export interface Technician {
  id: string
  shop_name: string | null
  shop_address: string | null
  area: string | null
  bio: string | null
  status: TechStatus
  status_reason: string | null
  is_available: boolean
  submitted_at: string | null
}

export interface TechnicianPrivate {
  id: string
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  nin: string | null
  id_document_path: string | null
}

export interface Service {
  technician_id: string
  device_type: string
  category: string
  price_kobo: number
  is_active: boolean
}

export interface TechnicianMatch {
  technician_id: string
  full_name: string
  shop_name: string | null
  area: string | null
  shop_address: string | null
  bio: string | null
  price_kobo: number
  rating: string | number | null
  reviews: number
  jobs_done: number
  used_before: boolean
}

export interface Job {
  id: string
  code: string
  customer_id: string
  technician_id: string
  device_type: string
  category: string
  brand: string | null
  model: string | null
  issue_note: string | null
  service_mode: ServiceMode
  address: string | null
  price_kobo: number
  commission_kobo: number
  payout_kobo: number
  is_repeat: boolean
  status: JobStatus
  status_note: string | null
  payment_reference: string | null
  payment_submitted_at: string | null
  paid_at: string | null
  intake_identifier: string | null
  intake_notes: string | null
  intake_photos: string[]
  intake_at: string | null
  repair_notes: string | null
  parts_replaced: string | null
  completion_photos: string[]
  ready_at: string | null
  completed_at: string | null
  completed_by: string | null
  dispute_reason: string | null
  refund_reference: string | null
  payout_status: PayoutStatus
  payout_reference?: string | null
  created_at: string
  updated_at: string
}

export interface JobEvent {
  id: number
  actor_role: string
  from_status: JobStatus | null
  to_status: JobStatus
  note: string | null
  created_at: string
}

export interface Review {
  job_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface JobDetails {
  job: Job
  viewer_role: Role
  customer: { name: string; phone: string | null }
  technician: { name: string; shop_name: string | null; shop_address: string | null; area: string | null; phone: string | null }
  events: JobEvent[]
  review: Review | null
  payment_account: { bank_name: string; account_number: string; account_name: string; support_phone: string | null } | null
  auto_release_hours: number
}

export interface JobSummary {
  id: string
  code: string
  status: JobStatus
  device_type: string
  category: string
  brand: string | null
  model: string | null
  price_kobo: number
  payout_kobo: number
  service_mode: ServiceMode
  other_party: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  job_id: string
  sender_id: string
  body: string
  created_at: string
}

export interface Earnings {
  paid_kobo: number
  due_kobo: number
  in_escrow_kobo: number
  completed_jobs: number
  rating: number | null
  reviews: number
}
