import { apiClient } from './client'

// --- Types ---

export interface SatusehatConfig {
  clientId: string
  clientSecretMasked: string
  baseUrl: string
  orgId: string
  environment: string
  isConfigured: boolean
}

export interface UpdateSatusehatConfigInput {
  clientId?: string
  clientSecret?: string
  baseUrl?: string
  orgId?: string
  environment?: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
  tokenObtained: boolean
  responseTimeMs: number
  environment: string
  orgId: string
}

export interface SatusehatSyncResult {
  patientId: string | null
  encounterId: string | null
  conditionIds: string[]
  observationIds: string[]
  medicationIds: string[]
  procedureIds: string[]
  allergyIds: string[]
}

export interface SatusehatSyncStatus {
  visitId: string
  visitNumber: string
  satusehatEncounterId: string | null
  syncStatus: 'not_required' | 'pending' | 'sent' | 'failed'
  lastUpdated: string
}

export interface SatusehatPendingVisit {
  id: string
  visit_number: string
  tanggal: string
  status: string
  satusehat_sync_status: string
  satusehat_encounter_id: string | null
  patient_nama: string
  patient_nik: string
}

export interface SatusehatPendingResponse {
  success: boolean
  data: SatusehatPendingVisit[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// --- Config API ---

export async function getSatusehatConfig() {
  return apiClient<{ success: boolean; data: SatusehatConfig }>(
    '/satusehat/config',
  )
}

export async function updateSatusehatConfig(input: UpdateSatusehatConfigInput) {
  return apiClient<{ success: boolean; data: SatusehatConfig }>(
    '/satusehat/config',
    { method: 'PUT', body: JSON.stringify(input) },
  )
}

export async function testSatusehatConnection() {
  return apiClient<{ success: boolean; data: TestConnectionResult }>(
    '/satusehat/config/test',
    { method: 'POST' },
  )
}

// --- Sync API ---

export async function syncVisit(visitId: string) {
  return apiClient<{ success: boolean; data: SatusehatSyncResult }>(
    `/satusehat/sync/${visitId}`,
    { method: 'POST' },
  )
}

export async function getSyncStatus(visitId: string) {
  return apiClient<{ success: boolean; data: SatusehatSyncStatus }>(
    `/satusehat/status/${visitId}`,
  )
}

export async function getPendingVisits(page = 1, limit = 20) {
  return apiClient<SatusehatPendingResponse>(
    `/satusehat/pending?page=${page}&limit=${limit}`,
  )
}

export async function retrySync(visitId: string) {
  return apiClient<{ success: boolean; data: SatusehatSyncResult }>(
    `/satusehat/retry/${visitId}`,
    { method: 'POST' },
  )
}

// --- History & Stats ---

export interface SatusehatHistoryItem {
  id: string
  visit_number: string
  tanggal: string
  status: string
  satusehat_sync_status: string
  satusehat_encounter_id: string | null
  sync_updated_at: string
  patient_nama: string
  patient_nik: string
  no_rekam_medis: string
}

export interface SatusehatHistoryResponse {
  success: boolean
  data: SatusehatHistoryItem[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface SatusehatStatsResponse {
  success: boolean
  data: {
    summary: { sent: number; failed: number; pending: number }
    daily: { date: string; sent: number; failed: number }[]
  }
}

export async function getSyncHistory(params: {
  page?: number
  limit?: number
  status?: string
  from?: string
  to?: string
}) {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.limit) sp.set('limit', String(params.limit))
  if (params.status) sp.set('status', params.status)
  if (params.from) sp.set('from', params.from)
  if (params.to) sp.set('to', params.to)
  const qs = sp.toString()
  return apiClient<SatusehatHistoryResponse>(
    `/satusehat/history${qs ? `?${qs}` : ''}`,
  )
}

export async function getSyncStats(days = 30) {
  return apiClient<SatusehatStatsResponse>(
    `/satusehat/stats?days=${days}`,
  )
}

// --- Individual FHIR Resource API ---

export async function createFhirResource(
  resourceType: string,
  body: Record<string, unknown>,
) {
  return apiClient<{ success: boolean; data: { satusehatId: string } }>(
    `/satusehat/fhir/${resourceType}`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function getFhirResource(
  resourceType: string,
  resourceId: string,
) {
  return apiClient<{ success: boolean; data: unknown }>(
    `/satusehat/fhir/${resourceType}/${resourceId}`,
  )
}
