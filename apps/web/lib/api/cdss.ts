import { apiClient } from './client'

// ── Types ──

export interface CdssAlert {
  id?: string
  alert_type: 'high_alert' | 'interaction' | 'lasa' | 'max_dose' | 'duplicate' | 'allergy'
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  drug_ids: string[]
  drug_names: string[]
  interaction_id?: string
}

export interface CdssAlertRecord extends CdssAlert {
  id: string
  visit_id: string | null
  patient_id: string | null
  prescription_id: string | null
  is_overridden: boolean
  overridden_by: string | null
  override_reason: string | null
  overridden_at: string | null
  created_at: string
}

export interface DrugInteraction {
  id: string
  drug_a_name: string
  drug_b_name: string
  severity: string
  effect: string
  mechanism: string | null
  recommendation: string
  evidence_level: string
  source: string
  is_active: boolean
  created_at: string
}

export interface LasaPair {
  drug_a: { id: string; nama: string; nama_generik: string | null }
  drug_b: { id: string; nama: string; nama_generik: string | null }
  similarity: number
}

export interface InteractionStats {
  total: number
  by_severity: Record<string, number>
}

export interface AlertStats {
  total: number
  overridden: number
  override_rate: number
  by_type: Record<string, number>
  by_severity: Record<string, number>
  recent: CdssAlertRecord[]
}

export interface HighAlertDrug {
  id: string
  nama: string
  nama_generik: string | null
  kode: string
  is_high_alert: boolean
  is_lasa: boolean
  is_norum: boolean
  high_alert_category: string | null
  special_instructions: string | null
  max_dose_per_day: number | null
  max_dose_unit: string | null
  lasa_pairs: string | null
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

// ── API Functions ──

export async function checkPrescription(drugIds: string[], visitId?: string, patientId?: string) {
  return apiClient<ApiResponse<CdssAlert[]>>('/cdss/check-prescription', {
    method: 'POST',
    body: JSON.stringify({ drugIds, visitId, patientId }),
  })
}

export async function checkDrug(drugId: string) {
  return apiClient<ApiResponse<CdssAlert[]>>(`/cdss/check-drug/${drugId}`)
}

export async function checkInteraction(drugAId: string, drugBId: string) {
  return apiClient<ApiResponse<DrugInteraction | null>>(`/cdss/check-interaction/${drugAId}/${drugBId}`)
}

export async function getHighAlertDrugs() {
  return apiClient<ApiResponse<HighAlertDrug[]>>('/cdss/high-alert')
}

export async function setHighAlert(drugId: string, data: {
  is_high_alert: boolean
  high_alert_category?: string | null
  special_instructions?: string | null
}) {
  return apiClient<ApiResponse<HighAlertDrug>>(`/cdss/high-alert/${drugId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getLasaDrugs() {
  return apiClient<ApiResponse<HighAlertDrug[]>>('/cdss/lasa')
}

export async function setLasa(drugId: string, data: {
  is_lasa: boolean
  is_norum?: boolean
  lasa_pairs?: string[]
}) {
  return apiClient<ApiResponse<HighAlertDrug>>(`/cdss/lasa/${drugId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function detectLasaPairs() {
  return apiClient<ApiResponse<LasaPair[]>>('/cdss/lasa/detect')
}

export async function searchInteractions(q?: string, severity?: string) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (severity) params.set('severity', severity)
  return apiClient<ApiResponse<DrugInteraction[]>>(`/cdss/interactions?${params}`)
}

export async function addInteraction(data: {
  drug_a_name: string
  drug_b_name: string
  severity: string
  effect: string
  mechanism?: string
  recommendation: string
  evidence_level?: string
  source?: string
}) {
  return apiClient<ApiResponse<DrugInteraction>>('/cdss/interactions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateInteraction(id: string, data: Record<string, unknown>) {
  return apiClient<ApiResponse<DrugInteraction>>(`/cdss/interactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteInteraction(id: string) {
  return apiClient<ApiResponse<{ message: string }>>(`/cdss/interactions/${id}`, {
    method: 'DELETE',
  })
}

export async function getInteractionStats() {
  return apiClient<ApiResponse<InteractionStats>>('/cdss/interactions/stats')
}

export async function overrideAlert(alertId: string, reason: string) {
  return apiClient<ApiResponse<CdssAlertRecord>>(`/cdss/alerts/${alertId}/override`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function getAlertsByVisit(visitId: string) {
  return apiClient<ApiResponse<CdssAlertRecord[]>>(`/cdss/alerts/visit/${visitId}`)
}

export async function getAlertStats(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return apiClient<ApiResponse<AlertStats>>(`/cdss/alerts/stats?${params}`)
}
