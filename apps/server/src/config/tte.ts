export const tteConfig = {
  provider: process.env.TTE_PROVIDER || 'internal',
  bsre: {
    baseUrl: process.env.TTE_BSRE_URL || 'https://esign.bsre.bssn.go.id/api/v2',
    username: process.env.TTE_BSRE_USERNAME || '',
    password: process.env.TTE_BSRE_PASSWORD || '',
  },
  vida: {
    baseUrl: process.env.TTE_VIDA_URL || 'https://api.vida.id/v1',
    apiKey: process.env.TTE_VIDA_API_KEY || '',
    apiSecret: process.env.TTE_VIDA_API_SECRET || '',
  },
  privy: {
    baseUrl: process.env.TTE_PRIVY_URL || 'https://api.privy.id/v1',
    merchantKey: process.env.TTE_PRIVY_MERCHANT_KEY || '',
    merchantToken: process.env.TTE_PRIVY_MERCHANT_TOKEN || '',
  },
} as const

export type TteProvider = 'internal' | 'bsre' | 'vida' | 'privy'

export const TTE_DOCUMENT_TYPES = [
  'medical_record',
  'cppt',
  'general_consent',
  'resume_medis',
  'resep',
  'lab_result',
  'radiology_result',
  'nursing_assessment',
  'surgery_report',
] as const

export type TteDocumentType = typeof TTE_DOCUMENT_TYPES[number]

export const DOCUMENT_TYPE_LABELS: Record<TteDocumentType, string> = {
  medical_record: 'Rekam Medis',
  cppt: 'CPPT',
  general_consent: 'General Consent',
  resume_medis: 'Resume Medis',
  resep: 'Resep Obat',
  lab_result: 'Hasil Laboratorium',
  radiology_result: 'Hasil Radiologi',
  nursing_assessment: 'Pengkajian Keperawatan',
  surgery_report: 'Laporan Operasi',
}

export const DOCUMENT_TYPE_TABLES: Record<string, string> = {
  medical_record: 'medical_records',
  cppt: 'cppt_entries',
  general_consent: 'general_consents',
  resume_medis: 'medical_records',
  resep: 'prescriptions',
  lab_result: 'lab_orders',
  radiology_result: 'radiology_orders',
  nursing_assessment: 'nursing_assessments',
  surgery_report: 'surgeries',
}
