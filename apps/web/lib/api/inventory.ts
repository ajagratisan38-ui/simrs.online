import { apiClient } from './client'

export interface TransferRow {
  id: string
  nomor_mutasi: string
  drug_id: string
  drug_nama: string
  from_location: string
  to_location: string
  jumlah: number
  satuan: string
  status: string
  created_at: string
  [key: string]: unknown
}

export interface CreateTransferInput {
  drug_id: string
  from_location: string
  to_location: string
  jumlah: number
  catatan?: string
}

export async function listTransfers(params?: {
  page?: number
  limit?: number
  status?: string
  from_location?: string
  to_location?: string
  search?: string
}) {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.status) sp.set('status', params.status)
  if (params?.from_location) sp.set('from_location', params.from_location)
  if (params?.to_location) sp.set('to_location', params.to_location)
  if (params?.search) sp.set('search', params.search)
  const qs = sp.toString()
  return apiClient<{ success: boolean; data: TransferRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/item-transfers${qs ? `?${qs}` : ''}`)
}

export async function getTransfer(id: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/item-transfers/${id}`)
  return res.data
}

export async function createTransfer(input: CreateTransferInput) {
  const res = await apiClient<{ success: boolean; data: unknown }>('/item-transfers', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function approveTransfer(id: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/item-transfers/${id}/approve`, {
    method: 'PATCH',
  })
  return res.data
}

export async function completeTransfer(id: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/item-transfers/${id}/complete`, {
    method: 'PATCH',
  })
  return res.data
}

export async function rejectTransfer(id: string, alasan: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/item-transfers/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ alasan }),
  })
  return res.data
}
