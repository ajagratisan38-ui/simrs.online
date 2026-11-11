import knex, { Knex } from 'knex'
import { logger } from '../logger'

export interface KhanzaConnectionConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

export interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  character_maximum_length: number | null
}

export interface TableSchema {
  table: string
  columns: ColumnInfo[]
  rowCount: number
}

const KHANZA_TABLES = [
  // Priority 1 — Master data
  'pasien',
  'dokter',
  'petugas',
  'poliklinik',
  'bangsal',
  'kamar',
  // Priority 2 — Barang/Obat
  'databarang',
  'penyakit',
  // Priority 3 — Stok
  'gudangbarang',
  // Priority 4 — Kunjungan
  'reg_periksa',
  'kamar_inap',
  // Priority 5 — Rekam Medis
  'rawat_jl_dr',
  'rawat_jl_pr',
  'rawat_jl_drpr',
  'rawat_inap_dr',
  'rawat_inap_pr',
  'rawat_inap_drpr',
  'pemeriksaan_ralan',
  'catatan_perawatan',
  // Priority 6 — Diagnosa & Resep
  'diagnosa_pasien',
  'resep_obat',
  'detail_pemberian_obat',
  // Priority 7 — Billing & Operasi
  'billing',
  'operasi',
  // Priority 8 — Detail
  'detail_nota_jalan',
  'detail_nota_inap',
  'nota_jalan',
  'nota_inap',
  'rujuk',
  'rujuk_masuk',
]

export class KhanzaConnector {
  private db: Knex | null = null

  async connect(config: KhanzaConnectionConfig): Promise<void> {
    this.db = knex({
      client: 'mysql2',
      connection: {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        charset: 'utf8mb4',
        connectTimeout: 10000,
      },
      pool: { min: 1, max: 5 },
    })

    logger.info('Khanza MySQL connection initialized', {
      host: config.host,
      port: config.port,
      database: config.database,
    })
  }

  async testConnection(): Promise<boolean> {
    if (!this.db) throw new Error('Khanza connector not initialized. Call connect() first.')

    try {
      await this.db.raw('SELECT 1 + 1 AS result')
      logger.info('Khanza MySQL connection test: OK')
      return true
    } catch (err) {
      logger.error('Khanza MySQL connection test: FAILED', { error: String(err) })
      return false
    }
  }

  async getSchema(): Promise<TableSchema[]> {
    this.ensureConnected()
    const schemas: TableSchema[] = []

    const existingTables = await this.getTables()

    for (const table of existingTables) {
      try {
        const columns = await this.db!.raw(
          `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
           FROM information_schema.columns
           WHERE table_schema = ? AND table_name = ?
           ORDER BY ordinal_position`,
          [this.db!.client.config.connection.database, table],
        )

        const countResult = await this.db!.raw(
          `SELECT COUNT(*) as cnt FROM \`${table}\``,
        )
        const rowCount = Number(countResult[0][0].cnt)

        schemas.push({
          table,
          columns: columns[0] as ColumnInfo[],
          rowCount,
        })
      } catch (err) {
        logger.warn(`Failed to read schema for table: ${table}`, { error: String(err) })
      }
    }

    return schemas
  }

  async getTables(): Promise<string[]> {
    this.ensureConnected()

    const result = await this.db!.raw(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ?
       ORDER BY table_name`,
      [this.db!.client.config.connection.database],
    )

    const allTables: string[] = (result[0] as Array<{ table_name: string }>).map(
      (r) => r.table_name || (r as Record<string, string>).TABLE_NAME,
    )

    return KHANZA_TABLES.filter((t) => allTables.includes(t))
  }

  async getRowCount(table: string): Promise<number> {
    this.ensureConnected()
    const result = await this.db!.raw(`SELECT COUNT(*) as cnt FROM \`${table}\``)
    return Number(result[0][0].cnt)
  }

  async readBatch(
    table: string,
    offset: number,
    limit: number,
  ): Promise<Record<string, unknown>[]> {
    this.ensureConnected()
    const result = await this.db!.raw(
      `SELECT * FROM \`${table}\` LIMIT ? OFFSET ?`,
      [limit, offset],
    )
    return result[0] as Record<string, unknown>[]
  }

  async destroy(): Promise<void> {
    if (this.db) {
      await this.db.destroy()
      this.db = null
      logger.info('Khanza MySQL connection closed')
    }
  }

  getKnex(): Knex {
    this.ensureConnected()
    return this.db!
  }

  private ensureConnected(): void {
    if (!this.db) {
      throw new Error('Khanza connector not initialized. Call connect() first.')
    }
  }
}
