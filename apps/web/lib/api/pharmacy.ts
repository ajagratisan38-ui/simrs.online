import { apiClient } from './client'
import type { ApiResponse, PaginationMeta } from '@simrs/shared-types'

// --- Types ---

export interface DrugData {
  id: string
  kode: string
  nama: string
  nama_generik: string | null
  kategori: 'obat' | 'alkes' | 'bmhp' | 'nutrisi'
  satuan_kecil: string
  satuan_besar: string | null
  konversi: number
  harga_beli: number
  harga_jual: number
  margin_persen: number
  stok_minimum: number
  is_active: boolean
  created_at: string
  updated_at: string
  total_stok: number
}

export interface DrugStockData {
  id: string
  drug_id: string
  batch_number: string | null
  tanggal_kadaluarsa: string | null
  stok_awal: number
  stok_sisa: number
  harga_beli_per_unit: number
  supplier: string | null
  tanggal_masuk: string
  created_at: string
}

export interface DrugDetailData extends DrugData {
  stocks: DrugStockData[]
}

export interface DrugTransactionData {
  id: string
  drug_id: string
  drug_stock_id: string | null
  tipe: 'masuk' | 'keluar' | 'penyesuaian' | 'retur'
  jumlah: number
  stok_sebelum: number
  stok_sesudah: number
  catatan: string | null
  batch_number: string | null
  created_at: string
}

export interface PrescriptionItemData {
  id: string
  prescription_id: string
  drug_id: string | null
  nama_obat: string
  dosis: string | null
  satuan: string | null
  frekuensi: string | null
  durasi_hari: number | null
  jumlah: number
  aturan_pakai: string | null
  catatan: string | null
}

export interface PendingPrescriptionData {
  id: string
  visit_id: string
  status: string
  catatan_dokter: string | null
  created_at: string
  visit_number: string
  tanggal: string
  patient_nama: string
  no_rekam_medis: string
  room_nama: string
  doctor_nama: string
  items: PrescriptionItemData[]
}

export interface DispenseItemInput {
  prescription_item_id?: string
  drug_id: string
  jumlah_diminta: number
  jumlah_diberikan: number
  catatan?: string
}

export interface DispenseInput {
  items: DispenseItemInput[]
  catatan_apoteker?: string
}

export interface DispensingData {
  id: string
  prescription_id: string
  visit_id: string
  status: string
  catatan_apoteker: string | null
  dispensed_by: string
  dispensed_by_name: string
  dispensed_at: string
  patient_nama: string
  no_rekam_medis: string
  visit_number: string
  items: {
    id: string
    drug_id: string
    drug_stock_id: string | null
    jumlah_diminta: number
    jumlah_diberikan: number
    catatan: string | null
    drug_nama: string
    drug_kode: string
    satuan_kecil: string
  }[]
}

export interface ExpiringDrugData {
  stock_id: string
  batch_number: string | null
  tanggal_kadaluarsa: string
  stok_sisa: number
  drug_id: string
  kode: string
  nama: string
  satuan_kecil: string
}

export interface DrugFilters {
  search?: string
  kategori?: string
  is_active?: boolean
  page?: number
  limit?: number
}

// --- API functions ---

function buildQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// Drugs
export async function listDrugs(
  filters: DrugFilters = {},
): Promise<ApiResponse<DrugData[]> & { meta: PaginationMeta }> {
  return apiClient(`/drugs${buildQuery(filters as Record<string, unknown>)}`)
}

export async function getDrug(id: string): Promise<ApiResponse<DrugDetailData>> {
  return apiClient(`/drugs/${id}`)
}

export async function searchDrugs(
  q: string,
  limit = 15,
): Promise<ApiResponse<DrugData[]>> {
  return apiClient(`/drugs/search?q=${encodeURIComponent(q)}&limit=${limit}`)
}

export async function createDrug(
  data: Record<string, unknown>,
): Promise<ApiResponse<DrugData>> {
  return apiClient('/drugs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDrug(
  id: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<DrugData>> {
  return apiClient(`/drugs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteDrug(
  id: string,
): Promise<ApiResponse<{ message: string }>> {
  return apiClient(`/drugs/${id}`, {
    method: 'DELETE',
  })
}

// Stock
export async function addStock(
  drugId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<DrugStockData>> {
  return apiClient(`/drugs/${drugId}/stock`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function adjustStock(
  drugId: string,
  data: Record<string, unknown>,
): Promise<ApiResponse> {
  return apiClient(`/drugs/${drugId}/adjust`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getStockHistory(
  drugId: string,
): Promise<ApiResponse<{ drug: DrugData; transactions: DrugTransactionData[] }>> {
  return apiClient(`/drugs/${drugId}/history`)
}

// Alerts
export async function getExpiringDrugs(
  days = 90,
): Promise<ApiResponse<ExpiringDrugData[]>> {
  return apiClient(`/drugs/alerts/expiring?days=${days}`)
}

export async function getLowStockDrugs(): Promise<ApiResponse<DrugData[]>> {
  return apiClient('/drugs/alerts/low-stock')
}

// Dispensing
export async function getPendingDispensing(): Promise<
  ApiResponse<PendingPrescriptionData[]>
> {
  return apiClient('/dispensing/pending')
}

export async function dispenseprescription(
  prescriptionId: string,
  data: DispenseInput,
): Promise<ApiResponse<DispensingData>> {
  return apiClient(`/dispensing/${prescriptionId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getDispensing(
  id: string,
): Promise<ApiResponse<DispensingData>> {
  return apiClient(`/dispensing/${id}`)
}
