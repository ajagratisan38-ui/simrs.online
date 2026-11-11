import { apiClient } from './client'

export type RoomType = 'poli' | 'igd' | 'rawat_inap' | 'lab' | 'radiologi' | 'farmasi' | 'operasi'

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  poli: 'Poliklinik',
  igd: 'IGD',
  rawat_inap: 'Rawat Inap',
  lab: 'Laboratorium',
  radiologi: 'Radiologi',
  farmasi: 'Farmasi',
  operasi: 'Kamar Operasi',
}

export interface InpatientRoom {
  id: string
  kode: string
  nama: string
  tipe: RoomType
  lantai: number | null
  kapasitas: number
  tarif_per_hari: number
  kelas: number | null
  is_active: boolean
  total_beds: number
  occupied_beds: number
  available_beds: number
  maintenance_beds: number
}

export interface RoomStats {
  totalRooms: number
  totalAktif: number
  totalNonaktif: number
  perTipe: { tipe: string; total: number; aktif: number; nonaktif: number }[]
}

export interface ToggleRoomResult {
  id: string
  kode: string
  nama: string
  tipe: string
  is_active: boolean
}

export interface InpatientBed {
  id: string
  room_id: string
  nomor: string
  status: 'tersedia' | 'terisi' | 'maintenance'
  current_patient_id: string | null
  patient_name: string | null
  patient_no_rm: string | null
  visit_id: string | null
  admission_date: string | null
  room_nama: string
  room_kode: string
  tarif_per_hari: number
}

export interface InpatientSummary {
  totalBeds: number
  occupied: number
  available: number
  maintenance: number
  bor: number
  totalRooms: number
}

export interface RoomRaw {
  id: string
  kode: string
  nama: string
  tipe: string
  lantai: number | null
  kapasitas: number
  tarif_per_hari: number
  kelas: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface KelasValidation {
  valid: boolean
  roomKelas: number | null
  hakKelas: number
  selisih: 'sesuai' | 'naik_kelas' | 'turun_kelas'
  kelasNama: { room: string; hak: string }
  pesanWarning: string | null
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

// ==================== READ ====================

export async function getInpatientSummary(): Promise<InpatientSummary> {
  const res = await apiClient<ApiResponse<InpatientSummary>>('/inpatient/summary')
  return res.data
}

export async function getInpatientRooms(): Promise<InpatientRoom[]> {
  const res = await apiClient<ApiResponse<InpatientRoom[]>>('/inpatient/rooms')
  return res.data
}

export async function getAllRooms(filters?: {
  tipe?: RoomType
  includeInactive?: boolean
}): Promise<InpatientRoom[]> {
  const params = new URLSearchParams()
  if (filters?.tipe) params.set('tipe', filters.tipe)
  if (filters?.includeInactive) params.set('includeInactive', 'true')
  const qs = params.toString()
  const res = await apiClient<ApiResponse<InpatientRoom[]>>(
    `/inpatient/rooms/all${qs ? `?${qs}` : ''}`,
  )
  return res.data
}

export async function getRoomStats(): Promise<RoomStats> {
  const res = await apiClient<ApiResponse<RoomStats>>('/inpatient/rooms/stats')
  return res.data
}

export async function toggleRoom(roomId: string): Promise<ToggleRoomResult> {
  const res = await apiClient<ApiResponse<ToggleRoomResult>>(
    `/inpatient/rooms/${roomId}/toggle`,
    { method: 'PATCH' },
  )
  return res.data
}

export async function getRoom(roomId: string): Promise<RoomRaw> {
  const res = await apiClient<ApiResponse<RoomRaw>>(`/inpatient/rooms/${roomId}`)
  return res.data
}

export async function getBedsByRoom(roomId: string): Promise<InpatientBed[]> {
  const res = await apiClient<ApiResponse<InpatientBed[]>>(`/inpatient/rooms/${roomId}/beds`)
  return res.data
}

export async function getAllBeds(): Promise<InpatientBed[]> {
  const res = await apiClient<ApiResponse<InpatientBed[]>>('/inpatient/beds')
  return res.data
}

// ==================== BED OPERATIONS ====================

export async function assignBed(data: {
  bedId: string; patientId: string; visitId: string
}): Promise<InpatientBed[]> {
  const res = await apiClient<ApiResponse<InpatientBed[]>>('/inpatient/assign', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export type CaraKeluar = 'sembuh' | 'pulang_paksa' | 'rujuk' | 'meninggal' | 'lainnya'

export interface DischargeOptions {
  cara_keluar: CaraKeluar
  catatan?: string
  rujuk_ke?: string
  sebab_meninggal?: string
}

export interface DischargeResult {
  visitId: string
  patientName: string
  noRM: string
  status: string
  caraKeluar: CaraKeluar
  caraKeluarLabel: string
  bedReleased: boolean
  billGenerated: boolean
  patientMarkedDeceased: boolean
  rujukKe: string | null
}

export async function dischargePatient(
  visitId: string,
  options: DischargeOptions,
): Promise<DischargeResult> {
  const res = await apiClient<ApiResponse<DischargeResult>>(
    `/inpatient/discharge/${visitId}`,
    { method: 'POST', body: JSON.stringify(options) },
  )
  return res.data
}

export async function releaseBed(bedId: string): Promise<void> {
  await apiClient(`/inpatient/beds/${bedId}/release`, { method: 'PATCH' })
}

export async function transferBed(data: {
  fromBedId: string; toBedId: string
}): Promise<void> {
  await apiClient('/inpatient/transfer', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function toggleBedMaintenance(bedId: string): Promise<{ status: string }> {
  const res = await apiClient<ApiResponse<{ status: string }>>(
    `/inpatient/beds/${bedId}/maintenance`,
    { method: 'PATCH' },
  )
  return res.data
}

// ==================== ROOM CRUD ====================

export async function createRoom(data: {
  kode: string; nama: string; tipe?: RoomType; lantai?: number | null
  kapasitas: number; tarif_per_hari: number; kelas?: string
}): Promise<RoomRaw> {
  const res = await apiClient<ApiResponse<RoomRaw>>('/inpatient/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateRoom(
  roomId: string,
  data: {
    kode?: string; nama?: string; lantai?: number | null
    kapasitas?: number; tarif_per_hari?: number; is_active?: boolean
    kelas?: string
  },
): Promise<RoomRaw> {
  const res = await apiClient<ApiResponse<RoomRaw>>(`/inpatient/rooms/${roomId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function deleteRoom(roomId: string): Promise<void> {
  await apiClient(`/inpatient/rooms/${roomId}`, { method: 'DELETE' })
}

// ==================== BED CRUD ====================

export async function addBedToRoom(
  roomId: string,
  nomor: string,
): Promise<{ id: string; nomor: string }> {
  const res = await apiClient<ApiResponse<{ id: string; nomor: string }>>(
    `/inpatient/rooms/${roomId}/beds`,
    { method: 'POST', body: JSON.stringify({ nomor }) },
  )
  return res.data
}

export async function removeBed(bedId: string): Promise<void> {
  await apiClient(`/inpatient/beds/${bedId}`, { method: 'DELETE' })
}

export async function renameBed(
  bedId: string,
  nomor: string,
): Promise<{ id: string; nomor: string }> {
  const res = await apiClient<ApiResponse<{ id: string; nomor: string }>>(
    `/inpatient/beds/${bedId}/rename`,
    { method: 'PATCH', body: JSON.stringify({ nomor }) },
  )
  return res.data
}

// ==================== BPJS KELAS VALIDATION ====================

export async function validateKelas(
  roomId: string,
  hakKelas: number,
): Promise<KelasValidation> {
  const res = await apiClient<ApiResponse<KelasValidation>>(
    `/inpatient/validate-kelas?roomId=${roomId}&hakKelas=${hakKelas}`,
  )
  return res.data
}
