// Row shapes returned by the database (see database/urbanfix.sql).

export type Role = 'customer' | 'technician' | 'admin'
export type TechStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'
export type JobStatus =
  | 'requested' | 'accepted' | 'quoted' | 'declined' | 'cancelled' | 'payment_submitted' | 'paid'
  | 'in_repair' | 'awaiting_confirmation' | 'completed' | 'warranty' | 'disputed' | 'refunded'
export type Grade = 'standard' | 'high' | 'premium'
export type PartMode = 'catalog' | 'inspection' | 'none'
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
  part_kobo: number
  service_charge_kobo: number
  total_kobo: number
  part_pending: boolean
  rating: string | number | null
  reviews: number
  jobs_done: number
  used_before: boolean
}

export interface DeviceBrand {
  device_type: string
  brand: string
  label: string
  is_android: boolean
  sort_order: number
}

export interface DeviceModel {
  id: number
  device_type: string
  brand: string
  name: string
  hint: string | null
  sort_order: number
}

export interface GradeOption {
  grade: Grade
  label: string
  description: string
  warranty_days: number
  market_label: string | null
  part_kobo: number | null
  price_updated_at: string | null
}

export interface PriceBoardRow {
  model_id: number
  model_name: string
  category: string
  category_label: string
  grade: Grade
  grade_label: string
  price_kobo: number | null
  market_label: string | null
  source: string | null
  updated_at: string | null
  stale: boolean
  obs_count: number | null
  obs_low_kobo: number | null
  obs_median_kobo: number | null
  obs_high_kobo: number | null
  obs_url: string | null
  obs_date: string | null
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
  /** Hidden from customers. */
  commission_kobo?: number
  /** Hidden from customers. */
  payout_kobo?: number
  /** Hidden from customers. */
  labour_kobo?: number
  model_id: number | null
  grade: Grade | null
  part_label: string | null
  part_kobo: number
  part_pending: boolean
  estimate_kobo: number
  price_confirmed: boolean
  quoted_at: string | null
  part_payout_status?: PayoutStatus
  warranty_days: number
  warranty_until: string | null
  warranty_reason: string | null
  warranty_claimed_at: string | null
  warranty_notes: string | null
  warranty_photos: string[]
  warranty_done_at: string | null
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
  payout_status?: PayoutStatus
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

export interface Breakdown {
  part_kobo: number
  part_pending: boolean
  part_label: string | null
  grade: Grade | null
  grade_label: string | null
  grade_description: string | null
  service_charge_kobo: number
  total_kobo: number
  estimate_kobo: number
  price_confirmed: boolean
  warranty_days: number
  warranty_until: string | null
}

export interface JobDetails {
  job: Job
  viewer_role: Role
  breakdown: Breakdown
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
  /** Only for the technician. */
  payout_kobo: number | null
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
