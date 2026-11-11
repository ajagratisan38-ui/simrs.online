import { apiClient } from './client'

// --- Types ---

export interface SirsConfig {
  kode_rs: string
  username: string
  password: string
  endpoint: string
  mode: 'sandbox' | 'production'
  auto_send_rl13: boolean
  rl13_times: string[]
}

export interface RL13Row {
  kode_ruang: string
  nama_ruang: string
  kelas: number
  total_tt: number
  terpakai: number
  kosong: number
}

export interface RL13Data {
  data: RL13Row[]
  summary: { totalTT: number; terpakai: number; kosong: number; bor: number }
}

export interface RL32Row {
  kelas: string
  awal_bulan: number
  masuk_pria: number
  masuk_wanita: number
  keluar_hidup_pria: number
  keluar_hidup_wanita: number
  keluar_mati_pria: number
  keluar_mati_wanita: number
  hari_perawatan: number
}

export interface Indikator {
  bor: number
  los: number
  toi: number
  bto: number
  gdr: number
  ndr: number
}

export interface RL32Data {
  data: RL32Row[]
  indikator: Indikator
}

export interface RL33Row {
  kategori: string
  baru: number
  lama: number
  total: number
}

export interface RL35Row {
  kode_poli: string
  nama_poli: string
  baru_pria: number
  baru_wanita: number
  lama_pria: number
  lama_wanita: number
  total: number
}

export interface RL38Row { kategori: string; jumlah: number }
export interface RL39Row { modalitas: string; jumlah: number }
export interface RL312Row { jenis: string; jumlah: number }

export interface RL41Row {
  peringkat: number
  icd10_code: string
  icd10_name: string
  jumlah: number
  pria: number
  wanita: number
}

export interface RL51Row {
  peringkat: number
  sebab: string
  icd10_code: string
  jumlah: number
  pria: number
  wanita: number
}

export interface SirsSubmission {
  id: string
  rl_type: string
  periode: string
  status: 'success' | 'failed' | 'pending'
  response_code: string | null
  response_message: string | null
  error_message: string | null
  duration_ms: number | null
  submitted_by: string
  created_at: string
}

export interface SirsSubmissionStats {
  total: number
  success: number
  failed: number
  lastSuccess: string | null
  byType: {
    rl_type: string
    last_sent: string
    success_count: number
    failed_count: number
  }[]
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  latencyMs: number
}

// --- API Functions ---

export async function getSirsConfig() {
  return apiClient<{ success: boolean; data: SirsConfig }>('/sirs-online/config')
}

export async function updateSirsConfig(data: Partial<SirsConfig>) {
  return apiClient<{ success: boolean; data: SirsConfig }>(
    '/sirs-online/config',
    { method: 'PUT', body: JSON.stringify(data) },
  )
}

export async function testSirsConnection() {
  return apiClient<{ success: boolean; data: ConnectionTestResult }>(
    '/sirs-online/test-connection',
    { method: 'POST' },
  )
}

export async function generateRL(
  rlType: string,
  tahun?: number,
  bulan?: number,
) {
  const params = new URLSearchParams()
  if (tahun) params.set('tahun', String(tahun))
  if (bulan) params.set('bulan', String(bulan))
  const qs = params.toString()
  return apiClient<{ success: boolean; data: unknown }>(
    `/sirs-online/generate/${rlType}${qs ? `?${qs}` : ''}`,
  )
}

export async function generateAllRL(tahun: number, bulan: number) {
  return apiClient<{ success: boolean; data: unknown }>(
    `/sirs-online/generate-all?tahun=${tahun}&bulan=${bulan}`,
  )
}

export async function getIndikator(tahun: number, bulan: number) {
  return apiClient<{ success: boolean; data: Indikator }>(
    `/sirs-online/indikator?tahun=${tahun}&bulan=${bulan}`,
  )
}

export async function sendSirsToKemenkes(rl_type: string, periode: string) {
  return apiClient<{ success: boolean; data: SirsSubmission }>(
    '/sirs-online/send',
    { method: 'POST', body: JSON.stringify({ rl_type, periode }) },
  )
}

export async function listSirsSubmissions(
  limit = 20,
  offset = 0,
  rl_type?: string,
  status?: string,
) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  if (rl_type) params.set('rl_type', rl_type)
  if (status) params.set('status', status)
  return apiClient<{
    success: boolean
    data: SirsSubmission[]
    total: number
  }>(`/sirs-online/submissions?${params}`)
}

export async function getSirsSubmissionStats() {
  return apiClient<{ success: boolean; data: SirsSubmissionStats }>(
    '/sirs-online/submissions/stats',
  )
}
