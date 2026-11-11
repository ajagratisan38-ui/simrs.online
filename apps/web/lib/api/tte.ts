import { apiClient } from './client'

// --- Types ---

export interface DigitalSignature {
  id: string
  document_type: string
  document_id: string
  signer_id: string
  signer_name: string
  signer_role: string
  signer_sip: string | null
  signature_data: string | null
  signature_hash: string
  certificate_serial: string | null
  certificate_issuer: string | null
  signature_level: 'basic' | 'advanced' | 'qualified'
  verification_url: string | null
  ip_address: string | null
  user_agent: string | null
  signed_at: string
  created_at: string
}

export interface SignDocumentInput {
  document_type: string
  document_id: string
  signature_data: string
  sip_number?: string
}

export interface VerifyResult {
  valid: boolean
  tampered: boolean
  signature_level: string
  signer_name: string
  signer_role: string
  signed_at: string
  certificate_issuer: string | null
  certificate_serial: string | null
  details: string
}

export interface SignableDocument {
  document_type: string
  document_id: string
  label: string
  summary: string
  is_signed: boolean
  signature_id: string | null
}

export interface TteConfig {
  provider: string
  bsre: { baseUrl: string; hasCredentials: boolean }
  vida: { baseUrl: string; hasCredentials: boolean }
  privy: { baseUrl: string; hasCredentials: boolean }
}

export interface TteStats {
  total: number
  byType: Array<{ type: string; label: string; count: number }>
  bySigner: Array<{ name: string; role: string; count: number }>
  byLevel: Array<{ level: string; count: number }>
}

export interface UpdateTteConfigInput {
  provider?: string
  bsre_url?: string
  bsre_username?: string
  bsre_password?: string
  vida_url?: string
  vida_api_key?: string
  vida_api_secret?: string
  privy_url?: string
  privy_merchant_key?: string
  privy_merchant_token?: string
}

// --- API Functions ---

export async function signDocument(data: SignDocumentInput) {
  return apiClient<{ success: boolean; data: DigitalSignature }>(
    '/tte/sign',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export async function verifySignature(signatureId: string) {
  return apiClient<{ success: boolean; data: VerifyResult }>(
    `/tte/verify/${signatureId}`,
  )
}

export async function getDocumentSignatures(documentType: string, documentId: string) {
  return apiClient<{ success: boolean; data: DigitalSignature[] }>(
    `/tte/document/${documentType}/${documentId}`,
  )
}

export async function getSignableDocuments(visitId: string) {
  return apiClient<{ success: boolean; data: SignableDocument[] }>(
    `/tte/signable/${visitId}`,
  )
}

export async function getSignatureById(id: string) {
  return apiClient<{ success: boolean; data: DigitalSignature }>(
    `/tte/${id}`,
  )
}

export async function getTteConfig() {
  return apiClient<{ success: boolean; data: TteConfig }>(
    '/tte/config',
  )
}

export async function updateTteConfig(config: UpdateTteConfigInput) {
  return apiClient<{ success: boolean; data: { message: string; provider: string } }>(
    '/tte/config',
    { method: 'PUT', body: JSON.stringify(config) },
  )
}

export async function getTteStats() {
  return apiClient<{ success: boolean; data: TteStats }>(
    '/tte/stats',
  )
}
