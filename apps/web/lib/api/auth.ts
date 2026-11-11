import { apiClient } from './client'

interface LoginSuccessResponse {
  success: boolean
  data: {
    mfaRequired: false
    accessToken: string
    refreshToken: string
    user: {
      id: string
      name: string
      email: string
      role: string
      allowedModules: string[]
    }
  }
}

interface LoginMfaResponse {
  success: boolean
  data: {
    mfaRequired: true
    userId: string
    tenantSchema: string
    tenantId: string
  }
}

export type LoginResponse = LoginSuccessResponse | LoginMfaResponse

interface RefreshResponse {
  success: boolean
  data: {
    accessToken: string
  }
}

export interface MfaSetupResponse {
  success: boolean
  data: {
    qrCodeUrl: string
    otpauthUrl: string
    message: string
  }
}

export interface MfaStatusResponse {
  success: boolean
  data: {
    mfaEnabled: boolean
  }
}

export async function loginApi(
  email: string,
  password: string,
  tenantSlug: string,
  mfaToken?: string,
): Promise<LoginResponse> {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, tenantSlug, mfaToken }),
    skipAuth: true,
  })
}

export async function refreshApi(refreshToken: string): Promise<RefreshResponse> {
  return apiClient<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
    skipAuth: true,
  })
}

export async function logoutApi(): Promise<void> {
  await apiClient('/auth/logout', { method: 'POST' })
}

export async function getMfaStatus(): Promise<MfaStatusResponse> {
  return apiClient<MfaStatusResponse>('/auth/mfa/status')
}

export async function setupMfa(): Promise<MfaSetupResponse> {
  return apiClient<MfaSetupResponse>('/auth/mfa/setup', { method: 'POST' })
}

export async function activateMfa(token: string): Promise<{ success: boolean }> {
  return apiClient('/auth/mfa/activate', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function disableMfa(token: string): Promise<{ success: boolean }> {
  return apiClient('/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}
