import { apiClient } from './client'

export interface LogbookEntry {
  id: string
  visit_id: string
  subjective: string | null
  assessment: string | null
  status: string
  created_at: string
  visit_number: string
  tanggal: string
  visit_tipe: string
  penjamin: string
  patient_nama: string
  no_rekam_medis: string
  patient_jk: string
  patient_tgl_lahir: string
  room_nama: string
  room_kode: string
  diagnoses: Array<{
    icd10_code: string
    icd10_name: string
    tipe: string
  }>
  procedures: Array<{
    kode_tindakan: string | null
    nama_tindakan: string
    qty: number
  }>
}

export interface LogbookStats {
  totalPasien: number
  totalKunjungan: number
  totalDiagnosis: number
  totalTindakan: number
  totalResep: number
}

export interface LogbookFilters {
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  tipe?: string
  search?: string
}

export function getLogbook(
  filters: LogbookFilters = {},
): Promise<{
  success: boolean
  data: LogbookEntry[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}> {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.tipe) params.set('tipe', filters.tipe)
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()
  return apiClient(`/logbook${qs ? `?${qs}` : ''}`)
}

export function getLogbookStats(
  startDate?: string,
  endDate?: string,
): Promise<{ success: boolean; data: LogbookStats }> {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  const qs = params.toString()
  return apiClient(`/logbook/stats${qs ? `?${qs}` : ''}`)
}
