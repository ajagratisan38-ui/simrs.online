import { KhanzaConnector } from '../connector/khanza-connector'
import { SimrsConnector } from '../connector/simrs-connector'
import { getMappings } from '../mapper/field-mapper'
import { logger } from '../logger'
import chalk from 'chalk'
import ora from 'ora'
import { createObjectCsvWriter } from 'csv-writer'
import path from 'path'

export interface RowCountComparison {
  sourceTable: string
  targetTable: string
  sourceCount: number
  targetCount: number
  diff: number
  match: boolean
}

export interface SampleCheckResult {
  table: string
  sampleSize: number
  found: number
  missingFields: string[]
  notes: string[]
}

export interface VerificationReport {
  rowCounts: RowCountComparison[]
  sampleChecks: SampleCheckResult[]
  overallStatus: 'pass' | 'warning' | 'fail'
  summary: string
}

export class Verifier {
  constructor(
    private khanza: KhanzaConnector,
    private simrs: SimrsConnector,
  ) {}

  async compareRowCounts(tenantSchema: string): Promise<RowCountComparison[]> {
    const mappings = getMappings()
    const results: RowCountComparison[] = []
    const seen = new Set<string>()

    for (const m of mappings) {
      if (m.isBundled) {
        for (const t of ['users', 'doctors']) {
          const key = `${m.sourceTable}→${t}`
          if (seen.has(key)) continue
          seen.add(key)

          const spinner = ora(`Comparing ${m.sourceTable} → ${t}`).start()

          try {
            const sourceCount = await this.khanza.getRowCount(m.sourceTable)
            const targetCount = await this.simrs.getRowCount(tenantSchema, t)

            const comp: RowCountComparison = {
              sourceTable: m.sourceTable,
              targetTable: t,
              sourceCount,
              targetCount,
              diff: sourceCount - targetCount,
              match: sourceCount === targetCount,
            }
            results.push(comp)

            const icon = comp.match ? chalk.green('✓') : chalk.yellow('~')
            spinner.succeed(
              `${icon} ${m.sourceTable} → ${t}: ${sourceCount} → ${targetCount} (diff: ${comp.diff})`,
            )
          } catch (err) {
            spinner.warn(`Skip ${m.sourceTable} → ${t}: ${String(err)}`)
          }
        }
        continue
      }

      const key = `${m.sourceTable}→${m.targetTable}`
      if (seen.has(key)) continue
      seen.add(key)

      const spinner = ora(`Comparing ${m.sourceTable} → ${m.targetTable}`).start()

      try {
        const sourceCount = await this.khanza.getRowCount(m.sourceTable)
        const targetCount = await this.simrs.getRowCount(tenantSchema, m.targetTable)

        const comp: RowCountComparison = {
          sourceTable: m.sourceTable,
          targetTable: m.targetTable,
          sourceCount,
          targetCount,
          diff: sourceCount - targetCount,
          match: sourceCount === targetCount,
        }
        results.push(comp)

        const icon = comp.match ? chalk.green('✓') : chalk.yellow('~')
        spinner.succeed(
          `${icon} ${m.sourceTable} → ${m.targetTable}: ${sourceCount} → ${targetCount} (diff: ${comp.diff})`,
        )
      } catch (err) {
        spinner.warn(`Skip ${m.sourceTable}: ${String(err)}`)
      }
    }

    return results
  }

  async sampleCheck(
    tenantSchema: string,
    sampleSize = 100,
  ): Promise<SampleCheckResult[]> {
    const results: SampleCheckResult[] = []

    const spinner = ora('Sample checking patients...').start()
    try {
      const samples = await this.simrs.sampleRows(tenantSchema, 'patients', sampleSize)

      const checks: SampleCheckResult = {
        table: 'patients',
        sampleSize: samples.length,
        found: 0,
        missingFields: [],
        notes: [],
      }

      const requiredFields = [
        'id',
        'no_rekam_medis',
        'nik',
        'nama',
        'tanggal_lahir',
        'jenis_kelamin',
        'alamat',
      ]

      for (const row of samples) {
        const missing = requiredFields.filter(
          (f) =>
            row[f] === null ||
            row[f] === undefined ||
            row[f] === '',
        )
        if (missing.length > 0) {
          checks.missingFields.push(...missing)
        } else {
          checks.found++
        }

        const nik = String(row.nik ?? '')
        if (nik.startsWith('TEMP-')) {
          checks.notes.push(`Temporary NIK: ${nik}`)
        }
      }

      checks.missingFields = [...new Set(checks.missingFields)]
      checks.notes = checks.notes.slice(0, 10)

      results.push(checks)
      spinner.succeed(
        `patients: ${checks.found}/${checks.sampleSize} complete, ` +
          `${checks.missingFields.length} field issues`,
      )
    } catch (err) {
      spinner.warn(`patients sample check failed: ${String(err)}`)
    }

    const spinner2 = ora('Sample checking visits...').start()
    try {
      const samples = await this.simrs.sampleRows(tenantSchema, 'visits', sampleSize)

      const checks: SampleCheckResult = {
        table: 'visits',
        sampleSize: samples.length,
        found: 0,
        missingFields: [],
        notes: [],
      }

      const requiredFields = ['id', 'patient_id', 'visit_number', 'tipe', 'status', 'tanggal']

      for (const row of samples) {
        const missing = requiredFields.filter(
          (f) => row[f] === null || row[f] === undefined,
        )
        if (missing.length > 0) {
          checks.missingFields.push(...missing)
        } else {
          checks.found++
        }
      }

      checks.missingFields = [...new Set(checks.missingFields)]
      results.push(checks)
      spinner2.succeed(
        `visits: ${checks.found}/${checks.sampleSize} complete, ` +
          `${checks.missingFields.length} field issues`,
      )
    } catch (err) {
      spinner2.warn(`visits sample check failed: ${String(err)}`)
    }

    return results
  }

  async generateVerificationReport(
    tenantSchema: string,
  ): Promise<VerificationReport> {
    console.log(chalk.bold.cyan('\n── Verification Report ──\n'))

    const rowCounts = await this.compareRowCounts(tenantSchema)
    const sampleChecks = await this.sampleCheck(tenantSchema)

    const totalMismatch = rowCounts.filter((r) => !r.match).length
    const totalFieldIssues = sampleChecks.reduce(
      (s, c) => s + c.missingFields.length,
      0,
    )

    let overallStatus: 'pass' | 'warning' | 'fail' = 'pass'
    if (totalMismatch > 0 || totalFieldIssues > 0) overallStatus = 'warning'

    const totalSourceRows = rowCounts.reduce((s, r) => s + r.sourceCount, 0)
    const totalTargetRows = rowCounts.reduce((s, r) => s + r.targetCount, 0)
    const summary =
      `${totalSourceRows.toLocaleString()} source rows → ${totalTargetRows.toLocaleString()} target rows. ` +
      `${totalMismatch} count mismatches, ${totalFieldIssues} field issues.`

    const report: VerificationReport = {
      rowCounts,
      sampleChecks,
      overallStatus,
      summary,
    }

    console.log(chalk.bold.white('\nSummary:'))
    const statusColor =
      overallStatus === 'pass'
        ? chalk.green
        : overallStatus === 'warning'
          ? chalk.yellow
          : chalk.red
    console.log(`  Status: ${statusColor(overallStatus.toUpperCase())}`)
    console.log(`  ${summary}\n`)

    try {
      const csvPath = path.join(process.cwd(), 'logs', 'verification-report.csv')
      const writer = createObjectCsvWriter({
        path: csvPath,
        header: [
          { id: 'sourceTable', title: 'Source Table' },
          { id: 'targetTable', title: 'Target Table' },
          { id: 'sourceCount', title: 'Source Count' },
          { id: 'targetCount', title: 'Target Count' },
          { id: 'diff', title: 'Difference' },
          { id: 'match', title: 'Match' },
        ],
      })
      await writer.writeRecords(rowCounts)
      console.log(chalk.gray(`  CSV report saved: ${csvPath}\n`))
    } catch (err) {
      logger.warn('Failed to write CSV report', { error: String(err) })
    }

    logger.info('Verification report generated', {
      overallStatus,
      summary,
    })

    return report
  }
}
