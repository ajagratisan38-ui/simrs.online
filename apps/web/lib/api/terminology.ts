import { apiClient } from './client'

// ===== Types =====

export interface LoincCode {
  id: string
  code: string
  name: string
  short_name: string | null
  kategori: string | null
  class: string | null
  property: string | null
  time_aspect: string | null
  system: string | null
  scale: string | null
  method: string | null
  unit: string | null
  ucum_code: string | null
  is_active: boolean
  created_at: string
}

export interface KfaCode {
  id: string
  code: string
  name: string
  nama_dagang: string | null
  kekuatan: string | null
  bentuk_sediaan: string | null
  kategori: string | null
  golongan: string | null
  pabrik: string | null
  nie: string | null
  is_active: boolean
  created_at: string
}

export interface CategoryStat {
  kategori: string
  count: number
}

export interface LoincStats {
  total: number
  perCategory: CategoryStat[]
}

export interface KfaStats {
  total: number
  perKategori: CategoryStat[]
  perGolongan: CategoryStat[]
}

export interface LabParamMapping {
  kode: string
  nama: string
  kategori: string
  loinc_code: string | null
}

export interface DrugMapping {
  id: string
  kode: string
  nama: string
  nama_generik: string | null
  kategori: string
  kfa_code: string | null
}

export interface AutoMapResult {
  mapped: number
  total: number
  details: Array<{
    drugId: string
    drugName: string
    kfaCode: string
    kfaName: string
  }>
}

// ===== LOINC =====

export async function searchLoinc(params: {
  q: string
  kategori?: string
  limit?: number
}): Promise<LoincCode[]> {
  const sp = new URLSearchParams({ q: params.q })
  if (params.kategori) sp.set('kategori', params.kategori)
  if (params.limit) sp.set('limit', String(params.limit))
  const res = await apiClient<{ success: boolean; data: LoincCode[] }>(
    `/terminology/loinc/search?${sp}`,
  )
  return res.data
}

export async function getLoincByCode(code: string): Promise<LoincCode> {
  const res = await apiClient<{ success: boolean; data: LoincCode }>(
    `/terminology/loinc/${code}`,
  )
  return res.data
}

export async function getLoincCategories(): Promise<string[]> {
  const res = await apiClient<{ success: boolean; data: string[] }>(
    '/terminology/loinc/categories',
  )
  return res.data
}

export async function getLoincStats(): Promise<LoincStats> {
  const res = await apiClient<{ success: boolean; data: LoincStats }>(
    '/terminology/loinc/stats',
  )
  return res.data
}

// ===== KFA =====

export async function searchKfa(params: {
  q: string
  kategori?: string
  golongan?: string
  limit?: number
}): Promise<KfaCode[]> {
  const sp = new URLSearchParams({ q: params.q })
  if (params.kategori) sp.set('kategori', params.kategori)
  if (params.golongan) sp.set('golongan', params.golongan)
  if (params.limit) sp.set('limit', String(params.limit))
  const res = await apiClient<{ success: boolean; data: KfaCode[] }>(
    `/terminology/kfa/search?${sp}`,
  )
  return res.data
}

export async function getKfaByCode(code: string): Promise<KfaCode> {
  const res = await apiClient<{ success: boolean; data: KfaCode }>(
    `/terminology/kfa/${code}`,
  )
  return res.data
}

export async function getKfaCategories(): Promise<string[]> {
  const res = await apiClient<{ success: boolean; data: string[] }>(
    '/terminology/kfa/categories',
  )
  return res.data
}

export async function getKfaGolongan(): Promise<string[]> {
  const res = await apiClient<{ success: boolean; data: string[] }>(
    '/terminology/kfa/golongan',
  )
  return res.data
}

export async function getKfaStats(): Promise<KfaStats> {
  const res = await apiClient<{ success: boolean; data: KfaStats }>(
    '/terminology/kfa/stats',
  )
  return res.data
}

// ===== Mapping =====

export async function mapLabToLoinc(labKode: string, loincCode: string): Promise<void> {
  await apiClient(`/terminology/mapping/lab/${labKode}/loinc`, {
    method: 'PUT',
    body: JSON.stringify({ loinc_code: loincCode }),
  })
}

export async function mapDrugToKfa(drugId: string, kfaCode: string): Promise<void> {
  await apiClient(`/terminology/mapping/drug/${drugId}/kfa`, {
    method: 'PUT',
    body: JSON.stringify({ kfa_code: kfaCode }),
  })
}

export async function autoMapDrugs(): Promise<AutoMapResult> {
  const res = await apiClient<{ success: boolean; data: AutoMapResult }>(
    '/terminology/mapping/auto-map-drugs',
    { method: 'POST' },
  )
  return res.data
}

export async function getUnmappedLabParams(): Promise<LabParamMapping[]> {
  const res = await apiClient<{ success: boolean; data: LabParamMapping[] }>(
    '/terminology/mapping/unmapped/lab',
  )
  return res.data
}

export async function getUnmappedDrugs(): Promise<DrugMapping[]> {
  const res = await apiClient<{ success: boolean; data: DrugMapping[] }>(
    '/terminology/mapping/unmapped/drugs',
  )
  return res.data
}
