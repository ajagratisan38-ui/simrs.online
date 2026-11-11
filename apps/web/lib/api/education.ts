import { apiClient } from './client'
import type { ApiResponse } from '@simrs/shared-types'

// --- Types ---

export interface EducationTopic {
  id: string
  kode: string
  nama: string
  kategori: string
  deskripsi: string | null
  materi: string | null
  is_active: boolean
  created_at: string
}

export interface EducationRecord {
  id: string
  visit_id: string
  patient_id: string
  educator_id: string
  tanggal: string
  topic_id: string | null
  topik_manual: string | null
  kategori: string
  materi_diberikan: string
  metode: string[]
  bahasa: string
  sasaran: string
  nama_sasaran: string | null
  hubungan_sasaran: string | null
  evaluasi_pemahaman: string
  evaluasi_catatan: string | null
  perlu_reedukasi: boolean
  reedukasi_tanggal: string | null
  reedukasi_ref: string | null
  verified_by_patient: boolean
  patient_signature: string | null
  verified_at: string | null
  status: string
  catatan: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  topic_kode?: string
  topic_nama?: string
  topic_kategori?: string
  patient_nama?: string
  no_rekam_medis?: string
  educator_nama?: string
  educator_role?: string
  visit_number?: string
}

export interface TopicCategory {
  kategori: string
  count: number
}

export interface EducationStats {
  total: number
  verified: number
  verificationRate: number
  pendingReeducation: number
  byKategori: { kategori: string; count: number }[]
  byEvaluasi: { evaluasi: string; count: number }[]
}

export interface VisitEducationStats {
  totalTopics: number
  verifiedCount: number
  allVerified: boolean
  reeducationNeeded: number
}

export interface CreateTopicInput {
  kode: string
  nama: string
  kategori: string
  deskripsi?: string
  materi?: string
}

export interface UpdateTopicInput {
  kode?: string
  nama?: string
  kategori?: string
  deskripsi?: string | null
  materi?: string | null
  is_active?: boolean
}

export interface CreateEducationRecordInput {
  visit_id: string
  topic_id?: string
  topik_manual?: string
  kategori: string
  materi_diberikan: string
  metode: string[]
  bahasa?: string
  sasaran: string
  nama_sasaran?: string
  hubungan_sasaran?: string
  evaluasi_pemahaman: string
  evaluasi_catatan?: string
  catatan?: string
  status?: string
}

export interface UpdateEducationRecordInput {
  topic_id?: string | null
  topik_manual?: string | null
  kategori?: string
  materi_diberikan?: string
  metode?: string[]
  bahasa?: string
  sasaran?: string
  nama_sasaran?: string | null
  hubungan_sasaran?: string | null
  evaluasi_pemahaman?: string
  evaluasi_catatan?: string | null
  catatan?: string | null
  status?: string
}

// --- Topic API Functions ---

export async function listTopics(
  params?: { kategori?: string; search?: string; is_active?: boolean },
): Promise<ApiResponse<EducationTopic[]>> {
  const qs = new URLSearchParams()
  if (params?.kategori) qs.set('kategori', params.kategori)
  if (params?.search) qs.set('search', params.search)
  if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active))
  const query = qs.toString()
  return apiClient<ApiResponse<EducationTopic[]>>(
    `/education/topics${query ? `?${query}` : ''}`,
  )
}

export async function getTopic(id: string): Promise<ApiResponse<EducationTopic>> {
  return apiClient<ApiResponse<EducationTopic>>(`/education/topics/${id}`)
}

export async function createTopic(
  data: CreateTopicInput,
): Promise<ApiResponse<EducationTopic>> {
  return apiClient<ApiResponse<EducationTopic>>('/education/topics', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTopic(
  id: string,
  data: UpdateTopicInput,
): Promise<ApiResponse<EducationTopic>> {
  return apiClient<ApiResponse<EducationTopic>>(`/education/topics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTopic(id: string): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/education/topics/${id}`, {
    method: 'DELETE',
  })
}

export async function getTopicCategories(): Promise<ApiResponse<TopicCategory[]>> {
  return apiClient<ApiResponse<TopicCategory[]>>('/education/topics/categories')
}

// --- Record API Functions ---

export async function createEducationRecord(
  data: CreateEducationRecordInput,
): Promise<ApiResponse<EducationRecord>> {
  return apiClient<ApiResponse<EducationRecord>>('/education/records', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getEducationRecord(
  id: string,
): Promise<ApiResponse<EducationRecord>> {
  return apiClient<ApiResponse<EducationRecord>>(`/education/records/${id}`)
}

export async function updateEducationRecord(
  id: string,
  data: UpdateEducationRecordInput,
): Promise<ApiResponse<EducationRecord>> {
  return apiClient<ApiResponse<EducationRecord>>(`/education/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteEducationRecord(id: string): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/education/records/${id}`, {
    method: 'DELETE',
  })
}

export async function listEducationByVisit(
  visitId: string,
): Promise<ApiResponse<EducationRecord[]>> {
  return apiClient<ApiResponse<EducationRecord[]>>(
    `/education/records/visit/${visitId}`,
  )
}

export async function listEducationByPatient(
  patientId: string,
): Promise<ApiResponse<EducationRecord[]>> {
  return apiClient<ApiResponse<EducationRecord[]>>(
    `/education/records/patient/${patientId}`,
  )
}

export async function verifyEducationRecord(
  id: string,
  signatureData: string,
): Promise<ApiResponse<EducationRecord>> {
  return apiClient<ApiResponse<EducationRecord>>(
    `/education/records/${id}/verify`,
    {
      method: 'PUT',
      body: JSON.stringify({ signature_data: signatureData }),
    },
  )
}

export async function scheduleReeducation(
  id: string,
  tanggal: string,
): Promise<ApiResponse<EducationRecord>> {
  return apiClient<ApiResponse<EducationRecord>>(
    `/education/records/${id}/reeducation`,
    {
      method: 'PUT',
      body: JSON.stringify({ tanggal }),
    },
  )
}

export async function listPendingReeducation(): Promise<ApiResponse<EducationRecord[]>> {
  return apiClient<ApiResponse<EducationRecord[]>>(
    '/education/records/pending-reeducation',
  )
}

// --- Stats API Functions ---

export async function getEducationStats(): Promise<ApiResponse<EducationStats>> {
  return apiClient<ApiResponse<EducationStats>>('/education/stats')
}

export async function getEducationStatsByVisit(
  visitId: string,
): Promise<ApiResponse<VisitEducationStats>> {
  return apiClient<ApiResponse<VisitEducationStats>>(
    `/education/stats/visit/${visitId}`,
  )
}
