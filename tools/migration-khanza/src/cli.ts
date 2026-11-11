#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { KhanzaConnector } from './connector/khanza-connector'
import { SimrsConnector } from './connector/simrs-connector'
import { DataCleaner } from './cleaner/data-cleaner'
import { BatchMigrator } from './migrator/batch-migrator'
import { Verifier } from './verifier/verification'
import { logger, getLogDir } from './logger'

const program = new Command()

program
  .name('migrate-khanza')
  .description('Tools migrasi data dari SIMRS Khanza (MySQL) ke SIMRS SaaS (PostgreSQL)')
  .version('1.0.0')

// --- Shared options ---
function addKhanzaOptions(cmd: Command): Command {
  return cmd
    .requiredOption('--mysql-host <host>', 'MySQL host', 'localhost')
    .requiredOption('--mysql-port <port>', 'MySQL port', '3306')
    .requiredOption('--mysql-user <user>', 'MySQL user', 'root')
    .requiredOption('--mysql-password <password>', 'MySQL password')
    .requiredOption('--mysql-database <database>', 'MySQL database name')
}

function addSimrsOptions(cmd: Command): Command {
  return cmd
    .requiredOption('--pg-url <url>', 'PostgreSQL connection string')
    .requiredOption('--tenant <slug>', 'Tenant slug untuk schema target')
}

function addAllOptions(cmd: Command): Command {
  return addSimrsOptions(addKhanzaOptions(cmd))
}

async function createKhanza(opts: Record<string, string>): Promise<KhanzaConnector> {
  const khanza = new KhanzaConnector()
  await khanza.connect({
    host: opts.mysqlHost,
    port: parseInt(opts.mysqlPort, 10),
    user: opts.mysqlUser,
    password: opts.mysqlPassword,
    database: opts.mysqlDatabase,
  })
  return khanza
}

async function createSimrs(opts: Record<string, string>): Promise<SimrsConnector> {
  const simrs = new SimrsConnector()
  await simrs.connect(opts.pgUrl)
  return simrs
}

// ═══════════════════════════════════════════
// COMMAND: connect
// ═══════════════════════════════════════════
const connectCmd = program
  .command('connect')
  .description('Test koneksi ke database Khanza dan/atau SIMRS')
addAllOptions(connectCmd)
  .action(async (opts) => {
    console.log(chalk.bold.cyan('\n── Test Koneksi ──\n'))

    let khanza: KhanzaConnector | null = null
    let simrs: SimrsConnector | null = null

    try {
      const spinKhanza = ora('Connecting to Khanza MySQL...').start()
      khanza = await createKhanza(opts)
      const khanzaOk = await khanza.testConnection()
      khanzaOk
        ? spinKhanza.succeed('Khanza MySQL: ' + chalk.green('Connected'))
        : spinKhanza.fail('Khanza MySQL: ' + chalk.red('Failed'))

      const spinSimrs = ora('Connecting to SIMRS PostgreSQL...').start()
      simrs = await createSimrs(opts)
      const simrsOk = await simrs.testConnection()
      simrsOk
        ? spinSimrs.succeed('SIMRS PostgreSQL: ' + chalk.green('Connected'))
        : spinSimrs.fail('SIMRS PostgreSQL: ' + chalk.red('Failed'))

      if (khanzaOk && simrsOk) {
        console.log(chalk.green('\n✓ Semua koneksi berhasil!\n'))
      }
    } catch (err) {
      console.error(chalk.red(`\nError: ${String(err)}\n`))
      logger.error('Connection test failed', { error: String(err) })
    } finally {
      await khanza?.destroy()
      await simrs?.destroy()
    }
  })

// ═══════════════════════════════════════════
// COMMAND: analyze
// ═══════════════════════════════════════════
const analyzeCmd = program
  .command('analyze')
  .description('Analisis schema + data quality Khanza')
addKhanzaOptions(analyzeCmd)
  .action(async (opts) => {
    let khanza: KhanzaConnector | null = null

    try {
      console.log(chalk.bold.cyan('\n── Analisis Database Khanza ──\n'))

      khanza = await createKhanza(opts)
      const ok = await khanza.testConnection()
      if (!ok) {
        console.error(chalk.red('Koneksi gagal'))
        return
      }

      // Schema analysis
      console.log(chalk.bold.white('\n1. Schema Analysis\n'))
      const spinner = ora('Reading schema...').start()
      const schema = await khanza.getSchema()
      spinner.succeed(`${schema.length} tabel ditemukan`)

      for (const table of schema) {
        const countStr = table.rowCount.toLocaleString().padStart(10)
        const colStr = String(table.columns.length).padStart(3)
        console.log(
          `  ${chalk.white(table.table.padEnd(30))} ${chalk.gray(colStr + ' cols')}  ${chalk.cyan(countStr + ' rows')}`,
        )
      }

      // Data quality
      console.log(chalk.bold.white('\n2. Data Quality Report\n'))
      const cleaner = new DataCleaner(khanza)
      const report = await cleaner.generateReport()

      console.log(`  Total pasien: ${chalk.bold(report.totalPatients.toLocaleString())}`)
      console.log(`  Duplikat NIK: ${chalk.yellow(String(report.duplicatesByNik.length))} kelompok`)
      console.log(
        `  Duplikat Nama+DOB: ${chalk.yellow(String(report.duplicatesByNameDob.length))} kelompok`,
      )
      console.log(`  NIK kosong: ${chalk.yellow(String(report.emptyNik))}`)
      console.log(`  Tanggal invalid: ${chalk.yellow(String(report.invalidDates))}`)
      console.log(`  Telepon invalid: ${chalk.yellow(String(report.invalidPhones))}`)
      console.log(`  Nama kosong: ${chalk.yellow(String(report.emptyNames))}`)

      if (report.suggestions.length > 0) {
        console.log(chalk.bold.white('\n3. Saran\n'))
        for (const s of report.suggestions) {
          console.log(`  ${chalk.yellow('→')} ${s}`)
        }
      }

      console.log(chalk.gray(`\nLog tersimpan di: ${getLogDir()}\n`))
    } catch (err) {
      console.error(chalk.red(`\nError: ${String(err)}\n`))
      logger.error('Analysis failed', { error: String(err) })
    } finally {
      await khanza?.destroy()
    }
  })

// ═══════════════════════════════════════════
// COMMAND: dry-run
// ═══════════════════════════════════════════
const dryRunCmd = program
  .command('dry-run')
  .description('Simulasi migrasi tanpa menulis data')
addAllOptions(dryRunCmd)
  .option('--batch-size <size>', 'Ukuran batch per query', '1000')
  .action(async (opts) => {
    let khanza: KhanzaConnector | null = null
    let simrs: SimrsConnector | null = null

    try {
      khanza = await createKhanza(opts)
      simrs = await createSimrs(opts)

      const khanzaOk = await khanza.testConnection()
      const simrsOk = await simrs.testConnection()
      if (!khanzaOk || !simrsOk) {
        console.error(chalk.red('Koneksi gagal'))
        return
      }

      const migrator = new BatchMigrator(khanza, simrs)
      migrator.setDryRun(true)

      const tenantSchema = `tenant_${opts.tenant.replace(/^tenant_/, '')}`
      await migrator.migrateAll(tenantSchema)

      console.log(chalk.yellow('Dry run selesai. Tidak ada data yang ditulis.\n'))
      console.log(chalk.gray(`Log: ${getLogDir()}\n`))
    } catch (err) {
      console.error(chalk.red(`\nError: ${String(err)}\n`))
      logger.error('Dry run failed', { error: String(err) })
    } finally {
      await khanza?.destroy()
      await simrs?.destroy()
    }
  })

// ═══════════════════════════════════════════
// COMMAND: run
// ═══════════════════════════════════════════
const runCmd = program
  .command('run')
  .description('Jalankan migrasi data Khanza → SIMRS SaaS')
addAllOptions(runCmd)
  .option('--batch-size <size>', 'Ukuran batch per query', '1000')
  .option('--create-schema', 'Buat tenant schema jika belum ada', false)
  .action(async (opts) => {
    let khanza: KhanzaConnector | null = null
    let simrs: SimrsConnector | null = null

    try {
      console.log(chalk.bold.cyan('\n── Migrasi Khanza → SIMRS SaaS ──\n'))

      khanza = await createKhanza(opts)
      simrs = await createSimrs(opts)

      const khanzaOk = await khanza.testConnection()
      const simrsOk = await simrs.testConnection()
      if (!khanzaOk || !simrsOk) {
        console.error(chalk.red('Koneksi gagal. Pastikan kedua database bisa diakses.'))
        return
      }

      const tenantSlug = opts.tenant.replace(/^tenant_/, '')
      const tenantSchema = `tenant_${tenantSlug}`

      if (opts.createSchema) {
        const spinner = ora(`Creating tenant schema: ${tenantSchema}`).start()
        await simrs.createTenantSchema(tenantSlug)
        spinner.succeed(`Tenant schema: ${tenantSchema}`)
      }

      const migrator = new BatchMigrator(khanza, simrs)
      const result = await migrator.migrateAll(tenantSchema)

      logger.info('Migration completed', {
        totalDuration: result.totalDuration,
        tables: result.stats.map((s) => ({
          table: s.table,
          inserted: s.inserted,
          errors: s.errors,
        })),
      })

      console.log(chalk.gray(`Log: ${getLogDir()}\n`))
    } catch (err) {
      console.error(chalk.red(`\nError: ${String(err)}\n`))
      logger.error('Migration failed', { error: String(err) })
    } finally {
      await khanza?.destroy()
      await simrs?.destroy()
    }
  })

// ═══════════════════════════════════════════
// COMMAND: verify
// ═══════════════════════════════════════════
const verifyCmd = program
  .command('verify')
  .description('Verifikasi hasil migrasi')
addAllOptions(verifyCmd)
  .option('--sample-size <size>', 'Jumlah sample untuk pengecekan', '100')
  .action(async (opts) => {
    let khanza: KhanzaConnector | null = null
    let simrs: SimrsConnector | null = null

    try {
      khanza = await createKhanza(opts)
      simrs = await createSimrs(opts)

      const khanzaOk = await khanza.testConnection()
      const simrsOk = await simrs.testConnection()
      if (!khanzaOk || !simrsOk) {
        console.error(chalk.red('Koneksi gagal'))
        return
      }

      const tenantSchema = `tenant_${opts.tenant.replace(/^tenant_/, '')}`
      const verifier = new Verifier(khanza, simrs)
      await verifier.generateVerificationReport(tenantSchema)

      console.log(chalk.gray(`Log: ${getLogDir()}\n`))
    } catch (err) {
      console.error(chalk.red(`\nError: ${String(err)}\n`))
      logger.error('Verification failed', { error: String(err) })
    } finally {
      await khanza?.destroy()
      await simrs?.destroy()
    }
  })

// ═══════════════════════════════════════════
// COMMAND: clean
// ═══════════════════════════════════════════
const cleanCmd = program
  .command('clean')
  .description('Laporan data kotor di database Khanza')
addKhanzaOptions(cleanCmd)
  .action(async (opts) => {
    let khanza: KhanzaConnector | null = null

    try {
      console.log(chalk.bold.cyan('\n── Data Cleaning Report ──\n'))

      khanza = await createKhanza(opts)
      const ok = await khanza.testConnection()
      if (!ok) {
        console.error(chalk.red('Koneksi gagal'))
        return
      }

      const cleaner = new DataCleaner(khanza)
      const report = await cleaner.generateReport()

      console.log(chalk.bold.white('\nHasil Analisis:\n'))
      console.log(`  Total pasien: ${chalk.bold(report.totalPatients.toLocaleString())}`)
      console.log(`  Duplikat NIK: ${chalk.yellow(String(report.duplicatesByNik.length))} kelompok`)
      console.log(`  Duplikat Nama+DOB: ${chalk.yellow(String(report.duplicatesByNameDob.length))} kelompok`)
      console.log(`  NIK kosong: ${chalk.yellow(String(report.emptyNik))}`)
      console.log(`  Tanggal invalid: ${chalk.yellow(String(report.invalidDates))}`)
      console.log(`  Telepon invalid: ${chalk.yellow(String(report.invalidPhones))}`)

      if (report.duplicatesByNik.length > 0) {
        console.log(chalk.bold.white('\nTop 10 Duplikat NIK:\n'))
        for (const g of report.duplicatesByNik.slice(0, 10)) {
          console.log(`  ${chalk.yellow(g.key)} — ${g.count} records`)
          for (const r of g.records.slice(0, 3)) {
            console.log(
              `    ${chalk.gray(r.no_rkm_medis)} ${r.nm_pasien} (${r.tgl_lahir})`,
            )
          }
        }
      }

      if (report.suggestions.length > 0) {
        console.log(chalk.bold.white('\nSaran:\n'))
        for (const s of report.suggestions) {
          console.log(`  ${chalk.yellow('→')} ${s}`)
        }
      }

      console.log(chalk.gray(`\nLog: ${getLogDir()}\n`))
    } catch (err) {
      console.error(chalk.red(`\nError: ${String(err)}\n`))
      logger.error('Clean report failed', { error: String(err) })
    } finally {
      await khanza?.destroy()
    }
  })

// ═══════════════════════════════════════════
// COMMAND: rollback
// ═══════════════════════════════════════════
const rollbackCmd = program
  .command('rollback')
  .description('Hapus data yang sudah dimigrasi (truncate semua tabel tenant)')
addSimrsOptions(rollbackCmd)
  .action(async (opts) => {
    let simrs: SimrsConnector | null = null

    try {
      console.log(chalk.bold.red('\n── ROLLBACK ──'))
      console.log(chalk.red('⚠ Ini akan menghapus SEMUA data di tenant schema!\n'))

      simrs = await createSimrs(opts)
      const ok = await simrs.testConnection()
      if (!ok) {
        console.error(chalk.red('Koneksi gagal'))
        return
      }

      const tenantSchema = `tenant_${opts.tenant.replace(/^tenant_/, '')}`

      const khanza = new KhanzaConnector()
      const migrator = new BatchMigrator(khanza, simrs)
      await migrator.rollback(tenantSchema)

      console.log(chalk.gray(`Log: ${getLogDir()}\n`))
    } catch (err) {
      console.error(chalk.red(`\nError: ${String(err)}\n`))
      logger.error('Rollback failed', { error: String(err) })
    } finally {
      await simrs?.destroy()
    }
  })

program.parse()
