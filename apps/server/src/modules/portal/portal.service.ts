import { Knex } from 'knex'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

export interface PortalPatient {
  id: string
  no_rekam_medis: string
  nik: string
  nama: string
  tempat_lahir: string
  tanggal_lahir: string
  jenis_kelamin: string
  alamat: string
  no_telepon: string | null
  email: string | null
  no_bpjs: string | null
  kelas_bpjs: number | null
  foto_url: string | null
  alergi: unknown[]
}

export interface PortalVisit {
  id: string
  visit_number: string
  tipe: string
  tanggal: string
  status: string
  keluhan_utama: string | null
  penjamin: string
  room_nama: string | null
  doctor_nama: string | null
  cara_keluar: string | null
  created_at: string
}

export interface PortalBill {
  id: string
  bill_number: string
  visit_id: string
  visit_number: string
  total_amount: number
  discount_amount: number
  final_amount: number
  paid_amount: number
  status: string
  penjamin: string
  created_at: string
}

export interface PortalMedicalSummary {
  visit_number: string
  tanggal: string
  doctor_nama: string
  diagnoses: Array<{ code: string; name: string; tipe: string }>
  prescriptions: Array<{ drug_name: string; dosis: string; signa: string }>
}

export class PortalService {
  constructor(private db: Knex) {}

  async authenticatePatient(
    tenantSchema: string,
    nik: string,
    tanggalLahir: string,
  ): Promise<{ patient: PortalPatient; token: string }> {
    // Validate NIK format
    if (!/^\d{16}$/.test(nik)) {
      throw new ValidationError('NIK harus 16 digit angka')
    }

    // Find patient by NIK
    const patient = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('patients')
      .where({ nik })
      .whereNull('deleted_at')
      .first()

    if (!patient) {
      throw new NotFoundError('Pasien dengan NIK tersebut tidak ditemukan')
    }

    // Verify tanggal lahir
    const patientDob = new Date(patient.tanggal_lahir).toISOString().split('T')[0]
    const inputDob = new Date(tanggalLahir).toISOString().split('T')[0]

    if (patientDob !== inputDob) {
      throw new ValidationError('Tanggal lahir tidak sesuai')
    }

    if (!patient.is_active) {
      throw new ValidationError('Akun pasien tidak aktif')
    }

    // Generate portal JWT (shorter lived, limited scope)
    const token = jwt.sign(
      {
        patientId: patient.id,
        tenantSchema,
        nik: patient.nik,
        type: 'portal',
      },
      env.jwt.secret,
      { expiresIn: '4h' },
    )

    logger.info('Patient portal login', {
      patientId: patient.id,
      tenantSchema,
    })

    return {
      patient: {
        id: patient.id,
        no_rekam_medis: patient.no_rekam_medis,
        nik: patient.nik,
        nama: patient.nama,
        tempat_lahir: patient.tempat_lahir,
        tanggal_lahir: patient.tanggal_lahir,
        jenis_kelamin: patient.jenis_kelamin,
        alamat: patient.alamat,
        no_telepon: patient.no_telepon,
        email: patient.email,
        no_bpjs: patient.no_bpjs,
        kelas_bpjs: patient.kelas_bpjs,
        foto_url: patient.foto_url,
        alergi: patient.alergi || [],
      },
      token,
    }
  }

  async getPatientProfile(
    tenantSchema: string,
    patientId: string,
  ): Promise<PortalPatient> {
    const patient = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('patients')
      .where({ id: patientId })
      .whereNull('deleted_at')
      .first()

    if (!patient) throw new NotFoundError('Pasien')

    return {
      id: patient.id,
      no_rekam_medis: patient.no_rekam_medis,
      nik: patient.nik,
      nama: patient.nama,
      tempat_lahir: patient.tempat_lahir,
      tanggal_lahir: patient.tanggal_lahir,
      jenis_kelamin: patient.jenis_kelamin,
      alamat: patient.alamat,
      no_telepon: patient.no_telepon,
      email: patient.email,
      no_bpjs: patient.no_bpjs,
      kelas_bpjs: patient.kelas_bpjs,
      foto_url: patient.foto_url,
      alergi: patient.alergi || [],
    }
  }

  async getVisitHistory(
    tenantSchema: string,
    patientId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ data: PortalVisit[]; total: number }> {
    const page = params?.page || 1
    const limit = Math.min(params?.limit || 20, 50)
    const offset = (page - 1) * limit

    const [{ count }] = await this.db.withSchema(tenantSchema)
      .from('visits')
      .where({ patient_id: patientId })
      .whereNull('deleted_at')
      .count('* as count')

    const visits = await this.db.withSchema(tenantSchema)
      .select(
        'visits.id',
        'visits.visit_number',
        'visits.tipe',
        'visits.tanggal',
        'visits.status',
        'visits.keluhan_utama',
        'visits.penjamin',
        'visits.cara_keluar',
        'visits.created_at',
        'rooms.nama as room_nama',
        'doctors.name as doctor_nama',
      )
      .from('visits')
      .leftJoin('rooms', 'visits.room_id', 'rooms.id')
      .leftJoin(
        this.db.raw(`"${tenantSchema}"."users" as doctors`),
        'visits.doctor_id',
        'doctors.id',
      )
      .where('visits.patient_id', patientId)
      .whereNull('visits.deleted_at')
      .orderBy('visits.tanggal', 'desc')
      .limit(limit)
      .offset(offset)

    return {
      data: visits.map((v: Record<string, unknown>) => ({
        id: v.id as string,
        visit_number: v.visit_number as string,
        tipe: v.tipe as string,
        tanggal: v.tanggal as string,
        status: v.status as string,
        keluhan_utama: v.keluhan_utama as string | null,
        penjamin: v.penjamin as string,
        room_nama: v.room_nama as string | null,
        doctor_nama: v.doctor_nama as string | null,
        cara_keluar: v.cara_keluar as string | null,
        created_at: v.created_at as string,
      })),
      total: Number(count),
    }
  }

  async getUpcomingVisits(
    tenantSchema: string,
    patientId: string,
  ): Promise<PortalVisit[]> {
    const today = new Date().toISOString().split('T')[0]

    const visits = await this.db.withSchema(tenantSchema)
      .select(
        'visits.id',
        'visits.visit_number',
        'visits.tipe',
        'visits.tanggal',
        'visits.status',
        'visits.keluhan_utama',
        'visits.penjamin',
        'visits.created_at',
        'rooms.nama as room_nama',
        'doctors.name as doctor_nama',
      )
      .from('visits')
      .leftJoin('rooms', 'visits.room_id', 'rooms.id')
      .leftJoin(
        this.db.raw(`"${tenantSchema}"."users" as doctors`),
        'visits.doctor_id',
        'doctors.id',
      )
      .where('visits.patient_id', patientId)
      .where('visits.tanggal', '>=', today)
      .whereIn('visits.status', ['menunggu', 'dipanggil'])
      .whereNull('visits.deleted_at')
      .orderBy('visits.tanggal', 'asc')
      .limit(10)

    return visits.map((v: Record<string, unknown>) => ({
      id: v.id as string,
      visit_number: v.visit_number as string,
      tipe: v.tipe as string,
      tanggal: v.tanggal as string,
      status: v.status as string,
      keluhan_utama: v.keluhan_utama as string | null,
      penjamin: v.penjamin as string,
      room_nama: v.room_nama as string | null,
      doctor_nama: v.doctor_nama as string | null,
      cara_keluar: null,
      created_at: v.created_at as string,
    }))
  }

  async getBills(
    tenantSchema: string,
    patientId: string,
    params?: { status?: string; page?: number; limit?: number },
  ): Promise<{ data: PortalBill[]; total: number }> {
    const page = params?.page || 1
    const limit = Math.min(params?.limit || 20, 50)
    const offset = (page - 1) * limit

    let query = this.db.withSchema(tenantSchema)
      .from('bills')
      .join('visits', 'bills.visit_id', 'visits.id')
      .where('visits.patient_id', patientId)

    let countQuery = this.db.withSchema(tenantSchema)
      .from('bills')
      .join('visits', 'bills.visit_id', 'visits.id')
      .where('visits.patient_id', patientId)

    if (params?.status) {
      query = query.where('bills.status', params.status)
      countQuery = countQuery.where('bills.status', params.status)
    }

    const [{ count }] = await countQuery.count('* as count')

    const bills = await query
      .select(
        'bills.id',
        'bills.bill_number',
        'bills.visit_id',
        'visits.visit_number',
        'bills.total_amount',
        'bills.discount_amount',
        'bills.final_amount',
        'bills.paid_amount',
        'bills.status',
        'visits.penjamin',
        'bills.created_at',
      )
      .orderBy('bills.created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return {
      data: bills.map((b: Record<string, unknown>) => ({
        id: b.id as string,
        bill_number: b.bill_number as string,
        visit_id: b.visit_id as string,
        visit_number: b.visit_number as string,
        total_amount: Number(b.total_amount),
        discount_amount: Number(b.discount_amount),
        final_amount: Number(b.final_amount),
        paid_amount: Number(b.paid_amount),
        status: b.status as string,
        penjamin: b.penjamin as string,
        created_at: b.created_at as string,
      })),
      total: Number(count),
    }
  }

  async getMedicalSummaries(
    tenantSchema: string,
    patientId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ data: PortalMedicalSummary[]; total: number }> {
    const page = params?.page || 1
    const limit = Math.min(params?.limit || 10, 20)
    const offset = (page - 1) * limit

    const [{ count }] = await this.db.withSchema(tenantSchema)
      .from('medical_records')
      .where({ patient_id: patientId, status: 'final' })
      .count('* as count')

    const records = await this.db.withSchema(tenantSchema)
      .select(
        'medical_records.id',
        'medical_records.visit_id',
        'visits.visit_number',
        'visits.tanggal',
        'doctors.name as doctor_nama',
      )
      .from('medical_records')
      .join('visits', 'medical_records.visit_id', 'visits.id')
      .leftJoin(
        this.db.raw(`"${tenantSchema}"."users" as doctors`),
        'medical_records.doctor_id',
        'doctors.id',
      )
      .where('medical_records.patient_id', patientId)
      .where('medical_records.status', 'final')
      .orderBy('visits.tanggal', 'desc')
      .limit(limit)
      .offset(offset)

    const summaries: PortalMedicalSummary[] = []

    for (const rec of records) {
      const diagnoses = await this.db.withSchema(tenantSchema)
        .select('icd10_code as code', 'icd10_name as name', 'tipe')
        .from('diagnoses')
        .where({ medical_record_id: rec.id })

      const prescriptions = await this.db.withSchema(tenantSchema)
        .select('drug_name', 'dosis', 'signa')
        .from('prescriptions')
        .where({ medical_record_id: rec.id })

      summaries.push({
        visit_number: rec.visit_number,
        tanggal: rec.tanggal,
        doctor_nama: rec.doctor_nama || '-',
        diagnoses,
        prescriptions,
      })
    }

    return { data: summaries, total: Number(count) }
  }
}
