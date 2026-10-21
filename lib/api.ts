// All reads and writes the app makes. Writes are database functions that
// validate everything server-side; this layer only shapes data and turns
// errors into plain-language messages.
import { supabase } from './supabase'
import type {
  DeviceBrand, DeviceModel, Earnings, Grade, GradeOption, Job, JobDetails, JobSummary, Message, PriceBoardRow, Profile,
  Review, Service, Technician, TechnicianMatch, TechnicianPrivate,
} from './types'
import { clean, normalizePhone, phoneToEmail, pinToPassword } from './validation'

export class AppError extends Error {}

/** Turn any Supabase/network error into a sentence a user can act on. */
export function friendlyError(err: unknown): string {
  const e = err as { message?: string; code?: string; status?: number; name?: string } | null
  const msg = e?.message ?? ''
  if (e instanceof AppError) return msg
  if (e?.code === 'P0001' && msg) return msg // our own database validation messages
  if (/network request failed|failed to fetch|network error|timeout/i.test(msg) || e?.name === 'AuthRetryableFetchError') {
    return 'No internet connection. Check your data and try again.'
  }
  if (e?.status === 429 || /rate limit|too many requests/i.test(msg)) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (/invalid login credentials/i.test(msg)) return 'Wrong PIN. Try again.'
  if (/user already registered/i.test(msg)) return 'This number already has an account. Enter your PIN instead.'
  if (e?.code === 'email_provider_disabled' || /email (logins|signups) are disabled/i.test(msg)) {
    return 'Sign-in is blocked by a Supabase setting: turn on the Email provider in Authentication → Sign In / Providers (see the setup guide).'
  }
  if (/email address .*invalid|email_address_invalid/i.test(msg)) {
    return 'Sign-up is blocked by a Supabase email setting: turn off "Confirm email" and extended email validation (see the setup guide).'
  }
  if (/email not confirmed/i.test(msg)) {
    return 'Sign-up needs one setting changed: turn off "Confirm email" in Supabase (see the setup guide).'
  }
  if (/jwt expired|invalid jwt|refresh token/i.test(msg)) return 'Your session expired. Please sign in again.'
  if (/permission denied|row-level security/i.test(msg)) return "You don't have access to that."
  if (/payload too large|exceeded the maximum allowed size/i.test(msg)) return 'That photo is too large. Try another.'
  return 'Something went wrong. Please try again.'
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(args)) cleaned[k] = typeof v === 'string' ? v.replace(/\u0000/g, '') : v
  const { data, error } = await supabase.rpc(fn, cleaned)
  if (error) throw error
  return data as T
}

const nullable = (v: string | null | undefined) => {
  const c = clean(v)
  return c ? c : null
}

// ---------------- auth ----------------
export async function phoneRegistered(phone: string): Promise<boolean> {
  const e164 = normalizePhone(phone)
  if (!e164) throw new AppError('Enter a valid Nigerian mobile number.')
  return rpc<boolean>('phone_registered', { p_phone: e164 })
}

export async function signIn(phone: string, pin: string) {
  const e164 = normalizePhone(phone)
  if (!e164) throw new AppError('Enter a valid Nigerian mobile number.')
  const { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(e164), password: pinToPassword(pin, e164) })
  if (error) throw error
}

export async function signUp(phone: string, pin: string) {
  const e164 = normalizePhone(phone)
  if (!e164) throw new AppError('Enter a valid Nigerian mobile number.')
  const { data, error } = await supabase.auth.signUp({ email: phoneToEmail(e164), password: pinToPassword(pin, e164) })
  if (error) throw error
  if (!data.session) {
    throw new AppError('Sign-up needs one setting changed: turn off "Confirm email" in Supabase (see the setup guide).')
  }
}

export async function signOut() {
  await supabase.auth.signOut()
}

// ---------------- profile ----------------
export async function getMyProfile(): Promise<Profile | null> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', u.user.id).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export function completeSignup(role: 'customer' | 'technician', fullName: string, area?: string | null, address?: string | null) {
  return rpc<Profile>('complete_signup', { p_role: role, p_full_name: clean(fullName), p_area: nullable(area), p_address: nullable(address) })
}

export function updateMyProfile(fullName: string, area?: string | null, address?: string | null) {
  return rpc<Profile>('update_my_profile', { p_full_name: clean(fullName), p_area: nullable(area), p_address: nullable(address) })
}

// ---------------- technician ----------------
export async function getMyTechnician(): Promise<{ tech: Technician; priv: TechnicianPrivate | null; services: Service[] } | null> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return null
  const [t, p, s] = await Promise.all([
    supabase.from('technicians').select('*').eq('id', u.user.id).maybeSingle(),
    supabase.from('technician_private').select('*').eq('id', u.user.id).maybeSingle(),
    supabase.from('services').select('*').eq('technician_id', u.user.id),
  ])
  if (t.error) throw t.error
  if (p.error) throw p.error
  if (s.error) throw s.error
  if (!t.data) return null
  return { tech: t.data as Technician, priv: p.data as TechnicianPrivate | null, services: (s.data ?? []) as Service[] }
}

export const saveShop = (shopName: string, shopAddress: string, area: string, bio?: string | null) =>
  rpc<Technician>('save_shop', { p_shop_name: clean(shopName), p_shop_address: clean(shopAddress), p_area: clean(area), p_bio: nullable(bio) })
export const saveService = (deviceType: string, category: string, priceKobo: number, active = true) =>
  rpc<Service>('save_service', { p_device_type: deviceType, p_category: category, p_price_kobo: priceKobo, p_active: active })
export const removeService = (deviceType: string, category: string) =>
  rpc<void>('remove_service', { p_device_type: deviceType, p_category: category })
export const savePayoutDetails = (bank: string, accountNumber: string, accountName: string) =>
  rpc<void>('save_payout_details', { p_bank_name: clean(bank), p_account_number: accountNumber.replace(/\s/g, ''), p_account_name: clean(accountName) })
export const saveIdentity = (nin: string, documentPath: string) =>
  rpc<void>('save_identity', { p_nin: nin.replace(/\s/g, ''), p_document_path: documentPath })
export const submitForReview = () => rpc<Technician>('submit_for_review')
export const setAvailability = (available: boolean) => rpc<Technician>('set_availability', { p_available: available })
export const myEarnings = () => rpc<Earnings>('my_earnings')

// ---------------- booking & jobs ----------------
// ---------------- catalog ----------------
export async function listBrands(deviceType: string): Promise<DeviceBrand[]> {
  const { data, error } = await supabase.from('device_brands').select('*').eq('device_type', deviceType).order('sort_order')
  if (error) throw error
  return (data ?? []) as DeviceBrand[]
}

export async function listModels(deviceType: string, brand: string): Promise<DeviceModel[]> {
  const { data, error } = await supabase.from('device_models').select('id, device_type, brand, name, hint, sort_order')
    .eq('device_type', deviceType).eq('brand', brand).eq('is_active', true).order('sort_order', { ascending: false })
  if (error) throw error
  return (data ?? []).map((m) => ({ ...m, id: Number(m.id) })) as DeviceModel[]
}

export const gradeOptions = (modelId: number | null, category: string) =>
  rpc<GradeOption[]>('grade_options', { p_model_id: modelId, p_category: category })

export const findTechnicians = (deviceType: string, category: string, modelId: number | null, grade: Grade | null) =>
  rpc<TechnicianMatch[]>('find_technicians', { p_device_type: deviceType, p_category: category, p_model_id: modelId, p_grade: grade })

export function createJob(input: {
  technicianId: string; deviceType: string; brand: string; modelId: number | null; modelText?: string | null
  category: string; grade: Grade | null; issueNote?: string | null
  mode: 'visit' | 'drop_off'; address?: string | null
}) {
  return rpc<Job>('create_job', {
    p_technician_id: input.technicianId, p_device_type: input.deviceType, p_brand: input.brand,
    p_model_id: input.modelId, p_model_text: input.modelId ? null : nullable(input.modelText),
    p_category: input.category, p_grade: input.grade, p_issue_note: nullable(input.issueNote),
    p_service_mode: input.mode, p_address: input.mode === 'visit' ? nullable(input.address) : null,
  })
}

export const myJobs = () => rpc<JobSummary[]>('my_jobs')
export const getJob = (id: string) => rpc<JobDetails>('get_job', { p_job_id: id })
export const acceptJob = (id: string) => rpc<Job>('accept_job', { p_job_id: id })
export const declineJob = (id: string, reason?: string | null) => rpc<Job>('decline_job', { p_job_id: id, p_reason: nullable(reason) })
export const cancelJob = (id: string, reason?: string | null) => rpc<Job>('cancel_job', { p_job_id: id, p_reason: nullable(reason) })
export const submitPayment = (id: string, reference: string) => rpc<Job>('submit_payment', { p_job_id: id, p_reference: clean(reference) })
/** Technician checks the device and confirms the final price (before the customer pays). */
export const recordIntake = (id: string, input: {
  identifier: string; notes: string | null; photos: string[]
  modelId?: number | null; modelText?: string | null; category?: string | null; grade?: Grade | null; partKobo?: number | null
}) =>
  rpc<Job>('record_intake', {
    p_job_id: id, p_identifier: input.identifier, p_notes: nullable(input.notes), p_photos: input.photos,
    p_model_id: input.modelId ?? null, p_model_text: nullable(input.modelText), p_category: input.category ?? null,
    p_grade: input.grade ?? null, p_part_kobo: input.partKobo ?? null,
  })
export const declineQuote = (id: string, reason?: string | null) => rpc<Job>('decline_quote', { p_job_id: id, p_reason: nullable(reason) })
export const claimWarranty = (id: string, reason: string) => rpc<Job>('claim_warranty', { p_job_id: id, p_reason: clean(reason) })
export const markReady = (id: string, repairNotes: string, partsReplaced: string | null, photos: string[]) =>
  rpc<Job>('mark_ready', { p_job_id: id, p_repair_notes: clean(repairNotes), p_parts_replaced: nullable(partsReplaced), p_photos: photos })
export const confirmCompletion = (id: string) => rpc<Job>('confirm_completion', { p_job_id: id })
export const raiseDispute = (id: string, reason: string) => rpc<Job>('raise_dispute', { p_job_id: id, p_reason: clean(reason) })
export const submitReview = (id: string, rating: number, comment?: string | null) =>
  rpc<Review>('submit_review', { p_job_id: id, p_rating: rating, p_comment: nullable(comment) })

// ---------------- chat ----------------
export async function listMessages(jobId: string, afterId = 0): Promise<Message[]> {
  const { data, error } = await supabase.from('messages').select('*').eq('job_id', jobId).gt('id', afterId).order('id').limit(200)
  if (error) throw error
  return (data ?? []) as Message[]
}
export const sendMessage = (jobId: string, body: string) => rpc<Message>('send_message', { p_job_id: jobId, p_body: body.trim() })

// ---------------- admin ----------------
export const adminJobs = (statuses: string[] | null, payout?: 'repair_fee' | 'part') =>
  rpc<Job[]>('admin_list_jobs', { p_statuses: statuses, p_payout: payout ?? null })
export async function adminPendingTechnicians() {
  const { data, error } = await supabase.from('technicians').select('*, profiles!technicians_id_fkey(full_name, phone)')
    .eq('status', 'pending').order('submitted_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as (Technician & { profiles: { full_name: string; phone: string } | null })[]
}
export const adminTechnicianDetails = (id: string) =>
  rpc<{ technician: Technician; profile: Profile; private: TechnicianPrivate; services: Service[] } | null>('admin_technician_details', { p_technician_id: id })
export const adminReviewTechnician = (id: string, approve: boolean, reason?: string | null) =>
  rpc<Technician>('admin_review_technician', { p_technician_id: id, p_approve: approve, p_reason: nullable(reason) })
export const adminConfirmPayment = (id: string) => rpc<Job>('admin_confirm_payment', { p_job_id: id })
export const adminRejectPayment = (id: string, note: string) => rpc<Job>('admin_reject_payment', { p_job_id: id, p_note: clean(note) })
export const adminResolveDispute = (id: string, outcome: 'release' | 'refund', note: string, refundReference?: string | null) =>
  rpc<Job>('admin_resolve_dispute', { p_job_id: id, p_outcome: outcome, p_note: clean(note), p_refund_reference: nullable(refundReference) })
export const adminMarkPayoutPaid = (id: string, reference: string) => rpc<Job>('admin_mark_payout_paid', { p_job_id: id, p_reference: clean(reference) })
export const adminMarkPartPayoutPaid = (id: string, reference: string) =>
  rpc<Job>('admin_mark_part_payout_paid', { p_job_id: id, p_reference: clean(reference) })
export const adminAutoRelease = () => rpc<number>('admin_auto_release')
export const adminPriceBoard = (deviceType: string, brand: string) =>
  rpc<PriceBoardRow[]>('admin_price_board', { p_device_type: deviceType, p_brand: brand })
export const adminSetPartPrice = (modelId: number, category: string, grade: Grade, priceKobo: number, marketLabel?: string | null) =>
  rpc<unknown>('admin_set_part_price', { p_model_id: modelId, p_category: category, p_grade: grade, p_price_kobo: priceKobo, p_market_label: nullable(marketLabel) })
export const adminRemovePartPrice = (modelId: number, category: string, grade: Grade) =>
  rpc<void>('admin_remove_part_price', { p_model_id: modelId, p_category: category, p_grade: grade })
export const adminAddModel = (deviceType: string, brand: string, name: string, hint?: string | null) =>
  rpc<DeviceModel>('admin_add_model', { p_device_type: deviceType, p_brand: brand, p_name: clean(name), p_hint: nullable(hint) })
