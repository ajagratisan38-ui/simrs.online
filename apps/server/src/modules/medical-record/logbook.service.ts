import { Knex } from 'knex'

export interface LogbookFilters {
  page: number
  limit: number
  startDate?: string
  endDate?: string
  tipe?: string
  search?: string
}

export interface LogbookStats {
  totalPasien: number
  totalKunjungan: number
  totalDiagnosis: number
  totalTindakan: number
  totalResep: number
}

export class LogbookService {
  constructor(private db: Knex) {}

  async getLogbook(
    doctorId: string,
    filters: LogbookFilters,
    tenantSchema: string,
  ) {
    const { page, limit, startDate, endDate, tipe, search } = filters
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .select(
        'medical_records.id',
        'medical_records.visit_id',
        'medical_records.subjective',
        'medical_records.assessment',
        'medical_records.status',
        'medical_records.created_at',
        'visits.visit_number',
        'visits.tanggal',
        'visits.tipe as visit_tipe',
        'visits.penjamin',
        'patients.nama as patient_nama',
        'patients.no_rekam_medis',
        'patients.jenis_kelamin as patient_jk',
        'patients.tanggal_lahir as patient_tgl_lahir',
        'rooms.nama as room_nama',
        'rooms.kode as room_kode',
      )
      .from('medical_records')
      .join(
        'visits',
        'medical_records.visit_id',
        'visits.id',
      )
      .join(
        'patients',
        'medical_records.patient_id',
        'patients.id',
      )
      .join(
        'rooms',
        'visits.room_id',
        'rooms.id',
      )
      .where('medical_records.doctor_id', doctorId)
      .whereNull('visits.deleted_at')

    if (startDate) {
      query = query.where('visits.tanggal', '>=', startDate)
    }
    if (endDate) {
      query = query.where('visits.tanggal', '<=', endDate)
    }
    if (tipe) {
      query = query.where('visits.tipe', tipe)
    }
    if (search) {
      query = query.where(function () {
        this.whereILike('patients.nama', `%${search}%`)
          .orWhereILike('patients.no_rekam_medis', `%${search}%`)
      })
    }

    // Count
    const [{ count }] = await query.clone().clearSelect().clearOrder().count('medical_records.id as count')
    const total = Number(count)

    // Data
    const records = await query
      .orderBy('visits.tanggal', 'desc')
      .orderBy('medical_records.created_at', 'desc')
      .limit(limit)
      .offset(offset)

    // Fetch diagnoses + procedures for each record
    const recordIds = records.map((r: { id: string }) => r.id)

    let diagnoses: Array<Record<string, unknown>> = []
    let procedures: Array<Record<string, unknown>> = []

    if (recordIds.length > 0) {
      diagnoses = await this.db
        .withSchema(tenantSchema)
        .select('medical_record_id', 'icd10_code', 'icd10_name', 'tipe')
        .from('diagnoses')
        .whereIn('medical_record_id', recordIds)

      procedures = await this.db
        .withSchema(tenantSchema)
        .select('medical_record_id', 'kode_tindakan', 'nama_tindakan', 'qty')
        .from('procedures')
        .whereIn('medical_record_id', recordIds)
    }

    // Group by record
    const diagMap = new Map<string, Array<Record<string, unknown>>>()
    for (const d of diagnoses) {
      const key = d.medical_record_id as string
      if (!diagMap.has(key)) diagMap.set(key, [])
      diagMap.get(key)!.push(d)
    }

    const procMap = new Map<string, Array<Record<string, unknown>>>()
    for (const p of procedures) {
      const key = p.medical_record_id as string
      if (!procMap.has(key)) procMap.set(key, [])
      procMap.get(key)!.push(p)
    }

    const data = records.map((r: Record<string, unknown>) => ({
      ...r,
      diagnoses: diagMap.get(r.id as string) ?? [],
      procedures: procMap.get(r.id as string) ?? [],
    }))

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getLogbookStats(
    doctorId: string,
    tenantSchema: string,
    startDate?: string,
    endDate?: string,
  ): Promise<LogbookStats> {
    let baseQuery = this.db
      .withSchema(tenantSchema)
      .from('medical_records')
      .join(
        'visits',
        'medical_records.visit_id',
        'visits.id',
      )
      .where('medical_records.doctor_id', doctorId)
      .whereNull('visits.deleted_at')

    if (startDate) {
      baseQuery = baseQuery.where('visits.tanggal', '>=', startDate)
    }
    if (endDate) {
      baseQuery = baseQuery.where('visits.tanggal', '<=', endDate)
    }

    // Total kunjungan
    const [{ count: totalKunjungan }] = await baseQuery.clone().count('medical_records.id as count')

    // Total pasien unik
    const [{ count: totalPasien }] = await baseQuery.clone()
      .countDistinct('medical_records.patient_id as count')

    // Total diagnosis
    const mrIds = await baseQuery.clone().select('medical_records.id')
    const mrIdList = mrIds.map((r: { id: string }) => r.id)

    let totalDiagnosis = 0
    let totalTindakan = 0
    let totalResep = 0

    if (mrIdList.length > 0) {
      const [{ count: dxCount }] = await this.db
        .withSchema(tenantSchema)
        .from('diagnoses')
        .whereIn('medical_record_id', mrIdList)
        .count('id as count')
      totalDiagnosis = Number(dxCount)

      const [{ count: procCount }] = await this.db
        .withSchema(tenantSchema)
        .from('procedures')
        .whereIn('medical_record_id', mrIdList)
        .count('id as count')
      totalTindakan = Number(procCount)

      const [{ count: rxCount }] = await this.db
        .withSchema(tenantSchema)
        .from('prescriptions')
        .whereIn('medical_record_id', mrIdList)
        .count('id as count')
      totalResep = Number(rxCount)
    }

    return {
      totalPasien: Number(totalPasien),
      totalKunjungan: Number(totalKunjungan),
      totalDiagnosis,
      totalTindakan,
      totalResep,
    }
  }
}
