import { apiClient } from './client'

export interface AuditLog {
  id: string
  tenant_id: string | null
  user_id: string | null
  user_name: string | null
  user_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_description: string | null
  ip_address: string | null
  user_agent: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface AuditFilters {
  userId?: string
  action?: string
  entityType?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface AuditLogsResponse {
  success: boolean
  data: AuditLog[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export async function getAuditLogs(filters: AuditFilters): Promise<AuditLogsResponse> {
  const params = new URLSearchParams()
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.action) params.set('action', filters.action)
  if (filters.entityType) params.set('entityType', filters.entityType)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))

  const qs = params.toString()
  return apiClient<AuditLogsResponse>(`/audit-logs${qs ? `?${qs}` : ''}`)
}

export function buildExportUrl(
  filters: Pick<AuditFilters, 'from' | 'to' | 'action' | 'entityType'>,
): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.action) params.set('action', filters.action)
  if (filters.entityType) params.set('entityType', filters.entityType)
  const qs = params.toString()
  return `${base}/audit-logs/export${qs ? `?${qs}` : ''}`
}

export async function cleanupAuditLogs(): Promise<{ deleted: number; message: string }> {
  const res = await apiClient<{ success: boolean; data: { deleted: number; message: string } }>(
    '/audit-logs/cleanup',
    { method: 'POST' },
  )
  return res.data
}
