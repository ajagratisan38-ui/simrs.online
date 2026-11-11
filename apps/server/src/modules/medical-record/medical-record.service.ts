import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'
import type {
  CreateMedicalRecordInput,
  UpdateMedicalRecordInput,
  SearchIcd10Input,
  SearchIcd9cmInput,
  PatientHistoryInput,
  CreateTemplateInput,
  ListTemplatesInput,
} from './medical-record.validator'

export class MedicalRecordService {
  constructor(private db: Knex) {}

  // ===================================================
  // CREATE — buat rekam medis baru untuk kunjungan
  // ===================================================
  async create(
    visitId: string,
    data: CreateMedicalRecordInput,
    doctorId: string,
    userId: string,
    tenantSchema: string,
  ) {
    // Cek visit ada dan statusnya valid
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'patient_id', 'status')
      .from('visits')
      .where({ id: visitId })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    // Visit harus dalam status 'diperiksa', 'dipanggil', atau 'menunggu' (auto-update)
    if (!['diperiksa', 'dipanggil', 'menunggu'].includes(visit.status)) {
      throw new ValidationError(
        `Kunjungan dengan status '${visit.status}' tidak bisa dibuat rekam medisnya`,
      )
    }

    // Cek apakah sudah ada rekam medis untuk visit ini
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('medical_records')
      .where({ visit_id: visitId })
      .first()

    if (existing) {
      throw new ConflictError('Rekam medis untuk kunjungan ini sudah ada')
    }

    // Validasi doctor exists
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('doctors')
      .where({ id: doctorId })
      .first()

    if (!doctor) throw new NotFoundError('Dokter')

    return this.db.transaction(async (trx) => {
      // Update visit status ke 'diperiksa' jika masih 'menunggu' atau 'dipanggil'
      if (['menunggu', 'dipanggil'].includes(visit.status)) {
        await trx
          .withSchema(tenantSchema)
          .from('visits')
          .where({ id: visitId })
          .update({ status: 'diperiksa', updated_by: userId })

        // Update queue status ke 'dilayani'
        await trx
          .withSchema(tenantSchema)
          .from('queues')
          .where({ visit_id: visitId })
          .update({ status: 'dilayani', served_at: new Date() })
      }

      // Insert medical_record
      const [medicalRecord] = await trx
        .withSchema(tenantSchema)
        .insert({
          visit_id: visitId,
          patient_id: visit.patient_id,
          doctor_id: doctorId,
          subjective: data.subjective || null,
          objective: data.objective || null,
          assessment: data.assessment || null,
          plan: data.plan || null,
          vital_signs: JSON.stringify(data.vital_signs || {}),
          alergi: JSON.stringify(data.alergi || []),
          riwayat_penyakit: data.riwayat_penyakit || null,
          catatan_tambahan: data.catatan_tambahan || null,
          status: 'draft',
          created_by: userId,
          updated_by: userId,
        })
        .into('medical_records')
        .returning('*')

      // Insert diagnoses (batch)
      if (data.diagnoses && data.diagnoses.length > 0) {
        const diagnosisRows = data.diagnoses.map((dx) => ({
          medical_record_id: medicalRecord.id,
          icd10_code: dx.icd10_code,
          icd10_name: dx.icd10_name,
          tipe: dx.tipe || 'utama',
          catatan: dx.catatan || null,
        }))

        await trx
          .withSchema(tenantSchema)
          .insert(diagnosisRows)
          .into('diagnoses')
      }

      // Insert procedures (batch)
      if (data.procedures && data.procedures.length > 0) {
        const procedureRows = data.procedures.map((proc) => ({
          medical_record_id: medicalRecord.id,
          kode_tindakan: proc.kode_tindakan || null,
          nama_tindakan: proc.nama_tindakan,
          catatan: proc.catatan || null,
          tarif: proc.tarif || 0,
          qty: proc.qty || 1,
          total: proc.total || (proc.tarif || 0) * (proc.qty || 1),
        }))

        await trx
          .withSchema(tenantSchema)
          .insert(procedureRows)
          .into('procedures')
      }

      // Insert prescription + items
      if (data.prescription && data.prescription.items.length > 0) {
        const [prescription] = await trx
          .withSchema(tenantSchema)
          .insert({
            medical_record_id: medicalRecord.id,
            visit_id: visitId,
            status: 'draft',
            catatan_dokter: data.prescription.catatan_dokter || null,
          })
          .into('prescriptions')
          .returning('*')

        const itemRows = data.prescription.items.map((item) => ({
          prescription_id: prescription.id,
          drug_id: item.drug_id || null,
          nama_obat: item.nama_obat,
          dosis: item.dosis || null,
          satuan: item.satuan || null,
          frekuensi: item.frekuensi || null,
          durasi_hari: item.durasi_hari || null,
          jumlah: item.jumlah || 1,
          aturan_pakai: item.aturan_pakai || null,
          catatan: item.catatan || null,
        }))

        await trx
          .withSchema(tenantSchema)
          .insert(itemRows)
          .into('prescription_items')
      }

      logger.info('Medical record created', {
        medicalRecordId: medicalRecord.id,
        visitId,
        doctorId,
      })

      // Return full record
      return this.getByIdInternal(medicalRecord.id, tenantSchema, trx)
    })
  }

  // ===================================================
  // UPDATE — hanya jika status 'draft'
  // ===================================================
  async update(
    id: string,
    data: UpdateMedicalRecordInput,
    doctorId: string,
    userId: string,
    tenantSchema: string,
  ) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'doctor_id', 'visit_id')
      .from('medical_records')
      .where({ id })
      .first()

    if (!existing) throw new NotFoundError('Rekam medis')

    if (existing.status === 'final') {
      throw new ValidationError(
        'Rekam medis sudah final dan tidak bisa diedit',
      )
    }

    return this.db.transaction(async (trx) => {
      // Update medical_record
      await trx
        .withSchema(tenantSchema)
        .from('medical_records')
        .where({ id })
        .update({
          subjective: data.subjective || null,
          objective: data.objective || null,
          assessment: data.assessment || null,
          plan: data.plan || null,
          vital_signs: JSON.stringify(data.vital_signs || {}),
          alergi: JSON.stringify(data.alergi || []),
          riwayat_penyakit: data.riwayat_penyakit || null,
          catatan_tambahan: data.catatan_tambahan || null,
          updated_by: userId,
        })

      // Replace diagnoses: delete old, insert new
      await trx
        .withSchema(tenantSchema)
        .from('diagnoses')
        .where({ medical_record_id: id })
        .del()

      if (data.diagnoses && data.diagnoses.length > 0) {
        const diagnosisRows = data.diagnoses.map((dx) => ({
          medical_record_id: id,
          icd10_code: dx.icd10_code,
          icd10_name: dx.icd10_name,
          tipe: dx.tipe || 'utama',
          catatan: dx.catatan || null,
        }))

        await trx
          .withSchema(tenantSchema)
          .insert(diagnosisRows)
          .into('diagnoses')
      }

      // Replace procedures: delete old, insert new
      await trx
        .withSchema(tenantSchema)
        .from('procedures')
        .where({ medical_record_id: id })
        .del()

      if (data.procedures && data.procedures.length > 0) {
        const procedureRows = data.procedures.map((proc) => ({
          medical_record_id: id,
          kode_tindakan: proc.kode_tindakan || null,
          nama_tindakan: proc.nama_tindakan,
          catatan: proc.catatan || null,
          tarif: proc.tarif || 0,
          qty: proc.qty || 1,
          total: proc.total || (proc.tarif || 0) * (proc.qty || 1),
        }))

        await trx
          .withSchema(tenantSchema)
          .insert(procedureRows)
          .into('procedures')
      }

      // Replace prescription: delete old prescription + items, insert new
      await trx
        .withSchema(tenantSchema)
        .from('prescriptions')
        .where({ medical_record_id: id })
        .del()

      if (data.prescription && data.prescription.items.length > 0) {
        const [prescription] = await trx
          .withSchema(tenantSchema)
          .insert({
            medical_record_id: id,
            visit_id: existing.visit_id,
            status: 'draft',
            catatan_dokter: data.prescription.catatan_dokter || null,
          })
          .into('prescriptions')
          .returning('*')

        const itemRows = data.prescription.items.map((item) => ({
          prescription_id: prescription.id,
          drug_id: item.drug_id || null,
          nama_obat: item.nama_obat,
          dosis: item.dosis || null,
          satuan: item.satuan || null,
          frekuensi: item.frekuensi || null,
          durasi_hari: item.durasi_hari || null,
          jumlah: item.jumlah || 1,
          aturan_pakai: item.aturan_pakai || null,
          catatan: item.catatan || null,
        }))

        await trx
          .withSchema(tenantSchema)
          .insert(itemRows)
          .into('prescription_items')
      }

      logger.info('Medical record updated', { medicalRecordId: id, doctorId })

      return this.getByIdInternal(id, tenantSchema, trx)
    })
  }

  // ===================================================
  // FINALIZE — lock record, set status 'final'
  // ===================================================
  async finalize(id: string, doctorId: string, userId: string, tenantSchema: string) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'visit_id')
      .from('medical_records')
      .where({ id })
      .first()

    if (!existing) throw new NotFoundError('Rekam medis')

    if (existing.status === 'final') {
      throw new ValidationError('Rekam medis sudah dalam status final')
    }

    return this.db.transaction(async (trx) => {
      // Finalize the record
      await trx
        .withSchema(tenantSchema)
        .from('medical_records')
        .where({ id })
        .update({ status: 'final', updated_by: userId })

      // Send prescription to pharmacy if exists
      await trx
        .withSchema(tenantSchema)
        .from('prescriptions')
        .where({ medical_record_id: id, status: 'draft' })
        .update({ status: 'dikirim' })

      // Get visit to check type
      const visit = await trx
        .withSchema(tenantSchema)
        .select('id', 'tipe', 'status', 'bed_id')
        .from('visits')
        .where({ id: existing.visit_id })
        .first()

      if (visit) {
        if (visit.tipe === 'rawat_inap' && visit.bed_id) {
          // Rawat inap: keep status rawat_inap, doctor must discharge separately
          logger.info('Rawat inap finalized — awaiting discharge', {
            visitId: visit.id,
          })
        } else {
          // Rawat jalan / IGD: set to selesai
          await trx
            .withSchema(tenantSchema)
            .from('visits')
            .where({ id: existing.visit_id })
            .update({ status: 'selesai', updated_by: userId })
        }
      }

      logger.info('Medical record finalized', {
        medicalRecordId: id,
        doctorId,
        visitType: visit?.tipe,
      })

      return this.getByIdInternal(id, tenantSchema, trx)
    })
  }

  // ===================================================
  // GET BY VISIT
  // ===================================================
  async getByVisit(visitId: string, tenantSchema: string) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('visits')
      .where({ id: visitId })
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    const mr = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('medical_records')
      .where({ visit_id: visitId })
      .first()

    if (!mr) return null

    return this.getByIdInternal(mr.id, tenantSchema)
  }

  // ===================================================
  // PATIENT HISTORY
  // ===================================================
  async getPatientHistory(
    patientId: string,
    filters: PatientHistoryInput,
    tenantSchema: string,
  ) {
    // Verify patient exists
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'no_rekam_medis')
      .from('patients')
      .where({ id: patientId })
      .whereNull('deleted_at')
      .first()

    if (!patient) throw new NotFoundError('Pasien')

    const { page, limit } = filters
    const offset = (page - 1) * limit

    // Count total
    const [{ count }] = await this.db
      .withSchema(tenantSchema)
      .from('medical_records')
      .where({ patient_id: patientId })
      .count('id as count')

    const total = Number(count)
    const totalPages = Math.ceil(total / limit)

    // Fetch records with visit + doctor info
    const records = await this.db
      .withSchema(tenantSchema)
      .select(
        'mr.id',
        'mr.visit_id',
        'mr.subjective',
        'mr.objective',
        'mr.assessment',
        'mr.plan',
        'mr.vital_signs',
        'mr.alergi',
        'mr.status',
        'mr.created_at',
        'mr.updated_at',
        'v.visit_number',
        'v.tipe as visit_tipe',
        'v.tanggal as visit_tanggal',
        'v.penjamin',
        'r.nama as room_nama',
        'd.spesialisasi as doctor_spesialisasi',
        'u.name as doctor_nama',
      )
      .from('medical_records as mr')
      .join('visits as v', 'v.id', 'mr.visit_id')
      .join('rooms as r', 'r.id', 'v.room_id')
      .join('doctors as d', 'd.id', 'mr.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .where({ 'mr.patient_id': patientId })
      .orderBy('v.tanggal', 'desc')
      .offset(offset)
      .limit(limit)

    // For each record, fetch diagnoses
    for (const record of records) {
      record.diagnoses = await this.db
        .withSchema(tenantSchema)
        .select('icd10_code', 'icd10_name', 'tipe')
        .from('diagnoses')
        .where({ medical_record_id: record.id })
    }

    return {
      patient,
      data: records,
      meta: { page, limit, total, totalPages },
    }
  }

  // ===================================================
  // SEARCH ICD-10
  // ===================================================
  async searchIcd10(filters: SearchIcd10Input) {
    const { q, limit } = filters
    const pattern = `%${q}%`

    const results = await this.db
      .select('id', 'code', 'name_en', 'name_id', 'category')
      .from('public.icd10_codes')
      .where({ is_active: true })
      .andWhere(function () {
        this.whereILike('code', pattern)
          .orWhereILike('name_en', pattern)
          .orWhereILike('name_id', pattern)
      })
      .orderByRaw('CASE WHEN code ILIKE ? THEN 0 ELSE 1 END', [pattern])
      .orderBy('code', 'asc')
      .limit(limit)

    return results
  }

  // ===================================================
  // SEARCH ICD-9-CM (procedure codes)
  // ===================================================
  async searchIcd9cm(filters: SearchIcd9cmInput) {
    const { q, category, limit } = filters
    const pattern = `%${q}%`

    const query = this.db
      .select('id', 'code', 'name_en', 'name_id', 'category')
      .from('public.icd9cm_codes')
      .where({ is_active: true })
      .andWhere(function () {
        this.whereILike('code', pattern)
          .orWhereILike('name_en', pattern)
          .orWhereILike('name_id', pattern)
      })

    if (category) {
      query.andWhere('category', category)
    }

    return query
      .orderByRaw('CASE WHEN code ILIKE ? THEN 0 ELSE 1 END', [pattern])
      .orderBy('code', 'asc')
      .limit(limit)
  }

  async getIcd9cmCategories() {
    const rows = await this.db
      .distinct('category')
      .from('public.icd9cm_codes')
      .where({ is_active: true })
      .orderBy('category', 'asc')

    return rows.map((r: Record<string, unknown>) => r.category)
  }

  // ===================================================
  // TEMPLATES
  // ===================================================
  async listTemplates(
    filters: ListTemplatesInput,
    doctorId: string | null,
    tenantSchema: string,
  ) {
    const query = this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('medical_templates')
      .where({ is_active: true })
      .andWhere(function () {
        // Global templates + doctor's own templates
        this.whereNull('doctor_id')
        if (doctorId) {
          this.orWhere({ doctor_id: doctorId })
        }
      })

    if (filters.category) {
      query.andWhere({ category: filters.category })
    }

    return query.orderBy('name', 'asc')
  }

  async createTemplate(
    data: CreateTemplateInput,
    doctorId: string | null,
    tenantSchema: string,
  ) {
    const [template] = await this.db
      .withSchema(tenantSchema)
      .insert({
        name: data.name,
        category: data.category,
        content: JSON.stringify(data.content),
        doctor_id: doctorId,
        is_active: data.is_active ?? true,
      })
      .into('medical_templates')
      .returning('*')

    return template
  }

  // ===================================================
  // RESUME MEDIS — ringkasan medis lengkap per kunjungan
  // ===================================================
  async getResumeMedis(visitId: string, tenantSchema: string) {
    // 1. Fetch visit + patient
    const visit = await this.db
      .withSchema(tenantSchema)
      .select(
        'v.id',
        'v.visit_number',
        'v.tipe',
        'v.tanggal',
        'v.status',
        'v.penjamin',
        'v.keluhan_utama',
        'v.no_sep',
        'v.created_at as visit_created_at',
        'v.updated_at as visit_updated_at',
        'p.id as patient_id',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.nik',
        'p.tanggal_lahir',
        'p.jenis_kelamin',
        'p.alamat',
        'p.no_telepon',
        'p.golongan_darah',
        'r.nama as room_nama',
        'r.kode as room_kode',
      )
      .from('visits as v')
      .join('patients as p', 'p.id', 'v.patient_id')
      .join('rooms as r', 'r.id', 'v.room_id')
      .where({ 'v.id': visitId })
      .whereNull('v.deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    // 2. Fetch medical record
    const mr = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('medical_records')
      .where({ visit_id: visitId })
      .first()

    if (!mr) throw new NotFoundError('Rekam medis belum dibuat untuk kunjungan ini')

    // Parse JSON fields
    mr.vital_signs = typeof mr.vital_signs === 'string'
      ? JSON.parse(mr.vital_signs)
      : mr.vital_signs || {}
    mr.alergi = typeof mr.alergi === 'string'
      ? JSON.parse(mr.alergi)
      : mr.alergi || []

    // 3. Fetch doctor info
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('d.spesialisasi', 'd.no_sip', 'u.name as doctor_nama')
      .from('doctors as d')
      .join('users as u', 'u.id', 'd.user_id')
      .where({ 'd.id': mr.doctor_id })
      .first()

    // 4. Fetch diagnoses
    const diagnoses = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('diagnoses')
      .where({ medical_record_id: mr.id })
      .orderBy('tipe', 'asc')

    // 5. Fetch procedures
    const procedures = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('procedures')
      .where({ medical_record_id: mr.id })

    // 6. Fetch prescriptions + items
    const prescriptions = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('prescriptions')
      .where({ medical_record_id: mr.id })

    for (const rx of prescriptions) {
      rx.items = await this.db
        .withSchema(tenantSchema)
        .select('*')
        .from('prescription_items')
        .where({ prescription_id: rx.id })
    }

    // 7. Fetch hospital/tenant info
    const tenantId = tenantSchema.replace('tenant_', '')
    const tenant = await this.db('tenants')
      .where('slug', tenantId)
      .orWhere('id', tenantId)
      .first()

    const hospital = tenant
      ? {
          nama: tenant.name,
          alamat: tenant.address || '-',
          telepon: tenant.phone || '-',
          email: tenant.email || '-',
          logo_url: tenant.logo_url || null,
          settings: typeof tenant.settings === 'string'
            ? JSON.parse(tenant.settings)
            : tenant.settings || {},
        }
      : null

    // 8. Fetch queue info
    const queue = await this.db
      .withSchema(tenantSchema)
      .select('nomor_antrian', 'called_at', 'served_at', 'finished_at')
      .from('queues')
      .where({ visit_id: visitId })
      .first()

    logger.info('Resume medis generated', { visitId, medicalRecordId: mr.id })

    return {
      hospital,
      patient: {
        id: visit.patient_id,
        nama: visit.patient_nama,
        no_rekam_medis: visit.no_rekam_medis,
        nik: visit.nik,
        tanggal_lahir: visit.tanggal_lahir,
        jenis_kelamin: visit.jenis_kelamin,
        alamat: visit.alamat,
        no_telepon: visit.no_telepon,
        golongan_darah: visit.golongan_darah,
      },
      visit: {
        id: visit.id,
        visit_number: visit.visit_number,
        tipe: visit.tipe,
        tanggal: visit.tanggal,
        status: visit.status,
        penjamin: visit.penjamin,
        keluhan_utama: visit.keluhan_utama,
        no_sep: visit.no_sep,
        room_nama: visit.room_nama,
        room_kode: visit.room_kode,
        queue: queue || null,
      },
      doctor: doctor
        ? {
            nama: doctor.doctor_nama,
            spesialisasi: doctor.spesialisasi,
            no_sip: doctor.no_sip,
          }
        : null,
      medicalRecord: {
        id: mr.id,
        status: mr.status,
        subjective: mr.subjective,
        objective: mr.objective,
        assessment: mr.assessment,
        plan: mr.plan,
        vital_signs: mr.vital_signs,
        alergi: mr.alergi,
        riwayat_penyakit: mr.riwayat_penyakit,
        catatan_tambahan: mr.catatan_tambahan,
        created_at: mr.created_at,
        updated_at: mr.updated_at,
      },
      diagnoses,
      procedures,
      prescriptions,
    }
  }

  // ===================================================
  // INTERNAL: fetch full medical record with relations
  // ===================================================
  private async getByIdInternal(
    id: string,
    tenantSchema: string,
    trxOrDb?: Knex | Knex.Transaction,
  ) {
    const conn = trxOrDb || this.db

    const mr = await conn
      .withSchema(tenantSchema)
      .select(
        'mr.*',
        'v.visit_number',
        'v.tipe as visit_tipe',
        'v.tanggal as visit_tanggal',
        'v.status as visit_status',
        'v.penjamin',
        'v.keluhan_utama',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.nik',
        'p.tanggal_lahir',
        'p.jenis_kelamin',
        'r.nama as room_nama',
        'r.kode as room_kode',
        'u.name as doctor_nama',
        'd.spesialisasi as doctor_spesialisasi',
      )
      .from('medical_records as mr')
      .join('visits as v', 'v.id', 'mr.visit_id')
      .join('patients as p', 'p.id', 'mr.patient_id')
      .join('rooms as r', 'r.id', 'v.room_id')
      .join('doctors as d', 'd.id', 'mr.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .where({ 'mr.id': id })
      .first()

    if (!mr) throw new NotFoundError('Rekam medis')

    // Fetch diagnoses
    const diagnoses = await conn
      .withSchema(tenantSchema)
      .select('*')
      .from('diagnoses')
      .where({ medical_record_id: id })
      .orderBy('tipe', 'asc')

    // Fetch procedures
    const procedures = await conn
      .withSchema(tenantSchema)
      .select('*')
      .from('procedures')
      .where({ medical_record_id: id })

    // Fetch prescriptions with items
    const prescriptions = await conn
      .withSchema(tenantSchema)
      .select('*')
      .from('prescriptions')
      .where({ medical_record_id: id })

    for (const rx of prescriptions) {
      rx.items = await conn
        .withSchema(tenantSchema)
        .select('*')
        .from('prescription_items')
        .where({ prescription_id: rx.id })
    }

    return {
      ...mr,
      diagnoses,
      procedures,
      prescriptions,
    }
  }
}
