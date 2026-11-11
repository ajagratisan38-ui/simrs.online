import { KhanzaConnector } from '../connector/khanza-connector'
import { SimrsConnector } from '../connector/simrs-connector'
import {
  IdMapping,
  RowMapper,
  TableMapping,
  getMappings,
} from '../mapper/field-mapper'
import { logger } from '../logger'
import chalk from 'chalk'
import ora from 'ora'

export interface MigrationStats {
  table: string
  sourceCount: number
  inserted: number
  skipped: number
  errors: number
  duration: number
  warnings: string[]
}

export interface MigrationResult {
  stats: MigrationStats[]
  totalDuration: number
  idMapping: IdMapping
}

export class BatchMigrator {
  private ids = new IdMapping()
  private dryRun = false

  constructor(
    private khanza: KhanzaConnector,
    private simrs: SimrsConnector,
  ) {}

  setDryRun(val: boolean): void {
    this.dryRun = val
  }

  getIdMapping(): IdMapping {
    return this.ids
  }

  async migrateTable(
    sourceTable: string,
    targetTable: string,
    mapper: RowMapper,
    tenantSchema: string,
    batchSize = 1000,
    isBundled = false,
  ): Promise<MigrationStats> {
    const start = Date.now()
    const stats: MigrationStats = {
      table: `${sourceTable} → ${targetTable}`,
      sourceCount: 0,
      inserted: 0,
      skipped: 0,
      errors: 0,
      duration: 0,
      warnings: [],
    }

    const spinner = ora({
      text: `Migrasi ${sourceTable} → ${targetTable}`,
      color: 'cyan',
    }).start()

    try {
      stats.sourceCount = await this.khanza.getRowCount(sourceTable)

      if (stats.sourceCount === 0) {
        spinner.succeed(
          `${sourceTable} → ${targetTable}: 0 rows (tabel kosong)`,
        )
        stats.duration = Date.now() - start
        return stats
      }

      const db = this.simrs.getKnex()
      let offset = 0

      while (offset < stats.sourceCount) {
        const batch = await this.khanza.readBatch(sourceTable, offset, batchSize)

        if (batch.length === 0) break

        const insertBatch: Record<string, unknown>[] = []
        const bundledInserts: Map<string, Record<string, unknown>[]> = new Map()
        const enrichBatch: Record<string, unknown>[] = []

        for (const row of batch) {
          try {
            const mapped = mapper(row, this.ids)
            if (!mapped) {
              stats.skipped++
              continue
            }

            if (mapped.warnings.length > 0) {
              stats.warnings.push(...mapped.warnings.slice(0, 3))
            }

            if (mapped.data._type === 'enrich_mr') {
              enrichBatch.push(mapped.data)
            } else if (isBundled && (mapped.data._type === 'doctor_bundle' || mapped.data._type === 'staff_bundle')) {
              if (mapped.data._type === 'doctor_bundle') {
                const userRow = mapped.data.user as Record<string, unknown>
                const doctorRow = mapped.data.doctor as Record<string, unknown>
                if (!bundledInserts.has('users')) bundledInserts.set('users', [])
                if (!bundledInserts.has('doctors')) bundledInserts.set('doctors', [])
                bundledInserts.get('users')!.push(userRow)
                bundledInserts.get('doctors')!.push(doctorRow)
              } else if (mapped.data._type === 'staff_bundle') {
                const userRow = mapped.data.user as Record<string, unknown>
                if (!bundledInserts.has('users')) bundledInserts.set('users', [])
                bundledInserts.get('users')!.push(userRow)
              }
            } else {
              insertBatch.push(mapped.data)
            }
          } catch (err) {
            stats.errors++
            const msg = `Row error in ${sourceTable}[${offset}]: ${String(err)}`
            logger.error(msg)
            stats.warnings.push(msg)
          }
        }

        if (!this.dryRun) {
          if (isBundled) {
            for (const [table, rows] of bundledInserts) {
              if (rows.length > 0) {
                await this.insertBatchSafe(db, tenantSchema, table, rows, stats)
              }
            }
          } else if (insertBatch.length > 0) {
            await this.insertBatchSafe(
              db,
              tenantSchema,
              targetTable,
              insertBatch,
              stats,
            )
          }
          if (enrichBatch.length > 0) {
            await this.updateBatchSafe(db, tenantSchema, targetTable, enrichBatch, stats)
          }
        } else {
          const totalInserted = isBundled
            ? Array.from(bundledInserts.values()).reduce((s, r) => s + r.length, 0)
            : insertBatch.length + enrichBatch.length
          stats.inserted += totalInserted
        }

        offset += batchSize

        const pct = Math.min(100, Math.round((offset / stats.sourceCount) * 100))
        spinner.text = `${sourceTable} → ${targetTable}: ${pct}% (${stats.inserted} inserted, ${stats.errors} errors)`
      }

      stats.duration = Date.now() - start

      spinner.succeed(
        `${sourceTable} → ${targetTable}: ${stats.inserted} inserted, ${stats.skipped} skipped, ${stats.errors} errors (${(stats.duration / 1000).toFixed(1)}s)`,
      )
    } catch (err) {
      stats.duration = Date.now() - start
      spinner.fail(`${sourceTable} → ${targetTable}: FATAL — ${String(err)}`)
      logger.error(`Fatal migration error: ${sourceTable}`, { error: String(err) })
    }

    return stats
  }

  async migrateAll(tenantSchema: string): Promise<MigrationResult> {
    const totalStart = Date.now()
    const mappings = getMappings()
    const stats: MigrationStats[] = []

    mappings.sort((a, b) => a.priority - b.priority)

    console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'))
    console.log(chalk.bold.cyan('║   SIMRS Khanza → SaaS Migration Tool    ║'))
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'))

    if (this.dryRun) {
      console.log(chalk.yellow('⚠  DRY RUN — tidak ada data yang ditulis\n'))
    }

    console.log(chalk.white(`Target schema: ${chalk.bold(tenantSchema)}`))
    console.log(chalk.white(`Tabel: ${mappings.length} mapping\n`))

    const groups = new Map<number, TableMapping[]>()
    for (const m of mappings) {
      if (!groups.has(m.priority)) groups.set(m.priority, [])
      groups.get(m.priority)!.push(m)
    }

    const priorities = Array.from(groups.keys()).sort((a, b) => a - b)
    const priorityLabels: Record<number, string> = {
      1: 'Master Data (Pasien, Dokter, Staff, Poli, Bangsal, Kamar)',
      2: 'Data Obat & Barang',
      3: 'Stok Obat',
      4: 'Kunjungan / Registrasi',
      5: 'Rekam Medis (Rawat Jalan + Rawat Inap)',
      55: 'Enrichment (SOAP, Vital Signs, Catatan)',
      6: 'Diagnosa',
      65: 'Resep Obat',
      66: 'Detail Pemberian Obat',
      7: 'Billing & Operasi',
      8: 'Detail Billing',
    }

    for (const p of priorities) {
      const group = groups.get(p)!
      console.log(chalk.bold.white(`\n── ${priorityLabels[p] || `Priority ${p}`} ──`))

      for (const mapping of group) {
        try {
          const result = await this.migrateTable(
            mapping.sourceTable,
            mapping.targetTable,
            mapping.mapper,
            tenantSchema,
            1000,
            mapping.isBundled,
          )
          stats.push(result)
        } catch (err) {
          logger.error(`Migration step failed: ${mapping.sourceTable}`, {
            error: String(err),
          })
          stats.push({
            table: `${mapping.sourceTable} → ${mapping.targetTable}`,
            sourceCount: 0,
            inserted: 0,
            skipped: 0,
            errors: 1,
            duration: 0,
            warnings: [String(err)],
          })
        }
      }
    }

    const totalDuration = Date.now() - totalStart

    this.printSummary(stats, totalDuration)

    return { stats, totalDuration, idMapping: this.ids }
  }

  async rollback(tenantSchema: string): Promise<void> {
    const tables = [
      'bill_items',
      'bills',
      'surgeries',
      'prescription_items',
      'prescriptions',
      'diagnoses',
      'medical_records',
      'drug_stocks',
      'dispensing_items',
      'dispensing',
      'visits',
      'beds',
      'drugs',
      'doctors',
      'rooms',
      'patients',
    ]

    console.log(chalk.yellow('\nRollback: menghapus data migrasi...\n'))

    for (const table of tables) {
      const spinner = ora(`Truncating ${tenantSchema}.${table}`).start()
      try {
        await this.simrs.truncateTable(tenantSchema, table)
        spinner.succeed(`Truncated ${tenantSchema}.${table}`)
      } catch (err) {
        spinner.warn(`Skip ${table}: ${String(err)}`)
      }
    }

    console.log(chalk.green('\nRollback selesai.\n'))
  }

  private async insertBatchSafe(
    db: ReturnType<SimrsConnector['getKnex']>,
    schema: string,
    table: string,
    rows: Record<string, unknown>[],
    stats: MigrationStats,
  ): Promise<void> {
    try {
      await db.withSchema(schema).insert(rows).into(table)
      stats.inserted += rows.length
    } catch (batchErr) {
      logger.warn(`Batch insert failed for ${schema}.${table}, falling back to row-by-row`, {
        error: String(batchErr),
      })

      for (const row of rows) {
        try {
          await db.withSchema(schema).insert(row).into(table)
          stats.inserted++
        } catch (rowErr) {
          stats.errors++
          logger.error(`Row insert failed in ${schema}.${table}`, {
            error: String(rowErr),
            row: JSON.stringify(row).slice(0, 500),
          })
        }
      }
    }
  }

  private async updateBatchSafe(
    db: ReturnType<SimrsConnector['getKnex']>,
    schema: string,
    table: string,
    rows: Record<string, unknown>[],
    stats: MigrationStats,
  ): Promise<void> {
    for (const row of rows) {
      try {
        const targetId = row._target_id as string
        if (!targetId) {
          stats.skipped++
          continue
        }
        const updateData: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(row)) {
          if (key.startsWith('_') || val === null || val === undefined) continue
          updateData[key] = val
        }
        updateData.updated_at = new Date().toISOString()

        const updated = await db.withSchema(schema)
          .table(table)
          .where('id', targetId)
          .update(updateData)

        if (updated > 0) {
          stats.inserted++
        } else {
          stats.skipped++
        }
      } catch (err) {
        stats.errors++
        logger.error(`Update failed in ${schema}.${table}`, {
          error: String(err),
          row: JSON.stringify(row).slice(0, 500),
        })
      }
    }
  }

  private printSummary(stats: MigrationStats[], totalDuration: number): void {
    console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'))
    console.log(chalk.bold.cyan('║           MIGRATION SUMMARY             ║'))
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'))

    let totalInserted = 0
    let totalErrors = 0
    let totalSkipped = 0

    for (const s of stats) {
      const statusIcon = s.errors > 0 ? chalk.red('✗') : chalk.green('✓')
      console.log(
        `  ${statusIcon} ${chalk.white(s.table.padEnd(35))} ` +
          `${chalk.green(String(s.inserted).padStart(7))} inserted  ` +
          `${chalk.yellow(String(s.skipped).padStart(5))} skipped  ` +
          `${chalk.red(String(s.errors).padStart(5))} errors  ` +
          `${chalk.gray(`${(s.duration / 1000).toFixed(1)}s`)}`,
      )
      totalInserted += s.inserted
      totalErrors += s.errors
      totalSkipped += s.skipped
    }

    console.log(chalk.gray('\n' + '─'.repeat(60)))
    console.log(
      `  Total: ${chalk.bold.green(totalInserted.toLocaleString())} inserted, ` +
        `${chalk.bold.yellow(totalSkipped.toLocaleString())} skipped, ` +
        `${chalk.bold.red(totalErrors.toLocaleString())} errors`,
    )
    console.log(
      `  Durasi: ${chalk.bold((totalDuration / 1000).toFixed(1))}s\n`,
    )

    if (totalErrors > 0) {
      console.log(
        chalk.yellow(
          '  ⚠ Ada error saat migrasi. Cek file log untuk detail.\n',
        ),
      )
    }
  }
}
