'use client'

import { useState, useMemo } from 'react'
import { useAuditLogs, useCleanupAuditLogs } from '@/hooks/use-audit'
import { buildExportUrl, type AuditFilters } from '@/lib/api/audit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Shield,
  Search,
  Download,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  User,
  Filter,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'READ', label: 'READ' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
  { value: 'LOGIN_FAILED', label: 'LOGIN_FAILED' },
  { value: 'EXPORT', label: 'EXPORT' },
  { value: 'PRINT', label: 'PRINT' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Semua Entitas' },
  { value: 'patient', label: 'Pasien' },
  { value: 'visit', label: 'Kunjungan' },
  { value: 'medical_record', label: 'Rekam Medis' },
  { value: 'prescription', label: 'Resep' },
  { value: 'billing', label: 'Billing' },
  { value: 'drug', label: 'Obat' },
  { value: 'user', label: 'Pengguna' },
  { value: 'sep', label: 'SEP BPJS' },
  { value: 'lab_order', label: 'Lab Order' },
  { value: 'radiology_order', label: 'Radiologi' },
]

const ACTION_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CREATE: 'default',
  READ: 'secondary',
  UPDATE: 'outline',
  DELETE: 'destructive',
  LOGIN: 'default',
  LOGOUT: 'secondary',
  LOGIN_FAILED: 'destructive',
  EXPORT: 'outline',
  PRINT: 'secondary',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function JsonViewer({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-xs text-muted-foreground italic">Tidak ada {label}</p>
  }
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilters>({
    page: 1,
    limit: 25,
  })
  const [searchUser, setSearchUser] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedEntity, setSelectedEntity] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailLog, setDetailLog] = useState<(typeof logs)[0] | null>(null)
  const [showCleanup, setShowCleanup] = useState(false)

  const activeFilters = useMemo<AuditFilters>(() => ({
    ...filters,
    action: selectedAction || undefined,
    entityType: selectedEntity || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  }), [filters, selectedAction, selectedEntity, dateFrom, dateTo])

  const { data, isLoading } = useAuditLogs(activeFilters)
  const cleanupMut = useCleanupAuditLogs()

  const logs = data?.data || []
  const meta = data?.meta

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, page: 1 }))
  }

  const handleExport = () => {
    const url = buildExportUrl({
      from: dateFrom || undefined,
      to: dateTo || undefined,
      action: selectedAction || undefined,
      entityType: selectedEntity || undefined,
    })
    const token = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('simrs-auth') || '{}')?.state?.accessToken
      : null

    if (!token) {
      toast.error('Token tidak ditemukan')
      return
    }

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': localStorage.getItem('simrs-tenant-slug') || 'rs-demo',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export gagal')
        return res.blob()
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(blobUrl)
        toast.success('Audit log berhasil di-export')
      })
      .catch(() => toast.error('Gagal mengexport audit log'))
  }

  const handleCleanup = async () => {
    try {
      const result = await cleanupMut.mutateAsync()
      toast.success(result.message)
      setShowCleanup(false)
    } catch {
      toast.error('Gagal membersihkan log lama')
    }
  }

  const hasActiveFilters = selectedAction || selectedEntity || dateFrom || dateTo

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Audit Log
          </h1>
          <p className="text-muted-foreground">
            Jejak aktivitas pengguna — kepatuhan UU PDP
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCleanup(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Cleanup
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      {meta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Log</p>
                  <p className="text-xl font-bold">{meta.total.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Halaman</p>
                  <p className="text-xl font-bold">
                    {meta.page} / {meta.totalPages}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Filter className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Filter Aktif</p>
                  <p className="text-xl font-bold">
                    {[selectedAction, selectedEntity, dateFrom, dateTo].filter(Boolean).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Aksi</Label>
              <Select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value)
                  setFilters((p) => ({ ...p, page: 1 }))
                }}
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Entitas</Label>
              <Select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value)
                  setFilters((p) => ({ ...p, page: 1 }))
                }}
              >
                {ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Dari Tanggal</Label>
              <DateInput
                value={dateFrom}
                onChange={(val) => {
                  setDateFrom(val)
                  setFilters((p) => ({ ...p, page: 1 }))
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Sampai Tanggal</Label>
              <DateInput
                value={dateTo}
                onChange={(val) => {
                  setDateTo(val)
                  setFilters((p) => ({ ...p, page: 1 }))
                }}
              />
            </div>
            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedAction('')
                    setSelectedEntity('')
                    setDateFrom('')
                    setDateTo('')
                    setFilters({ page: 1, limit: 25 })
                  }}
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada log ditemukan</p>
              <p className="text-sm">Coba ubah filter pencarian</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Waktu</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                    <TableHead>Entitas</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="w-[120px]">IP Address</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="group">
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {log.user_name || '-'}
                            </p>
                            {log.user_role && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {log.user_role}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ACTION_COLORS[log.action] || 'secondary'}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="text-xs text-muted-foreground ml-1 font-mono">
                            #{log.entity_id.slice(0, 8)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {log.entity_description || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setDetailLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {((meta.page - 1) * meta.limit) + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} dari{' '}
            {meta.total.toLocaleString('id-ID')} log
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-3 text-sm font-medium">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)} size="lg">
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detail Audit Log
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Waktu</p>
                  <p className="text-sm font-medium">{formatDate(detailLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="text-sm font-medium">
                    {detailLog.user_name || '-'}
                    {detailLog.user_role && (
                      <span className="text-muted-foreground ml-1">({detailLog.user_role})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aksi</p>
                  <Badge variant={ACTION_COLORS[detailLog.action] || 'secondary'}>
                    {detailLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Entitas</p>
                  <p className="text-sm font-medium">
                    {detailLog.entity_type}
                    {detailLog.entity_id && (
                      <span className="font-mono text-xs text-muted-foreground ml-1">
                        {detailLog.entity_id}
                      </span>
                    )}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Deskripsi</p>
                  <p className="text-sm">{detailLog.entity_description || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="text-sm font-mono">{detailLog.ip_address || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User Agent</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {detailLog.user_agent || '-'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <JsonViewer data={detailLog.old_data} label="Data Sebelum (Old Data)" />
                <JsonViewer data={detailLog.new_data} label="Data Sesudah (New Data)" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailLog(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Confirm Dialog */}
      <Dialog open={showCleanup} onOpenChange={setShowCleanup} size="sm">
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Bersihkan Log Lama
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aksi ini akan menghapus semua audit log yang sudah melewati masa retensi
              (sesuai konfigurasi server). Log yang masih dalam periode retensi tidak akan terpengaruh.
            </p>
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm font-medium text-destructive">
                Tindakan ini tidak dapat dibatalkan!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanup(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleanupMut.isPending}
            >
              {cleanupMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Ya, Bersihkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
