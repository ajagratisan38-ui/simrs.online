import { apiClient } from './client'
import type { RadiologyOrder, RadiologyExamination } from '@simrs/shared-types'
import type { PaginationMeta } from './laboratory'

export interface RadiologyOrderRow extends RadiologyOrder {
  patient_nama?: string
  no_rekam_medis?: string
  nik?: string
  jenis_kelamin?: string
  tanggal_lahir?: string
  doctor_nama?: string
  doctor_spesialisasi?: string
  radiografer_nama?: string
  radiolog_nama?: string
  examination_detail?: RadiologyExamination
}

export interface RadiologyStats {
  pending: number
  cito: number
  today: number
  completed_today: number
}

// --- Radiology Examinations (reference data) ---

export async function searchExaminations(params: {
  q: string
  modalitas?: string
  limit?: number
}) {
  const sp = new URLSearchParams({ q: params.q })
  if (params.modalitas) sp.set('modalitas', params.modalitas)
  if (params.limit) sp.set('limit', String(params.limit))
  const res = await apiClient<{ success: boolean; data: RadiologyExamination[] }>(`/radiology-examinations/search?${sp}`)
  return res.data
}

export async function getModalities(): Promise<string[]> {
  const res = await apiClient<{ success: boolean; data: string[] }>('/radiology-examinations/modalities')
  return res.data
}

// --- Radiology Orders ---

export async function listRadiologyOrders(params?: {
  page?: number
  limit?: number
  status?: string
  prioritas?: string
  modalitas?: string
  search?: string
  tanggal_dari?: string
  tanggal_sampai?: string
}) {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.status) sp.set('status', params.status)
  if (params?.prioritas) sp.set('prioritas', params.prioritas)
  if (params?.modalitas) sp.set('modalitas', params.modalitas)
  if (params?.search) sp.set('search', params.search)
  if (params?.tanggal_dari) sp.set('tanggal_dari', params.tanggal_dari)
  if (params?.tanggal_sampai) sp.set('tanggal_sampai', params.tanggal_sampai)
  return apiClient<{ success: boolean; data: RadiologyOrderRow[]; meta: PaginationMeta }>(`/radiology-orders?${sp}`)
}

export async function getRadiologyOrder(id: string) {
  const res = await apiClient<{ success: boolean; data: RadiologyOrderRow }>(`/radiology-orders/${id}`)
  return res.data
}

export async function createRadiologyOrder(data: {
  visit_id: string
  medical_record_id?: string
  examination_id: string
  prioritas?: 'normal' | 'cito'
  catatan_klinis?: string
  diagnosa_klinis?: string
}) {
  const res = await apiClient<{ success: boolean; data: unknown }>('/radiology-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function scheduleRadiologyOrder(orderId: string, data: {
  tanggal_jadwal: string
  catatan?: string
}) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/radiology-orders/${orderId}/schedule`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function startRadiologyProcessing(orderId: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/radiology-orders/${orderId}/process`, {
    method: 'POST',
  })
  return res.data
}

export async function inputRadiologyResults(orderId: string, data: {
  hasil_bacaan: string
  kesan: string
}) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/radiology-orders/${orderId}/results`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function cancelRadiologyOrder(orderId: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/radiology-orders/${orderId}/cancel`, {
    method: 'POST',
  })
  return res.data
}

export async function getRadiologyResultsByVisit(visitId: string) {
  const res = await apiClient<{ success: boolean; data: RadiologyOrderRow[] }>(`/radiology-orders/visit/${visitId}`)
  return res.data
}

export async function getPatientRadiologyHistory(patientId: string) {
  const res = await apiClient<{ success: boolean; data: RadiologyOrderRow[] }>(`/radiology-orders/patient/${patientId}`)
  return res.data
}

export async function getRadiologyStats() {
  const res = await apiClient<{ success: boolean; data: RadiologyStats }>('/radiology-orders/stats')
  return res.data
}
