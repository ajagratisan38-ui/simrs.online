import { apiClient } from './client'
import type { ApiResponse } from '@simrs/shared-types'

export interface NursingAssessment {
  id: string
  visit_id: string
  patient_id: string
  nurse_id: string
  nurse_nama?: string
  tanggal_pengkajian: string
  keluhan_utama: string | null
  riwayat_penyakit_sekarang: string | null
  riwayat_penyakit_dahulu: string | null
  riwayat_alergi: string | null
  riwayat_pengobatan: string | null
  tekanan_darah_sistolik: number | null
  tekanan_darah_diastolik: number | null
  nadi: number | null
  suhu: number | null
  respirasi: number | null
  spo2: number | null
  tinggi_badan: number | null
  berat_badan: number | null
  imt: number | null
  nyeri_ada: boolean
  nyeri_skala: number
  nyeri_lokasi: string | null
  nyeri_karakteristik: string | null
  nyeri_durasi: string | null
  nyeri_frekuensi: string | null
  nyeri_penyebab: string | null
  jatuh_riwayat: boolean
  jatuh_diagnosis_sekunder: boolean
  jatuh_alat_bantu: string
  jatuh_terpasang_infus: boolean
  jatuh_cara_berjalan: string
  jatuh_status_mental: string
  jatuh_skor_total: number
  jatuh_kategori: string
  barthel_makan: number
  barthel_mandi: number
  barthel_perawatan_diri: number
  barthel_berpakaian: number
  barthel_bab: number
  barthel_bak: number
  barthel_toileting: number
  barthel_transfer: number
  barthel_mobilitas: number
  barthel_naik_tangga: number
  barthel_skor_total: number
  barthel_kategori: string
  nutrisi_penurunan_bb: boolean
  nutrisi_asupan_kurang: boolean
  nutrisi_kondisi_khusus: boolean
  nutrisi_skor: number
  nutrisi_kategori: string
  psikososial_status: string | null
  psikososial_hubungan_keluarga: string | null
  spiritual_agama: string | null
  spiritual_kebutuhan: string | null
  edukasi_hambatan: string | null
  edukasi_kebutuhan: string | null
  edukasi_diberikan: string | null
  discharge_plan: string | null
  data_tambahan: Record<string, unknown>
  status: string
  created_at: string
  updated_at: string
}

export interface NursingAssessmentSummary {
  id: string
  visit_id: string
  tanggal_pengkajian: string
  status: string
  jatuh_kategori: string
  barthel_kategori: string
  nutrisi_kategori: string
  nyeri_skala: number
  tekanan_darah_sistolik: number | null
  tekanan_darah_diastolik: number | null
  nadi: number | null
  suhu: number | null
  respirasi: number | null
  spo2: number | null
  nurse_nama: string
  visit_number: string
  visit_tanggal: string
}

export async function createNursingAssessment(
  data: Record<string, unknown>,
): Promise<ApiResponse<NursingAssessment>> {
  return apiClient('/nursing', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateNursingAssessment(
  id: string, data: Record<string, unknown>,
): Promise<ApiResponse<NursingAssessment>> {
  return apiClient(`/nursing/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function finalizeNursingAssessment(
  id: string,
): Promise<ApiResponse<NursingAssessment>> {
  return apiClient(`/nursing/${id}/finalize`, { method: 'POST' })
}

export async function getNursingByVisit(
  visitId: string,
): Promise<ApiResponse<NursingAssessment | null>> {
  return apiClient(`/nursing/visit/${visitId}`)
}

export async function getNursingById(
  id: string,
): Promise<ApiResponse<NursingAssessment>> {
  return apiClient(`/nursing/${id}`)
}

export async function getNursingByPatient(
  patientId: string,
): Promise<ApiResponse<NursingAssessmentSummary[]>> {
  return apiClient(`/nursing/patient/${patientId}`)
}

export async function deleteNursingAssessment(
  id: string,
): Promise<ApiResponse> {
  return apiClient(`/nursing/${id}`, { method: 'DELETE' })
}
