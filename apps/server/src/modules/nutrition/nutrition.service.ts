import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

export interface AdimeAssessment {
  bb?: number
  tb?: number
  imt?: number
  lla?: number
  albumin?: number
  hb?: number
  gds?: number
  fisik?: string
  riwayat_makan?: string
  riwayat_penyakit?: string
}

export interface AdimeIntervention {
  jenis_diet?: string
  bentuk_makanan?: string
  jalur_pemberian?: string
  frekuensi?: string
  keterangan?: string
}

export interface AdimeMonitoring {
  parameter?: string[]
  frekuensi?: string
  catatan?: string
}

export interface AdimeEvaluation {
  hasil?: 'membaik' | 'memburuk' | 'tetap'
  target_tercapai?: boolean
  catatan?: string
  tindak_lanjut?: string
}

export interface CreateNutritionOrderInput {
  visit_id: string
  patient_id: string
  diet_type: string
  kalori_target: number
  protein_target?: number
  karbohidrat_target?: number
  lemak_target?: number
  catatan_diet?: string
  alergi_makanan?: string[]
  pantangan?: string[]
  assessment?: AdimeAssessment
  diagnosis_gizi?: string
  intervention?: AdimeIntervention
  monitoring?: AdimeMonitoring
  evaluation?: AdimeEvaluation
}

export interface UpdateNutritionOrderInput {
  diet_type?: string
  kalori_target?: number
  protein_target?: number
  karbohidrat_target?: number
  lemak_target?: number
  catatan_diet?: string
  alergi_makanan?: string[]
  pantangan?: string[]
  status?: 'aktif' | 'selesai'
  assessment?: AdimeAssessment
  diagnosis_gizi?: string
  intervention?: AdimeIntervention
  monitoring?: AdimeMonitoring
  evaluation?: AdimeEvaluation
}

export interface NutritionLogInput {
  nutrition_order_id: string
  waktu_makan: 'pagi' | 'siang' | 'sore' | 'snack_pagi' | 'snack_sore'
  menu: string
  porsi_disajikan: number
  porsi_dimakan: number
  catatan?: string
}

export class NutritionService {
  constructor(private db: Knex) {}

  async createOrder(
    data: CreateNutritionOrderInput,
    userId: string,
    tenantSchema: string,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'patient_id', 'status', 'tipe')
      .from('visits')
      .where({ id: data.visit_id })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')
    if (visit.tipe !== 'rawat_inap') {
      throw new ValidationError('Order gizi hanya untuk pasien rawat inap')
    }

    // Check no active order for this visit
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('nutrition_orders')
      .where({ visit_id: data.visit_id, status: 'aktif' })
      .first()

    if (existing) {
      throw new ValidationError('Sudah ada order gizi aktif untuk kunjungan ini')
    }

    const imt = data.assessment?.bb && data.assessment?.tb
      ? +(data.assessment.bb / ((data.assessment.tb / 100) ** 2)).toFixed(2)
      : data.assessment?.imt || null

    const [order] = await this.db
      .withSchema(tenantSchema)
      .insert({
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        diet_type: data.diet_type,
        kalori_target: data.kalori_target,
        protein_target: data.protein_target || null,
        karbohidrat_target: data.karbohidrat_target || null,
        lemak_target: data.lemak_target || null,
        catatan_diet: data.catatan_diet || null,
        alergi_makanan: JSON.stringify(data.alergi_makanan || []),
        pantangan: JSON.stringify(data.pantangan || []),
        assessment_bb: data.assessment?.bb || null,
        assessment_tb: data.assessment?.tb || null,
        assessment_imt: imt,
        assessment_lla: data.assessment?.lla || null,
        assessment_albumin: data.assessment?.albumin || null,
        assessment_hb: data.assessment?.hb || null,
        assessment_gds: data.assessment?.gds || null,
        assessment_fisik: data.assessment?.fisik || null,
        assessment_riwayat_makan: data.assessment?.riwayat_makan || null,
        assessment_riwayat_penyakit: data.assessment?.riwayat_penyakit || null,
        diagnosis_gizi: data.diagnosis_gizi || null,
        intervention_jenis_diet: data.intervention?.jenis_diet || null,
        intervention_bentuk_makanan: data.intervention?.bentuk_makanan || null,
        intervention_jalur_pemberian: data.intervention?.jalur_pemberian || null,
        intervention_frekuensi: data.intervention?.frekuensi || null,
        intervention_keterangan: data.intervention?.keterangan || null,
        monitoring_parameter: JSON.stringify(data.monitoring?.parameter || []),
        monitoring_frekuensi: data.monitoring?.frekuensi || null,
        monitoring_catatan: data.monitoring?.catatan || null,
        evaluation_hasil: data.evaluation?.hasil || null,
        evaluation_target_tercapai: data.evaluation?.target_tercapai ?? null,
        evaluation_catatan: data.evaluation?.catatan || null,
        evaluation_tindak_lanjut: data.evaluation?.tindak_lanjut || null,
        status: 'aktif',
        created_by: userId,
        updated_by: userId,
      })
      .into('nutrition_orders')
      .returning('*')

    logger.info('Nutrition order created', { orderId: order.id, visitId: data.visit_id })
    return order
  }

  async updateOrder(
    orderId: string,
    data: UpdateNutritionOrderInput,
    userId: string,
    tenantSchema: string,
  ) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('nutrition_orders')
      .where({ id: orderId })
      .first()

    if (!order) throw new NotFoundError('Order gizi')

    const updateData: Record<string, unknown> = { updated_by: userId }
    if (data.diet_type) updateData.diet_type = data.diet_type
    if (data.kalori_target) updateData.kalori_target = data.kalori_target
    if (data.protein_target !== undefined) updateData.protein_target = data.protein_target
    if (data.karbohidrat_target !== undefined) updateData.karbohidrat_target = data.karbohidrat_target
    if (data.lemak_target !== undefined) updateData.lemak_target = data.lemak_target
    if (data.catatan_diet !== undefined) updateData.catatan_diet = data.catatan_diet
    if (data.alergi_makanan) updateData.alergi_makanan = JSON.stringify(data.alergi_makanan)
    if (data.pantangan) updateData.pantangan = JSON.stringify(data.pantangan)
    if (data.status) updateData.status = data.status

    if (data.assessment) {
      const a = data.assessment
      if (a.bb !== undefined) updateData.assessment_bb = a.bb
      if (a.tb !== undefined) updateData.assessment_tb = a.tb
      if (a.bb && a.tb) {
        updateData.assessment_imt = +(a.bb / ((a.tb / 100) ** 2)).toFixed(2)
      } else if (a.imt !== undefined) {
        updateData.assessment_imt = a.imt
      }
      if (a.lla !== undefined) updateData.assessment_lla = a.lla
      if (a.albumin !== undefined) updateData.assessment_albumin = a.albumin
      if (a.hb !== undefined) updateData.assessment_hb = a.hb
      if (a.gds !== undefined) updateData.assessment_gds = a.gds
      if (a.fisik !== undefined) updateData.assessment_fisik = a.fisik
      if (a.riwayat_makan !== undefined) updateData.assessment_riwayat_makan = a.riwayat_makan
      if (a.riwayat_penyakit !== undefined) updateData.assessment_riwayat_penyakit = a.riwayat_penyakit
    }
    if (data.diagnosis_gizi !== undefined) updateData.diagnosis_gizi = data.diagnosis_gizi
    if (data.intervention) {
      const i = data.intervention
      if (i.jenis_diet !== undefined) updateData.intervention_jenis_diet = i.jenis_diet
      if (i.bentuk_makanan !== undefined) updateData.intervention_bentuk_makanan = i.bentuk_makanan
      if (i.jalur_pemberian !== undefined) updateData.intervention_jalur_pemberian = i.jalur_pemberian
      if (i.frekuensi !== undefined) updateData.intervention_frekuensi = i.frekuensi
      if (i.keterangan !== undefined) updateData.intervention_keterangan = i.keterangan
    }
    if (data.monitoring) {
      const m = data.monitoring
      if (m.parameter) updateData.monitoring_parameter = JSON.stringify(m.parameter)
      if (m.frekuensi !== undefined) updateData.monitoring_frekuensi = m.frekuensi
      if (m.catatan !== undefined) updateData.monitoring_catatan = m.catatan
    }
    if (data.evaluation) {
      const e = data.evaluation
      if (e.hasil !== undefined) updateData.evaluation_hasil = e.hasil
      if (e.target_tercapai !== undefined) updateData.evaluation_target_tercapai = e.target_tercapai
      if (e.catatan !== undefined) updateData.evaluation_catatan = e.catatan
      if (e.tindak_lanjut !== undefined) updateData.evaluation_tindak_lanjut = e.tindak_lanjut
    }

    await this.db
      .withSchema(tenantSchema)
      .from('nutrition_orders')
      .where({ id: orderId })
      .update(updateData)

    return this.db.withSchema(tenantSchema).select('*').from('nutrition_orders').where({ id: orderId }).first()
  }

  async addLog(data: NutritionLogInput, userId: string, tenantSchema: string) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('nutrition_orders')
      .where({ id: data.nutrition_order_id })
      .first()

    if (!order) throw new NotFoundError('Order gizi')
    if (order.status !== 'aktif') {
      throw new ValidationError('Order gizi sudah tidak aktif')
    }

    const [log] = await this.db
      .withSchema(tenantSchema)
      .insert({
        nutrition_order_id: data.nutrition_order_id,
        waktu_makan: data.waktu_makan,
        menu: data.menu,
        porsi_disajikan: data.porsi_disajikan,
        porsi_dimakan: data.porsi_dimakan,
        catatan: data.catatan || null,
        tanggal: new Date().toISOString().slice(0, 10),
        created_by: userId,
      })
      .into('nutrition_logs')
      .returning('*')

    return log
  }

  async listOrders(tenantSchema: string, status?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const query = this.db
      .withSchema(tenantSchema)
      .from('nutrition_orders as no')
      .join('patients as p', 'p.id', 'no.patient_id')
      .join('visits as v', 'v.id', 'no.visit_id')

    if (status) query.where('no.status', status)

    const [{ count }] = await query.clone().count('no.id as count')
    const total = Number(count)

    const orders = await query
      .clone()
      .select(
        'no.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'v.visit_number',
      )
      .orderBy('no.created_at', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: orders,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getOrderWithLogs(orderId: string, tenantSchema: string) {
    const order = await this.db
      .withSchema(tenantSchema)
      .select(
        'no.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.jenis_kelamin',
        'p.tanggal_lahir',
        'v.visit_number',
      )
      .from('nutrition_orders as no')
      .join('patients as p', 'p.id', 'no.patient_id')
      .join('visits as v', 'v.id', 'no.visit_id')
      .where('no.id', orderId)
      .first()

    if (!order) throw new NotFoundError('Order gizi')

    const logs = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('nutrition_logs')
      .where({ nutrition_order_id: orderId })
      .orderBy('tanggal', 'desc')
      .orderByRaw(`
        CASE waktu_makan
          WHEN 'pagi' THEN 0
          WHEN 'snack_pagi' THEN 1
          WHEN 'siang' THEN 2
          WHEN 'snack_sore' THEN 3
          WHEN 'sore' THEN 4
        END
      `)

    return { ...order, logs }
  }

  async getByVisit(visitId: string, tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('nutrition_orders')
      .where({ visit_id: visitId })
      .orderBy('created_at', 'desc')
  }

  // ═══════ NUTRITION CALCULATOR ═══════

  calculateNeeds(params: {
    bb: number
    tb: number
    umur: number
    jenis_kelamin: 'L' | 'P'
    aktivitas: 'bedrest' | 'ringan' | 'sedang' | 'berat'
    stress_factor?: number
  }) {
    const { bb, tb, umur, jenis_kelamin, aktivitas, stress_factor = 1.0 } = params

    // Harris-Benedict BMR
    const bmr = jenis_kelamin === 'L'
      ? 66.5 + (13.75 * bb) + (5.003 * tb) - (6.775 * umur)
      : 655.1 + (9.563 * bb) + (1.850 * tb) - (4.676 * umur)

    // Mifflin-St Jeor
    const mifflin = jenis_kelamin === 'L'
      ? (10 * bb) + (6.25 * tb) - (5 * umur) + 5
      : (10 * bb) + (6.25 * tb) - (5 * umur) - 161

    const activityFactor: Record<string, number> = {
      bedrest: 1.2, ringan: 1.375, sedang: 1.55, berat: 1.725,
    }
    const af = activityFactor[aktivitas] || 1.375

    const tdee_hb = Math.round(bmr * af * stress_factor)
    const tdee_mifflin = Math.round(mifflin * af * stress_factor)

    const imt = +(bb / ((tb / 100) ** 2)).toFixed(1)
    let status_imt = 'Normal'
    if (imt < 18.5) status_imt = 'Underweight'
    else if (imt >= 25 && imt < 30) status_imt = 'Overweight'
    else if (imt >= 30) status_imt = 'Obesitas'

    const bbi = jenis_kelamin === 'L'
      ? (tb - 100) - ((tb - 100) * 0.1)
      : (tb - 100) - ((tb - 100) * 0.15)

    // Macro distribution (standard: 55% carb, 20% protein, 25% fat)
    const kalori = Math.round((tdee_hb + tdee_mifflin) / 2)
    const protein_g = Math.round((kalori * 0.20) / 4)
    const karbohidrat_g = Math.round((kalori * 0.55) / 4)
    const lemak_g = Math.round((kalori * 0.25) / 9)

    // Protein per kg BB
    const protein_per_kg = +(protein_g / bb).toFixed(1)

    return {
      bmr_harris_benedict: Math.round(bmr),
      bmr_mifflin: Math.round(mifflin),
      tdee_harris_benedict: tdee_hb,
      tdee_mifflin,
      kalori_rekomendasi: kalori,
      protein_g,
      karbohidrat_g,
      lemak_g,
      protein_per_kg,
      imt, status_imt,
      berat_badan_ideal: Math.round(bbi),
      activity_factor: af,
      stress_factor,
    }
  }

  // ═══════ FOOD ITEMS (Master Bahan Makanan) ═══════

  async listFoodItems(tenantSchema: string, kategori?: string, search?: string) {
    const q = this.db.withSchema(tenantSchema).select('*').from('food_items').where({ is_active: true })
    if (kategori) q.andWhere({ kategori })
    if (search) q.andWhere(function () {
      this.whereILike('nama', `%${search}%`)
    })
    return q.orderBy('kategori').orderBy('nama')
  }

  async createFoodItem(data: Record<string, unknown>, tenantSchema: string) {
    const [item] = await this.db.withSchema(tenantSchema)
      .insert(data).into('food_items').returning('*')
    return item
  }

  async updateFoodItem(id: string, data: Record<string, unknown>, tenantSchema: string) {
    await this.db.withSchema(tenantSchema).from('food_items').where({ id }).update({ ...data, updated_at: new Date() })
    return this.db.withSchema(tenantSchema).select('*').from('food_items').where({ id }).first()
  }

  async deleteFoodItem(id: string, tenantSchema: string) {
    await this.db.withSchema(tenantSchema).from('food_items').where({ id }).update({ is_active: false })
  }

  // ═══════ MEAL PLANS ═══════

  async listMealPlans(tenantSchema: string, search?: string) {
    const q = this.db.withSchema(tenantSchema).select('*').from('meal_plans').where({ is_active: true })
    if (search) q.andWhereILike('nama', `%${search}%`)
    return q.orderBy('created_at', 'desc')
  }

  async getMealPlan(id: string, tenantSchema: string) {
    const plan = await this.db.withSchema(tenantSchema).select('*').from('meal_plans').where({ id }).first()
    if (!plan) throw new NotFoundError('Meal plan')
    const items = await this.db.withSchema(tenantSchema)
      .select('mpi.*', 'fi.nama as food_item_nama', 'fi.kategori as food_item_kategori')
      .from('meal_plan_items as mpi')
      .leftJoin('food_items as fi', 'fi.id', 'mpi.food_item_id')
      .where({ 'mpi.meal_plan_id': id })
      .orderByRaw(`CASE mpi.waktu_makan
        WHEN 'pagi' THEN 0 WHEN 'snack_pagi' THEN 1 WHEN 'siang' THEN 2
        WHEN 'snack_sore' THEN 3 WHEN 'sore' THEN 4 END`)
    return { ...plan, items }
  }

  async createMealPlan(
    data: { nama: string; diet_type: string; catatan?: string; items: MealPlanItemInput[] },
    userId: string,
    tenantSchema: string,
  ) {
    return this.db.transaction(async (trx) => {
      const totals = data.items.reduce((acc, i) => ({
        kalori: acc.kalori + (i.kalori || 0),
        protein: acc.protein + (i.protein || 0),
        karbohidrat: acc.karbohidrat + (i.karbohidrat || 0),
        lemak: acc.lemak + (i.lemak || 0),
        cost: acc.cost + (i.harga || 0),
      }), { kalori: 0, protein: 0, karbohidrat: 0, lemak: 0, cost: 0 })

      const [plan] = await trx.withSchema(tenantSchema).insert({
        nama: data.nama, diet_type: data.diet_type, catatan: data.catatan || null,
        kalori_total: totals.kalori, protein_total: totals.protein,
        karbohidrat_total: totals.karbohidrat, lemak_total: totals.lemak,
        total_cost: totals.cost, created_by: userId,
      }).into('meal_plans').returning('*')

      if (data.items.length > 0) {
        const rows = data.items.map(i => ({
          meal_plan_id: plan.id,
          waktu_makan: i.waktu_makan,
          food_item_id: i.food_item_id || null,
          nama_menu: i.nama_menu,
          porsi: i.porsi || 1,
          satuan: i.satuan || 'porsi',
          kalori: i.kalori || 0, protein: i.protein || 0,
          karbohidrat: i.karbohidrat || 0, lemak: i.lemak || 0,
          harga: i.harga || 0,
        }))
        await trx.withSchema(tenantSchema).insert(rows).into('meal_plan_items')
      }

      logger.info('Meal plan created', { planId: plan.id })
      return this.getMealPlan(plan.id, tenantSchema)
    })
  }

  async deleteMealPlan(id: string, tenantSchema: string) {
    await this.db.withSchema(tenantSchema).from('meal_plans').where({ id }).update({ is_active: false })
  }

  // ═══════ FOOD COST SUMMARY ═══════

  async getFoodCostSummary(tenantSchema: string, dateFrom?: string, dateTo?: string) {
    const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const to = dateTo || new Date().toISOString().slice(0, 10)

    const logs = await this.db.withSchema(tenantSchema)
      .select(
        this.db.raw('COUNT(nl.id) as total_servings'),
        this.db.raw('SUM(nl.porsi_disajikan) as total_porsi_disajikan'),
        this.db.raw('SUM(nl.porsi_dimakan) as total_porsi_dimakan'),
      )
      .from('nutrition_logs as nl')
      .whereBetween('nl.tanggal', [from, to])
      .first()

    const planCosts = await this.db.withSchema(tenantSchema)
      .select(
        this.db.raw('COUNT(id) as total_plans'),
        this.db.raw('COALESCE(SUM(total_cost), 0) as total_cost_all_plans'),
        this.db.raw('COALESCE(AVG(total_cost), 0) as avg_cost_per_plan'),
      )
      .from('meal_plans')
      .where({ is_active: true })
      .first()

    const activeOrders = await this.db.withSchema(tenantSchema)
      .from('nutrition_orders')
      .where({ status: 'aktif' })
      .count('id as count')
      .first()

    return {
      period: { from, to },
      servings: {
        total: Number(logs?.total_servings || 0),
        porsi_disajikan: Number(logs?.total_porsi_disajikan || 0),
        porsi_dimakan: Number(logs?.total_porsi_dimakan || 0),
        waste_percentage: logs?.total_porsi_disajikan
          ? Math.round((1 - Number(logs.total_porsi_dimakan) / Number(logs.total_porsi_disajikan)) * 100)
          : 0,
      },
      meal_plans: {
        total: Number(planCosts?.total_plans || 0),
        total_cost: Number(planCosts?.total_cost_all_plans || 0),
        avg_cost_per_plan: Math.round(Number(planCosts?.avg_cost_per_plan || 0)),
      },
      active_orders: Number(activeOrders?.count || 0),
    }
  }
}

interface MealPlanItemInput {
  waktu_makan: string
  food_item_id?: string
  nama_menu: string
  porsi?: number
  satuan?: string
  kalori?: number
  protein?: number
  karbohidrat?: number
  lemak?: number
  harga?: number
}
