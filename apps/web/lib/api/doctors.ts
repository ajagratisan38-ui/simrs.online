import { apiClient } from './client'
import type { ApiResponse } from '@simrs/shared-types'

export type DoctorStatus = 'aktif' | 'cuti_panjang' | 'pindah' | 'resign' | 'pensiun'

export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = {
  aktif: 'Aktif',
  cuti_panjang: 'Cuti Panjang',
  pindah: 'Pindah',
  resign: 'Resign',
  pensiun: 'Pensiun',
}

export const DOCTOR_STATUS_COLORS: Record<DoctorStatus, string> = {
  aktif: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cuti_panjang: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pindah: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resign: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pensiun: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export interface DoctorListItem {
  id: string
  user_id: string
  nama: string
  email: string
  spesialisasi: string | null
  no_sip: string | null
  no_str: string | null
  tarif_konsultasi: number
  jadwal_praktek: Record<string, unknown>
  is_available: boolean
  status: DoctorStatus
  status_changed_at: string | null
  status_note: string | null
  deleted_at: string | null
  created_at: string
}

export interface DoctorSchedule {
  id: string
  doctor_id: string
  room_id: string
  room_nama: string
  room_kode: string
  hari: string
  jam_mulai: string
  jam_selesai: string
  kuota: number
  is_active: boolean
  catatan: string | null
}

export interface DoctorFee {
  id: string
  doctor_id: string
  kode: string
  nama_layanan: string
  kategori: string
  tarif: number
  persentase_dokter: number
  persentase_rs: number
  is_active: boolean
}

export interface DoctorDetail extends DoctorListItem {
  schedules: DoctorSchedule[]
  fees: DoctorFee[]
}

export interface TodayScheduleItem {
  id: string
  doctor_id: string
  doctor_nama: string
  spesialisasi: string | null
  room_id: string
  room_nama: string
  room_kode: string
  hari: string
  jam_mulai: string
  jam_selesai: string
  kuota: number
}

export interface FeeTransaction {
  id: string
  doctor_id: string
  visit_id: string
  fee_id: string | null
  deskripsi: string
  tarif: number
  jumlah_dokter: number
  jumlah_rs: number
  status: string
  created_at: string
  visit_number?: string
  tanggal?: string
  patient_nama?: string
}

export interface EarningsSummary {
  total_transaksi: number
  total_tarif: number
  total_jasa_dokter: number
  total_jasa_rs: number
}

export interface DoctorEarningsResponse {
  transactions: FeeTransaction[]
  summary: EarningsSummary
}

export interface AllEarningsItem {
  doctor_id: string
  doctor_nama: string
  spesialisasi: string | null
  total_transaksi: string
  total_tarif: string
  total_jasa_dokter: string
  total_jasa_rs: string
}

export async function listDoctorsAdmin(filters?: {
  status?: DoctorStatus
  includeInactive?: boolean
  includeDeleted?: boolean
}): Promise<ApiResponse<DoctorListItem[]>> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.includeInactive) params.set('includeInactive', 'true')
  if (filters?.includeDeleted) params.set('includeDeleted', 'true')
  const qs = params.toString()
  return apiClient<ApiResponse<DoctorListItem[]>>(`/doctors${qs ? `?${qs}` : ''}`)
}

export async function getDoctorDetail(id: string): Promise<ApiResponse<DoctorDetail>> {
  return apiClient<ApiResponse<DoctorDetail>>(`/doctors/${id}`)
}

export async function updateDoctor(
  id: string,
  data: Partial<{
    spesialisasi: string
    no_sip: string
    no_str: string
    tarif_konsultasi: number
    is_available: boolean
    status: DoctorStatus
    status_note: string
  }>,
): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/doctors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deactivateDoctor(
  id: string,
  reason?: string,
): Promise<ApiResponse<{ doctorId: string; deactivated: boolean }>> {
  return apiClient(`/doctors/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function reactivateDoctor(
  id: string,
): Promise<ApiResponse<{ doctorId: string; reactivated: boolean }>> {
  return apiClient(`/doctors/${id}/reactivate`, { method: 'POST' })
}

export async function getTodaySchedule(): Promise<ApiResponse<TodayScheduleItem[]>> {
  return apiClient<ApiResponse<TodayScheduleItem[]>>('/doctors/today-schedule')
}

// Schedules
export async function upsertSchedule(
  doctorId: string,
  data: {
    room_id: string
    hari: string
    jam_mulai: string
    jam_selesai: string
    kuota?: number
    catatan?: string
  },
): Promise<ApiResponse<DoctorSchedule>> {
  return apiClient<ApiResponse<DoctorSchedule>>(`/doctors/${doctorId}/schedules`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteSchedule(scheduleId: string): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/doctors/schedules/${scheduleId}`, {
    method: 'DELETE',
  })
}

export async function toggleSchedule(
  scheduleId: string,
  isActive: boolean,
): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/doctors/schedules/${scheduleId}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
}

// Fees
export async function createDoctorFee(
  doctorId: string,
  data: {
    kode: string
    nama_layanan: string
    kategori?: string
    tarif: number
    persentase_dokter?: number
    persentase_rs?: number
  },
): Promise<ApiResponse<DoctorFee>> {
  return apiClient<ApiResponse<DoctorFee>>(`/doctors/${doctorId}/fees`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDoctorFee(
  feeId: string,
  data: Partial<{
    nama_layanan: string
    kategori: string
    tarif: number
    persentase_dokter: number
    persentase_rs: number
    is_active: boolean
  }>,
): Promise<ApiResponse<DoctorFee>> {
  return apiClient<ApiResponse<DoctorFee>>(`/doctors/fees/${feeId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteDoctorFee(feeId: string): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/doctors/fees/${feeId}`, {
    method: 'DELETE',
  })
}

// Earnings
export async function getDoctorEarnings(
  doctorId: string,
  filters?: { start?: string; end?: string },
): Promise<ApiResponse<DoctorEarningsResponse>> {
  const params = new URLSearchParams()
  if (filters?.start) params.set('start', filters.start)
  if (filters?.end) params.set('end', filters.end)
  const qs = params.toString()
  return apiClient<ApiResponse<DoctorEarningsResponse>>(
    `/doctors/${doctorId}/earnings${qs ? `?${qs}` : ''}`,
  )
}

export async function getAllDoctorEarnings(
  filters?: { start?: string; end?: string },
): Promise<ApiResponse<AllEarningsItem[]>> {
  const params = new URLSearchParams()
  if (filters?.start) params.set('start', filters.start)
  if (filters?.end) params.set('end', filters.end)
  const qs = params.toString()
  return apiClient<ApiResponse<AllEarningsItem[]>>(
    `/doctors/earnings${qs ? `?${qs}` : ''}`,
  )
}
