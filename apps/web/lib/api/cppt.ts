import { apiClient } from './client'
import type { ApiResponse, PaginationMeta } from '@simrs/shared-types'

// --- Types ---

export interface CpptEntry {
  id: string
  visit_id: string
  patient_id: string
  user_id: string
  profesi: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  planning: string | null
  instruksi: string | null
  evaluasi: string | null
  tanggal_waktu: string
  is_verified: boolean
  verified_by: string | null
  verified_by_nama: string | null
  verified_at: string | null
  user_nama: string
  visit_number?: string
  created_at: string
  updated_at: string
}

export interface CreateCpptInput {
  visit_id: string
  subjective?: string
  objective?: string
  assessment?: string
  planning?: string
  instruksi?: string
  evaluasi?: string
}

export interface UpdateCpptInput {
  subjective?: string
  objective?: string
  assessment?: string
  planning?: string
  instruksi?: string
  evaluasi?: string
}

export interface CpptListResponse {
  success: boolean
  data: CpptEntry[]
  meta: PaginationMeta
}

// --- API functions ---

export async function listCpptByVisit(
  visitId: string,
  params?: { page?: number; limit?: number; profesi?: string },
): Promise<CpptListResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.profesi) qs.set('profesi', params.profesi)
  const query = qs.toString()
  return apiClient<CpptListResponse>(`/cppt/visit/${visitId}${query ? `?${query}` : ''}`)
}

export async function listCpptByPatient(
  patientId: string,
  params?: { page?: number; limit?: number },
): Promise<CpptListResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return apiClient<CpptListResponse>(`/cppt/patient/${patientId}${query ? `?${query}` : ''}`)
}

export async function createCpptEntry(
  data: CreateCpptInput,
): Promise<ApiResponse<CpptEntry>> {
  return apiClient<ApiResponse<CpptEntry>>('/cppt', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCpptEntry(
  id: string,
  data: UpdateCpptInput,
): Promise<ApiResponse<CpptEntry>> {
  return apiClient<ApiResponse<CpptEntry>>(`/cppt/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function verifyCpptEntry(
  id: string,
): Promise<ApiResponse<CpptEntry>> {
  return apiClient<ApiResponse<CpptEntry>>(`/cppt/${id}/verify`, {
    method: 'PUT',
  })
}

export async function deleteCpptEntry(
  id: string,
): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/cppt/${id}`, {
    method: 'DELETE',
  })
}
