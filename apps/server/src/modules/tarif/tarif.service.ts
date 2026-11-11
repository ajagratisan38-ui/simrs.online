import { Knex } from 'knex'
import { NotFoundError, ValidationError } from '../../shared/errors'

export interface KomponenTarif {
  id: string
  kode: string
  nama: string
  kategori: string
  tarif_kelas_3: number
  tarif_kelas_2: number
  tarif_kelas_1: number
  tarif_vip: number
  tarif_igd: number
  tarif_poli: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTarifDTO {
  kode: string
  nama: string
  kategori: string
  tarif_kelas_3?: number
  tarif_kelas_2?: number
  tarif_kelas_1?: number
  tarif_vip?: number
  tarif_igd?: number
  tarif_poli?: number
}

export interface UpdateTarifDTO {
  nama?: string
  kategori?: string
  tarif_kelas_3?: number
  tarif_kelas_2?: number
  tarif_kelas_1?: number
  tarif_vip?: number
  tarif_igd?: number
  tarif_poli?: number
  is_active?: boolean
}

export class TarifService {
  constructor(private db: Knex) {}

  async list(tenantSchema: string, filters?: {
    kategori?: string
    search?: string
    is_active?: boolean
  }) {
    const query = this.db.withSchema(tenantSchema)
      .select('*')
      .from('komponen_tarif')
      .orderBy([
        { column: 'kategori', order: 'asc' },
        { column: 'kode', order: 'asc' },
      ])

    if (filters?.kategori) {
      query.where('kategori', filters.kategori)
    }
    if (filters?.search) {
      query.where(function () {
        this.whereILike('kode', `%${filters.search}%`)
          .orWhereILike('nama', `%${filters.search}%`)
      })
    }
    if (filters?.is_active !== undefined) {
      query.where('is_active', filters.is_active)
    }

    return query
  }

  async getById(id: string, tenantSchema: string) {
    const item = await this.db.withSchema(tenantSchema)
      .select('*').from('komponen_tarif')
      .where({ id }).first()
    if (!item) throw new NotFoundError('Komponen tarif')
    return item
  }

  async create(data: CreateTarifDTO, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('komponen_tarif')
      .where({ kode: data.kode }).first()

    if (existing) {
      throw new ValidationError(`Kode tarif "${data.kode}" sudah digunakan`)
    }

    const [item] = await this.db.withSchema(tenantSchema)
      .insert({
        kode: data.kode.toUpperCase().trim(),
        nama: data.nama.trim(),
        kategori: data.kategori,
        tarif_kelas_3: data.tarif_kelas_3 || 0,
        tarif_kelas_2: data.tarif_kelas_2 || 0,
        tarif_kelas_1: data.tarif_kelas_1 || 0,
        tarif_vip: data.tarif_vip || 0,
        tarif_igd: data.tarif_igd || 0,
        tarif_poli: data.tarif_poli || 0,
      })
      .into('komponen_tarif')
      .returning('*')

    return item
  }

  async update(id: string, data: UpdateTarifDTO, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('komponen_tarif')
      .where({ id }).first()

    if (!existing) throw new NotFoundError('Komponen tarif')

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (data.nama !== undefined) updateData.nama = data.nama.trim()
    if (data.kategori !== undefined) updateData.kategori = data.kategori
    if (data.tarif_kelas_3 !== undefined) updateData.tarif_kelas_3 = data.tarif_kelas_3
    if (data.tarif_kelas_2 !== undefined) updateData.tarif_kelas_2 = data.tarif_kelas_2
    if (data.tarif_kelas_1 !== undefined) updateData.tarif_kelas_1 = data.tarif_kelas_1
    if (data.tarif_vip !== undefined) updateData.tarif_vip = data.tarif_vip
    if (data.tarif_igd !== undefined) updateData.tarif_igd = data.tarif_igd
    if (data.tarif_poli !== undefined) updateData.tarif_poli = data.tarif_poli
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const [updated] = await this.db.withSchema(tenantSchema)
      .from('komponen_tarif')
      .where({ id })
      .update(updateData)
      .returning('*')

    return updated
  }

  async delete(id: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id', 'kode').from('komponen_tarif')
      .where({ id }).first()

    if (!existing) throw new NotFoundError('Komponen tarif')

    await this.db.withSchema(tenantSchema)
      .from('komponen_tarif')
      .where({ id })
      .delete()

    return { deleted: true, kode: existing.kode }
  }

  async toggleActive(id: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id', 'is_active').from('komponen_tarif')
      .where({ id }).first()

    if (!existing) throw new NotFoundError('Komponen tarif')

    const [updated] = await this.db.withSchema(tenantSchema)
      .from('komponen_tarif')
      .where({ id })
      .update({ is_active: !existing.is_active, updated_at: new Date() })
      .returning('*')

    return updated
  }

  async getStats(tenantSchema: string) {
    const total = await this.db.withSchema(tenantSchema)
      .count('id as count').from('komponen_tarif').first()
    const active = await this.db.withSchema(tenantSchema)
      .count('id as count').from('komponen_tarif')
      .where({ is_active: true }).first()

    const byKategori = await this.db.withSchema(tenantSchema)
      .select('kategori')
      .count('id as count')
      .from('komponen_tarif')
      .groupBy('kategori')
      .orderBy('kategori')

    return {
      total: Number(total?.count) || 0,
      active: Number(active?.count) || 0,
      inactive: (Number(total?.count) || 0) - (Number(active?.count) || 0),
      byKategori: byKategori.map((r) => ({
        kategori: r.kategori as string,
        count: Number(r.count),
      })),
    }
  }
}
