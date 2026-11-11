import type { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'

export interface IGDBoardItem {
  id: string
  visit_number: string
  patient_nama: string
  patient_nik: string
  no_rekam_medis: string
  jenis_kelamin: string
  tanggal_lahir: string
  keluhan_utama: string | null
  triage_level: string | null
  triage_time: string | null
  response_time: string | null
  igd_bed_number: string | null
  status: string
  penjamin: string
  disposition: string | null
  disposition_time: string | null
  disposition_notes: string | null
  cara_masuk: string
  created_at: string
  doctor_nama: string | null
  waiting_minutes: number | null
}

export interface IGDStats {
  totalActive: number
  byTriage: Record<string, number>
  byStatus: Record<string, number>
  byDisposition: Record<string, number>
  avgWaitMinutes: number | null
  avgResponseMinutes: number | null
  todayTotal: number
  todayDischarged: number
}

export interface TriageInput {
  triageLevel: '1' | '2' | '3' | '4' | '5'
  igdBedNumber?: string
}

export interface DispositionInput {
  disposition: 'pulang' | 'rawat_inap' | 'rujuk' | 'meninggal' | 'aps' | 'observasi'
  notes?: string
}

export interface QuickRegisterInput {
  patientId: string
  keluhanUtama: string
  triageLevel: '1' | '2' | '3' | '4' | '5'
  penjamin: 'umum' | 'bpjs' | 'asuransi' | 'perusahaan'
  caraMasuk: 'datang_sendiri' | 'rujukan' | 'kontrol'
  igdBedNumber?: string
  noRujukan?: string
  noSep?: string
  doctorId: string
}

const MAX_RETRY = 3

export class IGDService {
  constructor(private db: Knex) {}

  async getBoard(tenantSchema: string, date?: string): Promise<IGDBoardItem[]> {
    const targetDate = date || new Date().toISOString().split('T')[0]

    const visits = await this.db
      .withSchema(tenantSchema)
      .select(
        'v.id',
        'v.visit_number',
        'v.keluhan_utama',
        'v.triage_level',
        'v.triage_time',
        'v.response_time',
        'v.igd_bed_number',
        'v.status',
        'v.penjamin',
        'v.disposition',
        'v.disposition_time',
        'v.disposition_notes',
        'v.cara_masuk',
        'v.created_at',
        'p.nama as patient_nama',
        'p.nik as patient_nik',
        'p.no_rekam_medis',
        'p.jenis_kelamin',
        'p.tanggal_lahir',
        'u.name as doctor_nama',
      )
      .from('visits as v')
      .join('patients as p', 'v.patient_id', 'p.id')
      .join('doctors as d', 'v.doctor_id', 'd.id')
      .join('users as u', 'd.user_id', 'u.id')
      .where('v.tipe', 'igd')
      .where('v.tanggal', targetDate)
      .whereNull('v.deleted_at')
      .orderByRaw(`
        CASE "v"."triage_level"
          WHEN '1' THEN 1
          WHEN '2' THEN 2
          WHEN '3' THEN 3
          WHEN '4' THEN 4
          WHEN '5' THEN 5
          ELSE 6
        END ASC,
        "v"."created_at" ASC
      `)

    return visits.map((v: Record<string, unknown>) => {
      const createdAt = new Date(v.created_at as string)
      const now = new Date()
      const waitingMs = now.getTime() - createdAt.getTime()
      const waitingMinutes = Math.round(waitingMs / 60000)

      return {
        ...v,
        waiting_minutes: ['selesai', 'batal', 'pulang'].includes(v.status as string)
          ? null
          : waitingMinutes,
      } as IGDBoardItem
    })
  }

  async getStats(tenantSchema: string): Promise<IGDStats> {
    const today = new Date().toISOString().split('T')[0]

    const activeStatuses = ['menunggu', 'dipanggil', 'diperiksa']

    const activeVisits = await this.db
      .withSchema(tenantSchema)
      .select('triage_level', 'status', 'disposition', 'created_at', 'triage_time', 'response_time')
      .from('visits')
      .where('tipe', 'igd')
      .where('tanggal', today)
      .whereNull('deleted_at')

    const totalActive = activeVisits.filter(
      (v: Record<string, unknown>) => activeStatuses.includes(v.status as string),
    ).length

    const byTriage: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, 'belum': 0 }
    const byStatus: Record<string, number> = {}
    const byDisposition: Record<string, number> = {}
    const waitTimes: number[] = []
    const responseTimes: number[] = []

    for (const v of activeVisits as Record<string, unknown>[]) {
      const tl = (v.triage_level as string) || 'belum'
      byTriage[tl] = (byTriage[tl] || 0) + 1

      const st = v.status as string
      byStatus[st] = (byStatus[st] || 0) + 1

      if (v.disposition) {
        const dp = v.disposition as string
        byDisposition[dp] = (byDisposition[dp] || 0) + 1
      }

      if (v.triage_time && v.created_at) {
        const diff = new Date(v.triage_time as string).getTime() - new Date(v.created_at as string).getTime()
        if (diff > 0) waitTimes.push(diff / 60000)
      }

      if (v.response_time && v.created_at) {
        const diff = new Date(v.response_time as string).getTime() - new Date(v.created_at as string).getTime()
        if (diff > 0) responseTimes.push(diff / 60000)
      }
    }

    const todayDischarged = activeVisits.filter(
      (v: Record<string, unknown>) => ['selesai', 'pulang'].includes(v.status as string),
    ).length

    return {
      totalActive,
      byTriage,
      byStatus,
      byDisposition,
      avgWaitMinutes: waitTimes.length > 0
        ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
        : null,
      avgResponseMinutes: responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null,
      todayTotal: activeVisits.length,
      todayDischarged,
    }
  }

  async setTriage(
    visitId: string,
    input: TriageInput,
    tenantSchema: string,
    userId: string,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'tipe', 'status')
      .from('visits')
      .where({ id: visitId })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan IGD')
    if (visit.tipe !== 'igd') {
      throw new ValidationError('Triage hanya untuk kunjungan IGD')
    }

    const updateData: Record<string, unknown> = {
      triage_level: input.triageLevel,
      triage_time: new Date().toISOString(),
      updated_by: userId,
    }

    if (input.igdBedNumber) {
      updateData.igd_bed_number = input.igdBedNumber
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('visits')
      .where({ id: visitId })
      .update(updateData)
      .returning('*')

    logger.info('IGD triage set', {
      visitId,
      triageLevel: input.triageLevel,
      tenant: tenantSchema,
    })

    return updated
  }

  async setResponseTime(
    visitId: string,
    tenantSchema: string,
    userId: string,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'tipe', 'response_time')
      .from('visits')
      .where({ id: visitId })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan IGD')
    if (visit.tipe !== 'igd') {
      throw new ValidationError('Response time hanya untuk kunjungan IGD')
    }
    if (visit.response_time) {
      throw new ConflictError('Response time sudah dicatat sebelumnya')
    }

    const now = new Date().toISOString()

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('visits')
      .where({ id: visitId })
      .update({
        response_time: now,
        status: 'diperiksa',
        updated_by: userId,
      })
      .returning('*')

    await this.db
      .withSchema(tenantSchema)
      .table('queues')
      .where({ visit_id: visitId })
      .update({ status: 'dilayani', served_at: now })

    logger.info('IGD response time recorded', { visitId, tenant: tenantSchema })

    return updated
  }

  async setDisposition(
    visitId: string,
    input: DispositionInput,
    tenantSchema: string,
    userId: string,
  ) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'tipe', 'status', 'disposition')
      .from('visits')
      .where({ id: visitId })
      .whereNull('deleted_at')
      .first()

    if (!visit) throw new NotFoundError('Kunjungan IGD')
    if (visit.tipe !== 'igd') {
      throw new ValidationError('Disposisi hanya untuk kunjungan IGD')
    }
    if (['batal'].includes(visit.status)) {
      throw new ValidationError('Kunjungan sudah dibatalkan')
    }

    const visitStatus = input.disposition === 'rawat_inap'
      ? 'rawat_inap'
      : ['pulang', 'meninggal', 'aps'].includes(input.disposition)
        ? 'pulang'
        : 'diperiksa'

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('visits')
      .where({ id: visitId })
      .update({
        disposition: input.disposition,
        disposition_time: new Date().toISOString(),
        disposition_notes: input.notes || null,
        status: visitStatus,
        updated_by: userId,
      })
      .returning('*')

    if (['pulang', 'meninggal', 'aps'].includes(input.disposition)) {
      await this.db
        .withSchema(tenantSchema)
        .table('queues')
        .where({ visit_id: visitId })
        .update({ status: 'selesai', finished_at: new Date() })
    }

    logger.info('IGD disposition set', {
      visitId,
      disposition: input.disposition,
      tenant: tenantSchema,
    })

    return updated
  }

  async quickRegister(
    input: QuickRegisterInput,
    tenantSchema: string,
    userId: string,
  ) {
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'is_active')
      .from('patients')
      .where({ id: input.patientId })
      .whereNull('deleted_at')
      .first()

    if (!patient) throw new NotFoundError('Pasien')
    if (!patient.is_active) throw new ValidationError('Pasien tidak aktif')

    const igdRoom = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('rooms')
      .where({ tipe: 'igd', is_active: true })
      .first()

    if (!igdRoom) throw new ValidationError('Ruangan IGD tidak ditemukan')

    const doctor = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('doctors')
      .where({ id: input.doctorId })
      .first()

    if (!doctor) throw new NotFoundError('Dokter')

    const today = new Date().toISOString().split('T')[0]

    return this.db.transaction(async (trx) => {
      let visitNumber = ''
      let visit: Record<string, unknown> | null = null
      let attempt = 0

      while (attempt < MAX_RETRY) {
        try {
          const result = await trx.raw(
            'SELECT generate_visit_number(?) as visit_number',
            [tenantSchema],
          )
          visitNumber = result.rows[0].visit_number as string

          const [inserted] = await trx
            .withSchema(tenantSchema)
            .insert({
              patient_id: input.patientId,
              visit_number: visitNumber,
              tipe: 'igd',
              tanggal: today,
              room_id: igdRoom.id,
              doctor_id: input.doctorId,
              keluhan_utama: input.keluhanUtama,
              cara_masuk: input.caraMasuk,
              penjamin: input.penjamin,
              no_rujukan: input.noRujukan || null,
              no_sep: input.noSep || null,
              triage_level: input.triageLevel,
              triage_time: new Date().toISOString(),
              igd_bed_number: input.igdBedNumber || null,
              created_by: userId,
              updated_by: userId,
            })
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

      if (!visit) throw new ConflictError('Gagal generate nomor kunjungan IGD. Coba lagi.')

      const [{ max_antrian }] = await trx
        .withSchema(tenantSchema)
        .from('queues')
        .join('visits', 'queues.visit_id', 'visits.id')
        .where('queues.room_id', igdRoom.id)
        .where('visits.tanggal', today)
        .max('nomor_antrian as max_antrian')

      const nomorAntrian = (max_antrian || 0) + 1

      const [queue] = await trx
        .withSchema(tenantSchema)
        .insert({
          visit_id: visit.id,
          room_id: igdRoom.id,
          nomor_antrian: nomorAntrian,
        })
        .into('queues')
        .returning('*')

      logger.info('IGD quick register', {
        visitId: visit.id,
        visitNumber,
        patientId: input.patientId,
        triageLevel: input.triageLevel,
        tenant: tenantSchema,
      })

      return { visit, queue }
    })
  }
}
