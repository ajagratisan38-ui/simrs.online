import { apiClient } from './client'

export interface CreateSurgeryInput {
  visit_id: string
  patient_id: string
  doctor_id: string
  tanggal_operasi: string
  jam_mulai: string
  estimasi_durasi_menit: number
  ruang_operasi: string
  jenis_operasi: 'elektif' | 'cito' | 'emergency'
  jenis_anestesi: 'general' | 'regional' | 'lokal' | 'sedasi'
  diagnosis_pre_op: string
  tindakan_rencana: string
  icd9cm_code?: string
  catatan?: string
}

export interface UpdateSurgeryInput {
  status?: string
  jam_mulai_aktual?: string
  jam_selesai?: string
  diagnosis_post_op?: string
  tindakan_aktual?: string
  laporan_operasi?: string
  komplikasi?: string
  anestesiolog_id?: string
  perawat_instrumen?: string
  perawat_sirkuler?: string
  perdarahan_ml?: number
  jaringan_dieksisi?: string
  specimen_patologi?: boolean
  durasi_aktual_menit?: number
  klasifikasi_luka?: string
  catatan?: string
}

export interface TeamMemberInput {
  nama: string
  peran: string
  no_sip?: string
  catatan?: string
}

export interface InstrumentInput {
  nama_instrumen: string
  jumlah: number
  keterangan?: string
  status_steril?: boolean
  dikembalikan?: boolean
}

export interface AnesthesiaInput {
  jenis_anestesi: string
  teknik?: string
  obat_anestesi?: string
  dosis?: string
  asa_ps?: string
  mallampati?: string
  airway_management?: string
  posisi_pasien?: string
  monitoring?: string
  cairan_masuk?: string
  cairan_keluar?: string
  komplikasi_anestesi?: string
  catatan?: string
}

export interface NursingInput {
  fase: 'pre' | 'intra' | 'post'
  perawat_nama: string
  [key: string]: unknown
}

type R<T> = { success: boolean; data: T }
type RL<T> = { success: boolean; data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }

// ── CRUD ──
export async function listSurgeries(params?: {
  status?: string; tanggal?: string; ruang?: string; doctor_id?: string; page?: number; limit?: number
}) {
  const sp = new URLSearchParams()
  if (params?.status) sp.set('status', params.status)
  if (params?.tanggal) sp.set('tanggal', params.tanggal)
  if (params?.ruang) sp.set('ruang', params.ruang)
  if (params?.doctor_id) sp.set('doctor_id', params.doctor_id)
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return apiClient<RL<Record<string, unknown>>>(`/surgeries${qs ? `?${qs}` : ''}`)
}

export async function getSurgery(id: string) {
  return apiClient<R<Record<string, unknown>>>(`/surgeries/${id}`)
}

export async function getFullSurgeryDetail(id: string) {
  return apiClient<R<Record<string, unknown>>>(`/surgeries/${id}/full`)
}

export async function getTodaySchedule() {
  return apiClient<RL<Record<string, unknown>>>('/surgeries/today')
}

export async function createSurgery(input: CreateSurgeryInput) {
  return apiClient<R<Record<string, unknown>>>('/surgeries', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateSurgery(id: string, input: UpdateSurgeryInput) {
  return apiClient<R<Record<string, unknown>>>(`/surgeries/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

// ── Tim Bedah ──
export async function getTeamMembers(surgeryId: string) {
  return apiClient<R<Record<string, unknown>[]>>(`/surgeries/${surgeryId}/team`)
}

export async function setTeamMembers(surgeryId: string, members: TeamMemberInput[]) {
  return apiClient<R<Record<string, unknown>[]>>(`/surgeries/${surgeryId}/team`, {
    method: 'PUT', body: JSON.stringify({ members }),
  })
}

// ── Instrumen ──
export async function getInstruments(surgeryId: string) {
  return apiClient<R<Record<string, unknown>[]>>(`/surgeries/${surgeryId}/instruments`)
}

export async function setInstruments(surgeryId: string, instruments: InstrumentInput[]) {
  return apiClient<R<Record<string, unknown>[]>>(`/surgeries/${surgeryId}/instruments`, {
    method: 'PUT', body: JSON.stringify({ instruments }),
  })
}

// ── Anestesi ──
export async function getAnesthesiaRecord(surgeryId: string) {
  return apiClient<R<Record<string, unknown> | null>>(`/surgeries/${surgeryId}/anesthesia`)
}

export async function upsertAnesthesia(surgeryId: string, data: AnesthesiaInput) {
  return apiClient<R<Record<string, unknown>>>(`/surgeries/${surgeryId}/anesthesia`, {
    method: 'PUT', body: JSON.stringify(data),
  })
}

// ── Keperawatan ──
export async function getNursingRecords(surgeryId: string) {
  return apiClient<R<Record<string, unknown>[]>>(`/surgeries/${surgeryId}/nursing`)
}

export async function upsertNursingRecord(surgeryId: string, data: NursingInput) {
  return apiClient<R<Record<string, unknown>[]>>(`/surgeries/${surgeryId}/nursing`, {
    method: 'PUT', body: JSON.stringify(data),
  })
}
