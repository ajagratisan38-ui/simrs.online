import { apiClient } from './client'

export interface UserData {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  mfa_enabled?: boolean
  last_login_at: string | null
  created_at: string
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: string
  is_active?: boolean
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: string
  is_active?: boolean
}

export interface ListResponse {
  success: boolean
  data: UserData[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface SingleResponse {
  success: boolean
  data: UserData
}

export async function listUsers(params?: {
  page?: number
  limit?: number
  search?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.search) searchParams.set('search', params.search)
  const qs = searchParams.toString()
  return apiClient<ListResponse>(`/users${qs ? `?${qs}` : ''}`)
}

export async function getUser(id: string) {
  const res = await apiClient<SingleResponse>(`/users/${id}`)
  return res.data
}

export async function createUser(input: CreateUserInput) {
  const res = await apiClient<SingleResponse>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const res = await apiClient<SingleResponse>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function resetUserPassword(id: string, newPassword: string) {
  return apiClient(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password: newPassword }),
  })
}

export async function deleteUser(id: string) {
  return apiClient(`/users/${id}`, { method: 'DELETE' })
}
