import { apiClient } from './client'
import type { ApiResponse, PaginationMeta } from '@simrs/shared-types'

// --- Types ---

export interface BillItemData {
  id: string
  bill_id: string
  kategori: string
  deskripsi: string
  qty: number
  harga_satuan: number
  subtotal: number
  discount: number
  total: number
  referensi_id: string | null
  referensi_tipe: string | null
  created_at: string
}

export interface PaymentData {
  id: string
  bill_id: string
  metode: string
  jumlah: number
  referensi_pembayaran: string | null
  catatan: string | null
  received_by: string | null
  received_by_name: string | null
  paid_at: string
  created_at: string
}

export interface BillData {
  id: string
  visit_id: string
  patient_id: string
  total_amount: number
  discount_amount: number
  final_amount: number
  penjamin: string
  status: 'draft' | 'final' | 'dibayar' | 'batal'
  catatan: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  patient_nama: string
  no_rekam_medis: string
  visit_number: string
  visit_tipe: string
  tanggal: string
  room_nama: string
  doctor_nama: string
  items: BillItemData[]
  payments: PaymentData[]
  total_paid: number
  sisa_bayar: number
}

export interface OutstandingBillData {
  id: string
  visit_id: string
  patient_id: string
  total_amount: number
  discount_amount: number
  final_amount: number
  penjamin: string
  status: string
  created_at: string
  patient_nama: string
  no_rekam_medis: string
  visit_number: string
  tanggal: string
  visit_tipe: string
  room_nama: string
  doctor_nama: string
}

export interface DailySummaryData {
  tanggal: string
  total_pendapatan: number
  jumlah_sudah_bayar: number
  jumlah_belum_bayar: number
  per_metode: {
    metode: string
    total: number
    jumlah_transaksi: number
  }[]
}

export interface PaymentInput {
  metode: 'tunai' | 'debit' | 'kredit' | 'transfer' | 'bpjs' | 'asuransi'
  jumlah: number
  referensi_pembayaran?: string
  catatan?: string
}

export interface PaymentResult {
  payment: PaymentData
  kembalian: number
  bill: BillData
}

// --- API functions ---

export async function generateBill(
  visitId: string,
): Promise<ApiResponse<BillData>> {
  return apiClient(`/bills/${visitId}/generate`, { method: 'POST' })
}

export async function getBill(
  visitId: string,
): Promise<ApiResponse<BillData>> {
  return apiClient(`/bills/${visitId}`)
}

export async function applyDiscount(
  billId: string,
  data: { discount_amount: number; catatan: string },
): Promise<ApiResponse<BillData>> {
  return apiClient(`/bills/${billId}/discount`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function finalizeBill(
  billId: string,
): Promise<ApiResponse<BillData>> {
  return apiClient(`/bills/${billId}/finalize`, { method: 'PUT' })
}

export async function processPayment(
  billId: string,
  data: PaymentInput,
): Promise<ApiResponse<PaymentResult>> {
  return apiClient(`/bills/${billId}/pay`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getOutstandingBills(
  page = 1,
  limit = 20,
): Promise<ApiResponse<OutstandingBillData[]> & { meta: PaginationMeta }> {
  return apiClient(`/bills/outstanding?page=${page}&limit=${limit}`)
}

export async function getDailySummary(
  date?: string,
): Promise<ApiResponse<DailySummaryData>> {
  const qs = date ? `?date=${date}` : ''
  return apiClient(`/bills/summary/daily${qs}`)
}

// --- Patient billing history ---

export interface PatientBillData {
  id: string
  visit_id: string
  total_amount: number
  discount_amount: number
  final_amount: number
  penjamin: string
  status: string
  created_at: string
  visit_number: string
  tanggal: string
  visit_tipe: string
  room_nama: string
  doctor_nama: string
  total_paid: number
  sisa_bayar: number
  items_summary: {
    kategori: string
    count: number
    total: number
  }[]
}

export async function getPatientBills(
  patientId: string,
  page = 1,
  limit = 20,
): Promise<
  ApiResponse<PatientBillData[]> & {
    patient: { id: string; nama: string; no_rekam_medis: string }
    meta: PaginationMeta
  }
> {
  return apiClient(
    `/bills/patient/${patientId}?page=${page}&limit=${limit}`,
  )
}
