import { apiClient } from './client'

export interface McuPackageItem {
  id: string
  package_id: string
  kategori: string
  nama: string
  deskripsi: string | null
  is_required: boolean
  sort_order: number
}

export interface McuPackage {
  id: string
  nama: string
  kode: string
  deskripsi: string | null
  harga: number
  is_active: boolean
  items: McuPackageItem[]
}

export interface McuExamination {
  id: string
  registration_id: string
  package_item_id: string
  kategori: string
  nama: string
  hasil: string | null
  nilai: string | null
  satuan: string | null
  nilai_normal: string | null
  is_abnormal: boolean
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  completed_by_name: string | null
  catatan: string | null
}

export interface McuRegistration {
  id: string
  patient_id: string
  package_id: string
  doctor_id: string | null
  status: string
  tanggal: string
  tujuan: string | null
  perusahaan: string | null
  conclusion: string | null
  conclusion_notes: string | null
  concluded_at: string | null
  certificate_number: string
  patient_nama: string
  no_rekam_medis: string
  patient_nik: string
  patient_dob: string
  patient_gender: string
  patient_alamat?: string
  patient_phone?: string
  patient_blood_type?: string
  package_nama: string
  package_kode: string
  package_harga?: number
  doctor?: { id: string; nama: string; sip: string; spesialisasi: string } | null
  examinations?: McuExamination[]
  progress?: { total: number; completed: number; percentage: number }
}

export interface McuStats {
  today: number
  byStatus: Record<string, number>
  byConclusion: Record<string, number>
  topPackages: { package: string; count: number }[]
}

export async function getMcuStats(): Promise<McuStats> {
  const res = await apiClient.get('/mcu/stats')
  return res.data
}

export async function listMcuPackages(): Promise<McuPackage[]> {
  const res = await apiClient.get('/mcu/packages')
  return res.data
}

export async function createMcuPackage(data: {
  nama: string
  kode: string
  deskripsi?: string
  harga: number
  items: { kategori: string; nama: string; deskripsi?: string; is_required?: boolean }[]
}): Promise<McuPackage> {
  const res = await apiClient.post('/mcu/packages', data)
  return res.data
}

export async function updateMcuPackage(packageId: string, data: Record<string, unknown>): Promise<McuPackage> {
  const res = await apiClient.put(`/mcu/packages/${packageId}`, data)
  return res.data
}

export async function toggleMcuPackage(packageId: string) {
  const res = await apiClient.patch(`/mcu/packages/${packageId}/toggle`)
  return res.data
}

export async function deleteMcuPackage(packageId: string) {
  const res = await apiClient.delete(`/mcu/packages/${packageId}`)
  return res.data
}

export async function registerMcu(data: {
  patient_id: string
  package_id: string
  tanggal?: string
  tujuan?: string
  perusahaan?: string
  doctor_id?: string
}): Promise<McuRegistration> {
  const res = await apiClient.post('/mcu/register', data)
  return res.data
}

export async function listMcuRegistrations(params: Record<string, string>): Promise<{
  data: McuRegistration[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}> {
  const res = await apiClient.get('/mcu/registrations', { params })
  return res
}

export async function getMcuRegistration(id: string): Promise<McuRegistration> {
  const res = await apiClient.get(`/mcu/registrations/${id}`)
  return res.data
}

export async function startMcu(id: string): Promise<McuRegistration> {
  const res = await apiClient.patch(`/mcu/registrations/${id}/start`)
  return res.data
}

export async function inputExamResult(examId: string, data: {
  hasil?: string
  nilai?: string
  satuan?: string
  nilai_normal?: string
  is_abnormal?: boolean
  catatan?: string
}) {
  const res = await apiClient.patch(`/mcu/examinations/${examId}/result`, data)
  return res.data
}

export async function concludeMcu(id: string, data: {
  conclusion: string
  conclusion_notes?: string
}): Promise<McuRegistration> {
  const res = await apiClient.patch(`/mcu/registrations/${id}/conclude`, data)
  return res.data
}

export async function cancelMcu(id: string): Promise<McuRegistration> {
  const res = await apiClient.patch(`/mcu/registrations/${id}/cancel`)
  return res.data
}

export async function getMcuCertificate(id: string) {
  const res = await apiClient.get(`/mcu/registrations/${id}/certificate`)
  return res.data
}
