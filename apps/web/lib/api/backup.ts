import { apiClient } from './client'

// --- Types ---

export interface BackupLog {
  id: string
  tenant_schema: string | null
  type: 'auto_daily' | 'auto_weekly' | 'manual' | 'pre_migration'
  status: 'running' | 'success' | 'failed'
  filename: string | null
  filepath: string | null
  size_bytes: number | null
  storage: 'local' | 's3' | 'gcs'
  storage_url: string | null
  error_message: string | null
  duration_ms: number | null
  pg_version: string | null
  table_count: number | null
  triggered_by: string | null
  started_at: string
  completed_at: string | null
}

export interface BackupSchedule {
  id: string
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  day_of_week: number | null
  day_of_month: number | null
  retention_days: number
  is_active: boolean
  storage: 'local' | 's3' | 'gcs'
  storage_config: Record<string, unknown> | null
  last_run_at: string | null
  next_run_at: string | null
}

export interface BackupStats {
  totalBackups: number
  successfulBackups: number
  failedBackups: number
  totalSizeBytes: number
  lastSuccessful: BackupLog | null
  lastFailed: BackupLog | null
  scheduleActive: boolean
}

export interface RestoreValidation {
  valid: boolean
  filename: string
  sizeBytes: number
  createdAt: string
  message: string
}

export interface UpdateScheduleInput {
  frequency?: 'daily' | 'weekly' | 'monthly'
  time?: string
  day_of_week?: number | null
  day_of_month?: number | null
  retention_days?: number
  is_active?: boolean
  storage?: 'local' | 's3' | 'gcs'
  storage_config?: Record<string, unknown>
}

// --- API Functions ---

export async function getBackupStats() {
  return apiClient<{ success: boolean; data: BackupStats }>('/backup/stats')
}

export async function listBackups(page = 1, limit = 20, status?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status && status !== 'all') params.set('status', status)
  return apiClient<{
    success: boolean
    data: BackupLog[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }>(`/backup/list?${params}`)
}

export async function createBackup(type: 'manual' | 'pre_migration' = 'manual') {
  return apiClient<{ success: boolean; data: BackupLog }>(
    '/backup/create',
    { method: 'POST', body: JSON.stringify({ type }) },
  )
}

export async function deleteBackup(id: string) {
  return apiClient<{ success: boolean; message: string }>(
    `/backup/${id}`,
    { method: 'DELETE' },
  )
}

export async function getBackupSchedule() {
  return apiClient<{ success: boolean; data: BackupSchedule }>('/backup/schedule')
}

export async function updateBackupSchedule(input: UpdateScheduleInput) {
  return apiClient<{ success: boolean; data: BackupSchedule }>(
    '/backup/schedule',
    { method: 'PUT', body: JSON.stringify(input) },
  )
}

export async function validateRestore(id: string) {
  return apiClient<{ success: boolean; data: RestoreValidation }>(
    `/backup/${id}/validate`,
  )
}

export async function getRestoreCommand(id: string) {
  return apiClient<{ success: boolean; data: { command: string } }>(
    `/backup/${id}/restore-command`,
  )
}

export function getBackupDownloadUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
  return `${base}/backup/${id}/download`
}

export async function downloadBackupFile(id: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
  const url = `${base}/backup/${id}/download`

  let token: string | null = null
  let tenantSlug = 'rs-demo'
  try {
    const stored = localStorage.getItem('simrs-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      token = parsed?.state?.accessToken || null
    }
    tenantSlug = localStorage.getItem('simrs-tenant-slug') || 'rs-demo'
  } catch { /* noop */ }

  const headers: Record<string, string> = { 'X-Tenant-Slug': tenantSlug }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error('Download backup gagal')

  const blob = await response.blob()
  const cd = response.headers.get('Content-Disposition') || ''
  const match = cd.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] || `backup-${id}.sql.gz`

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}
