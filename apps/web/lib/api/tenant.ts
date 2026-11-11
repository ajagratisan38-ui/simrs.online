import { apiClient } from './client'

export interface BedPerKelas {
  vvip?: number
  vip?: number
  kelas_1?: number
  kelas_2?: number
  kelas_3?: number
  icu?: number
  hcu?: number
  nicu?: number
  picu?: number
  isolasi?: number
  perinatologi?: number
}

export interface TenantSettings {
  timezone?: string
  locale?: string
  currency?: string
  kode_rs?: string
  kelas_rs?: string
  direktur?: string
  jumlah_tt?: number
  bed_per_kelas?: BedPerKelas
  fasilitas?: string[]
  fax?: string
  website?: string
  npwp?: string
  provinsi?: string
  kabupaten?: string
  kecamatan?: string
  kode_pos?: string
  bpjs_sep_limit?: number
}

export interface TenantProfile {
  id: string
  name: string
  slug: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  subscription_plan: string
  subscription_expires_at: string | null
  is_active: boolean
  settings: TenantSettings
  stats: {
    totalUsers: number
    totalPatients: number
    totalDoctors: number
    totalRooms: number
    totalBeds: number
  }
  created_at: string
  updated_at: string
}

export interface UpdateTenantInput {
  name?: string
  address?: string
  phone?: string
  email?: string
  logo_url?: string
  settings?: Partial<TenantSettings>
}

export async function getTenantProfile(): Promise<TenantProfile> {
  const res = await apiClient<{ success: boolean; data: TenantProfile }>(
    '/tenant/profile',
  )
  return res.data
}

export async function updateTenantProfile(
  data: UpdateTenantInput,
): Promise<TenantProfile> {
  const res = await apiClient<{ success: boolean; data: TenantProfile }>(
    '/tenant/profile',
    { method: 'PUT', body: JSON.stringify(data) },
  )
  return res.data
}
