import {
  offlineDb,
  type SyncAction,
  type SyncQueueItem,
  type SyncConflict,
} from './database'
import { apiClient } from '../api/client'

const MAX_RETRIES = 5
const BATCH_SIZE = 50

export interface SyncStatus {
  pending: number
  synced: number
  conflicts: number
  lastSyncAt: number | null
}

interface SyncBatchOperation {
  action: SyncAction
  entity: string
  entityId: string
  payload: Record<string, unknown>
  timestamp: number
}

interface SyncBatchResponse {
  success: boolean
  data: {
    applied: {
      entity: string
      entityId: string
      action: SyncAction
      serverTimestamp: number
    }[]
    conflicts: {
      entity: string
      entityId: string
      serverData: Record<string, unknown>
      serverTimestamp: number
    }[]
    errors: {
      entity: string
      entityId: string
      error: string
    }[]
  }
}

let lastSyncAt: number | null = null

// --- Queue management ---

export async function addToQueue(
  action: SyncAction,
  entity: string,
  entityId: string,
  payload: Record<string, unknown>,
) {
  await offlineDb.syncQueue.add({
    action,
    entity,
    entityId,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
    lastError: null,
  })
}

// --- Process queue ---

export async function processQueue(): Promise<{
  applied: number
  conflicts: number
  errors: number
}> {
  const items = await offlineDb.syncQueue
    .where('retryCount')
    .below(MAX_RETRIES)
    .sortBy('timestamp')

  if (items.length === 0) {
    return { applied: 0, conflicts: 0, errors: 0 }
  }

  let totalApplied = 0
  let totalConflicts = 0
  let totalErrors = 0

  // Process in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const operations: SyncBatchOperation[] = batch.map((item) => ({
      action: item.action,
      entity: item.entity,
      entityId: item.entityId,
      payload: item.payload,
      timestamp: item.timestamp,
    }))

    try {
      const response = await apiClient<SyncBatchResponse>('/sync/batch', {
        method: 'POST',
        body: JSON.stringify({ operations }),
      })

      if (response.success && response.data) {
        // Handle applied
        for (const applied of response.data.applied) {
          const item = batch.find(
            (b) => b.entity === applied.entity && b.entityId === applied.entityId,
          )
          if (item?.id) {
            await offlineDb.syncQueue.delete(item.id)
            // Update local record as synced
            await markEntitySynced(applied.entity, applied.entityId)
          }
          totalApplied++
        }

        // Handle conflicts
        for (const conflict of response.data.conflicts) {
          const item = batch.find(
            (b) =>
              b.entity === conflict.entity &&
              b.entityId === conflict.entityId,
          )
          if (item?.id) {
            await offlineDb.syncQueue.delete(item.id)
          }

          // Store conflict for admin review
          await offlineDb.syncConflicts.add({
            entity: conflict.entity,
            entityId: conflict.entityId,
            localData: item?.payload || {},
            serverData: conflict.serverData,
            localTimestamp: item?.timestamp || 0,
            serverTimestamp: conflict.serverTimestamp,
            resolvedAt: null,
            resolution: null,
          })
          totalConflicts++
        }

        // Handle errors
        for (const error of response.data.errors) {
          const item = batch.find(
            (b) => b.entity === error.entity && b.entityId === error.entityId,
          )
          if (item?.id) {
            await offlineDb.syncQueue.update(item.id, {
              retryCount: (item.retryCount || 0) + 1,
              lastError: error.error,
            })
          }
          totalErrors++
        }
      }
    } catch (err) {
      // Network error — increment retry on all items in batch
      for (const item of batch) {
        if (item.id) {
          await offlineDb.syncQueue.update(item.id, {
            retryCount: (item.retryCount || 0) + 1,
            lastError: err instanceof Error ? err.message : 'Network error',
          })
        }
      }
      totalErrors += batch.length
    }
  }

  lastSyncAt = Date.now()

  return {
    applied: totalApplied,
    conflicts: totalConflicts,
    errors: totalErrors,
  }
}

// --- Mark entities as synced in local DB ---

async function markEntitySynced(entity: string, entityId: string) {
  const table = getTable(entity)
  if (table) {
    try {
      await table.update(entityId, { synced: 1 })
    } catch {
      // entity might not exist locally
    }
  }
}

function getTable(entity: string) {
  switch (entity) {
    case 'patient':
      return offlineDb.patients
    case 'visit':
      return offlineDb.visits
    case 'medical_record':
      return offlineDb.medicalRecords
    case 'prescription':
      return offlineDb.prescriptions
    case 'drug':
      return offlineDb.drugs
    case 'queue':
      return offlineDb.queues
    default:
      return null
  }
}

// --- Conflict management ---

export async function getConflicts(): Promise<SyncConflict[]> {
  return offlineDb.syncConflicts
    .filter((c) => !c.resolvedAt)
    .toArray()
}

export async function resolveConflict(
  id: number,
  resolution: 'keep_local' | 'keep_server',
) {
  const conflict = await offlineDb.syncConflicts.get(id)
  if (!conflict) return

  if (resolution === 'keep_local') {
    // Re-add to sync queue to push local data
    await addToQueue(
      'update',
      conflict.entity,
      conflict.entityId,
      conflict.localData,
    )
  } else {
    // Apply server data locally
    const table = getTable(conflict.entity)
    if (table) {
      const existing = await table.get(conflict.entityId)
      if (existing) {
        await table.update(conflict.entityId, {
          ...existing,
          data: conflict.serverData,
          synced: 1,
          lastModified: conflict.serverTimestamp,
        })
      }
    }
  }

  await offlineDb.syncConflicts.update(id, {
    resolvedAt: Date.now(),
    resolution,
  })
}

// --- Status ---

export async function getSyncStatus(): Promise<SyncStatus> {
  const pending = await offlineDb.syncQueue.count()
  const conflicts = await offlineDb.syncConflicts
    .filter((c) => !c.resolvedAt)
    .count()

  // Count total synced records across all tables
  let synced = 0
  synced += await offlineDb.patients.where('synced').equals(1).count()
  synced += await offlineDb.visits.where('synced').equals(1).count()
  synced += await offlineDb.drugs.where('synced').equals(1).count()

  return {
    pending,
    synced,
    conflicts,
    lastSyncAt,
  }
}
