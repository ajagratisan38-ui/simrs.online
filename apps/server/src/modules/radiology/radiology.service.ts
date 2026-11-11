import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ValidationError,
} from '../../shared/errors'
import type {
  CreateRadiologyOrderInput,
  ScheduleOrderInput,
  InputRadiologyResultInput,
  ListRadiologyOrdersInput,
  SearchExaminationsInput,
} from './radiology.validator'

export class RadiologyService {
  constructor(private db: Knex) {}

  private async generateOrderNumber(tenantSchema: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `RAD-${today}-`

    const [result] = await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .where('nomor_order', 'like', `${prefix}%`)
      .count('id as count')

    const seq = Number(result.count) + 1
    return `${prefix}${String(seq).padStart(5, '0')}`
  }

  // ===================================================
  // CREATE ORDER — dokter membuat permintaan radiologi
  // ===================================================
  async createOrder(
    data: CreateRadiologyOrderInput,
    doctorId: string,
    userId: string,
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

    if (!['menunggu', 'diperiksa'].includes(visit.status)) {
      throw new ValidationError(
        `Kunjungan dengan status '${visit.status}' tidak bisa dibuat order radiologi`,
      )
    }

    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('doctors')
      .where({ id: doctorId })
      .first()

    if (!doctor) throw new NotFoundError('Dokter')

    const examination = await this.db
      .select('*')
      .from('public.radiology_examinations')
      .where({ id: data.examination_id, is_active: true })
      .first()

    if (!examination) throw new NotFoundError('Jenis pemeriksaan radiologi')

    const nomorOrder = await this.generateOrderNumber(tenantSchema)

    const [order] = await this.db
      .withSchema(tenantSchema)
      .insert({
        visit_id: data.visit_id,
        patient_id: visit.patient_id,
        doctor_id: doctorId,
        medical_record_id: data.medical_record_id || null,
        nomor_order: nomorOrder,
        examination_id: data.examination_id,
        examination_kode: examination.kode,
        examination_nama: examination.nama,
        modalitas: examination.modalitas,
        prioritas: data.prioritas,
        status: 'dikirim',
        catatan_klinis: data.catatan_klinis || null,
        diagnosa_klinis: data.diagnosa_klinis || null,
        tarif: examination.tarif_default,
        created_by: userId,
        updated_by: userId,
      })
      .into('radiology_orders')
      .returning('*')

    logger.info('Radiology order created', {
      orderId: order.id,
      nomorOrder,
      examination: examination.kode,
      doctorId,
    })

    return this.getOrderById(order.id, tenantSchema)
  }

  // ===================================================
  // SCHEDULE — radiografer jadwalkan pemeriksaan
  // ===================================================
  async scheduleOrder(
    orderId: string,
    data: ScheduleOrderInput,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('radiology_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order radiologi')

    if (order.status !== 'dikirim') {
      throw new ValidationError(
        `Order radiologi dengan status '${order.status}' tidak bisa dijadwalkan`,
      )
    }

    await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .where({ id: orderId })
      .update({
        status: 'dijadwalkan',
        tanggal_jadwal: data.tanggal_jadwal,
        radiografer_id: userId,
        updated_by: userId,
      })

    logger.info('Radiology order scheduled', { orderId, userId })
    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // START PROCESSING — mulai pemeriksaan
  // ===================================================
  async startProcessing(
    orderId: string,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('radiology_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order radiologi')

    if (!['dikirim', 'dijadwalkan'].includes(order.status)) {
      throw new ValidationError(
        `Order radiologi dengan status '${order.status}' tidak bisa diproses`,
      )
    }

    await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .where({ id: orderId })
      .update({
        status: 'diproses',
        radiografer_id: userId,
        updated_by: userId,
      })

    logger.info('Radiology processing started', { orderId, userId })
    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // INPUT RESULTS — radiolog input bacaan hasil
  // ===================================================
  async inputResults(
    orderId: string,
    data: InputRadiologyResultInput,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('radiology_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order radiologi')

    if (order.status !== 'diproses') {
      throw new ValidationError(
        `Order radiologi dengan status '${order.status}' tidak bisa diinput hasil`,
      )
    }

    await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .where({ id: orderId })
      .update({
        status: 'selesai',
        hasil_bacaan: data.hasil_bacaan,
        kesan: data.kesan,
        radiolog_id: userId,
        tanggal_selesai: new Date().toISOString(),
        updated_by: userId,
      })

    logger.info('Radiology results inputted', { orderId, userId })
    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // CANCEL — batalkan order
  // ===================================================
  async cancelOrder(
    orderId: string,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('radiology_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order radiologi')

    if (order.status === 'selesai') {
      throw new ValidationError('Order radiologi yang sudah selesai tidak bisa dibatalkan')
    }
    if (order.status === 'batal') {
      throw new ValidationError('Order radiologi sudah dibatalkan')
    }

    await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .where({ id: orderId })
      .update({ status: 'batal', updated_by: userId })

    logger.info('Radiology order cancelled', { orderId, userId })
    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // LIST ORDERS
  // ===================================================
  async listOrders(filters: ListRadiologyOrdersInput, tenantSchema: string) {
    const { page, limit, status, prioritas, modalitas, search, tanggal_dari, tanggal_sampai } = filters
    const offset = (page - 1) * limit

    const baseQuery = this.db
      .withSchema(tenantSchema)
      .from('radiology_orders as ro')
      .join('patients as p', 'p.id', 'ro.patient_id')
      .join('doctors as d', 'd.id', 'ro.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')

    if (status) baseQuery.where('ro.status', status)
    if (prioritas) baseQuery.where('ro.prioritas', prioritas)
    if (modalitas) baseQuery.where('ro.modalitas', modalitas)
    if (tanggal_dari) baseQuery.where('ro.tanggal_order', '>=', tanggal_dari)
    if (tanggal_sampai) baseQuery.where('ro.tanggal_order', '<=', tanggal_sampai + ' 23:59:59')

    if (search) {
      baseQuery.andWhere(function () {
        this.whereILike('p.nama', `%${search}%`)
          .orWhereILike('p.no_rekam_medis', `%${search}%`)
          .orWhereILike('ro.nomor_order', `%${search}%`)
          .orWhereILike('ro.examination_nama', `%${search}%`)
      })
    }

    const countResult = await baseQuery.clone().count('ro.id as count').first()
    const total = Number((countResult as Record<string, unknown>)?.count || 0)
    const totalPages = Math.ceil(total / limit)

    const orders = await baseQuery
      .clone()
      .select(
        'ro.id',
        'ro.nomor_order',
        'ro.examination_kode',
        'ro.examination_nama',
        'ro.modalitas',
        'ro.prioritas',
        'ro.status',
        'ro.catatan_klinis',
        'ro.tanggal_order',
        'ro.tanggal_jadwal',
        'ro.tanggal_selesai',
        'ro.tarif',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.jenis_kelamin',
        'p.tanggal_lahir',
        'u.name as doctor_nama',
        'd.spesialisasi as doctor_spesialisasi',
      )
      .orderByRaw(`
        CASE ro.prioritas WHEN 'cito' THEN 0 ELSE 1 END ASC,
        CASE ro.status
          WHEN 'dikirim' THEN 0
          WHEN 'dijadwalkan' THEN 1
          WHEN 'diproses' THEN 2
          WHEN 'selesai' THEN 3
          WHEN 'batal' THEN 4
        END ASC,
        ro.tanggal_order DESC
      `)
      .offset(offset)
      .limit(limit)

    return { data: orders, meta: { page, limit, total, totalPages } }
  }

  // ===================================================
  // GET ORDER BY ID
  // ===================================================
  async getOrderById(orderId: string, tenantSchema: string) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select(
        'ro.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.nik',
        'p.jenis_kelamin',
        'p.tanggal_lahir',
        'u.name as doctor_nama',
        'd.spesialisasi as doctor_spesialisasi',
        'rgr.name as radiografer_nama',
        'rdl.name as radiolog_nama',
      )
      .from('radiology_orders as ro')
      .join('patients as p', 'p.id', 'ro.patient_id')
      .join('doctors as d', 'd.id', 'ro.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .leftJoin('users as rgr', 'rgr.id', 'ro.radiografer_id')
      .leftJoin('users as rdl', 'rdl.id', 'ro.radiolog_id')
      .where('ro.id', orderId)
      .first()

    if (!order) throw new NotFoundError('Order radiologi')

    // Fetch examination details
    const exam = await this.db
      .select('*')
      .from('public.radiology_examinations')
      .where({ id: order.examination_id })
      .first()

    return { ...order, examination_detail: exam }
  }

  // ===================================================
  // GET RESULTS BY VISIT
  // ===================================================
  async getResultsByVisit(visitId: string, tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select(
        'ro.id',
        'ro.nomor_order',
        'ro.examination_kode',
        'ro.examination_nama',
        'ro.modalitas',
        'ro.prioritas',
        'ro.status',
        'ro.hasil_bacaan',
        'ro.kesan',
        'ro.tanggal_order',
        'ro.tanggal_selesai',
      )
      .from('radiology_orders as ro')
      .where('ro.visit_id', visitId)
      .whereNot('ro.status', 'batal')
      .orderBy('ro.tanggal_order', 'desc')
  }

  // ===================================================
  // GET PATIENT HISTORY
  // ===================================================
  async getPatientHistory(patientId: string, tenantSchema: string, limit = 10) {
    return this.db
      .withSchema(tenantSchema)
      .select(
        'ro.id',
        'ro.nomor_order',
        'ro.examination_kode',
        'ro.examination_nama',
        'ro.modalitas',
        'ro.status',
        'ro.hasil_bacaan',
        'ro.kesan',
        'ro.tanggal_order',
        'ro.tanggal_selesai',
        'u.name as doctor_nama',
      )
      .from('radiology_orders as ro')
      .join('doctors as d', 'd.id', 'ro.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .where('ro.patient_id', patientId)
      .whereNot('ro.status', 'batal')
      .orderBy('ro.tanggal_order', 'desc')
      .limit(limit)
  }

  // ===================================================
  // SEARCH EXAMINATIONS
  // ===================================================
  async searchExaminations(filters: SearchExaminationsInput) {
    const { q, modalitas, limit } = filters
    const pattern = `%${q}%`

    const query = this.db
      .select('*')
      .from('public.radiology_examinations')
      .where({ is_active: true })
      .andWhere(function () {
        this.whereILike('kode', pattern)
          .orWhereILike('nama', pattern)
          .orWhereILike('kategori', pattern)
      })

    if (modalitas) query.andWhere('modalitas', modalitas)

    return query.orderBy('modalitas', 'asc').orderBy('nama', 'asc').limit(limit)
  }

  // ===================================================
  // GET MODALITIES — for filter dropdown
  // ===================================================
  async getModalities() {
    const rows = await this.db
      .distinct('modalitas')
      .from('public.radiology_examinations')
      .where({ is_active: true })
      .orderBy('modalitas', 'asc')

    return rows.map((r: Record<string, unknown>) => r.modalitas)
  }

  // ===================================================
  // STATS
  // ===================================================
  async getStats(tenantSchema: string) {
    const today = new Date().toISOString().slice(0, 10)

    const [pending] = await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .whereIn('status', ['dikirim', 'dijadwalkan', 'diproses'])
      .count('id as count')

    const [todayCount] = await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .where('tanggal_order', '>=', today)
      .count('id as count')

    const [citoCount] = await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .where({ prioritas: 'cito' })
      .whereIn('status', ['dikirim', 'dijadwalkan', 'diproses'])
      .count('id as count')

    const [completedToday] = await this.db
      .withSchema(tenantSchema)
      .from('radiology_orders')
      .where({ status: 'selesai' })
      .where('tanggal_selesai', '>=', today)
      .count('id as count')

    return {
      pending: Number(pending.count),
      today: Number(todayCount.count),
      cito: Number(citoCount.count),
      completed_today: Number(completedToday.count),
    }
  }
}
