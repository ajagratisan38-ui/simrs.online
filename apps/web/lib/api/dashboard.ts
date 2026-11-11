import { apiClient } from './client'

// --- Types ---

export interface OverviewData {
  visits: {
    total: number
    rawat_jalan: number
    igd: number
    rawat_inap: number
  }
  queues: {
    menunggu: number
    dilayani: number
  }
  bedOccupancy: {
    occupied: number
    total: number
    rate: number
  }
  revenue: {
    total: number
    byMethod: { method: string; amount: number }[]
  }
  newPatients: number
}

export interface VisitStatsData {
  byDate: { date: string; count: number }[]
  byRoom: { room: string; count: number }[]
  byDoctor: { doctor: string; count: number }[]
  byPenjamin: { penjamin: string; count: number }[]
}

export interface DiagnosisRank {
  icd10_code: string
  icd10_name: string
  count: number
}

export interface RevenueData {
  byDate: { date: string; amount: number }[]
  byCategory: { category: string; amount: number }[]
  byPenjamin: { penjamin: string; amount: number }[]
  total: number
}

export interface PharmacyReportData {
  topDrugs: { drug: string; qty: number }[]
  expiringSoon: { drug: string; batch: string; expiry: string; stock: number }[]
  totalStockValue: number
  lowStock: { drug: string; stock: number; minimum: number }[]
}

export interface BedOccupancyData {
  rooms: { room: string; occupied: number; total: number; rate: number }[]
  averageLos: number
  overallBor: number
}

// --- API Calls ---

export async function getOverview() {
  return apiClient<{ success: boolean; data: OverviewData }>(
    '/dashboard/overview',
  )
}

export async function getVisitStats(
  from: string,
  to: string,
  groupBy: 'day' | 'week' | 'month' = 'day',
) {
  return apiClient<{ success: boolean; data: VisitStatsData }>(
    `/dashboard/visits?from=${from}&to=${to}&groupBy=${groupBy}`,
  )
}

export async function getTopDiagnoses(
  from: string,
  to: string,
  limit = 10,
) {
  return apiClient<{ success: boolean; data: DiagnosisRank[] }>(
    `/dashboard/top-diagnoses?from=${from}&to=${to}&limit=${limit}`,
  )
}

export async function getRevenueReport(
  from: string,
  to: string,
  groupBy: 'day' | 'week' | 'month' = 'day',
) {
  return apiClient<{ success: boolean; data: RevenueData }>(
    `/dashboard/revenue?from=${from}&to=${to}&groupBy=${groupBy}`,
  )
}

export async function getPharmacyReport() {
  return apiClient<{ success: boolean; data: PharmacyReportData }>(
    '/dashboard/pharmacy',
  )
}

export async function getBedOccupancy() {
  return apiClient<{ success: boolean; data: BedOccupancyData }>(
    '/dashboard/bed-occupancy',
  )
}

export function getExportUrl(
  type: string,
  from: string,
  to: string,
  format = 'csv',
) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
  return `${base}/dashboard/export?type=${type}&from=${from}&to=${to}&format=${format}`
}

export type ExportReportType = 'visits' | 'revenue' | 'pharmacy' | 'diagnoses' | 'patients' | 'billing'
export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

export async function downloadExport(
  type: ExportReportType,
  from: string,
  to: string,
  format: ExportFormat,
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
  const url = `${base}/dashboard/export?type=${type}&from=${from}&to=${to}&format=${format}`

  let token: string | null = null
  let tenantSlug = 'rs-demo'
  try {
    const stored = localStorage.getItem('simrs-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      token = parsed?.state?.accessToken || null
    }
    tenantSlug = localStorage.getItem('simrs-tenant-slug') || 'rs-demo'
  } catch { /* noop */ }

  const headers: Record<string, string> = {
    'X-Tenant-Slug': tenantSlug,
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Download gagal')
    throw new Error(errText)
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('Content-Disposition') || ''
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
  const filename = filenameMatch?.[1] || `laporan-${type}.${format}`

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}
