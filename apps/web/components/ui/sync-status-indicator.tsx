'use client'

import { useState, useRef, useEffect } from 'react'
import {
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react'
import { useSyncStatus } from '@/hooks/use-sync'
import { cn } from '@/lib/utils'
import Link from 'next/link'

function formatTimeAgo(ts: number | null): string {
  if (!ts) return 'Belum pernah sync'
  const diff = Date.now() - ts
  if (diff < 60_000) return 'Baru saja'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`
  return `${Math.floor(diff / 86_400_000)} hari lalu`
}

export function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const { pending, conflicts, lastSyncAt, pendingByEntity, syncing } = useSyncStatus()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lightweight online/offline detection — no health pings, no duplicate intervals
  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [popoverOpen])

  // Determine icon + color
  let icon: React.ReactNode
  let label: string
  let dotColor: string

  if (!isOnline) {
    icon = <XCircle className="h-4 w-4 text-red-500" />
    label = 'Offline'
    dotColor = 'bg-red-500'
  } else if (syncing) {
    icon = <RefreshCw className="h-4 w-4 text-teal-500 animate-spin" />
    label = 'Menyinkronkan...'
    dotColor = 'bg-teal-500'
  } else if (conflicts > 0) {
    icon = <XCircle className="h-4 w-4 text-red-500" />
    label = `${conflicts} konflik`
    dotColor = 'bg-red-500'
  } else if (pending > 0) {
    icon = <AlertTriangle className="h-4 w-4 text-yellow-500" />
    label = `${pending} pending`
    dotColor = 'bg-yellow-500'
  } else {
    icon = <CheckCircle2 className="h-4 w-4 text-green-500" />
    label = 'Tersinkronisasi'
    dotColor = 'bg-green-500'
  }

  const entityNames: Record<string, string> = {
    patient: 'Pasien',
    visit: 'Kunjungan',
    medical_record: 'Rekam Medis',
    prescription: 'Resep',
    drug: 'Obat',
    queue: 'Antrian',
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        className={cn(
          'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          'hover:bg-muted border border-transparent hover:border-border',
        )}
        title={label}
      >
        {icon}
        <span className="hidden sm:inline text-muted-foreground">{label}</span>
        {(pending > 0 || conflicts > 0) && (
          <span
            className={cn(
              'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
              dotColor,
            )}
          >
            {pending + conflicts}
          </span>
        )}
      </button>

      {/* Popover */}
      {popoverOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border bg-card shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
          <div className="p-4 space-y-3">
            {/* Status header */}
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', dotColor)} />
              <span className="text-sm font-medium">
                {!isOnline
                  ? 'Anda Offline'
                  : syncing
                    ? 'Sedang Sinkronisasi'
                    : conflicts > 0
                      ? 'Ada Konflik'
                      : pending > 0
                        ? 'Data Menunggu Sync'
                        : 'Semua Tersinkronisasi'}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>Sync terakhir: {formatTimeAgo(lastSyncAt)}</span>
              </div>

              {pending > 0 && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 p-2 space-y-1">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {pending} data menunggu sync
                  </p>
                  {Object.entries(pendingByEntity).map(([entity, count]) => (
                    <div
                      key={entity}
                      className="flex justify-between text-yellow-700 dark:text-yellow-300"
                    >
                      <span>{entityNames[entity] || entity}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              )}

              {conflicts > 0 && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-2">
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {conflicts} konflik perlu review
                  </p>
                  <Link
                    href="/admin/sync"
                    className="text-red-600 dark:text-red-400 underline hover:no-underline mt-1 inline-block"
                    onClick={() => setPopoverOpen(false)}
                  >
                    Tinjau konflik →
                  </Link>
                </div>
              )}
            </div>

            {/* Footer link */}
            <div className="pt-2 border-t">
              <Link
                href="/admin/sync"
                className="text-xs text-primary hover:underline"
                onClick={() => setPopoverOpen(false)}
              >
                Kelola Sinkronisasi →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
