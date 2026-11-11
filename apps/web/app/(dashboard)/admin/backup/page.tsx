'use client'

import { useState } from 'react'
import {
  HardDrive,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Settings,
  Calendar,
  Timer,
  Database,
  Server,
  Play,
  RotateCcw,
  Copy,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useBackupStats,
  useBackupList,
  useCreateBackup,
  useDeleteBackup,
  useBackupSchedule,
  useUpdateBackupSchedule,
  useValidateRestore,
  useRestoreCommand,
} from '@/hooks/use-backup'
import { downloadBackupFile, type BackupLog, type UpdateScheduleInput } from '@/lib/api/backup'
import { toast } from 'sonner'

// --- Helpers ---

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

const TYPE_LABELS: Record<string, string> = {
  auto_daily: 'Harian',
  auto_weekly: 'Mingguan',
  manual: 'Manual',
  pre_migration: 'Pre-Migrasi',
}

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'warning'> = {
  success: 'success',
  failed: 'destructive',
  running: 'warning',
}

const FREQ_LABELS: Record<string, string> = {
  daily: 'Setiap Hari',
  weekly: 'Setiap Minggu',
  monthly: 'Setiap Bulan',
}

const DAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

// ==========================================
// STATS TAB
// ==========================================

function StatsTab() {
  const { data: statsRes, isLoading, error } = useBackupStats()
  const stats = statsRes?.data

  if (isLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
  }

  if (error || !stats) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-red-400 mb-3" />
          <p className="font-medium text-red-600">Gagal memuat data backup</p>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message || 'Server tidak merespon. Pastikan server backend berjalan.'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Backup</p>
                <p className="text-2xl font-bold">{stats.totalBackups}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Berhasil</p>
                <p className="text-2xl font-bold text-green-600">{stats.successfulBackups}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gagal</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedBackups}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <HardDrive className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Ukuran</p>
                <p className="text-2xl font-bold">{formatBytes(stats.totalSizeBytes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={stats.lastSuccessful ? 'border-green-200 dark:border-green-800' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Backup Terakhir Berhasil
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lastSuccessful ? (
              <div className="space-y-2">
                <p className="font-medium">{formatDateTime(stats.lastSuccessful.started_at)}</p>
                <p className="text-sm text-muted-foreground">{formatRelative(stats.lastSuccessful.started_at)}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Ukuran: <strong>{formatBytes(stats.lastSuccessful.size_bytes || 0)}</strong></span>
                  <span>Durasi: <strong>{formatDuration(stats.lastSuccessful.duration_ms || 0)}</strong></span>
                  <span>Tipe: <strong>{TYPE_LABELS[stats.lastSuccessful.type] || stats.lastSuccessful.type}</strong></span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada backup yang berhasil</p>
            )}
          </CardContent>
        </Card>

        <Card className={stats.scheduleActive ? 'border-blue-200 dark:border-blue-800' : 'border-yellow-200 dark:border-yellow-800'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Jadwal Otomatis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={stats.scheduleActive ? 'success' : 'warning'}>
                {stats.scheduleActive ? 'Aktif' : 'Nonaktif'}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {stats.scheduleActive
                  ? 'Backup dijadwalkan berjalan otomatis'
                  : 'Aktifkan di tab Jadwal'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==========================================
// HISTORY TAB
// ==========================================

function HistoryTab() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null)

  const { data, isLoading, refetch } = useBackupList(page, 20, statusFilter)
  const createMutation = useCreateBackup()
  const deleteMutation = useDeleteBackup()

  const backups = data?.data ?? []
  const meta = data?.meta

  async function handleDownload(id: string) {
    try {
      await downloadBackupFile(id)
      toast.success('Backup berhasil diunduh')
    } catch (err) {
      toast.error(`Download gagal: ${(err as Error).message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => createMutation.mutate('manual')} disabled={createMutation.isPending}>
          {createMutation.isPending
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Play className="h-4 w-4 mr-2" />}
          Backup Manual
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="all">Semua Status</option>
            <option value="success">Berhasil</option>
            <option value="failed">Gagal</option>
            <option value="running">Berjalan</option>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-16">
              <FileArchive className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-medium">Belum Ada Backup</p>
              <p className="text-sm text-muted-foreground">Klik &quot;Backup Manual&quot; untuk membuat backup pertama</p>
            </div>
          ) : (
            <div className="divide-y">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    {backup.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    ) : backup.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-yellow-500 animate-spin shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {backup.filename || 'backup...'}
                        </p>
                        <Badge variant={STATUS_VARIANT[backup.status] || 'secondary'} className="text-[10px]">
                          {backup.status === 'success' ? 'Berhasil' : backup.status === 'failed' ? 'Gagal' : 'Berjalan'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABELS[backup.type] || backup.type}
                        </Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{formatDateTime(backup.started_at)}</span>
                        {backup.size_bytes && <span>{formatBytes(backup.size_bytes)}</span>}
                        {backup.duration_ms && <span>{formatDuration(backup.duration_ms)}</span>}
                        {backup.pg_version && <span>PG {backup.pg_version}</span>}
                        {backup.table_count && <span>{backup.table_count} tables</span>}
                      </div>
                      {backup.error_message && (
                        <p className="text-xs text-red-500 mt-1 truncate max-w-md">
                          {backup.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    {backup.status === 'success' && (
                      <>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleDownload(backup.id)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setRestoreTarget(backup.id)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(backup.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Halaman {meta.page} / {meta.totalPages} ({meta.total} total)</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Hapus Backup
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Backup file akan dihapus secara permanen dari server. Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget)
                setDeleteTarget(null)
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore dialog */}
      {restoreTarget && (
        <RestoreDialog
          backupId={restoreTarget}
          onClose={() => setRestoreTarget(null)}
        />
      )}
    </div>
  )
}

// ==========================================
// RESTORE DIALOG
// ==========================================

function RestoreDialog({ backupId, onClose }: { backupId: string; onClose: () => void }) {
  const { data: validateRes, isLoading: validating } = useValidateRestore(backupId)
  const { data: cmdRes, isLoading: cmdLoading } = useRestoreCommand(backupId)

  const validation = validateRes?.data
  const restoreCmd = cmdRes?.data?.command

  function handleCopy() {
    if (restoreCmd) {
      navigator.clipboard.writeText(restoreCmd)
      toast.success('Perintah restore disalin ke clipboard')
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <RotateCcw className="h-5 w-5" /> Restore Database
          </DialogTitle>
        </DialogHeader>

        {validating ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Validating backup...</p>
          </div>
        ) : validation ? (
          <div className="space-y-4">
            <Card className={validation.valid ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {validation.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${validation.valid ? 'text-green-700' : 'text-red-700'}`}>
                      {validation.message}
                    </p>
                    {validation.valid && (
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <p>File: {validation.filename}</p>
                        <p>Ukuran: {formatBytes(validation.sizeBytes)}</p>
                        <p>Dibuat: {formatDateTime(validation.createdAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {validation.valid && (
              <>
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-700 dark:text-orange-400">Perhatian</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Restore akan menimpa seluruh data yang ada saat ini. Pastikan Anda sudah
                          membuat backup terbaru sebelum melakukan restore. Jalankan perintah di bawah
                          ini di terminal server.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Perintah Restore</Label>
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7">
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                  {cmdLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                      {restoreCmd || '# Loading...'}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// SCHEDULE TAB
// ==========================================

function ScheduleTab() {
  const { data: scheduleRes, isLoading, error: scheduleError } = useBackupSchedule()
  const updateMutation = useUpdateBackupSchedule()

  const schedule = scheduleRes?.data

  const [editFreq, setEditFreq] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editDow, setEditDow] = useState(1)
  const [editDom, setEditDom] = useState(1)
  const [editRetention, setEditRetention] = useState(30)
  const [editStorage, setEditStorage] = useState('local')
  const [editing, setEditing] = useState(false)

  function startEdit() {
    if (!schedule) return
    setEditFreq(schedule.frequency)
    setEditTime(schedule.time)
    setEditDow(schedule.day_of_week ?? 1)
    setEditDom(schedule.day_of_month ?? 1)
    setEditRetention(schedule.retention_days)
    setEditStorage(schedule.storage)
    setEditing(true)
  }

  async function handleSave() {
    const input: UpdateScheduleInput = {
      frequency: editFreq as 'daily' | 'weekly' | 'monthly',
      time: editTime,
      retention_days: editRetention,
      storage: editStorage as 'local' | 's3' | 'gcs',
    }
    if (editFreq === 'weekly') input.day_of_week = editDow
    if (editFreq === 'monthly') input.day_of_month = editDom

    await updateMutation.mutateAsync(input)
    setEditing(false)
  }

  async function handleToggle() {
    if (!schedule) return
    await updateMutation.mutateAsync({ is_active: !schedule.is_active })
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
  }

  if (scheduleError || !schedule) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-red-400 mb-3" />
          <p className="font-medium text-red-600">Gagal memuat jadwal backup</p>
          <p className="text-sm text-muted-foreground mt-1">{(scheduleError as Error)?.message || 'Server tidak merespon'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current schedule card */}
      <Card className={schedule.is_active ? 'border-green-200 dark:border-green-800' : 'border-zinc-200'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full ${schedule.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                <Timer className={`h-5 w-5 ${schedule.is_active ? 'text-green-600' : 'text-zinc-400'}`} />
              </div>
              <div>
                <CardTitle className="text-base">Backup Otomatis</CardTitle>
                <CardDescription>
                  {schedule.is_active ? (
                    <>
                      {FREQ_LABELS[schedule.frequency] || schedule.frequency} pukul {schedule.time} WIB
                      {schedule.frequency === 'weekly' && schedule.day_of_week !== null && ` (${DAY_LABELS[schedule.day_of_week]})`}
                      {schedule.frequency === 'monthly' && schedule.day_of_month && ` (tanggal ${schedule.day_of_month})`}
                    </>
                  ) : 'Jadwal backup tidak aktif'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={schedule.is_active ? 'destructive' : 'default'}
                size="sm"
                onClick={handleToggle}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {schedule.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Settings className="h-4 w-4 mr-1" /> Ubah
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Frekuensi</p>
              <p className="font-medium">{FREQ_LABELS[schedule.frequency]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Waktu</p>
              <p className="font-medium">{schedule.time} WIB</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Retensi</p>
              <p className="font-medium">{schedule.retention_days} hari</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Storage</p>
              <p className="font-medium capitalize">{schedule.storage}</p>
            </div>
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t text-xs text-muted-foreground">
            {schedule.last_run_at && <span>Terakhir berjalan: <strong>{formatDateTime(schedule.last_run_at)}</strong></span>}
            {schedule.next_run_at && <span>Berikutnya: <strong>{formatDateTime(schedule.next_run_at)}</strong></span>}
          </div>
        </CardContent>
      </Card>

      {/* Storage info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4" />Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 border rounded-lg ${schedule.storage === 'local' ? 'border-primary bg-primary/5' : ''}`}>
              <p className="font-medium text-sm">Local Disk</p>
              <p className="text-xs text-muted-foreground mt-1">Backup disimpan di server lokal. Cepat tapi tidak terlindungi dari kegagalan hardware.</p>
              {schedule.storage === 'local' && <Badge variant="success" className="mt-2 text-[10px]">Aktif</Badge>}
            </div>
            <div className={`p-4 border rounded-lg ${schedule.storage === 's3' ? 'border-primary bg-primary/5' : 'opacity-60'}`}>
              <p className="font-medium text-sm">Amazon S3</p>
              <p className="text-xs text-muted-foreground mt-1">Cloud storage dengan durabilitas 99.999999999%. Memerlukan konfigurasi AWS credentials.</p>
              {schedule.storage === 's3' ? <Badge variant="success" className="mt-2 text-[10px]">Aktif</Badge> : <Badge variant="outline" className="mt-2 text-[10px]">Segera Hadir</Badge>}
            </div>
            <div className={`p-4 border rounded-lg ${schedule.storage === 'gcs' ? 'border-primary bg-primary/5' : 'opacity-60'}`}>
              <p className="font-medium text-sm">Google Cloud Storage</p>
              <p className="text-xs text-muted-foreground mt-1">Cloud storage alternatif dari Google. Memerlukan konfigurasi GCS credentials.</p>
              {schedule.storage === 'gcs' ? <Badge variant="success" className="mt-2 text-[10px]">Aktif</Badge> : <Badge variant="outline" className="mt-2 text-[10px]">Segera Hadir</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={(v) => !v && setEditing(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Ubah Jadwal Backup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Frekuensi</Label>
              <Select value={editFreq} onChange={(e) => setEditFreq(e.target.value)}>
                <option value="daily">Setiap Hari</option>
                <option value="weekly">Setiap Minggu</option>
                <option value="monthly">Setiap Bulan</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Waktu (WIB)</Label>
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
            </div>
            {editFreq === 'weekly' && (
              <div className="grid gap-1.5">
                <Label>Hari</Label>
                <Select value={String(editDow)} onChange={(e) => setEditDow(Number(e.target.value))}>
                  {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </Select>
              </div>
            )}
            {editFreq === 'monthly' && (
              <div className="grid gap-1.5">
                <Label>Tanggal</Label>
                <Input type="number" min={1} max={28} value={editDom} onChange={(e) => setEditDom(Number(e.target.value))} />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Retensi (hari)</Label>
              <Input type="number" min={1} max={365} value={editRetention} onChange={(e) => setEditRetention(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Backup lebih lama dari ini akan dihapus otomatis</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Storage</Label>
              <Select value={editStorage} onChange={(e) => setEditStorage(e.target.value)}>
                <option value="local">Local Disk</option>
                <option value="s3">Amazon S3</option>
                <option value="gcs">Google Cloud Storage</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==========================================
// MAIN PAGE
// ==========================================

type TabId = 'stats' | 'history' | 'schedule'

export default function BackupPage() {
  const [activeTab, setActiveTab] = useState<TabId>('stats')

  const tabs: { id: TabId; label: string; icon: typeof HardDrive }[] = [
    { id: 'stats', label: 'Overview', icon: Database },
    { id: 'history', label: 'Riwayat Backup', icon: FileArchive },
    { id: 'schedule', label: 'Jadwal & Storage', icon: Calendar },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HardDrive className="h-6 w-6 text-slate-600" />
          Backup & Recovery
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola backup database otomatis, unduh backup, dan pemulihan data
        </p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'schedule' && <ScheduleTab />}
    </div>
  )
}
