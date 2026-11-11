import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { ValidationError } from '../../shared/errors'

export interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: Array<{ row: number; error: string }>
}

export class ImportService {
  constructor(private db: Knex) {}

  async importPatients(
    rows: Array<Record<string, string>>,
    userId: string,
    tenantSchema: string,
  ): Promise<ImportResult> {
    const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      const rowNum = i + 2 // header + 1-indexed

      try {
        const nik = (row.nik || '').trim()
        const nama = (row.nama || '').trim()
        if (!nama) {
          result.errors.push({ row: rowNum, error: 'Nama wajib diisi' })
          result.skipped++
          continue
        }

        // Check duplicate NIK
        if (nik) {
          const existing = await this.db
            .withSchema(tenantSchema)
            .select('id')
            .from('patients')
            .where({ nik })
            .whereNull('deleted_at')
            .first()

          if (existing) {
            result.skipped++
            result.errors.push({ row: rowNum, error: `NIK ${nik} sudah terdaftar` })
            continue
          }
        }

        // Generate no_rekam_medis
        const [lastRM] = await this.db
          .withSchema(tenantSchema)
          .from('patients')
          .max('no_rekam_medis as max_rm')
        const nextNum = lastRM?.max_rm
          ? String(Number(lastRM.max_rm.replace(/\D/g, '')) + 1).padStart(6, '0')
          : '000001'

        await this.db
          .withSchema(tenantSchema)
          .insert({
            no_rekam_medis: nextNum,
            nik: nik || null,
            nama,
            tanggal_lahir: row.tanggal_lahir || null,
            jenis_kelamin: row.jenis_kelamin || null,
            alamat: row.alamat || null,
            no_telepon: row.no_telepon || null,
            email: row.email || null,
            golongan_darah: row.golongan_darah || null,
            pekerjaan: row.pekerjaan || null,
            status_pernikahan: row.status_pernikahan || null,
            created_by: userId,
            updated_by: userId,
          })
          .into('patients')

        result.imported++
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        result.errors.push({ row: rowNum, error: message })
        result.skipped++
      }
    }

    logger.info('CSV patient import completed', {
      total: result.total,
      imported: result.imported,
      skipped: result.skipped,
    })

    return result
  }

  async importDrugs(
    rows: Array<Record<string, string>>,
    userId: string,
    tenantSchema: string,
  ): Promise<ImportResult> {
    const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      const rowNum = i + 2

      try {
        const nama = (row.nama || '').trim()
        if (!nama) {
          result.errors.push({ row: rowNum, error: 'Nama obat wajib diisi' })
          result.skipped++
          continue
        }

        const existing = await this.db
          .withSchema(tenantSchema)
          .select('id')
          .from('drugs')
          .whereILike('nama', nama)
          .first()

        if (existing) {
          result.skipped++
          result.errors.push({ row: rowNum, error: `Obat "${nama}" sudah ada` })
          continue
        }

        await this.db
          .withSchema(tenantSchema)
          .insert({
            nama,
            kode: row.kode || null,
            nama_generik: row.nama_generik || null,
            kategori: row.kategori || 'Umum',
            satuan: row.satuan || 'Tablet',
            harga_beli: Number(row.harga_beli) || 0,
            harga_jual: Number(row.harga_jual) || 0,
            stok_minimum: Number(row.stok_minimum) || 10,
          })
          .into('drugs')

        result.imported++
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        result.errors.push({ row: rowNum, error: message })
        result.skipped++
      }
    }

    logger.info('CSV drug import completed', {
      total: result.total,
      imported: result.imported,
      skipped: result.skipped,
    })

    return result
  }

  parseCSV(csvContent: string): Array<Record<string, string>> {
    const lines = csvContent.trim().split('\n')
    if (lines.length < 2) {
      throw new ValidationError('File CSV harus memiliki header dan minimal 1 baris data')
    }

    const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''))

    const rows: Array<Record<string, string>> = []
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]!)
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = (values[idx] || '').trim().replace(/"/g, '')
      })
      rows.push(row)
    }

    return rows
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }
}
