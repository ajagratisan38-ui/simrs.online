import { apiClient } from './client'
import type { ApiResponse, PaginationMeta } from '@simrs/shared-types'

export interface WarehouseItem {
  id: string
  kode: string
  nama: string
  kategori: string
  satuan: string
  harga_beli: number
  stok_minimum: number
  lokasi: string | null
  is_active: boolean
  total_stok: number
  created_at: string
}

export interface WarehouseItemDetail extends WarehouseItem {
  stocks: {
    id: string; batch_number: string | null; tanggal_kadaluarsa: string | null
    stok_awal: number; stok_sisa: number; harga_beli_per_unit: number
    supplier: string | null; tanggal_masuk: string
  }[]
}

export interface StockOpname {
  id: string
  nomor_opname: string
  tipe: string
  tanggal: string
  status: string
  catatan: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface OpnameItem {
  id: string
  opname_id: string
  item_type: string
  item_id: string
  item_nama: string
  satuan: string | null
  stok_sistem: number
  stok_fisik: number | null
  selisih: number | null
  catatan: string | null
  counted_at: string | null
}

export interface StockOpnameDetail extends StockOpname {
  items: OpnameItem[]
}

// Warehouse items
export async function listWarehouseItems(params?: {
  search?: string; kategori?: string; page?: number; limit?: number
}): Promise<{ success: boolean; data: WarehouseItem[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.kategori) qs.set('kategori', params.kategori)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return apiClient(`/warehouse${q ? `?${q}` : ''}`)
}

export async function getWarehouseItem(id: string): Promise<ApiResponse<WarehouseItemDetail>> {
  return apiClient(`/warehouse/${id}`)
}

export async function createWarehouseItem(data: {
  kode: string; nama: string; kategori?: string; satuan?: string
  harga_beli?: number; stok_minimum?: number; lokasi?: string
}): Promise<ApiResponse<WarehouseItem>> {
  return apiClient('/warehouse', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateWarehouseItem(
  id: string, data: Record<string, unknown>,
): Promise<ApiResponse<WarehouseItem>> {
  return apiClient(`/warehouse/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteWarehouseItem(id: string): Promise<ApiResponse> {
  return apiClient(`/warehouse/${id}`, { method: 'DELETE' })
}

export async function addWarehouseStock(data: {
  item_id: string; jumlah: number; batch_number?: string
  tanggal_kadaluarsa?: string; harga_beli_per_unit?: number; supplier?: string
}): Promise<ApiResponse> {
  return apiClient('/warehouse/stock', { method: 'POST', body: JSON.stringify(data) })
}

// Stock Opname
export async function listStockOpnames(params?: {
  status?: string; tipe?: string; page?: number; limit?: number
}): Promise<{ success: boolean; data: StockOpname[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.tipe) qs.set('tipe', params.tipe)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  return apiClient(`/stock-opname${q ? `?${q}` : ''}`)
}

export async function createStockOpname(data: {
  tipe: string; catatan?: string
}): Promise<ApiResponse<StockOpname>> {
  return apiClient('/stock-opname', { method: 'POST', body: JSON.stringify(data) })
}

export async function getStockOpname(id: string): Promise<ApiResponse<StockOpnameDetail>> {
  return apiClient(`/stock-opname/${id}`)
}

export async function inputOpnameCount(
  opnameId: string, itemId: string, stokFisik: number, catatan?: string,
): Promise<ApiResponse<OpnameItem>> {
  return apiClient(`/stock-opname/${opnameId}/items/${itemId}/count`, {
    method: 'PUT',
    body: JSON.stringify({ stok_fisik: stokFisik, catatan: catatan ?? null }),
  })
}

export async function completeStockOpname(id: string): Promise<ApiResponse<StockOpnameDetail>> {
  return apiClient(`/stock-opname/${id}/complete`, { method: 'POST' })
}

export async function cancelStockOpname(id: string): Promise<ApiResponse> {
  return apiClient(`/stock-opname/${id}/cancel`, { method: 'POST' })
}
