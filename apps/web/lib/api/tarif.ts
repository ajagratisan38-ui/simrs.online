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
  const res = await apiClient.get(`/tarif${qs ? `?${qs}` : ''}`)
  return res.data.data as KomponenTarif[]
}

export async function getTarifById(id: string) {
  const res = await apiClient.get(`/tarif/${id}`)
  return res.data.data as KomponenTarif
}

export async function createTarif(data: CreateTarifInput) {
  const res = await apiClient.post('/tarif', data)
  return res.data.data as KomponenTarif
}

export async function updateTarif(id: string, data: UpdateTarifInput) {
  const res = await apiClient.put(`/tarif/${id}`, data)
  return res.data.data as KomponenTarif
}

export async function deleteTarif(id: string) {
  const res = await apiClient.delete(`/tarif/${id}`)
  return res.data.data
}

export async function toggleTarifActive(id: string) {
  const res = await apiClient.patch(`/tarif/${id}/toggle`)
  return res.data.data as KomponenTarif
}

export async function getTarifStats() {
  const res = await apiClient.get('/tarif/stats')
  return res.data.data as TarifStats
}
