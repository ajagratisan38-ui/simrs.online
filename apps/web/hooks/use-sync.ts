'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  offlineDb,
  processQueue,
  getConflicts,
  resolveConflict as resolveConflictFn,
  getSyncStatus,
  type SyncStatus,
  type SyncQueueItem,
} from '@/lib/offline'
import type { SyncConflict } from '@/lib/offline/database'

// --- Sync log entry ---

export interface SyncLogEntry {
  id: number
  timestamp: number
  type: 'success' | 'error' | 'conflict'
  entity: string
  entityId: string
  message: string
}

// In-memory sync log (persists across renders via module scope)
const syncLog: SyncLogEntry[] = []
let logIdCounter = 1

export function addSyncLog(
  type: SyncLogEntry['type'],
  entity: string,
  entityId: string,
  message: string,
) {
  syncLog.unshift({
    id: logIdCounter++,
    timestamp: Date.now(),
    type,
    entity,
    entityId,
    message,
  })
  if (syncLog.length > 200) {
    syncLog.length = 200
  }
}

// --- useSyncStatus ---

const DEFAULT_STATUS: SyncStatus = {
  pending: 0,
  synced: 0,
  conflicts: 0,
  lastSyncAt: null,
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(DEFAULT_STATUS)
  const [pendingByEntity, setPendingByEntity] = useState<
    Record<string, number>
  >({})
  const [syncing, setSyncing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const syncingRef = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const s = await getSyncStatus()
      if (!mountedRef.current) return

      setStatus((prev) => {
        if (
          prev.pending === s.pending &&
          prev.synced === s.synced &&
          prev.conflicts === s.conflicts &&
          prev.lastSyncAt === s.lastSyncAt
        ) {
          return prev
        }
        return s
      })

      const items = await offlineDb.syncQueue.toArray()
      const counts: Record<string, number> = {}
      for (const item of items) {
        counts[item.entity] = (counts[item.entity] || 0) + 1
      }

      if (!mountedRef.current) return

      setPendingByEntity((prev) => {
        const keys = new Set([...Object.keys(prev), ...Object.keys(counts)])
        let changed = false
        for (const k of keys) {
          if ((prev[k] || 0) !== (counts[k] || 0)) {
            changed = true
            break
          }
        }
        return changed ? counts : prev
      })
    } catch {
      // db not ready
    }
  }, [])

  const triggerSync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      await processQueue()
      await refresh()
    } catch {
      // sync failed
    } finally {
      syncingRef.current = false
      if (mountedRef.current) setSyncing(false)
    }
  }, [refresh])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    intervalRef.current = setInterval(refresh, 60_000)
    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  return {
    ...status,
    pendingByEntity,
    syncing,
    triggerSync,
    refresh,
  }
}

// --- useForceSync ---

export function useForceSync() {
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<{
    applied: number
    conflicts: number
    errors: number
  } | null>(null)
  const syncingRef = useRef(false)

  const forceSync = useCallback(async () => {
    if (syncingRef.current) return null
    syncingRef.current = true
    setSyncing(true)
    try {
      const result = await processQueue()

      if (result.applied > 0) {
        addSyncLog(
          'success',
          'batch',
          '',
          `${result.applied} operasi berhasil disinkronkan`,
        )
      }
      if (result.conflicts > 0) {
        addSyncLog(
          'conflict',
          'batch',
          '',
          `${result.conflicts} konflik terdeteksi`,
        )
      }
      if (result.errors > 0) {
        addSyncLog(
          'error',
          'batch',
          '',
          `${result.errors} operasi gagal`,
        )
      }

      setLastResult(result)
      return result
    } catch (err) {
      addSyncLog(
        'error',
        'sync',
        '',
        err instanceof Error ? err.message : 'Sync gagal',
      )
      return null
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [])

  return { forceSync, syncing, lastResult }
}

// --- useConflicts ---

export function useConflicts() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const c = await getConflicts()
      setConflicts(c)
    } catch {
      setConflicts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { conflicts, loading, refresh }
}

// --- useResolveConflict ---

export function useResolveConflict() {
  const [resolving, setResolving] = useState<number | null>(null)

  const resolve = useCallback(
    async (
      id: number,
      resolution: 'keep_local' | 'keep_server',
    ) => {
      setResolving(id)
      try {
        await resolveConflictFn(id, resolution)
        addSyncLog(
          'success',
          'conflict',
          String(id),
          `Konflik diresolusi: ${resolution === 'keep_local' ? 'data lokal' : 'data server'}`,
        )
      } catch (err) {
        addSyncLog(
          'error',
          'conflict',
          String(id),
          err instanceof Error ? err.message : 'Gagal resolusi konflik',
        )
      } finally {
        setResolving(null)
      }
    },
    [],
  )

  return { resolve, resolving }
}

// --- useSyncLog ---

export function useSyncLog() {
  const [log, setLog] = useState<SyncLogEntry[]>([])

  const refresh = useCallback(() => {
    setLog([...syncLog])
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5_000)
    return () => clearInterval(interval)
  }, [refresh])

  return { log, refresh }
}

// --- usePendingQueue ---

export function usePendingQueue() {
  const [items, setItems] = useState<SyncQueueItem[]>([])

  const refresh = useCallback(async () => {
    try {
      const all = await offlineDb.syncQueue.toArray()
      setItems(all)
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, refresh }
}
