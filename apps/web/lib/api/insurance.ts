import { apiClient } from './client'
import type { ApiResponse, PaginationMeta } from '@simrs/shared-types'

export interface Insurance {
  id: string
  kode: string
  nama: string
  tipe: string
  alamat: string | null
  telepon: string | null
  email: string | null
  pic_nama: string | null
  pic_telepon: string | null
  tarif_persen: number
  catatan: string | null
  is_active: boolean
  created_at: string
  patient_count?: number
}

export interface PatientInsurance {
  id: string
  patient_id: string
  insurance_id: string
  no_polis: string
  kelas: string | null
  berlaku_mulai: string | null
  berlaku_sampai: string | null
  is_active: boolean
  catatan: string | null
  insurance_kode: string
  insurance_nama: string
  insurance_tipe: string
  tarif_persen?: number
}

export interface InsuranceStats {
  total_insurances: number
  total_members: number
  by_tipe: { tipe: string; count: string }[]
  recent_claims: { insurance_nama: string; visit_count: string }[]
}

// Master insurances
export async function listInsurances(params?: {
  search?: string; tipe?: string; is_active?: boolean; page?: number; limit?: number
}): Promise<{ success: boolean; data: Insurance[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.tipe) qs.set('tipe', params.tipe)
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active))
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return apiClient(`/insurances${q ? `?${q}` : ''}`)
}

export async function getInsurance(id: string): Promise<ApiResponse<Insurance>> {
  return apiClient(`/insurances/${id}`)
}

export async function createInsurance(data: {
  kode: string; nama: string; tipe?: string; alamat?: string; telepon?: string
  email?: string; pic_nama?: string; pic_telepon?: string; tarif_persen?: number
  catatan?: string
}): Promise<ApiResponse<Insurance>> {
  return apiClient('/insurances', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateInsurance(
  id: string, data: Record<string, unknown>,
): Promise<ApiResponse<Insurance>> {
  return apiClient(`/insurances/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function toggleInsurance(id: string): Promise<ApiResponse<Insurance>> {
  return apiClient(`/insurances/${id}/toggle`, { method: 'PATCH' })
}

export async function deleteInsurance(id: string): Promise<ApiResponse> {
  return apiClient(`/insurances/${id}`, { method: 'DELETE' })
}

export async function getInsuranceDropdown(): Promise<ApiResponse<{
  id: string; kode: string; nama: string; tipe: string; tarif_persen: number
}[]>> {
  return apiClient('/insurances/dropdown')
}

export async function getInsuranceStats(): Promise<ApiResponse<InsuranceStats>> {
  return apiClient('/insurances/stats')
}

// Patient insurances
export async function listPatientInsurances(
  patientId: string,
): Promise<ApiResponse<PatientInsurance[]>> {
  return apiClient(`/patients/${patientId}/insurances`)
}

export async function getPatientActiveInsurances(
  patientId: string,
): Promise<ApiResponse<PatientInsurance[]>> {
  return apiClient(`/patients/${patientId}/insurances/active`)
}

export async function addPatientInsurance(data: {
  patient_id: string; insurance_id: string; no_polis: string
  kelas?: string; berlaku_mulai?: string; berlaku_sampai?: string; catatan?: string
}): Promise<ApiResponse<PatientInsurance>> {
  return apiClient(`/patients/${data.patient_id}/insurances`, {
    method: 'POST', body: JSON.stringify(data),
  })
}

export async function updatePatientInsurance(
  patientId: string, id: string, data: Record<string, unknown>,
): Promise<ApiResponse<PatientInsurance>> {
  return apiClient(`/patients/${patientId}/insurances/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  })
}

export async function removePatientInsurance(
  patientId: string, id: string,
): Promise<ApiResponse> {
  return apiClient(`/patients/${patientId}/insurances/${id}`, { method: 'DELETE' })
}
