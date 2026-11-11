import { satusehatConfig } from './satusehat.config'

// SATUSEHAT FHIR R4 Mappers — Indonesian profile
// Refs: https://satusehat.kemkes.go.id/platform/docs/id/playbook/

// --- Types for local data ---

export interface LocalPatient {
  id: string
  nik: string
  nama: string
  tempat_lahir: string
  tanggal_lahir: string
  jenis_kelamin: 'laki-laki' | 'perempuan'
  alamat: string
  rt?: string
  rw?: string
  kelurahan?: string
  kecamatan?: string
  kabupaten?: string
  provinsi?: string
  kode_pos?: string
  no_telepon?: string
  email?: string
  no_bpjs?: string
}

export interface LocalVisit {
  id: string
  patient_id: string
  visit_number: string
  tipe: 'rawat_jalan' | 'igd' | 'rawat_inap'
  tanggal: string
  status: string
  keluhan_utama?: string
  satusehat_patient_id?: string
  doctor_name?: string
  doctor_nik?: string
  room_name?: string
}

export interface LocalDiagnosis {
  id: string
  medical_record_id: string
  visit_id: string
  icd10_code: string
  icd10_name: string
  tipe: 'utama' | 'sekunder' | 'komplikasi'
  satusehat_encounter_id?: string
  satusehat_patient_id?: string
}

export interface LocalVitalSigns {
  visit_id: string
  tekanan_darah_sistolik?: number
  tekanan_darah_diastolik?: number
  nadi?: number
  suhu?: number
  pernapasan?: number
  spo2?: number
  tinggi_badan?: number
  berat_badan?: number
  satusehat_encounter_id?: string
  satusehat_patient_id?: string
}

export interface LocalPrescriptionItem {
  id: string
  visit_id: string
  nama_obat: string
  dosis?: string
  frekuensi?: string
  jumlah: number
  aturan_pakai?: string
  satusehat_encounter_id?: string
  satusehat_patient_id?: string
}

// --- FHIR Resource Types ---

export interface FhirPatient {
  resourceType: 'Patient'
  identifier: { use: string; system: string; value: string }[]
  active: boolean
  name: { use: string; text: string }[]
  telecom?: { system: string; value: string; use: string }[]
  gender: 'male' | 'female'
  birthDate: string
  address: {
    use: string
    line: string[]
    city?: string
    postalCode?: string
    country: string
    extension?: { url: string; valueCode: string }[]
  }[]
}

export interface FhirEncounter {
  resourceType: 'Encounter'
  identifier: { system: string; value: string }[]
  status: string
  class: { system: string; code: string; display: string }
  subject: { reference: string; display: string }
  participant?: {
    type: { coding: { system: string; code: string; display: string }[] }[]
    individual: { reference: string; display: string }
  }[]
  period: { start: string; end?: string }
  location?: { location: { reference: string; display: string } }[]
  serviceProvider: { reference: string }
  statusHistory?: { status: string; period: { start: string; end?: string } }[]
}

export interface FhirCondition {
  resourceType: 'Condition'
  clinicalStatus: {
    coding: { system: string; code: string; display: string }[]
  }
  category: {
    coding: { system: string; code: string; display: string }[]
  }[]
  code: {
    coding: { system: string; code: string; display: string }[]
  }
  subject: { reference: string; display: string }
  encounter: { reference: string }
}

export interface FhirObservation {
  resourceType: 'Observation'
  status: string
  category: {
    coding: { system: string; code: string; display: string }[]
  }[]
  code: {
    coding: { system: string; code: string; display: string }[]
  }
  subject: { reference: string }
  encounter: { reference: string }
  effectiveDateTime: string
  valueQuantity?: { value: number; unit: string; system: string; code: string }
  component?: {
    code: { coding: { system: string; code: string; display: string }[] }
    valueQuantity: { value: number; unit: string; system: string; code: string }
  }[]
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest'
  identifier?: { system: string; value: string }[]
  status: string
  intent: string
  medicationReference?: { display: string }
  subject: { reference: string; display: string }
  encounter: { reference: string }
  dosageInstruction?: {
    text?: string
    timing?: { repeat?: { frequency?: number; period?: number; periodUnit?: string } }
    doseAndRate?: {
      doseQuantity?: { value: number; unit: string }
    }[]
  }[]
  dispenseRequest?: {
    quantity?: { value: number; unit: string }
  }
}

// ==========================================================
// MAPPERS
// ==========================================================

const ORG_REF = `Organization/${satusehatConfig.orgId || 'mock-org-id'}`

export function mapPatientToFHIR(patient: LocalPatient): FhirPatient {
  const identifiers = [
    {
      use: 'official',
      system: 'https://fhir.kemkes.go.id/id/nik',
      value: patient.nik,
    },
  ]

  if (patient.no_bpjs) {
    identifiers.push({
      use: 'official',
      system: 'https://fhir.kemkes.go.id/id/ihs-number',
      value: patient.no_bpjs,
    })
  }

  const telecom: FhirPatient['telecom'] = []
  if (patient.no_telepon) {
    telecom.push({ system: 'phone', value: patient.no_telepon, use: 'mobile' })
  }
  if (patient.email) {
    telecom.push({ system: 'email', value: patient.email, use: 'home' })
  }

  return {
    resourceType: 'Patient',
    identifier: identifiers,
    active: true,
    name: [{ use: 'official', text: patient.nama }],
    telecom: telecom.length > 0 ? telecom : undefined,
    gender: patient.jenis_kelamin === 'laki-laki' ? 'male' : 'female',
    birthDate: patient.tanggal_lahir,
    address: [
      {
        use: 'home',
        line: [patient.alamat],
        city: patient.kabupaten,
        postalCode: patient.kode_pos,
        country: 'ID',
        extension: patient.provinsi
          ? [
              {
                url: 'https://fhir.kemkes.go.id/r4/StructureDefinition/administrativeCode',
                valueCode: patient.provinsi,
              },
            ]
          : undefined,
      },
    ],
  }
}

export function mapEncounterToFHIR(visit: LocalVisit): FhirEncounter {
  const classMapping: Record<string, { code: string; display: string }> = {
    rawat_jalan: { code: 'AMB', display: 'ambulatory' },
    igd: { code: 'EMER', display: 'emergency' },
    rawat_inap: { code: 'IMP', display: 'inpatient encounter' },
  }

  const encounterClass = classMapping[visit.tipe] || classMapping.rawat_jalan

  const statusMapping: Record<string, string> = {
    menunggu: 'arrived',
    dipanggil: 'arrived',
    dilayani: 'in-progress',
    selesai: 'finished',
    batal: 'cancelled',
  }

  const subjectRef = visit.satusehat_patient_id
    ? `Patient/${visit.satusehat_patient_id}`
    : `Patient/mock-patient-${visit.patient_id}`

  const encounter: FhirEncounter = {
    resourceType: 'Encounter',
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/encounter/${satusehatConfig.orgId || 'mock'}`,
        value: visit.visit_number,
      },
    ],
    status: statusMapping[visit.status] || 'in-progress',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: encounterClass.code,
      display: encounterClass.display,
    },
    subject: {
      reference: subjectRef,
      display: '',
    },
    period: {
      start: `${visit.tanggal}T00:00:00+07:00`,
    },
    serviceProvider: {
      reference: ORG_REF,
    },
  }

  if (visit.status === 'selesai') {
    encounter.period.end = `${visit.tanggal}T23:59:59+07:00`
  }

  return encounter
}

export function mapConditionToFHIR(diagnosis: LocalDiagnosis): FhirCondition {
  const subjectRef = diagnosis.satusehat_patient_id
    ? `Patient/${diagnosis.satusehat_patient_id}`
    : 'Patient/mock-patient'

  const encounterRef = diagnosis.satusehat_encounter_id
    ? `Encounter/${diagnosis.satusehat_encounter_id}`
    : 'Encounter/mock-encounter'

  const categoryCode =
    diagnosis.tipe === 'utama'
      ? 'encounter-diagnosis'
      : 'problem-list-item'

  return {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active',
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: categoryCode,
            display:
              diagnosis.tipe === 'utama'
                ? 'Encounter Diagnosis'
                : 'Problem List Item',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: diagnosis.icd10_code,
          display: diagnosis.icd10_name,
        },
      ],
    },
    subject: { reference: subjectRef, display: '' },
    encounter: { reference: encounterRef },
  }
}

// LOINC codes for vital signs
const VITAL_SIGN_LOINC: Record<
  string,
  { code: string; display: string; unit: string; ucumCode: string }
> = {
  tekanan_darah: {
    code: '85354-9',
    display: 'Blood pressure panel',
    unit: 'mmHg',
    ucumCode: 'mm[Hg]',
  },
  sistolik: {
    code: '8480-6',
    display: 'Systolic blood pressure',
    unit: 'mmHg',
    ucumCode: 'mm[Hg]',
  },
  diastolik: {
    code: '8462-4',
    display: 'Diastolic blood pressure',
    unit: 'mmHg',
    ucumCode: 'mm[Hg]',
  },
  nadi: {
    code: '8867-4',
    display: 'Heart rate',
    unit: '/min',
    ucumCode: '/min',
  },
  suhu: {
    code: '8310-5',
    display: 'Body temperature',
    unit: '°C',
    ucumCode: 'Cel',
  },
  pernapasan: {
    code: '9279-1',
    display: 'Respiratory rate',
    unit: '/min',
    ucumCode: '/min',
  },
  spo2: {
    code: '2708-6',
    display: 'Oxygen saturation',
    unit: '%',
    ucumCode: '%',
  },
  tinggi_badan: {
    code: '8302-2',
    display: 'Body height',
    unit: 'cm',
    ucumCode: 'cm',
  },
  berat_badan: {
    code: '29463-7',
    display: 'Body weight',
    unit: 'kg',
    ucumCode: 'kg',
  },
}

export function mapObservationsToFHIR(
  vitals: LocalVitalSigns,
): FhirObservation[] {
  const observations: FhirObservation[] = []
  const subjectRef = vitals.satusehat_patient_id
    ? `Patient/${vitals.satusehat_patient_id}`
    : 'Patient/mock-patient'
  const encounterRef = vitals.satusehat_encounter_id
    ? `Encounter/${vitals.satusehat_encounter_id}`
    : 'Encounter/mock-encounter'
  const now = new Date().toISOString()

  const baseObs = {
    status: 'final' as const,
    category: [
      {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    subject: { reference: subjectRef },
    encounter: { reference: encounterRef },
    effectiveDateTime: now,
  }

  // Blood pressure — composite observation
  if (
    vitals.tekanan_darah_sistolik !== undefined &&
    vitals.tekanan_darah_diastolik !== undefined
  ) {
    const bp = VITAL_SIGN_LOINC.tekanan_darah
    const sys = VITAL_SIGN_LOINC.sistolik
    const dia = VITAL_SIGN_LOINC.diastolik
    observations.push({
      resourceType: 'Observation',
      ...baseObs,
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: bp.code,
            display: bp.display,
          },
        ],
      },
      component: [
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: sys.code,
                display: sys.display,
              },
            ],
          },
          valueQuantity: {
            value: vitals.tekanan_darah_sistolik,
            unit: sys.unit,
            system: 'http://unitsofmeasure.org',
            code: sys.ucumCode,
          },
        },
        {
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: dia.code,
                display: dia.display,
              },
            ],
          },
          valueQuantity: {
            value: vitals.tekanan_darah_diastolik,
            unit: dia.unit,
            system: 'http://unitsofmeasure.org',
            code: dia.ucumCode,
          },
        },
      ],
    })
  }

  // Simple vital signs
  const simpleVitals: [keyof LocalVitalSigns, string][] = [
    ['nadi', 'nadi'],
    ['suhu', 'suhu'],
    ['pernapasan', 'pernapasan'],
    ['spo2', 'spo2'],
    ['tinggi_badan', 'tinggi_badan'],
    ['berat_badan', 'berat_badan'],
  ]

  for (const [field, loincKey] of simpleVitals) {
    const val = vitals[field]
    if (typeof val === 'number' && val > 0) {
      const loinc = VITAL_SIGN_LOINC[loincKey]
      observations.push({
        resourceType: 'Observation',
        ...baseObs,
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: loinc.code,
              display: loinc.display,
            },
          ],
        },
        valueQuantity: {
          value: val,
          unit: loinc.unit,
          system: 'http://unitsofmeasure.org',
          code: loinc.ucumCode,
        },
      })
    }
  }

  return observations
}

// ==========================================================
// ADDITIONAL FHIR RESOURCE TYPES & MAPPERS
// ==========================================================

// --- Additional Local Types ---

export interface LocalProcedure {
  id: string
  visit_id: string
  icd9cm_code: string
  icd9cm_name: string
  performed_date: string
  satusehat_encounter_id?: string
  satusehat_patient_id?: string
}

export interface LocalAllergyIntolerance {
  id: string
  patient_id: string
  substance: string
  reaction?: string
  severity?: 'mild' | 'moderate' | 'severe'
  category?: 'food' | 'medication' | 'environment' | 'biologic'
  satusehat_patient_id?: string
}

export interface LocalMedicationDispense {
  id: string
  visit_id: string
  nama_obat: string
  jumlah: number
  satuan: string
  tanggal: string
  pharmacist_name?: string
  satusehat_encounter_id?: string
  satusehat_patient_id?: string
}

export interface LocalServiceRequest {
  id: string
  visit_id: string
  category: 'laboratory' | 'radiology'
  code: string
  display: string
  requester_name?: string
  occurrence_date: string
  satusehat_encounter_id?: string
  satusehat_patient_id?: string
}

export interface LocalDiagnosticReport {
  id: string
  visit_id: string
  category: 'laboratory' | 'radiology'
  code: string
  display: string
  conclusion?: string
  issued_date: string
  results?: { name: string; value: string; unit?: string; reference_range?: string }[]
  satusehat_encounter_id?: string
  satusehat_patient_id?: string
}

export interface LocalComposition {
  id: string
  visit_id: string
  patient_name: string
  author_name: string
  date: string
  title: string
  sections: { title: string; text: string }[]
  satusehat_encounter_id?: string
  satusehat_patient_id?: string
}

export interface LocalPractitioner {
  id: string
  nik: string
  nama: string
  sip?: string
  spesialisasi?: string
}

export interface LocalLocation {
  id: string
  nama: string
  tipe: 'building' | 'wing' | 'ward' | 'room' | 'bed'
  status: 'active' | 'inactive'
  description?: string
}

// --- Additional FHIR Types ---

export interface FhirProcedure {
  resourceType: 'Procedure'
  status: string
  code: { coding: { system: string; code: string; display: string }[] }
  subject: { reference: string }
  encounter: { reference: string }
  performedDateTime: string
}

export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance'
  clinicalStatus: { coding: { system: string; code: string }[] }
  verificationStatus: { coding: { system: string; code: string }[] }
  type?: string
  category?: string[]
  criticality?: string
  code: { coding: { system: string; code: string; display: string }[]; text: string }
  patient: { reference: string }
  reaction?: { manifestation: { coding: { system: string; code: string; display: string }[]; text: string }[]; severity?: string }[]
}

export interface FhirMedicationDispense {
  resourceType: 'MedicationDispense'
  status: string
  medicationReference: { display: string }
  subject: { reference: string }
  context: { reference: string }
  quantity: { value: number; unit: string; system: string; code: string }
  whenHandedOver: string
  performer?: { actor: { display: string } }[]
}

export interface FhirServiceRequest {
  resourceType: 'ServiceRequest'
  status: string
  intent: string
  category: { coding: { system: string; code: string; display: string }[] }[]
  code: { coding: { system: string; code: string; display: string }[] }
  subject: { reference: string }
  encounter: { reference: string }
  occurrenceDateTime: string
  requester?: { display: string }
}

export interface FhirDiagnosticReport {
  resourceType: 'DiagnosticReport'
  status: string
  category: { coding: { system: string; code: string; display: string }[] }[]
  code: { coding: { system: string; code: string; display: string }[] }
  subject: { reference: string }
  encounter: { reference: string }
  issued: string
  conclusion?: string
  result?: { display: string }[]
}

export interface FhirComposition {
  resourceType: 'Composition'
  status: string
  type: { coding: { system: string; code: string; display: string }[] }
  subject: { reference: string }
  encounter: { reference: string }
  date: string
  author: { display: string }[]
  title: string
  section: { title: string; text: { status: string; div: string } }[]
}

export interface FhirPractitioner {
  resourceType: 'Practitioner'
  identifier: { use: string; system: string; value: string }[]
  active: boolean
  name: { use: string; text: string }[]
  qualification?: { code: { text: string } }[]
}

export interface FhirLocation {
  resourceType: 'Location'
  identifier: { system: string; value: string }[]
  status: string
  name: string
  description?: string
  mode: string
  physicalType: { coding: { system: string; code: string; display: string }[] }
  managingOrganization: { reference: string }
}

// --- MAPPERS ---

export function mapProcedureToFHIR(proc: LocalProcedure): FhirProcedure {
  const subjectRef = proc.satusehat_patient_id
    ? `Patient/${proc.satusehat_patient_id}` : 'Patient/mock-patient'
  const encounterRef = proc.satusehat_encounter_id
    ? `Encounter/${proc.satusehat_encounter_id}` : 'Encounter/mock-encounter'

  return {
    resourceType: 'Procedure',
    status: 'completed',
    code: {
      coding: [{
        system: 'http://hl7.org/fhir/sid/icd-9-cm',
        code: proc.icd9cm_code,
        display: proc.icd9cm_name,
      }],
    },
    subject: { reference: subjectRef },
    encounter: { reference: encounterRef },
    performedDateTime: `${proc.performed_date}T00:00:00+07:00`,
  }
}

export function mapAllergyIntoleranceToFHIR(allergy: LocalAllergyIntolerance): FhirAllergyIntolerance {
  const patientRef = allergy.satusehat_patient_id
    ? `Patient/${allergy.satusehat_patient_id}` : 'Patient/mock-patient'

  const severityMap: Record<string, string> = { mild: 'mild', moderate: 'moderate', severe: 'severe' }

  const fhir: FhirAllergyIntolerance = {
    resourceType: 'AllergyIntolerance',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed' }] },
    category: allergy.category ? [allergy.category] : undefined,
    code: {
      coding: [{ system: 'http://snomed.info/sct', code: '419199007', display: allergy.substance }],
      text: allergy.substance,
    },
    patient: { reference: patientRef },
  }

  if (allergy.reaction) {
    fhir.reaction = [{
      manifestation: [{ coding: [{ system: 'http://snomed.info/sct', code: '271807003', display: allergy.reaction }], text: allergy.reaction }],
      severity: severityMap[allergy.severity || 'mild'],
    }]
  }

  return fhir
}

export function mapMedicationDispenseToFHIR(dispense: LocalMedicationDispense): FhirMedicationDispense {
  const subjectRef = dispense.satusehat_patient_id
    ? `Patient/${dispense.satusehat_patient_id}` : 'Patient/mock-patient'
  const contextRef = dispense.satusehat_encounter_id
    ? `Encounter/${dispense.satusehat_encounter_id}` : 'Encounter/mock-encounter'

  return {
    resourceType: 'MedicationDispense',
    status: 'completed',
    medicationReference: { display: dispense.nama_obat },
    subject: { reference: subjectRef },
    context: { reference: contextRef },
    quantity: { value: dispense.jumlah, unit: dispense.satuan, system: 'http://unitsofmeasure.org', code: dispense.satuan },
    whenHandedOver: `${dispense.tanggal}T00:00:00+07:00`,
    performer: dispense.pharmacist_name ? [{ actor: { display: dispense.pharmacist_name } }] : undefined,
  }
}

export function mapServiceRequestToFHIR(sr: LocalServiceRequest): FhirServiceRequest {
  const subjectRef = sr.satusehat_patient_id
    ? `Patient/${sr.satusehat_patient_id}` : 'Patient/mock-patient'
  const encounterRef = sr.satusehat_encounter_id
    ? `Encounter/${sr.satusehat_encounter_id}` : 'Encounter/mock-encounter'

  const catCode = sr.category === 'laboratory' ? '108252007' : '363679005'
  const catDisplay = sr.category === 'laboratory' ? 'Laboratory procedure' : 'Imaging'

  return {
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    category: [{ coding: [{ system: 'http://snomed.info/sct', code: catCode, display: catDisplay }] }],
    code: { coding: [{ system: 'http://loinc.org', code: sr.code, display: sr.display }] },
    subject: { reference: subjectRef },
    encounter: { reference: encounterRef },
    occurrenceDateTime: `${sr.occurrence_date}T00:00:00+07:00`,
    requester: sr.requester_name ? { display: sr.requester_name } : undefined,
  }
}

export function mapDiagnosticReportToFHIR(report: LocalDiagnosticReport): FhirDiagnosticReport {
  const subjectRef = report.satusehat_patient_id
    ? `Patient/${report.satusehat_patient_id}` : 'Patient/mock-patient'
  const encounterRef = report.satusehat_encounter_id
    ? `Encounter/${report.satusehat_encounter_id}` : 'Encounter/mock-encounter'

  const catCode = report.category === 'laboratory' ? 'LAB' : 'RAD'
  const catDisplay = report.category === 'laboratory' ? 'Laboratory' : 'Radiology'

  return {
    resourceType: 'DiagnosticReport',
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: catCode, display: catDisplay }] }],
    code: { coding: [{ system: 'http://loinc.org', code: report.code, display: report.display }] },
    subject: { reference: subjectRef },
    encounter: { reference: encounterRef },
    issued: `${report.issued_date}T00:00:00+07:00`,
    conclusion: report.conclusion,
    result: report.results?.map((r) => ({ display: `${r.name}: ${r.value}${r.unit ? ' ' + r.unit : ''}` })),
  }
}

export function mapCompositionToFHIR(comp: LocalComposition): FhirComposition {
  const subjectRef = comp.satusehat_patient_id
    ? `Patient/${comp.satusehat_patient_id}` : 'Patient/mock-patient'
  const encounterRef = comp.satusehat_encounter_id
    ? `Encounter/${comp.satusehat_encounter_id}` : 'Encounter/mock-encounter'

  return {
    resourceType: 'Composition',
    status: 'final',
    type: { coding: [{ system: 'http://loinc.org', code: '18842-5', display: 'Discharge summary' }] },
    subject: { reference: subjectRef },
    encounter: { reference: encounterRef },
    date: `${comp.date}T00:00:00+07:00`,
    author: [{ display: comp.author_name }],
    title: comp.title,
    section: comp.sections.map((s) => ({
      title: s.title,
      text: { status: 'generated', div: `<div xmlns="http://www.w3.org/1999/xhtml">${s.text}</div>` },
    })),
  }
}

export function mapPractitionerToFHIR(doc: LocalPractitioner): FhirPractitioner {
  return {
    resourceType: 'Practitioner',
    identifier: [{ use: 'official', system: 'https://fhir.kemkes.go.id/id/nik', value: doc.nik }],
    active: true,
    name: [{ use: 'official', text: doc.nama }],
    qualification: doc.spesialisasi ? [{ code: { text: doc.spesialisasi } }] : undefined,
  }
}

export function mapLocationToFHIR(loc: LocalLocation): FhirLocation {
  const typeMap: Record<string, { code: string; display: string }> = {
    building: { code: 'bu', display: 'Building' },
    wing: { code: 'wi', display: 'Wing' },
    ward: { code: 'wa', display: 'Ward' },
    room: { code: 'ro', display: 'Room' },
    bed: { code: 'bd', display: 'Bed' },
  }
  const physType = typeMap[loc.tipe] || typeMap.room

  return {
    resourceType: 'Location',
    identifier: [{ system: `http://sys-ids.kemkes.go.id/location/${satusehatConfig.orgId || 'mock'}`, value: loc.id }],
    status: loc.status === 'active' ? 'active' : 'inactive',
    name: loc.nama,
    description: loc.description,
    mode: 'instance',
    physicalType: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/location-physical-type', code: physType.code, display: physType.display }] },
    managingOrganization: { reference: ORG_REF },
  }
}

export function mapMedicationRequestToFHIR(
  item: LocalPrescriptionItem,
): FhirMedicationRequest {
  const subjectRef = item.satusehat_patient_id
    ? `Patient/${item.satusehat_patient_id}`
    : 'Patient/mock-patient'
  const encounterRef = item.satusehat_encounter_id
    ? `Encounter/${item.satusehat_encounter_id}`
    : 'Encounter/mock-encounter'

  return {
    resourceType: 'MedicationRequest',
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/prescription/${satusehatConfig.orgId || 'mock'}`,
        value: item.id,
      },
    ],
    status: 'active',
    intent: 'order',
    medicationReference: {
      display: item.nama_obat,
    },
    subject: { reference: subjectRef, display: '' },
    encounter: { reference: encounterRef },
    dosageInstruction: item.aturan_pakai
      ? [{ text: item.aturan_pakai }]
      : undefined,
    dispenseRequest: {
      quantity: {
        value: item.jumlah,
        unit: 'TAB',
      },
    },
  }
}
