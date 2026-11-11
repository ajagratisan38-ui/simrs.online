import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

// Morse Fall Scale scoring
function calculateMorseFallScore(data: {
  jatuh_riwayat?: boolean
  jatuh_diagnosis_sekunder?: boolean
  jatuh_alat_bantu?: string
  jatuh_terpasang_infus?: boolean
  jatuh_cara_berjalan?: string
  jatuh_status_mental?: string
}): { skor: number; kategori: string } {
  let skor = 0
  if (data.jatuh_riwayat) skor += 25
  if (data.jatuh_diagnosis_sekunder) skor += 15
  if (data.jatuh_alat_bantu === 'kruk_tongkat_walker') skor += 15
  else if (data.jatuh_alat_bantu === 'furniture') skor += 30
  if (data.jatuh_terpasang_infus) skor += 20
  if (data.jatuh_cara_berjalan === 'lemah') skor += 10
  else if (data.jatuh_cara_berjalan === 'terganggu') skor += 20
  if (data.jatuh_status_mental === 'lupa_keterbatasan') skor += 15

  const kategori = skor <= 24 ? 'rendah' : skor <= 50 ? 'sedang' : 'tinggi'
  return { skor, kategori }
}

// Barthel Index scoring
function calculateBarthelScore(data: Record<string, number>): { skor: number; kategori: string } {
  const fields = [
    'barthel_makan', 'barthel_mandi', 'barthel_perawatan_diri',
    'barthel_berpakaian', 'barthel_bab', 'barthel_bak',
    'barthel_toileting', 'barthel_transfer', 'barthel_mobilitas',
    'barthel_naik_tangga',
  ]
  const skor = fields.reduce((sum, f) => sum + (data[f] ?? 0), 0)
  const kategori = skor >= 80 ? 'mandiri'
    : skor >= 60 ? 'ketergantungan_ringan'
    : skor >= 40 ? 'ketergantungan_sedang'
    : skor >= 20 ? 'ketergantungan_berat'
    : 'ketergantungan_total'
  return { skor, kategori }
}

// Nutrition screening
function calculateNutritionScore(data: {
  nutrisi_penurunan_bb?: boolean
  nutrisi_asupan_kurang?: boolean
  nutrisi_kondisi_khusus?: boolean
}): { skor: number; kategori: string } {
  let skor = 0
  if (data.nutrisi_penurunan_bb) skor += 2
  if (data.nutrisi_asupan_kurang) skor += 1
  if (data.nutrisi_kondisi_khusus) skor += 1
  const kategori = skor >= 2 ? 'berisiko' : 'tidak_berisiko'
  return { skor, kategori }
}

export class NursingService {
  constructor(private db: Knex) {}

  async create(
    data: Record<string, unknown>,
    userId: string,
    tenantSchema: string,
  ) {
    const visit = await this.db.withSchema(tenantSchema)
      .select('id', 'patient_id').from('visits')
      .where({ id: data.visit_id }).first()
    if (!visit) throw new NotFoundError('Kunjungan')

    // Check if assessment already exists for this visit
    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('nursing_assessments')
      .where({ visit_id: data.visit_id }).first()
    if (existing) throw new ValidationError('Pengkajian keperawatan sudah ada untuk kunjungan ini')

    // Auto-calculate scores
    const morseData = calculateMorseFallScore(data as Record<string, boolean | string>)
    const barthelData = calculateBarthelScore(data as Record<string, number>)
    const nutrisiData = calculateNutritionScore(data as Record<string, boolean>)

    // Calculate IMT
    const bb = Number(data.berat_badan) || 0
    const tb = Number(data.tinggi_badan) || 0
    const imt = tb > 0 ? bb / ((tb / 100) ** 2) : null

    const insertData: Record<string, unknown> = {
      ...data,
      patient_id: visit.patient_id,
      nurse_id: userId,
      imt: imt ? Number(imt.toFixed(2)) : null,
      jatuh_skor_total: morseData.skor,
      jatuh_kategori: morseData.kategori,
      barthel_skor_total: barthelData.skor,
      barthel_kategori: barthelData.kategori,
      nutrisi_skor: nutrisiData.skor,
      nutrisi_kategori: nutrisiData.kategori,
      created_by: userId,
      updated_by: userId,
    }

    const [assessment] = await this.db.withSchema(tenantSchema)
      .insert(insertData).into('nursing_assessments').returning('*')

    logger.info('Nursing assessment created', { id: assessment.id, visit: data.visit_id })
    return assessment
  }

  async update(
    id: string,
    data: Record<string, unknown>,
    userId: string,
    tenantSchema: string,
  ) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id', 'status').from('nursing_assessments').where({ id }).first()
    if (!existing) throw new NotFoundError('Pengkajian keperawatan')
    if (existing.status === 'final') {
      throw new ValidationError('Pengkajian yang sudah final tidak bisa diubah')
    }

    // Recalculate scores
    const morseData = calculateMorseFallScore(data as Record<string, boolean | string>)
    const barthelData = calculateBarthelScore(data as Record<string, number>)
    const nutrisiData = calculateNutritionScore(data as Record<string, boolean>)

    const bb = Number(data.berat_badan) || 0
    const tb = Number(data.tinggi_badan) || 0
    const imt = tb > 0 ? bb / ((tb / 100) ** 2) : null

    const updateData: Record<string, unknown> = {
      ...data,
      imt: imt ? Number(imt.toFixed(2)) : null,
      jatuh_skor_total: morseData.skor,
      jatuh_kategori: morseData.kategori,
      barthel_skor_total: barthelData.skor,
      barthel_kategori: barthelData.kategori,
      nutrisi_skor: nutrisiData.skor,
      nutrisi_kategori: nutrisiData.kategori,
      updated_by: userId,
    }

    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.visit_id
    delete updateData.patient_id
    delete updateData.nurse_id
    delete updateData.created_at
    delete updateData.created_by

    const [updated] = await this.db.withSchema(tenantSchema)
      .table('nursing_assessments').where({ id }).update(updateData).returning('*')
    return updated
  }

  async finalize(id: string, userId: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id', 'status').from('nursing_assessments').where({ id }).first()
    if (!existing) throw new NotFoundError('Pengkajian keperawatan')
    if (existing.status === 'final') {
      throw new ValidationError('Pengkajian sudah final')
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .table('nursing_assessments').where({ id })
      .update({ status: 'final', updated_by: userId }).returning('*')
    return updated
  }

  async getByVisit(visitId: string, tenantSchema: string) {
    const assessment = await this.db.withSchema(tenantSchema)
      .select('na.*', 'u.name as nurse_nama')
      .from('nursing_assessments as na')
      .leftJoin('users as u', 'na.nurse_id', 'u.id')
      .where('na.visit_id', visitId)
      .first()
    return assessment || null
  }

  async getById(id: string, tenantSchema: string) {
    const assessment = await this.db.withSchema(tenantSchema)
      .select('na.*', 'u.name as nurse_nama')
      .from('nursing_assessments as na')
      .leftJoin('users as u', 'na.nurse_id', 'u.id')
      .where('na.id', id)
      .first()
    if (!assessment) throw new NotFoundError('Pengkajian keperawatan')
    return assessment
  }

  async listByPatient(patientId: string, tenantSchema: string, limit = 20) {
    return this.db.withSchema(tenantSchema)
      .select(
        'na.id', 'na.visit_id', 'na.tanggal_pengkajian', 'na.status',
        'na.jatuh_kategori', 'na.barthel_kategori', 'na.nutrisi_kategori',
        'na.nyeri_skala', 'na.tekanan_darah_sistolik', 'na.tekanan_darah_diastolik',
        'na.nadi', 'na.suhu', 'na.respirasi', 'na.spo2',
        'u.name as nurse_nama',
        'v.visit_number', 'v.tanggal as visit_tanggal',
      )
      .from('nursing_assessments as na')
      .leftJoin('users as u', 'na.nurse_id', 'u.id')
      .leftJoin('visits as v', 'na.visit_id', 'v.id')
      .where('na.patient_id', patientId)
      .orderBy('na.tanggal_pengkajian', 'desc')
      .limit(limit)
  }

  async delete(id: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('status').from('nursing_assessments').where({ id }).first()
    if (!existing) throw new NotFoundError('Pengkajian keperawatan')
    if (existing.status === 'final') {
      throw new ValidationError('Pengkajian final tidak bisa dihapus')
    }
    await this.db.withSchema(tenantSchema).table('nursing_assessments').where({ id }).del()
  }
}
