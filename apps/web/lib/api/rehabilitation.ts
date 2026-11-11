import { apiClient } from './client'
import type {
  RehabilitationOrder,
  RehabilitationSession,
  ExternalPractitioner,
  PractitionerFeeTransaction,
} from '@simrs/shared-types'

// ── Types ──

export interface RehabOrderRow extends RehabilitationOrder {
  patient_nama?: string
  no_rekam_medis?: string
  patient_tanggal_lahir?: string
  patient_jenis_kelamin?: string
  doctor_nama?: string
  doctor_spesialisasi?: string
  practitioner_nama?: string
  practitioner_profesi?: string
  practitioner_instansi?: string
  visit_number?: string
  visit_tanggal?: string
  room_nama?: string
  sessions?: SessionRow[]
}

export interface SessionRow extends RehabilitationSession {
  practitioner_nama?: string
  performed_by_nama?: string
}

export interface RehabStats {
  total: number
  dikirim: number
  dijadwalkan: number
  berlangsung: number
  selesai: number
  batal: number
  today: number
  byTherapy: Array<{ therapy_type: string; count: number }>
}

export interface PractitionerStats {
  total: number
  aktif: number
  nonaktif: number
  kontrak_habis: number
  byProfesi: Array<{ profesi: string; count: number }>
}

export interface FeeSummary {
  practitioners: Array<{
    id: string
    nama: string
    profesi: string
    instansi_asal: string | null
    fee_share_persen: number
    fee_share_rs_persen: number
    jumlah_sesi: number
    total_tarif: number
    total_practitioner: number
    total_rs: number
  }>
  grandTotal: {
    total_tarif: number
    total_practitioner: number
    total_rs: number
    jumlah_sesi: number
  }
}

export interface PractitionerEarnings {
  transactions: PractitionerFeeTransaction[]
  totals: {
    total_tarif: number
    total_practitioner: number
    total_rs: number
    jumlah_sesi: number
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Rehabilitation Orders ──

export async function listRehabOrders(params?: {
  page?: number
  limit?: number
  status?: string
  therapy_type?: string
  patient_id?: string
  practitioner_id?: string
  search?: string
}) {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.status) sp.set('status', params.status)
  if (params?.therapy_type) sp.set('therapy_type', params.therapy_type)
  if (params?.patient_id) sp.set('patient_id', params.patient_id)
  if (params?.practitioner_id) sp.set('practitioner_id', params.practitioner_id)
  if (params?.search) sp.set('search', params.search)
  return apiClient<{
    success: boolean
    data: RehabOrderRow[]
    meta: PaginationMeta
  }>(`/rehabilitation?${sp}`)
}

export async function getRehabOrder(id: string) {
  const res = await apiClient<{ success: boolean; data: RehabOrderRow }>(`/rehabilitation/${id}`)
  return res.data
}

export async function createRehabOrder(data: {
  visit_id: string
  patient_id: string
  ordering_doctor_id: string
  practitioner_id?: string
  therapy_type: string
  diagnosa_klinis: string
  indikasi?: string
  target_terapi?: string
  jumlah_sesi?: number
  catatan_dokter?: string
  tarif_per_sesi?: number
}) {
  const res = await apiClient<{ success: boolean; data: RehabOrderRow }>('/rehabilitation', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateRehabOrderStatus(id: string, data: {
  status: string
  cancelled_reason?: string
  catatan_terapis?: string
  practitioner_id?: string
}) {
  const res = await apiClient<{ success: boolean; data: RehabOrderRow }>(
    `/rehabilitation/${id}/status`,
    { method: 'PATCH', body: JSON.stringify(data) },
  )
  return res.data
}

export async function assignPractitioner(orderId: string, practitionerId: string) {
  const res = await apiClient<{ success: boolean; data: RehabOrderRow }>(
    `/rehabilitation/${orderId}/assign`,
    { method: 'PATCH', body: JSON.stringify({ practitioner_id: practitionerId }) },
  )
  return res.data
}

export async function getPatientRehabHistory(patientId: string) {
  const res = await apiClient<{ success: boolean; data: RehabOrderRow[] }>(
    `/rehabilitation/patient/${patientId}`,
  )
  return res.data
}

export async function getRehabStats() {
  const res = await apiClient<{ success: boolean; data: RehabStats }>('/rehabilitation/stats')
  return res.data
}

// ── Sessions ──

export async function addRehabSession(orderId: string, data: {
  tanggal: string
  waktu_mulai?: string
  waktu_selesai?: string
  practitioner_id?: string
  tindakan?: string
  hasil?: string
  catatan_progress?: string
  skala_nyeri_sebelum?: number
  skala_nyeri_sesudah?: number
  rom_sebelum?: string
  rom_sesudah?: string
}) {
  const res = await apiClient<{ success: boolean; data: SessionRow }>(
    `/rehabilitation/${orderId}/sessions`,
    { method: 'POST', body: JSON.stringify(data) },
  )
  return res.data
}

export async function updateRehabSession(sessionId: string, data: {
  tindakan?: string
  hasil?: string
  catatan_progress?: string
  skala_nyeri_sebelum?: number
  skala_nyeri_sesudah?: number
  rom_sebelum?: string
  rom_sesudah?: string
  waktu_mulai?: string
  waktu_selesai?: string
}) {
  const res = await apiClient<{ success: boolean; data: SessionRow }>(
    `/rehabilitation/sessions/${sessionId}`,
    { method: 'PUT', body: JSON.stringify(data) },
  )
  return res.data
}

export async function deleteRehabSession(sessionId: string) {
  const res = await apiClient<{ success: boolean; deleted: boolean }>(
    `/rehabilitation/sessions/${sessionId}`,
    { method: 'DELETE' },
  )
  return res
}

// ── Fees ──

export async function getOrderFees(orderId: string) {
  const res = await apiClient<{ success: boolean; data: PractitionerFeeTransaction[] }>(
    `/rehabilitation/${orderId}/fees`,
  )
  return res.data
}

export async function getPractitionerEarnings(
  practitionerId: string,
  params?: { start?: string; end?: string },
) {
  const sp = new URLSearchParams()
  if (params?.start) sp.set('start', params.start)
  if (params?.end) sp.set('end', params.end)
  const res = await apiClient<{ success: boolean; data: PractitionerEarnings }>(
    `/rehabilitation/practitioner/${practitionerId}/earnings?${sp}`,
  )
  return res.data
}

export async function getFeeSummary(params?: { start?: string; end?: string }) {
  const sp = new URLSearchParams()
  if (params?.start) sp.set('start', params.start)
  if (params?.end) sp.set('end', params.end)
  const res = await apiClient<{ success: boolean; data: FeeSummary }>(
    `/rehabilitation/fee-summary?${sp}`,
  )
  return res.data
}

// ── External Practitioners ──

export async function listPractitioners(params?: {
  page?: number
  limit?: number
  profesi?: string
  status?: string
  search?: string
}) {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.profesi) sp.set('profesi', params.profesi)
  if (params?.status) sp.set('status', params.status)
  if (params?.search) sp.set('search', params.search)
  return apiClient<{
    success: boolean
    data: ExternalPractitioner[]
    meta: PaginationMeta
  }>(`/external-practitioners?${sp}`)
}

export async function getPractitionerDropdown(profesi?: string) {
  const sp = new URLSearchParams()
  if (profesi) sp.set('profesi', profesi)
  const res = await apiClient<{
    success: boolean
    data: Array<{
      id: string
      nama: string
      profesi: string
      spesialisasi: string | null
      instansi_asal: string | null
    }>
  }>(`/external-practitioners/dropdown?${sp}`)
  return res.data
}

export async function getPractitionerStats() {
  const res = await apiClient<{ success: boolean; data: PractitionerStats }>(
    '/external-practitioners/stats',
  )
  return res.data
}

export async function createPractitioner(data: {
  nama: string
  profesi: string
  spesialisasi?: string
  no_sip?: string
  no_str?: string
  instansi_asal?: string
  telepon?: string
  email?: string
  alamat?: string
  fee_share_persen?: number
  fee_share_rs_persen?: number
  kontrak_mulai?: string
  kontrak_selesai?: string
  catatan?: string
}) {
  const res = await apiClient<{ success: boolean; data: ExternalPractitioner }>(
    '/external-practitioners',
    { method: 'POST', body: JSON.stringify(data) },
  )
  return res.data
}

export async function updatePractitioner(id: string, data: Record<string, unknown>) {
  const res = await apiClient<{ success: boolean; data: ExternalPractitioner }>(
    `/external-practitioners/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
  )
  return res.data
}

export async function deletePractitioner(id: string) {
  return apiClient<{ success: boolean }>(`/external-practitioners/${id}`, { method: 'DELETE' })
}
