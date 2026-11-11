const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

/** Server origin without /api/v1 — use for uploaded file URLs */
export const SERVER_BASE_URL = API_BASE_URL.replace('/api/v1', '')

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('simrs-auth')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state?.accessToken || null
  } catch {
    return null
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('simrs-auth')
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.state?.refreshToken || null
  } catch {
    return null
  }
}

function getTenantSlug(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('simrs-tenant-slug') || 'rs-demo'
}

function updateTokens(accessToken: string) {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem('simrs-auth')
    if (!stored) return
    const parsed = JSON.parse(stored)
    parsed.state.accessToken = accessToken
    localStorage.setItem('simrs-auth', JSON.stringify(parsed))
  } catch {
    // noop
  }
}

function clearAuth() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('simrs-auth')
  window.location.href = '/login'
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const newToken = data?.data?.accessToken
    if (newToken) {
      updateTokens(newToken)
      return newToken
    }
    return null
  } catch {
    return null
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': getTenantSlug(),
    ...(customHeaders as Record<string, string>),
  }

  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  let response = await fetch(url, { ...rest, headers })

  // Auto-refresh jika 401
  if (response.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshAccessToken()
    }

    const newToken = await refreshPromise
    isRefreshing = false
    refreshPromise = null

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      response = await fetch(url, { ...rest, headers })
    } else {
      clearAuth()
      throw new Error('Session expired')
    }
  }

  // Redirect to maintenance page on 503
  if (response.status === 503) {
    const body = await response.json().catch(() => null)
    if (body?.error?.code === 'MAINTENANCE') {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/sa')) {
        window.location.href = '/maintenance'
      }
      throw new Error('Platform sedang dalam mode maintenance')
    }
  }

  const data = await response.json()

  if (!response.ok) {
    const errorMessage = data?.error?.message || 'Terjadi kesalahan'
    throw new Error(errorMessage)
  }

  return data as T
}

// Convenience methods matching apiClient.get/post/put/patch/delete pattern
apiClient.get = async function <T = unknown>(endpoint: string, options?: FetchOptions): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'GET' })
}

apiClient.post = async function <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

apiClient.put = async function <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

apiClient.patch = async function <T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> {
  return apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  })
}

apiClient.delete = async function <T = unknown>(endpoint: string, options?: FetchOptions): Promise<T> {
  return apiClient<T>(endpoint, { ...options, method: 'DELETE' })
}
