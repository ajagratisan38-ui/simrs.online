import { KhanzaConnector } from '../connector/khanza-connector'
import { logger } from '../logger'

export interface DuplicateGroup {
  key: string
  count: number
  records: Array<{
    no_rkm_medis: string
    nm_pasien: string
    no_ktp: string
    tgl_lahir: string
  }>
}

export interface CleaningReport {
  totalPatients: number
  duplicatesByNik: DuplicateGroup[]
  duplicatesByNameDob: DuplicateGroup[]
  invalidDates: number
  emptyNik: number
  invalidPhones: number
  emptyNames: number
  suggestions: string[]
}

export class DataCleaner {
  constructor(private khanza: KhanzaConnector) {}

  async findDuplicatePatients(): Promise<{
    byNik: DuplicateGroup[]
    byNameDob: DuplicateGroup[]
  }> {
    const db = this.khanza.getKnex()

    logger.info('Searching for duplicate patients by NIK...')
    const nikDups = await db.raw(`
      SELECT no_ktp, COUNT(*) as cnt,
             GROUP_CONCAT(no_rkm_medis SEPARATOR '|') as rm_list,
             GROUP_CONCAT(nm_pasien SEPARATOR '|') as name_list,
             GROUP_CONCAT(tgl_lahir SEPARATOR '|') as dob_list
      FROM pasien
      WHERE no_ktp IS NOT NULL AND no_ktp != '' AND no_ktp != '-'
      GROUP BY no_ktp
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 500
    `)

    const byNik: DuplicateGroup[] = (nikDups[0] as Array<Record<string, unknown>>).map(
      (r) => {
        const rms = String(r.rm_list).split('|')
        const names = String(r.name_list).split('|')
        const dobs = String(r.dob_list).split('|')
        return {
          key: `NIK: ${r.no_ktp}`,
          count: Number(r.cnt),
          records: rms.map((rm, i) => ({
            no_rkm_medis: rm,
            nm_pasien: names[i] ?? '',
            no_ktp: String(r.no_ktp),
            tgl_lahir: dobs[i] ?? '',
          })),
        }
      },
    )

    logger.info('Searching for duplicate patients by Nama+TglLahir...')
    const nameDups = await db.raw(`
      SELECT CONCAT(nm_pasien, '|', tgl_lahir) as name_dob,
             COUNT(*) as cnt,
             GROUP_CONCAT(no_rkm_medis SEPARATOR '|') as rm_list,
             GROUP_CONCAT(no_ktp SEPARATOR '|') as nik_list
      FROM pasien
      WHERE nm_pasien IS NOT NULL AND nm_pasien != ''
      GROUP BY nm_pasien, tgl_lahir
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 500
    `)

    const byNameDob: DuplicateGroup[] = (nameDups[0] as Array<Record<string, unknown>>).map(
      (r) => {
        const parts = String(r.name_dob).split('|')
        const rms = String(r.rm_list).split('|')
        const niks = String(r.nik_list).split('|')
        return {
          key: `${parts[0]} (${parts[1]})`,
          count: Number(r.cnt),
          records: rms.map((rm, i) => ({
            no_rkm_medis: rm,
            nm_pasien: parts[0] ?? '',
            no_ktp: niks[i] ?? '',
            tgl_lahir: parts[1] ?? '',
          })),
        }
      },
    )

    logger.info(`Found ${byNik.length} NIK duplicates, ${byNameDob.length} Name+DOB duplicates`)

    return { byNik, byNameDob }
  }

  async suggestMerge(): Promise<DuplicateGroup[]> {
    const { byNik } = await this.findDuplicatePatients()
    return byNik.filter((g) => g.count === 2)
  }

  async cleanInvalidDates(): Promise<number> {
    const db = this.khanza.getKnex()
    const result = await db.raw(`
      SELECT COUNT(*) as cnt FROM pasien
      WHERE tgl_lahir IS NULL
         OR tgl_lahir = '0000-00-00'
         OR tgl_lahir > CURDATE()
         OR YEAR(tgl_lahir) < 1900
    `)
    const count = Number(result[0][0].cnt)
    logger.info(`Found ${count} patients with invalid dates`)
    return count
  }

  async cleanPhoneNumbers(): Promise<number> {
    const db = this.khanza.getKnex()
    const result = await db.raw(`
      SELECT COUNT(*) as cnt FROM pasien
      WHERE no_tlp IS NOT NULL
        AND no_tlp != ''
        AND no_tlp != '-'
        AND LENGTH(REPLACE(REPLACE(REPLACE(no_tlp, '-', ''), ' ', ''), '.', '')) < 8
    `)
    const count = Number(result[0][0].cnt)
    logger.info(`Found ${count} patients with questionable phone numbers`)
    return count
  }

  async generateReport(): Promise<CleaningReport> {
    const db = this.khanza.getKnex()

    const totalResult = await db.raw('SELECT COUNT(*) as cnt FROM pasien')
    const totalPatients = Number(totalResult[0][0].cnt)

    const { byNik, byNameDob } = await this.findDuplicatePatients()
    const invalidDates = await this.cleanInvalidDates()
    const invalidPhones = await this.cleanPhoneNumbers()

    const emptyNikResult = await db.raw(`
      SELECT COUNT(*) as cnt FROM pasien
      WHERE no_ktp IS NULL OR no_ktp = '' OR no_ktp = '-'
    `)
    const emptyNik = Number(emptyNikResult[0][0].cnt)

    const emptyNameResult = await db.raw(`
      SELECT COUNT(*) as cnt FROM pasien
      WHERE nm_pasien IS NULL OR nm_pasien = ''
    `)
    const emptyNames = Number(emptyNameResult[0][0].cnt)

    const suggestions: string[] = []
    if (byNik.length > 0) {
      suggestions.push(
        `${byNik.length} kelompok pasien duplikat berdasarkan NIK — pertimbangkan merge sebelum migrasi`,
      )
    }
    if (emptyNik > 0) {
      suggestions.push(
        `${emptyNik} pasien tanpa NIK — akan mendapat NIK sementara (TEMP-xxxxx)`,
      )
    }
    if (invalidDates > 0) {
      suggestions.push(
        `${invalidDates} pasien dengan tanggal lahir tidak valid — akan diset ke 1900-01-01`,
      )
    }
    if (emptyNames > 0) {
      suggestions.push(
        `${emptyNames} pasien tanpa nama — akan diset ke "TANPA NAMA"`,
      )
    }
    if (invalidPhones > 0) {
      suggestions.push(
        `${invalidPhones} pasien dengan nomor telepon tidak valid — akan dinormalisasi`,
      )
    }

    const report: CleaningReport = {
      totalPatients,
      duplicatesByNik: byNik,
      duplicatesByNameDob: byNameDob,
      invalidDates,
      emptyNik,
      invalidPhones,
      emptyNames,
      suggestions,
    }

    logger.info('Data cleaning report generated', {
      totalPatients,
      nikDuplicates: byNik.length,
      nameDobDuplicates: byNameDob.length,
      invalidDates,
      emptyNik,
      invalidPhones,
    })

    return report
  }
}
