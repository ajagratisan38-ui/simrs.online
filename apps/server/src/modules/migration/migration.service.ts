import mysql from 'mysql2/promise'
import { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../shared/logger'
import {
  IdMapping,
  getMappings,
} from './field-mapper'

// --- Types ---

export interface KhanzaConnectionConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

export interface TableAnalysis {
  table: string
  rowCount: number
  exists: boolean
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

export interface VerificationResult {
  table: string
  sourceCount: number
  targetCount: number
  match: boolean
}

// --- Known Khanza tables to analyze ---
const KHANZA_TABLES = [
  'pasien', 'dokter', 'petugas', 'poliklinik', 'bangsal', 'kamar',
  'databarang', 'penyakit', 'gudangbarang',
  'reg_periksa', 'kamar_inap',
  'rawat_jl_dr', 'rawat_jl_pr', 'rawat_jl_drpr',
  'rawat_inap_dr', 'rawat_inap_pr', 'rawat_inap_drpr',
  'pemeriksaan_ralan', 'catatan_perawatan',
  'diagnosa_pasien', 'resep_obat', 'detail_pemberian_obat',
  'billing', 'operasi',
  'detail_nota_jalan', 'detail_nota_inap',
  'nota_jalan', 'nota_inap', 'rujuk', 'rujuk_masuk',
]

// --- In-memory progress store (keyed by session id) ---
const progressStore = new Map<string, MigrationProgress>()

export class MigrationService {
  constructor(private db: Knex) {}

  // --- Test MySQL connection ---
  async testConnection(config: KhanzaConnectionConfig): Promise<{
    connected: boolean
    version?: string
    database?: string
    tableCount?: number
    error?: string
  }> {
    let conn: mysql.Connection | null = null
    try {
      conn = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 10000,
      })

      const [versionRows] = await conn.query('SELECT VERSION() as ver')
      const version = (versionRows as Array<{ ver: string }>)[0]?.ver || 'unknown'

      const [tableRows] = await conn.query(
        'SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ?',
        [config.database],
      )
      const tableCount = Number((tableRows as Array<{ cnt: number }>)[0]?.cnt || 0)

      return {
        connected: true,
        version,
        database: config.database,
        tableCount,
      }
    } catch (err) {
      return {
        connected: false,
        error: err instanceof Error ? err.message : String(err),
      }
    } finally {
      if (conn) await conn.end().catch(() => {})
    }
  }

  // --- Analyze Khanza tables ---
  async analyze(config: KhanzaConnectionConfig): Promise<TableAnalysis[]> {
    const conn = await this.createConnection(config)
    const results: TableAnalysis[] = []

    try {
      const [allTables] = await conn.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
        [config.database],
      )
      const existingTables = new Set(
        (allTables as Array<{ table_name: string; TABLE_NAME?: string }>).map(
          (r) => r.table_name || r.TABLE_NAME || '',
        ),
      )

      for (const table of KHANZA_TABLES) {
        if (existingTables.has(table)) {
          const [countResult] = await conn.query(
            `SELECT COUNT(*) as cnt FROM \`${table}\``,
          )
          const rowCount = Number((countResult as Array<{ cnt: number }>)[0]?.cnt || 0)
          results.push({ table, rowCount, exists: true })
        } else {
          results.push({ table, rowCount: 0, exists: false })
        }
      }
    } finally {
      await conn.end().catch(() => {})
    }

    return results
  }

  // --- Start migration (runs in background, progress tracked) ---
  async startMigration(
    config: KhanzaConnectionConfig,
    tenantSchema: string,
    dryRun: boolean,
  ): Promise<string> {
    const sessionId = uuidv4()
    const mappings = getMappings()

    const progress: MigrationProgress = {
      id: sessionId,
      status: dryRun ? 'dry-run' : 'running',
      currentTable: '',
      currentProgress: 0,
      tables: mappings.map((m) => ({
        sourceTable: m.sourceTable,
        targetTable: m.targetTable,
        sourceCount: 0,
        inserted: 0,
        skipped: 0,
        errors: 0,
        status: 'pending',
        warnings: [],
      })),
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      isDryRun: dryRun,
    }

    progressStore.set(sessionId, progress)

    this.runMigration(config, tenantSchema, dryRun, sessionId).catch((err) => {
      const p = progressStore.get(sessionId)
      if (p) {
        p.status = 'error'
        p.error = err instanceof Error ? err.message : String(err)
        p.completedAt = new Date().toISOString()
      }
      logger.error('Migration failed', { sessionId, error: String(err) })
    })

    return sessionId
  }

  // --- Get progress ---
  getProgress(sessionId: string): MigrationProgress | null {
    return progressStore.get(sessionId) || null
  }

  // --- Verify migration results ---
  async verify(
    config: KhanzaConnectionConfig,
    tenantSchema: string,
  ): Promise<VerificationResult[]> {
    const conn = await this.createConnection(config)
    const results: VerificationResult[] = []

    const tableMap: Record<string, string> = {
      pasien: 'patients',
      dokter: 'doctors',
      poliklinik: 'rooms',
      databarang: 'drugs',
      gudangbarang: 'drug_stocks',
      reg_periksa: 'visits',
      rawat_jl_dr: 'medical_records',
      diagnosa_pasien: 'diagnoses',
      billing: 'bills',
      operasi: 'surgeries',
      resep_obat: 'prescriptions',
    }

    try {
      for (const [source, target] of Object.entries(tableMap)) {
        let sourceCount = 0
        let targetCount = 0

        try {
          const [srcResult] = await conn.query(
            `SELECT COUNT(*) as cnt FROM \`${source}\``,
          )
          sourceCount = Number((srcResult as Array<{ cnt: number }>)[0]?.cnt || 0)
        } catch {
          sourceCount = -1
        }

        try {
          const pgResult = await this.db.raw(
            `SELECT COUNT(*) as cnt FROM "${tenantSchema}"."${target}"`,
          )
          targetCount = Number(pgResult.rows[0]?.cnt || 0)
        } catch {
          targetCount = -1
        }

        results.push({
          table: `${source} → ${target}`,
          sourceCount,
          targetCount,
          match: sourceCount >= 0 && targetCount >= 0 && targetCount >= sourceCount * 0.9,
        })
      }
    } finally {
      await conn.end().catch(() => {})
    }

    return results
  }

  // --- Internal: run the actual migration ---
  private async runMigration(
    config: KhanzaConnectionConfig,
    tenantSchema: string,
    dryRun: boolean,
    sessionId: string,
  ): Promise<void> {
    const conn = await this.createConnection(config)
    const progress = progressStore.get(sessionId)!
    const mappings = getMappings().sort((a, b) => a.priority - b.priority)
    const ids = new IdMapping()
    const batchSize = 500

    try {
      const [allTables] = await conn.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
        [config.database],
      )
      const existingTables = new Set(
        (allTables as Array<{ table_name: string; TABLE_NAME?: string }>).map(
          (r) => r.table_name || r.TABLE_NAME || '',
        ),
      )

      for (let mi = 0; mi < mappings.length; mi++) {
        const mapping = mappings[mi]!
        const tableProgress = progress.tables.find(
          (t) => t.sourceTable === mapping.sourceTable && t.targetTable === mapping.targetTable,
        )
        if (!tableProgress) continue

        progress.currentTable = mapping.sourceTable
        progress.currentProgress = Math.round((mi / mappings.length) * 100)

        if (!existingTables.has(mapping.sourceTable)) {
          tableProgress.status = 'done'
          tableProgress.warnings.push('Tabel tidak ditemukan di Khanza')
          continue
        }

        tableProgress.status = 'running'

        try {
          const [countResult] = await conn.query(
            `SELECT COUNT(*) as cnt FROM \`${mapping.sourceTable}\``,
          )
          tableProgress.sourceCount = Number(
            (countResult as Array<{ cnt: number }>)[0]?.cnt || 0,
          )

          if (tableProgress.sourceCount === 0) {
            tableProgress.status = 'done'
            continue
          }

          let offset = 0
          while (offset < tableProgress.sourceCount) {
            const [rows] = await conn.query(
              `SELECT * FROM \`${mapping.sourceTable}\` LIMIT ? OFFSET ?`,
              [batchSize, offset],
            )
            const batch = rows as Record<string, unknown>[]
            if (batch.length === 0) break

            const insertBatch: Record<string, unknown>[] = []
            const bundledInserts = new Map<string, Record<string, unknown>[]>()
            const enrichBatch: Record<string, unknown>[] = []

            for (const row of batch) {
              try {
                const mapped = mapping.mapper(row, ids)
                if (!mapped) {
                  tableProgress.skipped++
                  continue
                }

                if (mapped.warnings.length > 0) {
                  tableProgress.warnings.push(
                    ...mapped.warnings.slice(0, 2),
                  )
                }

                if (mapped.data._type === 'enrich_mr') {
                  enrichBatch.push(mapped.data)
                } else if (
                  mapping.isBundled &&
                  (mapped.data._type === 'doctor_bundle' || mapped.data._type === 'staff_bundle')
                ) {
                  if (mapped.data._type === 'doctor_bundle') {
                    const userRow = mapped.data.user as Record<string, unknown>
                    const doctorRow = mapped.data.doctor as Record<string, unknown>
                    if (!bundledInserts.has('users')) bundledInserts.set('users', [])
                    if (!bundledInserts.has('doctors')) bundledInserts.set('doctors', [])
                    bundledInserts.get('users')!.push(userRow)
                    bundledInserts.get('doctors')!.push(doctorRow)
                  } else {
                    const userRow = mapped.data.user as Record<string, unknown>
                    if (!bundledInserts.has('users')) bundledInserts.set('users', [])
                    bundledInserts.get('users')!.push(userRow)
                  }
                } else {
                  insertBatch.push(mapped.data)
                }
              } catch (err) {
                tableProgress.errors++
                logger.error(`Row mapping error in ${mapping.sourceTable}`, {
                  error: String(err),
                })
              }
            }

            if (!dryRun) {
              if (mapping.isBundled) {
                for (const [table, bRows] of bundledInserts) {
                  if (bRows.length > 0) {
                    await this.insertBatchSafe(tenantSchema, table, bRows, tableProgress)
                  }
                }
              } else if (insertBatch.length > 0) {
                await this.insertBatchSafe(
                  tenantSchema,
                  mapping.targetTable,
                  insertBatch,
                  tableProgress,
                )
              }
              if (enrichBatch.length > 0) {
                await this.updateBatchSafe(
                  tenantSchema,
                  mapping.targetTable,
                  enrichBatch,
                  tableProgress,
                )
              }
            } else {
              const count = mapping.isBundled
                ? Array.from(bundledInserts.values()).reduce((s, r) => s + r.length, 0)
                : insertBatch.length + enrichBatch.length
              tableProgress.inserted += count
            }

            offset += batchSize
          }

          tableProgress.status = 'done'
        } catch (err) {
          tableProgress.status = 'error'
          tableProgress.warnings.push(
            `Fatal: ${err instanceof Error ? err.message : String(err)}`,
          )
          logger.error(`Migration table error: ${mapping.sourceTable}`, {
            error: String(err),
          })
        }
      }

      progress.status = 'done'
      progress.currentProgress = 100
      progress.completedAt = new Date().toISOString()
    } catch (err) {
      progress.status = 'error'
      progress.error = err instanceof Error ? err.message : String(err)
      progress.completedAt = new Date().toISOString()
      throw err
    } finally {
      await conn.end().catch(() => {})
    }
  }

  private async insertBatchSafe(
    schema: string,
    table: string,
    rows: Record<string, unknown>[],
    progress: TableMigrationProgress,
  ): Promise<void> {
    try {
      await this.db.withSchema(schema).insert(rows).into(table)
      progress.inserted += rows.length
    } catch {
      for (const row of rows) {
        try {
          await this.db.withSchema(schema).insert(row).into(table)
          progress.inserted++
        } catch (rowErr) {
          progress.errors++
          logger.error(`Row insert failed in ${schema}.${table}`, {
            error: String(rowErr),
          })
        }
      }
    }
  }

  private async updateBatchSafe(
    schema: string,
    table: string,
    rows: Record<string, unknown>[],
    progress: TableMigrationProgress,
  ): Promise<void> {
    for (const row of rows) {
      try {
        const targetId = row._target_id as string
        if (!targetId) {
          progress.skipped++
          continue
        }
        const updateData: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(row)) {
          if (key.startsWith('_') || val === null || val === undefined) continue
          updateData[key] = val
        }
        updateData.updated_at = new Date().toISOString()

        const updated = await this.db
          .withSchema(schema)
          .table(table)
          .where('id', targetId)
          .update(updateData)

        if (updated > 0) {
          progress.inserted++
        } else {
          progress.skipped++
        }
      } catch (err) {
        progress.errors++
        logger.error(`Update failed in ${schema}.${table}`, {
          error: String(err),
        })
      }
    }
  }

  private async createConnection(config: KhanzaConnectionConfig): Promise<mysql.Connection> {
    return mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 15000,
    })
  }
}
