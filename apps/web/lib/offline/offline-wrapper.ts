import { addToQueue } from './sync-manager'
import type { SyncAction } from './database'

type OnlineFn<TArgs, TResult> = (args: TArgs) => Promise<TResult>
type OfflineFn<TArgs, TResult> = (args: TArgs) => Promise<TResult>

interface OfflineOptions {
  entity: string
  getEntityId: (args: unknown, result: unknown) => string
  action: SyncAction
  getPayload?: (args: unknown) => Record<string, unknown>
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

/**
 * Wraps an API call with offline fallback.
 *
 * - Online: calls onlineFn (API), optionally caches result
 * - Offline: calls offlineFn (Dexie), adds to sync queue
 *
 * Usage:
 * ```
 * const createPatient = withOfflineSupport(
 *   (data) => patientApi.create(data),
 *   async (data) => {
 *     const id = crypto.randomUUID()
 *     await offlineDb.patients.add({ id, ...data, synced: 0 })
 *     return { success: true, data: { id, ...data } }
 *   },
 *   {
 *     entity: 'patient',
 *     action: 'create',
 *     getEntityId: (_args, result) => result.data.id,
 *   },
 * )
 * ```
 */
export function withOfflineSupport<TArgs, TResult>(
  onlineFn: OnlineFn<TArgs, TResult>,
  offlineFn: OfflineFn<TArgs, TResult>,
  options: OfflineOptions,
): OnlineFn<TArgs, TResult> {
  return async (args: TArgs) => {
    if (isOnline()) {
      try {
        return await onlineFn(args)
      } catch (err) {
        // If network error, fall through to offline
        if (
          err instanceof TypeError &&
          err.message.includes('fetch')
        ) {
          // fallthrough
        } else {
          throw err
        }
      }
    }

    // Offline path
    const result = await offlineFn(args)

    // Add to sync queue
    const entityId = options.getEntityId(args, result)
    const payload = options.getPayload
      ? options.getPayload(args)
      : (args as Record<string, unknown>)

    await addToQueue(options.action, options.entity, entityId, payload)

    return result
  }
}

/**
 * Wraps a read-only API call with offline cache fallback.
 *
 * - Online: calls onlineFn, caches result via cacheFn
 * - Offline: calls offlineFn to read from Dexie
 */
export function withOfflineRead<TArgs, TResult>(
  onlineFn: OnlineFn<TArgs, TResult>,
  offlineFn: OfflineFn<TArgs, TResult>,
  cacheFn?: (result: TResult) => Promise<void>,
): OnlineFn<TArgs, TResult> {
  return async (args: TArgs) => {
    if (isOnline()) {
      try {
        const result = await onlineFn(args)
        // Cache the result for offline use
        if (cacheFn) {
          cacheFn(result).catch(() => {})
        }
        return result
      } catch (err) {
        if (
          err instanceof TypeError &&
          err.message.includes('fetch')
        ) {
          // fallthrough to offline
        } else {
          throw err
        }
      }
    }

    // Offline path — read from local DB
    return offlineFn(args)
  }
}
