import { apiClient } from './client'

export interface IGDBoardItem {
  id: string
  visit_number: string
  patient_nama: string
  patient_nik: string
  no_rekam_medis: string
  jenis_kelamin: string
  tanggal_lahir: string
  keluhan_utama: string | null
  triage_level: string | null
  triage_time: string | null
  response_time: string | null
  igd_bed_number: string | null
  status: string
  penjamin: string
  disposition: string | null
  disposition_time: string | null
  disposition_notes: string | null
  cara_masuk: string
  created_at: string
  doctor_nama: string | null
  waiting_minutes: number | null
}

export interface IGDStats {
  totalActive: number
  byTriage: Record<string, number>
  byStatus: Record<string, number>
  byDisposition: Record<string, number>
  avgWaitMinutes: number | null
  avgResponseMinutes: number | null
  todayTotal: number
  todayDischarged: number
}

export interface QuickRegisterInput {
  patientId: string
  keluhanUtama: string
  triageLevel: string
  penjamin: string
  caraMasuk: string
  igdBedNumber?: string
  noRujukan?: string
  noSep?: string
  doctorId: string
}

export async function getIGDBoard(date?: string) {
  const qs = date ? `?date=${date}` : ''
  return apiClient<{ success: boolean; data: IGDBoardItem[] }>(`/igd/board${qs}`)
}

export async function getIGDStats() {
  return apiClient<{ success: boolean; data: IGDStats }>('/igd/stats')
}

export async function setTriage(visitId: string, triageLevel: string, igdBedNumber?: string) {
  return apiClient<{ success: boolean; data: unknown }>(
    `/igd/${visitId}/triage`,
    { method: 'PUT', body: JSON.stringify({ triageLevel, igdBedNumber }) },
  )
}

export async function setResponseTime(visitId: string) {
  return apiClient<{ success: boolean; data: unknown }>(
    `/igd/${visitId}/response`,
    { method: 'POST' },
  )
}

export async function setDisposition(
  visitId: string,
  disposition: string,
  notes?: string,
) {
  return apiClient<{ success: boolean; data: unknown }>(
    `/igd/${visitId}/disposition`,
    { method: 'PUT', body: JSON.stringify({ disposition, notes }) },
  )
}

export async function quickRegisterIGD(input: QuickRegisterInput) {
  return apiClient<{ success: boolean; data: unknown }>(
    '/igd/register',
    { method: 'POST', body: JSON.stringify(input) },
  )
}
