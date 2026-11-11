'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  Calendar,
  Filter,
  Settings,
  Wifi,
  WifiOff,
  Shield,
  Save,
  Zap,
  Eye,
  EyeOff,
  ExternalLink,
  BarChart3,
  History,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  FileText,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useSatusehatConfig,
  useUpdateSatusehatConfig,
  useTestSatusehatConnection,
  useSatusehatPending,
  useSatusehatRetry,
  useSatusehatSync,
  useSatusehatHistory,
  useSatusehatStats,
} from '@/hooks/use-satusehat'
import type { TestConnectionResult, SatusehatHistoryItem } from '@/lib/api/satusehat'
import { toast } from 'sonner'

const LazyBarChart = dynamic(
  () => import('recharts').then((m) => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = m
    return {
      default: ({ data }: { data: { date: string; sent: number; failed: number }[] }) => (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => {
                const d = new Date(v)
                return `${d.getDate()}/${d.getMonth() + 1}`
              }}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(v: string) => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            />
            <Legend />
            <Bar dataKey="sent" name="Sukses" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="failed" name="Gagal" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
    }
  }),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
)

const STATUS_CONFIG: Record<string, {
  label: string
  variant: 'success' | 'warning' | 'destructive' | 'secondary'
  icon: typeof CheckCircle2
}> = {
  sent: { label: 'Terkirim', variant: 'success', icon: CheckCircle2 },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  failed: { label: 'Gagal', variant: 'destructive', icon: XCircle },
  not_required: { label: 'Tidak Perlu', variant: 'secondary', icon: Activity },
}

const ENV_OPTIONS = [
  { value: 'sandbox', label: 'Sandbox (Development)' },
  { value: 'staging', label: 'Staging (Pre-Production)' },
  { value: 'production', label: 'Production' },
]

const BASE_URL_MAP: Record<string, string> = {
  sandbox: 'https://api-satusehat-stg.dto.kemkes.go.id',
  staging: 'https://api-satusehat-stg.dto.kemkes.go.id',
  production: 'https://api-satusehat.kemkes.go.id',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// =========================================
// CONFIG TAB (unchanged from before)
// =========================================

function ConfigTab() {
  const { data: configRes, isLoading } = useSatusehatConfig()
  const updateMutation = useUpdateSatusehatConfig()
  const testMutation = useTestSatusehatConnection()

  const config = configRes?.data

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [orgId, setOrgId] = useState('')
  const [environment, setEnvironment] = useState('sandbox')
  const [showSecret, setShowSecret] = useState(false)
  const [secretPlaceholder, setSecretPlaceholder] = useState('')
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)

  useEffect(() => {
    if (config) {
      setClientId(config.clientId)
      setBaseUrl(config.baseUrl)
      setOrgId(config.orgId)
      setEnvironment(config.environment)
      setSecretPlaceholder(config.clientSecretMasked || '')
    }
  }, [config])

  function handleEnvChange(env: string) {
    setEnvironment(env)
    setBaseUrl(BASE_URL_MAP[env] || '')
  }

  async function handleSave() {
    const input: Record<string, string> = {}
    if (clientId !== (config?.clientId ?? '')) input.clientId = clientId
    if (clientSecret) input.clientSecret = clientSecret
    if (baseUrl !== (config?.baseUrl ?? '')) input.baseUrl = baseUrl
    if (orgId !== (config?.orgId ?? '')) input.orgId = orgId
    if (environment !== (config?.environment ?? 'sandbox')) input.environment = environment
    if (Object.keys(input).length === 0) return
    await updateMutation.mutateAsync(input)
    setClientSecret('')
    setTestResult(null)
  }

  async function handleTest() {
    const res = await testMutation.mutateAsync()
    setTestResult(res.data)
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
  }

  return (
    <div className="space-y-6">
      <Card className={config?.isConfigured ? 'border-green-200 dark:border-green-800' : 'border-yellow-200 dark:border-yellow-800'}>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            {config?.isConfigured ? (
              <div className="p-2.5 rounded-full bg-green-100 dark:bg-green-900/30"><Wifi className="h-5 w-5 text-green-600" /></div>
            ) : (
              <div className="p-2.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30"><WifiOff className="h-5 w-5 text-yellow-600" /></div>
            )}
            <div className="flex-1">
              <p className="font-medium">{config?.isConfigured ? 'SATUSEHAT Terkonfigurasi' : 'SATUSEHAT Belum Dikonfigurasi'}</p>
              <p className="text-sm text-muted-foreground">
                {config?.isConfigured ? `Environment: ${config.environment} — Client ID tersimpan` : 'Masukkan Client ID dan Client Secret untuk mengaktifkan integrasi'}
              </p>
            </div>
            {config?.isConfigured && <Badge variant="success" className="gap-1"><Shield className="h-3 w-3" />Aktif</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" />Konfigurasi Kredensial</CardTitle>
          <CardDescription>
            Dapatkan Client ID dan Client Secret dari{' '}
            <a href="https://satusehat.kemkes.go.id" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-1">
              satusehat.kemkes.go.id<ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <Label>Environment</Label>
              <Select value={environment} onChange={(e) => handleEnvChange(e.target.value)}>
                {ENV_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Client ID</Label>
              <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="font-mono text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label>Client Secret</Label>
              <div className="relative">
                <Input type={showSecret ? 'text' : 'password'} value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={secretPlaceholder || 'Masukkan Client Secret'} className="font-mono text-sm pr-10" />
                <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {secretPlaceholder && !clientSecret && <p className="text-xs text-muted-foreground">Secret tersimpan ({secretPlaceholder}). Kosongkan jika tidak ingin mengubah.</p>}
            </div>
            <div className="grid gap-1.5">
              <Label>Base URL</Label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="grid gap-1.5">
              <Label>Organization ID</Label>
              <Input value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="Organization ID dari SATUSEHAT" className="font-mono text-sm" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Simpan
              </Button>
              <Button variant="outline" onClick={handleTest} disabled={testMutation.isPending || !config?.isConfigured}>
                {testMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                Test Koneksi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {testResult && (
        <Card className={testResult.success ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'}>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              {testResult.success ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" /> : <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />}
              <div className="flex-1 space-y-2">
                <p className={`font-medium ${testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                </p>
                <p className="text-sm text-muted-foreground">{testResult.message}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Environment: <strong>{testResult.environment}</strong></span>
                  <span>Response: <strong>{testResult.responseTimeMs}ms</strong></span>
                  {testResult.tokenObtained && <span className="text-green-600"><CheckCircle2 className="h-3 w-3 inline mr-0.5" />Token diperoleh</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =========================================
// MONITORING TAB (pending/failed queue)
// =========================================

function MonitoringTab() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDate, setFilterDate] = useState('')
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  const { data, isLoading, refetch } = useSatusehatPending(page, 20)
  const retryMutation = useSatusehatRetry()
  const syncMutation = useSatusehatSync()

  const visits = data?.data ?? []
  const meta = data?.meta

  const filteredVisits = visits.filter((v) => {
    if (filterStatus !== 'all' && v.satusehat_sync_status !== filterStatus) return false
    if (filterDate && !v.tanggal.startsWith(filterDate)) return false
    return true
  })

  const totalPending = visits.filter((v) => v.satusehat_sync_status === 'pending').length
  const totalFailed = visits.filter((v) => v.satusehat_sync_status === 'failed').length

  async function handleRetry(visitId: string) {
    setSyncingIds((prev) => new Set(prev).add(visitId))
    try { await retryMutation.mutateAsync(visitId) } finally {
      setSyncingIds((prev) => { const next = new Set(prev); next.delete(visitId); return next })
    }
  }

  async function handleSyncAll() {
    const pendingIds = visits
      .filter((v) => v.satusehat_sync_status === 'pending' || v.satusehat_sync_status === 'failed')
      .map((v) => v.id)
    for (const id of pendingIds) {
      setSyncingIds((prev) => new Set(prev).add(id))
      try { await syncMutation.mutateAsync(id) } catch { /* continue */ } finally {
        setSyncingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      }
    }
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-md bg-teal-100 dark:bg-teal-900/30"><Activity className="h-5 w-5 text-teal-600" /></div><div><p className="text-2xl font-bold">{meta?.total ?? 0}</p><p className="text-xs text-muted-foreground">Total Pending/Gagal</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30"><Clock className="h-5 w-5 text-yellow-600" /></div><div><p className="text-2xl font-bold">{totalPending}</p><p className="text-xs text-muted-foreground">Menunggu Sync</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-md bg-red-100 dark:bg-red-900/30"><XCircle className="h-5 w-5 text-red-600" /></div><div><p className="text-2xl font-bold">{totalFailed}</p><p className="text-xs text-muted-foreground">Gagal Sync</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        <Button size="sm" onClick={handleSyncAll} disabled={syncingIds.size > 0 || (totalPending + totalFailed) === 0}>
          {syncingIds.size > 0 ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Activity className="h-4 w-4 mr-1" />}
          Sync Semua Pending
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Filter className="h-3 w-3" />Status</Label>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Semua</option>
                <option value="pending">Pending</option>
                <option value="failed">Gagal</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />Tanggal</Label>
              <DateInput value={filterDate} onChange={(val) => setFilterDate(val)} />
            </div>
            {(filterStatus !== 'all' || filterDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setFilterDate('') }}>Reset</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filteredVisits.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-400 mb-3" />
              <p className="text-sm font-medium">Semua data sudah tersinkronisasi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead>No. Kunjungan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.map((v) => {
                  const cfg = STATUS_CONFIG[v.satusehat_sync_status]
                  const StatusIcon = cfg?.icon ?? Clock
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{formatDate(v.tanggal)}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{v.patient_nama}</p>
                        <p className="text-xs text-muted-foreground font-mono">{v.patient_nik}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.visit_number}</TableCell>
                      <TableCell><Badge variant={cfg?.variant ?? 'warning'} className="gap-1"><StatusIcon className="h-3 w-3" />{cfg?.label ?? 'Pending'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleRetry(v.id)} disabled={syncingIds.has(v.id)}>
                          {syncingIds.has(v.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3 mr-1" />Retry</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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
    </div>
  )
}

// =========================================
// HISTORY TAB (NEW)
// =========================================

function HistoryTab() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailItem, setDetailItem] = useState<SatusehatHistoryItem | null>(null)
  const retryMutation = useSatusehatRetry()

  const { data, isLoading } = useSatusehatHistory({
    page,
    limit: 20,
    status: filterStatus !== 'all' ? filterStatus : undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  })

  const items = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
                <option value="all">Semua</option>
                <option value="sent">Terkirim</option>
                <option value="failed">Gagal</option>
                <option value="pending">Pending</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dari</Label>
              <DateInput value={dateFrom} onChange={(val) => { setDateFrom(val); setPage(1) }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai</Label>
              <DateInput value={dateTo} onChange={(val) => { setDateTo(val); setPage(1) }} />
            </div>
            {(filterStatus !== 'all' || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setDateFrom(''); setDateTo(''); setPage(1) }}>Reset</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riwayat Sync ({meta?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada riwayat sync</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal Visit</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead>No. RM</TableHead>
                  <TableHead>Visit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Encounter ID</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const cfg = STATUS_CONFIG[item.satusehat_sync_status]
                  const StatusIcon = cfg?.icon ?? Clock
                  return (
                    <TableRow key={item.id} className="group">
                      <TableCell className="text-sm">{formatDate(item.tanggal)}</TableCell>
                      <TableCell className="font-medium text-sm">{item.patient_nama}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.no_rekam_medis}</TableCell>
                      <TableCell className="font-mono text-xs">{item.visit_number}</TableCell>
                      <TableCell>
                        <Badge variant={cfg?.variant ?? 'secondary'} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {cfg?.label ?? item.satusehat_sync_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[120px] truncate">
                        {item.satusehat_encounter_id || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.sync_updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailItem(item)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {item.satusehat_sync_status === 'failed' && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => retryMutation.mutate(item.id)}>
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Halaman {meta.page} / {meta.totalPages} ({meta.total} total)
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)} size="md">
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Detail Sync</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Pasien</p><p className="text-sm font-medium">{detailItem.patient_nama}</p></div>
                <div><p className="text-xs text-muted-foreground">No. RM</p><p className="text-sm font-mono">{detailItem.no_rekam_medis}</p></div>
                <div><p className="text-xs text-muted-foreground">NIK</p><p className="text-sm font-mono">{detailItem.patient_nik}</p></div>
                <div><p className="text-xs text-muted-foreground">Visit Number</p><p className="text-sm font-mono">{detailItem.visit_number}</p></div>
                <div><p className="text-xs text-muted-foreground">Tanggal Kunjungan</p><p className="text-sm">{formatDate(detailItem.tanggal)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status Visit</p><p className="text-sm">{detailItem.status}</p></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-1">Status SATUSEHAT</p>
                <Badge variant={STATUS_CONFIG[detailItem.satusehat_sync_status]?.variant ?? 'secondary'} className="gap-1">
                  {STATUS_CONFIG[detailItem.satusehat_sync_status]?.label ?? detailItem.satusehat_sync_status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Encounter ID SATUSEHAT</p>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {detailItem.satusehat_encounter_id || 'Belum ada — belum pernah berhasil sync'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">FHIR Resources yang Dikirim</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Patient</Badge>
                  <Badge variant="outline">Encounter</Badge>
                  <Badge variant="outline">Condition</Badge>
                  <Badge variant="outline">Observation</Badge>
                  <Badge variant="outline">MedicationRequest</Badge>
                  <Badge variant="outline">Procedure</Badge>
                  <Badge variant="outline">AllergyIntolerance</Badge>
                  <Badge variant="outline">MedicationDispense</Badge>
                  <Badge variant="outline">ServiceRequest</Badge>
                  <Badge variant="outline">DiagnosticReport</Badge>
                  <Badge variant="outline">Composition</Badge>
                  <Badge variant="outline">Practitioner</Badge>
                  <Badge variant="outline">Location</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Terakhir Diupdate</p>
                <p className="text-sm">{formatDateTime(detailItem.sync_updated_at)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {detailItem?.satusehat_sync_status === 'failed' && (
              <Button size="sm" onClick={() => { retryMutation.mutate(detailItem.id); setDetailItem(null) }}>
                <RefreshCw className="h-4 w-4 mr-1" />Retry Sync
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailItem(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =========================================
// STATS TAB (NEW)
// =========================================

function StatsTab() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useSatusehatStats(days)

  const stats = data?.data
  const summary = stats?.summary ?? { sent: 0, failed: 0, pending: 0 }
  const daily = stats?.daily ?? []
  const total = summary.sent + summary.failed + summary.pending
  const successRate = total > 0 ? ((summary.sent / total) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Terkirim</p>
                <p className="text-2xl font-bold text-green-600">{summary.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"><XCircle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Gagal</p>
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-blue-600">{successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Trend Sync Harian
            </CardTitle>
            <Select className="w-36" value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
              <option value="7">7 Hari</option>
              <option value="14">14 Hari</option>
              <option value="30">30 Hari</option>
              <option value="90">90 Hari</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : daily.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada data sync</p>
              <p className="text-sm">Grafik akan muncul setelah ada kunjungan yang disinkronisasi</p>
            </div>
          ) : (
            <LazyBarChart data={daily} />
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {summary.failed > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  {summary.failed} kunjungan gagal dikirim ke SATUSEHAT
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Buka tab Monitoring untuk melihat detail dan retry sync yang gagal.
                  Pastikan kredensial SATUSEHAT masih valid.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =========================================
// MAIN PAGE
// =========================================

// =========================================
// RESOURCES TAB (NEW — FHIR Resource Mapping)
// =========================================

const FHIR_RESOURCES = [
  {
    resource: 'Patient',
    description: 'Data demografis pasien',
    source: 'Tabel patients',
    direction: 'auto-sync',
    phase: 'core',
  },
  {
    resource: 'Encounter',
    description: 'Kunjungan / episode perawatan',
    source: 'Tabel visits',
    direction: 'auto-sync',
    phase: 'core',
  },
  {
    resource: 'Condition',
    description: 'Diagnosis ICD-10',
    source: 'Tabel diagnoses',
    direction: 'auto-sync',
    phase: 'core',
  },
  {
    resource: 'Observation',
    description: 'Tanda vital & hasil pengukuran',
    source: 'medical_records (vital signs)',
    direction: 'auto-sync',
    phase: 'core',
  },
  {
    resource: 'MedicationRequest',
    description: 'Resep / permintaan obat',
    source: 'Tabel prescriptions',
    direction: 'auto-sync',
    phase: 'core',
  },
  {
    resource: 'Procedure',
    description: 'Tindakan / prosedur ICD-9-CM',
    source: 'Tabel procedures',
    direction: 'auto-sync',
    phase: 'extended',
  },
  {
    resource: 'AllergyIntolerance',
    description: 'Data alergi pasien',
    source: 'patients.alergi',
    direction: 'auto-sync',
    phase: 'extended',
  },
  {
    resource: 'MedicationDispense',
    description: 'Penyerahan obat ke pasien',
    source: 'Dispensing farmasi',
    direction: 'manual',
    phase: 'extended',
  },
  {
    resource: 'ServiceRequest',
    description: 'Permintaan lab / radiologi',
    source: 'lab_orders, radiology_orders',
    direction: 'manual',
    phase: 'extended',
  },
  {
    resource: 'DiagnosticReport',
    description: 'Hasil lab / radiologi',
    source: 'lab_orders (finalized), radiology_orders',
    direction: 'manual',
    phase: 'extended',
  },
  {
    resource: 'Composition',
    description: 'Resume medis / discharge summary',
    source: 'medical_records + diagnoses',
    direction: 'manual',
    phase: 'extended',
  },
  {
    resource: 'Practitioner',
    description: 'Data tenaga kesehatan (dokter, perawat)',
    source: 'Tabel users (role dokter/perawat)',
    direction: 'manual',
    phase: 'extended',
  },
  {
    resource: 'Location',
    description: 'Lokasi fasyankes (poli, ruangan, gedung)',
    source: 'Tabel poli, rooms',
    direction: 'manual',
    phase: 'extended',
  },
]

function ResourcesTab() {
  const coreResources = FHIR_RESOURCES.filter((r) => r.phase === 'core')
  const extendedResources = FHIR_RESOURCES.filter((r) => r.phase === 'extended')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            FHIR Resource Mapping — {FHIR_RESOURCES.length} Resources
          </CardTitle>
          <CardDescription>
            Pemetaan data SIMRS ke FHIR R4 resources untuk SATUSEHAT.
            Resources bertanda <Badge variant="success" className="text-[10px] px-1.5 py-0 mx-1">auto</Badge> otomatis dikirim saat syncVisit.
          </CardDescription>
        </CardHeader>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Core Resources ({coreResources.length})
        </h3>
        <div className="grid gap-3">
          {coreResources.map((r) => (
            <Card key={r.resource}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                      <FileText className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm font-mono">{r.resource}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{r.source}</span>
                    <Badge variant="success" className="text-[10px]">auto</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          Extended Resources ({extendedResources.length})
        </h3>
        <div className="grid gap-3">
          {extendedResources.map((r) => (
            <Card key={r.resource}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm font-mono">{r.resource}</p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{r.source}</span>
                    <Badge variant={r.direction === 'auto-sync' ? 'success' : 'secondary'} className="text-[10px]">
                      {r.direction === 'auto-sync' ? 'auto' : 'manual'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-400">
                Standar FHIR R4
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Semua resource mengikuti spesifikasi HL7 FHIR R4 sesuai panduan SATUSEHAT Kemenkes RI.
                Coding system menggunakan ICD-10 (diagnosis), ICD-9-CM (prosedur), dan LOINC (observasi).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type TabId = 'config' | 'monitoring' | 'history' | 'stats' | 'resources'

export default function SatusehatAdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('stats')

  const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
    { id: 'stats', label: 'Statistik', icon: BarChart3 },
    { id: 'resources', label: 'Resources', icon: Database },
    { id: 'monitoring', label: 'Antrian Sync', icon: Activity },
    { id: 'history', label: 'Riwayat', icon: History },
    { id: 'config', label: 'Konfigurasi', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SATUSEHAT</h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi dan monitoring integrasi SATUSEHAT Kemenkes
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
      {activeTab === 'resources' && <ResourcesTab />}
      {activeTab === 'monitoring' && <MonitoringTab />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'config' && <ConfigTab />}
    </div>
  )
}
