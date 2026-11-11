import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'
import { SubstitutionService } from '../doctor/substitution.service'
import type { CreateVisitInput, ListVisitsInput } from './registration.validator'

const MAX_RETRY = 3

export class RegistrationService {
  private substitutionService: SubstitutionService

  constructor(private db: Knex) {
    this.substitutionService = new SubstitutionService(db)
  }

  /**
   * Daftarkan kunjungan baru.
   * Menjalankan semua validasi bisnis Khanza sebelum insert.
   */
  async createVisit(
    data: CreateVisitInput,
    tenantSchema: string,
    userId: string,
  ) {
    // --- Validasi bisnis ---

    // 1. Cek pasien ada
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'is_active', 'is_deceased')
      .from('patients')
      .where({ id: data.patient_id })
      .whereNull('deleted_at')
      .first()

    if (!patient) throw new NotFoundError('Pasien')
    if (!patient.is_active) {
      throw new ValidationError('Pasien tidak aktif')
    }
    if (patient.is_deceased) {
      throw new ValidationError('Pasien tercatat telah meninggal dunia dan tidak dapat didaftarkan')
    }

    // 2. Blokir jika pasien masih rawat inap aktif
    const activeInpatient = await this.db
      .withSchema(tenantSchema)
      .select('id', 'visit_number')
      .from('visits')
      .where({ patient_id: data.patient_id, tipe: 'rawat_inap' })
      .whereIn('status', ['menunggu', 'diperiksa', 'rawat_inap'])
      .whereNull('deleted_at')
      .first()

    if (activeInpatient) {
      throw new ConflictError(
        `Pasien masih rawat inap aktif (${activeInpatient.visit_number}). Selesaikan terlebih dahulu.`,
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // 4. Cek dokter available & status aktif — dengan auto-substitusi
    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id', 'is_available')
      .from('doctors')
      .where({ id: data.doctor_id })
      .first()

    if (!doctor) throw new NotFoundError('Dokter')

    let actualDoctorId = data.doctor_id
    let originalDoctorId: string | null = null
    let substitutionId: string | null = null

    if (!doctor.is_available) {
      // Check for active substitution
      const substitution = await this.substitutionService.getActiveSubstitute(
        data.doctor_id,
        tenantSchema,
        today,
      )

      if (substitution) {
        actualDoctorId = substitution.substitute_doctor_id
        originalDoctorId = data.doctor_id
        substitutionId = substitution.id
        logger.info(
          `Doctor substitution applied: ${data.doctor_id} → ${actualDoctorId}`,
          { substitutionId, tenantSchema },
        )
      } else {
        throw new ValidationError(
          'Dokter tidak tersedia / sedang cuti dan belum ada pengganti yang ditunjuk. Pilih dokter lain.',
        )
      }
    }

    // 5. Blokir duplikasi pendaftaran (poli + dokter aktual + tanggal sama)
    const duplicate = await this.db
      .withSchema(tenantSchema)
      .select('id', 'visit_number')
      .from('visits')
      .where({
        patient_id: data.patient_id,
        room_id: data.room_id,
        doctor_id: actualDoctorId,
        tanggal: today,
      })
      .whereNotIn('status', ['batal', 'selesai', 'pulang'])
      .whereNull('deleted_at')
      .first()

    if (duplicate) {
      throw new ConflictError(
        `Pasien sudah terdaftar di poli/dokter yang sama hari ini (${duplicate.visit_number}). Gunakan check-in.`,
      )
    }

    // 6. Cek ruangan ada dan aktif
    const room = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'is_active')
      .from('rooms')
      .where({ id: data.room_id })
      .first()

    if (!room) throw new NotFoundError('Ruangan')
    if (!room.is_active) {
      throw new ValidationError('Ruangan tidak aktif')
    }

    // --- Insert visit + queue dalam transaction ---
    return this.db.transaction(async (trx) => {
      // Generate visit_number dengan retry
      let visitNumber = ''
      let attempt = 0
      let visit: Record<string, unknown> | null = null

      while (attempt < MAX_RETRY) {
        try {
          visitNumber = await this.generateVisitNumber(tenantSchema, trx)

          const insertData: Record<string, unknown> = {
              patient_id: data.patient_id,
              visit_number: visitNumber,
              tipe: data.tipe,
              tanggal: today,
              room_id: data.room_id,
              doctor_id: actualDoctorId,
              original_doctor_id: originalDoctorId,
              substitution_id: substitutionId,
              bed_id: data.bed_id || null,
              keluhan_utama: data.keluhan_utama || null,
              cara_masuk: data.cara_masuk,
              penjamin: data.penjamin,
              insurance_id: data.insurance_id || null,
              no_sep: data.no_sep || null,
              no_rujukan: data.no_rujukan || null,
              catatan: data.catatan || null,
              is_laka_lantas: data.is_laka_lantas || false,
              laka_lantas_data: data.laka_lantas_data
                ? JSON.stringify(data.laka_lantas_data)
                : null,
              created_by: userId,
              updated_by: userId,
            }

          const [inserted] = await trx
            .withSchema(tenantSchema)
            .insert(insertData)
            .into('visits')
            .returning('*')

          visit = inserted
          break
        } catch (err: unknown) {
          const pgErr = err as { code?: string; constraint?: string }
          if (pgErr.code === '23505' && pgErr.constraint?.includes('visit_number')) {
            attempt++
            continue
          }
          throw err
        }
      }

      if (!visit) {
        throw new ConflictError('Gagal generate nomor kunjungan. Coba lagi.')
      }

      // Rawat inap langsung: assign bed + set status rawat_inap + record transfer
      if (data.tipe === 'rawat_inap' && data.bed_id) {
        const bed = await trx.withSchema(tenantSchema)
          .select('id', 'status', 'room_id').from('beds').where({ id: data.bed_id }).first()

        if (bed && bed.status === 'tersedia') {
          await trx.withSchema(tenantSchema)
            .update({ status: 'rawat_inap', updated_by: userId, updated_at: new Date() })
            .from('visits').where({ id: visit.id })

          await trx.withSchema(tenantSchema)
            .update({
              status: 'terisi',
              current_patient_id: data.patient_id,
              updated_at: new Date(),
            })
            .from('beds').where({ id: data.bed_id })

          // Record initial bed assignment in bed_transfers
          const room = await trx.withSchema(tenantSchema)
            .select('id', 'nama', 'tarif_per_hari', 'kelas')
            .from('rooms').where({ id: bed.room_id }).first()

          await trx.withSchema(tenantSchema)
            .insert({
              visit_id: visit.id,
              to_bed_id: data.bed_id,
              to_room_id: bed.room_id,
              to_room_nama: room?.nama || '',
              to_room_tarif: room?.tarif_per_hari || 0,
              to_room_kelas: room?.kelas || null,
              transferred_at: new Date(),
              transferred_by: userId,
              catatan: 'Admisi awal',
            })
            .into('bed_transfers')

          visit.status = 'rawat_inap'
        }
      }

      // Generate antrian (skip untuk rawat inap langsung)
      let queue: Record<string, unknown> | null = null
      if (data.tipe !== 'rawat_inap') {
        const [{ max_antrian }] = await trx
          .withSchema(tenantSchema)
          .from('queues')
          .join('visits', 'queues.visit_id', 'visits.id')
          .where('queues.room_id', data.room_id)
          .where('visits.tanggal', today)
          .max('nomor_antrian as max_antrian')

        const nomorAntrian = (max_antrian || 0) + 1

        const [inserted] = await trx
          .withSchema(tenantSchema)
          .insert({
            visit_id: visit.id,
            room_id: data.room_id,
            nomor_antrian: nomorAntrian,
          })
          .into('queues')
          .returning('*')

        queue = inserted
      }

      logger.info('Visit created', {
        visitId: visit.id,
        visitNumber,
        patientId: data.patient_id,
        tipe: data.tipe,
        tenant: tenantSchema,
      })

      return { visit, queue }
    })
  }

  async getVisitById(id: string, tenantSchema: string) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select(
        'visits.*',
        'patients.nama as patient_nama',
        'patients.no_rekam_medis',
        'patients.nik as patient_nik',
        'rooms.nama as room_nama',
        'rooms.kode as room_kode',
      )
      .from('visits')
      .join('patients', 'visits.patient_id', 'patients.id')
      .join('rooms', 'visits.room_id', 'rooms.id')
      .where('visits.id', id)
      .whereNull('visits.deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    // Get queue info
    const queue = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('queues')
      .where({ visit_id: id })
      .first()

    return { ...visit, queue }
  }

  async listVisits(filters: ListVisitsInput, tenantSchema: string) {
    const { page, limit } = filters
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .from('visits')
      .whereNull('visits.deleted_at')

    if (filters.tanggal) {
      query = query.where('visits.tanggal', filters.tanggal)
    }
    if (filters.status) {
      query = query.where('visits.status', filters.status)
    }
    if (filters.tipe) {
      query = query.where('visits.tipe', filters.tipe)
    }
    if (filters.room_id) {
      query = query.where('visits.room_id', filters.room_id)
    }
    if (filters.doctor_id) {
      query = query.where('visits.doctor_id', filters.doctor_id)
    }
    if (filters.patient_id) {
      query = query.where('visits.patient_id', filters.patient_id)
    }

    const [{ count }] = await query.clone().count('visits.id as count')
    const total = Number(count)

    const visits = await query
      .select(
        'visits.*',
        'patients.nama as patient_nama',
        'patients.no_rekam_medis',
        'patients.tanggal_lahir',
        'patients.jenis_kelamin',
        'rooms.nama as room_nama',
        'rooms.kode as room_kode',
        'queues.id as queue_id',
        'queues.nomor_antrian',
        'queues.status as queue_status',
        'queues.called_at',
        'queues.served_at',
        'queues.finished_at',
      )
      .join('patients', 'visits.patient_id', 'patients.id')
      .join('rooms', 'visits.room_id', 'rooms.id')
      .leftJoin('queues', 'queues.visit_id', 'visits.id')
      .orderBy('visits.created_at', 'desc')
      .limit(limit)
      .offset(offset)

    // Shape queue data into nested object
    const shaped = visits.map((v: Record<string, unknown>) => {
      const { queue_id, nomor_antrian, queue_status, called_at, served_at, finished_at, ...rest } = v
      return {
        ...rest,
        queue: queue_id
          ? { id: queue_id, nomor_antrian, status: queue_status, called_at, served_at, finished_at }
          : null,
      }
    })

    return {
      data: shaped,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async updateVisitStatus(
    visitId: string,
    status: string,
    tenantSchema: string,
    userId: string,
    catatan?: string,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('visits')
      .where({ id: visitId })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    const updateData: Record<string, unknown> = {
      status,
      updated_by: userId,
    }
    if (catatan) updateData.catatan = catatan

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('visits')
      .where({ id: visitId })
      .update(updateData)
      .returning('*')

    // Update queue status sesuai visit status
    const queueStatusMap: Record<string, string> = {
      diperiksa: 'dilayani',
      selesai: 'selesai',
      batal: 'batal',
      pulang: 'selesai',
    }

    const queueStatus = queueStatusMap[status]
    if (queueStatus) {
      const queueUpdate: Record<string, unknown> = { status: queueStatus }
      if (status === 'diperiksa') queueUpdate.served_at = new Date()
      if (status === 'selesai' || status === 'pulang') queueUpdate.finished_at = new Date()

      await this.db
        .withSchema(tenantSchema)
        .table('queues')
        .where({ visit_id: visitId })
        .update(queueUpdate)
    }

    logger.info('Visit status updated', { visitId, status, tenant: tenantSchema })
    return updated
  }

  async cancelVisit(
    visitId: string,
    alasan: string,
    tenantSchema: string,
    userId: string,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'visit_number')
      .from('visits')
      .where({ id: visitId })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    if (['selesai', 'pulang', 'batal'].includes(visit.status)) {
      throw new ValidationError(
        `Kunjungan dengan status "${visit.status}" tidak dapat dibatalkan`,
      )
    }

    await this.db.transaction(async (trx) => {
      await trx
        .withSchema(tenantSchema)
        .table('visits')
        .where({ id: visitId })
        .update({
          status: 'batal',
          catatan: `[BATAL] ${alasan}`,
          updated_by: userId,
          deleted_at: new Date(),
        })

      await trx
        .withSchema(tenantSchema)
        .table('queues')
        .where({ visit_id: visitId })
        .update({ status: 'batal' })
    })

    logger.info('Visit cancelled', {
      visitId,
      visitNumber: visit.visit_number,
      alasan,
      tenant: tenantSchema,
    })
  }

  // --- Antrian ---

  async getQueue(roomId: string, date: string, tenantSchema: string) {
    const queues = await this.db
      .withSchema(tenantSchema)
      .select(
        'queues.*',
        'visits.patient_id',
        'visits.visit_number',
        'visits.tipe',
        'visits.keluhan_utama',
        'visits.penjamin',
        'patients.nama as patient_nama',
        'patients.no_rekam_medis',
      )
      .from('queues')
      .join('visits', 'queues.visit_id', 'visits.id')
      .join('patients', 'visits.patient_id', 'patients.id')
      .where('queues.room_id', roomId)
      .where('visits.tanggal', date)
      .whereNull('visits.deleted_at')
      .orderBy('queues.nomor_antrian', 'asc')

    return queues
  }

  async getAllQueues(date: string, tenantSchema: string) {
    const queues = await this.db
      .withSchema(tenantSchema)
      .select(
        'queues.*',
        'visits.patient_id',
        'visits.visit_number',
        'visits.tipe',
        'visits.keluhan_utama',
        'visits.penjamin',
        'patients.nama as patient_nama',
        'patients.no_rekam_medis',
        'rooms.nama as room_nama',
        'rooms.kode as room_kode',
      )
      .from('queues')
      .join('visits', 'queues.visit_id', 'visits.id')
      .join('patients', 'visits.patient_id', 'patients.id')
      .join('rooms', 'queues.room_id', 'rooms.id')
      .where('visits.tanggal', date)
      .whereNull('visits.deleted_at')
      .orderBy(['rooms.nama', 'queues.nomor_antrian'])

    return queues
  }

  async callNext(roomId: string, tenantSchema: string) {
    const today = new Date().toISOString().split('T')[0]

    // Cari antrian 'menunggu' dengan nomor terkecil hari ini
    const nextQueue = await this.db
      .withSchema(tenantSchema)
      .select('queues.*', 'visits.patient_id', 'patients.nama as patient_nama')
      .from('queues')
      .join('visits', 'queues.visit_id', 'visits.id')
      .join('patients', 'visits.patient_id', 'patients.id')
      .where('queues.room_id', roomId)
      .where('queues.status', 'menunggu')
      .where('visits.tanggal', today)
      .whereNull('visits.deleted_at')
      .orderBy('queues.nomor_antrian', 'asc')
      .first()

    if (!nextQueue) {
      return null // Tidak ada antrian menunggu
    }

    const now = new Date()

    // Update queue status ke 'dipanggil'
    await this.db
      .withSchema(tenantSchema)
      .table('queues')
      .where({ id: nextQueue.id })
      .update({
        status: 'dipanggil',
        called_at: now,
      })

    // Update visit status ke 'dipanggil' juga
    await this.db
      .withSchema(tenantSchema)
      .table('visits')
      .where({ id: nextQueue.visit_id })
      .update({
        status: 'dipanggil',
      })

    logger.info('Queue called', {
      queueId: nextQueue.id,
      nomorAntrian: nextQueue.nomor_antrian,
      roomId,
      tenant: tenantSchema,
    })

    return {
      ...nextQueue,
      status: 'dipanggil',
      called_at: now.toISOString(),
    }
  }

  // --- Statistik ---

  async getDailyStats(date: string, tenantSchema: string) {
    // Per poli
    const byRoom = await this.db
      .withSchema(tenantSchema)
      .select('rooms.nama as room_nama', 'rooms.kode as room_kode')
      .count('visits.id as total')
      .from('visits')
      .join('rooms', 'visits.room_id', 'rooms.id')
      .where('visits.tanggal', date)
      .whereNull('visits.deleted_at')
      .groupBy('rooms.nama', 'rooms.kode')

    // Per penjamin
    const byPenjamin = await this.db
      .withSchema(tenantSchema)
      .select('penjamin')
      .count('id as total')
      .from('visits')
      .where({ tanggal: date })
      .whereNull('deleted_at')
      .groupBy('penjamin')

    // Per status
    const byStatus = await this.db
      .withSchema(tenantSchema)
      .select('status')
      .count('id as total')
      .from('visits')
      .where({ tanggal: date })
      .whereNull('deleted_at')
      .groupBy('status')

    // Total hari ini
    const [{ count: totalToday }] = await this.db
      .withSchema(tenantSchema)
      .count('id as count')
      .from('visits')
      .where({ tanggal: date })
      .whereNull('deleted_at')

    return {
      date,
      total: Number(totalToday),
      byRoom,
      byPenjamin,
      byStatus,
    }
  }

  // --- Helpers ---

  private async generateVisitNumber(
    tenantSchema: string,
    trx?: Knex,
  ): Promise<string> {
    const conn = trx || this.db
    const result = await conn.raw(
      'SELECT generate_visit_number(?) as visit_number',
      [tenantSchema],
    )
    return result.rows[0].visit_number as string
  }
}
