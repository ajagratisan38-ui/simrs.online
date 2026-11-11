import { apiClient } from './client'

export interface KomponenTarif {
  id: string
  kode: string
  nama: string
  kategori: string
  tarif_kelas_3: number
  tarif_kelas_2: number
  tarif_kelas_1: number
  tarif_vip: number
  tarif_igd: number
  tarif_poli: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTarifInput {
  kode: string
  nama: string
  kategori: string
  tarif_kelas_3?: number
  tarif_kelas_2?: number
  tarif_kelas_1?: number
  tarif_vip?: number
  tarif_igd?: number
  tarif_poli?: number
}

export interface UpdateTarifInput {
  nama?: string
  kategori?: string
  tarif_kelas_3?: number
  tarif_kelas_2?: number
  tarif_kelas_1?: number
  tarif_vip?: number
  tarif_igd?: number
  tarif_poli?: number
  is_active?: boolean
}

export interface TarifStats {
  total: number
  active: number
  inactive: number
  byKategori: { kategori: string; count: number }[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function listTarif(filters?: {
  kategori?: string
  search?: string
  is_active?: string
}) {
  const params = new URLSearchParams()
  if (filters?.kategori) params.set('kategori', filters.kategori)
  if (filters?.search) params.set('search', filters.search)
  if (filters?.is_active) params.set('is_active', filters.is_active)
  const qs = params.toString()
  const res = await apiClient<ApiResponse<KomponenTarif[]>>(`/tarif${qs ? `?${qs}` : ''}`)
  return res.data
}

export async function getTarifById(id: string) {
  const res = await apiClient<ApiResponse<KomponenTarif>>(`/tarif/${id}`)
  return res.data
}

export async function createTarif(data: CreateTarifInput) {
  const res = await apiClient<ApiResponse<KomponenTarif>>('/tarif', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateTarif(id: string, data: UpdateTarifInput) {
  const res = await apiClient<ApiResponse<KomponenTarif>>(`/tarif/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function deleteTarif(id: string) {
  const res = await apiClient<ApiResponse<{ deleted: boolean }>>(`/tarif/${id}`, {
    method: 'DELETE',
  })
  return res.data
}

export async function toggleTarifActive(id: string) {
  const res = await apiClient<ApiResponse<KomponenTarif>>(`/tarif/${id}/toggle`, {
    method: 'PATCH',
  })
  return res.data
}

export async function getTarifStats() {
  const res = await apiClient<ApiResponse<TarifStats>>('/tarif/stats')
  return res.data
}
