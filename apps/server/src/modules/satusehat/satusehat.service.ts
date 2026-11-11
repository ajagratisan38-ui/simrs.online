import type { Knex } from 'knex'
import { fhirRequest, SatusehatError } from './satusehat.client'
import {
  mapPatientToFHIR,
  mapEncounterToFHIR,
  mapConditionToFHIR,
  mapObservationsToFHIR,
  mapMedicationRequestToFHIR,
  mapProcedureToFHIR,
  mapAllergyIntoleranceToFHIR,
  mapMedicationDispenseToFHIR,
  mapServiceRequestToFHIR,
  mapDiagnosticReportToFHIR,
  mapCompositionToFHIR,
  mapPractitionerToFHIR,
  mapLocationToFHIR,
  type LocalPatient,
  type LocalVisit,
  type LocalDiagnosis,
  type LocalVitalSigns,
  type LocalPrescriptionItem,
  type LocalProcedure,
  type LocalAllergyIntolerance,
  type LocalMedicationDispense,
  type LocalServiceRequest,
  type LocalDiagnosticReport,
  type LocalComposition,
  type LocalPractitioner,
  type LocalLocation,
} from './satusehat.mapper'
import { logger } from '../../shared/logger'
import { encrypt, decrypt } from '../../shared/encryption'

export type SatusehatSyncStatus = 'pending' | 'sent' | 'failed' | 'not_required'

export interface SatusehatConfig {
  clientId: string
  clientSecretMasked: string
  baseUrl: string
  orgId: string
  environment: string
  isConfigured: boolean
}

export interface UpdateSatusehatConfigInput {
  clientId?: string
  clientSecret?: string
  baseUrl?: string
  orgId?: string
  environment?: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
  tokenObtained: boolean
  responseTimeMs: number
  environment: string
  orgId: string
}

export class SatusehatService {
  constructor(private db: Knex) {}

  // =====================
  // CONFIG MANAGEMENT
  // =====================

  async getConfig(tenantId: string): Promise<SatusehatConfig> {
    const tenant = await this.db('tenants')
      .select(
        'satusehat_client_id',
        'satusehat_client_secret_enc',
        'satusehat_base_url',
        'satusehat_org_id',
        'satusehat_env',
      )
      .where('id', tenantId)
      .first()

    if (!tenant) {
      return {
        clientId: '',
        clientSecretMasked: '',
        baseUrl: '',
        orgId: '',
        environment: 'sandbox',
        isConfigured: false,
      }
    }

    const hasSecret = !!tenant.satusehat_client_secret_enc
    let maskedSecret = ''
    if (hasSecret) {
      const raw = decrypt(tenant.satusehat_client_secret_enc)
      if (raw && raw !== '[DECRYPTION_FAILED]') {
        maskedSecret = raw.length > 8
          ? raw.substring(0, 4) + '****' + raw.substring(raw.length - 4)
          : '****'
      }
    }

    const clientId = tenant.satusehat_client_id || ''
    const isConfigured = !!clientId && hasSecret

    return {
      clientId,
      clientSecretMasked: maskedSecret,
      baseUrl: tenant.satusehat_base_url || 'https://api-satusehat.kemkes.go.id',
      orgId: tenant.satusehat_org_id || '',
      environment: tenant.satusehat_env || 'sandbox',
      isConfigured,
    }
  }

  async updateConfig(
    tenantId: string,
    input: UpdateSatusehatConfigInput,
  ): Promise<SatusehatConfig> {
    const updateData: Record<string, unknown> = {}

    if (input.clientId !== undefined) {
      updateData.satusehat_client_id = input.clientId
    }
    if (input.clientSecret !== undefined && input.clientSecret.length > 0) {
      updateData.satusehat_client_secret_enc = encrypt(input.clientSecret)
    }
    if (input.baseUrl !== undefined) {
      updateData.satusehat_base_url = input.baseUrl
    }
    if (input.orgId !== undefined) {
      updateData.satusehat_org_id = input.orgId
    }
    if (input.environment !== undefined) {
      updateData.satusehat_env = input.environment
    }

    updateData.updated_at = new Date().toISOString()

    await this.db('tenants').where('id', tenantId).update(updateData)

    logger.info('SATUSEHAT config updated', { tenantId })

    return this.getConfig(tenantId)
  }

  async testConnection(tenantId: string): Promise<TestConnectionResult> {
    const tenant = await this.db('tenants')
      .select(
        'satusehat_client_id',
        'satusehat_client_secret_enc',
        'satusehat_base_url',
        'satusehat_org_id',
        'satusehat_env',
      )
      .where('id', tenantId)
      .first()

    const clientId = tenant?.satusehat_client_id
    const secretEnc = tenant?.satusehat_client_secret_enc
    const baseUrl = tenant?.satusehat_base_url || 'https://api-satusehat.kemkes.go.id'
    const orgId = tenant?.satusehat_org_id || ''
    const environment = tenant?.satusehat_env || 'sandbox'

    if (!clientId || !secretEnc) {
      return {
        success: false,
        message: 'Client ID dan Client Secret belum dikonfigurasi',
        tokenObtained: false,
        responseTimeMs: 0,
        environment,
        orgId,
      }
    }

    const clientSecret = decrypt(secretEnc)
    if (!clientSecret || clientSecret === '[DECRYPTION_FAILED]') {
      return {
        success: false,
        message: 'Gagal mendekripsi Client Secret. Silakan input ulang.',
        tokenObtained: false,
        responseTimeMs: 0,
        environment,
        orgId,
      }
    }

    const startTime = Date.now()

    try {
      const authUrl = `${baseUrl}/oauth2/v1/accesstoken?grant_type=client_credentials`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15_000)

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime

      if (!response.ok) {
        const text = await response.text()
        let errorMsg = `HTTP ${response.status}`
        try {
          const errBody = JSON.parse(text)
          if (errBody.fault?.faultstring) {
            errorMsg = errBody.fault.faultstring
          } else if (errBody.error_description) {
            errorMsg = errBody.error_description
          }
        } catch {
          // raw text
        }

        logger.warn('SATUSEHAT test connection failed', {
          tenantId,
          status: response.status,
          error: errorMsg,
        })

        return {
          success: false,
          message: `Autentikasi gagal: ${errorMsg}`,
          tokenObtained: false,
          responseTimeMs: elapsed,
          environment,
          orgId,
        }
      }

      const data = await response.json()
      const hasToken = !!data.access_token

      logger.info('SATUSEHAT test connection success', {
        tenantId,
        responseTimeMs: elapsed,
        tokenExpiresIn: data.expires_in,
      })

      return {
        success: true,
        message: hasToken
          ? `Koneksi berhasil! Token diperoleh (berlaku ${data.expires_in}s)`
          : 'Response OK tapi access_token tidak ditemukan',
        tokenObtained: hasToken,
        responseTimeMs: elapsed,
        environment,
        orgId,
      }
    } catch (err) {
      const elapsed = Date.now() - startTime
      const errMsg = err instanceof Error ? err.message : String(err)

      const isTimeout = errMsg.includes('abort')

      logger.error('SATUSEHAT test connection error', {
        tenantId,
        error: errMsg,
      })

      return {
        success: false,
        message: isTimeout
          ? 'Koneksi timeout (>15 detik). Periksa URL dan koneksi jaringan.'
          : `Koneksi gagal: ${errMsg}`,
        tokenObtained: false,
        responseTimeMs: elapsed,
        environment,
        orgId,
      }
    }
  }

  // =====================
  // PATIENT
  // =====================

  async createPatient(
    patientData: LocalPatient,
    tenantSchema: string,
  ): Promise<string> {
    const fhirPatient = mapPatientToFHIR(patientData)

    const result = await fhirRequest({
      method: 'POST',
      resourceType: 'Patient',
      body: fhirPatient as unknown as Record<string, unknown>,
    })

    const satusehatId = result.id
    if (!satusehatId) {
      throw new SatusehatError('SATUSEHAT Patient ID tidak ditemukan di response')
    }

    // Save satusehat_patient_id to patients table
    await this.db
      .withSchema(tenantSchema)
      .from('patients')
      .where({ id: patientData.id })
      .update({ satusehat_patient_id: satusehatId })

    logger.info('SATUSEHAT Patient created', {
      localId: patientData.id,
      satusehatId,
    })

    return satusehatId
  }

  // =====================
  // ENCOUNTER
  // =====================

  async createEncounter(
    visitData: LocalVisit,
    tenantSchema: string,
  ): Promise<string> {
    const fhirEncounter = mapEncounterToFHIR(visitData)

    const result = await fhirRequest({
      method: 'POST',
      resourceType: 'Encounter',
      body: fhirEncounter as unknown as Record<string, unknown>,
    })

    const satusehatId = result.id
    if (!satusehatId) {
      throw new SatusehatError('SATUSEHAT Encounter ID tidak ditemukan di response')
    }

    await this.db
      .withSchema(tenantSchema)
      .from('visits')
      .where({ id: visitData.id })
      .update({ satusehat_encounter_id: satusehatId })

    logger.info('SATUSEHAT Encounter created', {
      localId: visitData.id,
      satusehatId,
    })

    return satusehatId
  }

  // =====================
  // CONDITION (Diagnosis)
  // =====================

  async createCondition(
    diagnosisData: LocalDiagnosis,
    tenantSchema: string,
  ): Promise<string> {
    const fhirCondition = mapConditionToFHIR(diagnosisData)

    const result = await fhirRequest({
      method: 'POST',
      resourceType: 'Condition',
      body: fhirCondition as unknown as Record<string, unknown>,
    })

    const satusehatId = result.id
    if (!satusehatId) {
      throw new SatusehatError('SATUSEHAT Condition ID tidak ditemukan di response')
    }

    await this.db
      .withSchema(tenantSchema)
      .from('diagnoses')
      .where({ id: diagnosisData.id })
      .update({ satusehat_condition_id: satusehatId })

    logger.info('SATUSEHAT Condition created', {
      localId: diagnosisData.id,
      satusehatId,
    })

    return satusehatId
  }

  // =====================
  // OBSERVATION (Vital Signs)
  // =====================

  async createObservations(
    vitalSigns: LocalVitalSigns,
    _tenantSchema: string,
  ): Promise<string[]> {
    const observations = mapObservationsToFHIR(vitalSigns)
    const ids: string[] = []

    for (const obs of observations) {
      const result = await fhirRequest({
        method: 'POST',
        resourceType: 'Observation',
        body: obs as unknown as Record<string, unknown>,
      })
      if (result.id) ids.push(result.id)
    }

    logger.info('SATUSEHAT Observations created', {
      visitId: vitalSigns.visit_id,
      count: ids.length,
    })

    return ids
  }

  // =====================
  // MEDICATION REQUEST
  // =====================

  async createMedicationRequest(
    prescriptionItem: LocalPrescriptionItem,
    _tenantSchema: string,
  ): Promise<string> {
    const fhirMedReq = mapMedicationRequestToFHIR(prescriptionItem)

    const result = await fhirRequest({
      method: 'POST',
      resourceType: 'MedicationRequest',
      body: fhirMedReq as unknown as Record<string, unknown>,
    })

    const satusehatId = result.id
    if (!satusehatId) {
      throw new SatusehatError('SATUSEHAT MedicationRequest ID tidak ditemukan')
    }

    logger.info('SATUSEHAT MedicationRequest created', {
      localId: prescriptionItem.id,
      satusehatId,
    })

    return satusehatId
  }

  // =====================
  // PROCEDURE (ICD-9-CM)
  // =====================

  async createProcedure(data: LocalProcedure, _tenantSchema: string): Promise<string> {
    const fhir = mapProcedureToFHIR(data)
    const result = await fhirRequest({ method: 'POST', resourceType: 'Procedure', body: fhir as unknown as Record<string, unknown> })
    const id = result.id
    if (!id) throw new SatusehatError('SATUSEHAT Procedure ID tidak ditemukan')
    logger.info('SATUSEHAT Procedure created', { localId: data.id, satusehatId: id })
    return id
  }

  // =====================
  // ALLERGY INTOLERANCE
  // =====================

  async createAllergyIntolerance(data: LocalAllergyIntolerance, _tenantSchema: string): Promise<string> {
    const fhir = mapAllergyIntoleranceToFHIR(data)
    const result = await fhirRequest({ method: 'POST', resourceType: 'AllergyIntolerance', body: fhir as unknown as Record<string, unknown> })
    const id = result.id
    if (!id) throw new SatusehatError('SATUSEHAT AllergyIntolerance ID tidak ditemukan')
    logger.info('SATUSEHAT AllergyIntolerance created', { localId: data.id, satusehatId: id })
    return id
  }

  // =====================
  // MEDICATION DISPENSE
  // =====================

  async createMedicationDispense(data: LocalMedicationDispense, _tenantSchema: string): Promise<string> {
    const fhir = mapMedicationDispenseToFHIR(data)
    const result = await fhirRequest({ method: 'POST', resourceType: 'MedicationDispense', body: fhir as unknown as Record<string, unknown> })
    const id = result.id
    if (!id) throw new SatusehatError('SATUSEHAT MedicationDispense ID tidak ditemukan')
    logger.info('SATUSEHAT MedicationDispense created', { localId: data.id, satusehatId: id })
    return id
  }

  // =====================
  // SERVICE REQUEST (Lab/Radiology order)
  // =====================

  async createServiceRequest(data: LocalServiceRequest, _tenantSchema: string): Promise<string> {
    const fhir = mapServiceRequestToFHIR(data)
    const result = await fhirRequest({ method: 'POST', resourceType: 'ServiceRequest', body: fhir as unknown as Record<string, unknown> })
    const id = result.id
    if (!id) throw new SatusehatError('SATUSEHAT ServiceRequest ID tidak ditemukan')
    logger.info('SATUSEHAT ServiceRequest created', { localId: data.id, satusehatId: id })
    return id
  }

  // =====================
  // DIAGNOSTIC REPORT (Lab/Radiology result)
  // =====================

  async createDiagnosticReport(data: LocalDiagnosticReport, _tenantSchema: string): Promise<string> {
    const fhir = mapDiagnosticReportToFHIR(data)
    const result = await fhirRequest({ method: 'POST', resourceType: 'DiagnosticReport', body: fhir as unknown as Record<string, unknown> })
    const id = result.id
    if (!id) throw new SatusehatError('SATUSEHAT DiagnosticReport ID tidak ditemukan')
    logger.info('SATUSEHAT DiagnosticReport created', { localId: data.id, satusehatId: id })
    return id
  }

  // =====================
  // COMPOSITION (Discharge Summary)
  // =====================

  async createComposition(data: LocalComposition, _tenantSchema: string): Promise<string> {
    const fhir = mapCompositionToFHIR(data)
    const result = await fhirRequest({ method: 'POST', resourceType: 'Composition', body: fhir as unknown as Record<string, unknown> })
    const id = result.id
    if (!id) throw new SatusehatError('SATUSEHAT Composition ID tidak ditemukan')
    logger.info('SATUSEHAT Composition created', { localId: data.id, satusehatId: id })
    return id
  }

  // =====================
  // PRACTITIONER
  // =====================

  async createPractitioner(data: LocalPractitioner, _tenantSchema: string): Promise<string> {
    const fhir = mapPractitionerToFHIR(data)
    const result = await fhirRequest({ method: 'POST', resourceType: 'Practitioner', body: fhir as unknown as Record<string, unknown> })
    const id = result.id
    if (!id) throw new SatusehatError('SATUSEHAT Practitioner ID tidak ditemukan')
    logger.info('SATUSEHAT Practitioner created', { localId: data.id, satusehatId: id })
    return id
  }

  // =====================
  // LOCATION
  // =====================

  async createLocation(data: LocalLocation, _tenantSchema: string): Promise<string> {
    const fhir = mapLocationToFHIR(data)
    const result = await fhirRequest({ method: 'POST', resourceType: 'Location', body: fhir as unknown as Record<string, unknown> })
    const id = result.id
    if (!id) throw new SatusehatError('SATUSEHAT Location ID tidak ditemukan')
    logger.info('SATUSEHAT Location created', { localId: data.id, satusehatId: id })
    return id
  }

  // =====================
  // GET FHIR RESOURCE (generic read)
  // =====================

  async getResource(resourceType: string, resourceId: string) {
    const result = await fhirRequest({ method: 'GET', resourceType, id: resourceId })
    return result.data
  }

  // =====================
  // FULL VISIT SYNC
  // =====================

  async syncVisit(visitId: string, tenantSchema: string): Promise<{
    patientId: string | null
    encounterId: string | null
    conditionIds: string[]
    observationIds: string[]
    medicationIds: string[]
    procedureIds: string[]
    allergyIds: string[]
  }> {
    // 1. Get visit with patient
    const visit = await this.db
      .withSchema(tenantSchema)
      .select(
        'v.*',
        'p.nik',
        'p.nama',
        'p.tempat_lahir',
        'p.tanggal_lahir',
        'p.jenis_kelamin',
        'p.alamat',
        'p.no_telepon',
        'p.email',
        'p.no_bpjs',
        'p.satusehat_patient_id',
        'd.user_id as doctor_user_id',
      )
      .from('visits as v')
      .join('patients as p', 'v.patient_id', 'p.id')
      .leftJoin('doctors as d', 'v.doctor_id', 'd.id')
      .where('v.id', visitId)
      .first()

    if (!visit) {
      throw new SatusehatError('Visit tidak ditemukan', 'NOT_FOUND', 404)
    }

    // Update status to pending
    await this.updateSyncStatus(visitId, 'pending', tenantSchema)

    try {
      // 2. Create/get Patient
      let satusehatPatientId = visit.satusehat_patient_id as string | null
      if (!satusehatPatientId) {
        satusehatPatientId = await this.createPatient(
          {
            id: visit.patient_id,
            nik: visit.nik,
            nama: visit.nama,
            tempat_lahir: visit.tempat_lahir,
            tanggal_lahir: visit.tanggal_lahir,
            jenis_kelamin: visit.jenis_kelamin,
            alamat: visit.alamat,
            no_telepon: visit.no_telepon,
            email: visit.email,
            no_bpjs: visit.no_bpjs,
          },
          tenantSchema,
        )
      }

      // 3. Create Encounter
      const satusehatEncounterId = await this.createEncounter(
        {
          id: visit.id,
          patient_id: visit.patient_id,
          visit_number: visit.visit_number,
          tipe: visit.tipe,
          tanggal: visit.tanggal,
          status: visit.status,
          keluhan_utama: visit.keluhan_utama,
          satusehat_patient_id: satusehatPatientId,
        },
        tenantSchema,
      )

      // 4. Create Conditions (diagnoses)
      const diagnoses = await this.db
        .withSchema(tenantSchema)
        .select('d.*')
        .from('diagnoses as d')
        .join('medical_records as mr', 'd.medical_record_id', 'mr.id')
        .where('mr.visit_id', visitId)

      const conditionIds: string[] = []
      for (const dx of diagnoses) {
        const condId = await this.createCondition(
          {
            id: dx.id,
            medical_record_id: dx.medical_record_id,
            visit_id: visitId,
            icd10_code: dx.icd10_code,
            icd10_name: dx.icd10_name,
            tipe: dx.tipe,
            satusehat_encounter_id: satusehatEncounterId,
            satusehat_patient_id: satusehatPatientId,
          },
          tenantSchema,
        )
        conditionIds.push(condId)
      }

      // 5. Create Observations (vital signs)
      const mr = await this.db
        .withSchema(tenantSchema)
        .select('vital_signs')
        .from('medical_records')
        .where('visit_id', visitId)
        .first()

      let observationIds: string[] = []
      if (mr?.vital_signs && typeof mr.vital_signs === 'object') {
        const vs = mr.vital_signs as Record<string, number>
        observationIds = await this.createObservations(
          {
            visit_id: visitId,
            tekanan_darah_sistolik: vs.tekanan_darah_sistolik,
            tekanan_darah_diastolik: vs.tekanan_darah_diastolik,
            nadi: vs.nadi,
            suhu: vs.suhu,
            pernapasan: vs.pernapasan,
            spo2: vs.spo2,
            tinggi_badan: vs.tinggi_badan,
            berat_badan: vs.berat_badan,
            satusehat_encounter_id: satusehatEncounterId,
            satusehat_patient_id: satusehatPatientId,
          },
          tenantSchema,
        )
      }

      // 6. Create MedicationRequests
      const rxItems = await this.db
        .withSchema(tenantSchema)
        .select('pi.*')
        .from('prescription_items as pi')
        .join('prescriptions as rx', 'pi.prescription_id', 'rx.id')
        .where('rx.visit_id', visitId)

      const medicationIds: string[] = []
      for (const item of rxItems) {
        const medId = await this.createMedicationRequest(
          {
            id: item.id,
            visit_id: visitId,
            nama_obat: item.nama_obat,
            dosis: item.dosis,
            frekuensi: item.frekuensi,
            jumlah: item.jumlah,
            aturan_pakai: item.aturan_pakai,
            satusehat_encounter_id: satusehatEncounterId,
            satusehat_patient_id: satusehatPatientId,
          },
          tenantSchema,
        )
        medicationIds.push(medId)
      }

      // 7. Create Procedures (ICD-9-CM)
      const procedures = await this.db
        .withSchema(tenantSchema)
        .select('p.*')
        .from('procedures as p')
        .join('medical_records as mr', 'p.medical_record_id', 'mr.id')
        .where('mr.visit_id', visitId)
        .catch(() => [])

      const procedureIds: string[] = []
      for (const proc of procedures) {
        try {
          const procId = await this.createProcedure({
            id: proc.id,
            visit_id: visitId,
            icd9cm_code: proc.icd9cm_code || proc.code,
            icd9cm_name: proc.icd9cm_name || proc.name,
            performed_date: visit.tanggal,
            satusehat_encounter_id: satusehatEncounterId,
            satusehat_patient_id: satusehatPatientId,
          }, tenantSchema)
          procedureIds.push(procId)
        } catch (err) {
          logger.warn('SATUSEHAT Procedure sync failed', { procId: proc.id, error: (err as Error).message })
        }
      }

      // 8. Create AllergyIntolerances
      const patient = await this.db
        .withSchema(tenantSchema)
        .select('alergi')
        .from('patients')
        .where({ id: visit.patient_id })
        .first()

      const allergyIds: string[] = []
      if (patient?.alergi && Array.isArray(patient.alergi)) {
        for (const allergyStr of patient.alergi) {
          try {
            const allergyId = await this.createAllergyIntolerance({
              id: `${visit.patient_id}-allergy-${allergyStr}`,
              patient_id: visit.patient_id,
              substance: String(allergyStr),
              category: 'medication',
              satusehat_patient_id: satusehatPatientId,
            }, tenantSchema)
            allergyIds.push(allergyId)
          } catch (err) {
            logger.warn('SATUSEHAT Allergy sync failed', { substance: allergyStr, error: (err as Error).message })
          }
        }
      }

      // Mark as sent
      await this.updateSyncStatus(visitId, 'sent', tenantSchema)

      return {
        patientId: satusehatPatientId,
        encounterId: satusehatEncounterId,
        conditionIds,
        observationIds,
        medicationIds,
        procedureIds,
        allergyIds,
      }
    } catch (err) {
      // Mark as failed
      await this.updateSyncStatus(visitId, 'failed', tenantSchema)
      throw err
    }
  }

  // =====================
  // STATUS & QUERIES
  // =====================

  async getSyncStatus(visitId: string, tenantSchema: string) {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select(
        'id',
        'visit_number',
        'satusehat_encounter_id',
        'satusehat_sync_status',
        'updated_at',
      )
      .from('visits')
      .where({ id: visitId })
      .first()

    if (!visit) return null

    return {
      visitId: visit.id,
      visitNumber: visit.visit_number,
      satusehatEncounterId: visit.satusehat_encounter_id,
      syncStatus: visit.satusehat_sync_status || 'not_required',
      lastUpdated: visit.updated_at,
    }
  }

  async getPendingVisits(
    page: number,
    limit: number,
    tenantSchema: string,
  ) {
    const offset = (page - 1) * limit

    const [{ count }] = await this.db
      .withSchema(tenantSchema)
      .from('visits')
      .where('satusehat_sync_status', 'pending')
      .orWhere('satusehat_sync_status', 'failed')
      .count('id as count')

    const visits = await this.db
      .withSchema(tenantSchema)
      .select(
        'v.id',
        'v.visit_number',
        'v.tanggal',
        'v.status',
        'v.satusehat_sync_status',
        'v.satusehat_encounter_id',
        'p.nama as patient_nama',
        'p.nik as patient_nik',
      )
      .from('visits as v')
      .join('patients as p', 'v.patient_id', 'p.id')
      .where('v.satusehat_sync_status', 'pending')
      .orWhere('v.satusehat_sync_status', 'failed')
      .orderBy('v.tanggal', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: visits,
      meta: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    }
  }

  // =====================
  // SYNC HISTORY (all statuses)
  // =====================

  async getSyncHistory(
    page: number,
    limit: number,
    tenantSchema: string,
    filters?: { status?: string; from?: string; to?: string },
  ) {
    const offset = (page - 1) * limit

    let countQuery = this.db
      .withSchema(tenantSchema)
      .from('visits')
      .whereIn('satusehat_sync_status', ['sent', 'failed', 'pending'])

    let dataQuery = this.db
      .withSchema(tenantSchema)
      .select(
        'v.id',
        'v.visit_number',
        'v.tanggal',
        'v.status',
        'v.satusehat_sync_status',
        'v.satusehat_encounter_id',
        'v.updated_at as sync_updated_at',
        'p.nama as patient_nama',
        'p.nik as patient_nik',
        'p.no_rekam_medis',
      )
      .from('visits as v')
      .join('patients as p', 'v.patient_id', 'p.id')
      .whereIn('v.satusehat_sync_status', ['sent', 'failed', 'pending'])

    if (filters?.status && filters.status !== 'all') {
      countQuery = countQuery.where('satusehat_sync_status', filters.status)
      dataQuery = dataQuery.where('v.satusehat_sync_status', filters.status)
    }
    if (filters?.from) {
      countQuery = countQuery.where('tanggal', '>=', filters.from)
      dataQuery = dataQuery.where('v.tanggal', '>=', filters.from)
    }
    if (filters?.to) {
      countQuery = countQuery.where('tanggal', '<=', filters.to)
      dataQuery = dataQuery.where('v.tanggal', '<=', filters.to)
    }

    const [{ count }] = await countQuery.count('id as count')
    const total = Number(count)

    const visits = await dataQuery
      .orderBy('v.updated_at', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: visits,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  // =====================
  // SYNC STATS (for chart)
  // =====================

  async getSyncStats(tenantSchema: string, days = 30) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const statusCounts = await this.db
      .withSchema(tenantSchema)
      .select('satusehat_sync_status')
      .count('id as count')
      .from('visits')
      .whereIn('satusehat_sync_status', ['sent', 'failed', 'pending'])
      .groupBy('satusehat_sync_status')

    const dailyStats = await this.db
      .withSchema(tenantSchema)
      .select(
        this.db.raw("DATE(updated_at) as date"),
        'satusehat_sync_status as status',
      )
      .count('id as count')
      .from('visits')
      .whereIn('satusehat_sync_status', ['sent', 'failed'])
      .where('updated_at', '>=', cutoff.toISOString())
      .groupByRaw("DATE(updated_at), satusehat_sync_status")
      .orderByRaw("DATE(updated_at) ASC")

    const summary: Record<string, number> = {
      sent: 0,
      failed: 0,
      pending: 0,
    }
    for (const row of statusCounts) {
      const s = row.satusehat_sync_status as string
      summary[s] = Number(row.count)
    }

    const daily: { date: string; sent: number; failed: number }[] = []
    const dateMap = new Map<string, { sent: number; failed: number }>()

    for (const row of dailyStats) {
      const d = String(row.date).slice(0, 10)
      if (!dateMap.has(d)) dateMap.set(d, { sent: 0, failed: 0 })
      const entry = dateMap.get(d)!
      if (row.status === 'sent') entry.sent = Number(row.count)
      if (row.status === 'failed') entry.failed = Number(row.count)
    }

    for (const [date, counts] of dateMap) {
      daily.push({ date, ...counts })
    }

    return { summary, daily }
  }

  private async updateSyncStatus(
    visitId: string,
    status: SatusehatSyncStatus,
    tenantSchema: string,
  ) {
    await this.db
      .withSchema(tenantSchema)
      .from('visits')
      .where({ id: visitId })
      .update({ satusehat_sync_status: status })
  }
}
