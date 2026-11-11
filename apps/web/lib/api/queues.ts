import { apiClient } from './client'
import type { ApiResponse } from '@simrs/shared-types'

export interface QueueItem {
  id: string
  visit_id: string
  room_id: string
  nomor_antrian: number
  status: string
  called_at: string | null
  served_at: string | null
  finished_at: string | null
  created_at: string
  patient_id: string
  visit_number: string
  tipe: string
  keluhan_utama: string | null
  penjamin: string
  patient_nama: string
  no_rekam_medis: string
}

export interface RoomOption {
  id: string
  kode: string
  nama: string
  tipe: string
  lantai: number | null
  tarif_per_hari: number
  kelas: number | null
}

export interface DoctorOption {
  id: string
  nama: string
  spesialisasi: string | null
  is_available: boolean
  tarif_konsultasi: number
}

export interface QueueItemWithRoom extends QueueItem {
  room_nama?: string
  room_kode?: string
}

export async function getQueue(
  roomId: string,
  date?: string,
): Promise<ApiResponse<QueueItem[]>> {
  const qs = date ? `?date=${date}` : ''
  return apiClient<ApiResponse<QueueItem[]>>(`/visits/queues/${roomId}${qs}`)
}

export async function getAllQueues(
  date?: string,
): Promise<ApiResponse<QueueItemWithRoom[]>> {
  const qs = date ? `?date=${date}` : ''
  return apiClient<ApiResponse<QueueItemWithRoom[]>>(`/visits/queues${qs}`)
}

export async function callNextQueue(
  roomId: string,
): Promise<ApiResponse<QueueItem | null>> {
  return apiClient<ApiResponse<QueueItem | null>>(
    `/visits/queues/${roomId}/call-next`,
    { method: 'POST' },
  )
}

export async function listRooms(
  tipe?: string,
): Promise<ApiResponse<RoomOption[]>> {
  const qs = tipe ? `?tipe=${tipe}` : ''
  return apiClient<ApiResponse<RoomOption[]>>(`/lookup/rooms${qs}`)
}

export async function listDoctors(
  roomId?: string,
): Promise<ApiResponse<DoctorOption[]>> {
  const qs = roomId ? `?room_id=${roomId}` : ''
  return apiClient<ApiResponse<DoctorOption[]>>(`/lookup/doctors${qs}`)
}

export async function createVisit(
  data: Record<string, unknown>,
): Promise<ApiResponse<{ visit: Record<string, unknown>; queue: Record<string, unknown> }>> {
  return apiClient<ApiResponse<{ visit: Record<string, unknown>; queue: Record<string, unknown> }>>(
    '/visits',
    { method: 'POST', body: JSON.stringify(data) },
  )
}
