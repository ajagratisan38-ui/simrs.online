import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'
import type {
  CreatePatientInput,
  UpdatePatientInput,
  SearchPatientInput,
} from './patient.validator'

interface PatientRow {
  id: string
  no_rekam_medis: string
  nik: string
  nama: string
  tempat_lahir: string
  tanggal_lahir: string
  jenis_kelamin: string
  golongan_darah: string | null
  alamat: string
  rt: string | null
  rw: string | null
  kelurahan: string | null
  kecamatan: string | null
  kabupaten: string | null
  provinsi: string | null
  kode_pos: string | null
  no_telepon: string | null
  email: string | null
  pekerjaan: string | null
  pendidikan: string | null
  status_pernikahan: string | null
  nama_keluarga: string | null
  no_telepon_keluarga: string | null
  hubungan_keluarga: string | null
  no_bpjs: string | null
  kelas_bpjs: number | null
  foto_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  deleted_at: string | null
}

const MAX_RETRY = 3

export class PatientService {
  constructor(private db: Knex) {}

  /**
   * Buat pasien baru. Auto-generate no_rekam_medis.
   * Race condition ditangani dengan unique constraint + retry.
   */
  async create(
    data: CreatePatientInput,
    tenantSchema: string,
    userId: string,
  ): Promise<PatientRow> {
    // Cek duplikat NIK
    const existing = await this.checkDuplicate(data.nik, tenantSchema)
    if (existing) {
      throw new ConflictError(
        `Pasien dengan NIK ${data.nik} sudah terdaftar (No RM: ${existing.no_rekam_medis})`,
      )
    }

    // Generate no_rekam_medis dengan retry untuk handle race condition
    let attempt = 0
    while (attempt < MAX_RETRY) {
      try {
        const noRM = await this.generateNoRM(tenantSchema)

        const [patient] = await this.db
          .withSchema(tenantSchema)
          .insert({
            ...data,
            no_rekam_medis: noRM,
            is_active: true,
            created_by: userId,
            updated_by: userId,
          })
          .into('patients')
          .returning('*')

        logger.info('Patient created', {
          patientId: patient.id,
          noRM: patient.no_rekam_medis,
          nik: data.nik,
          tenant: tenantSchema,
        })

        return patient as PatientRow
      } catch (err: unknown) {
        const pgErr = err as { code?: string; constraint?: string }
        // unique_violation pada no_rekam_medis — retry
        if (
          pgErr.code === '23505' &&
          pgErr.constraint?.includes('no_rekam_medis')
        ) {
          attempt++
          logger.warn('no_rekam_medis collision, retrying', { attempt })
          continue
        }
        // unique_violation pada nik — duplikat
        if (pgErr.code === '23505' && pgErr.constraint?.includes('nik')) {
          throw new ConflictError(`Pasien dengan NIK ${data.nik} sudah terdaftar`)
        }
        throw err
      }
    }

    throw new ConflictError(
      'Gagal generate nomor rekam medis setelah beberapa percobaan. Coba lagi.',
    )
  }

  async findById(
    id: string,
    tenantSchema: string,
  ): Promise<PatientRow> {
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('patients')
      .where({ id })
      .whereNull('deleted_at')
      .first<PatientRow>()

    if (!patient) {
      throw new NotFoundError('Pasien')
    }

    return patient
  }

  async findByNik(
    nik: string,
    tenantSchema: string,
  ): Promise<PatientRow | null> {
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('patients')
      .where({ nik })
      .whereNull('deleted_at')
      .first<PatientRow>()

    return patient ?? null
  }

  async findByNoRM(
    noRM: string,
    tenantSchema: string,
  ): Promise<PatientRow | null> {
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('patients')
      .where({ no_rekam_medis: noRM })
      .whereNull('deleted_at')
      .first<PatientRow>()

    return patient ?? null
  }

  async search(
    filters: SearchPatientInput,
    tenantSchema: string,
  ) {
    const { search, status, page, limit, sort, order } = filters
    const offset = (page - 1) * limit

    // Whitelist kolom yang bisa di-sort
    const allowedSorts = [
      'nama', 'no_rekam_medis', 'nik', 'tanggal_lahir', 'created_at',
    ]
    const sortCol = allowedSorts.includes(sort) ? sort : 'nama'

    let query = this.db
      .withSchema(tenantSchema)
      .from('patients')
      .whereNull('deleted_at')

    // Filter status
    if (status === 'active') {
      query = query.where('is_active', true)
    } else if (status === 'inactive') {
      query = query.where('is_active', false)
    }

    // Pencarian teks — ILIKE pada nama, nik, no_rekam_medis, no_bpjs
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`
      query = query.where(function () {
        this.whereILike('nama', term)
          .orWhere('nik', 'like', term)
          .orWhereILike('no_rekam_medis', term)
          .orWhere('no_bpjs', 'like', term)
      })
    }

    // Count total (clone query sebelum sort/limit)
    const [{ count }] = await query.clone().count('id as count')
    const total = Number(count)

    // Fetch data
    const patients = await query
      .select('*')
      .orderBy(sortCol, order)
      .limit(limit)
      .offset(offset)

    return {
      data: patients as PatientRow[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async update(
    id: string,
    data: UpdatePatientInput,
    tenantSchema: string,
    userId: string,
  ): Promise<PatientRow> {
    // Pastikan pasien ada
    await this.findById(id, tenantSchema)

    // Kalau NIK berubah, cek duplikat
    if (data.nik) {
      const dup = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('patients')
        .where({ nik: data.nik })
        .whereNot({ id })
        .whereNull('deleted_at')
        .first()

      if (dup) {
        throw new ConflictError(`NIK ${data.nik} sudah dipakai pasien lain`)
      }
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('patients')
      .where({ id })
      .update({
        ...data,
        updated_by: userId,
      })
      .returning('*')

    logger.info('Patient updated', { patientId: id, tenant: tenantSchema })

    return updated as PatientRow
  }

  async softDelete(
    id: string,
    tenantSchema: string,
    userId: string,
  ): Promise<void> {
    await this.findById(id, tenantSchema)

    await this.db
      .withSchema(tenantSchema)
      .table('patients')
      .where({ id })
      .update({
        deleted_at: new Date(),
        updated_by: userId,
      })

    logger.info('Patient soft-deleted', { patientId: id, tenant: tenantSchema })
  }

  async checkDuplicate(
    nik: string,
    tenantSchema: string,
  ): Promise<Pick<PatientRow, 'id' | 'nik' | 'nama' | 'no_rekam_medis'> | null> {
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nik', 'nama', 'no_rekam_medis')
      .from('patients')
      .where({ nik })
      .whereNull('deleted_at')
      .first()

    return patient ?? null
  }

  async getHistory(id: string, tenantSchema: string) {
    // Pastikan pasien ada
    const patient = await this.findById(id, tenantSchema)

    // Ambil riwayat kunjungan (visits) jika tabel sudah ada
    let visits: unknown[] = []
    try {
      const hasVisits = await this.db.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = ? AND table_name = 'visits'
        )
      `, [tenantSchema])

      if (hasVisits.rows[0]?.exists) {
        visits = await this.db
          .withSchema(tenantSchema)
          .select('*')
          .from('visits')
          .where({ patient_id: id })
          .orderBy('tanggal', 'desc')
          .limit(50)
      }
    } catch {
      // Tabel visits belum ada — return empty
    }

    return { patient, visits }
  }

  /**
   * Gabung 2 pasien duplikat.
   * Semua relasi dari duplicateId dipindahkan ke primaryId,
   * lalu duplicateId di-soft-delete.
   */
  async merge(
    primaryId: string,
    duplicateId: string,
    tenantSchema: string,
    userId: string,
  ): Promise<PatientRow> {
    if (primaryId === duplicateId) {
      throw new ValidationError('Pasien utama dan duplikat tidak boleh sama')
    }

    const primary = await this.findById(primaryId, tenantSchema)
    const duplicate = await this.findById(duplicateId, tenantSchema)

    await this.db.transaction(async (trx) => {
      // Pindahkan semua visits (jika tabel ada)
      try {
        const hasVisits = await trx.raw(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = ? AND table_name = 'visits'
          )
        `, [tenantSchema])

        if (hasVisits.rows[0]?.exists) {
          await trx
            .withSchema(tenantSchema)
            .table('visits')
            .where({ patient_id: duplicateId })
            .update({ patient_id: primaryId, updated_by: userId })
        }
      } catch {
        // skip jika tabel belum ada
      }

      // Pindahkan beds (current_patient_id)
      await trx
        .withSchema(tenantSchema)
        .table('beds')
        .where({ current_patient_id: duplicateId })
        .update({ current_patient_id: primaryId })

      // Soft-delete pasien duplikat
      await trx
        .withSchema(tenantSchema)
        .table('patients')
        .where({ id: duplicateId })
        .update({
          deleted_at: new Date(),
          updated_by: userId,
          is_active: false,
        })
    })

    logger.info('Patients merged', {
      primaryId,
      duplicateId,
      tenant: tenantSchema,
    })

    return this.findById(primaryId, tenantSchema)
  }

  // --- Private helpers ---

  private async generateNoRM(tenantSchema: string): Promise<string> {
    const result = await this.db.raw(
      'SELECT generate_no_rekam_medis(?) as no_rm',
      [tenantSchema],
    )
    return result.rows[0].no_rm as string
  }
}
