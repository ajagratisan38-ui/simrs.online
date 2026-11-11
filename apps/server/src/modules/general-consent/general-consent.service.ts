import { Knex } from 'knex'
import { NotFoundError } from '../../shared/errors'
import { logger } from '../../shared/logger'

export interface CreateGeneralConsentInput {
  patient_id: string
  visit_id?: string | null
  persetujuan_rawat: boolean
  persetujuan_informasi: boolean
  persetujuan_privasi: boolean
  persetujuan_biaya: boolean
  persetujuan_tata_tertib: boolean
  persetujuan_pelepasan_info: boolean
  penanggung_jawab_nama?: string | null
  penanggung_jawab_hubungan?: string | null
  penanggung_jawab_telepon?: string | null
  penanggung_jawab_alamat?: string | null
  signed_by?: string | null
  catatan?: string | null
}

export class GeneralConsentService {
  constructor(private db: Knex) {}

  async create(
    data: CreateGeneralConsentInput,
    tenantSchema: string,
    userId: string,
  ) {
    const patient = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama')
      .from('patients')
      .where({ id: data.patient_id })
      .whereNull('deleted_at')
      .first()

    if (!patient) throw new NotFoundError('Pasien')

    if (data.visit_id) {
      const visit = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('visits')
        .where({ id: data.visit_id })
        .whereNull('deleted_at')
        .first()
      if (!visit) throw new NotFoundError('Kunjungan')
    }

    const signedAt = data.signed_by ? new Date() : null

    const [consent] = await this.db
      .withSchema(tenantSchema)
      .insert({
        patient_id: data.patient_id,
        visit_id: data.visit_id || null,
        persetujuan_rawat: data.persetujuan_rawat,
        persetujuan_informasi: data.persetujuan_informasi,
        persetujuan_privasi: data.persetujuan_privasi,
        persetujuan_biaya: data.persetujuan_biaya,
        persetujuan_tata_tertib: data.persetujuan_tata_tertib,
        persetujuan_pelepasan_info: data.persetujuan_pelepasan_info,
        penanggung_jawab_nama: data.penanggung_jawab_nama || null,
        penanggung_jawab_hubungan: data.penanggung_jawab_hubungan || null,
        penanggung_jawab_telepon: data.penanggung_jawab_telepon || null,
        penanggung_jawab_alamat: data.penanggung_jawab_alamat || null,
        signed_by: data.signed_by || null,
        signed_at: signedAt,
        catatan: data.catatan || null,
        created_by: userId,
        updated_by: userId,
      })
      .into('general_consents')
      .returning('*')

    logger.info('General consent created', {
      consentId: consent.id,
      patientId: data.patient_id,
      tenant: tenantSchema,
    })

    return consent
  }

  async getById(id: string, tenantSchema: string) {
    const consent = await this.db
      .withSchema(tenantSchema)
      .select(
        'general_consents.*',
        'patients.nama as patient_nama',
        'patients.no_rekam_medis',
        'patients.nik as patient_nik',
        'patients.tanggal_lahir as patient_tanggal_lahir',
        'patients.jenis_kelamin as patient_jenis_kelamin',
        'patients.alamat as patient_alamat',
        'patients.no_telepon as patient_telepon',
      )
      .from('general_consents')
      .join(
        'patients',
        'general_consents.patient_id',
        'patients.id',
      )
      .where('general_consents.id', id)
      .first()

    if (!consent) throw new NotFoundError('General Consent')
    return consent
  }

  async listByPatient(patientId: string, tenantSchema: string) {
    const consents = await this.db
      .withSchema(tenantSchema)
      .select(
        'general_consents.*',
        'visits.visit_number',
        'visits.tanggal as visit_tanggal',
        'visits.tipe as visit_tipe',
      )
      .from('general_consents')
      .leftJoin(
        'visits',
        'general_consents.visit_id',
        'visits.id',
      )
      .where('general_consents.patient_id', patientId)
      .orderBy('general_consents.created_at', 'desc')

    return consents
  }

  async getByVisit(visitId: string, tenantSchema: string) {
    const consent = await this.db
      .withSchema(tenantSchema)
      .select(
        'general_consents.*',
        'patients.nama as patient_nama',
        'patients.no_rekam_medis',
        'patients.nik as patient_nik',
        'patients.tanggal_lahir as patient_tanggal_lahir',
        'patients.jenis_kelamin as patient_jenis_kelamin',
        'patients.alamat as patient_alamat',
        'patients.no_telepon as patient_telepon',
      )
      .from('general_consents')
      .join(
        'patients',
        'general_consents.patient_id',
        'patients.id',
      )
      .where('general_consents.visit_id', visitId)
      .orderBy('general_consents.created_at', 'desc')
      .first()

    return consent || null
  }
}
