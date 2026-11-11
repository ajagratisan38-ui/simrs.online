import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ConflictError } from '../../shared/errors'

export class InsuranceService {
  constructor(private db: Knex) {}

  // ── Master Insurances ──

  async listInsurances(tenantSchema: string, filters?: {
    search?: string; tipe?: string; is_active?: boolean
    page?: number; limit?: number
  }) {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 50
    const offset = (page - 1) * limit

    let query = this.db.withSchema(tenantSchema).from('insurances')

    if (filters?.tipe) query = query.where('tipe', filters.tipe)
    if (filters?.is_active !== undefined) query = query.where('is_active', filters.is_active)
    if (filters?.search) {
      query = query.where(function () {
        this.whereILike('nama', `%${filters!.search}%`)
          .orWhereILike('kode', `%${filters!.search}%`)
      })
    }

    const [{ count }] = await query.clone().count('id as count')
    const total = Number(count)

    const data = await query.clone()
      .select('*')
      .orderBy('nama')
      .offset(offset).limit(limit)

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async getInsurance(id: string, tenantSchema: string) {
    const ins = await this.db.withSchema(tenantSchema)
      .select('*').from('insurances').where({ id }).first()
    if (!ins) throw new NotFoundError('Asuransi')

    const patientCount = await this.db.withSchema(tenantSchema)
      .from('patient_insurances').where({ insurance_id: id, is_active: true })
      .count('id as count').first()

    return { ...ins, patient_count: Number(patientCount?.count ?? 0) }
  }

  async createInsurance(
    data: {
      kode: string; nama: string; tipe?: string; alamat?: string
      telepon?: string; email?: string; pic_nama?: string; pic_telepon?: string
      tarif_persen?: number; catatan?: string
    },
    tenantSchema: string,
  ) {
    try {
      const [ins] = await this.db.withSchema(tenantSchema)
        .insert({
          kode: data.kode,
          nama: data.nama,
          tipe: data.tipe ?? 'asuransi',
          alamat: data.alamat ?? null,
          telepon: data.telepon ?? null,
          email: data.email ?? null,
          pic_nama: data.pic_nama ?? null,
          pic_telepon: data.pic_telepon ?? null,
          tarif_persen: data.tarif_persen ?? 100,
          catatan: data.catatan ?? null,
        })
        .into('insurances').returning('*')
      logger.info('Insurance created', { id: ins.id, kode: data.kode })
      return ins
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr.code === '23505') throw new ConflictError(`Kode "${data.kode}" sudah ada`)
      throw err
    }
  }

  async updateInsurance(id: string, data: Record<string, unknown>, tenantSchema: string) {
    const [updated] = await this.db.withSchema(tenantSchema)
      .table('insurances').where({ id }).update(data).returning('*')
    if (!updated) throw new NotFoundError('Asuransi')
    return updated
  }

  async toggleInsurance(id: string, tenantSchema: string) {
    const ins = await this.db.withSchema(tenantSchema)
      .select('is_active').from('insurances').where({ id }).first()
    if (!ins) throw new NotFoundError('Asuransi')

    const [updated] = await this.db.withSchema(tenantSchema)
      .table('insurances').where({ id })
      .update({ is_active: !ins.is_active }).returning('*')
    return updated
  }

  async deleteInsurance(id: string, tenantSchema: string) {
    const cnt = await this.db.withSchema(tenantSchema)
      .table('insurances').where({ id }).del()
    if (cnt === 0) throw new NotFoundError('Asuransi')
  }

  // ── Patient Insurances ──

  async listPatientInsurances(patientId: string, tenantSchema: string) {
    const data = await this.db.withSchema(tenantSchema)
      .select(
        'pi.*',
        'i.kode as insurance_kode',
        'i.nama as insurance_nama',
        'i.tipe as insurance_tipe',
      )
      .from('patient_insurances as pi')
      .join('insurances as i', 'pi.insurance_id', 'i.id')
      .where('pi.patient_id', patientId)
      .orderBy('pi.is_active', 'desc')
      .orderBy('i.nama')
    return data
  }

  async addPatientInsurance(
    data: {
      patient_id: string; insurance_id: string; no_polis: string
      kelas?: string; berlaku_mulai?: string; berlaku_sampai?: string; catatan?: string
    },
    tenantSchema: string,
  ) {
    const patient = await this.db.withSchema(tenantSchema)
      .select('id').from('patients').where({ id: data.patient_id }).first()
    if (!patient) throw new NotFoundError('Pasien')

    const insurance = await this.db.withSchema(tenantSchema)
      .select('id').from('insurances').where({ id: data.insurance_id }).first()
    if (!insurance) throw new NotFoundError('Asuransi')

    try {
      const [pi] = await this.db.withSchema(tenantSchema)
        .insert({
          patient_id: data.patient_id,
          insurance_id: data.insurance_id,
          no_polis: data.no_polis,
          kelas: data.kelas ?? null,
          berlaku_mulai: data.berlaku_mulai ?? null,
          berlaku_sampai: data.berlaku_sampai ?? null,
          catatan: data.catatan ?? null,
        })
        .into('patient_insurances').returning('*')
      return pi
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr.code === '23505') {
        throw new ConflictError('Pasien sudah terdaftar di asuransi ini')
      }
      throw err
    }
  }

  async updatePatientInsurance(
    id: string, data: Record<string, unknown>, tenantSchema: string,
  ) {
    const [updated] = await this.db.withSchema(tenantSchema)
      .table('patient_insurances').where({ id }).update(data).returning('*')
    if (!updated) throw new NotFoundError('Kepesertaan asuransi')
    return updated
  }

  async removePatientInsurance(id: string, tenantSchema: string) {
    const cnt = await this.db.withSchema(tenantSchema)
      .table('patient_insurances').where({ id }).del()
    if (cnt === 0) throw new NotFoundError('Kepesertaan asuransi')
  }

  // ── Lookup for registration ──

  async getActiveInsurancesForDropdown(tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('id', 'kode', 'nama', 'tipe', 'tarif_persen')
      .from('insurances')
      .where({ is_active: true })
      .orderBy('nama')
  }

  async getPatientActiveInsurance(patientId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select(
        'pi.*',
        'i.kode as insurance_kode',
        'i.nama as insurance_nama',
        'i.tipe as insurance_tipe',
        'i.tarif_persen',
      )
      .from('patient_insurances as pi')
      .join('insurances as i', 'pi.insurance_id', 'i.id')
      .where('pi.patient_id', patientId)
      .where('pi.is_active', true)
      .where('i.is_active', true)
      .orderBy('i.nama')
  }

  // ── Stats ──

  async getInsuranceStats(tenantSchema: string) {
    const totalInsurances = await this.db.withSchema(tenantSchema)
      .from('insurances').where({ is_active: true }).count('id as count').first()

    const totalMembers = await this.db.withSchema(tenantSchema)
      .from('patient_insurances').where({ is_active: true }).count('id as count').first()

    const byTipe = await this.db.withSchema(tenantSchema)
      .select('tipe')
      .from('insurances').where({ is_active: true })
      .count('id as count')
      .groupBy('tipe')

    // Check if visits table has insurance_id column
    const hasInsCol = await this.db.raw(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ? AND table_name = 'visits' AND column_name = 'insurance_id'
    `, [tenantSchema])

    let recentClaims: unknown[] = []
    if (hasInsCol.rows.length > 0) {
      recentClaims = await this.db.withSchema(tenantSchema)
        .select('i.nama as insurance_nama', this.db.raw('COUNT(v.id) as visit_count'))
        .from('visits as v')
        .join('insurances as i', 'v.insurance_id', 'i.id')
        .where('v.tanggal', '>=', this.db.raw("CURRENT_DATE - INTERVAL '30 days'"))
        .groupBy('i.nama')
        .orderBy('visit_count', 'desc')
        .limit(10)
    }

    return {
      total_insurances: Number(totalInsurances?.count ?? 0),
      total_members: Number(totalMembers?.count ?? 0),
      by_tipe: byTipe,
      recent_claims: recentClaims,
    }
  }
}
