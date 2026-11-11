import { apiClient } from './client'
import type { ApiResponse, PaginationMeta, Patient } from '@simrs/shared-types'

export interface PatientListResponse {
  success: boolean
  data: Patient[]
  meta: PaginationMeta
}

export interface PatientDetailResponse {
  success: boolean
  data: Patient & { visits: unknown[] }
}

export interface DuplicateCheckResponse {
  success: boolean
  data: {
    isDuplicate: boolean
    patient: Pick<Patient, 'id' | 'nik' | 'nama' | 'no_rekam_medis'> | null
  }
}

export interface PatientFilters {
  search?: string
  status?: 'active' | 'inactive' | 'all'
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

function buildQuery(filters: PatientFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.order) params.set('order', filters.order)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function listPatients(
  filters: PatientFilters = {},
): Promise<PatientListResponse> {
  return apiClient<PatientListResponse>(`/patients${buildQuery(filters)}`)
}

export async function getPatient(id: string): Promise<PatientDetailResponse> {
  return apiClient<PatientDetailResponse>(`/patients/${id}`)
}

export async function createPatient(
  data: Record<string, unknown>,
): Promise<ApiResponse<Patient>> {
  return apiClient<ApiResponse<Patient>>('/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePatient(
  id: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<Patient>> {
  return apiClient<ApiResponse<Patient>>(`/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePatient(
  id: string,
): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/patients/${id}`, {
    method: 'DELETE',
  })
}

export async function checkDuplicate(
  nik: string,
): Promise<DuplicateCheckResponse> {
  return apiClient<DuplicateCheckResponse>('/patients/duplicate-check', {
    method: 'POST',
    body: JSON.stringify({ nik }),
  })
}
