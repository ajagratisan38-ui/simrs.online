import { apiClient } from './client'
import type { ApiResponse, PaginationMeta } from '@simrs/shared-types'

// --- Supplier types ---

export interface Supplier {
  id: string
  kode: string
  nama: string
  alamat: string | null
  kota: string | null
  telepon: string | null
  email: string | null
  kontak_person: string | null
  npwp: string | null
  catatan: string | null
  is_active: boolean
  created_at: string
}

export interface CreateSupplierInput {
  kode: string
  nama: string
  alamat?: string
  kota?: string
  telepon?: string
  email?: string
  kontak_person?: string
  npwp?: string
  catatan?: string
}

export interface UpdateSupplierInput {
  nama?: string
  alamat?: string
  kota?: string
  telepon?: string
  email?: string
  kontak_person?: string
  npwp?: string
  catatan?: string
  is_active?: boolean
}

// --- PO types ---

export type POStatus = 'draft' | 'approved' | 'ordered' | 'received' | 'completed' | 'cancelled'

export interface POItem {
  id: string
  po_id: string
  drug_id: string
  drug_nama: string
  satuan: string
  jumlah: number
  harga_satuan: number
  total: number
  jumlah_diterima: number
  batch_number: string | null
  tanggal_kadaluarsa: string | null
  catatan: string | null
}

export interface PurchaseOrder {
  id: string
  nomor_po: string
  supplier_id: string
  supplier_nama: string
  supplier_kode: string
  supplier_telepon?: string
  status: POStatus
  tanggal_po: string
  tanggal_dibutuhkan: string | null
  subtotal: number
  diskon: number
  ppn: number
  grand_total: number
  catatan: string | null
  created_by: string | null
  created_by_nama: string | null
  approved_by: string | null
  approved_by_nama: string | null
  approved_at: string | null
  received_by: string | null
  received_by_nama: string | null
  received_at: string | null
  catatan_penerimaan: string | null
  item_count?: number
  items?: POItem[]
  created_at: string
  updated_at: string
}

export interface CreatePOInput {
  supplier_id: string
  tanggal_dibutuhkan?: string
  catatan?: string
  diskon?: number
  ppn_persen?: number
  items: {
    drug_id: string
    drug_nama: string
    satuan: string
    jumlah: number
    harga_satuan: number
  }[]
}

export interface ReceiveItemInput {
  item_id: string
  jumlah_diterima: number
  batch_number?: string
  tanggal_kadaluarsa?: string
}

export interface POListResponse {
  success: boolean
  data: PurchaseOrder[]
  meta: PaginationMeta
}

// --- Supplier API ---

export async function listSuppliers(): Promise<ApiResponse<Supplier[]>> {
  return apiClient<ApiResponse<Supplier[]>>('/suppliers')
}

export async function createSupplier(data: CreateSupplierInput): Promise<ApiResponse<Supplier>> {
  return apiClient<ApiResponse<Supplier>>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateSupplier(id: string, data: UpdateSupplierInput): Promise<ApiResponse<Supplier>> {
  return apiClient<ApiResponse<Supplier>>(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteSupplier(id: string): Promise<ApiResponse> {
  return apiClient<ApiResponse>(`/suppliers/${id}`, { method: 'DELETE' })
}

// --- PO API ---

export async function listPurchaseOrders(
  params?: { page?: number; limit?: number; status?: string; supplier_id?: string; search?: string },
): Promise<POListResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.status) qs.set('status', params.status)
  if (params?.supplier_id) qs.set('supplier_id', params.supplier_id)
  if (params?.search) qs.set('search', params.search)
  const query = qs.toString()
  return apiClient<POListResponse>(`/purchase-orders${query ? `?${query}` : ''}`)
}

export async function getPurchaseOrder(id: string): Promise<ApiResponse<PurchaseOrder>> {
  return apiClient<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`)
}

export async function createPurchaseOrder(data: CreatePOInput): Promise<ApiResponse<PurchaseOrder>> {
  return apiClient<ApiResponse<PurchaseOrder>>('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePOStatus(
  id: string,
  status: POStatus,
  catatan_penerimaan?: string,
): Promise<ApiResponse<PurchaseOrder>> {
  return apiClient<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, catatan_penerimaan }),
  })
}

export async function receivePOItems(
  id: string,
  items: ReceiveItemInput[],
): Promise<ApiResponse<PurchaseOrder>> {
  return apiClient<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/receive`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}
