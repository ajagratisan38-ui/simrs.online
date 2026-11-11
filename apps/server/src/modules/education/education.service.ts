import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'

// --- Input types ---

export interface CreateTopicInput {
  kode: string
  nama: string
  kategori: string
  deskripsi?: string
  materi?: string
}

export interface UpdateTopicInput {
  kode?: string
  nama?: string
  kategori?: string
  deskripsi?: string
  materi?: string
  is_active?: boolean
}

export interface CreateEducationRecordInput {
  visit_id: string
  topic_id?: string
  topik_manual?: string
  kategori: string
  materi_diberikan: string
  metode: string[]
  bahasa?: string
  sasaran: string
  nama_sasaran?: string
  hubungan_sasaran?: string
  evaluasi_pemahaman: string
  evaluasi_catatan?: string
  catatan?: string
  status?: string
}

export interface UpdateEducationRecordInput {
  topic_id?: string | null
  topik_manual?: string | null
  kategori?: string
  materi_diberikan?: string
  metode?: string[]
  bahasa?: string
  sasaran?: string
  nama_sasaran?: string | null
  hubungan_sasaran?: string | null
  evaluasi_pemahaman?: string
  evaluasi_catatan?: string | null
  catatan?: string | null
  status?: string
}

const VALID_KATEGORI = [
  'diagnosis', 'terapi', 'obat', 'diet', 'nyeri',
  'rehabilitasi', 'luka', 'tanda_bahaya', 'discharge', 'lain',
]

const VALID_METODE = ['lisan', 'demonstrasi', 'leaflet', 'video', 'gambar', 'audio']
const VALID_EVALUASI = ['baik', 'cukup', 'kurang']
const VALID_SASARAN = ['pasien', 'keluarga', 'pasien_keluarga']
const VALID_STATUS = ['draft', 'completed', 'verified']

export class EducationService {
  constructor(private db: Knex) {}

  // =====================================================
  // TOPICS (Master Data)
  // =====================================================

  async listTopics(
    filters: { kategori?: string; search?: string; is_active?: boolean },
    tenantSchema: string,
  ) {
    const query = this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('education_topics')
      .orderBy('kategori')
      .orderBy('kode')

    if (filters.kategori) {
      query.where('kategori', filters.kategori)
    }
    if (filters.search) {
      query.where(function () {
        this.whereILike('nama', `%${filters.search}%`)
          .orWhereILike('kode', `%${filters.search}%`)
          .orWhereILike('deskripsi', `%${filters.search}%`)
      })
    }
    if (filters.is_active !== undefined) {
      query.where('is_active', filters.is_active)
    }

    return query
  }

  async getTopic(id: string, tenantSchema: string) {
    const topic = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('education_topics')
      .where({ id })
      .first()

    if (!topic) throw new NotFoundError('Topik edukasi')
    return topic
  }

  async createTopic(data: CreateTopicInput, tenantSchema: string) {
    if (!VALID_KATEGORI.includes(data.kategori)) {
      throw new ValidationError(`Kategori tidak valid: ${data.kategori}`)
    }

    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('education_topics')
      .where({ kode: data.kode })
      .first()

    if (existing) {
      throw new ConflictError(`Topik dengan kode '${data.kode}' sudah ada`)
    }

    const [topic] = await this.db
      .withSchema(tenantSchema)
      .insert({
        kode: data.kode,
        nama: data.nama,
        kategori: data.kategori,
        deskripsi: data.deskripsi || null,
        materi: data.materi || null,
      })
      .into('education_topics')
      .returning('*')

    logger.info('Education topic created', { id: topic.id, kode: data.kode })
    return topic
  }

  async updateTopic(id: string, data: UpdateTopicInput, tenantSchema: string) {
    const topic = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('education_topics')
      .where({ id })
      .first()

    if (!topic) throw new NotFoundError('Topik edukasi')

    if (data.kategori && !VALID_KATEGORI.includes(data.kategori)) {
      throw new ValidationError(`Kategori tidak valid: ${data.kategori}`)
    }

    if (data.kode) {
      const dup = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('education_topics')
        .where({ kode: data.kode })
        .whereNot({ id })
        .first()
      if (dup) {
        throw new ConflictError(`Topik dengan kode '${data.kode}' sudah ada`)
      }
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('education_topics')
      .where({ id })
      .update({
        ...(data.kode !== undefined && { kode: data.kode }),
        ...(data.nama !== undefined && { nama: data.nama }),
        ...(data.kategori !== undefined && { kategori: data.kategori }),
        ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi }),
        ...(data.materi !== undefined && { materi: data.materi }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
      })
      .returning('*')

    logger.info('Education topic updated', { id })
    return updated
  }

  async deleteTopic(id: string, tenantSchema: string) {
    const topic = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('education_topics')
      .where({ id })
      .first()

    if (!topic) throw new NotFoundError('Topik edukasi')

    const usageCount = await this.db
      .withSchema(tenantSchema)
      .from('patient_education_records')
      .where({ topic_id: id })
      .count('id as count')
      .first()

    if (Number((usageCount as Record<string, unknown>)?.count || 0) > 0) {
      throw new ConflictError(
        'Topik tidak bisa dihapus karena sudah digunakan di catatan edukasi. Nonaktifkan saja.',
      )
    }

    await this.db
      .withSchema(tenantSchema)
      .from('education_topics')
      .where({ id })
      .delete()

    logger.info('Education topic deleted', { id })
  }

  async getTopicCategories(tenantSchema: string) {
    const rows = await this.db
      .withSchema(tenantSchema)
      .select('kategori')
      .count('id as count')
      .from('education_topics')
      .where({ is_active: true })
      .groupBy('kategori')
      .orderBy('kategori')

    return rows.map((r: Record<string, unknown>) => ({
      kategori: r.kategori as string,
      count: Number(r.count),
    }))
  }

  // =====================================================
  // EDUCATION RECORDS
  // =====================================================

  async createRecord(
    data: CreateEducationRecordInput,
    userId: string,
    tenantSchema: string,
  ) {
    // Validate visit
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'patient_id')
      .from('visits')
      .where({ id: data.visit_id })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    // Validate topic if provided
    if (data.topic_id) {
      const topic = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('education_topics')
        .where({ id: data.topic_id, is_active: true })
        .first()
      if (!topic) throw new NotFoundError('Topik edukasi')
    }

    // Validate kategori
    if (!VALID_KATEGORI.includes(data.kategori)) {
      throw new ValidationError(`Kategori tidak valid: ${data.kategori}`)
    }

    // Validate metode
    for (const m of data.metode) {
      if (!VALID_METODE.includes(m)) {
        throw new ValidationError(`Metode tidak valid: ${m}`)
      }
    }

    // Validate evaluasi
    if (!VALID_EVALUASI.includes(data.evaluasi_pemahaman)) {
      throw new ValidationError(`Evaluasi pemahaman tidak valid: ${data.evaluasi_pemahaman}`)
    }

    // Validate sasaran
    if (!VALID_SASARAN.includes(data.sasaran)) {
      throw new ValidationError(`Sasaran tidak valid: ${data.sasaran}`)
    }

    const perluReedukasi = data.evaluasi_pemahaman === 'kurang'

    const [record] = await this.db
      .withSchema(tenantSchema)
      .insert({
        visit_id: data.visit_id,
        patient_id: visit.patient_id,
        educator_id: userId,
        topic_id: data.topic_id || null,
        topik_manual: data.topik_manual || null,
        kategori: data.kategori,
        materi_diberikan: data.materi_diberikan,
        metode: data.metode,
        bahasa: data.bahasa || 'Indonesia',
        sasaran: data.sasaran,
        nama_sasaran: data.nama_sasaran || null,
        hubungan_sasaran: data.hubungan_sasaran || null,
        evaluasi_pemahaman: data.evaluasi_pemahaman,
        evaluasi_catatan: data.evaluasi_catatan || null,
        perlu_reedukasi: perluReedukasi,
        status: data.status || 'completed',
        catatan: data.catatan || null,
        created_by: userId,
        tanggal: new Date(),
      })
      .into('patient_education_records')
      .returning('*')

    logger.info('Education record created', {
      id: record.id,
      visitId: data.visit_id,
      kategori: data.kategori,
      userId,
    })

    return this.getRecord(record.id, tenantSchema)
  }

  async updateRecord(
    id: string,
    data: UpdateEducationRecordInput,
    tenantSchema: string,
  ) {
    const record = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('patient_education_records')
      .where({ id })
      .first()

    if (!record) throw new NotFoundError('Catatan edukasi')

    if (record.status === 'verified') {
      throw new ValidationError('Catatan edukasi yang sudah diverifikasi tidak bisa diedit')
    }

    if (data.kategori && !VALID_KATEGORI.includes(data.kategori)) {
      throw new ValidationError(`Kategori tidak valid: ${data.kategori}`)
    }

    if (data.metode) {
      for (const m of data.metode) {
        if (!VALID_METODE.includes(m)) {
          throw new ValidationError(`Metode tidak valid: ${m}`)
        }
      }
    }

    if (data.evaluasi_pemahaman && !VALID_EVALUASI.includes(data.evaluasi_pemahaman)) {
      throw new ValidationError(`Evaluasi pemahaman tidak valid: ${data.evaluasi_pemahaman}`)
    }

    if (data.sasaran && !VALID_SASARAN.includes(data.sasaran)) {
      throw new ValidationError(`Sasaran tidak valid: ${data.sasaran}`)
    }

    const perluReedukasi = data.evaluasi_pemahaman === 'kurang'
      ? true
      : data.evaluasi_pemahaman
        ? false
        : undefined

    const updateData: Record<string, unknown> = {}
    if (data.topic_id !== undefined) updateData.topic_id = data.topic_id
    if (data.topik_manual !== undefined) updateData.topik_manual = data.topik_manual
    if (data.kategori) updateData.kategori = data.kategori
    if (data.materi_diberikan) updateData.materi_diberikan = data.materi_diberikan
    if (data.metode) updateData.metode = data.metode
    if (data.bahasa) updateData.bahasa = data.bahasa
    if (data.sasaran) updateData.sasaran = data.sasaran
    if (data.nama_sasaran !== undefined) updateData.nama_sasaran = data.nama_sasaran
    if (data.hubungan_sasaran !== undefined) updateData.hubungan_sasaran = data.hubungan_sasaran
    if (data.evaluasi_pemahaman) updateData.evaluasi_pemahaman = data.evaluasi_pemahaman
    if (data.evaluasi_catatan !== undefined) updateData.evaluasi_catatan = data.evaluasi_catatan
    if (data.catatan !== undefined) updateData.catatan = data.catatan
    if (data.status) updateData.status = data.status
    if (perluReedukasi !== undefined) updateData.perlu_reedukasi = perluReedukasi

    await this.db
      .withSchema(tenantSchema)
      .from('patient_education_records')
      .where({ id })
      .update(updateData)

    logger.info('Education record updated', { id })
    return this.getRecord(id, tenantSchema)
  }

  async deleteRecord(id: string, tenantSchema: string) {
    const record = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('patient_education_records')
      .where({ id })
      .first()

    if (!record) throw new NotFoundError('Catatan edukasi')

    if (record.status !== 'draft') {
      throw new ValidationError('Hanya catatan edukasi berstatus draft yang bisa dihapus')
    }

    await this.db
      .withSchema(tenantSchema)
      .from('patient_education_records')
      .where({ id })
      .delete()

    logger.info('Education record deleted', { id })
  }

  async getRecord(id: string, tenantSchema: string) {
    const record = await this.db
      .withSchema(tenantSchema)
      .select(
        'r.id',
        'r.visit_id',
        'r.patient_id',
        'r.educator_id',
        'r.tanggal',
        'r.topic_id',
        'r.topik_manual',
        'r.kategori',
        'r.materi_diberikan',
        'r.metode',
        'r.bahasa',
        'r.sasaran',
        'r.nama_sasaran',
        'r.hubungan_sasaran',
        'r.evaluasi_pemahaman',
        'r.evaluasi_catatan',
        'r.perlu_reedukasi',
        'r.reedukasi_tanggal',
        'r.reedukasi_ref',
        'r.verified_by_patient',
        'r.patient_signature',
        'r.verified_at',
        'r.status',
        'r.catatan',
        'r.created_by',
        'r.created_at',
        'r.updated_at',
        't.kode as topic_kode',
        't.nama as topic_nama',
        't.kategori as topic_kategori',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'u.name as educator_nama',
        'u.role as educator_role',
      )
      .from('patient_education_records as r')
      .leftJoin('education_topics as t', 't.id', 'r.topic_id')
      .join('patients as p', 'p.id', 'r.patient_id')
      .join('users as u', 'u.id', 'r.educator_id')
      .where('r.id', id)
      .first()

    if (!record) throw new NotFoundError('Catatan edukasi')
    return record
  }

  async listByVisit(visitId: string, tenantSchema: string) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('visits')
      .where({ id: visitId })
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    return this.db
      .withSchema(tenantSchema)
      .select(
        'r.id',
        'r.visit_id',
        'r.patient_id',
        'r.educator_id',
        'r.tanggal',
        'r.topic_id',
        'r.topik_manual',
        'r.kategori',
        'r.materi_diberikan',
        'r.metode',
        'r.bahasa',
        'r.sasaran',
        'r.nama_sasaran',
        'r.hubungan_sasaran',
        'r.evaluasi_pemahaman',
        'r.evaluasi_catatan',
        'r.perlu_reedukasi',
        'r.reedukasi_tanggal',
        'r.reedukasi_ref',
        'r.verified_by_patient',
        'r.verified_at',
        'r.status',
        'r.catatan',
        'r.created_at',
        't.kode as topic_kode',
        't.nama as topic_nama',
        'u.name as educator_nama',
        'u.role as educator_role',
      )
      .from('patient_education_records as r')
      .leftJoin('education_topics as t', 't.id', 'r.topic_id')
      .join('users as u', 'u.id', 'r.educator_id')
      .where('r.visit_id', visitId)
      .orderBy('r.tanggal', 'desc')
  }

  async listByPatient(patientId: string, tenantSchema: string) {
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('patients')
      .where({ id: patientId })
      .whereNull('deleted_at')
      .first()

    if (!patient) throw new NotFoundError('Pasien')

    return this.db
      .withSchema(tenantSchema)
      .select(
        'r.id',
        'r.visit_id',
        'r.patient_id',
        'r.educator_id',
        'r.tanggal',
        'r.topic_id',
        'r.topik_manual',
        'r.kategori',
        'r.materi_diberikan',
        'r.metode',
        'r.bahasa',
        'r.sasaran',
        'r.evaluasi_pemahaman',
        'r.perlu_reedukasi',
        'r.verified_by_patient',
        'r.verified_at',
        'r.status',
        'r.created_at',
        't.kode as topic_kode',
        't.nama as topic_nama',
        'u.name as educator_nama',
        'v.visit_number',
      )
      .from('patient_education_records as r')
      .leftJoin('education_topics as t', 't.id', 'r.topic_id')
      .join('users as u', 'u.id', 'r.educator_id')
      .join('visits as v', 'v.id', 'r.visit_id')
      .where('r.patient_id', patientId)
      .orderBy('r.tanggal', 'desc')
  }

  async verifyRecord(id: string, signatureData: string, tenantSchema: string) {
    const record = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'verified_by_patient')
      .from('patient_education_records')
      .where({ id })
      .first()

    if (!record) throw new NotFoundError('Catatan edukasi')

    if (record.verified_by_patient) {
      throw new ValidationError('Catatan edukasi sudah diverifikasi sebelumnya')
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('patient_education_records')
      .where({ id })
      .update({
        verified_by_patient: true,
        patient_signature: signatureData,
        verified_at: new Date(),
        status: 'verified',
      })
      .returning('*')

    logger.info('Education record verified', { id })
    return this.getRecord(id, tenantSchema)
  }

  async scheduleReeducation(id: string, tanggal: string, tenantSchema: string) {
    const record = await this.db
      .withSchema(tenantSchema)
      .select('id', 'perlu_reedukasi')
      .from('patient_education_records')
      .where({ id })
      .first()

    if (!record) throw new NotFoundError('Catatan edukasi')

    await this.db
      .withSchema(tenantSchema)
      .from('patient_education_records')
      .where({ id })
      .update({
        perlu_reedukasi: true,
        reedukasi_tanggal: tanggal,
      })

    logger.info('Re-education scheduled', { id, tanggal })
    return this.getRecord(id, tenantSchema)
  }

  async listPendingReeducation(tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select(
        'r.id',
        'r.visit_id',
        'r.patient_id',
        'r.tanggal',
        'r.kategori',
        'r.topik_manual',
        'r.evaluasi_pemahaman',
        'r.reedukasi_tanggal',
        'r.created_at',
        't.nama as topic_nama',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'u.name as educator_nama',
      )
      .from('patient_education_records as r')
      .leftJoin('education_topics as t', 't.id', 'r.topic_id')
      .join('patients as p', 'p.id', 'r.patient_id')
      .join('users as u', 'u.id', 'r.educator_id')
      .where('r.perlu_reedukasi', true)
      .whereNull('r.reedukasi_ref')
      .orderBy('r.reedukasi_tanggal', 'asc')
      .orderBy('r.tanggal', 'desc')
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  async getEducationStats(tenantSchema: string) {
    const totalResult = await this.db
      .withSchema(tenantSchema)
      .from('patient_education_records')
      .count('id as count')
      .first()
    const total = Number((totalResult as Record<string, unknown>)?.count || 0)

    const byKategori = await this.db
      .withSchema(tenantSchema)
      .select('kategori')
      .count('id as count')
      .from('patient_education_records')
      .groupBy('kategori')
      .orderBy('count', 'desc')

    const byEvaluasi = await this.db
      .withSchema(tenantSchema)
      .select('evaluasi_pemahaman')
      .count('id as count')
      .from('patient_education_records')
      .groupBy('evaluasi_pemahaman')

    const pendingResult = await this.db
      .withSchema(tenantSchema)
      .from('patient_education_records')
      .where('perlu_reedukasi', true)
      .whereNull('reedukasi_ref')
      .count('id as count')
      .first()
    const pendingReeducation = Number((pendingResult as Record<string, unknown>)?.count || 0)

    const verifiedResult = await this.db
      .withSchema(tenantSchema)
      .from('patient_education_records')
      .where('verified_by_patient', true)
      .count('id as count')
      .first()
    const verified = Number((verifiedResult as Record<string, unknown>)?.count || 0)

    const verificationRate = total > 0 ? Math.round((verified / total) * 100) : 0

    return {
      total,
      verified,
      verificationRate,
      pendingReeducation,
      byKategori: byKategori.map((r: Record<string, unknown>) => ({
        kategori: r.kategori as string,
        count: Number(r.count),
      })),
      byEvaluasi: byEvaluasi.map((r: Record<string, unknown>) => ({
        evaluasi: r.evaluasi_pemahaman as string,
        count: Number(r.count),
      })),
    }
  }

  async getEducationStatsByVisit(visitId: string, tenantSchema: string) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('visits')
      .where({ id: visitId })
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    const records = await this.db
      .withSchema(tenantSchema)
      .select('evaluasi_pemahaman', 'verified_by_patient', 'perlu_reedukasi', 'reedukasi_ref')
      .from('patient_education_records')
      .where({ visit_id: visitId })

    const totalTopics = records.length
    const allVerified = totalTopics > 0 && records.every((r: Record<string, unknown>) => r.verified_by_patient)
    const verifiedCount = records.filter((r: Record<string, unknown>) => r.verified_by_patient).length
    const reeducationNeeded = records.filter(
      (r: Record<string, unknown>) => r.perlu_reedukasi && !r.reedukasi_ref,
    ).length

    return {
      totalTopics,
      verifiedCount,
      allVerified,
      reeducationNeeded,
    }
  }
}
