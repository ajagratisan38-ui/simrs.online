import { satusehatConfig } from './satusehat.config'
import { redis } from '../../config/redis'
import { logger } from '../../shared/logger'
import { AppError } from '../../shared/errors'

// --- SATUSEHAT Error ---

export class SatusehatError extends AppError {
  constructor(
    message: string,
    code = 'SATUSEHAT_ERROR',
    statusCode = 502,
  ) {
    super(statusCode, message, code)
  }
}

// --- Token Management ---

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export async function getAccessToken(): Promise<string> {
  if (satusehatConfig.useMock) {
    return 'mock-satusehat-token'
  }

  // Check Redis cache
  try {
    const cached = await redis.get(satusehatConfig.tokenCacheKey)
    if (cached) return cached
  } catch {
    // Redis not available, proceed without cache
  }

  const { clientId, clientSecret, baseUrl, authPath } = satusehatConfig

  if (!clientId || !clientSecret) {
    throw new SatusehatError(
      'SATUSEHAT Client ID / Secret belum dikonfigurasi',
      'SATUSEHAT_CONFIG_MISSING',
      500,
    )
  }

  const url = `${baseUrl}${authPath}?grant_type=client_credentials`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    logger.error('SATUSEHAT auth failed', {
      status: response.status,
      body: text,
    })
    throw new SatusehatError(
      `SATUSEHAT authentication gagal: HTTP ${response.status}`,
      'SATUSEHAT_AUTH_FAILED',
      401,
    )
  }

  const data: TokenResponse = await response.json()

  // Cache in Redis (expire 50s before actual expiry for safety margin)
  const ttl = Math.max(data.expires_in - 50, 60)
  try {
    await redis.setex(satusehatConfig.tokenCacheKey, ttl, data.access_token)
  } catch {
    // Redis not available
  }

  logger.info('SATUSEHAT access token obtained', { expiresIn: data.expires_in })

  return data.access_token
}

// --- FHIR HTTP Client ---

interface FhirRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  resourceType: string
  id?: string
  body?: Record<string, unknown>
  params?: Record<string, string>
}

export interface FhirResponse<T = Record<string, unknown>> {
  resourceType: string
  id?: string
  data: T
  raw: unknown
}

export async function fhirRequest<T = Record<string, unknown>>(
  options: FhirRequestOptions,
): Promise<FhirResponse<T>> {
  const { method, resourceType, id, body, params } = options

  if (satusehatConfig.useMock) {
    return handleMockFhir<T>(options)
  }

  const { baseUrl, fhirPath, timeout, maxRetries, retryBaseDelay } =
    satusehatConfig

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const token = await getAccessToken()

    let url = `${baseUrl}${fhirPath}/${resourceType}`
    if (id) url += `/${id}`
    if (params) {
      const qs = new URLSearchParams(params).toString()
      if (qs) url += `?${qs}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      logger.info('SATUSEHAT FHIR request', {
        method,
        resourceType,
        id,
        attempt,
      })

      const fetchOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
          Accept: 'application/fhir+json',
        },
        signal: controller.signal,
      }

      if (body && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(body)
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      const responseText = await response.text()

      logger.debug('SATUSEHAT FHIR response', {
        status: response.status,
        bodyLength: responseText.length,
      })

      // Token expired — clear cache and retry
      if (response.status === 401 && attempt < maxRetries) {
        try {
          await redis.del(satusehatConfig.tokenCacheKey)
        } catch {
          // Redis not available
        }
        continue
      }

      if (!response.ok) {
        let errorMessage = `SATUSEHAT FHIR error: HTTP ${response.status}`
        try {
          const errBody = JSON.parse(responseText)
          if (errBody.issue?.[0]?.diagnostics) {
            errorMessage = errBody.issue[0].diagnostics
          }
        } catch {
          // not JSON
        }
        throw new SatusehatError(errorMessage, 'SATUSEHAT_FHIR_ERROR', response.status)
      }

      let parsed: Record<string, unknown>
      try {
        parsed = responseText ? JSON.parse(responseText) : {}
      } catch {
        throw new SatusehatError(
          'Response SATUSEHAT bukan JSON valid',
          'SATUSEHAT_INVALID_RESPONSE',
        )
      }

      logger.info('SATUSEHAT FHIR success', {
        method,
        resourceType,
        responseId: parsed.id,
      })

      return {
        resourceType: (parsed.resourceType as string) || resourceType,
        id: parsed.id as string | undefined,
        data: parsed as T,
        raw: parsed,
      }
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err instanceof Error ? err : new Error(String(err))

      if (err instanceof SatusehatError && err.code !== 'SATUSEHAT_FHIR_ERROR') {
        throw err
      }

      logger.warn('SATUSEHAT request failed', {
        method,
        resourceType,
        attempt,
        error: lastError.message,
      })

      if (attempt < maxRetries) {
        const delay = retryBaseDelay * Math.pow(2, attempt - 1)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  throw new SatusehatError(
    `SATUSEHAT tidak merespons setelah ${maxRetries} percobaan: ${lastError?.message || 'unknown'}`,
    'SATUSEHAT_TIMEOUT',
    504,
  )
}

// ==========================================================
// MOCK HANDLER
// ==========================================================

let mockIdCounter = 1000

function handleMockFhir<T>(options: FhirRequestOptions): FhirResponse<T> {
  const { method, resourceType, body } = options

  logger.debug('SATUSEHAT mock FHIR request', { method, resourceType })

  const mockId = `mock-${resourceType.toLowerCase()}-${mockIdCounter++}`

  if (method === 'POST' || method === 'PUT') {
    const result = {
      ...(body || {}),
      resourceType,
      id: mockId,
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString(),
      },
    }
    return {
      resourceType,
      id: mockId,
      data: result as T,
      raw: result,
    }
  }

  // GET mock
  const mockData: Record<string, unknown> = {
    resourceType,
    id: options.id || mockId,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
    },
  }

  return {
    resourceType,
    id: mockData.id as string,
    data: mockData as T,
    raw: mockData,
  }
}
