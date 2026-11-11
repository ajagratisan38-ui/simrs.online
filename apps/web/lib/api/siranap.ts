import { apiClient } from './client'

// --- Types ---

export interface SiranapConfig {
  kode_rs: string
  password: string
  endpoint: string
  auto_send: boolean
  send_times: string[]
  send_on_change: boolean
}

export interface RoomBedSummary {
  kode_ruang: string
  nama_ruang: string
  kelas: number | null
  total_tt: number
  terpakai_pria: number
  terpakai_wanita: number
  kosong_pria: number
  kosong_wanita: number
  waiting: number
}

export interface BedDataResponse {
  rooms: RoomBedSummary[]
  summary: {
    total_ruang: number
    total_tt: number
    total_terpakai: number
    total_kosong: number
    bor: number
  }
}

export interface SiranapSubmission {
  id: string
  status: 'success' | 'failed' | 'pending'
  rooms_sent: number
  response_code: string | null
  response_message: string | null
  error_message: string | null
  duration_ms: number | null
  payload_xml: string | null
  triggered_by: string
  created_at: string
}

export interface SiranapStats {
  total: number
  today: number
  success: number
  failed: number
  successRate: number
  lastSuccess: string | null
  lastSubmission: string | null
  lastStatus: string | null
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  latencyMs: number
}

// --- API Functions ---

export async function getSiranapConfig() {
  return apiClient<{ success: boolean; data: SiranapConfig }>('/siranap/config')
}

export async function updateSiranapConfig(data: Partial<SiranapConfig>) {
  return apiClient<{ success: boolean; data: SiranapConfig }>(
    '/siranap/config',
    { method: 'PUT', body: JSON.stringify(data) },
  )
}

export async function testSiranapConnection() {
  return apiClient<{ success: boolean; data: ConnectionTestResult }>(
    '/siranap/test-connection',
    { method: 'POST' },
  )
}

export async function getSiranapBedData() {
  return apiClient<{ success: boolean; data: BedDataResponse }>('/siranap/bed-data')
}

export async function sendSiranapNow() {
  return apiClient<{ success: boolean; data: SiranapSubmission }>(
    '/siranap/send',
    { method: 'POST' },
  )
}

export async function getSiranapStats() {
  return apiClient<{ success: boolean; data: SiranapStats }>('/siranap/stats')
}

export async function listSiranapSubmissions(
  limit = 20,
  offset = 0,
  status?: string,
  days?: number,
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  if (status) params.set('status', status)
  if (days) params.set('days', String(days))

  return apiClient<{
    success: boolean
    data: SiranapSubmission[]
    total: number
    limit: number
    offset: number
  }>(`/siranap/submissions?${params}`)
}

export async function getSiranapSubmission(id: string) {
  return apiClient<{ success: boolean; data: SiranapSubmission }>(
    `/siranap/submissions/${id}`,
  )
}
