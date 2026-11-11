import { apiClient } from './client'

// ===== Types =====

export interface RegistrationInput {
  nama_rs: string
  tipe_rs?: string
  alamat?: string
  provinsi?: string
  kota?: string
  no_telepon?: string
  email_rs?: string
  website?: string
  nomor_izin?: string
  admin_nama: string
  admin_jabatan?: string
  admin_email: string
  admin_phone?: string
  admin_password: string
  plan_code?: string
  billing_period?: 'monthly' | 'yearly'
  payment_method?: string
  payment_reference?: string
  payment_amount?: number
  requested_slug: string
  migrasi_requested?: boolean
  migrasi_source?: string
  migrasi_notes?: string
}

export interface RegistrationRecord {
  id: string
  nama_rs: string
  tipe_rs: string | null
  alamat: string | null
  provinsi: string | null
  kota: string | null
  no_telepon: string | null
  email_rs: string | null
  website: string | null
  nomor_izin: string | null
  admin_nama: string
  admin_jabatan: string | null
  admin_email: string
  admin_phone: string | null
  plan_code: string
  billing_period: string
  payment_method: string | null
  payment_reference: string | null
  payment_proof_url: string | null
  payment_amount: number
  payment_verified_at: string | null
  requested_slug: string
  tenant_id: string | null
  migrasi_requested: boolean
  migrasi_source: string | null
  status: string
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  provisioned_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RegistrationStats {
  total: number
  pending: number
  paymentPending: number
  underReview: number
  approved: number
  active: number
  rejected: number
}

export interface SlugCheckResult {
  available: boolean
  reason?: string
}

export interface PlatformSetting {
  key: string
  value: string | null
  category: string
  description: string | null
}

export interface ActivityLogEntry {
  id: string
  admin_id: string
  admin_email: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

// ===== Visit types (patient visits / kunjungan) =====

export interface VisitData {
  id: string
  visit_number: string
  patient_id: string
  room_id: string | null
  doctor_id: string | null
  tipe: string
  status: string
  tanggal: string
  keluhan_utama: string | null
  penjamin: string
  cara_masuk: string | null
  nomor_antrian: number | null
  patient_nama?: string
  no_rekam_medis?: string
  room_nama?: string
  doctor_nama?: string
  insurance_id?: string | null
  created_at: string
  updated_at: string
}

// ===== Visit API (patient visits / kunjungan) =====

export async function listVisits(params?: {
  tanggal?: string
  status?: string
  patient_id?: string
  room_id?: string
  tipe?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ success: boolean; data: VisitData[]; meta?: Record<string, unknown> }> {
  const qs = new URLSearchParams()
  if (params?.tanggal) qs.set('tanggal', params.tanggal)
  if (params?.status) qs.set('status', params.status)
  if (params?.patient_id) qs.set('patient_id', params.patient_id)
  if (params?.room_id) qs.set('room_id', params.room_id)
  if (params?.tipe) qs.set('tipe', params.tipe)
  if (params?.search) qs.set('search', params.search)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return apiClient(`/visits${query ? `?${query}` : ''}`)
}

export async function getVisit(id: string): Promise<{ success: boolean; data: VisitData }> {
  return apiClient(`/visits/${id}`)
}

// ===== Types for public plans =====

export interface PublicPlan {
  id: string
  code: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  max_users: number
  max_patients: number
  max_doctors: number
  max_storage_gb: number
  allowed_modules: string[]
  trial_days: number
  sort_order: number
}

// ===== PUBLIC API (no auth) =====

export interface RegistrationConfig {
  registration_open: boolean
  maintenance_mode: boolean
  platform_name: string
  platform_tagline: string
  contact_email: string
  contact_phone: string
  primary_domain: string
}

export async function getRegistrationConfig(): Promise<RegistrationConfig> {
  const res = await fetch(`${getApiUrl()}/register/config`)
  const json = await res.json()
  return json.data
}

export async function getPublicPlans(): Promise<PublicPlan[]> {
  const res = await fetch(`${getApiUrl()}/register/plans`)
  const json = await res.json()
  return json.data || []
}

export async function submitRegistration(data: RegistrationInput) {
  const res = await fetch(`${getApiUrl()}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Gagal mengirim registrasi' } }))
    throw new Error(err.error?.message || 'Gagal mengirim registrasi')
  }
  return res.json()
}

export async function checkSlugAvailability(slug: string): Promise<SlugCheckResult> {
  const res = await fetch(`${getApiUrl()}/register/check-slug/${slug}`)
  const json = await res.json()
  return json.data
}

export async function checkRegistrationStatus(id: string) {
  const res = await fetch(`${getApiUrl()}/register/status/${id}`)
  const json = await res.json()
  return json.data
}

export interface PaymentInfo {
  status: string
  needsPayment: boolean
  nama_rs?: string
  plan_code?: string
  billing_period?: string
  payment_amount?: number
  payment_proof_uploaded?: boolean
  bank?: {
    name: string
    accountNumber: string
    accountName: string
  }
}

export async function getPaymentInfo(id: string): Promise<PaymentInfo> {
  const res = await fetch(`${getApiUrl()}/register/payment-info/${id}`)
  const json = await res.json()
  return json.data
}

export async function uploadPaymentProof(id: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${getApiUrl()}/register/upload-proof/${id}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Gagal mengunggah bukti' } }))
    throw new Error(err.error?.message || 'Gagal mengunggah bukti pembayaran')
  }
  return res.json()
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
}

// ===== SUPER ADMIN API (requires auth) =====

export async function listRegistrations(params?: {
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.search) query.set('search', params.search)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  const res = await apiClient.get(`/super-admin/registrations?${query}`)
  return res as { data: RegistrationRecord[]; meta: { total: number } }
}

export async function getRegistration(id: string) {
  const res = await apiClient.get(`/super-admin/registrations/${id}`)
  return res.data as RegistrationRecord
}

export async function getRegistrationStats() {
  const res = await apiClient.get('/super-admin/registrations/stats')
  return res.data as RegistrationStats
}

export async function reviewRegistration(id: string, data: {
  action: 'approve' | 'reject'
  rejection_reason?: string
  notes?: string
}) {
  const res = await apiClient.post(`/super-admin/registrations/${id}/review`, data)
  return res.data as RegistrationRecord
}

export async function verifyPayment(id: string) {
  const res = await apiClient.post(`/super-admin/registrations/${id}/verify-payment`)
  return res.data as RegistrationRecord
}

export async function retryProvision(id: string) {
  const res = await apiClient.post(`/super-admin/registrations/${id}/provision`)
  return res.data as RegistrationRecord
}

export async function getSettings(category?: string) {
  const query = category ? `?category=${category}` : ''
  const res = await apiClient.get(`/super-admin/settings${query}`)
  return res.data as PlatformSetting[]
}

export async function updateSettings(updates: Array<{ key: string; value: string }>) {
  const res = await apiClient.put('/super-admin/settings', { updates })
  return res.data
}

export async function getActivityLog(params?: {
  admin_id?: string
  action?: string
  page?: number
  limit?: number
}) {
  const query = new URLSearchParams()
  if (params?.admin_id) query.set('admin_id', params.admin_id)
  if (params?.action) query.set('action', params.action)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  const res = await apiClient.get(`/super-admin/activity-log?${query}`)
  return res as { data: ActivityLogEntry[]; meta: { total: number } }
}
