import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ValidationError,
} from '../../shared/errors'
import type {
  CreateLabOrderInput,
  ReceiveSampleInput,
  InputResultInput,
  ListLabOrdersInput,
  SearchLabParamsInput,
} from './laboratory.validator'

export class LaboratoryService {
  constructor(private db: Knex) {}

  // ===================================================
  // Generate nomor order: LAB-YYYYMMDD-XXXXX
  // ===================================================
  private async generateOrderNumber(tenantSchema: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `LAB-${today}-`

    const [result] = await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
      .where('nomor_order', 'like', `${prefix}%`)
      .count('id as count')

    const seq = Number(result.count) + 1
    return `${prefix}${String(seq).padStart(5, '0')}`
  }

  // ===================================================
  // CREATE ORDER — dokter membuat permintaan lab
  // ===================================================
  async createOrder(
    data: CreateLabOrderInput,
    doctorId: string,
    userId: string,
    tenantSchema: string,
  ) {
    // Validate visit exists
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
        `Kunjungan dengan status '${visit.status}' tidak bisa dibuat order lab`,
      )
    }

    // Validate doctor
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('doctors')
      .where({ id: doctorId })
      .first()

    if (!doctor) throw new NotFoundError('Dokter')

    // Fetch lab parameters
    const paramIds = data.items.map((i) => i.parameter_id)
    const params = await this.db
      .select('*')
      .from('public.lab_parameters')
      .whereIn('id', paramIds)
      .andWhere({ is_active: true })

    if (params.length !== paramIds.length) {
      throw new ValidationError('Beberapa parameter lab tidak valid atau tidak aktif')
    }

    const paramMap = new Map(params.map((p: Record<string, unknown>) => [p.id, p]))

    return this.db.transaction(async (trx) => {
      const nomorOrder = await this.generateOrderNumber(tenantSchema)

      const [order] = await trx
        .withSchema(tenantSchema)
        .insert({
          visit_id: data.visit_id,
          patient_id: visit.patient_id,
          doctor_id: doctorId,
          medical_record_id: data.medical_record_id || null,
          nomor_order: nomorOrder,
          prioritas: data.prioritas,
          status: 'dikirim',
          catatan_klinis: data.catatan_klinis || null,
          created_by: userId,
          updated_by: userId,
        })
        .into('lab_orders')
        .returning('*')

      // Insert order items
      const itemRows = data.items.map((item) => {
        const param = paramMap.get(item.parameter_id) as Record<string, unknown>
        return {
          lab_order_id: order.id,
          parameter_id: item.parameter_id,
          parameter_kode: param.kode,
          parameter_nama: param.nama,
          kategori: param.kategori,
          satuan: param.satuan || null,
          nilai_normal: param.nilai_normal_l || null,
          specimen: param.specimen,
          tarif: item.tarif,
        }
      })

      await trx
        .withSchema(tenantSchema)
        .insert(itemRows)
        .into('lab_order_items')

      logger.info('Lab order created', {
        orderId: order.id,
        nomorOrder,
        doctorId,
        itemCount: itemRows.length,
      })

      return this.getOrderById(order.id, tenantSchema, trx)
    })
  }

  // ===================================================
  // RECEIVE SAMPLE — petugas lab terima sampel
  // ===================================================
  async receiveSample(
    orderId: string,
    _data: ReceiveSampleInput,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('lab_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order lab')

    if (order.status !== 'dikirim') {
      throw new ValidationError(
        `Order lab dengan status '${order.status}' tidak bisa diterima`,
      )
    }

    await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
      .where({ id: orderId })
      .update({
        status: 'sampel_diterima',
        tanggal_sampel: new Date().toISOString(),
        petugas_lab_id: userId,
        updated_by: userId,
      })

    logger.info('Lab sample received', { orderId, userId })

    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // START PROCESSING — mulai proses pemeriksaan
  // ===================================================
  async startProcessing(
    orderId: string,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('lab_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order lab')

    if (order.status !== 'sampel_diterima') {
      throw new ValidationError(
        `Order lab dengan status '${order.status}' tidak bisa diproses`,
      )
    }

    await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
      .where({ id: orderId })
      .update({
        status: 'diproses',
        updated_by: userId,
      })

    logger.info('Lab order processing started', { orderId, userId })

    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // INPUT RESULTS — petugas lab input hasil pemeriksaan
  // ===================================================
  async inputResults(
    orderId: string,
    data: InputResultInput,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('lab_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order lab')

    if (!['sampel_diterima', 'diproses'].includes(order.status)) {
      throw new ValidationError(
        `Order lab dengan status '${order.status}' tidak bisa diinput hasil`,
      )
    }

    // Update status to diproses if still sampel_diterima
    if (order.status === 'sampel_diterima') {
      await this.db
        .withSchema(tenantSchema)
        .from('lab_orders')
        .where({ id: orderId })
        .update({ status: 'diproses', updated_by: userId })
    }

    // Update each item result
    for (const result of data.results) {
      const item = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('lab_order_items')
        .where({ id: result.item_id, lab_order_id: orderId })
        .first()

      if (!item) {
        throw new NotFoundError(`Item lab ${result.item_id}`)
      }

      await this.db
        .withSchema(tenantSchema)
        .from('lab_order_items')
        .where({ id: result.item_id })
        .update({
          hasil: result.hasil,
          keterangan: result.keterangan || null,
          flag: result.flag || null,
        })
    }

    logger.info('Lab results inputted', {
      orderId,
      resultCount: data.results.length,
      userId,
    })

    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // FINALIZE — validasi dan finalisasi hasil lab
  // ===================================================
  async finalizeOrder(
    orderId: string,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('lab_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order lab')

    if (order.status !== 'diproses') {
      throw new ValidationError(
        `Order lab dengan status '${order.status}' tidak bisa difinalisasi`,
      )
    }

    // Check all items have results
    const [{ count: emptyCount }] = await this.db
      .withSchema(tenantSchema)
      .from('lab_order_items')
      .where({ lab_order_id: orderId })
      .whereNull('hasil')
      .count('id as count')

    if (Number(emptyCount) > 0) {
      throw new ValidationError(
        `Masih ada ${emptyCount} item yang belum diinput hasilnya`,
      )
    }

    await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
      .where({ id: orderId })
      .update({
        status: 'selesai',
        tanggal_selesai: new Date().toISOString(),
        updated_by: userId,
      })

    logger.info('Lab order finalized', { orderId, userId })

    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // CANCEL — batalkan order lab
  // ===================================================
  async cancelOrder(
    orderId: string,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('lab_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order lab')

    if (order.status === 'selesai') {
      throw new ValidationError('Order lab yang sudah selesai tidak bisa dibatalkan')
    }

    if (order.status === 'batal') {
      throw new ValidationError('Order lab sudah dibatalkan')
    }

    await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
      .where({ id: orderId })
      .update({
        status: 'batal',
        updated_by: userId,
      })

    logger.info('Lab order cancelled', { orderId, userId })

    return this.getOrderById(orderId, tenantSchema)
  }

  // ===================================================
  // LIST ORDERS — daftar order lab dengan filter
  // ===================================================
  async listOrders(
    filters: ListLabOrdersInput,
    tenantSchema: string,
  ) {
    const { page, limit, status, prioritas, search, tanggal_dari, tanggal_sampai } = filters
    const offset = (page - 1) * limit

    const baseQuery = this.db
      .withSchema(tenantSchema)
      .from('lab_orders as lo')
      .join('patients as p', 'p.id', 'lo.patient_id')
      .join('doctors as d', 'd.id', 'lo.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')

    if (status) baseQuery.where('lo.status', status)
    if (prioritas) baseQuery.where('lo.prioritas', prioritas)
    if (tanggal_dari) baseQuery.where('lo.tanggal_order', '>=', tanggal_dari)
    if (tanggal_sampai) baseQuery.where('lo.tanggal_order', '<=', tanggal_sampai + ' 23:59:59')

    if (search) {
      baseQuery.andWhere(function () {
        this.whereILike('p.nama', `%${search}%`)
          .orWhereILike('p.no_rekam_medis', `%${search}%`)
          .orWhereILike('lo.nomor_order', `%${search}%`)
      })
    }

    // Count
    const countQuery = baseQuery.clone().count('lo.id as count').first()
    const countResult = await countQuery
    const total = Number((countResult as Record<string, unknown>)?.count || 0)
    const totalPages = Math.ceil(total / limit)

    // Fetch data
    const orders = await baseQuery
      .clone()
      .select(
        'lo.id',
        'lo.nomor_order',
        'lo.prioritas',
        'lo.status',
        'lo.catatan_klinis',
        'lo.tanggal_order',
        'lo.tanggal_sampel',
        'lo.tanggal_selesai',
        'lo.created_at',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.jenis_kelamin',
        'p.tanggal_lahir',
        'u.name as doctor_nama',
        'd.spesialisasi as doctor_spesialisasi',
      )
      .orderByRaw(`
        CASE lo.prioritas WHEN 'cito' THEN 0 ELSE 1 END ASC,
        CASE lo.status
          WHEN 'dikirim' THEN 0
          WHEN 'sampel_diterima' THEN 1
          WHEN 'diproses' THEN 2
          WHEN 'selesai' THEN 3
          WHEN 'batal' THEN 4
        END ASC,
        lo.tanggal_order DESC
      `)
      .offset(offset)
      .limit(limit)

    // Fetch item counts per order
    for (const order of orders) {
      const [{ count: itemCount }] = await this.db
        .withSchema(tenantSchema)
        .from('lab_order_items')
        .where({ lab_order_id: (order as Record<string, unknown>).id })
        .count('id as count')
      ;(order as Record<string, unknown>).item_count = Number(itemCount)
    }

    return {
      data: orders,
      meta: { page, limit, total, totalPages },
    }
  }

  // ===================================================
  // GET ORDER BY ID — detail order dengan items
  // ===================================================
  async getOrderById(
    orderId: string,
    tenantSchema: string,
    trxOrDb?: Knex | Knex.Transaction,
  ) {
    const conn = trxOrDb || this.db

    const order = await conn
      .withSchema(tenantSchema)
      .select(
        'lo.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.nik',
        'p.jenis_kelamin',
        'p.tanggal_lahir',
        'u.name as doctor_nama',
        'd.spesialisasi as doctor_spesialisasi',
        'petugas.name as petugas_lab_nama',
      )
      .from('lab_orders as lo')
      .join('patients as p', 'p.id', 'lo.patient_id')
      .join('doctors as d', 'd.id', 'lo.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .leftJoin('users as petugas', 'petugas.id', 'lo.petugas_lab_id')
      .where('lo.id', orderId)
      .first()

    if (!order) throw new NotFoundError('Order lab')

    // Fetch items
    const items = await conn
      .withSchema(tenantSchema)
      .select('*')
      .from('lab_order_items')
      .where({ lab_order_id: orderId })
      .orderBy('kategori', 'asc')
      .orderBy('parameter_nama', 'asc')

    return { ...order, items }
  }

  // ===================================================
  // GET RESULTS BY VISIT — for dokter to view in SOAP
  // ===================================================
  async getResultsByVisit(
    visitId: string,
    tenantSchema: string,
  ) {
    const orders = await this.db
      .withSchema(tenantSchema)
      .select(
        'lo.id',
        'lo.nomor_order',
        'lo.prioritas',
        'lo.status',
        'lo.catatan_klinis',
        'lo.tanggal_order',
        'lo.tanggal_selesai',
      )
      .from('lab_orders as lo')
      .where('lo.visit_id', visitId)
      .whereNot('lo.status', 'batal')
      .orderBy('lo.tanggal_order', 'desc')

    for (const order of orders) {
      (order as Record<string, unknown>).items = await this.db
        .withSchema(tenantSchema)
        .select('*')
        .from('lab_order_items')
        .where({ lab_order_id: (order as Record<string, unknown>).id })
        .orderBy('kategori', 'asc')
        .orderBy('parameter_nama', 'asc')
    }

    return orders
  }

  // ===================================================
  // GET PATIENT LAB HISTORY — riwayat lab pasien
  // ===================================================
  async getPatientHistory(
    patientId: string,
    tenantSchema: string,
    limit = 10,
  ) {
    const orders = await this.db
      .withSchema(tenantSchema)
      .select(
        'lo.id',
        'lo.nomor_order',
        'lo.prioritas',
        'lo.status',
        'lo.tanggal_order',
        'lo.tanggal_selesai',
        'u.name as doctor_nama',
      )
      .from('lab_orders as lo')
      .join('doctors as d', 'd.id', 'lo.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .where('lo.patient_id', patientId)
      .whereNot('lo.status', 'batal')
      .orderBy('lo.tanggal_order', 'desc')
      .limit(limit)

    for (const order of orders) {
      (order as Record<string, unknown>).items = await this.db
        .withSchema(tenantSchema)
        .select('parameter_kode', 'parameter_nama', 'hasil', 'satuan', 'nilai_normal', 'flag')
        .from('lab_order_items')
        .where({ lab_order_id: (order as Record<string, unknown>).id })
        .orderBy('kategori', 'asc')
    }

    return orders
  }

  // ===================================================
  // SEARCH LAB PARAMETERS — for order form
  // ===================================================
  async searchParameters(filters: SearchLabParamsInput) {
    const { q, kategori, limit } = filters
    const pattern = `%${q}%`

    const query = this.db
      .select('*')
      .from('public.lab_parameters')
      .where({ is_active: true })
      .andWhere(function () {
        this.whereILike('kode', pattern)
          .orWhereILike('nama', pattern)
      })

    if (kategori) {
      query.andWhere('kategori', kategori)
    }

    return query
      .orderBy('kategori', 'asc')
      .orderBy('nama', 'asc')
      .limit(limit)
  }

  // ===================================================
  // GET PARAMETER CATEGORIES — for filter dropdown
  // ===================================================
  async getParameterCategories() {
    const rows = await this.db
      .distinct('kategori')
      .from('public.lab_parameters')
      .where({ is_active: true })
      .orderBy('kategori', 'asc')

    return rows.map((r: Record<string, unknown>) => r.kategori)
  }

  // ===================================================
  // STATS — for dashboard
  // ===================================================
  async getStats(tenantSchema: string) {
    const today = new Date().toISOString().slice(0, 10)

    const [pending] = await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
      .whereIn('status', ['dikirim', 'sampel_diterima', 'diproses'])
      .count('id as count')

    const [todayCount] = await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
      .where('tanggal_order', '>=', today)
      .count('id as count')

    const [citoCount] = await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
      .where({ prioritas: 'cito' })
      .whereIn('status', ['dikirim', 'sampel_diterima', 'diproses'])
      .count('id as count')

    const [completedToday] = await this.db
      .withSchema(tenantSchema)
      .from('lab_orders')
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
