import { apiClient } from './client'
import type { LabOrder, LabOrderItem, LabParameter } from '@simrs/shared-types'

export interface LabOrderRow extends LabOrder {
  patient_nama?: string
  no_rekam_medis?: string
  nik?: string
  jenis_kelamin?: string
  tanggal_lahir?: string
  doctor_nama?: string
  doctor_spesialisasi?: string
  petugas_lab_nama?: string
  items?: LabOrderItem[]
  item_count?: number
}

export interface LabStats {
  pending: number
  cito: number
  today: number
  completed_today: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// --- Lab Parameters ---

export async function searchLabParameters(params: {
  q: string
  kategori?: string
  limit?: number
}) {
  const sp = new URLSearchParams({ q: params.q })
  if (params.kategori) sp.set('kategori', params.kategori)
  if (params.limit) sp.set('limit', String(params.limit))
  const res = await apiClient<{ success: boolean; data: LabParameter[] }>(`/lab-parameters/search?${sp}`)
  return res.data
}

export async function getLabCategories(): Promise<string[]> {
  const res = await apiClient<{ success: boolean; data: string[] }>('/lab-parameters/categories')
  return res.data
}

// --- Lab Orders ---

export async function listLabOrders(params?: {
  page?: number
  limit?: number
  status?: string
  prioritas?: string
  search?: string
  tanggal_dari?: string
  tanggal_sampai?: string
}) {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.status) sp.set('status', params.status)
  if (params?.prioritas) sp.set('prioritas', params.prioritas)
  if (params?.search) sp.set('search', params.search)
  if (params?.tanggal_dari) sp.set('tanggal_dari', params.tanggal_dari)
  if (params?.tanggal_sampai) sp.set('tanggal_sampai', params.tanggal_sampai)
  return apiClient<{ success: boolean; data: LabOrderRow[]; meta: PaginationMeta }>(`/lab-orders?${sp}`)
}

export async function getLabOrder(id: string) {
  const res = await apiClient<{ success: boolean; data: LabOrderRow }>(`/lab-orders/${id}`)
  return res.data
}

export async function createLabOrder(data: {
  visit_id: string
  medical_record_id?: string
  prioritas?: 'normal' | 'cito'
  catatan_klinis?: string
  items: Array<{ parameter_id: string; tarif?: number }>
}) {
  const res = await apiClient<{ success: boolean; data: unknown }>('/lab-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function receiveSample(orderId: string, catatan?: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/lab-orders/${orderId}/receive`, {
    method: 'POST',
    body: JSON.stringify({ catatan }),
  })
  return res.data
}

export async function startProcessing(orderId: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/lab-orders/${orderId}/process`, {
    method: 'POST',
  })
  return res.data
}

export async function inputLabResults(orderId: string, results: Array<{
  item_id: string
  hasil: string
  keterangan?: string
  flag?: 'normal' | 'rendah' | 'tinggi' | 'kritis'
}>) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/lab-orders/${orderId}/results`, {
    method: 'POST',
    body: JSON.stringify({ results }),
  })
  return res.data
}

export async function finalizeLabOrder(orderId: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/lab-orders/${orderId}/finalize`, {
    method: 'POST',
  })
  return res.data
}

export async function cancelLabOrder(orderId: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/lab-orders/${orderId}/cancel`, {
    method: 'POST',
  })
  return res.data
}

export async function getLabResultsByVisit(visitId: string) {
  const res = await apiClient<{ success: boolean; data: LabOrderRow[] }>(`/lab-orders/visit/${visitId}`)
  return res.data
}

export async function getPatientLabHistory(patientId: string) {
  const res = await apiClient<{ success: boolean; data: LabOrderRow[] }>(`/lab-orders/patient/${patientId}`)
  return res.data
}

export async function getLabStats() {
  const res = await apiClient<{ success: boolean; data: LabStats }>('/lab-orders/stats')
  return res.data
}
