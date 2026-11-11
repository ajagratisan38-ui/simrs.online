import { apiClient } from './client'
import type { ApiResponse, PaginationMeta } from '@simrs/shared-types'

// --- Types ---

export interface VitalSignsInput {
  tekanan_darah_sistolik?: number | null
  tekanan_darah_diastolik?: number | null
  nadi?: number | null
  suhu?: number | null
  respirasi?: number | null
  spo2?: number | null
  tinggi_badan?: number | null
  berat_badan?: number | null
  bmi?: number | null
}

export interface DiagnosisInput {
  icd10_code: string
  icd10_name: string
  tipe: 'utama' | 'sekunder'
  catatan?: string
}

export interface ProcedureInput {
  kode_tindakan?: string
  nama_tindakan: string
  catatan?: string
  tarif: number
  qty: number
  total: number
}

export interface PrescriptionItemInput {
  drug_id?: string | null
  nama_obat: string
  dosis?: string
  satuan?: string
  frekuensi?: string
  durasi_hari?: number
  jumlah: number
  aturan_pakai?: string
  catatan?: string
}

export interface MedicalRecordInput {
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  vital_signs?: VitalSignsInput
  alergi?: string[]
  riwayat_penyakit?: string
  catatan_tambahan?: string
  diagnoses?: DiagnosisInput[]
  procedures?: ProcedureInput[]
  prescription?: {
    catatan_dokter?: string
    items: PrescriptionItemInput[]
  }
}

export interface MedicalRecordData {
  id: string
  visit_id: string
  patient_id: string
  doctor_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  vital_signs: VitalSignsInput
  alergi: string[]
  riwayat_penyakit: string | null
  catatan_tambahan: string | null
  status: 'draft' | 'final'
  created_at: string
  updated_at: string
  // joined
  visit_number?: string
  visit_tipe?: string
  visit_tanggal?: string
  visit_status?: string
  penjamin?: string
  keluhan_utama?: string
  patient_nama?: string
  no_rekam_medis?: string
  nik?: string
  tanggal_lahir?: string
  jenis_kelamin?: string
  room_nama?: string
  room_kode?: string
  doctor_nama?: string
  doctor_spesialisasi?: string
  diagnoses: DiagnosisData[]
  procedures: ProcedureData[]
  prescriptions: PrescriptionData[]
}

export interface DiagnosisData extends DiagnosisInput {
  id: string
  medical_record_id: string
  created_at: string
}

export interface ProcedureData extends ProcedureInput {
  id: string
  medical_record_id: string
  created_at: string
}

export interface PrescriptionData {
  id: string
  medical_record_id: string
  visit_id: string
  status: string
  catatan_dokter: string | null
  items: PrescriptionItemData[]
}

export interface PrescriptionItemData extends PrescriptionItemInput {
  id: string
  prescription_id: string
  created_at: string
}

export interface ICD10Result {
  id: string
  code: string
  name_en: string
  name_id: string
  category: string | null
}

export interface TemplateData {
  id: string
  name: string
  category: string
  content: Record<string, unknown>
  doctor_id: string | null
  is_active: boolean
}

// --- API functions ---

export async function createMedicalRecord(
  visitId: string,
  data: MedicalRecordInput & { doctor_id?: string },
): Promise<ApiResponse<MedicalRecordData>> {
  return apiClient<ApiResponse<MedicalRecordData>>(`/medical-records/${visitId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateMedicalRecord(
  id: string,
  data: MedicalRecordInput,
): Promise<ApiResponse<MedicalRecordData>> {
  return apiClient<ApiResponse<MedicalRecordData>>(`/medical-records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getMedicalRecordByVisit(
  visitId: string,
): Promise<ApiResponse<MedicalRecordData | null>> {
  return apiClient<ApiResponse<MedicalRecordData | null>>(
    `/medical-records/${visitId}`,
  )
}

export async function finalizeMedicalRecord(
  id: string,
): Promise<ApiResponse<MedicalRecordData>> {
  return apiClient<ApiResponse<MedicalRecordData>>(
    `/medical-records/${id}/finalize`,
    { method: 'PUT' },
  )
}

export async function getPatientMedicalHistory(
  patientId: string,
  page = 1,
  limit = 20,
): Promise<ApiResponse<MedicalRecordData[]> & { meta: PaginationMeta }> {
  return apiClient(`/patients/${patientId}/medical-records?page=${page}&limit=${limit}`)
}

// --- Resume Medis ---

export interface ResumeMedisData {
  hospital: {
    nama: string
    alamat: string
    telepon: string
    email: string
    logo_url: string | null
    settings: Record<string, unknown>
  } | null
  patient: {
    id: string
    nama: string
    no_rekam_medis: string
    nik: string | null
    tanggal_lahir: string | null
    jenis_kelamin: string
    alamat: string | null
    no_telepon: string | null
    golongan_darah: string | null
  }
  visit: {
    id: string
    visit_number: string
    tipe: string
    tanggal: string
    status: string
    penjamin: string
    keluhan_utama: string | null
    no_sep: string | null
    room_nama: string
    room_kode: string
    queue: {
      nomor_antrian: number
      called_at: string | null
      served_at: string | null
      finished_at: string | null
    } | null
  }
  doctor: {
    nama: string
    spesialisasi: string | null
    no_sip: string | null
  } | null
  medicalRecord: {
    id: string
    status: string
    subjective: string | null
    objective: string | null
    assessment: string | null
    plan: string | null
    vital_signs: VitalSignsInput
    alergi: string[]
    riwayat_penyakit: string | null
    catatan_tambahan: string | null
    created_at: string
    updated_at: string
  }
  diagnoses: DiagnosisData[]
  procedures: ProcedureData[]
  prescriptions: PrescriptionData[]
}

export async function getResumeMedis(
  visitId: string,
): Promise<ApiResponse<ResumeMedisData>> {
  return apiClient<ApiResponse<ResumeMedisData>>(
    `/medical-records/${visitId}/resume`,
  )
}

export async function searchICD10(
  q: string,
  limit = 20,
): Promise<ApiResponse<ICD10Result[]>> {
  return apiClient<ApiResponse<ICD10Result[]>>(
    `/icd10/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  )
}

// --- ICD-9-CM ---

export interface ICD9CMResult {
  id: string
  code: string
  name_en: string
  name_id: string
  category: string | null
}

export async function searchICD9CM(
  q: string,
  category?: string,
  limit = 20,
): Promise<ApiResponse<ICD9CMResult[]>> {
  let url = `/icd9cm/search?q=${encodeURIComponent(q)}&limit=${limit}`
  if (category) url += `&category=${encodeURIComponent(category)}`
  return apiClient<ApiResponse<ICD9CMResult[]>>(url)
}

export async function getICD9CMCategories(): Promise<ApiResponse<string[]>> {
  return apiClient<ApiResponse<string[]>>('/icd9cm/categories')
}

export async function listTemplates(
  category?: string,
): Promise<ApiResponse<TemplateData[]>> {
  const qs = category ? `?category=${category}` : ''
  return apiClient<ApiResponse<TemplateData[]>>(`/medical-templates${qs}`)
}

export async function createTemplate(
  data: { name: string; category: string; content: Record<string, unknown> },
): Promise<ApiResponse<TemplateData>> {
  return apiClient<ApiResponse<TemplateData>>('/medical-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
