export {
  offlineDb,
  cachePatients,
  cacheVisits,
  cacheDrugs,
  cacheMedicalRecord,
  type OfflinePatient,
  type OfflineVisit,
  type OfflineMedicalRecord,
  type OfflinePrescription,
  type OfflineDrug,
  type OfflineQueue,
  type SyncQueueItem,
  type SyncConflict,
  type SyncAction,
} from './database'

export {
  addToQueue,
  processQueue,
  getConflicts,
  resolveConflict,
  getSyncStatus,
  type SyncStatus,
} from './sync-manager'

export { useOnlineStatus } from './offline-detector'

export { withOfflineSupport, withOfflineRead } from './offline-wrapper'
