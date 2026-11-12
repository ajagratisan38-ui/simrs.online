import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'

interface CreateSubstitutionInput {
  doctor_id: string
  substitute_doctor_id: string
  tanggal_mulai: string
  tanggal_selesai: string
  alasan: string
  catatan?: string
}

interface SubstitutionFilters {
  doctor_id?: string
  substitute_doctor_id?: string
  status?: string
  page?: number
  limit?: number
}

export class SubstitutionService {
  constructor(private db: Knex) {}

  // ── CREATE SUBSTITUTION ──

  async createSubstitution(
    data: CreateSubstitutionInput,
    userId: string,
    tenantSchema: string,
  ) {
    // Validate: both doctors exist
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('d.id', 'u.name as nama')
      .from('doctors as d')
      .join('users as u', 'u.id', 'd.user_id')
      .where('d.id', data.doctor_id)
      .first()

    if (!doctor) throw new NotFoundError('Dokter utama')

    const substitute = await this.db
      .withSchema(tenantSchema)
      .select('d.id', 'u.name as nama', 'd.spesialisasi')
      .from('doctors as d')
      .join('users as u', 'u.id', 'd.user_id')
      .where('d.id', data.substitute_doctor_id)
      .first()

    if (!substitute) throw new NotFoundError('Dokter pengganti')

    // Validate: not same doctor
    if (data.doctor_id === data.substitute_doctor_id) {
      throw new ValidationError('Dokter pengganti tidak boleh sama dengan dokter utama')
    }

    // Validate: no overlapping active substitution for this doctor
    const overlap = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('doctor_substitutions')
      .where('doctor_id', data.doctor_id)
      .where('status', 'active')
      .where(function () {
        this.where(function () {
          this.where('tanggal_mulai', '<=', data.tanggal_selesai)
            .andWhere('tanggal_selesai', '>=', data.tanggal_mulai)
        })
      })
      .first()

    if (overlap) {
      throw new ConflictError(
        'Sudah ada substitusi aktif untuk dokter ini di periode yang tumpang tindih',
      )
    }

    // Validate: substitute doctor doesn't have own active substitution
    // (they shouldn't be covering someone else AND be absent)
    const substituteAbsent = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('doctor_substitutions')
      .where('doctor_id', data.substitute_doctor_id)
      .where('status', 'active')
      .where('tanggal_mulai', '<=', data.tanggal_selesai)
      .where('tanggal_selesai', '>=', data.tanggal_mulai)
      .first()

    if (substituteAbsent) {
      throw new ValidationError(
        `Dr. ${substitute.nama} juga sedang berhalangan di periode tersebut`,
      )
    }

    const [substitution] = await this.db
      .withSchema(tenantSchema)
      .insert({
        doctor_id: data.doctor_id,
        substitute_doctor_id: data.substitute_doctor_id,
        tanggal_mulai: data.tanggal_mulai,
        tanggal_selesai: data.tanggal_selesai,
        alasan: data.alasan,
        catatan: data.catatan || null,
        status: 'active',
        created_by: userId,
      })
      .into('doctor_substitutions')
      .returning('*')

    // Mark original doctor as unavailable
    await this.db
      .withSchema(tenantSchema)
      .table('doctors')
      .where('id', data.doctor_id)
      .update({ is_available: false, updated_at: new Date() })

    logger.info(`Substitution created: Dr ${doctor.nama} → Dr ${substitute.nama}`, {
      substitutionId: substitution.id,
      tenantSchema,
    })

    return substitution
  }

  // ── LIST SUBSTITUTIONS ──

  async listSubstitutions(tenantSchema: string, filters?: SubstitutionFilters) {
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .select(
        'ds.*',
        'ud.name as doctor_nama',
        'dd.spesialisasi as doctor_spesialisasi',
        'us.name as substitute_nama',
        'ds2.spesialisasi as substitute_spesialisasi',
        'uc.name as created_by_nama',
      )
      .from('doctor_substitutions as ds')
      .join('doctors as dd', 'dd.id', 'ds.doctor_id')
      .join('users as ud', 'ud.id', 'dd.user_id')
      .join('doctors as ds2', 'ds2.id', 'ds.substitute_doctor_id')
      .join('users as us', 'us.id', 'ds2.user_id')
      .leftJoin('users as uc', 'uc.id', 'ds.created_by')
      .orderBy('ds.created_at', 'desc')

    if (filters?.doctor_id) {
      query = query.where('ds.doctor_id', filters.doctor_id)
    }
    if (filters?.substitute_doctor_id) {
      query = query.where('ds.substitute_doctor_id', filters.substitute_doctor_id)
    }
    if (filters?.status) {
      query = query.where('ds.status', filters.status)
    }

    const countQuery = query.clone().clearSelect().clearOrder().count('ds.id as total').first()
    const [items, countResult] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery,
    ])

    const total = Number(countResult?.total ?? 0)

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  // ── GET ACTIVE SUBSTITUTE FOR A DOCTOR (on a specific date) ──

  async getActiveSubstitute(
    doctorId: string,
    tenantSchema: string,
    date?: string,
  ) {
    // Use WIB (UTC+7) for date comparison since RS operates in Indonesian time
    const now = new Date()
    const wibOffset = 7 * 60
    const wibTime = new Date(now.getTime() + (wibOffset + now.getTimezoneOffset()) * 60000)
    const targetDate = date || wibTime.toISOString().split('T')[0]

    const substitution = await this.db
      .withSchema(tenantSchema)
      .select(
        'ds.*',
        'ud.name as doctor_nama',
        'us.name as substitute_nama',
        'ds2.spesialisasi as substitute_spesialisasi',
        'ds2.id as substitute_doctor_id_ref',
        'ds2.no_sip as substitute_no_sip',
      )
      .from('doctor_substitutions as ds')
      .join('doctors as dd', 'dd.id', 'ds.doctor_id')
      .join('users as ud', 'ud.id', 'dd.user_id')
      .join('doctors as ds2', 'ds2.id', 'ds.substitute_doctor_id')
      .join('users as us', 'us.id', 'ds2.user_id')
      .where('ds.doctor_id', doctorId)
      .where('ds.status', 'active')
      .where('ds.tanggal_mulai', '<=', targetDate)
      .where('ds.tanggal_selesai', '>=', targetDate)
      .first()

    return substitution || null
  }

  // ── GET SUBSTITUTION BY ID ──

  async getSubstitutionById(id: string, tenantSchema: string) {
    const substitution = await this.db
      .withSchema(tenantSchema)
      .select(
        'ds.*',
        'ud.name as doctor_nama',
        'dd.spesialisasi as doctor_spesialisasi',
        'us.name as substitute_nama',
        'ds2.spesialisasi as substitute_spesialisasi',
        'uc.name as created_by_nama',
        'ucan.name as cancelled_by_nama',
      )
      .from('doctor_substitutions as ds')
      .join('doctors as dd', 'dd.id', 'ds.doctor_id')
      .join('users as ud', 'ud.id', 'dd.user_id')
      .join('doctors as ds2', 'ds2.id', 'ds.substitute_doctor_id')
      .join('users as us', 'us.id', 'ds2.user_id')
      .leftJoin('users as uc', 'uc.id', 'ds.created_by')
      .leftJoin('users as ucan', 'ucan.id', 'ds.cancelled_by')
      .where('ds.id', id)
      .first()

    if (!substitution) throw new NotFoundError('Substitusi')

    // Get visits that used this substitution
    const visits = await this.db
      .withSchema(tenantSchema)
      .select(
        'v.id',
        'v.visit_number',
        'v.tanggal',
        'v.status',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
      )
      .from('visits as v')
      .join('patients as p', 'p.id', 'v.patient_id')
      .where('v.substitution_id', id)
      .orderBy('v.tanggal', 'desc')

    return { ...substitution, visits }
  }

  // ── CANCEL SUBSTITUTION ──

  async cancelSubstitution(id: string, userId: string, tenantSchema: string) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('doctor_substitutions')
      .where('id', id)
      .first()

    if (!existing) throw new NotFoundError('Substitusi')

    if (existing.status !== 'active') {
      throw new ValidationError(
        `Substitusi tidak dapat dibatalkan karena statusnya sudah "${existing.status}"`,
      )
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('doctor_substitutions')
      .where('id', id)
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
      })
      .returning('*')

    // Restore original doctor availability (only if no other active substitution)
    const otherActive = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('doctor_substitutions')
      .where('doctor_id', updated.doctor_id)
      .where('status', 'active')
      .whereNot('id', id)
      .first()

    if (!otherActive) {
      await this.db
        .withSchema(tenantSchema)
        .table('doctors')
        .where('id', updated.doctor_id)
        .update({ is_available: true, updated_at: new Date() })
    }

    logger.info(`Substitution cancelled: ${id}`, { userId, tenantSchema })

    return updated
  }

  // ── COMPLETE EXPIRED SUBSTITUTIONS ──
  // Called by a cron job or on-demand to mark expired substitutions as completed

  async completeExpiredSubstitutions(tenantSchema: string) {
    const now = new Date()
    const wibOffset = 7 * 60
    const wibTime = new Date(now.getTime() + (wibOffset + now.getTimezoneOffset()) * 60000)
    const today = wibTime.toISOString().split('T')[0]

    // Get doctor IDs of expiring substitutions before updating
    const expiring = await this.db
      .withSchema(tenantSchema)
      .select('doctor_id')
      .from('doctor_substitutions')
      .where('status', 'active')
      .where('tanggal_selesai', '<', today)

    const updated = await this.db
      .withSchema(tenantSchema)
      .table('doctor_substitutions')
      .where('status', 'active')
      .where('tanggal_selesai', '<', today)
      .update({ status: 'completed' })

    // Restore availability for doctors whose substitutions just expired
    if (expiring.length > 0) {
      const doctorIds = [...new Set(expiring.map((e: { doctor_id: string }) => e.doctor_id))]
      for (const doctorId of doctorIds) {
        // Only restore if no other active substitution remains
        const stillActive = await this.db
          .withSchema(tenantSchema)
          .select('id')
          .from('doctor_substitutions')
          .where('doctor_id', doctorId)
          .where('status', 'active')
          .first()

        if (!stillActive) {
          await this.db
            .withSchema(tenantSchema)
            .table('doctors')
            .where('id', doctorId)
            .update({ is_available: true, updated_at: new Date() })
        }
      }
    }

    if (updated > 0) {
      logger.info(`Auto-completed ${updated} expired substitutions`, { tenantSchema })
    }

    return updated
  }

  // ── GET SUBSTITUTION HISTORY FOR A DOCTOR ──

  async getDoctorSubstitutionHistory(
    doctorId: string,
    tenantSchema: string,
    role: 'as_doctor' | 'as_substitute' | 'both' = 'both',
  ) {
    let query = this.db
      .withSchema(tenantSchema)
      .select(
        'ds.*',
        'ud.name as doctor_nama',
        'dd.spesialisasi as doctor_spesialisasi',
        'us.name as substitute_nama',
        'ds2.spesialisasi as substitute_spesialisasi',
      )
      .from('doctor_substitutions as ds')
      .join('doctors as dd', 'dd.id', 'ds.doctor_id')
      .join('users as ud', 'ud.id', 'dd.user_id')
      .join('doctors as ds2', 'ds2.id', 'ds.substitute_doctor_id')
      .join('users as us', 'us.id', 'ds2.user_id')
      .orderBy('ds.tanggal_mulai', 'desc')

    if (role === 'as_doctor') {
      query = query.where('ds.doctor_id', doctorId)
    } else if (role === 'as_substitute') {
      query = query.where('ds.substitute_doctor_id', doctorId)
    } else {
      query = query.where(function () {
        this.where('ds.doctor_id', doctorId)
          .orWhere('ds.substitute_doctor_id', doctorId)
      })
    }

    return query
  }

  // ── GET STATS ──

  async getSubstitutionStats(tenantSchema: string) {
    const now = new Date()
    const wibOffset = 7 * 60
    const wibTime = new Date(now.getTime() + (wibOffset + now.getTimezoneOffset()) * 60000)
    const today = wibTime.toISOString().split('T')[0]

    const stats = await this.db
      .withSchema(tenantSchema)
      .select(
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'active') as active_count`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'completed') as completed_count`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count`),
        this.db.raw(`COUNT(*) as total_count`),
        this.db.raw(
          `COUNT(*) FILTER (WHERE status = 'active' AND tanggal_mulai <= ? AND tanggal_selesai >= ?) as active_today`,
          [today, today],
        ),
      )
      .from('doctor_substitutions')
      .first()

    return {
      active: Number(stats?.active_count ?? 0),
      completed: Number(stats?.completed_count ?? 0),
      cancelled: Number(stats?.cancelled_count ?? 0),
      total: Number(stats?.total_count ?? 0),
      activeToday: Number(stats?.active_today ?? 0),
    }
  }
}
