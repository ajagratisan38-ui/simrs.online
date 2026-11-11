'use client'

import { useState, useEffect } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Database,
  ArrowRight,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { useOnlineStatus } from '@/lib/offline/offline-detector'
import {
  useSyncStatus,
  useForceSync,
  useConflicts,
  useResolveConflict,
  useSyncLog,
  usePendingQueue,
} from '@/hooks/use-sync'
import { cn } from '@/lib/utils'

const ENTITY_LABELS: Record<string, string> = {
  patient: 'Pasien',
  visit: 'Kunjungan',
  medical_record: 'Rekam Medis',
  prescription: 'Resep',
  drug: 'Obat',
  queue: 'Antrian',
  batch: 'Batch',
  sync: 'Sinkronisasi',
  conflict: 'Konflik',
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatRelative(ts: number | null): string {
  if (!ts) return 'Belum pernah'
  const diff = Date.now() - ts
  if (diff < 60_000) return 'Baru saja'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`
  return formatTime(ts)
}

// ==========================
// STATUS TAB
// ==========================
function StatusTab() {
  const { isOnline } = useOnlineStatus()
  const {
    pending,
    synced,
    conflicts,
    lastSyncAt,
    pendingByEntity,
    refresh: refreshStatus,
  } = useSyncStatus()
  const { forceSync, syncing } = useForceSync()
  const { items: queueItems, refresh: refreshQueue } = usePendingQueue()

  async function handleSync() {
    await forceSync()
    refreshStatus()
    refreshQueue()
  }

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="h-8 w-8 text-green-500" />
              ) : (
                <WifiOff className="h-8 w-8 text-red-500" />
              )}
              <div>
                <p className="text-2xl font-bold">
                  {isOnline ? 'Online' : 'Offline'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status Koneksi
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock
                className={cn(
                  'h-8 w-8',
                  pending > 0 ? 'text-yellow-500' : 'text-green-500',
                )}
              />
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-xs text-muted-foreground">
                  Menunggu Sync
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-teal-500" />
              <div>
                <p className="text-2xl font-bold">{synced}</p>
                <p className="text-xs text-muted-foreground">
                  Data Tersinkron
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={cn(
                  'h-8 w-8',
                  conflicts > 0 ? 'text-red-500' : 'text-green-500',
                )}
              />
              <div>
                <p className="text-2xl font-bold">{conflicts}</p>
                <p className="text-xs text-muted-foreground">Konflik</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last sync + force sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sinkronisasi</CardTitle>
          <CardDescription>
            Sync terakhir: {formatRelative(lastSyncAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Button
              onClick={handleSync}
              disabled={syncing || !isOnline || pending === 0}
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', syncing && 'animate-spin')}
              />
              {syncing ? 'Menyinkronkan...' : 'Sync Sekarang'}
            </Button>
            {!isOnline && (
              <p className="text-sm text-muted-foreground">
                Koneksi offline — tidak dapat melakukan sync manual
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending by entity */}
      {pending > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Data Menunggu Sinkronisasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {Object.entries(pendingByEntity).map(([entity, count]) => (
                <div
                  key={entity}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {ENTITY_LABELS[entity] || entity}
                    </span>
                  </div>
                  <Badge variant="warning">{count} pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue detail */}
      {queueItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antrean Sync</CardTitle>
            <CardDescription>
              Detail operasi yang menunggu dikirim ke server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-muted-foreground">
                      Aksi
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Entity
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Waktu
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Retry
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.slice(0, 20).map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Badge
                          variant={
                            item.action === 'create'
                              ? 'success'
                              : item.action === 'delete'
                                ? 'destructive'
                                : 'default'
                          }
                        >
                          {item.action}
                        </Badge>
                      </td>
                      <td className="py-2">
                        {ENTITY_LABELS[item.entity] || item.entity}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {formatTime(item.timestamp)}
                      </td>
                      <td className="py-2">
                        {item.retryCount > 0 && (
                          <Badge variant="warning">{item.retryCount}/5</Badge>
                        )}
                      </td>
                      <td className="py-2 text-xs text-red-500 max-w-[200px] truncate">
                        {item.lastError}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {queueItems.length > 20 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Menampilkan 20 dari {queueItems.length} item
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==========================
// CONFLICT TAB
// ==========================
function ConflictsTab() {
  const { conflicts, loading, refresh } = useConflicts()
  const { resolve, resolving } = useResolveConflict()
  const [detail, setDetail] = useState<number | null>(null)

  async function handleResolve(
    id: number,
    resolution: 'keep_local' | 'keep_server',
  ) {
    await resolve(id, resolution)
    refresh()
  }

  const activeConflict = conflicts.find((c) => c.id === detail)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="font-medium">Tidak ada konflik</p>
          <p className="text-sm text-muted-foreground mt-1">
            Semua data sudah tersinkronisasi dengan baik
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {conflicts.map((conflict) => (
          <Card
            key={conflict.id}
            className="border-l-4 border-l-red-500"
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-sm">
                      {ENTITY_LABELS[conflict.entity] || conflict.entity}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {conflict.entityId.slice(0, 8)}...
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lokal: {formatTime(conflict.localTimestamp)} — Server:{' '}
                    {formatTime(conflict.serverTimestamp)}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDetail(conflict.id ?? null)}
                  >
                    Detail
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resolving === conflict.id}
                    onClick={() =>
                      conflict.id !== undefined &&
                      handleResolve(conflict.id, 'keep_server')
                    }
                  >
                    Pakai Server
                  </Button>
                  <Button
                    size="sm"
                    disabled={resolving === conflict.id}
                    onClick={() =>
                      conflict.id !== undefined &&
                      handleResolve(conflict.id, 'keep_local')
                    }
                  >
                    Pakai Lokal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <DialogHeader>
          <DialogTitle>Detail Konflik</DialogTitle>
          <DialogDescription>
            Bandingkan data lokal dan data server
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          {activeConflict && (
            <div className="grid grid-cols-2 gap-4">
              {/* Local */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  Data Lokal
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {formatTime(activeConflict.localTimestamp)}
                </p>
                <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                  {JSON.stringify(activeConflict.localData, null, 2)}
                </pre>
              </div>

              {/* Server */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Data Server
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {formatTime(activeConflict.serverTimestamp)}
                </p>
                <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                  {JSON.stringify(activeConflict.serverData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          {activeConflict && (
            <>
              <Button
                variant="outline"
                disabled={resolving === activeConflict.id}
                onClick={() => {
                  if (activeConflict.id !== undefined) {
                    handleResolve(activeConflict.id, 'keep_server')
                    setDetail(null)
                  }
                }}
              >
                Pakai Data Server
              </Button>
              <Button
                disabled={resolving === activeConflict.id}
                onClick={() => {
                  if (activeConflict.id !== undefined) {
                    handleResolve(activeConflict.id, 'keep_local')
                    setDetail(null)
                  }
                }}
              >
                Pakai Data Lokal
              </Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </>
  )
}

// ==========================
// LOG TAB
// ==========================
function LogTab() {
  const { log } = useSyncLog()

  if (log.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Belum ada log</p>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat sinkronisasi akan muncul di sini
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-0">
          {log.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 py-3 border-b last:border-0"
            >
              {/* Icon */}
              <div className="mt-0.5">
                {entry.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : entry.type === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      entry.type === 'success'
                        ? 'success'
                        : entry.type === 'error'
                          ? 'destructive'
                          : 'warning'
                    }
                    className="text-[10px] px-1.5 py-0"
                  >
                    {entry.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {ENTITY_LABELS[entry.entity] || entry.entity}
                  </span>
                </div>
                <p className="text-sm mt-0.5">{entry.message}</p>
              </div>

              {/* Time */}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(entry.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================
// MAIN PAGE
// ==========================
export default function AdminSyncPage() {
  const [tab, setTab] = useState('status')
  const { conflicts } = useSyncStatus()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Sinkronisasi Data
        </h1>
        <p className="text-muted-foreground">
          Kelola sinkronisasi data offline dan resolusi konflik
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="conflicts">
            Konflik
            {conflicts > 0 && (
              <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {conflicts}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <StatusTab />
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictsTab />
        </TabsContent>

        <TabsContent value="log">
          <LogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
