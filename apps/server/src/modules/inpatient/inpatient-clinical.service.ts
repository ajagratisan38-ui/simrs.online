import { Knex } from 'knex'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'
import { logger } from '../../shared/logger'

// ==================== TYPES ====================

export type VitalAlertLevel = 'normal' | 'warning' | 'critical'
export type OrderStatus = 'active' | 'completed' | 'cancelled' | 'discontinued'
export type OrderPriority = 'rutin' | 'urgent' | 'stat'
export type OrderCategory =
  | 'obat' | 'infus' | 'diet' | 'tindakan' | 'lab' | 'radiologi'
  | 'konsultasi' | 'monitoring' | 'mobilisasi' | 'lainnya'
export type NursingShift = 'pagi' | 'siang' | 'malam'
export type DischargeReadiness = 'not_ready' | 'partial' | 'ready'

export interface VitalSignInput {
  visit_id: string
  patient_id: string
  tekanan_darah_sistolik?: number
  tekanan_darah_diastolik?: number
  nadi?: number
  suhu?: number
  respirasi?: number
  spo2?: number
  nyeri_score?: number
  kesadaran?: string
  gcs_eye?: number
  gcs_verbal?: number
  gcs_motorik?: number
  intake_cairan?: number
  output_cairan?: number
  berat_badan?: number
  catatan?: string
}

const VITAL_RANGES = {
  sistolik: { low: 90, high: 140, critLow: 80, critHigh: 180 },
  diastolik: { low: 60, high: 90, critLow: 50, critHigh: 120 },
  nadi: { low: 60, high: 100, critLow: 40, critHigh: 150 },
  suhu: { low: 36, high: 37.5, critLow: 35, critHigh: 39.5 },
  respirasi: { low: 12, high: 20, critLow: 8, critHigh: 30 },
  spo2: { low: 95, high: 100, critLow: 90, critHigh: 100 },
}

export class InpatientClinicalService {
  constructor(private db: Knex) {}

  // ==================== VITAL SIGNS ====================

  async recordVitals(
    data: VitalSignInput,
    tenantSchema: string,
    userId: string,
  ) {
    const visit = await this.db.withSchema(tenantSchema)
      .select('id', 'status', 'tipe')
      .from('visits').where({ id: data.visit_id }).first()

    if (!visit) throw new NotFoundError('Kunjungan')

    const alertLevel = this.calculateAlertLevel(data)

    const [record] = await this.db.withSchema(tenantSchema)
      .insert({
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        recorded_by: userId,
        recorded_at: new Date(),
        tekanan_darah_sistolik: data.tekanan_darah_sistolik ?? null,
        tekanan_darah_diastolik: data.tekanan_darah_diastolik ?? null,
        nadi: data.nadi ?? null,
        suhu: data.suhu ?? null,
        respirasi: data.respirasi ?? null,
        spo2: data.spo2 ?? null,
        nyeri_score: data.nyeri_score ?? 0,
        kesadaran: data.kesadaran ?? 'compos_mentis',
        gcs_eye: data.gcs_eye ?? null,
        gcs_verbal: data.gcs_verbal ?? null,
        gcs_motorik: data.gcs_motorik ?? null,
        intake_cairan: data.intake_cairan ?? null,
        output_cairan: data.output_cairan ?? null,
        berat_badan: data.berat_badan ?? null,
        catatan: data.catatan ?? null,
        alert_level: alertLevel,
      })
      .into('vital_signs')
      .returning('*')

    logger.info('Vital signs recorded', {
      visitId: data.visit_id, alertLevel, tenant: tenantSchema,
    })

    return record
  }

  async getVitalsByVisit(visitId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('vs.*', 'u.name as recorded_by_name')
      .from('vital_signs as vs')
      .join('users as u', 'u.id', 'vs.recorded_by')
      .where('vs.visit_id', visitId)
      .orderBy('vs.recorded_at', 'desc')
  }

  async getVitalsTrend(visitId: string, tenantSchema: string) {
    const rows = await this.db.withSchema(tenantSchema)
      .select(
        'recorded_at',
        'tekanan_darah_sistolik', 'tekanan_darah_diastolik',
        'nadi', 'suhu', 'respirasi', 'spo2', 'nyeri_score',
      )
      .from('vital_signs')
      .where({ visit_id: visitId })
      .orderBy('recorded_at', 'asc')

    return rows
  }

  async getLatestVitals(visitId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('vs.*', 'u.name as recorded_by_name')
      .from('vital_signs as vs')
      .join('users as u', 'u.id', 'vs.recorded_by')
      .where('vs.visit_id', visitId)
      .orderBy('vs.recorded_at', 'desc')
      .first()
  }

  async deleteVital(vitalId: string, tenantSchema: string) {
    const vital = await this.db.withSchema(tenantSchema)
      .select('id').from('vital_signs').where({ id: vitalId }).first()
    if (!vital) throw new NotFoundError('Vital sign record')

    await this.db.withSchema(tenantSchema)
      .delete().from('vital_signs').where({ id: vitalId })

    return { success: true }
  }

  private calculateAlertLevel(data: VitalSignInput): VitalAlertLevel {
    const R = VITAL_RANGES
    const checks: boolean[] = []
    const crits: boolean[] = []

    if (data.tekanan_darah_sistolik) {
      checks.push(
        data.tekanan_darah_sistolik < R.sistolik.low ||
        data.tekanan_darah_sistolik > R.sistolik.high,
      )
      crits.push(
        data.tekanan_darah_sistolik < R.sistolik.critLow ||
        data.tekanan_darah_sistolik > R.sistolik.critHigh,
      )
    }
    if (data.tekanan_darah_diastolik) {
      checks.push(
        data.tekanan_darah_diastolik < R.diastolik.low ||
        data.tekanan_darah_diastolik > R.diastolik.high,
      )
      crits.push(
        data.tekanan_darah_diastolik < R.diastolik.critLow ||
        data.tekanan_darah_diastolik > R.diastolik.critHigh,
      )
    }
    if (data.nadi) {
      checks.push(data.nadi < R.nadi.low || data.nadi > R.nadi.high)
      crits.push(data.nadi < R.nadi.critLow || data.nadi > R.nadi.critHigh)
    }
    if (data.suhu) {
      checks.push(data.suhu < R.suhu.low || data.suhu > R.suhu.high)
      crits.push(data.suhu < R.suhu.critLow || data.suhu > R.suhu.critHigh)
    }
    if (data.respirasi) {
      checks.push(data.respirasi < R.respirasi.low || data.respirasi > R.respirasi.high)
      crits.push(data.respirasi < R.respirasi.critLow || data.respirasi > R.respirasi.critHigh)
    }
    if (data.spo2) {
      checks.push(data.spo2 < R.spo2.low)
      crits.push(data.spo2 < R.spo2.critLow)
    }

    if (crits.some(Boolean)) return 'critical'
    if (checks.some(Boolean)) return 'warning'
    return 'normal'
  }

  // ==================== MEDICAL ORDERS ====================

  async createOrder(
    data: {
      visit_id: string
      patient_id: string
      kategori: OrderCategory
      prioritas?: OrderPriority
      instruksi: string
      dosis?: string
      frekuensi?: string
      rute?: string
      durasi?: string
      catatan?: string
    },
    tenantSchema: string,
    userId: string,
  ) {
    const visit = await this.db.withSchema(tenantSchema)
      .select('id', 'status').from('visits').where({ id: data.visit_id }).first()
    if (!visit) throw new NotFoundError('Kunjungan')

    const [order] = await this.db.withSchema(tenantSchema)
      .insert({
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        ordered_by: userId,
        kategori: data.kategori,
        prioritas: data.prioritas || 'rutin',
        instruksi: data.instruksi,
        dosis: data.dosis || null,
        frekuensi: data.frekuensi || null,
        rute: data.rute || null,
        durasi: data.durasi || null,
        catatan: data.catatan || null,
        status: 'active',
        started_at: new Date(),
      })
      .into('medical_orders')
      .returning('*')

    logger.info('Medical order created', {
      orderId: order.id, visitId: data.visit_id, kategori: data.kategori,
    })

    return order
  }

  async listOrders(visitId: string, tenantSchema: string, status?: OrderStatus) {
    const query = this.db.withSchema(tenantSchema)
      .select(
        'mo.*',
        'u.name as ordered_by_name',
        this.db.raw(`(
          SELECT json_agg(json_build_object(
            'id', moe.id,
            'executed_by', moe.executed_by,
            'executed_by_name', eu.name,
            'executed_at', moe.executed_at,
            'catatan', moe.catatan
          ) ORDER BY moe.executed_at DESC)
          FROM "${tenantSchema}".medical_order_executions moe
          JOIN "${tenantSchema}".users eu ON eu.id = moe.executed_by
          WHERE moe.order_id = mo.id
        ) as executions`),
      )
      .from('medical_orders as mo')
      .join('users as u', 'u.id', 'mo.ordered_by')
      .where('mo.visit_id', visitId)

    if (status) {
      query.andWhere('mo.status', status)
    }

    return query.orderBy([
      { column: 'mo.prioritas', order: 'asc' },
      { column: 'mo.created_at', order: 'desc' },
    ])
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    tenantSchema: string,
    userId: string,
    reason?: string,
  ) {
    const order = await this.db.withSchema(tenantSchema)
      .select('*').from('medical_orders').where({ id: orderId }).first()
    if (!order) throw new NotFoundError('Instruksi medis')

    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new ValidationError(`Instruksi sudah ${order.status}, tidak bisa diubah`)
    }

    const update: Record<string, unknown> = { status }
    if (status === 'completed' || status === 'discontinued' || status === 'cancelled') {
      update.ended_at = new Date()
    }
    if (reason && status === 'discontinued') {
      update.discontinued_reason = reason
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .update(update).from('medical_orders')
      .where({ id: orderId }).returning('*')

    logger.info('Medical order status updated', { orderId, status })
    return updated
  }

  async executeOrder(
    orderId: string,
    tenantSchema: string,
    userId: string,
    catatan?: string,
  ) {
    const order = await this.db.withSchema(tenantSchema)
      .select('*').from('medical_orders').where({ id: orderId }).first()
    if (!order) throw new NotFoundError('Instruksi medis')
    if (order.status !== 'active') {
      throw new ValidationError('Hanya instruksi aktif yang bisa dieksekusi')
    }

    const [execution] = await this.db.withSchema(tenantSchema)
      .insert({
        order_id: orderId,
        executed_by: userId,
        executed_at: new Date(),
        catatan: catatan || null,
      })
      .into('medical_order_executions')
      .returning('*')

    logger.info('Medical order executed', { orderId, executionId: execution.id })
    return execution
  }

  async deleteOrder(orderId: string, tenantSchema: string) {
    const order = await this.db.withSchema(tenantSchema)
      .select('id', 'status').from('medical_orders').where({ id: orderId }).first()
    if (!order) throw new NotFoundError('Instruksi medis')

    await this.db.withSchema(tenantSchema)
      .delete().from('medical_orders').where({ id: orderId })
    return { success: true }
  }

  // ==================== NURSING NOTES ====================

  async createNursingNote(
    data: {
      visit_id: string
      patient_id: string
      shift: NursingShift
      tanggal?: string
      situation?: string
      background?: string
      assessment?: string
      recommendation?: string
      tindakan_keperawatan?: { waktu: string; tindakan: string; hasil?: string }[]
      intake_cairan?: number
      output_cairan?: number
      catatan_tambahan?: string
    },
    tenantSchema: string,
    userId: string,
  ) {
    const visit = await this.db.withSchema(tenantSchema)
      .select('id').from('visits').where({ id: data.visit_id }).first()
    if (!visit) throw new NotFoundError('Kunjungan')

    const tanggal = data.tanggal || new Date().toISOString().split('T')[0]

    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('nursing_notes')
      .where({ visit_id: data.visit_id, nurse_id: userId, shift: data.shift, tanggal })
      .first()

    if (existing) {
      throw new ConflictError(
        `Catatan keperawatan shift ${data.shift} tanggal ${tanggal} sudah ada. Gunakan update.`,
      )
    }

    const [note] = await this.db.withSchema(tenantSchema)
      .insert({
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        nurse_id: userId,
        shift: data.shift,
        tanggal,
        situation: data.situation || null,
        background: data.background || null,
        assessment: data.assessment || null,
        recommendation: data.recommendation || null,
        tindakan_keperawatan: JSON.stringify(data.tindakan_keperawatan || []),
        intake_cairan: data.intake_cairan ?? null,
        output_cairan: data.output_cairan ?? null,
        catatan_tambahan: data.catatan_tambahan || null,
      })
      .into('nursing_notes')
      .returning('*')

    logger.info('Nursing note created', {
      noteId: note.id, visitId: data.visit_id, shift: data.shift,
    })
    return note
  }

  async updateNursingNote(
    noteId: string,
    data: {
      situation?: string
      background?: string
      assessment?: string
      recommendation?: string
      tindakan_keperawatan?: { waktu: string; tindakan: string; hasil?: string }[]
      intake_cairan?: number
      output_cairan?: number
      catatan_tambahan?: string
    },
    tenantSchema: string,
  ) {
    const note = await this.db.withSchema(tenantSchema)
      .select('id', 'is_finalized').from('nursing_notes').where({ id: noteId }).first()
    if (!note) throw new NotFoundError('Catatan keperawatan')
    if (note.is_finalized) throw new ValidationError('Catatan sudah difinalisasi')

    const update: Record<string, unknown> = {}
    if (data.situation !== undefined) update.situation = data.situation
    if (data.background !== undefined) update.background = data.background
    if (data.assessment !== undefined) update.assessment = data.assessment
    if (data.recommendation !== undefined) update.recommendation = data.recommendation
    if (data.tindakan_keperawatan !== undefined) {
      update.tindakan_keperawatan = JSON.stringify(data.tindakan_keperawatan)
    }
    if (data.intake_cairan !== undefined) update.intake_cairan = data.intake_cairan
    if (data.output_cairan !== undefined) update.output_cairan = data.output_cairan
    if (data.catatan_tambahan !== undefined) update.catatan_tambahan = data.catatan_tambahan

    const [updated] = await this.db.withSchema(tenantSchema)
      .update(update).from('nursing_notes').where({ id: noteId }).returning('*')
    return updated
  }

  async finalizeNursingNote(noteId: string, tenantSchema: string) {
    const note = await this.db.withSchema(tenantSchema)
      .select('id', 'is_finalized').from('nursing_notes').where({ id: noteId }).first()
    if (!note) throw new NotFoundError('Catatan keperawatan')
    if (note.is_finalized) throw new ValidationError('Sudah difinalisasi')

    const [updated] = await this.db.withSchema(tenantSchema)
      .update({ is_finalized: true, finalized_at: new Date() })
      .from('nursing_notes').where({ id: noteId }).returning('*')
    return updated
  }

  async listNursingNotes(visitId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('nn.*', 'u.name as nurse_name')
      .from('nursing_notes as nn')
      .join('users as u', 'u.id', 'nn.nurse_id')
      .where('nn.visit_id', visitId)
      .orderBy([
        { column: 'nn.tanggal', order: 'desc' },
        { column: 'nn.shift', order: 'asc' },
      ])
  }

  async deleteNursingNote(noteId: string, tenantSchema: string) {
    const note = await this.db.withSchema(tenantSchema)
      .select('id', 'is_finalized').from('nursing_notes').where({ id: noteId }).first()
    if (!note) throw new NotFoundError('Catatan keperawatan')
    if (note.is_finalized) throw new ValidationError('Catatan sudah final, tidak bisa dihapus')

    await this.db.withSchema(tenantSchema)
      .delete().from('nursing_notes').where({ id: noteId })
    return { success: true }
  }

  // ==================== DISCHARGE PLANNING ====================

  async getOrCreateDischargePlan(
    visitId: string,
    patientId: string,
    tenantSchema: string,
    userId: string,
  ) {
    let plan = await this.db.withSchema(tenantSchema)
      .select('dp.*', 'u.name as created_by_name')
      .from('discharge_plans as dp')
      .join('users as u', 'u.id', 'dp.created_by')
      .where('dp.visit_id', visitId)
      .first()

    if (!plan) {
      const [created] = await this.db.withSchema(tenantSchema)
        .insert({
          visit_id: visitId,
          patient_id: patientId,
          created_by: userId,
          readiness: 'not_ready',
        })
        .into('discharge_plans')
        .returning('*')

      plan = await this.db.withSchema(tenantSchema)
        .select('dp.*', 'u.name as created_by_name')
        .from('discharge_plans as dp')
        .join('users as u', 'u.id', 'dp.created_by')
        .where('dp.id', created.id)
        .first()
    }

    return plan
  }

  async updateDischargePlan(
    planId: string,
    data: {
      klinis_stabil?: boolean
      luka_kering?: boolean
      intake_oral_baik?: boolean
      mobilisasi_mandiri?: boolean
      obat_pulang_siap?: boolean
      edukasi_diberikan?: boolean
      jadwal_kontrol_set?: boolean
      resume_final?: boolean
      billing_selesai?: boolean
      surat_sakit?: boolean
      obat_pulang?: { nama: string; dosis: string; frekuensi: string; durasi: string }[]
      jadwal_kontrol_tanggal?: string
      jadwal_kontrol_poli?: string
      jadwal_kontrol_dokter?: string
      edukasi_catatan?: string
      catatan?: string
    },
    tenantSchema: string,
  ) {
    const plan = await this.db.withSchema(tenantSchema)
      .select('id').from('discharge_plans').where({ id: planId }).first()
    if (!plan) throw new NotFoundError('Discharge plan')

    const update: Record<string, unknown> = {}
    const boolFields = [
      'klinis_stabil', 'luka_kering', 'intake_oral_baik', 'mobilisasi_mandiri',
      'obat_pulang_siap', 'edukasi_diberikan', 'jadwal_kontrol_set',
      'resume_final', 'billing_selesai', 'surat_sakit',
    ] as const

    for (const f of boolFields) {
      if (data[f] !== undefined) update[f] = data[f]
    }
    if (data.obat_pulang !== undefined) update.obat_pulang = JSON.stringify(data.obat_pulang)
    if (data.jadwal_kontrol_tanggal !== undefined) update.jadwal_kontrol_tanggal = data.jadwal_kontrol_tanggal
    if (data.jadwal_kontrol_poli !== undefined) update.jadwal_kontrol_poli = data.jadwal_kontrol_poli
    if (data.jadwal_kontrol_dokter !== undefined) update.jadwal_kontrol_dokter = data.jadwal_kontrol_dokter
    if (data.edukasi_catatan !== undefined) update.edukasi_catatan = data.edukasi_catatan
    if (data.catatan !== undefined) update.catatan = data.catatan

    // Auto-calculate readiness
    const merged = { ...plan, ...update }
    const checkedCount = boolFields.filter((f) => merged[f] === true).length
    if (checkedCount === boolFields.length) {
      update.readiness = 'ready'
    } else if (checkedCount >= 5) {
      update.readiness = 'partial'
    } else {
      update.readiness = 'not_ready'
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .update(update).from('discharge_plans').where({ id: planId }).returning('*')

    logger.info('Discharge plan updated', { planId, readiness: updated.readiness })
    return updated
  }

  // ==================== INPATIENT LIST ====================

  async listInpatients(tenantSchema: string, filters?: {
    search?: string
    roomId?: string
    doctorId?: string
  }) {
    const query = this.db.withSchema(tenantSchema)
      .select(
        'v.id as visit_id',
        'v.tanggal', 'v.status', 'v.tipe',
        'v.created_at as admission_date',
        'p.id as patient_id', 'p.nama', 'p.no_rekam_medis', 'p.tanggal_lahir',
        'p.jenis_kelamin', 'p.alergi',
        'b.id as bed_id', 'b.nomor as bed_nomor',
        'r.id as room_id', 'r.nama as room_nama', 'r.kode as room_kode',
        'r.kelas as room_kelas', 'r.tarif_per_hari',
        'doc.id as doctor_id',
        'u.name as doctor_name',
        this.db.raw(`
          EXTRACT(DAY FROM NOW() - v.created_at)::int + 1 as hari_rawat
        `),
        this.db.raw(`
          (SELECT vs.recorded_at FROM "${tenantSchema}".vital_signs vs
           WHERE vs.visit_id = v.id ORDER BY vs.recorded_at DESC LIMIT 1) as last_vital_at
        `),
        this.db.raw(`
          (SELECT vs.alert_level FROM "${tenantSchema}".vital_signs vs
           WHERE vs.visit_id = v.id ORDER BY vs.recorded_at DESC LIMIT 1) as last_vital_alert
        `),
      )
      .from('visits as v')
      .join('patients as p', 'p.id', 'v.patient_id')
      .leftJoin('beds as b', 'b.id', 'v.bed_id')
      .leftJoin('rooms as r', 'r.id', 'b.room_id')
      .leftJoin('doctors as doc', 'doc.id', 'v.doctor_id')
      .leftJoin('users as u', 'u.id', 'doc.user_id')
      .whereIn('v.status', ['rawat_inap', 'diperiksa'])
      .andWhere('v.tipe', 'rawat_inap')

    if (filters?.search) {
      const s = `%${filters.search}%`
      query.andWhere(function () {
        this.where('p.nama', 'ilike', s)
          .orWhere('p.no_rekam_medis', 'ilike', s)
      })
    }
    if (filters?.roomId) query.andWhere('r.id', filters.roomId)
    if (filters?.doctorId) query.andWhere('doc.id', filters.doctorId)

    return query.orderBy([
      { column: 'r.nama', order: 'asc' },
      { column: 'b.nomor', order: 'asc' },
    ])
  }

  // ==================== PATIENT CLINICAL SUMMARY ====================

  async getPatientClinicalSummary(visitId: string, tenantSchema: string) {
    const visit = await this.db.withSchema(tenantSchema)
      .select(
        'v.*',
        'p.nama', 'p.no_rekam_medis', 'p.tanggal_lahir', 'p.jenis_kelamin',
        'p.golongan_darah', 'p.alergi',
        'b.nomor as bed_nomor',
        'r.nama as room_nama', 'r.kode as room_kode', 'r.kelas as room_kelas',
        'r.tarif_per_hari',
        'u.name as doctor_name',
      )
      .from('visits as v')
      .join('patients as p', 'p.id', 'v.patient_id')
      .leftJoin('beds as b', 'b.id', 'v.bed_id')
      .leftJoin('rooms as r', 'r.id', 'b.room_id')
      .leftJoin('doctors as doc', 'doc.id', 'v.doctor_id')
      .leftJoin('users as u', 'u.id', 'doc.user_id')
      .where('v.id', visitId)
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    const [latestVitals, activeOrders, dischargePlan] = await Promise.all([
      this.getLatestVitals(visitId, tenantSchema),
      this.listOrders(visitId, tenantSchema, 'active'),
      this.db.withSchema(tenantSchema)
        .select('*').from('discharge_plans').where({ visit_id: visitId }).first(),
    ])

    const hariRawat = Math.max(1, Math.ceil(
      (Date.now() - new Date(visit.created_at).getTime()) / 86400000,
    ))

    return {
      visit,
      hariRawat,
      latestVitals,
      activeOrdersCount: activeOrders.length,
      dischargePlan: dischargePlan || null,
    }
  }
}
