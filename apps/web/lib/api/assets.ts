import { apiClient } from './client'
import type { ApiResponse, PaginationMeta } from '@simrs/shared-types'

// ── Types ──

export type AssetKategori = 'medis' | 'non_medis' | 'kendaraan' | 'bangunan' | 'it' | 'furniture' | 'elektronik' | 'lainnya'
export type AssetKondisi = 'baik' | 'rusak_ringan' | 'rusak_berat' | 'dalam_perbaikan'
export type AssetStatus = 'aktif' | 'tidak_aktif' | 'dihapuskan' | 'dijual' | 'hilang'
export type MaintenanceTipe = 'perbaikan' | 'pemeliharaan_rutin' | 'kalibrasi' | 'penggantian_part' | 'lainnya'
export type MutationTipe = 'pindah' | 'penghapusan' | 'penjualan' | 'hibah'

export interface Asset {
  id: string
  kode: string
  nama: string
  kategori: AssetKategori
  merk: string | null
  model: string | null
  serial_number: string | null
  tahun_pembelian: number | null
  tanggal_pembelian: string | null
  harga_perolehan: number
  vendor: string | null
  no_faktur: string | null
  umur_ekonomis_tahun: number
  nilai_residu: number
  metode_penyusutan: string
  lokasi_gedung: string | null
  lokasi_lantai: string | null
  lokasi_ruangan: string | null
  penanggung_jawab: string | null
  kondisi: AssetKondisi
  status: AssetStatus
  garansi_mulai: string | null
  garansi_berakhir: string | null
  tanggal_kalibrasi_terakhir: string | null
  interval_kalibrasi_bulan: number | null
  catatan: string | null
  // calculated
  penyusutan_per_tahun: number
  penyusutan_per_bulan: number
  total_penyusutan: number
  nilai_buku: number
  umur_tersisa_bulan: number
  persentase_penyusutan: number
  created_at: string
}

export interface AssetDetail extends Asset {
  maintenances: AssetMaintenance[]
  mutations: AssetMutation[]
}

export interface AssetMaintenance {
  id: string
  asset_id: string
  tipe: MaintenanceTipe
  tanggal: string
  deskripsi: string
  teknisi: string | null
  vendor: string | null
  biaya: number
  hasil: string
  tanggal_selanjutnya: string | null
  catatan: string | null
  asset_kode?: string
  asset_nama?: string
  created_at: string
}

export interface AssetMutation {
  id: string
  asset_id: string
  tipe: MutationTipe
  tanggal: string
  dari_lokasi: string | null
  ke_lokasi: string | null
  alasan: string | null
  nilai_jual: number | null
  no_berita_acara: string | null
  disetujui_oleh: string | null
  catatan: string | null
  asset_kode?: string
  asset_nama?: string
  created_at: string
}

export interface AssetStats {
  total_aset: number
  total_nilai_perolehan: number
  total_nilai_buku: number
  total_penyusutan: number
  total_biaya_pemeliharaan: number
  by_kategori: Record<string, { count: number; nilai: number }>
  by_status: Record<string, number>
  by_kondisi: Record<string, number>
  by_lokasi: Record<string, number>
  alerts: {
    perlu_kalibrasi: { id: string; kode: string; nama: string; jadwal_selanjutnya: string }[]
    garansi_akan_habis: { id: string; kode: string; nama: string; garansi_berakhir: string }[]
  }
}

export interface DepreciationReport {
  tahun: number
  data: (Asset & { harga_perolehan: number })[]
  summary: {
    total_aset: number
    total_harga_perolehan: number
    total_nilai_buku: number
    total_penyusutan_tahun_ini: number
    total_akumulasi_penyusutan: number
  }
}

// ── API Functions ──

export async function listAssets(params?: {
  search?: string; kategori?: string; status?: string
  kondisi?: string; lokasi_ruangan?: string; page?: number; limit?: number
}) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.kategori) query.set('kategori', params.kategori)
  if (params?.status) query.set('status', params.status)
  if (params?.kondisi) query.set('kondisi', params.kondisi)
  if (params?.lokasi_ruangan) query.set('lokasi_ruangan', params.lokasi_ruangan)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  return apiClient.get<ApiResponse<Asset[]> & { meta: PaginationMeta }>(`/assets?${query}`)
}

export async function getAsset(id: string) {
  return apiClient.get<ApiResponse<AssetDetail>>(`/assets/${id}`)
}

export async function createAsset(data: Partial<Asset>) {
  return apiClient.post<ApiResponse<Asset>>('/assets', data)
}

export async function updateAsset(id: string, data: Partial<Asset>) {
  return apiClient.put<ApiResponse<Asset>>(`/assets/${id}`, data)
}

export async function deleteAsset(id: string) {
  return apiClient.delete<ApiResponse<void>>(`/assets/${id}`)
}

export async function getAssetStats() {
  return apiClient.get<ApiResponse<AssetStats>>('/assets/stats')
}

export async function getDepreciationReport(tahun?: number) {
  const query = tahun ? `?tahun=${tahun}` : ''
  return apiClient.get<ApiResponse<DepreciationReport>>(`/assets/depreciation${query}`)
}

export async function getAssetLocations() {
  return apiClient.get<ApiResponse<string[]>>('/assets/locations')
}

export async function generateAssetKode(kategori: string) {
  return apiClient.get<ApiResponse<{ kode: string }>>(`/assets/generate-kode?kategori=${kategori}`)
}

export async function addMaintenance(data: {
  asset_id: string; tipe?: string; tanggal?: string; deskripsi: string
  teknisi?: string; vendor?: string; biaya?: number; hasil?: string
  tanggal_selanjutnya?: string; catatan?: string
}) {
  return apiClient.post<ApiResponse<AssetMaintenance>>('/assets/maintenances', data)
}

export async function listMaintenances(params?: {
  asset_id?: string; tipe?: string; page?: number; limit?: number
}) {
  const query = new URLSearchParams()
  if (params?.asset_id) query.set('asset_id', params.asset_id)
  if (params?.tipe) query.set('tipe', params.tipe)
  if (params?.page) query.set('page', String(params.page))
  return apiClient.get<ApiResponse<AssetMaintenance[]> & { meta: PaginationMeta }>(`/assets/maintenances/list?${query}`)
}

export async function deleteMaintenance(id: string) {
  return apiClient.delete<ApiResponse<void>>(`/assets/maintenances/${id}`)
}

export async function addMutation(data: {
  asset_id: string; tipe?: string; tanggal?: string
  dari_lokasi?: string; ke_lokasi?: string; alasan?: string
  nilai_jual?: number; no_berita_acara?: string; disetujui_oleh?: string; catatan?: string
}) {
  return apiClient.post<ApiResponse<AssetMutation>>('/assets/mutations', data)
}

export async function listMutations(params?: {
  asset_id?: string; tipe?: string; page?: number; limit?: number
}) {
  const query = new URLSearchParams()
  if (params?.asset_id) query.set('asset_id', params.asset_id)
  if (params?.tipe) query.set('tipe', params.tipe)
  if (params?.page) query.set('page', String(params.page))
  return apiClient.get<ApiResponse<AssetMutation[]> & { meta: PaginationMeta }>(`/assets/mutations/list?${query}`)
}
