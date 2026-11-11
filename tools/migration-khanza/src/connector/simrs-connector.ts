import knex, { Knex } from 'knex'
import { logger } from '../logger'

export class SimrsConnector {
  private db: Knex | null = null

  async connect(connectionString: string): Promise<void> {
    this.db = knex({
      client: 'pg',
      connection: connectionString,
      pool: { min: 1, max: 10 },
      searchPath: ['public'],
    })

    logger.info('SIMRS PostgreSQL connection initialized')
  }

  async testConnection(): Promise<boolean> {
    if (!this.db) throw new Error('SIMRS connector not initialized. Call connect() first.')

    try {
      await this.db.raw('SELECT 1 + 1 AS result')
      logger.info('SIMRS PostgreSQL connection test: OK')
      return true
    } catch (err) {
      logger.error('SIMRS PostgreSQL connection test: FAILED', { error: String(err) })
      return false
    }
  }

  async createTenantSchema(slug: string): Promise<void> {
    this.ensureConnected()

    const schemaName = slug.startsWith('tenant_') ? slug : `tenant_${slug}`

    const exists = await this.db!.raw(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?`,
      [schemaName],
    )

    if (exists.rows.length > 0) {
      logger.info(`Tenant schema "${schemaName}" already exists`)
      return
    }

    await this.db!.raw('SELECT create_tenant_schema(?)', [
      slug.replace(/^tenant_/, ''),
    ])

    logger.info(`Tenant schema "${schemaName}" created successfully`)
  }

  async dropTenantSchema(slug: string): Promise<void> {
    this.ensureConnected()
    await this.db!.raw('SELECT drop_tenant_schema(?)', [
      slug.replace(/^tenant_/, ''),
    ])
    logger.info(`Tenant schema "${slug}" dropped`)
  }

  async getRowCount(schema: string, table: string): Promise<number> {
    this.ensureConnected()
    const result = await this.db!.raw(
      `SELECT COUNT(*) as cnt FROM "${schema}"."${table}"`,
    )
    return Number(result.rows[0].cnt)
  }

  async sampleRows(
    schema: string,
    table: string,
    limit: number,
  ): Promise<Record<string, unknown>[]> {
    this.ensureConnected()
    const result = await this.db!.raw(
      `SELECT * FROM "${schema}"."${table}" ORDER BY RANDOM() LIMIT ?`,
      [limit],
    )
    return result.rows
  }

  async truncateTable(schema: string, table: string): Promise<void> {
    this.ensureConnected()
    await this.db!.raw(`TRUNCATE TABLE "${schema}"."${table}" CASCADE`)
    logger.info(`Truncated ${schema}.${table}`)
  }

  async destroy(): Promise<void> {
    if (this.db) {
      await this.db.destroy()
      this.db = null
      logger.info('SIMRS PostgreSQL connection closed')
    }
  }

  getKnex(): Knex {
    this.ensureConnected()
    return this.db!
  }

  private ensureConnected(): void {
    if (!this.db) {
      throw new Error('SIMRS connector not initialized. Call connect() first.')
    }
  }
}
