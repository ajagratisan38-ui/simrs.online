import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ForbiddenError } from '../../shared/errors'

export interface CreateCpptInput {
  visit_id: string
  subjective?: string
  objective?: string
  assessment?: string
  planning?: string
  instruksi?: string
  evaluasi?: string
}

export interface UpdateCpptInput {
  subjective?: string
  objective?: string
  assessment?: string
  planning?: string
  instruksi?: string
  evaluasi?: string
}

export interface ListCpptFilters {
  page: number
  limit: number
  profesi?: string
}

const PROFESI_MAP: Record<string, string> = {
  dokter: 'Dokter',
  perawat: 'Perawat',
  apoteker: 'Apoteker',
  lab: 'Analis Lab',
  radiologi: 'Radiografer',
  rekam_medis: 'Rekam Medis',
  admin: 'Admin',
  manajemen: 'Manajemen',
  kasir: 'Kasir',
  pendaftaran: 'Pendaftaran',
}

export class CpptService {
  constructor(private db: Knex) {}

  async create(
    data: CreateCpptInput,
    userId: string,
    role: string,
    tenantSchema: string,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'patient_id', 'status')
      .from('visits')
      .where({ id: data.visit_id })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    if (['selesai', 'batal'].includes(visit.status)) {
      throw new ValidationError(
        `Tidak bisa menambah CPPT pada kunjungan dengan status '${visit.status}'`,
      )
    }

    const hasContent = data.subjective || data.objective
      || data.assessment || data.planning
      || data.instruksi || data.evaluasi

    if (!hasContent) {
      throw new ValidationError('Minimal satu field SOAP-IE harus diisi')
    }

    const profesi = PROFESI_MAP[role] || role

    const [entry] = await this.db
      .withSchema(tenantSchema)
      .insert({
        visit_id: data.visit_id,
        patient_id: visit.patient_id,
        user_id: userId,
        profesi,
        subjective: data.subjective || null,
        objective: data.objective || null,
        assessment: data.assessment || null,
        planning: data.planning || null,
        instruksi: data.instruksi || null,
        evaluasi: data.evaluasi || null,
        tanggal_waktu: new Date(),
      })
      .into('cppt_entries')
      .returning('*')

    logger.info('CPPT entry created', {
      id: entry.id,
      visitId: data.visit_id,
      profesi,
      userId,
    })

    return this.getByIdInternal(entry.id, tenantSchema)
  }

  async update(
    id: string,
    data: UpdateCpptInput,
    userId: string,
    tenantSchema: string,
  ) {
    const entry = await this.db
      .withSchema(tenantSchema)
      .select('id', 'user_id', 'is_verified')
      .from('cppt_entries')
      .where({ id })
      .whereNull('deleted_at')
      .first()

    if (!entry) throw new NotFoundError('Entry CPPT')

    if (entry.is_verified) {
      throw new ValidationError('Entry CPPT sudah diverifikasi dan tidak bisa diedit')
    }

    if (entry.user_id !== userId) {
      throw new ForbiddenError()
    }

    await this.db
      .withSchema(tenantSchema)
      .from('cppt_entries')
      .where({ id })
      .update({
        subjective: data.subjective ?? null,
        objective: data.objective ?? null,
        assessment: data.assessment ?? null,
        planning: data.planning ?? null,
        instruksi: data.instruksi ?? null,
        evaluasi: data.evaluasi ?? null,
        updated_at: new Date(),
      })

    logger.info('CPPT entry updated', { id, userId })

    return this.getByIdInternal(id, tenantSchema)
  }

  async verify(
    id: string,
    userId: string,
    tenantSchema: string,
  ) {
    const entry = await this.db
      .withSchema(tenantSchema)
      .select('id', 'is_verified')
      .from('cppt_entries')
      .where({ id })
      .whereNull('deleted_at')
      .first()

    if (!entry) throw new NotFoundError('Entry CPPT')

    if (entry.is_verified) {
      throw new ValidationError('Entry CPPT sudah diverifikasi')
    }

    await this.db
      .withSchema(tenantSchema)
      .from('cppt_entries')
      .where({ id })
      .update({
        is_verified: true,
        verified_by: userId,
        verified_at: new Date(),
        updated_at: new Date(),
      })

    logger.info('CPPT entry verified', { id, verifiedBy: userId })

    return this.getByIdInternal(id, tenantSchema)
  }

  async delete(
    id: string,
    userId: string,
    tenantSchema: string,
  ) {
    const entry = await this.db
      .withSchema(tenantSchema)
      .select('id', 'user_id', 'is_verified')
      .from('cppt_entries')
      .where({ id })
      .whereNull('deleted_at')
      .first()

    if (!entry) throw new NotFoundError('Entry CPPT')

    if (entry.is_verified) {
      throw new ValidationError('Entry CPPT sudah diverifikasi dan tidak bisa dihapus')
    }

    if (entry.user_id !== userId) {
      throw new ForbiddenError()
    }

    await this.db
      .withSchema(tenantSchema)
      .from('cppt_entries')
      .where({ id })
      .update({ deleted_at: new Date() })

    logger.info('CPPT entry soft-deleted', { id, userId })
  }

  async listByVisit(
    visitId: string,
    filters: ListCpptFilters,
    tenantSchema: string,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'patient_id')
      .from('visits')
      .where({ id: visitId })
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    const { page, limit, profesi } = filters
    const offset = (page - 1) * limit

    const baseQuery = this.db
      .withSchema(tenantSchema)
      .from('cppt_entries')
      .where({ visit_id: visitId })
      .whereNull('deleted_at')

    if (profesi) {
      baseQuery.andWhere({ profesi })
    }

    const countResult = await baseQuery.clone().count('id as count').first()
    const total = Number((countResult as Record<string, unknown>)?.count || 0)
    const totalPages = Math.ceil(total / limit)

    const entries = await baseQuery
      .clone()
      .select(
        'c.id',
        'c.visit_id',
        'c.patient_id',
        'c.user_id',
        'c.profesi',
        'c.subjective',
        'c.objective',
        'c.assessment',
        'c.planning',
        'c.instruksi',
        'c.evaluasi',
        'c.tanggal_waktu',
        'c.is_verified',
        'c.verified_by',
        'c.verified_at',
        'c.created_at',
        'c.updated_at',
        'u.name as user_nama',
        'uv.name as verified_by_nama',
      )
      .from('cppt_entries as c')
      .join('users as u', 'u.id', 'c.user_id')
      .leftJoin('users as uv', 'uv.id', 'c.verified_by')
      .where({ 'c.visit_id': visitId })
      .whereNull('c.deleted_at')
      .modify((qb) => {
        if (profesi) qb.andWhere('c.profesi', profesi)
      })
      .orderBy('c.tanggal_waktu', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: entries,
      meta: { page, limit, total, totalPages },
    }
  }

  async listByPatient(
    patientId: string,
    filters: ListCpptFilters,
    tenantSchema: string,
  ) {
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('patients')
      .where({ id: patientId })
      .whereNull('deleted_at')
      .first()

    if (!patient) throw new NotFoundError('Pasien')

    const { page, limit } = filters
    const offset = (page - 1) * limit

    const countResult = await this.db
      .withSchema(tenantSchema)
      .from('cppt_entries')
      .where({ patient_id: patientId })
      .whereNull('deleted_at')
      .count('id as count')
      .first()

    const total = Number((countResult as Record<string, unknown>)?.count || 0)
    const totalPages = Math.ceil(total / limit)

    const entries = await this.db
      .withSchema(tenantSchema)
      .select(
        'c.id',
        'c.visit_id',
        'c.patient_id',
        'c.user_id',
        'c.profesi',
        'c.subjective',
        'c.objective',
        'c.assessment',
        'c.planning',
        'c.instruksi',
        'c.evaluasi',
        'c.tanggal_waktu',
        'c.is_verified',
        'c.verified_by',
        'c.verified_at',
        'c.created_at',
        'u.name as user_nama',
        'v.visit_number',
      )
      .from('cppt_entries as c')
      .join('users as u', 'u.id', 'c.user_id')
      .join('visits as v', 'v.id', 'c.visit_id')
      .where({ 'c.patient_id': patientId })
      .whereNull('c.deleted_at')
      .orderBy('c.tanggal_waktu', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: entries,
      meta: { page, limit, total, totalPages },
    }
  }

  private async getByIdInternal(id: string, tenantSchema: string) {
    const entry = await this.db
      .withSchema(tenantSchema)
      .select(
        'c.id',
        'c.visit_id',
        'c.patient_id',
        'c.user_id',
        'c.profesi',
        'c.subjective',
        'c.objective',
        'c.assessment',
        'c.planning',
        'c.instruksi',
        'c.evaluasi',
        'c.tanggal_waktu',
        'c.is_verified',
        'c.verified_by',
        'c.verified_at',
        'c.created_at',
        'c.updated_at',
        'u.name as user_nama',
        'uv.name as verified_by_nama',
      )
      .from('cppt_entries as c')
      .join('users as u', 'u.id', 'c.user_id')
      .leftJoin('users as uv', 'uv.id', 'c.verified_by')
      .where({ 'c.id': id })
      .first()

    if (!entry) throw new NotFoundError('Entry CPPT')

    return entry
  }
}
