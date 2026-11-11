import { apiClient } from './client'

export interface GeneralConsentData {
  id: string
  patient_id: string
  visit_id: string | null
  persetujuan_rawat: boolean
  persetujuan_informasi: boolean
  persetujuan_privasi: boolean
  persetujuan_biaya: boolean
  persetujuan_tata_tertib: boolean
  persetujuan_pelepasan_info: boolean
  penanggung_jawab_nama: string | null
  penanggung_jawab_hubungan: string | null
  penanggung_jawab_telepon: string | null
  penanggung_jawab_alamat: string | null
  signed_by: string | null
  signed_at: string | null
  catatan: string | null
  created_at: string
  updated_at: string
  // Joined patient data
  patient_nama?: string
  no_rekam_medis?: string
  patient_nik?: string
  patient_tanggal_lahir?: string
  patient_jenis_kelamin?: string
  patient_alamat?: string
  patient_telepon?: string
  // Joined visit data
  visit_number?: string
  visit_tanggal?: string
  visit_tipe?: string
}

export interface CreateGeneralConsentInput {
  patient_id: string
  visit_id?: string | null
  persetujuan_rawat: boolean
  persetujuan_informasi: boolean
  persetujuan_privasi: boolean
  persetujuan_biaya: boolean
  persetujuan_tata_tertib: boolean
  persetujuan_pelepasan_info: boolean
  penanggung_jawab_nama?: string | null
  penanggung_jawab_hubungan?: string | null
  penanggung_jawab_telepon?: string | null
  penanggung_jawab_alamat?: string | null
  signed_by?: string | null
  catatan?: string | null
}

export function createGeneralConsent(
  data: CreateGeneralConsentInput,
): Promise<{ success: boolean; data: GeneralConsentData }> {
  return apiClient('/general-consents', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getGeneralConsent(
  id: string,
): Promise<{ success: boolean; data: GeneralConsentData }> {
  return apiClient(`/general-consents/${id}`)
}

export function listPatientConsents(
  patientId: string,
): Promise<{ success: boolean; data: GeneralConsentData[] }> {
  return apiClient(`/general-consents/patient/${patientId}`)
}

export function getVisitConsent(
  visitId: string,
): Promise<{ success: boolean; data: GeneralConsentData | null }> {
  return apiClient(`/general-consents/visit/${visitId}`)
}
