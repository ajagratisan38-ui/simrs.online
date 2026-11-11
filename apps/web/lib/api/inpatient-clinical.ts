import { apiClient } from './client'

// ==================== TYPES ====================

export type VitalAlertLevel = 'normal' | 'warning' | 'critical'
export type OrderStatus = 'active' | 'completed' | 'cancelled' | 'discontinued'
export type OrderPriority = 'rutin' | 'urgent' | 'stat'
export type OrderCategory =
  | 'obat' | 'infus' | 'diet' | 'tindakan' | 'lab' | 'radiologi'
  | 'konsultasi' | 'monitoring' | 'mobilisasi' | 'lainnya'
export type NursingShift = 'pagi' | 'siang' | 'malam'
export type DischargeReadiness = 'not_ready' | 'partial' | 'ready'

export interface VitalSign {
  id: string
  visit_id: string
  patient_id: string
  recorded_by: string
  recorded_by_name: string
  recorded_at: string
  tekanan_darah_sistolik: number | null
  tekanan_darah_diastolik: number | null
  nadi: number | null
  suhu: number | null
  respirasi: number | null
  spo2: number | null
  nyeri_score: number
  kesadaran: string
  gcs_eye: number | null
  gcs_verbal: number | null
  gcs_motorik: number | null
  intake_cairan: number | null
  output_cairan: number | null
  berat_badan: number | null
  catatan: string | null
  alert_level: VitalAlertLevel
  created_at: string
}

export interface VitalTrendPoint {
  recorded_at: string
  tekanan_darah_sistolik: number | null
  tekanan_darah_diastolik: number | null
  nadi: number | null
  suhu: number | null
  respirasi: number | null
  spo2: number | null
  nyeri_score: number | null
}

export interface MedicalOrder {
  id: string
  visit_id: string
  patient_id: string
  ordered_by: string
  ordered_by_name: string
  kategori: OrderCategory
  prioritas: OrderPriority
  instruksi: string
  dosis: string | null
  frekuensi: string | null
  rute: string | null
  durasi: string | null
  catatan: string | null
  status: OrderStatus
  started_at: string
  ended_at: string | null
  discontinued_reason: string | null
  created_at: string
  executions: OrderExecution[] | null
}

export interface OrderExecution {
  id: string
  executed_by: string
  executed_by_name: string
  executed_at: string
  catatan: string | null
}

export interface NursingNote {
  id: string
  visit_id: string
  patient_id: string
  nurse_id: string
  nurse_name: string
  shift: NursingShift
  tanggal: string
  situation: string | null
  background: string | null
  assessment: string | null
  recommendation: string | null
  tindakan_keperawatan: { waktu: string; tindakan: string; hasil?: string }[]
  intake_cairan: number | null
  output_cairan: number | null
  catatan_tambahan: string | null
  is_finalized: boolean
  finalized_at: string | null
  created_at: string
}

export interface DischargePlan {
  id: string
  visit_id: string
  patient_id: string
  created_by: string
  created_by_name: string
  readiness: DischargeReadiness
  klinis_stabil: boolean
  luka_kering: boolean
  intake_oral_baik: boolean
  mobilisasi_mandiri: boolean
  obat_pulang_siap: boolean
  edukasi_diberikan: boolean
  jadwal_kontrol_set: boolean
  resume_final: boolean
  billing_selesai: boolean
  surat_sakit: boolean
  obat_pulang: { nama: string; dosis: string; frekuensi: string; durasi: string }[]
  jadwal_kontrol_tanggal: string | null
  jadwal_kontrol_poli: string | null
  jadwal_kontrol_dokter: string | null
  edukasi_catatan: string | null
  catatan: string | null
}

export interface InpatientPatient {
  visit_id: string
  tanggal: string
  status: string
  tipe: string
  admission_date: string
  patient_id: string
  nama: string
  no_rekam_medis: string
  tanggal_lahir: string
  jenis_kelamin: string
  alergi: string | null
  bed_id: string | null
  bed_nomor: string | null
  room_id: string | null
  room_nama: string | null
  room_kode: string | null
  room_kelas: number | null
  tarif_per_hari: number
  doctor_id: string | null
  doctor_name: string | null
  hari_rawat: number
  last_vital_at: string | null
  last_vital_alert: VitalAlertLevel | null
}

export interface ClinicalSummary {
  visit: Record<string, unknown>
  hariRawat: number
  latestVitals: VitalSign | null
  activeOrdersCount: number
  dischargePlan: DischargePlan | null
}

interface ApiResponse<T> { success: boolean; data: T }

// ==================== VITAL SIGNS ====================

export async function recordVitals(data: {
  visit_id: string; patient_id: string
  tekanan_darah_sistolik?: number; tekanan_darah_diastolik?: number
  nadi?: number; suhu?: number; respirasi?: number; spo2?: number
  nyeri_score?: number; kesadaran?: string
  gcs_eye?: number; gcs_verbal?: number; gcs_motorik?: number
  intake_cairan?: number; output_cairan?: number
  berat_badan?: number; catatan?: string
}): Promise<VitalSign> {
  const res = await apiClient<ApiResponse<VitalSign>>('/inpatient-clinical/vitals', {
    method: 'POST', body: JSON.stringify(data),
  })
  return res.data
}

export async function getVitalsByVisit(visitId: string): Promise<VitalSign[]> {
  const res = await apiClient<ApiResponse<VitalSign[]>>(`/inpatient-clinical/vitals/${visitId}`)
  return res.data
}

export async function getVitalsTrend(visitId: string): Promise<VitalTrendPoint[]> {
  const res = await apiClient<ApiResponse<VitalTrendPoint[]>>(`/inpatient-clinical/vitals/${visitId}/trend`)
  return res.data
}

export async function getLatestVitals(visitId: string): Promise<VitalSign | null> {
  const res = await apiClient<ApiResponse<VitalSign | null>>(`/inpatient-clinical/vitals/${visitId}/latest`)
  return res.data
}

export async function deleteVital(vitalId: string): Promise<void> {
  await apiClient(`/inpatient-clinical/vitals/${vitalId}`, { method: 'DELETE' })
}

// ==================== MEDICAL ORDERS ====================

export async function createOrder(data: {
  visit_id: string; patient_id: string; kategori: OrderCategory
  prioritas?: OrderPriority; instruksi: string
  dosis?: string; frekuensi?: string; rute?: string
  durasi?: string; catatan?: string
}): Promise<MedicalOrder> {
  const res = await apiClient<ApiResponse<MedicalOrder>>('/inpatient-clinical/orders', {
    method: 'POST', body: JSON.stringify(data),
  })
  return res.data
}

export async function listOrders(visitId: string, status?: OrderStatus): Promise<MedicalOrder[]> {
  const qs = status ? `?status=${status}` : ''
  const res = await apiClient<ApiResponse<MedicalOrder[]>>(`/inpatient-clinical/orders/${visitId}${qs}`)
  return res.data
}

export async function updateOrderStatus(
  orderId: string, status: OrderStatus, reason?: string,
): Promise<MedicalOrder> {
  const res = await apiClient<ApiResponse<MedicalOrder>>(
    `/inpatient-clinical/orders/${orderId}/status`,
    { method: 'PATCH', body: JSON.stringify({ status, reason }) },
  )
  return res.data
}

export async function executeOrder(orderId: string, catatan?: string): Promise<OrderExecution> {
  const res = await apiClient<ApiResponse<OrderExecution>>(
    `/inpatient-clinical/orders/${orderId}/execute`,
    { method: 'POST', body: JSON.stringify({ catatan }) },
  )
  return res.data
}

export async function deleteOrder(orderId: string): Promise<void> {
  await apiClient(`/inpatient-clinical/orders/${orderId}`, { method: 'DELETE' })
}

// ==================== NURSING NOTES ====================

export async function createNursingNote(data: {
  visit_id: string; patient_id: string; shift: NursingShift
  tanggal?: string; situation?: string; background?: string
  assessment?: string; recommendation?: string
  tindakan_keperawatan?: { waktu: string; tindakan: string; hasil?: string }[]
  intake_cairan?: number; output_cairan?: number; catatan_tambahan?: string
}): Promise<NursingNote> {
  const res = await apiClient<ApiResponse<NursingNote>>('/inpatient-clinical/nursing-notes', {
    method: 'POST', body: JSON.stringify(data),
  })
  return res.data
}

export async function listNursingNotes(visitId: string): Promise<NursingNote[]> {
  const res = await apiClient<ApiResponse<NursingNote[]>>(`/inpatient-clinical/nursing-notes/${visitId}`)
  return res.data
}

export async function updateNursingNote(noteId: string, data: {
  situation?: string; background?: string; assessment?: string
  recommendation?: string
  tindakan_keperawatan?: { waktu: string; tindakan: string; hasil?: string }[]
  intake_cairan?: number; output_cairan?: number; catatan_tambahan?: string
}): Promise<NursingNote> {
  const res = await apiClient<ApiResponse<NursingNote>>(
    `/inpatient-clinical/nursing-notes/${noteId}`,
    { method: 'PUT', body: JSON.stringify(data) },
  )
  return res.data
}

export async function finalizeNursingNote(noteId: string): Promise<NursingNote> {
  const res = await apiClient<ApiResponse<NursingNote>>(
    `/inpatient-clinical/nursing-notes/${noteId}/finalize`,
    { method: 'PATCH' },
  )
  return res.data
}

export async function deleteNursingNote(noteId: string): Promise<void> {
  await apiClient(`/inpatient-clinical/nursing-notes/${noteId}`, { method: 'DELETE' })
}

// ==================== DISCHARGE PLANNING ====================

export async function getDischargePlan(visitId: string, patientId: string): Promise<DischargePlan> {
  const res = await apiClient<ApiResponse<DischargePlan>>(
    `/inpatient-clinical/discharge-plan/${visitId}?patientId=${patientId}`,
  )
  return res.data
}

export async function updateDischargePlan(planId: string, data: {
  klinis_stabil?: boolean; luka_kering?: boolean; intake_oral_baik?: boolean
  mobilisasi_mandiri?: boolean; obat_pulang_siap?: boolean; edukasi_diberikan?: boolean
  jadwal_kontrol_set?: boolean; resume_final?: boolean; billing_selesai?: boolean
  surat_sakit?: boolean
  obat_pulang?: { nama: string; dosis: string; frekuensi: string; durasi: string }[]
  jadwal_kontrol_tanggal?: string; jadwal_kontrol_poli?: string
  jadwal_kontrol_dokter?: string; edukasi_catatan?: string; catatan?: string
}): Promise<DischargePlan> {
  const res = await apiClient<ApiResponse<DischargePlan>>(
    `/inpatient-clinical/discharge-plan/${planId}`,
    { method: 'PUT', body: JSON.stringify(data) },
  )
  return res.data
}

// ==================== INPATIENT LIST ====================

export async function listInpatients(filters?: {
  search?: string; roomId?: string; doctorId?: string
}): Promise<InpatientPatient[]> {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.roomId) params.set('roomId', filters.roomId)
  if (filters?.doctorId) params.set('doctorId', filters.doctorId)
  const qs = params.toString()
  const res = await apiClient<ApiResponse<InpatientPatient[]>>(
    `/inpatient-clinical/patients${qs ? `?${qs}` : ''}`,
  )
  return res.data
}

// ==================== CLINICAL SUMMARY ====================

export async function getClinicalSummary(visitId: string): Promise<ClinicalSummary> {
  const res = await apiClient<ApiResponse<ClinicalSummary>>(
    `/inpatient-clinical/summary/${visitId}`,
  )
  return res.data
}
