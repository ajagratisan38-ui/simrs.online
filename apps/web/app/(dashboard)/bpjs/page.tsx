'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useCallback } from 'react'
import {
  CreditCard,
  Search,
  FileText,
  UserCheck,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Calendar,
  Stethoscope,
  Phone,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ClipboardList,
  Pill,
  BarChart3,
  Bed,
  DollarSign,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useBpjsPeserta,
  useBpjsPesertaByNik,
  useBpjsRujukan,
  useBpjsSep,
  useDeleteSep,
  useSepQuota,
  usePcareKunjungan,
  usePcareRiwayatKunjungan,
  usePcareSearchObat,
  useEklaimClaims,
  useEklaimClaim,
  useEklaimGrouping,
  useEklaimDeleteClaim,
  useAplicareBed,
  useKunjunganBulanan,
  useAntrolRefPoli,
  useAntrolRefDokter,
  useAntrolJadwalDokter,
  useAntrolTambahAntrean,
  useAntrolUpdateAntrean,
  useAntrolBatalAntrean,
  useAntrolListTask,
  useAntrolSyncTasks,
  useAntrolDashboard,
} from '@/hooks/use-bpjs'
import type { BpjsPeserta, BpjsRujukan, BpjsSepData, PcareKunjunganRow, PcareObatRow, EklaimClaimListItem, AplicareBedRow, AntrolTaskItem, AntrolJadwalDokter, AntrolPoliRef, AntrolDokterRef, AntrolDashboard } from '@/lib/api/bpjs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { DateInput } from '@/components/ui/date-input'

type ActiveTab = 'peserta' | 'sep' | 'rujukan' | 'pcare' | 'eklaim' | 'aplicare' | 'monitoring' | 'antrol'

export default function BpjsPage() {
  const [tab, setTab] = useState<ActiveTab>('peserta')
  const { data: sepQuotaRes } = useSepQuota()
  const sepQuota = sepQuotaRes?.data

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-600" />
            BPJS Kesehatan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cek peserta, kelola SEP, dan riwayat rujukan
          </p>
        </div>

        {/* SEP Quota Badge */}
        {sepQuota && !sepQuota.isUnlimited && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium',
            sepQuota.remaining <= 0
              ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
              : sepQuota.remaining <= 5
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
          )}>
            <FileText className="h-3.5 w-3.5" />
            <span>Kuota SEP: {sepQuota.used}/{sepQuota.limit}</span>
            <Badge variant="outline" className={cn(
              'text-[10px] ml-1',
              sepQuota.remaining <= 0 ? 'border-red-400' : sepQuota.remaining <= 5 ? 'border-amber-400' : 'border-emerald-400',
            )}>
              sisa {sepQuota.remaining}
            </Badge>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto">
        {([
          { key: 'peserta', label: 'Cek Peserta', icon: UserCheck },
          { key: 'sep', label: 'Kelola SEP', icon: FileText },
          { key: 'rujukan', label: 'Rujukan', icon: ClipboardList },
          { key: 'pcare', label: 'PCare', icon: Pill },
          { key: 'eklaim', label: 'e-Klaim', icon: DollarSign },
          { key: 'aplicare', label: 'Aplicare', icon: Bed },
          { key: 'monitoring', label: 'Monitoring', icon: BarChart3 },
          { key: 'antrol', label: 'Antrol', icon: Phone },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              tab === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'peserta' && <PesertaTab />}
      {tab === 'sep' && <SepTab />}
      {tab === 'rujukan' && <RujukanTab />}
      {tab === 'pcare' && <PcareTab />}
      {tab === 'eklaim' && <EklaimTab />}
      {tab === 'aplicare' && <AplicareTab />}
      {tab === 'monitoring' && <MonitoringTab />}
      {tab === 'antrol' && <AntrolTab />}
    </div>
  )
}

// ==================== TAB: CEK PESERTA ====================

function PesertaTab() {
  const [mode, setMode] = useState<'noKartu' | 'nik'>('noKartu')
  const [input, setInput] = useState('')
  const [searchValue, setSearchValue] = useState('')

  const pesertaByKartu = useBpjsPeserta(
    mode === 'noKartu' ? searchValue : undefined,
  )
  const pesertaByNik = useBpjsPesertaByNik(
    mode === 'nik' ? searchValue : undefined,
  )

  const query = mode === 'noKartu' ? pesertaByKartu : pesertaByNik
  const peserta = query.data?.data

  const handleSearch = useCallback(() => {
    if (!input.trim()) {
      toast.error(mode === 'noKartu' ? 'Masukkan No. Kartu BPJS' : 'Masukkan NIK (16 digit)')
      return
    }
    if (mode === 'nik' && input.length !== 16) {
      toast.error('NIK harus 16 digit')
      return
    }
    setSearchValue(input.trim())
  }, [input, mode])

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setMode('noKartu'); setSearchValue(''); setInput('') }}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md font-medium transition-colors',
                mode === 'noKartu'
                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              No. Kartu BPJS
            </button>
            <button
              onClick={() => { setMode('nik'); setSearchValue(''); setInput('') }}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md font-medium transition-colors',
                mode === 'nik'
                  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              NIK
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={
                  mode === 'noKartu'
                    ? 'Masukkan 13 digit No. Kartu BPJS...'
                    : 'Masukkan 16 digit NIK...'
                }
                className="pl-9 font-mono"
                maxLength={mode === 'nik' ? 16 : 13}
              />
            </div>
            <Button onClick={handleSearch} disabled={query.isFetching}>
              {query.isFetching
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Search className="h-4 w-4 mr-1" /> Cari</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {query.isFetching && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      )}

      {query.isError && !query.isFetching && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Peserta tidak ditemukan</p>
                <p className="text-xs mt-0.5 text-red-500">
                  {query.error instanceof Error
                    ? query.error.message
                    : 'Periksa kembali nomor yang dimasukkan'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {peserta && !query.isFetching && <PesertaDetail peserta={peserta} />}

      {/* Empty state */}
      {!searchValue && !query.isFetching && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Masukkan No. Kartu BPJS atau NIK untuk melihat data peserta
          </p>
        </div>
      )}
    </div>
  )
}

function PesertaDetail({ peserta }: { peserta: BpjsPeserta }) {
  const isAktif = peserta.aktif
  const kelasName = peserta.jnsKelas?.nama || peserta.jnsKelas?.kode || '-'

  return (
    <Card className={cn(
      'border-2',
      isAktif ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-teal-600" />
            Data Peserta BPJS
          </CardTitle>
          <Badge
            variant={isAktif ? 'default' : 'destructive'}
            className={cn(
              'gap-1',
              isAktif && 'bg-green-600 hover:bg-green-700',
            )}
          >
            {isAktif
              ? <><CheckCircle2 className="h-3 w-3" /> Aktif</>
              : <><XCircle className="h-3 w-3" /> Tidak Aktif</>}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nama besar */}
        <div className="pb-3 border-b">
          <p className="text-lg font-bold">{peserta.nama}</p>
          <p className="text-sm text-muted-foreground font-mono">
            No. Kartu: {peserta.noKartu}
          </p>
        </div>

        {/* Grid info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard icon={CreditCard} label="NIK" value={peserta.nik || peserta.noKTP || '-'} mono />
          <InfoCard icon={Calendar} label="Tanggal Lahir" value={peserta.tglLahir || '-'} />
          <InfoCard icon={UserCheck} label="Jenis Peserta" value={peserta.jnsPeserta?.nama || '-'} />
          <InfoCard icon={Stethoscope} label="Kelas Rawat" value={kelasName} highlight />
          <InfoCard icon={Building2} label="Faskes Tk. 1" value={peserta.kdProviderPst?.nmProvider || '-'} />
          <InfoCard icon={Building2} label="Faskes Gigi" value={peserta.kdProviderGigi?.nmProvider || '-'} />
          <InfoCard icon={Phone} label="No. HP" value={peserta.noHP || '-'} />
          <InfoCard
            icon={Calendar}
            label="Berlaku s/d"
            value={peserta.tglTAT || '-'}
          />
        </div>

        {/* Warnings */}
        {!isAktif && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Kepesertaan Tidak Aktif</p>
              <p className="text-xs mt-0.5">
                {peserta.ketAktif || 'Pasien tidak dapat didaftarkan menggunakan BPJS'}
              </p>
            </div>
          </div>
        )}

        {peserta.tunggakan > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Ada Tunggakan</p>
              <p className="text-xs mt-0.5">
                {formatRupiah(peserta.tunggakan)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'flex items-start gap-2.5 p-2.5 rounded-lg border bg-muted/30',
      highlight && 'bg-teal-50/50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800',
    )}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn(
          'text-sm font-medium truncate',
          mono && 'font-mono',
          highlight && 'text-teal-700 dark:text-teal-300',
        )}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ==================== TAB: KELOLA SEP ====================

function SepTab() {
  const [searchInput, setSearchInput] = useState('')
  const [searchNoSep, setSearchNoSep] = useState('')

  const { data: sepRes, isFetching, isError, error, refetch } = useBpjsSep(searchNoSep)
  const sep = sepRes?.data
  const deleteMut = useDeleteSep()

  const handleSearch = useCallback(() => {
    if (!searchInput.trim()) {
      toast.error('Masukkan No. SEP')
      return
    }
    setSearchNoSep(searchInput.trim())
  }, [searchInput])

  const handleDelete = (noSep: string) => {
    if (!confirm(`Hapus SEP ${noSep}? Tindakan ini tidak bisa dibatalkan.`)) return
    deleteMut.mutate(
      { noSep, user: 'admin' },
      {
        onSuccess: () => {
          setSearchNoSep('')
          setSearchInput('')
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      {/* Search SEP */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground mb-2">
            Cari SEP berdasarkan nomor
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="No. SEP..."
                className="pl-9 font-mono"
              />
            </div>
            <Button onClick={handleSearch} disabled={isFetching}>
              {isFetching
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Search className="h-4 w-4 mr-1" /> Cari</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isFetching && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {isError && !isFetching && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">SEP tidak ditemukan</p>
                <p className="text-xs mt-0.5 text-red-500">
                  {error instanceof Error ? error.message : 'Periksa nomor SEP'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEP Detail */}
      {sep && !isFetching && (
        <SepDetailCard sep={sep} onDelete={handleDelete} isDeleting={deleteMut.isPending} />
      )}

      {/* Empty */}
      {!searchNoSep && !isFetching && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Masukkan No. SEP untuk melihat detail
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            SEP dibuat otomatis saat pendaftaran pasien BPJS
          </p>
        </div>
      )}
    </div>
  )
}

function SepDetailCard({
  sep,
  onDelete,
  isDeleting,
}: {
  sep: BpjsSepData
  onDelete: (noSep: string) => void
  isDeleting: boolean
}) {
  const pelayanan = sep.jnsPelayanan === '1' ? 'Rawat Inap' : 'Rawat Jalan'

  return (
    <Card className="border-2 border-teal-200 dark:border-teal-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            Detail SEP
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
              {pelayanan}
            </Badge>
            <Button
              variant="ghost" size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
              onClick={() => onDelete(sep.noSep)}
              disabled={isDeleting}
            >
              {isDeleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No SEP besar */}
        <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800">
          <p className="text-[10px] text-teal-600 uppercase tracking-wide">No. SEP</p>
          <p className="text-lg font-bold font-mono text-teal-800 dark:text-teal-200">
            {sep.noSep}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoCard icon={Calendar} label="Tanggal SEP" value={sep.tglSep} />
          <InfoCard icon={Stethoscope} label="Jenis Pelayanan" value={pelayanan} />
          <InfoCard icon={CreditCard} label="Kelas Rawat" value={`Kelas ${sep.kelasRawat}`} highlight />
          <InfoCard icon={CreditCard} label="No. RM" value={sep.noMR} mono />

          {sep.peserta && (
            <>
              <InfoCard icon={UserCheck} label="Nama Peserta" value={sep.peserta.nama} />
              <InfoCard icon={CreditCard} label="No. Kartu" value={sep.peserta.noKartu} mono />
            </>
          )}

          {sep.diagnosa && (
            <div className="sm:col-span-2">
              <InfoCard
                icon={Stethoscope}
                label="Diagnosa"
                value={`${sep.diagnosa.kode} — ${sep.diagnosa.nama}`}
              />
            </div>
          )}

          {sep.poli && (
            <InfoCard icon={Building2} label="Poli Tujuan" value={sep.poli.tujuan} />
          )}
        </div>

        {/* Rujukan info */}
        {sep.rujukan && (sep.rujukan.noRujukan || sep.rujukan.ppkRujukan) && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Data Rujukan
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon={FileText} label="No. Rujukan" value={sep.rujukan.noRujukan || '-'} mono />
              <InfoCard icon={Building2} label="PPK Perujuk" value={sep.rujukan.ppkRujukan || '-'} />
              <InfoCard icon={Calendar} label="Tgl Rujukan" value={sep.rujukan.tglRujukan || '-'} />
            </div>
          </div>
        )}

        {sep.catatan && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Catatan
            </p>
            <p className="text-sm">{sep.catatan}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== TAB: RUJUKAN ====================

function RujukanTab() {
  const [input, setInput] = useState('')
  const [searchNoKartu, setSearchNoKartu] = useState('')

  const { data: rujukanRes, isFetching, isError, error } = useBpjsRujukan(searchNoKartu)
  const rujukanList = rujukanRes?.data ?? []

  const handleSearch = useCallback(() => {
    if (!input.trim()) {
      toast.error('Masukkan No. Kartu BPJS')
      return
    }
    setSearchNoKartu(input.trim())
  }, [input])

  return (
    <div className="space-y-4">
      {/* Search */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground mb-2">
            Cari riwayat rujukan berdasarkan No. Kartu BPJS
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="No. Kartu BPJS..."
                className="pl-9 font-mono"
                maxLength={13}
              />
            </div>
            <Button onClick={handleSearch} disabled={isFetching}>
              {isFetching
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Search className="h-4 w-4 mr-1" /> Cari</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isFetching && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && !isFetching && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Gagal mengambil data rujukan</p>
                <p className="text-xs mt-0.5 text-red-500">
                  {error instanceof Error ? error.message : 'Periksa nomor kartu'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isFetching && searchNoKartu && rujukanList.length === 0 && !isError && (
        <Card>
          <CardContent className="pt-5 text-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Tidak ada rujukan untuk nomor kartu ini
            </p>
          </CardContent>
        </Card>
      )}

      {!isFetching && rujukanList.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {rujukanList.length} rujukan ditemukan
          </p>
          {rujukanList.map((rj, idx) => (
            <RujukanCard key={rj.noKunjungan || idx} rujukan={rj} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!searchNoKartu && !isFetching && (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Masukkan No. Kartu BPJS untuk melihat riwayat rujukan
          </p>
        </div>
      )}
    </div>
  )
}

function RujukanCard({ rujukan }: { rujukan: BpjsRujukan }) {
  return (
    <Card className="hover:border-teal-300 transition-colors">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">
                {rujukan.noKunjungan}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {rujukan.tglKunjungan}
              </span>
              {rujukan.tglBerlakuRujukan && (
                <span className="text-[10px] text-muted-foreground">
                  berlaku s/d {rujukan.tglBerlakuRujukan}
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <Stethoscope className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm font-medium">
                {rujukan.diagnosa?.kode} — {rujukan.diagnosa?.nama}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {rujukan.provPerujuk?.nama || '-'}
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {rujukan.pelayanan?.nama || '-'}
              </span>
            </div>
            {rujukan.keluhan && (
              <p className="text-xs text-muted-foreground truncate">Keluhan: {rujukan.keluhan}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== TAB: PCARE ====================

function PcareTab() {
  const today = new Date().toISOString().slice(0, 10)
  const [tglDaftar, setTglDaftar] = useState(today)
  const [obatSearch, setObatSearch] = useState('')
  const [riwayatKartu, setRiwayatKartu] = useState('')
  const [riwayatSearch, setRiwayatSearch] = useState('')

  const { data: kunjunganRes, isLoading: kunjunganLoading } = usePcareKunjungan(tglDaftar)
  const kunjunganList = (kunjunganRes?.data as { list?: PcareKunjunganRow[] })?.list ?? []

  const obatQuery = usePcareSearchObat(obatSearch)
  const obatList = (obatQuery.data?.data ?? []) as PcareObatRow[]

  const riwayatQuery = usePcareRiwayatKunjungan(riwayatSearch || undefined)
  const riwayatList = (riwayatQuery.data?.data ?? []) as PcareKunjunganRow[]

  return (
    <div className="space-y-6">
      {/* Kunjungan hari ini */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-5 w-5 text-teal-600" />
              Kunjungan PCare
            </CardTitle>
            <DateInput value={tglDaftar} onChange={(v) => setTglDaftar(v)} className="w-44" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {kunjunganLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : kunjunganList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Pill className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak ada kunjungan PCare pada tanggal ini</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Kunjungan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Peserta</TableHead>
                  <TableHead>Poli</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kunjunganList.map((kj, i) => (
                  <TableRow key={kj.noKunjungan || i}>
                    <TableCell className="font-mono text-xs">{kj.noKunjungan}</TableCell>
                    <TableCell className="text-sm">{kj.tglDaftar}</TableCell>
                    <TableCell className="font-medium">{kj.nmPeserta || kj.noKartu}</TableCell>
                    <TableCell className="text-sm">{kj.nmPoli || kj.kdPoli}</TableCell>
                    <TableCell className="text-sm">{kj.nmDokter || kj.kdDokter}</TableCell>
                    <TableCell>
                      <Badge variant={kj.terpiKirim ? 'default' : 'secondary'} className={kj.terpiKirim ? 'bg-green-600' : ''}>
                        {kj.terpiKirim ? 'Terkirim' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Riwayat Kunjungan Peserta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Riwayat Kunjungan Peserta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={riwayatKartu} onChange={(e) => setRiwayatKartu(e.target.value.replace(/\D/g, ''))} placeholder="No. Kartu BPJS" className="font-mono" maxLength={13} />
              <Button size="sm" onClick={() => setRiwayatSearch(riwayatKartu)} disabled={!riwayatKartu || riwayatKartu.length < 10}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {riwayatQuery.isLoading && <Skeleton className="h-20 w-full" />}
            {riwayatList.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {riwayatList.map((kj, i) => (
                  <div key={i} className="p-2 border rounded text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono">{kj.noKunjungan}</span>
                      <span className="text-muted-foreground">{kj.tglDaftar}</span>
                    </div>
                    <div className="flex gap-3">
                      <span>{kj.nmPoli || kj.kdPoli}</span>
                      {kj.kdDiag1 && <span className="text-muted-foreground">{kj.kdDiag1} — {kj.nmDiag1}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {riwayatSearch && !riwayatQuery.isLoading && riwayatList.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Tidak ada riwayat</p>
            )}
          </CardContent>
        </Card>

        {/* Cari Obat DPHO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cari Obat DPHO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={obatSearch} onChange={(e) => setObatSearch(e.target.value)} placeholder="Nama obat..." />
            </div>
            {obatQuery.isLoading && <Skeleton className="h-20 w-full" />}
            {obatList.length > 0 && (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {obatList.map((ob, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded text-xs hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{ob.nmObat}</p>
                      <p className="text-muted-foreground font-mono">{ob.kdObat}</p>
                    </div>
                    {ob.signa1 && (
                      <Badge variant="outline" className="text-[10px]">
                        {ob.signa1}x{ob.signa2} ({ob.jmlObat})
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== TAB: E-KLAIM / INACBG ====================

function EklaimTab() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [tglMasuk, setTglMasuk] = useState(thirtyAgo)
  const [tglPulang, setTglPulang] = useState(today)
  const [statusFilter, setStatusFilter] = useState('1')
  const [searchNoSep, setSearchNoSep] = useState('')
  const [claimNoSep, setClaimNoSep] = useState('')

  const claimsQuery = useEklaimClaims({ tglMasuk, tglPulang, jenisPelayanan: '2', status: statusFilter })
  const claimList = ((claimsQuery.data?.data as { list?: EklaimClaimListItem[] })?.list ?? []) as EklaimClaimListItem[]

  const claimDetail = useEklaimClaim(claimNoSep || undefined)
  const deleteMut = useEklaimDeleteClaim()



  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Masuk:</Label>
              <DateInput value={tglMasuk} onChange={(v) => setTglMasuk(v)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Pulang:</Label>
              <DateInput value={tglPulang} onChange={(v) => setTglPulang(v)} className="w-40" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
              <option value="1">Layak</option>
              <option value="2">Proses Verifikasi</option>
              <option value="3">Pending</option>
              <option value="0">Semua</option>
            </Select>
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <Input value={searchNoSep} onChange={(e) => setSearchNoSep(e.target.value)} placeholder="Cari No. SEP..." className="font-mono" />
              <Button size="sm" onClick={() => setClaimNoSep(searchNoSep)} disabled={!searchNoSep}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claim Detail (if searched) */}
      {claimNoSep && claimDetail.data?.data && (
        <Card className="border-2 border-teal-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-teal-600" />
                Detail Klaim
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setClaimNoSep('')}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoCard icon={FileText} label="No. SEP" value={claimDetail.data.data.noSep} mono />
              <InfoCard icon={Activity} label="CBG Code" value={`${claimDetail.data.data.cbgCode} — ${claimDetail.data.data.cbgDesc}`} />
              <InfoCard icon={DollarSign} label="Tarif" value={formatRupiah(claimDetail.data.data.tarif)} highlight />
              <InfoCard icon={CheckCircle2} label="Status" value={claimDetail.data.data.statusLabel} />
            </div>
            {claimDetail.data.data.diagnosa && claimDetail.data.data.diagnosa.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {claimDetail.data.data.diagnosa.map((d, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{d.kode} — {d.nama}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Claims List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-teal-600" />
            Daftar Klaim INA-CBG
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {claimsQuery.isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : claimList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak ada klaim pada periode ini</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. SEP</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead>No. RM</TableHead>
                  <TableHead>Tgl Masuk</TableHead>
                  <TableHead>Tgl Pulang</TableHead>
                  <TableHead>CBG Code</TableHead>
                  <TableHead className="text-right">Tarif</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimList.map((cl) => (
                  <TableRow key={cl.noSep} className="group">
                    <TableCell className="font-mono text-xs">{cl.noSep}</TableCell>
                    <TableCell className="font-medium">{cl.namaPasien}</TableCell>
                    <TableCell className="font-mono text-xs">{cl.noRM}</TableCell>
                    <TableCell className="text-sm">{cl.tglMasuk}</TableCell>
                    <TableCell className="text-sm">{cl.tglPulang}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs font-mono">{cl.cbgCode}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatRupiah(cl.tarif)}</TableCell>
                    <TableCell>
                      <Badge variant={cl.status === '1' ? 'default' : 'secondary'} className={cl.status === '1' ? 'bg-green-600' : ''}>
                        {cl.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setClaimNoSep(cl.noSep)}>
                          <Search className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => {
                          if (confirm(`Hapus klaim ${cl.noSep}?`)) deleteMut.mutate(cl.noSep)
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== TAB: APLICARE ====================

function AplicareTab() {
  const [ppkCode, setPpkCode] = useState('')
  const [searchPpk, setSearchPpk] = useState('')

  const { data: bedRes, isLoading } = useAplicareBed(searchPpk || undefined)
  const bedList = (bedRes?.data ?? []) as AplicareBedRow[]

  const totalKapasitas = bedList.reduce((s, b) => s + b.kapasitas, 0)
  const totalTersedia = bedList.reduce((s, b) => s + b.tersedia, 0)
  const bor = totalKapasitas > 0 ? Math.round(((totalKapasitas - totalTersedia) / totalKapasitas) * 100) : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground mb-2">
            Cek ketersediaan tempat tidur via Aplicare BPJS
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={ppkCode} onChange={(e) => setPpkCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearchPpk(ppkCode)} placeholder="Kode PPK RS..." className="pl-9 font-mono" />
            </div>
            <Button onClick={() => setSearchPpk(ppkCode)} disabled={!ppkCode || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1" /> Cek</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchPpk && bedList.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Kapasitas</p>
                <p className="text-3xl font-bold text-blue-600">{totalKapasitas}</p>
                <p className="text-xs text-muted-foreground">tempat tidur</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Tersedia</p>
                <p className="text-3xl font-bold text-green-600">{totalTersedia}</p>
                <p className="text-xs text-muted-foreground">tempat tidur</p>
              </CardContent>
            </Card>
            <Card className={cn('border-l-4', bor >= 85 ? 'border-l-red-500' : bor >= 70 ? 'border-l-yellow-500' : 'border-l-green-500')}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">BOR</p>
                <p className={cn('text-3xl font-bold', bor >= 85 ? 'text-red-600' : bor >= 70 ? 'text-yellow-600' : 'text-green-600')}>{bor}%</p>
                <p className="text-xs text-muted-foreground">Bed Occupancy Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-kelas breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-base">Detail per Kelas</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kelas</TableHead>
                    <TableHead className="text-right">Kapasitas</TableHead>
                    <TableHead className="text-right">Tersedia</TableHead>
                    <TableHead className="text-right">Pria</TableHead>
                    <TableHead className="text-right">Wanita</TableHead>
                    <TableHead className="text-right">Terisi</TableHead>
                    <TableHead>Okupansi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bedList.map((bed) => {
                    const terisi = bed.kapasitas - bed.tersedia
                    const pct = bed.kapasitas > 0 ? Math.round((terisi / bed.kapasitas) * 100) : 0
                    return (
                      <TableRow key={bed.kodekelas}>
                        <TableCell className="font-medium">{bed.namakelas}</TableCell>
                        <TableCell className="text-right">{bed.kapasitas}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{bed.tersedia}</TableCell>
                        <TableCell className="text-right text-sm">{bed.tersediaPria}</TableCell>
                        <TableCell className="text-right text-sm">{bed.tersediaWanita}</TableCell>
                        <TableCell className="text-right text-sm">{terisi}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', pct >= 85 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-mono w-10 text-right">{pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {searchPpk && !isLoading && bedList.length === 0 && (
        <Card><CardContent className="text-center py-8 text-muted-foreground">
          <Bed className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Data tempat tidur tidak ditemukan untuk kode PPK ini</p>
        </CardContent></Card>
      )}

      {!searchPpk && (
        <div className="text-center py-12">
          <Bed className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Masukkan kode PPK RS untuk cek ketersediaan tempat tidur</p>
          <p className="text-xs text-muted-foreground mt-1">Data real-time dari sistem Aplicare BPJS Kesehatan</p>
        </div>
      )}
    </div>
  )
}

// ==================== TAB: MONITORING ====================

function MonitoringTab() {
  const now = new Date()
  const [tahun, setTahun] = useState(String(now.getFullYear()))
  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))

  const { data: kunjRes, isLoading } = useKunjunganBulanan(tahun, bulan)
  const kunj = kunjRes?.data as { totalSEP?: number; totalRujukan?: number; totalRanap?: number; totalRajal?: number } | undefined

  const bulanLabel = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Periode:</Label>
            <Select value={bulan} onChange={(e) => setBulan(e.target.value)} className="w-40">
              {bulanLabel.map((bl, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{bl}</option>)}
            </Select>
            <Select value={tahun} onChange={(e) => setTahun(e.target.value)} className="w-28">
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : kunj ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total SEP</p>
                <p className="text-3xl font-bold text-teal-600">{kunj.totalSEP || 0}</p>
                <p className="text-xs text-muted-foreground">{bulanLabel[Number(bulan) - 1]} {tahun}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total Rujukan</p>
                <p className="text-3xl font-bold text-blue-600">{kunj.totalRujukan || 0}</p>
                <p className="text-xs text-muted-foreground">FKTP → FKRTL</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Rawat Jalan</p>
                <p className="text-3xl font-bold text-green-600">{kunj.totalRajal || 0}</p>
                <p className="text-xs text-muted-foreground">kunjungan</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Rawat Inap</p>
                <p className="text-3xl font-bold text-orange-600">{kunj.totalRanap || 0}</p>
                <p className="text-xs text-muted-foreground">kunjungan</p>
              </CardContent>
            </Card>
          </div>

          {/* Composition breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Komposisi Kunjungan</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Rawat Jalan', value: kunj.totalRajal || 0, total: kunj.totalSEP || 1, color: 'bg-green-500' },
                  { label: 'Rawat Inap', value: kunj.totalRanap || 0, total: kunj.totalSEP || 1, color: 'bg-orange-500' },
                ].map((item) => {
                  const pct = Math.round((item.value / item.total) * 100)
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.label}</span>
                        <span className="font-mono">{item.value} ({pct}%)</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', item.color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Data monitoring belum tersedia</p>
        </CardContent></Card>
      )}
    </div>
  )
}

// ==================== TAB: ANTROL (ANTREAN ONLINE) ====================

type AntrolSection = 'tasks' | 'tambah' | 'jadwal' | 'dashboard'

function AntrolTab() {
  const [section, setSection] = useState<AntrolSection>('tasks')

  return (
    <div className="space-y-4">
      {/* Section picker */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
        {([
          { key: 'tasks', label: 'Antrean Mobile JKN', icon: ClipboardList },
          { key: 'tambah', label: 'Tambah Antrean', icon: Plus },
          { key: 'jadwal', label: 'Jadwal Dokter', icon: Calendar },
          { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
              section === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {section === 'tasks' && <AntrolTaskSection />}
      {section === 'tambah' && <AntrolTambahSection />}
      {section === 'jadwal' && <AntrolJadwalSection />}
      {section === 'dashboard' && <AntrolDashboardSection />}
    </div>
  )
}

// --- Antrol: Task List ---

const ANTROL_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Menunggu', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  1: { label: 'Check-in', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  2: { label: 'Dilayani', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' },
  3: { label: 'Selesai', color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  5: { label: 'Batal', color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
}

const JENIS_KUNJUNGAN: Record<number, string> = {
  1: 'Rujukan FKTP',
  2: 'Rujukan Internal',
  3: 'Kontrol',
  4: 'Rujukan Antar RS',
}

function AntrolTaskSection() {
  const today = new Date().toISOString().slice(0, 10)
  const [tanggal, setTanggal] = useState(today)
  const [kodePoli, setKodePoli] = useState('INT')

  const poliQuery = useAntrolRefPoli()
  const poliList = (poliQuery.data?.data ?? []) as AntrolPoliRef[]

  const taskQuery = useAntrolListTask(kodePoli, tanggal)
  const tasks = (taskQuery.data?.data ?? []) as AntrolTaskItem[]

  const syncMut = useAntrolSyncTasks()
  const updateMut = useAntrolUpdateAntrean()
  const batalMut = useAntrolBatalAntrean()

  const [batalDialog, setBatalDialog] = useState<string | null>(null)
  const [batalKet, setBatalKet] = useState('')

  const handleUpdateStatus = (kodebooking: string, taskid: number) => {
    updateMut.mutate({
      kodebooking,
      taskid,
      waktu: Math.floor(Date.now() / 1000),
    })
  }

  const handleBatal = () => {
    if (!batalDialog || !batalKet.trim()) return
    batalMut.mutate(
      { kodebooking: batalDialog, keterangan: batalKet },
      { onSuccess: () => { setBatalDialog(null); setBatalKet('') } },
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Tanggal:</Label>
              <DateInput value={tanggal} onChange={(v) => setTanggal(v)} className="w-44" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Poli:</Label>
              <select
                value={kodePoli}
                onChange={(e) => setKodePoli(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {poliList.length > 0
                  ? poliList.map((p) => <option key={p.kodepoli} value={p.kodepoli}>{p.namapoli}</option>)
                  : <option value="INT">Penyakit Dalam</option>
                }
              </select>
            </div>
            <Button
              size="sm" variant="outline"
              onClick={() => syncMut.mutate({ kodePoli, tanggal })}
              disabled={syncMut.isPending}
            >
              {syncMut.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Sync dari BPJS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-5 w-5 text-teal-600" />
              Antrean dari Mobile JKN
            </CardTitle>
            <Badge variant="outline">{tasks.length} antrean</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {taskQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Phone className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak ada antrean untuk poli dan tanggal ini</p>
              <p className="text-xs mt-1">Coba sync data dari BPJS terlebih dahulu</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">No.</TableHead>
                  <TableHead>Nama Pasien</TableHead>
                  <TableHead>No. Kartu</TableHead>
                  <TableHead>Poli</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead>Jam</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const statusInfo = ANTROL_STATUS_MAP[task.taskid] || ANTROL_STATUS_MAP[0]
                  return (
                    <TableRow key={task.kodebooking} className="group">
                      <TableCell>
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-sm font-bold">
                          {task.angkaantrean}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{task.namapasien}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{task.nomorantrean}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{task.nomorkartu}</TableCell>
                      <TableCell className="text-sm">{task.namapoli}</TableCell>
                      <TableCell className="text-xs">{task.namadokter}</TableCell>
                      <TableCell className="text-sm font-mono">{task.jampraktek}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {JENIS_KUNJUNGAN[task.jeniskunjungan] || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {task.taskid === 0 && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleUpdateStatus(task.kodebooking, 1)}
                              disabled={updateMut.isPending}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Check-in
                            </Button>
                          )}
                          {task.taskid === 1 && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 px-2 text-xs text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                              onClick={() => handleUpdateStatus(task.kodebooking, 2)}
                              disabled={updateMut.isPending}
                            >
                              <Stethoscope className="h-3 w-3 mr-1" /> Layani
                            </Button>
                          )}
                          {task.taskid === 2 && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 px-2 text-xs text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleUpdateStatus(task.kodebooking, 3)}
                              disabled={updateMut.isPending}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Selesai
                            </Button>
                          )}
                          {task.taskid < 3 && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setBatalDialog(task.kodebooking)}
                              disabled={batalMut.isPending}
                            >
                              <XCircle className="h-3 w-3" />
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

      {/* Batal Dialog */}
      {batalDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Batalkan Antrean
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Kode Booking: <span className="font-mono font-medium">{batalDialog}</span>
              </p>
              <div>
                <Label className="text-xs">Alasan Pembatalan</Label>
                <Input
                  value={batalKet}
                  onChange={(e) => setBatalKet(e.target.value)}
                  placeholder="Masukkan alasan pembatalan..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setBatalDialog(null); setBatalKet('') }}>
                  Kembali
                </Button>
                <Button
                  variant="destructive" size="sm"
                  onClick={handleBatal}
                  disabled={!batalKet.trim() || batalMut.isPending}
                >
                  {batalMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Batalkan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// --- Antrol: Tambah Antrean ---

function AntrolTambahSection() {
  const poliQuery = useAntrolRefPoli()
  const dokterQuery = useAntrolRefDokter()
  const tambahMut = useAntrolTambahAntrean()

  const poliList = (poliQuery.data?.data ?? []) as AntrolPoliRef[]
  const dokterList = (dokterQuery.data?.data ?? []) as AntrolDokterRef[]

  const [form, setForm] = useState({
    nomorkartu: '',
    nik: '',
    nohp: '',
    kodepoli: '',
    kodedokter: '',
    tanggalperiksa: new Date().toISOString().slice(0, 10),
    jampraktek: '08:00-12:00',
    jeniskunjungan: 1,
    nomorreferensi: '',
    siession: 1,
  })

  const selectedPoli = poliList.find((p) => p.kodepoli === form.kodepoli)
  const selectedDokter = dokterList.find((d) => d.kodedokter === form.kodedokter)

  const handleSubmit = () => {
    if (!form.nomorkartu || !form.nik || !form.nohp || !form.kodepoli || !form.kodedokter || !form.nomorreferensi) {
      toast.error('Lengkapi semua field yang wajib diisi')
      return
    }
    tambahMut.mutate({
      nomorkartu: form.nomorkartu,
      nik: form.nik,
      nohp: form.nohp,
      kodepoli: form.kodepoli,
      namapoli: selectedPoli?.namapoli || form.kodepoli,
      paession: form.siession,
      tanggalperiksa: form.tanggalperiksa,
      kodedokter: form.kodedokter,
      namadokter: selectedDokter?.namadokter || form.kodedokter,
      jampraktek: form.jampraktek,
      jeniskunjungan: form.jeniskunjungan,
      nomorreferensi: form.nomorreferensi,
      siession: form.siession,
    })
  }

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-5 w-5 text-teal-600" />
            Tambah Antrean (Push ke BPJS)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success result */}
          {tambahMut.isSuccess && tambahMut.data?.data && (
            <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-300">Antrean Berhasil Dibuat</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Kode Booking</p>
                  <p className="font-mono font-bold text-sm">{tambahMut.data.data.kodebooking}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">No. Antrean</p>
                  <p className="font-mono font-bold text-sm">{tambahMut.data.data.nomorantrean}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">No. Kartu BPJS *</Label>
              <Input
                value={form.nomorkartu}
                onChange={(e) => updateField('nomorkartu', e.target.value.replace(/\D/g, ''))}
                placeholder="0001234567890"
                className="mt-1 font-mono"
                maxLength={13}
              />
            </div>
            <div>
              <Label className="text-xs">NIK *</Label>
              <Input
                value={form.nik}
                onChange={(e) => updateField('nik', e.target.value.replace(/\D/g, ''))}
                placeholder="3201234567890123"
                className="mt-1 font-mono"
                maxLength={16}
              />
            </div>
            <div>
              <Label className="text-xs">No. HP *</Label>
              <Input
                value={form.nohp}
                onChange={(e) => updateField('nohp', e.target.value.replace(/\D/g, ''))}
                placeholder="081234567890"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Poli *</Label>
              <select
                value={form.kodepoli}
                onChange={(e) => updateField('kodepoli', e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">— Pilih Poli —</option>
                {poliList.map((p) => (
                  <option key={p.kodepoli} value={p.kodepoli}>{p.namapoli}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Dokter *</Label>
              <select
                value={form.kodedokter}
                onChange={(e) => updateField('kodedokter', e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="">— Pilih Dokter —</option>
                {dokterList.map((d) => (
                  <option key={d.kodedokter} value={d.kodedokter}>{d.namadokter}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Tanggal Periksa *</Label>
              <DateInput
                value={form.tanggalperiksa}
                onChange={(v) => updateField('tanggalperiksa', v)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Jam Praktek</Label>
              <select
                value={form.jampraktek}
                onChange={(e) => updateField('jampraktek', e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value="08:00-12:00">08:00 - 12:00</option>
                <option value="13:00-17:00">13:00 - 17:00</option>
                <option value="18:00-21:00">18:00 - 21:00</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Sesi</Label>
              <select
                value={form.siession}
                onChange={(e) => updateField('siession', Number(e.target.value))}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value={1}>Pagi</option>
                <option value={2}>Siang</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Jenis Kunjungan *</Label>
              <select
                value={form.jeniskunjungan}
                onChange={(e) => updateField('jeniskunjungan', Number(e.target.value))}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              >
                <option value={1}>1 — Rujukan FKTP</option>
                <option value={2}>2 — Rujukan Internal</option>
                <option value={3}>3 — Kontrol</option>
                <option value={4}>4 — Rujukan Antar RS</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">No. Referensi (Rujukan/Kontrol) *</Label>
              <Input
                value={form.nomorreferensi}
                onChange={(e) => updateField('nomorreferensi', e.target.value)}
                placeholder="Nomor rujukan atau surat kontrol"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit} disabled={tambahMut.isPending}>
              {tambahMut.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                : <Plus className="h-4 w-4 mr-1" />}
              Tambah Antrean
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Antrol: Jadwal Dokter ---

function AntrolJadwalSection() {
  const today = new Date().toISOString().slice(0, 10)
  const [kodePoli, setKodePoli] = useState('INT')
  const [tanggal, setTanggal] = useState(today)

  const poliQuery = useAntrolRefPoli()
  const poliList = (poliQuery.data?.data ?? []) as AntrolPoliRef[]

  const jadwalQuery = useAntrolJadwalDokter(kodePoli, tanggal)
  const jadwalList = (jadwalQuery.data?.data ?? []) as AntrolJadwalDokter[]

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Poli:</Label>
              <select
                value={kodePoli}
                onChange={(e) => setKodePoli(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {poliList.length > 0
                  ? poliList.map((p) => <option key={p.kodepoli} value={p.kodepoli}>{p.namapoli}</option>)
                  : <option value="INT">Penyakit Dalam</option>
                }
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Tanggal:</Label>
              <DateInput value={tanggal} onChange={(v) => setTanggal(v)} className="w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      {jadwalQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : jadwalList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10 text-muted-foreground">
            <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Tidak ada jadwal dokter untuk poli dan tanggal ini</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jadwalList.map((jd, idx) => (
            <Card
              key={`${jd.kodedokter}-${idx}`}
              className={cn(
                'transition-colors',
                jd.libur
                  ? 'border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900'
                  : 'hover:border-teal-300',
              )}
            >
              <CardContent className="pt-4 pb-3 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{jd.namadokter}</p>
                      <p className="text-[11px] text-muted-foreground">{jd.namapoli}</p>
                    </div>
                  </div>
                  {jd.libur ? (
                    <Badge variant="destructive" className="text-[10px]">Libur</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-[10px]">Aktif</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Hari</p>
                    <p className="text-sm font-medium">{jd.hari}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase">Jam Praktek</p>
                    <p className="text-sm font-mono font-medium">{jd.jampraktek}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-teal-50/50 dark:bg-teal-950/20">
                  <span className="text-xs text-muted-foreground">Kapasitas/jam</span>
                  <span className="text-sm font-bold text-teal-700 dark:text-teal-300">{jd.kapasitasperjam} pasien</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Antrol: Dashboard ---

function AntrolDashboardSection() {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const [mode, setMode] = useState<'tanggal' | 'bulan'>('tanggal')
  const [tanggal, setTanggal] = useState(today)
  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(now.getFullYear()))

  const dashboardQuery = useAntrolDashboard({
    mode,
    tanggal: mode === 'tanggal' ? tanggal : undefined,
    bulan: mode === 'bulan' ? bulan : undefined,
    tahun: mode === 'bulan' ? tahun : undefined,
  })

  const dashboard = dashboardQuery.data?.data as AntrolDashboard | undefined

  const bulanLabel = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-muted p-0.5 rounded">
              <button
                onClick={() => setMode('tanggal')}
                className={cn('px-3 py-1 text-xs font-medium rounded', mode === 'tanggal' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
              >
                Per Tanggal
              </button>
              <button
                onClick={() => setMode('bulan')}
                className={cn('px-3 py-1 text-xs font-medium rounded', mode === 'bulan' ? 'bg-background shadow-sm' : 'text-muted-foreground')}
              >
                Per Bulan
              </button>
            </div>
            {mode === 'tanggal' ? (
              <DateInput value={tanggal} onChange={(v) => setTanggal(v)} className="w-44" />
            ) : (
              <div className="flex gap-2">
                <select
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  {bulanLabel.map((bl, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{bl}</option>)}
                </select>
                <select
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {dashboardQuery.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : dashboard ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase">Total Antrean</p>
                <p className="text-2xl font-bold text-teal-600">{dashboard.totalAntrean}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase">Check-in</p>
                <p className="text-2xl font-bold text-blue-600">{dashboard.totalCheckin}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase">Dilayani</p>
                <p className="text-2xl font-bold text-yellow-600">{dashboard.totalDilayani}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase">Selesai</p>
                <p className="text-2xl font-bold text-green-600">{dashboard.totalSelesai}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase">Batal</p>
                <p className="text-2xl font-bold text-red-600">{dashboard.totalBatal}</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-poli breakdown */}
          {dashboard.perPoli && dashboard.perPoli.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Breakdown per Poli</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Poli</TableHead>
                      <TableHead className="text-right">Antrean</TableHead>
                      <TableHead className="text-right">Check-in</TableHead>
                      <TableHead className="text-right">Dilayani</TableHead>
                      <TableHead className="text-right">Selesai</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.perPoli.map((pp) => {
                      const pct = pp.totalAntrean > 0 ? Math.round((pp.totalSelesai / pp.totalAntrean) * 100) : 0
                      return (
                        <TableRow key={pp.kodepoli}>
                          <TableCell className="font-medium">{pp.namapoli}</TableCell>
                          <TableCell className="text-right">{pp.totalAntrean}</TableCell>
                          <TableCell className="text-right text-blue-600">{pp.totalCheckin}</TableCell>
                          <TableCell className="text-right text-yellow-600">{pp.totalDilayani}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{pp.totalSelesai}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-teal-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-mono w-10 text-right">{pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-10 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Data dashboard antrean belum tersedia</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
