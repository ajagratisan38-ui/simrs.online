'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  Users,
  Activity,
  Timer,
  HeartPulse,
  Loader2,
  RefreshCw,
  FileText,
  ChevronDown,
  Ambulance,
  BedDouble,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useIGDBoard,
  useIGDStats,
  useSetTriage,
  useSetResponseTime,
  useSetDisposition,
} from '@/hooks/use-igd'
import type { IGDBoardItem } from '@/lib/api/igd'

// ============================================
// TRIAGE CONFIG
// ============================================

const TRIAGE_CONFIG: Record<string, {
  label: string
  color: string
  bgClass: string
  textClass: string
  badgeVariant: 'destructive' | 'warning' | 'success' | 'secondary' | 'default'
  description: string
}> = {
  '1': {
    label: 'Level 1 — Resusitasi',
    color: '#DC2626',
    bgClass: 'bg-red-600',
    textClass: 'text-white',
    badgeVariant: 'destructive',
    description: 'Mengancam jiwa, penanganan segera',
  },
  '2': {
    label: 'Level 2 — Emergent',
    color: '#F97316',
    bgClass: 'bg-orange-500',
    textClass: 'text-white',
    badgeVariant: 'destructive',
    description: 'Potensi mengancam jiwa, <10 menit',
  },
  '3': {
    label: 'Level 3 — Urgent',
    color: '#EAB308',
    bgClass: 'bg-yellow-500',
    textClass: 'text-black',
    badgeVariant: 'warning',
    description: 'Serius, perlu evaluasi <30 menit',
  },
  '4': {
    label: 'Level 4 — Less Urgent',
    color: '#22C55E',
    bgClass: 'bg-green-500',
    textClass: 'text-white',
    badgeVariant: 'success',
    description: 'Kurang mendesak, <60 menit',
  },
  '5': {
    label: 'Level 5 — Non-Urgent',
    color: '#3B82F6',
    bgClass: 'bg-blue-500',
    textClass: 'text-white',
    badgeVariant: 'default',
    description: 'Tidak mendesak, bisa menunggu',
  },
}

const DISPOSITION_OPTIONS = [
  { value: 'pulang', label: 'Pulang', icon: '🏠' },
  { value: 'rawat_inap', label: 'Rawat Inap', icon: '🏥' },
  { value: 'rujuk', label: 'Rujuk', icon: '🚑' },
  { value: 'observasi', label: 'Observasi', icon: '👁️' },
  { value: 'aps', label: 'APS (Atas Permintaan Sendiri)', icon: '✋' },
  { value: 'meninggal', label: 'Meninggal', icon: '🕊️' },
]

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'secondary' | 'success' | 'destructive' | 'default' }> = {
  menunggu: { label: 'Menunggu', variant: 'warning' },
  dipanggil: { label: 'Dipanggil', variant: 'secondary' },
  diperiksa: { label: 'Diperiksa', variant: 'default' },
  selesai: { label: 'Selesai', variant: 'success' },
  pulang: { label: 'Pulang', variant: 'success' },
  rawat_inap: { label: 'Rawat Inap', variant: 'secondary' },
  batal: { label: 'Batal', variant: 'destructive' },
}

function computeAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  let y = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) y--
  return `${y} th`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// STAT CARDS
// ============================================

function StatsRow() {
  const { data, isLoading } = useIGDStats()
  const stats = data?.data

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/30">
              <HeartPulse className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalActive ?? 0}</p>
              <p className="text-xs text-muted-foreground">Pasien Aktif</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-teal-100 dark:bg-teal-900/30">
              <Users className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.todayTotal ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Hari Ini</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30">
              <Timer className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stats?.avgResponseMinutes != null ? `${stats.avgResponseMinutes}m` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Avg. Response</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.todayDischarged ?? 0}</p>
              <p className="text-xs text-muted-foreground">Sudah Keluar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// TRIAGE LEGEND
// ============================================

function TriageLegend() {
  const { data } = useIGDStats()
  const byTriage = data?.data?.byTriage ?? {}

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(TRIAGE_CONFIG).map(([level, cfg]) => (
        <div
          key={level}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            cfg.bgClass, cfg.textClass,
          )}
        >
          <span>{level}</span>
          <span className="opacity-80">({byTriage[level] || 0})</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-400 text-white">
        <span>?</span>
        <span className="opacity-80">({byTriage['belum'] || 0})</span>
      </div>
    </div>
  )
}

// ============================================
// PATIENT ROW
// ============================================

function PatientRow({ item }: { item: IGDBoardItem }) {
  const [expanded, setExpanded] = useState(false)
  const [triageValue, setTriageValue] = useState(item.triage_level || '')
  const [bedNumber, setBedNumber] = useState(item.igd_bed_number || '')
  const [dispValue, setDispValue] = useState(item.disposition || '')
  const [dispNotes, setDispNotes] = useState('')

  const triageMutation = useSetTriage()
  const responseMutation = useSetResponseTime()
  const dispositionMutation = useSetDisposition()

  const triageCfg = item.triage_level ? TRIAGE_CONFIG[item.triage_level] : null
  const statusCfg = STATUS_MAP[item.status] || STATUS_MAP.menunggu
  const isActive = !['selesai', 'batal', 'pulang'].includes(item.status)
  const genderLabel = item.jenis_kelamin === 'laki_laki' ? 'L' : 'P'

  function handleTriage() {
    if (!triageValue) return
    triageMutation.mutate({
      visitId: item.id,
      triageLevel: triageValue,
      igdBedNumber: bedNumber || undefined,
    })
  }

  function handleResponse() {
    responseMutation.mutate(item.id)
  }

  function handleDisposition() {
    if (!dispValue) return
    dispositionMutation.mutate({
      visitId: item.id,
      disposition: dispValue,
      notes: dispNotes || undefined,
    })
  }

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden transition-all',
      !isActive && 'opacity-60',
    )}>
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Triage indicator */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
            triageCfg ? cn(triageCfg.bgClass, triageCfg.textClass) : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
          )}
        >
          {item.triage_level || '?'}
        </div>

        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{item.patient_nama}</p>
            <span className="text-xs text-muted-foreground">
              {genderLabel}/{computeAge(item.tanggal_lahir)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {item.no_rekam_medis} — {item.keluhan_utama || 'Belum ada keluhan'}
          </p>
        </div>

        {/* Bed */}
        {item.igd_bed_number && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <BedDouble className="h-3.5 w-3.5" />
            <span>Bed {item.igd_bed_number}</span>
          </div>
        )}

        {/* Waiting time */}
        {item.waiting_minutes != null && (
          <div className={cn(
            'hidden sm:flex items-center gap-1 text-xs font-medium',
            item.waiting_minutes > 60 ? 'text-red-600' :
            item.waiting_minutes > 30 ? 'text-yellow-600' : 'text-muted-foreground',
          )}>
            <Clock className="h-3.5 w-3.5" />
            <span>{item.waiting_minutes}m</span>
          </div>
        )}

        {/* Status badge */}
        <Badge variant={statusCfg?.variant ?? 'secondary'} className="shrink-0">
          {statusCfg?.label ?? ''}
        </Badge>

        {/* Disposition badge */}
        {item.disposition && (
          <Badge variant="secondary" className="shrink-0">
            {DISPOSITION_OPTIONS.find((d) => d.value === item.disposition)?.label || item.disposition}
          </Badge>
        )}

        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
          expanded && 'rotate-180',
        )} />
      </button>

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-4 bg-muted/30">
          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Masuk</span>
              <p className="font-medium">{formatTime(item.created_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Dokter</span>
              <p className="font-medium">{item.doctor_nama || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cara Masuk</span>
              <p className="font-medium capitalize">{item.cara_masuk.replace('_', ' ')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Penjamin</span>
              <p className="font-medium uppercase">{item.penjamin}</p>
            </div>
          </div>

          {/* Triage section */}
          {isActive && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Triage Level</Label>
                <Select
                  value={triageValue}
                  onChange={(e) => setTriageValue(e.target.value)}
                  className="w-48"
                >
                  <option value="">Pilih triage...</option>
                  {Object.entries(TRIAGE_CONFIG).map(([lvl, cfg]) => (
                    <option key={lvl} value={lvl}>{cfg.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bed IGD</Label>
                <Input
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  placeholder="No. bed"
                  className="w-24"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTriage}
                disabled={!triageValue || triageMutation.isPending}
              >
                {triageMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                )}
                Set Triage
              </Button>
            </div>
          )}

          {/* Action buttons */}
          {isActive && (
            <div className="flex flex-wrap items-end gap-3">
              {/* Response time */}
              {!item.response_time && (
                <Button
                  size="sm"
                  onClick={handleResponse}
                  disabled={responseMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {responseMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Activity className="h-3.5 w-3.5 mr-1" />
                  )}
                  Catat Response Time
                </Button>
              )}
              {item.response_time && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Response: {formatTime(item.response_time)}
                </div>
              )}

              {/* Rekam Medis link */}
              <Link href={`/rekam-medis/${item.id}`}>
                <Button size="sm" variant="outline">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Rekam Medis
                </Button>
              </Link>
            </div>
          )}

          {/* Disposition */}
          {isActive && item.response_time && !item.disposition && (
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Disposisi</Label>
                <Select
                  value={dispValue}
                  onChange={(e) => setDispValue(e.target.value)}
                  className="w-56"
                >
                  <option value="">Pilih disposisi...</option>
                  {DISPOSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Catatan</Label>
                <Input
                  value={dispNotes}
                  onChange={(e) => setDispNotes(e.target.value)}
                  placeholder="Catatan disposisi (opsional)"
                  className="w-60"
                />
              </div>
              <Button
                size="sm"
                onClick={handleDisposition}
                disabled={!dispValue || dispositionMutation.isPending}
              >
                {dispositionMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                )}
                Simpan Disposisi
              </Button>
            </div>
          )}

          {/* Disposition result */}
          {item.disposition && (
            <div className="text-xs flex items-center gap-2 text-muted-foreground pt-1 border-t">
              <span>Disposisi:</span>
              <span className="font-medium">
                {DISPOSITION_OPTIONS.find((d) => d.value === item.disposition)?.icon}{' '}
                {DISPOSITION_OPTIONS.find((d) => d.value === item.disposition)?.label}
              </span>
              {item.disposition_time && (
                <span>— {formatTime(item.disposition_time)}</span>
              )}
              {item.disposition_notes && (
                <span className="italic">({item.disposition_notes})</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE
// ============================================

export default function IGDPage() {
  const [filterTriage, setFilterTriage] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')

  const { data, isLoading, refetch } = useIGDBoard()

  const allItems = data?.data ?? []

  const filteredItems = allItems.filter((item) => {
    if (filterTriage !== 'all') {
      if (filterTriage === 'belum' && item.triage_level) return false
      if (filterTriage !== 'belum' && item.triage_level !== filterTriage) return false
    }
    if (filterStatus === 'active') {
      return !['selesai', 'batal', 'pulang'].includes(item.status)
    }
    if (filterStatus !== 'all') {
      return item.status === filterStatus
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/30">
            <Ambulance className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Instalasi Gawat Darurat
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitoring pasien IGD real-time
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <StatsRow />

      {/* Triage Legend */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Distribusi Triage
              </p>
              <TriageLegend />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Triage</Label>
          <Select
            value={filterTriage}
            onChange={(e) => setFilterTriage(e.target.value)}
          >
            <option value="all">Semua Level</option>
            {Object.entries(TRIAGE_CONFIG).map(([lvl, cfg]) => (
              <option key={lvl} value={lvl}>Level {lvl}</option>
            ))}
            <option value="belum">Belum Triage</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="active">Aktif (belum selesai)</option>
            <option value="all">Semua</option>
            <option value="menunggu">Menunggu</option>
            <option value="diperiksa">Diperiksa</option>
            <option value="selesai">Selesai</option>
            <option value="pulang">Pulang</option>
          </Select>
        </div>
        {(filterTriage !== 'all' || filterStatus !== 'active') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterTriage('all')
              setFilterStatus('active')
            }}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Board */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoring Pasien ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <HeartPulse className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Tidak ada pasien IGD
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Daftarkan pasien IGD melalui halaman Pendaftaran dengan tipe IGD
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <PatientRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
