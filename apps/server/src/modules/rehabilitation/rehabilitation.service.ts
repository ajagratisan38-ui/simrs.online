import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  dikirim: ['dijadwalkan', 'batal'],
  dijadwalkan: ['berlangsung', 'batal'],
  berlangsung: ['selesai', 'batal'],
}

interface CreateOrderInput {
  visit_id: string
  patient_id: string
  ordering_doctor_id: string
  practitioner_id?: string
  therapy_type: string
  diagnosa_klinis: string
  indikasi?: string
  target_terapi?: string
  jumlah_sesi?: number
  catatan_dokter?: string
  tarif_per_sesi?: number
}

interface SessionInput {
  tanggal: string
  waktu_mulai?: string
  waktu_selesai?: string
  practitioner_id?: string
  tindakan?: string
  hasil?: string
  catatan_progress?: string
  skala_nyeri_sebelum?: number
  skala_nyeri_sesudah?: number
  rom_sebelum?: string
  rom_sesudah?: string
}

export class RehabilitationService {
  constructor(private db: Knex) {}

  // ── ORDERS ──

  async createOrder(
    data: CreateOrderInput,
    userId: string,
    tenantSchema: string,
  ) {
    const [order] = await this.db
      .withSchema(tenantSchema)
      .insert({
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        ordering_doctor_id: data.ordering_doctor_id,
        practitioner_id: data.practitioner_id || null,
        therapy_type: data.therapy_type,
        diagnosa_klinis: data.diagnosa_klinis,
        indikasi: data.indikasi || null,
        target_terapi: data.target_terapi || null,
        jumlah_sesi: data.jumlah_sesi || 1,
        catatan_dokter: data.catatan_dokter || null,
        tarif_per_sesi: data.tarif_per_sesi || 0,
        created_by: userId,
      })
      .into('rehabilitation_orders')
      .returning('*')

    logger.info(`Rehab order created: ${order.id}`, { tenantSchema, therapy: data.therapy_type })
    return order
  }

  async listOrders(tenantSchema: string, filters?: {
    status?: string
    therapy_type?: string
    patient_id?: string
    practitioner_id?: string
    search?: string
    page?: number
    limit?: number
  }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .select(
        'ro.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'ud.name as doctor_nama',
        'ep.nama as practitioner_nama',
        'ep.profesi as practitioner_profesi',
      )
      .from('rehabilitation_orders as ro')
      .join('patients as p', 'p.id', 'ro.patient_id')
      .join('doctors as d', 'd.id', 'ro.ordering_doctor_id')
      .join('users as ud', 'ud.id', 'd.user_id')
      .leftJoin('external_practitioners as ep', 'ep.id', 'ro.practitioner_id')
      .orderBy('ro.created_at', 'desc')

    if (filters?.status) query = query.where('ro.status', filters.status)
    if (filters?.therapy_type) query = query.where('ro.therapy_type', filters.therapy_type)
    if (filters?.patient_id) query = query.where('ro.patient_id', filters.patient_id)
    if (filters?.practitioner_id) query = query.where('ro.practitioner_id', filters.practitioner_id)
    if (filters?.search) {
      const s = `%${filters.search}%`
      query = query.where(function () {
        this.whereILike('p.nama', s).orWhereILike('p.no_rekam_medis', s)
      })
    }

    const countQuery = query.clone().clearSelect().clearOrder().count('ro.id as total').first()
    const [items, countResult] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery,
    ])

    return {
      data: items,
      meta: { page, limit, total: Number(countResult?.total ?? 0), totalPages: Math.ceil(Number(countResult?.total ?? 0) / limit) },
    }
  }

  async getOrder(id: string, tenantSchema: string) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select(
        'ro.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.tanggal_lahir as patient_tanggal_lahir',
        'p.jenis_kelamin as patient_jenis_kelamin',
        'ud.name as doctor_nama',
        'dd.spesialisasi as doctor_spesialisasi',
        'ep.nama as practitioner_nama',
        'ep.profesi as practitioner_profesi',
        'ep.instansi_asal as practitioner_instansi',
        'v.visit_number',
        'v.tanggal as visit_tanggal',
        'r.nama as room_nama',
      )
      .from('rehabilitation_orders as ro')
      .join('patients as p', 'p.id', 'ro.patient_id')
      .join('visits as v', 'v.id', 'ro.visit_id')
      .join('rooms as r', 'r.id', 'v.room_id')
      .join('doctors as dd', 'dd.id', 'ro.ordering_doctor_id')
      .join('users as ud', 'ud.id', 'dd.user_id')
      .leftJoin('external_practitioners as ep', 'ep.id', 'ro.practitioner_id')
      .where('ro.id', id)
      .first()

    if (!order) throw new NotFoundError('Order rehabilitasi')

    const sessions = await this.db
      .withSchema(tenantSchema)
      .select(
        'rs.*',
        'ep.nama as practitioner_nama',
        'u.name as performed_by_nama',
      )
      .from('rehabilitation_sessions as rs')
      .leftJoin('external_practitioners as ep', 'ep.id', 'rs.practitioner_id')
      .leftJoin('users as u', 'u.id', 'rs.performed_by')
      .where('rs.order_id', id)
      .orderBy('rs.sesi_ke', 'asc')

    return { ...order, sessions }
  }

  async updateOrderStatus(
    id: string,
    newStatus: string,
    userId: string,
    tenantSchema: string,
    extra?: { cancelled_reason?: string; catatan_terapis?: string; practitioner_id?: string },
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'jumlah_sesi', 'sesi_selesai')
      .from('rehabilitation_orders')
      .where('id', id)
      .first()

    if (!order) throw new NotFoundError('Order rehabilitasi')

    const allowed = VALID_STATUS_TRANSITIONS[order.status as string]
    if (!allowed || !allowed.includes(newStatus)) {
      throw new ValidationError(
        `Tidak dapat mengubah status dari "${order.status}" ke "${newStatus}"`,
      )
    }

    const updateData: Record<string, unknown> = { status: newStatus }

    if (newStatus === 'berlangsung') {
      updateData.started_at = new Date().toISOString()
      if (extra?.practitioner_id) updateData.practitioner_id = extra.practitioner_id
    }
    if (newStatus === 'selesai') {
      updateData.completed_at = new Date().toISOString()
      if (extra?.catatan_terapis) updateData.catatan_terapis = extra.catatan_terapis
    }
    if (newStatus === 'batal') {
      updateData.cancelled_at = new Date().toISOString()
      updateData.cancelled_by = userId
      updateData.cancelled_reason = extra?.cancelled_reason || null
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('rehabilitation_orders')
      .where('id', id)
      .update(updateData)
      .returning('*')

    logger.info(`Rehab order ${id} status: ${order.status} → ${newStatus}`, { tenantSchema })
    return updated
  }

  async assignPractitioner(
    orderId: string,
    practitionerId: string,
    tenantSchema: string,
  ) {
    const practitioner = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'status')
      .from('external_practitioners')
      .where('id', practitionerId)
      .first()

    if (!practitioner) throw new NotFoundError('Tenaga kesehatan')
    if (practitioner.status !== 'aktif') {
      throw new ValidationError('Tenaga kesehatan tidak aktif')
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('rehabilitation_orders')
      .where('id', orderId)
      .update({ practitioner_id: practitionerId })
      .returning('*')

    if (!updated) throw new NotFoundError('Order rehabilitasi')
    return updated
  }

  // ── SESSIONS ──

  async addSession(
    orderId: string,
    data: SessionInput,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'jumlah_sesi', 'sesi_selesai', 'practitioner_id')
      .from('rehabilitation_orders')
      .where('id', orderId)
      .first()

    if (!order) throw new NotFoundError('Order rehabilitasi')

    const nextSesi = Number(order.sesi_selesai) + 1
    if (nextSesi > Number(order.jumlah_sesi)) {
      throw new ValidationError(
        `Semua sesi sudah selesai (${order.jumlah_sesi} sesi)`,
      )
    }

    const [session] = await this.db
      .withSchema(tenantSchema)
      .insert({
        order_id: orderId,
        sesi_ke: nextSesi,
        tanggal: data.tanggal,
        waktu_mulai: data.waktu_mulai || null,
        waktu_selesai: data.waktu_selesai || null,
        practitioner_id: data.practitioner_id || order.practitioner_id || null,
        tindakan: data.tindakan || null,
        hasil: data.hasil || null,
        catatan_progress: data.catatan_progress || null,
        skala_nyeri_sebelum: data.skala_nyeri_sebelum ?? null,
        skala_nyeri_sesudah: data.skala_nyeri_sesudah ?? null,
        rom_sebelum: data.rom_sebelum || null,
        rom_sesudah: data.rom_sesudah || null,
        status: 'selesai',
        performed_by: userId,
      })
      .into('rehabilitation_sessions')
      .returning('*')

    // Update order sesi_selesai count
    await this.db
      .withSchema(tenantSchema)
      .table('rehabilitation_orders')
      .where('id', orderId)
      .update({ sesi_selesai: nextSesi })

    // Auto-complete order if all sessions done
    if (nextSesi >= Number(order.jumlah_sesi)) {
      await this.db
        .withSchema(tenantSchema)
        .table('rehabilitation_orders')
        .where('id', orderId)
        .whereNot('status', 'selesai')
        .update({
          status: 'selesai',
          completed_at: new Date().toISOString(),
        })
      logger.info(`Rehab order ${orderId} auto-completed (all sessions done)`, { tenantSchema })
    }

    return session
  }

  async updateSession(
    sessionId: string,
    data: Partial<SessionInput>,
    tenantSchema: string,
  ) {
    const updateData: Record<string, unknown> = {}
    if (data.tindakan !== undefined) updateData.tindakan = data.tindakan
    if (data.hasil !== undefined) updateData.hasil = data.hasil
    if (data.catatan_progress !== undefined) updateData.catatan_progress = data.catatan_progress
    if (data.skala_nyeri_sebelum !== undefined) updateData.skala_nyeri_sebelum = data.skala_nyeri_sebelum
    if (data.skala_nyeri_sesudah !== undefined) updateData.skala_nyeri_sesudah = data.skala_nyeri_sesudah
    if (data.rom_sebelum !== undefined) updateData.rom_sebelum = data.rom_sebelum
    if (data.rom_sesudah !== undefined) updateData.rom_sesudah = data.rom_sesudah
    if (data.waktu_mulai !== undefined) updateData.waktu_mulai = data.waktu_mulai
    if (data.waktu_selesai !== undefined) updateData.waktu_selesai = data.waktu_selesai

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('Tidak ada data yang diubah')
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('rehabilitation_sessions')
      .where('id', sessionId)
      .update(updateData)
      .returning('*')

    if (!updated) throw new NotFoundError('Sesi rehabilitasi')
    return updated
  }

  async deleteSession(sessionId: string, tenantSchema: string) {
    const session = await this.db
      .withSchema(tenantSchema)
      .select('id', 'order_id', 'sesi_ke')
      .from('rehabilitation_sessions')
      .where('id', sessionId)
      .first()

    if (!session) throw new NotFoundError('Sesi rehabilitasi')

    await this.db
      .withSchema(tenantSchema)
      .table('rehabilitation_sessions')
      .where('id', sessionId)
      .del()

    // Decrement order sesi_selesai
    await this.db
      .withSchema(tenantSchema)
      .table('rehabilitation_orders')
      .where('id', session.order_id)
      .decrement('sesi_selesai', 1)

    return { deleted: true }
  }

  // ── PATIENT HISTORY ──

  async getPatientRehabHistory(patientId: string, tenantSchema: string) {
    const orders = await this.db
      .withSchema(tenantSchema)
      .select(
        'ro.*',
        'ud.name as doctor_nama',
        'ep.nama as practitioner_nama',
        'v.visit_number',
      )
      .from('rehabilitation_orders as ro')
      .join('doctors as d', 'd.id', 'ro.ordering_doctor_id')
      .join('users as ud', 'ud.id', 'd.user_id')
      .join('visits as v', 'v.id', 'ro.visit_id')
      .leftJoin('external_practitioners as ep', 'ep.id', 'ro.practitioner_id')
      .where('ro.patient_id', patientId)
      .orderBy('ro.created_at', 'desc')

    return orders
  }

  // ── STATS ──

  async getStats(tenantSchema: string) {
    const stats = await this.db
      .withSchema(tenantSchema)
      .select(
        this.db.raw(`COUNT(*) as total`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'dikirim') as dikirim`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'dijadwalkan') as dijadwalkan`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'berlangsung') as berlangsung`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'selesai') as selesai`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'batal') as batal`),
      )
      .from('rehabilitation_orders')
      .first()

    const byTherapy = await this.db
      .withSchema(tenantSchema)
      .select('therapy_type')
      .count('id as count')
      .from('rehabilitation_orders')
      .whereNot('status', 'batal')
      .groupBy('therapy_type')
      .orderBy('count', 'desc')

    const todayOrders = await this.db
      .withSchema(tenantSchema)
      .count('id as count')
      .from('rehabilitation_orders')
      .where('created_at', '>=', new Date().toISOString().split('T')[0])
      .first()

    return {
      total: Number(stats?.total ?? 0),
      dikirim: Number(stats?.dikirim ?? 0),
      dijadwalkan: Number(stats?.dijadwalkan ?? 0),
      berlangsung: Number(stats?.berlangsung ?? 0),
      selesai: Number(stats?.selesai ?? 0),
      batal: Number(stats?.batal ?? 0),
      today: Number(todayOrders?.count ?? 0),
      byTherapy,
    }
  }
}
