import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

export interface CreateSurgeryInput {
  visit_id: string
  patient_id: string
  doctor_id: string
  tanggal_operasi: string
  jam_mulai: string
  estimasi_durasi_menit: number
  ruang_operasi: string
  jenis_operasi: 'elektif' | 'cito' | 'emergency'
  jenis_anestesi: 'general' | 'regional' | 'lokal' | 'sedasi'
  diagnosis_pre_op: string
  tindakan_rencana: string
  icd9cm_code?: string
  catatan?: string
}

export interface UpdateSurgeryInput {
  status?: 'dijadwalkan' | 'persiapan' | 'berjalan' | 'selesai' | 'batal'
  jam_mulai_aktual?: string
  jam_selesai?: string
  diagnosis_post_op?: string
  tindakan_aktual?: string
  laporan_operasi?: string
  komplikasi?: string
  anestesiolog_id?: string
  perawat_instrumen?: string
  perawat_sirkuler?: string
  perdarahan_ml?: number
  jaringan_dieksisi?: string
  specimen_patologi?: boolean
  durasi_aktual_menit?: number
  klasifikasi_luka?: string
  catatan?: string
}

export interface TeamMemberInput {
  nama: string
  peran: string
  no_sip?: string
  catatan?: string
}

export interface InstrumentInput {
  nama_instrumen: string
  jumlah: number
  keterangan?: string
  status_steril?: boolean
  dikembalikan?: boolean
}

export interface AnesthesiaInput {
  jenis_anestesi: string
  teknik?: string
  obat_anestesi?: string
  dosis?: string
  asa_ps?: string
  mallampati?: string
  airway_management?: string
  posisi_pasien?: string
  monitoring?: string
  cairan_masuk?: string
  cairan_keluar?: string
  komplikasi_anestesi?: string
  catatan?: string
}

export interface NursingInput {
  fase: 'pre' | 'intra' | 'post'
  perawat_nama: string
  identitas_verified?: boolean
  site_marking?: boolean
  consent_signed?: boolean
  puasa_verified?: boolean
  alergi_checked?: boolean
  gigi_palsu_removed?: boolean
  perhiasan_removed?: boolean
  iv_line_terpasang?: boolean
  darah_tersedia?: boolean
  time_out_done?: boolean
  counting_kasa_pre?: number
  counting_kasa_post?: number
  counting_instrumen_pre?: number
  counting_instrumen_post?: number
  posisi_pasien?: string
  pemakaian_diatermi?: boolean
  drain_terpasang?: boolean
  specimen_ada?: boolean
  specimen_label?: string
  kesadaran_post?: string
  vital_signs_post?: Record<string, unknown>
  skala_nyeri_post?: number
  balutan_kondisi?: string
  drain_output?: string
  instruksi_post_op?: string
  catatan?: string
}

export class SurgeryService {
  constructor(private db: Knex) {}

  private async generateOrderNumber(tenantSchema: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `OP-${today}-`
    const [result] = await this.db
      .withSchema(tenantSchema)
      .from('surgeries')
      .where('nomor_operasi', 'like', `${prefix}%`)
      .count('id as count')
    const seq = Number(result.count) + 1
    return `${prefix}${String(seq).padStart(3, '0')}`
  }

  async createSurgery(data: CreateSurgeryInput, userId: string, tenantSchema: string) {
    const conflict = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('surgeries')
      .where({
        ruang_operasi: data.ruang_operasi,
        tanggal_operasi: data.tanggal_operasi,
      })
      .whereNotIn('status', ['selesai', 'batal'])
      .whereRaw(`
        (jam_mulai <= ? AND jam_mulai + (estimasi_durasi_menit || ' minutes')::interval > ?::time)
      `, [data.jam_mulai, data.jam_mulai])
      .first()

    if (conflict && data.jenis_operasi !== 'emergency') {
      throw new ValidationError('Ruang operasi sudah dijadwalkan pada waktu tersebut')
    }

    const nomorOperasi = await this.generateOrderNumber(tenantSchema)

    const [surgery] = await this.db
      .withSchema(tenantSchema)
      .insert({
        nomor_operasi: nomorOperasi,
        visit_id: data.visit_id,
        patient_id: data.patient_id,
        doctor_id: data.doctor_id,
        tanggal_operasi: data.tanggal_operasi,
        jam_mulai: data.jam_mulai,
        estimasi_durasi_menit: data.estimasi_durasi_menit,
        ruang_operasi: data.ruang_operasi,
        jenis_operasi: data.jenis_operasi,
        jenis_anestesi: data.jenis_anestesi,
        diagnosis_pre_op: data.diagnosis_pre_op,
        tindakan_rencana: data.tindakan_rencana,
        icd9cm_code: data.icd9cm_code || null,
        status: 'dijadwalkan',
        catatan: data.catatan || null,
        created_by: userId,
        updated_by: userId,
      })
      .into('surgeries')
      .returning('*')

    logger.info('Surgery scheduled', { surgeryId: surgery.id, nomorOperasi })
    return surgery
  }

  async updateSurgery(surgeryId: string, data: UpdateSurgeryInput, userId: string, tenantSchema: string) {
    const surgery = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('surgeries')
      .where({ id: surgeryId })
      .first()

    if (!surgery) throw new NotFoundError('Operasi')

    const updateData: Record<string, unknown> = { updated_by: userId }

    if (data.status) {
      const transitions: Record<string, string[]> = {
        dijadwalkan: ['persiapan', 'batal'],
        persiapan: ['berjalan', 'batal'],
        berjalan: ['selesai'],
      }
      const allowed = transitions[surgery.status] || []
      if (!allowed.includes(data.status)) {
        throw new ValidationError(
          `Status tidak bisa diubah dari '${surgery.status}' ke '${data.status}'`,
        )
      }
      updateData.status = data.status
      if (data.status === 'berjalan') {
        updateData.jam_mulai_aktual = data.jam_mulai_aktual || new Date().toISOString()
      }
      if (data.status === 'selesai') {
        updateData.jam_selesai = data.jam_selesai || new Date().toISOString()
      }
    }

    if (data.diagnosis_post_op) updateData.diagnosis_post_op = data.diagnosis_post_op
    if (data.tindakan_aktual) updateData.tindakan_aktual = data.tindakan_aktual
    if (data.laporan_operasi) updateData.laporan_operasi = data.laporan_operasi
    if (data.komplikasi !== undefined) updateData.komplikasi = data.komplikasi
    if (data.anestesiolog_id) updateData.anestesiolog_id = data.anestesiolog_id
    if (data.perawat_instrumen) updateData.perawat_instrumen = data.perawat_instrumen
    if (data.perawat_sirkuler) updateData.perawat_sirkuler = data.perawat_sirkuler
    if (data.perdarahan_ml !== undefined) updateData.perdarahan_ml = data.perdarahan_ml
    if (data.jaringan_dieksisi !== undefined) updateData.jaringan_dieksisi = data.jaringan_dieksisi
    if (data.specimen_patologi !== undefined) updateData.specimen_patologi = data.specimen_patologi
    if (data.durasi_aktual_menit !== undefined) updateData.durasi_aktual_menit = data.durasi_aktual_menit
    if (data.klasifikasi_luka) updateData.klasifikasi_luka = data.klasifikasi_luka
    if (data.catatan !== undefined) updateData.catatan = data.catatan

    await this.db
      .withSchema(tenantSchema)
      .from('surgeries')
      .where({ id: surgeryId })
      .update(updateData)

    return this.getSurgery(surgeryId, tenantSchema)
  }

  async listSurgeries(
    tenantSchema: string,
    filters?: {
      status?: string
      tanggal?: string
      ruang?: string
      doctor_id?: string
      page?: number
      limit?: number
    },
  ) {
    const page = filters?.page || 1
    const limit = filters?.limit || 20
    const offset = (page - 1) * limit

    const query = this.db
      .withSchema(tenantSchema)
      .from('surgeries as s')
      .join('patients as p', 'p.id', 's.patient_id')

    if (filters?.status) query.where('s.status', filters.status)
    if (filters?.tanggal) query.where('s.tanggal_operasi', filters.tanggal)
    if (filters?.ruang) query.where('s.ruang_operasi', filters.ruang)
    if (filters?.doctor_id) query.where('s.doctor_id', filters.doctor_id)

    const [{ count }] = await query.clone().count('s.id as count')
    const total = Number(count)

    const surgeries = await query
      .clone()
      .select('s.*', 'p.nama as patient_nama', 'p.no_rekam_medis')
      .orderByRaw(`
        CASE s.jenis_operasi
          WHEN 'emergency' THEN 0 WHEN 'cito' THEN 1 WHEN 'elektif' THEN 2 END
      `)
      .orderBy('s.tanggal_operasi', 'asc')
      .orderBy('s.jam_mulai', 'asc')
      .offset(offset)
      .limit(limit)

    return { data: surgeries, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async getSurgery(surgeryId: string, tenantSchema: string) {
    const surgery = await this.db
      .withSchema(tenantSchema)
      .select(
        's.*',
        'p.nama as patient_nama', 'p.no_rekam_medis', 'p.jenis_kelamin',
        'p.tanggal_lahir', 'p.golongan_darah', 'p.alamat as patient_alamat',
        'v.visit_number',
      )
      .from('surgeries as s')
      .join('patients as p', 'p.id', 's.patient_id')
      .join('visits as v', 'v.id', 's.visit_id')
      .where('s.id', surgeryId)
      .first()

    if (!surgery) throw new NotFoundError('Operasi')
    return surgery
  }

  async getTodaySchedule(tenantSchema: string) {
    const today = new Date().toISOString().slice(0, 10)
    return this.listSurgeries(tenantSchema, { tanggal: today, limit: 100 })
  }

  // ── Tim Bedah ──
  async getTeamMembers(surgeryId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('*').from('surgery_team_members')
      .where({ surgery_id: surgeryId }).orderBy('created_at', 'asc')
  }

  async setTeamMembers(surgeryId: string, members: TeamMemberInput[], tenantSchema: string) {
    await this.db.withSchema(tenantSchema).from('surgery_team_members').where({ surgery_id: surgeryId }).del()
    if (members.length === 0) return []
    const rows = members.map(m => ({
      surgery_id: surgeryId,
      nama: m.nama,
      peran: m.peran,
      no_sip: m.no_sip || null,
      catatan: m.catatan || null,
    }))
    await this.db.withSchema(tenantSchema).insert(rows).into('surgery_team_members')
    return this.getTeamMembers(surgeryId, tenantSchema)
  }

  // ── Instrumen ──
  async getInstruments(surgeryId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('*').from('surgery_instruments')
      .where({ surgery_id: surgeryId }).orderBy('created_at', 'asc')
  }

  async setInstruments(surgeryId: string, instruments: InstrumentInput[], tenantSchema: string) {
    await this.db.withSchema(tenantSchema).from('surgery_instruments').where({ surgery_id: surgeryId }).del()
    if (instruments.length === 0) return []
    const rows = instruments.map(i => ({
      surgery_id: surgeryId,
      nama_instrumen: i.nama_instrumen,
      jumlah: i.jumlah || 1,
      keterangan: i.keterangan || null,
      status_steril: i.status_steril ?? true,
      dikembalikan: i.dikembalikan ?? false,
    }))
    await this.db.withSchema(tenantSchema).insert(rows).into('surgery_instruments')
    return this.getInstruments(surgeryId, tenantSchema)
  }

  // ── Catatan Anestesi ──
  async getAnesthesia(surgeryId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('*').from('surgery_anesthesia')
      .where({ surgery_id: surgeryId }).first() || null
  }

  async upsertAnesthesia(surgeryId: string, data: AnesthesiaInput, userId: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('surgery_anesthesia').where({ surgery_id: surgeryId }).first()

    if (existing) {
      await this.db.withSchema(tenantSchema).from('surgery_anesthesia')
        .where({ surgery_id: surgeryId })
        .update({ ...data, updated_at: new Date() })
    } else {
      await this.db.withSchema(tenantSchema).insert({
        surgery_id: surgeryId, ...data, created_by: userId,
      }).into('surgery_anesthesia')
    }
    return this.getAnesthesia(surgeryId, tenantSchema)
  }

  // ── Keperawatan Perioperatif ──
  async getNursingRecords(surgeryId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('*').from('surgery_nursing')
      .where({ surgery_id: surgeryId }).orderByRaw(`
        CASE fase WHEN 'pre' THEN 0 WHEN 'intra' THEN 1 WHEN 'post' THEN 2 END
      `)
  }

  async upsertNursingRecord(surgeryId: string, data: NursingInput, userId: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('surgery_nursing')
      .where({ surgery_id: surgeryId, fase: data.fase }).first()

    const row = {
      ...data,
      vital_signs_post: data.vital_signs_post ? JSON.stringify(data.vital_signs_post) : null,
    }

    if (existing) {
      await this.db.withSchema(tenantSchema).from('surgery_nursing')
        .where({ id: existing.id })
        .update({ ...row, updated_at: new Date() })
    } else {
      await this.db.withSchema(tenantSchema).insert({
        surgery_id: surgeryId, ...row, created_by: userId,
      }).into('surgery_nursing')
    }
    return this.getNursingRecords(surgeryId, tenantSchema)
  }

  // ── Full detail (gabungan) ──
  async getFullSurgeryDetail(surgeryId: string, tenantSchema: string) {
    const surgery = await this.getSurgery(surgeryId, tenantSchema)
    const team = await this.getTeamMembers(surgeryId, tenantSchema)
    const instruments = await this.getInstruments(surgeryId, tenantSchema)
    const anesthesia = await this.getAnesthesia(surgeryId, tenantSchema)
    const nursing = await this.getNursingRecords(surgeryId, tenantSchema)

    return { ...surgery, team, instruments, anesthesia, nursing }
  }
}
