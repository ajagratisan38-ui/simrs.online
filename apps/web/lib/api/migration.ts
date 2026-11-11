import { apiClient } from './client'

export interface KhanzaConnectionConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

export interface ConnectionTestResult {
  connected: boolean
  version?: string
  database?: string
  tableCount?: number
  error?: string
}

export interface TableAnalysis {
  table: string
  rowCount: number
  exists: boolean
}

export interface AnalyzeResult {
  tables: TableAnalysis[]
  summary: {
    totalTables: number
    tablesFound: number
    tablesMissing: number
    totalRows: number
  }
}

export interface TableMigrationProgress {
  sourceTable: string
  targetTable: string
  sourceCount: number
  inserted: number
  skipped: number
  errors: number
  status: 'pending' | 'running' | 'done' | 'error'
  warnings: string[]
}

export interface MigrationProgress {
  id: string
  status: 'idle' | 'analyzing' | 'running' | 'dry-run' | 'verifying' | 'done' | 'error'
  currentTable: string
  currentProgress: number
  tables: TableMigrationProgress[]
  startedAt: string | null
  completedAt: string | null
  error: string | null
  isDryRun: boolean
}

export interface VerificationResult {
  table: string
  sourceCount: number
  targetCount: number
  match: boolean
}

export async function testKhanzaConnection(
  config: KhanzaConnectionConfig,
): Promise<ConnectionTestResult> {
  const res = await apiClient<{ success: boolean; data: ConnectionTestResult }>(
    '/migration/test-connection',
    { method: 'POST', body: JSON.stringify(config) },
  )
  return res.data
}

export async function analyzeKhanza(
  config: KhanzaConnectionConfig,
): Promise<AnalyzeResult> {
  const res = await apiClient<{ success: boolean; data: AnalyzeResult }>(
    '/migration/analyze',
    { method: 'POST', body: JSON.stringify(config) },
  )
  return res.data
}

export async function startMigration(
  config: KhanzaConnectionConfig,
  dryRun = false,
): Promise<{ sessionId: string; message: string }> {
  const res = await apiClient<{
    success: boolean
    data: { sessionId: string; message: string }
  }>('/migration/start', {
    method: 'POST',
    body: JSON.stringify({ ...config, dryRun }),
  })
  return res.data
}

export async function getMigrationProgress(
  sessionId: string,
): Promise<MigrationProgress> {
  const res = await apiClient<{ success: boolean; data: MigrationProgress }>(
    `/migration/progress/${sessionId}`,
  )
  return res.data
}

export async function verifyMigration(
  config: KhanzaConnectionConfig,
): Promise<VerificationResult[]> {
  const res = await apiClient<{ success: boolean; data: VerificationResult[] }>(
    '/migration/verify',
    { method: 'POST', body: JSON.stringify(config) },
  )
  return res.data
}
