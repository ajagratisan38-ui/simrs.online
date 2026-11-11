import { env } from '../../config/env'

const SANDBOX_URL = 'https://api-satusehat.kemkes.go.id'
const PRODUCTION_URL = 'https://api-satusehat.kemkes.go.id'

export const satusehatConfig = {
  clientId: env.satusehat.clientId,
  clientSecret: env.satusehat.clientSecret,
  baseUrl: env.satusehat.baseUrl || (env.isProd ? PRODUCTION_URL : SANDBOX_URL),
  orgId: env.satusehat.orgId,

  // Paths
  authPath: '/oauth2/v1/accesstoken',
  fhirPath: '/fhir-r4/v1',

  // Timeouts
  timeout: 30_000,
  maxRetries: 3,
  retryBaseDelay: 1000,

  // Redis key for cached token
  tokenCacheKey: 'satusehat:access_token',

  // Mock mode
  useMock: !env.satusehat.clientId || env.satusehat.clientId === 'mock',
} as const

// FHIR resource type paths
export const FHIR_RESOURCES = {
  Patient: '/Patient',
  Encounter: '/Encounter',
  Condition: '/Condition',
  Observation: '/Observation',
  MedicationRequest: '/MedicationRequest',
  Organization: '/Organization',
  Practitioner: '/Practitioner',
  Location: '/Location',
} as const
