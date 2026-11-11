import { apiClient } from './client'

export interface OtcSaleRow {
  id: string
  nomor_transaksi: string
  receipt_number?: string
  nama_pembeli: string | null
  metode_bayar: string
  total: number
  subtotal?: number
  diskon?: number
  diskon_persen: number
  total_akhir: number
  grand_total?: number
  catatan: string | null
  items?: Array<Record<string, unknown>>
  created_at: string
  created_by?: string
}

export interface OtcDailySummary {
  total_transaksi: number
  total_pendapatan: number
  perMetodeBayar: Array<{ metode_bayar: string; jumlah: number; total: number }>
}

export interface OtcSaleInput {
  nama_pembeli?: string
  items: Array<{
    drug_id: string
    jumlah: number
    harga_satuan: number
  }>
  metode_bayar: 'tunai' | 'qris' | 'debit' | 'kredit'
  diskon_persen?: number
  catatan?: string
}

export async function listOtcSales(params?: {
  page?: number
  limit?: number
  date_from?: string
  date_to?: string
}) {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.date_from) sp.set('date_from', params.date_from)
  if (params?.date_to) sp.set('date_to', params.date_to)
  const qs = sp.toString()
  return apiClient<{ success: boolean; data: OtcSaleRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(`/otc-sales${qs ? `?${qs}` : ''}`)
}

export async function getOtcSale(id: string) {
  const res = await apiClient<{ success: boolean; data: unknown }>(`/otc-sales/${id}`)
  return res.data
}

export async function createOtcSale(input: OtcSaleInput) {
  const res = await apiClient<{ success: boolean; data: unknown }>('/otc-sales', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function getOtcDailySummary(date?: string) {
  const sp = new URLSearchParams()
  if (date) sp.set('date', date)
  const qs = sp.toString()
  const res = await apiClient<{ success: boolean; data: OtcDailySummary }>(`/otc-sales/summary${qs ? `?${qs}` : ''}`)
  return res.data
}
