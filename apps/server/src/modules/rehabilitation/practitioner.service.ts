import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'

interface CreatePractitionerInput {
  nama: string
  profesi: string
  spesialisasi?: string
  no_sip?: string
  no_str?: string
  instansi_asal?: string
  telepon?: string
  email?: string
  alamat?: string
  fee_share_persen?: number
  fee_share_rs_persen?: number
  kontrak_mulai?: string
  kontrak_selesai?: string
  catatan?: string
}

interface PractitionerFilters {
  profesi?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export class PractitionerService {
  constructor(private db: Knex) {}

  async listPractitioners(tenantSchema: string, filters?: PractitionerFilters) {
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('external_practitioners')
      .orderBy('nama', 'asc')

    if (filters?.profesi) {
      query = query.where('profesi', filters.profesi)
    }
    if (filters?.status) {
      query = query.where('status', filters.status)
    }
    if (filters?.search) {
      const s = `%${filters.search}%`
      query = query.where(function () {
        this.whereILike('nama', s)
          .orWhereILike('instansi_asal', s)
          .orWhereILike('spesialisasi', s)
      })
    }

    const countQuery = query.clone().clearSelect().clearOrder().count('id as total').first()
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

  async getPractitioner(id: string, tenantSchema: string) {
    const practitioner = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('external_practitioners')
      .where('id', id)
      .first()

    if (!practitioner) throw new NotFoundError('Tenaga kesehatan luar')
    return practitioner
  }

  async createPractitioner(
    data: CreatePractitionerInput,
    userId: string,
    tenantSchema: string,
  ) {
    const feePersen = data.fee_share_persen ?? 70
    const feeRsPersen = data.fee_share_rs_persen ?? 30

    if (feePersen + feeRsPersen !== 100) {
      throw new ValidationError('Total persentase fee harus 100%')
    }

    const [practitioner] = await this.db
      .withSchema(tenantSchema)
      .insert({
        nama: data.nama,
        profesi: data.profesi,
        spesialisasi: data.spesialisasi || null,
        no_sip: data.no_sip || null,
        no_str: data.no_str || null,
        instansi_asal: data.instansi_asal || null,
        telepon: data.telepon || null,
        email: data.email || null,
        alamat: data.alamat || null,
        fee_share_persen: feePersen,
        fee_share_rs_persen: feeRsPersen,
        kontrak_mulai: data.kontrak_mulai || null,
        kontrak_selesai: data.kontrak_selesai || null,
        catatan: data.catatan || null,
        created_by: userId,
      })
      .into('external_practitioners')
      .returning('*')

    logger.info(`External practitioner created: ${data.nama}`, { tenantSchema })
    return practitioner
  }

  async updatePractitioner(
    id: string,
    data: Partial<CreatePractitionerInput> & { status?: string },
    tenantSchema: string,
  ) {
    const existing = await this.getPractitioner(id, tenantSchema)

    const updateData: Record<string, unknown> = {}
    if (data.nama !== undefined) updateData.nama = data.nama
    if (data.profesi !== undefined) updateData.profesi = data.profesi
    if (data.spesialisasi !== undefined) updateData.spesialisasi = data.spesialisasi || null
    if (data.no_sip !== undefined) updateData.no_sip = data.no_sip || null
    if (data.no_str !== undefined) updateData.no_str = data.no_str || null
    if (data.instansi_asal !== undefined) updateData.instansi_asal = data.instansi_asal || null
    if (data.telepon !== undefined) updateData.telepon = data.telepon || null
    if (data.email !== undefined) updateData.email = data.email || null
    if (data.alamat !== undefined) updateData.alamat = data.alamat || null
    if (data.catatan !== undefined) updateData.catatan = data.catatan || null
    if (data.kontrak_mulai !== undefined) updateData.kontrak_mulai = data.kontrak_mulai || null
    if (data.kontrak_selesai !== undefined) updateData.kontrak_selesai = data.kontrak_selesai || null
    if (data.status !== undefined) updateData.status = data.status

    if (data.fee_share_persen !== undefined || data.fee_share_rs_persen !== undefined) {
      const persen = data.fee_share_persen ?? Number(existing.fee_share_persen)
      const rsPersen = data.fee_share_rs_persen ?? Number(existing.fee_share_rs_persen)
      if (persen + rsPersen !== 100) {
        throw new ValidationError('Total persentase fee harus 100%')
      }
      updateData.fee_share_persen = persen
      updateData.fee_share_rs_persen = rsPersen
    }

    if (Object.keys(updateData).length === 0) return existing

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('external_practitioners')
      .where('id', id)
      .update(updateData)
      .returning('*')

    return updated
  }

  async deletePractitioner(id: string, tenantSchema: string) {
    const orderCount = await this.db
      .withSchema(tenantSchema)
      .count('id as total')
      .from('rehabilitation_orders')
      .where('practitioner_id', id)
      .first()

    if (Number(orderCount?.total) > 0) {
      throw new ConflictError(
        'Tidak dapat menghapus — tenaga ini masih memiliki order rehabilitasi. Nonaktifkan saja.',
      )
    }

    const count = await this.db
      .withSchema(tenantSchema)
      .table('external_practitioners')
      .where('id', id)
      .del()

    if (count === 0) throw new NotFoundError('Tenaga kesehatan luar')
  }

  async getActiveDropdown(tenantSchema: string, profesi?: string) {
    let query = this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'profesi', 'spesialisasi', 'instansi_asal')
      .from('external_practitioners')
      .where('status', 'aktif')
      .orderBy('nama', 'asc')

    if (profesi) {
      query = query.where('profesi', profesi)
    }

    return query
  }

  async getStats(tenantSchema: string) {
    const stats = await this.db
      .withSchema(tenantSchema)
      .select(
        this.db.raw(`COUNT(*) as total`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'aktif') as aktif`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'nonaktif') as nonaktif`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'kontrak_habis') as kontrak_habis`),
      )
      .from('external_practitioners')
      .first()

    const byProfesi = await this.db
      .withSchema(tenantSchema)
      .select('profesi')
      .count('id as count')
      .from('external_practitioners')
      .where('status', 'aktif')
      .groupBy('profesi')
      .orderBy('count', 'desc')

    return {
      total: Number(stats?.total ?? 0),
      aktif: Number(stats?.aktif ?? 0),
      nonaktif: Number(stats?.nonaktif ?? 0),
      kontrak_habis: Number(stats?.kontrak_habis ?? 0),
      byProfesi,
    }
  }
}
