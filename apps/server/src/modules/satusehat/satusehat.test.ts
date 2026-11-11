import {
  mapPatientToFHIR,
  mapEncounterToFHIR,
  mapConditionToFHIR,
  mapObservationsToFHIR,
  mapMedicationRequestToFHIR,
  type LocalPatient,
  type LocalVisit,
  type LocalDiagnosis,
  type LocalVitalSigns,
  type LocalPrescriptionItem,
} from './satusehat.mapper'
import { SatusehatError, getAccessToken, fhirRequest } from './satusehat.client'
import { satusehatConfig, FHIR_RESOURCES } from './satusehat.config'

// Force mock mode for all client tests
jest.mock('./satusehat.config', () => {
  const actual = jest.requireActual('./satusehat.config')
  return {
    ...actual,
    satusehatConfig: {
      ...actual.satusehatConfig,
      useMock: true,
    },
  }
})

afterAll(async () => {
  const { redis } = await import('../../config/redis')
  try { await redis.quit() } catch { /* ignore */ }
})

// ================================================================
// TEST DATA FACTORIES
// ================================================================

function createMockPatient(overrides: Partial<LocalPatient> = {}): LocalPatient {
  return {
    id: 'patient-001',
    nik: '3201011234567890',
    nama: 'Ahmad Suryadi',
    tempat_lahir: 'Jakarta',
    tanggal_lahir: '1990-05-15',
    jenis_kelamin: 'laki-laki',
    alamat: 'Jl. Merdeka No. 123',
    rt: '005',
    rw: '003',
    kelurahan: 'Menteng',
    kecamatan: 'Menteng',
    kabupaten: 'Jakarta Pusat',
    provinsi: '31',
    kode_pos: '10310',
    no_telepon: '081234567890',
    email: 'ahmad@example.com',
    no_bpjs: '0001234567890',
    ...overrides,
  }
}

function createMockVisit(overrides: Partial<LocalVisit> = {}): LocalVisit {
  return {
    id: 'visit-001',
    patient_id: 'patient-001',
    visit_number: 'RJ-20261011-0001',
    tipe: 'rawat_jalan',
    tanggal: '2026-10-11',
    status: 'dilayani',
    keluhan_utama: 'Demam 3 hari',
    satusehat_patient_id: 'satusehat-patient-abc',
    ...overrides,
  }
}

function createMockDiagnosis(
  overrides: Partial<LocalDiagnosis> = {},
): LocalDiagnosis {
  return {
    id: 'dx-001',
    medical_record_id: 'mr-001',
    visit_id: 'visit-001',
    icd10_code: 'A01.0',
    icd10_name: 'Typhoid fever',
    tipe: 'utama',
    satusehat_encounter_id: 'satusehat-enc-abc',
    satusehat_patient_id: 'satusehat-patient-abc',
    ...overrides,
  }
}

function createMockVitalSigns(
  overrides: Partial<LocalVitalSigns> = {},
): LocalVitalSigns {
  return {
    visit_id: 'visit-001',
    tekanan_darah_sistolik: 120,
    tekanan_darah_diastolik: 80,
    nadi: 78,
    suhu: 36.5,
    pernapasan: 18,
    spo2: 98,
    tinggi_badan: 170,
    berat_badan: 65,
    satusehat_encounter_id: 'satusehat-enc-abc',
    satusehat_patient_id: 'satusehat-patient-abc',
    ...overrides,
  }
}

function createMockPrescriptionItem(
  overrides: Partial<LocalPrescriptionItem> = {},
): LocalPrescriptionItem {
  return {
    id: 'rx-item-001',
    visit_id: 'visit-001',
    nama_obat: 'Paracetamol 500mg',
    dosis: '500mg',
    frekuensi: '3x1',
    jumlah: 10,
    aturan_pakai: '3 kali sehari setelah makan',
    satusehat_encounter_id: 'satusehat-enc-abc',
    satusehat_patient_id: 'satusehat-patient-abc',
    ...overrides,
  }
}

// ================================================================
// MAPPER TESTS
// ================================================================

describe('SATUSEHAT FHIR Mappers', () => {
  // --- Patient ---
  describe('mapPatientToFHIR', () => {
    it('should map patient with all fields', () => {
      const patient = createMockPatient()
      const fhir = mapPatientToFHIR(patient)

      expect(fhir.resourceType).toBe('Patient')
      expect(fhir.active).toBe(true)
      expect(fhir.gender).toBe('male')
      expect(fhir.birthDate).toBe('1990-05-15')
      expect(fhir.name[0].text).toBe('Ahmad Suryadi')
      expect(fhir.name[0].use).toBe('official')

      // NIK identifier
      const nikId = fhir.identifier.find((id) =>
        id.system === 'https://fhir.kemkes.go.id/id/nik',
      )
      expect(nikId).toBeDefined()
      expect(nikId!.value).toBe('3201011234567890')

      // BPJS identifier
      const bpjsId = fhir.identifier.find((id) =>
        id.system === 'https://fhir.kemkes.go.id/id/ihs-number',
      )
      expect(bpjsId).toBeDefined()
      expect(bpjsId!.value).toBe('0001234567890')

      // Telecom
      expect(fhir.telecom).toBeDefined()
      expect(fhir.telecom!.length).toBe(2)
      const phone = fhir.telecom!.find((t) => t.system === 'phone')
      expect(phone!.value).toBe('081234567890')
      const email = fhir.telecom!.find((t) => t.system === 'email')
      expect(email!.value).toBe('ahmad@example.com')

      // Address
      expect(fhir.address[0].country).toBe('ID')
      expect(fhir.address[0].line[0]).toBe('Jl. Merdeka No. 123')
      expect(fhir.address[0].city).toBe('Jakarta Pusat')
    })

    it('should map female patient', () => {
      const patient = createMockPatient({ jenis_kelamin: 'perempuan' })
      const fhir = mapPatientToFHIR(patient)
      expect(fhir.gender).toBe('female')
    })

    it('should handle patient without BPJS', () => {
      const patient = createMockPatient({ no_bpjs: undefined })
      const fhir = mapPatientToFHIR(patient)
      expect(fhir.identifier.length).toBe(1)
    })

    it('should handle patient without telecom', () => {
      const patient = createMockPatient({
        no_telepon: undefined,
        email: undefined,
      })
      const fhir = mapPatientToFHIR(patient)
      expect(fhir.telecom).toBeUndefined()
    })
  })

  // --- Encounter ---
  describe('mapEncounterToFHIR', () => {
    it('should map rawat_jalan visit to AMB encounter', () => {
      const visit = createMockVisit()
      const fhir = mapEncounterToFHIR(visit)

      expect(fhir.resourceType).toBe('Encounter')
      expect(fhir.class.code).toBe('AMB')
      expect(fhir.class.display).toBe('ambulatory')
      expect(fhir.status).toBe('in-progress')
      expect(fhir.identifier[0].value).toBe('RJ-20261011-0001')
      expect(fhir.subject.reference).toBe('Patient/satusehat-patient-abc')
      expect(fhir.period.start).toContain('2026-10-11')
    })

    it('should map IGD visit to EMER encounter', () => {
      const visit = createMockVisit({ tipe: 'igd' })
      const fhir = mapEncounterToFHIR(visit)
      expect(fhir.class.code).toBe('EMER')
      expect(fhir.class.display).toBe('emergency')
    })

    it('should map rawat_inap visit to IMP encounter', () => {
      const visit = createMockVisit({ tipe: 'rawat_inap' })
      const fhir = mapEncounterToFHIR(visit)
      expect(fhir.class.code).toBe('IMP')
    })

    it('should map selesai status to finished with end period', () => {
      const visit = createMockVisit({ status: 'selesai' })
      const fhir = mapEncounterToFHIR(visit)
      expect(fhir.status).toBe('finished')
      expect(fhir.period.end).toBeDefined()
    })

    it('should map menunggu status to arrived', () => {
      const visit = createMockVisit({ status: 'menunggu' })
      const fhir = mapEncounterToFHIR(visit)
      expect(fhir.status).toBe('arrived')
    })

    it('should map batal status to cancelled', () => {
      const visit = createMockVisit({ status: 'batal' })
      const fhir = mapEncounterToFHIR(visit)
      expect(fhir.status).toBe('cancelled')
    })

    it('should use mock patient ref when satusehat_patient_id missing', () => {
      const visit = createMockVisit({ satusehat_patient_id: undefined })
      const fhir = mapEncounterToFHIR(visit)
      expect(fhir.subject.reference).toContain('mock-patient-')
    })
  })

  // --- Condition ---
  describe('mapConditionToFHIR', () => {
    it('should map utama diagnosis to encounter-diagnosis', () => {
      const dx = createMockDiagnosis()
      const fhir = mapConditionToFHIR(dx)

      expect(fhir.resourceType).toBe('Condition')
      expect(fhir.code.coding[0].system).toBe('http://hl7.org/fhir/sid/icd-10')
      expect(fhir.code.coding[0].code).toBe('A01.0')
      expect(fhir.code.coding[0].display).toBe('Typhoid fever')
      expect(fhir.category[0].coding[0].code).toBe('encounter-diagnosis')
      expect(fhir.subject.reference).toBe('Patient/satusehat-patient-abc')
      expect(fhir.encounter.reference).toBe('Encounter/satusehat-enc-abc')
    })

    it('should map sekunder diagnosis to problem-list-item', () => {
      const dx = createMockDiagnosis({ tipe: 'sekunder' })
      const fhir = mapConditionToFHIR(dx)
      expect(fhir.category[0].coding[0].code).toBe('problem-list-item')
    })

    it('should use mock refs when satusehat IDs missing', () => {
      const dx = createMockDiagnosis({
        satusehat_patient_id: undefined,
        satusehat_encounter_id: undefined,
      })
      const fhir = mapConditionToFHIR(dx)
      expect(fhir.subject.reference).toBe('Patient/mock-patient')
      expect(fhir.encounter.reference).toBe('Encounter/mock-encounter')
    })
  })

  // --- Observations ---
  describe('mapObservationsToFHIR', () => {
    it('should create observations for all vital signs', () => {
      const vitals = createMockVitalSigns()
      const observations = mapObservationsToFHIR(vitals)

      // BP composite + 6 simple vitals = 7
      expect(observations.length).toBe(7)
      expect(observations.every((o) => o.resourceType === 'Observation')).toBe(
        true,
      )
      expect(observations.every((o) => o.status === 'final')).toBe(true)
    })

    it('should create composite BP observation with components', () => {
      const vitals = createMockVitalSigns()
      const observations = mapObservationsToFHIR(vitals)

      const bp = observations.find(
        (o) => o.code.coding[0].code === '85354-9',
      )
      expect(bp).toBeDefined()
      expect(bp!.component).toBeDefined()
      expect(bp!.component!.length).toBe(2)

      const sysComp = bp!.component!.find(
        (c) => c.code.coding[0].code === '8480-6',
      )
      expect(sysComp!.valueQuantity.value).toBe(120)

      const diaComp = bp!.component!.find(
        (c) => c.code.coding[0].code === '8462-4',
      )
      expect(diaComp!.valueQuantity.value).toBe(80)
    })

    it('should create heart rate observation with LOINC code', () => {
      const vitals = createMockVitalSigns()
      const observations = mapObservationsToFHIR(vitals)

      const hr = observations.find((o) => o.code.coding[0].code === '8867-4')
      expect(hr).toBeDefined()
      expect(hr!.valueQuantity!.value).toBe(78)
      expect(hr!.valueQuantity!.unit).toBe('/min')
    })

    it('should create body temperature observation', () => {
      const vitals = createMockVitalSigns()
      const observations = mapObservationsToFHIR(vitals)

      const temp = observations.find(
        (o) => o.code.coding[0].code === '8310-5',
      )
      expect(temp).toBeDefined()
      expect(temp!.valueQuantity!.value).toBe(36.5)
      expect(temp!.valueQuantity!.code).toBe('Cel')
    })

    it('should skip missing vital signs', () => {
      const vitals = createMockVitalSigns({
        tekanan_darah_sistolik: undefined,
        tekanan_darah_diastolik: undefined,
        nadi: undefined,
        suhu: undefined,
        pernapasan: undefined,
        spo2: undefined,
      })
      const observations = mapObservationsToFHIR(vitals)

      // Only height + weight = 2
      expect(observations.length).toBe(2)
    })

    it('should return empty array when no vitals provided', () => {
      const vitals: LocalVitalSigns = {
        visit_id: 'visit-001',
      }
      const observations = mapObservationsToFHIR(vitals)
      expect(observations.length).toBe(0)
    })

    it('should use correct UCUM codes for units', () => {
      const vitals = createMockVitalSigns()
      const observations = mapObservationsToFHIR(vitals)

      const weight = observations.find(
        (o) => o.code.coding[0].code === '29463-7',
      )
      expect(weight!.valueQuantity!.system).toBe(
        'http://unitsofmeasure.org',
      )
      expect(weight!.valueQuantity!.code).toBe('kg')

      const height = observations.find(
        (o) => o.code.coding[0].code === '8302-2',
      )
      expect(height!.valueQuantity!.code).toBe('cm')
    })
  })

  // --- MedicationRequest ---
  describe('mapMedicationRequestToFHIR', () => {
    it('should map prescription item correctly', () => {
      const item = createMockPrescriptionItem()
      const fhir = mapMedicationRequestToFHIR(item)

      expect(fhir.resourceType).toBe('MedicationRequest')
      expect(fhir.status).toBe('active')
      expect(fhir.intent).toBe('order')
      expect(fhir.medicationReference!.display).toBe('Paracetamol 500mg')
      expect(fhir.subject.reference).toBe('Patient/satusehat-patient-abc')
      expect(fhir.encounter.reference).toBe('Encounter/satusehat-enc-abc')
      expect(fhir.dispenseRequest!.quantity!.value).toBe(10)
    })

    it('should include dosage instruction when aturan_pakai provided', () => {
      const item = createMockPrescriptionItem()
      const fhir = mapMedicationRequestToFHIR(item)
      expect(fhir.dosageInstruction).toBeDefined()
      expect(fhir.dosageInstruction![0].text).toBe(
        '3 kali sehari setelah makan',
      )
    })

    it('should omit dosage when aturan_pakai not provided', () => {
      const item = createMockPrescriptionItem({ aturan_pakai: undefined })
      const fhir = mapMedicationRequestToFHIR(item)
      expect(fhir.dosageInstruction).toBeUndefined()
    })

    it('should include identifier with system containing orgId', () => {
      const item = createMockPrescriptionItem()
      const fhir = mapMedicationRequestToFHIR(item)
      expect(fhir.identifier).toBeDefined()
      expect(fhir.identifier![0].value).toBe('rx-item-001')
      expect(fhir.identifier![0].system).toContain('prescription')
    })
  })
})

// ================================================================
// CONFIG TESTS
// ================================================================

describe('SATUSEHAT Config', () => {
  it('should have required FHIR resource paths', () => {
    expect(FHIR_RESOURCES.Patient).toBe('/Patient')
    expect(FHIR_RESOURCES.Encounter).toBe('/Encounter')
    expect(FHIR_RESOURCES.Condition).toBe('/Condition')
    expect(FHIR_RESOURCES.Observation).toBe('/Observation')
    expect(FHIR_RESOURCES.MedicationRequest).toBe('/MedicationRequest')
    expect(FHIR_RESOURCES.Organization).toBe('/Organization')
    expect(FHIR_RESOURCES.Practitioner).toBe('/Practitioner')
    expect(FHIR_RESOURCES.Location).toBe('/Location')
  })

  it('should have satusehat config with all required fields', () => {
    expect(satusehatConfig).toBeDefined()
    expect(satusehatConfig.authPath).toBe('/oauth2/v1/accesstoken')
    expect(satusehatConfig.fhirPath).toBe('/fhir-r4/v1')
    expect(satusehatConfig.timeout).toBe(30_000)
    expect(satusehatConfig.maxRetries).toBe(3)
    expect(satusehatConfig.retryBaseDelay).toBe(1000)
    expect(satusehatConfig.tokenCacheKey).toBe('satusehat:access_token')
  })
})

// ================================================================
// MOCK FHIR CLIENT TESTS
// ================================================================

describe('SATUSEHAT Mock FHIR Client', () => {
  it('should return mock token in mock mode', async () => {
    const token = await getAccessToken()
    expect(token).toBe('mock-satusehat-token')
  })

  it('should return mock Patient on POST', async () => {
    const patient = createMockPatient()
    const fhirPatient = mapPatientToFHIR(patient)

    const result = await fhirRequest({
      method: 'POST',
      resourceType: 'Patient',
      body: fhirPatient as unknown as Record<string, unknown>,
    })

    expect(result.resourceType).toBe('Patient')
    expect(result.id).toBeDefined()
    expect(result.id!.startsWith('mock-patient-')).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should return mock Encounter on POST', async () => {
    const visit = createMockVisit()
    const fhirEncounter = mapEncounterToFHIR(visit)

    const result = await fhirRequest({
      method: 'POST',
      resourceType: 'Encounter',
      body: fhirEncounter as unknown as Record<string, unknown>,
    })

    expect(result.resourceType).toBe('Encounter')
    expect(result.id!.startsWith('mock-encounter-')).toBe(true)
  })

  it('should return mock data on GET', async () => {
    const result = await fhirRequest({
      method: 'GET',
      resourceType: 'Patient',
      id: 'existing-id-123',
    })

    expect(result.resourceType).toBe('Patient')
    expect(result.id).toBe('existing-id-123')
  })

  it('should include meta in mock response', async () => {
    const result = await fhirRequest({
      method: 'POST',
      resourceType: 'Observation',
      body: { resourceType: 'Observation' },
    })

    const raw = result.raw as Record<string, unknown>
    const meta = raw.meta as Record<string, unknown>
    expect(meta).toBeDefined()
    expect(meta.versionId).toBe('1')
    expect(meta.lastUpdated).toBeDefined()
  })
})

// ================================================================
// SatusehatError TESTS
// ================================================================

describe('SatusehatError', () => {
  it('should create error with default code and status', () => {
    const err = new SatusehatError('Test error')

    expect(err.message).toBe('Test error')
    expect(err.code).toBe('SATUSEHAT_ERROR')
    expect(err.statusCode).toBe(502)
    expect(err instanceof Error).toBe(true)
  })

  it('should create error with custom code and status', () => {
    const err = new SatusehatError('Auth failed', 'SATUSEHAT_AUTH_FAILED', 401)

    expect(err.code).toBe('SATUSEHAT_AUTH_FAILED')
    expect(err.statusCode).toBe(401)
  })
})
