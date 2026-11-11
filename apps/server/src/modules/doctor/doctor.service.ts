import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'

interface ScheduleInput {
  room_id: string
  hari: string
  jam_mulai: string
  jam_selesai: string
  kuota?: number
  catatan?: string
}

interface FeeInput {
  kode: string
  nama_layanan: string
  kategori?: string
  tarif: number
  persentase_dokter?: number
  persentase_rs?: number
}

interface FeeTransactionInput {
  doctor_id: string
  visit_id: string
  fee_id?: string
  deskripsi: string
  tarif: number
  persentase_dokter?: number
  persentase_rs?: number
}

export type DoctorStatus = 'aktif' | 'cuti_panjang' | 'pindah' | 'resign' | 'pensiun'

export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = {
  aktif: 'Aktif',
  cuti_panjang: 'Cuti Panjang',
  pindah: 'Pindah',
  resign: 'Resign',
  pensiun: 'Pensiun',
}

export class DoctorService {
  constructor(private db: Knex) {}

  // ── LIST DOCTORS (admin view with schedule) ──

  async listDoctors(tenantSchema: string, filters?: {
    status?: DoctorStatus
    includeInactive?: boolean
    includeDeleted?: boolean
  }) {
    let query = this.db
      .withSchema(tenantSchema)
      .select(
        'doctors.id',
        'doctors.user_id',
        'doctors.spesialisasi',
        'doctors.no_sip',
        'doctors.no_str',
        'doctors.tarif_konsultasi',
        'doctors.jadwal_praktek',
        'doctors.is_available',
        'doctors.status',
        'doctors.status_changed_at',
        'doctors.status_note',
        'doctors.deleted_at',
        'doctors.created_at',
        'users.name as nama',
        'users.email',
      )
      .from('doctors')
      .join('users', 'doctors.user_id', 'users.id')
      .orderBy('users.name')

    // Exclude soft-deleted unless requested
    if (!filters?.includeDeleted) {
      query = query.whereNull('doctors.deleted_at')
    }

    if (filters?.status) {
      query = query.where('doctors.status', filters.status)
    } else if (!filters?.includeInactive) {
      query = query.whereIn('doctors.status', ['aktif', 'cuti_panjang'])
    }

    return query
  }

  async getDoctorById(doctorId: string, tenantSchema: string) {
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select(
        'doctors.*',
        'users.name as nama',
        'users.email',
        'users.is_active as user_is_active',
      )
      .from('doctors')
      .join('users', 'doctors.user_id', 'users.id')
      .where('doctors.id', doctorId)
      .first()

    if (!doctor) throw new NotFoundError('Dokter')

    // Get schedules
    const schedules = await this.db
      .withSchema(tenantSchema)
      .select(
        'doctor_schedules.*',
        'rooms.nama as room_nama',
        'rooms.kode as room_kode',
      )
      .from('doctor_schedules')
      .join('rooms', 'doctor_schedules.room_id', 'rooms.id')
      .where('doctor_schedules.doctor_id', doctorId)
      .orderByRaw(`CASE hari
        WHEN 'senin' THEN 1 WHEN 'selasa' THEN 2 WHEN 'rabu' THEN 3
        WHEN 'kamis' THEN 4 WHEN 'jumat' THEN 5 WHEN 'sabtu' THEN 6
        WHEN 'minggu' THEN 7 END`)

    // Get fees
    const fees = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('doctor_fees')
      .where({ doctor_id: doctorId })
      .orderBy('kategori')
      .orderBy('nama_layanan')

    return { ...doctor, schedules, fees }
  }

  async updateDoctor(
    doctorId: string,
    data: {
      spesialisasi?: string
      no_sip?: string
      no_str?: string
      tarif_konsultasi?: number
      is_available?: boolean
      status?: DoctorStatus
      status_note?: string
    },
    tenantSchema: string,
  ) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('doctors')
      .where({ id: doctorId })
      .first()

    if (!existing) throw new NotFoundError('Dokter')

    const updateData: Record<string, unknown> = {}
    if (data.spesialisasi !== undefined) updateData.spesialisasi = data.spesialisasi
    if (data.no_sip !== undefined) updateData.no_sip = data.no_sip
    if (data.no_str !== undefined) updateData.no_str = data.no_str
    if (data.tarif_konsultasi !== undefined) updateData.tarif_konsultasi = data.tarif_konsultasi
    if (data.is_available !== undefined) updateData.is_available = data.is_available

    // Status lifecycle change
    if (data.status !== undefined && data.status !== existing.status) {
      updateData.status = data.status
      updateData.status_changed_at = new Date()
      updateData.status_note = data.status_note ?? null

      // Auto-set is_available based on status
      if (['pindah', 'resign', 'pensiun', 'cuti_panjang'].includes(data.status)) {
        updateData.is_available = false
      }
    } else if (data.status_note !== undefined) {
      updateData.status_note = data.status_note
    }

    updateData.updated_at = new Date()

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('doctors')
      .where({ id: doctorId })
      .update(updateData)
      .returning('*')

    logger.info('Doctor updated', { doctorId, changes: Object.keys(updateData), tenant: tenantSchema })
    return updated
  }

  // ── SCHEDULES ──

  async listSchedules(doctorId: string, tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select(
        'doctor_schedules.*',
        'rooms.nama as room_nama',
        'rooms.kode as room_kode',
      )
      .from('doctor_schedules')
      .join('rooms', 'doctor_schedules.room_id', 'rooms.id')
      .where('doctor_schedules.doctor_id', doctorId)
      .orderByRaw(`CASE hari
        WHEN 'senin' THEN 1 WHEN 'selasa' THEN 2 WHEN 'rabu' THEN 3
        WHEN 'kamis' THEN 4 WHEN 'jumat' THEN 5 WHEN 'sabtu' THEN 6
        WHEN 'minggu' THEN 7 END`)
  }

  async upsertSchedule(doctorId: string, data: ScheduleInput, tenantSchema: string) {
    // Check doctor exists
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id').from('doctors').where({ id: doctorId }).first()
    if (!doctor) throw new NotFoundError('Dokter')

    // Check room exists
    const room = await this.db
      .withSchema(tenantSchema)
      .select('id').from('rooms').where({ id: data.room_id }).first()
    if (!room) throw new NotFoundError('Ruangan')

    // Upsert — insert or update if same doctor+room+day
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('doctor_schedules')
      .where({ doctor_id: doctorId, room_id: data.room_id, hari: data.hari })
      .first()

    if (existing) {
      const [updated] = await this.db
        .withSchema(tenantSchema)
        .table('doctor_schedules')
        .where({ id: existing.id })
        .update({
          jam_mulai: data.jam_mulai,
          jam_selesai: data.jam_selesai,
          kuota: data.kuota ?? 30,
          catatan: data.catatan ?? null,
          is_active: true,
        })
        .returning('*')
      return updated
    }

    const [inserted] = await this.db
      .withSchema(tenantSchema)
      .insert({
        doctor_id: doctorId,
        room_id: data.room_id,
        hari: data.hari,
        jam_mulai: data.jam_mulai,
        jam_selesai: data.jam_selesai,
        kuota: data.kuota ?? 30,
        catatan: data.catatan ?? null,
      })
      .into('doctor_schedules')
      .returning('*')

    logger.info('Schedule created', { doctorId, hari: data.hari, tenant: tenantSchema })
    return inserted
  }

  async deleteSchedule(scheduleId: string, tenantSchema: string) {
    const count = await this.db
      .withSchema(tenantSchema)
      .table('doctor_schedules')
      .where({ id: scheduleId })
      .del()

    if (count === 0) throw new NotFoundError('Jadwal')
    logger.info('Schedule deleted', { scheduleId, tenant: tenantSchema })
  }

  async toggleSchedule(scheduleId: string, isActive: boolean, tenantSchema: string) {
    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('doctor_schedules')
      .where({ id: scheduleId })
      .update({ is_active: isActive })
      .returning('*')

    if (!updated) throw new NotFoundError('Jadwal')
    return updated
  }

  // Get today's schedule across all doctors
  async getTodaySchedule(tenantSchema: string) {
    const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
    const todayDay = days[new Date().getDay()]

    return this.db
      .withSchema(tenantSchema)
      .select(
        'doctor_schedules.*',
        'users.name as doctor_nama',
        'doctors.spesialisasi',
        'rooms.nama as room_nama',
        'rooms.kode as room_kode',
      )
      .from('doctor_schedules')
      .join('doctors', 'doctor_schedules.doctor_id', 'doctors.id')
      .join('users', 'doctors.user_id', 'users.id')
      .join('rooms', 'doctor_schedules.room_id', 'rooms.id')
      .where('doctor_schedules.hari', todayDay)
      .where('doctor_schedules.is_active', true)
      .orderBy('rooms.nama')
      .orderBy('doctor_schedules.jam_mulai')
  }

  // ── FEES ──

  async listFees(doctorId: string, tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('doctor_fees')
      .where({ doctor_id: doctorId })
      .orderBy('kategori')
      .orderBy('nama_layanan')
  }

  async createFee(doctorId: string, data: FeeInput, tenantSchema: string) {
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id').from('doctors').where({ id: doctorId }).first()
    if (!doctor) throw new NotFoundError('Dokter')

    const persenDokter = data.persentase_dokter ?? 80
    const persenRS = data.persentase_rs ?? (100 - persenDokter)

    if (persenDokter + persenRS !== 100) {
      throw new ValidationError('Persentase dokter + RS harus = 100%')
    }

    try {
      const [fee] = await this.db
        .withSchema(tenantSchema)
        .insert({
          doctor_id: doctorId,
          kode: data.kode,
          nama_layanan: data.nama_layanan,
          kategori: data.kategori ?? 'konsultasi',
          tarif: data.tarif,
          persentase_dokter: persenDokter,
          persentase_rs: persenRS,
        })
        .into('doctor_fees')
        .returning('*')

      logger.info('Fee created', { doctorId, kode: data.kode, tenant: tenantSchema })
      return fee
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr.code === '23505') {
        throw new ConflictError(`Kode layanan "${data.kode}" sudah ada untuk dokter ini`)
      }
      throw err
    }
  }

  async updateFee(
    feeId: string,
    data: Partial<FeeInput> & { is_active?: boolean },
    tenantSchema: string,
  ) {
    const updateData: Record<string, unknown> = {}
    if (data.nama_layanan !== undefined) updateData.nama_layanan = data.nama_layanan
    if (data.kategori !== undefined) updateData.kategori = data.kategori
    if (data.tarif !== undefined) updateData.tarif = data.tarif
    if (data.persentase_dokter !== undefined) updateData.persentase_dokter = data.persentase_dokter
    if (data.persentase_rs !== undefined) updateData.persentase_rs = data.persentase_rs
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('doctor_fees')
      .where({ id: feeId })
      .update(updateData)
      .returning('*')

    if (!updated) throw new NotFoundError('Tarif layanan')
    return updated
  }

  async deleteFee(feeId: string, tenantSchema: string) {
    const count = await this.db
      .withSchema(tenantSchema)
      .table('doctor_fees')
      .where({ id: feeId })
      .del()

    if (count === 0) throw new NotFoundError('Tarif layanan')
  }

  // ── FEE TRANSACTIONS (Jasa Medis) ──

  async recordFeeTransaction(data: FeeTransactionInput, tenantSchema: string) {
    const persenDokter = data.persentase_dokter ?? 80
    const persenRS = data.persentase_rs ?? 20
    const jumlahDokter = (data.tarif * persenDokter) / 100
    const jumlahRS = (data.tarif * persenRS) / 100

    const [tx] = await this.db
      .withSchema(tenantSchema)
      .insert({
        doctor_id: data.doctor_id,
        visit_id: data.visit_id,
        fee_id: data.fee_id ?? null,
        deskripsi: data.deskripsi,
        tarif: data.tarif,
        jumlah_dokter: jumlahDokter,
        jumlah_rs: jumlahRS,
      })
      .into('doctor_fee_transactions')
      .returning('*')

    return tx
  }

  /**
   * Record fee from a visit, automatically routing to the correct doctor.
   * If visit was substituted, fee goes to the substitute (visit.doctor_id),
   * and deskripsi notes the substitution.
   */
  async recordFeeFromVisit(
    visitId: string,
    deskripsi: string,
    tarif: number,
    tenantSchema: string,
    feeId?: string,
    persentaseDokter?: number,
    persentaseRs?: number,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('doctor_id', 'original_doctor_id', 'substitution_id')
      .from('visits')
      .where('id', visitId)
      .first()

    if (!visit) throw new NotFoundError('Visit')

    let finalDeskripsi = deskripsi
    if (visit.original_doctor_id && visit.substitution_id) {
      const originalDoc = await this.db
        .withSchema(tenantSchema)
        .select('u.name')
        .from('doctors as d')
        .join('users as u', 'u.id', 'd.user_id')
        .where('d.id', visit.original_doctor_id)
        .first()

      if (originalDoc) {
        finalDeskripsi += ` (pengganti dr. ${originalDoc.name})`
      }
    }

    return this.recordFeeTransaction({
      doctor_id: visit.doctor_id,
      visit_id: visitId,
      fee_id: feeId,
      deskripsi: finalDeskripsi,
      tarif,
      persentase_dokter: persentaseDokter,
      persentase_rs: persentaseRs,
    }, tenantSchema)
  }

  async getDoctorEarnings(
    doctorId: string,
    tenantSchema: string,
    filters?: { start?: string; end?: string },
  ) {
    let query = this.db
      .withSchema(tenantSchema)
      .select(
        'doctor_fee_transactions.*',
        'visits.visit_number',
        'visits.tanggal',
        'visits.original_doctor_id',
        'visits.substitution_id',
        'patients.nama as patient_nama',
        'u_orig.name as original_doctor_nama',
      )
      .from('doctor_fee_transactions')
      .join('visits', 'doctor_fee_transactions.visit_id', 'visits.id')
      .join('patients', 'visits.patient_id', 'patients.id')
      .leftJoin('doctors as d_orig', 'd_orig.id', 'visits.original_doctor_id')
      .leftJoin('users as u_orig', 'u_orig.id', 'd_orig.user_id')
      .where('doctor_fee_transactions.doctor_id', doctorId)
      .orderBy('doctor_fee_transactions.created_at', 'desc')

    if (filters?.start) {
      query = query.where('visits.tanggal', '>=', filters.start)
    }
    if (filters?.end) {
      query = query.where('visits.tanggal', '<=', filters.end)
    }

    const transactions = await query

    // Summary
    const summary = await this.db
      .withSchema(tenantSchema)
      .select(
        this.db.raw('COUNT(*) as total_transaksi'),
        this.db.raw('COALESCE(SUM(tarif), 0) as total_tarif'),
        this.db.raw('COALESCE(SUM(jumlah_dokter), 0) as total_jasa_dokter'),
        this.db.raw('COALESCE(SUM(jumlah_rs), 0) as total_jasa_rs'),
      )
      .from('doctor_fee_transactions')
      .where('doctor_id', doctorId)
      .modify((qb) => {
        if (filters?.start) {
          qb.whereExists(
            this.db
              .withSchema(tenantSchema)
              .select(1)
              .from('visits')
              .whereRaw(`visits.id = "${tenantSchema}".doctor_fee_transactions.visit_id`)
              .where('visits.tanggal', '>=', filters.start!),
          )
        }
        if (filters?.end) {
          qb.whereExists(
            this.db
              .withSchema(tenantSchema)
              .select(1)
              .from('visits')
              .whereRaw(`visits.id = "${tenantSchema}".doctor_fee_transactions.visit_id`)
              .where('visits.tanggal', '<=', filters.end!),
          )
        }
      })
      .first()

    return {
      transactions,
      summary: {
        total_transaksi: Number(summary?.total_transaksi ?? 0),
        total_tarif: Number(summary?.total_tarif ?? 0),
        total_jasa_dokter: Number(summary?.total_jasa_dokter ?? 0),
        total_jasa_rs: Number(summary?.total_jasa_rs ?? 0),
      },
    }
  }

  // Earnings summary across all doctors (for admin report)
  async getAllDoctorEarnings(
    tenantSchema: string,
    filters?: { start?: string; end?: string },
  ) {
    let query = this.db
      .withSchema(tenantSchema)
      .select(
        'doctor_fee_transactions.doctor_id',
        'users.name as doctor_nama',
        'doctors.spesialisasi',
        this.db.raw('COUNT(*) as total_transaksi'),
        this.db.raw('COALESCE(SUM(doctor_fee_transactions.tarif), 0) as total_tarif'),
        this.db.raw('COALESCE(SUM(doctor_fee_transactions.jumlah_dokter), 0) as total_jasa_dokter'),
        this.db.raw('COALESCE(SUM(doctor_fee_transactions.jumlah_rs), 0) as total_jasa_rs'),
      )
      .from('doctor_fee_transactions')
      .join('doctors', 'doctor_fee_transactions.doctor_id', 'doctors.id')
      .join('users', 'doctors.user_id', 'users.id')
      .groupBy('doctor_fee_transactions.doctor_id', 'users.name', 'doctors.spesialisasi')
      .orderBy('total_jasa_dokter', 'desc')

    if (filters?.start) {
      query = query.whereExists(
        this.db
          .withSchema(tenantSchema)
          .select(1)
          .from('visits')
          .whereRaw(`visits.id = "${tenantSchema}".doctor_fee_transactions.visit_id`)
          .where('visits.tanggal', '>=', filters.start),
      )
    }
    if (filters?.end) {
      query = query.whereExists(
        this.db
          .withSchema(tenantSchema)
          .select(1)
          .from('visits')
          .whereRaw(`visits.id = "${tenantSchema}".doctor_fee_transactions.visit_id`)
          .where('visits.tanggal', '<=', filters.end),
      )
    }

    return query
  }

  // ── SOFT-DELETE (Nonaktifkan) ──

  async deactivateDoctor(
    doctorId: string,
    tenantSchema: string,
    reason?: string,
  ) {
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id', 'user_id', 'status', 'deleted_at')
      .from('doctors')
      .where({ id: doctorId })
      .first()

    if (!doctor) throw new NotFoundError('Dokter')
    if (doctor.deleted_at) throw new ValidationError('Dokter sudah dinonaktifkan sebelumnya')

    // 1. Soft-delete the doctor record
    await this.db
      .withSchema(tenantSchema)
      .table('doctors')
      .where({ id: doctorId })
      .update({
        deleted_at: new Date(),
        is_available: false,
        status: doctor.status === 'aktif' ? 'resign' : doctor.status,
        status_changed_at: new Date(),
        status_note: reason || 'Dinonaktifkan oleh admin',
        updated_at: new Date(),
      })

    // 2. Deactivate all schedules
    await this.db
      .withSchema(tenantSchema)
      .table('doctor_schedules')
      .where({ doctor_id: doctorId })
      .update({ is_active: false })

    // 3. Deactivate the linked user account
    await this.db
      .withSchema(tenantSchema)
      .table('users')
      .where({ id: doctor.user_id })
      .update({ is_active: false, updated_at: new Date() })

    logger.info('Doctor deactivated (soft-delete)', {
      doctorId,
      userId: doctor.user_id,
      reason,
      tenant: tenantSchema,
    })

    return { doctorId, deactivated: true }
  }

  async reactivateDoctor(doctorId: string, tenantSchema: string) {
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id', 'user_id', 'deleted_at')
      .from('doctors')
      .where({ id: doctorId })
      .first()

    if (!doctor) throw new NotFoundError('Dokter')
    if (!doctor.deleted_at) throw new ValidationError('Dokter masih aktif, tidak perlu reaktivasi')

    // 1. Undo soft-delete
    await this.db
      .withSchema(tenantSchema)
      .table('doctors')
      .where({ id: doctorId })
      .update({
        deleted_at: null,
        is_available: true,
        status: 'aktif',
        status_changed_at: new Date(),
        status_note: 'Diaktifkan kembali oleh admin',
        updated_at: new Date(),
      })

    // 2. Reactivate the linked user account
    await this.db
      .withSchema(tenantSchema)
      .table('users')
      .where({ id: doctor.user_id })
      .update({ is_active: true, updated_at: new Date() })

    logger.info('Doctor reactivated', {
      doctorId,
      userId: doctor.user_id,
      tenant: tenantSchema,
    })

    return { doctorId, reactivated: true }
  }
}
