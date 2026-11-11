import Dexie, { type Table } from 'dexie'

// --- Offline record interfaces ---

export interface OfflinePatient {
  id: string
  nik: string
  nama: string
  no_rekam_medis: string
  synced: number // 0 = unsynced, 1 = synced
  lastModified: number
  data: Record<string, unknown>
}

export interface OfflineVisit {
  id: string
  patientId: string
  visitNumber: string
  date: string
  status: string
  synced: number
  lastModified: number
  data: Record<string, unknown>
}

export interface OfflineMedicalRecord {
  id: string
  visitId: string
  patientId: string
  synced: number
  lastModified: number
  data: Record<string, unknown>
}

export interface OfflinePrescription {
  id: string
  visitId: string
  synced: number
  lastModified: number
  data: Record<string, unknown>
}

export interface OfflineDrug {
  id: string
  kode: string
  nama: string
  stok: number
  synced: number
  lastModified: number
  data: Record<string, unknown>
}

export interface OfflineQueue {
  id: string
  visitId: string
  roomId: string
  nomor: number
  status: string
  synced: number
  lastModified: number
}

export type SyncAction = 'create' | 'update' | 'delete'

export interface SyncQueueItem {
  id?: number
  action: SyncAction
  entity: string
  entityId: string
  payload: Record<string, unknown>
  timestamp: number
  retryCount: number
  lastError: string | null
}

export interface SyncConflict {
  id?: number
  entity: string
  entityId: string
  localData: Record<string, unknown>
  serverData: Record<string, unknown>
  localTimestamp: number
  serverTimestamp: number
  resolvedAt: number | null
  resolution: string | null
}

// --- Database definition ---

class SimrsOfflineDB extends Dexie {
  patients!: Table<OfflinePatient, string>
  visits!: Table<OfflineVisit, string>
  medicalRecords!: Table<OfflineMedicalRecord, string>
  prescriptions!: Table<OfflinePrescription, string>
  drugs!: Table<OfflineDrug, string>
  queues!: Table<OfflineQueue, string>
  syncQueue!: Table<SyncQueueItem, number>
  syncConflicts!: Table<SyncConflict, number>

  constructor() {
    super('simrs-offline')

    this.version(1).stores({
      patients: 'id, nik, nama, synced, lastModified, no_rekam_medis',
      visits: 'id, patientId, visitNumber, date, status, synced, lastModified',
      medicalRecords: 'id, visitId, patientId, synced, lastModified',
      prescriptions: 'id, visitId, synced, lastModified',
      drugs: 'id, kode, nama, synced, lastModified',
      queues: 'id, visitId, roomId, synced, lastModified',
      syncQueue: '++id, action, entity, entityId, timestamp, retryCount',
      syncConflicts: '++id, entity, entityId, resolvedAt',
    })
  }
}

export const offlineDb = new SimrsOfflineDB()

// --- Cache helpers ---

export async function cachePatients(patients: Record<string, unknown>[]) {
  const now = Date.now()
  const records: OfflinePatient[] = patients.map((p) => ({
    id: p.id as string,
    nik: (p.nik as string) || '',
    nama: (p.nama as string) || '',
    no_rekam_medis: (p.no_rekam_medis as string) || '',
    synced: 1,
    lastModified: now,
    data: p,
  }))
  await offlineDb.patients.bulkPut(records)
}

export async function cacheVisits(visits: Record<string, unknown>[]) {
  const now = Date.now()
  const records: OfflineVisit[] = visits.map((v) => ({
    id: v.id as string,
    patientId: (v.patient_id as string) || '',
    visitNumber: (v.visit_number as string) || '',
    date: (v.tanggal as string) || '',
    status: (v.status as string) || '',
    synced: 1,
    lastModified: now,
    data: v,
  }))
  await offlineDb.visits.bulkPut(records)
}

export async function cacheDrugs(drugs: Record<string, unknown>[]) {
  const now = Date.now()
  const records: OfflineDrug[] = drugs.map((d) => ({
    id: d.id as string,
    kode: (d.kode as string) || '',
    nama: (d.nama as string) || '',
    stok: (d.total_stok as number) || 0,
    synced: 1,
    lastModified: now,
    data: d,
  }))
  await offlineDb.drugs.bulkPut(records)
}

export async function cacheMedicalRecord(mr: Record<string, unknown>) {
  await offlineDb.medicalRecords.put({
    id: mr.id as string,
    visitId: (mr.visit_id as string) || '',
    patientId: (mr.patient_id as string) || '',
    synced: 1,
    lastModified: Date.now(),
    data: mr,
  })
}
