'use client'

import { useState } from 'react'
import {
  useVisitStats,
  useTopDiagnoses,
  useRevenueReport,
  usePharmacyReport,
  useBedOccupancy,
} from '@/hooks/use-dashboard'
import {
  downloadExport,
  type ExportReportType,
  type ExportFormat,
  type VisitStatsData,
  type DiagnosisRank,
  type RevenueData,
  type PharmacyReportData,
  type BedOccupancyData,
} from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Filter,
  Loader2,
  BarChart3,
  Users,
  Stethoscope,
  Pill,
  CreditCard,
  BedDouble,
  ChevronDown,
} from 'lucide-react'
import { VisitTrendChart } from '@/components/dashboard/visit-trend-chart'
import { RevenueBarChart } from '@/components/dashboard/revenue-bar-chart'
import { TopDiagnosesTable } from '@/components/dashboard/top-diagnoses-table'
import { BedOccupancyCard } from '@/components/dashboard/bed-occupancy-card'
import { toast } from 'sonner'

type ReportType = 'visits' | 'revenue' | 'diagnoses' | 'pharmacy' | 'beds' | 'patients' | 'billing'
type GroupBy = 'day' | 'week' | 'month'

const REPORT_OPTIONS: {
  value: ReportType
  label: string
  description: string
  icon: typeof BarChart3
  exportable: boolean
  exportType?: ExportReportType
  needsDate: boolean
}[] = [
  {
    value: 'visits',
    label: 'Kunjungan',
    description: 'Statistik kunjungan per tanggal, poli, dokter, penjamin',
    icon: BarChart3,
    exportable: true,
    exportType: 'visits',
    needsDate: true,
  },
  {
    value: 'revenue',
    label: 'Pendapatan',
    description: 'Pendapatan per tanggal, kategori, dan penjamin',
    icon: CreditCard,
    exportable: true,
    exportType: 'revenue',
    needsDate: true,
  },
  {
    value: 'diagnoses',
    label: 'Diagnosa',
    description: 'Ranking diagnosa ICD-10 terbanyak',
    icon: Stethoscope,
    exportable: true,
    exportType: 'diagnoses',
    needsDate: true,
  },
  {
    value: 'pharmacy',
    label: 'Farmasi',
    description: 'Obat terlaris, kadaluarsa, stok rendah, nilai stok',
    icon: Pill,
    exportable: true,
    exportType: 'pharmacy',
    needsDate: false,
  },
  {
    value: 'billing',
    label: 'Billing',
    description: 'Rincian tagihan dan pembayaran per periode',
    icon: CreditCard,
    exportable: true,
    exportType: 'billing',
    needsDate: true,
  },
  {
    value: 'patients',
    label: 'Daftar Pasien',
    description: 'Ekspor seluruh data pasien aktif',
    icon: Users,
    exportable: true,
    exportType: 'patients',
    needsDate: false,
  },
  {
    value: 'beds',
    label: 'Okupansi Kamar',
    description: 'BOR, LOS, okupansi per ruangan rawat inap',
    icon: BedDouble,
    exportable: false,
    needsDate: false,
  },
]

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'day', label: 'Harian' },
  { value: 'week', label: 'Mingguan' },
  { value: 'month', label: 'Bulanan' },
]

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function LaporanPage() {
  const [reportType, setReportType] = useState<ReportType>('visits')
  const [groupBy, setGroupBy] = useState<GroupBy>('day')
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(todayStr())
  const [downloading, setDownloading] = useState<ExportFormat | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)

  const selected = REPORT_OPTIONS.find((o) => o.value === reportType)!
  const showGroupBy = reportType === 'visits' || reportType === 'revenue'
  const showDateFilter = selected.needsDate

  const { data: visitRes, isLoading: visitLoading } = useVisitStats(from, to, groupBy)
  const { data: diagRes, isLoading: diagLoading } = useTopDiagnoses(from, to, 20)
  const { data: revRes, isLoading: revLoading } = useRevenueReport(from, to, groupBy)
  const { data: pharmRes, isLoading: pharmLoading } = usePharmacyReport()
  const { data: bedsRes, isLoading: bedsLoading } = useBedOccupancy()

  async function handleExport(format: ExportFormat) {
    if (!selected.exportType) return
    setDownloading(format)
    try {
      await downloadExport(selected.exportType, from, to, format)
      toast.success(`${selected.label} berhasil diunduh (${format.toUpperCase()})`)
    } catch (err) {
      toast.error(`Gagal mengunduh: ${(err as Error).message}`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan & Export</h1>
          <p className="text-sm text-muted-foreground">
            Pilih jenis laporan, filter periode, dan ekspor ke Excel/PDF/CSV
          </p>
        </div>
        {selected.exportable && (
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleExport('xlsx')}
              disabled={!!downloading}
            >
              {downloading === 'xlsx' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={!!downloading}
            >
              {downloading === 'pdf' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={!!downloading}
            >
              {downloading === 'csv' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="px-2"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Report Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {REPORT_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const isActive = reportType === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setReportType(opt.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all text-center ${
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                {opt.label}
              </span>
              {opt.exportable && (
                <div className="flex gap-0.5">
                  <Badge variant="outline" className="text-[8px] px-1 py-0">xlsx</Badge>
                  <Badge variant="outline" className="text-[8px] px-1 py-0">pdf</Badge>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter — {selected.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {showDateFilter && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dari Tanggal</Label>
                  <DateInput value={from} onChange={(val) => setFrom(val)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sampai Tanggal</Label>
                  <DateInput value={to} onChange={(val) => setTo(val)} className="h-9" />
                </div>
              </>
            )}
            {showGroupBy && (
              <div className="space-y-1.5">
                <Label className="text-xs">Kelompokkan</Label>
                <div className="flex gap-1">
                  {GROUP_OPTIONS.map((g) => (
                    <Button
                      key={g.value}
                      variant={groupBy === g.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-9 text-xs"
                      onClick={() => setGroupBy(g.value)}
                    >
                      {g.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {!showDateFilter && !showGroupBy && (
              <p className="text-sm text-muted-foreground">
                {selected.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <ReportContent
        type={reportType}
        visitData={visitRes?.data}
        diagData={diagRes?.data ?? []}
        revData={revRes?.data}
        pharmData={pharmRes?.data}
        bedsData={bedsRes?.data}
        loading={{
          visits: visitLoading,
          diagnoses: diagLoading,
          revenue: revLoading,
          pharmacy: pharmLoading,
          beds: bedsLoading,
          patients: false,
          billing: false,
        }}
        from={from}
        to={to}
        onExport={handleExport}
        downloading={downloading}
      />

      {/* Export Format Dialog */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        reportLabel={selected.label}
        from={from}
        to={to}
        onExport={handleExport}
        downloading={downloading}
      />
    </div>
  )
}

// ==========================================
// EXPORT DIALOG
// ==========================================

function ExportDialog({
  open,
  onClose,
  reportLabel,
  from,
  to,
  onExport,
  downloading,
}: {
  open: boolean
  onClose: () => void
  reportLabel: string
  from: string
  to: string
  onExport: (format: ExportFormat) => void
  downloading: ExportFormat | null
}) {
  const formats: {
    format: ExportFormat
    label: string
    description: string
    icon: typeof FileSpreadsheet
  }[] = [
    {
      format: 'xlsx',
      label: 'Microsoft Excel (.xlsx)',
      description: 'Multi-sheet workbook dengan formatting, header berwarna, summary row, auto-fit column. Cocok untuk analisa lebih lanjut.',
      icon: FileSpreadsheet,
    },
    {
      format: 'pdf',
      label: 'PDF Document (.pdf)',
      description: 'Laporan A4 siap cetak dengan header RS, tabel data, summary box, page numbering. Cocok untuk laporan resmi.',
      icon: FileText,
    },
    {
      format: 'csv',
      label: 'CSV (.csv)',
      description: 'Comma-separated values, kompatibel dengan semua spreadsheet. Hanya sheet pertama yang diekspor.',
      icon: FileDown,
    },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {reportLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Periode: {from} s/d {to}
          </p>
          <div className="space-y-3 pt-2">
            {formats.map((f) => {
              const Icon = f.icon
              const isDownloading = downloading === f.format
              return (
                <button
                  key={f.format}
                  onClick={() => { onExport(f.format); onClose() }}
                  disabled={!!downloading}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                >
                  <div className="p-2 rounded-md bg-muted shrink-0">
                    {isDownloading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Icon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{f.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==========================================
// REPORT CONTENT RENDERER
// ==========================================

interface ReportContentProps {
  type: ReportType
  visitData: VisitStatsData | undefined
  diagData: DiagnosisRank[]
  revData: RevenueData | undefined
  pharmData: PharmacyReportData | undefined
  bedsData: BedOccupancyData | undefined
  loading: Record<string, boolean>
  from: string
  to: string
  onExport: (format: ExportFormat) => void
  downloading: ExportFormat | null
}

function ReportContent({
  type,
  visitData,
  diagData,
  revData,
  pharmData,
  bedsData,
  loading,
  onExport,
  downloading,
}: ReportContentProps) {
  switch (type) {
    case 'visits':
      return (
        <div className="space-y-4">
          <VisitTrendChart data={visitData?.byDate ?? []} loading={loading.visits} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DataTableCard
              title="Kunjungan Per Tanggal"
              headers={['Tanggal', 'Jumlah']}
              rows={(visitData?.byDate ?? []).map((d) => [
                new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                }),
                d.count.toLocaleString('id-ID'),
              ])}
              loading={loading.visits}
            />
            <DataTableCard
              title="Kunjungan Per Poli"
              headers={['Poli', 'Jumlah']}
              rows={(visitData?.byRoom ?? []).map((d) => [d.room, d.count.toLocaleString('id-ID')])}
              loading={loading.visits}
            />
            <DataTableCard
              title="Kunjungan Per Dokter"
              headers={['Dokter', 'Jumlah']}
              rows={(visitData?.byDoctor ?? []).map((d) => [d.doctor, d.count.toLocaleString('id-ID')])}
              loading={loading.visits}
            />
            <DataTableCard
              title="Kunjungan Per Penjamin"
              headers={['Penjamin', 'Jumlah']}
              rows={(visitData?.byPenjamin ?? []).map((d) => [d.penjamin, d.count.toLocaleString('id-ID')])}
              loading={loading.visits}
            />
          </div>
        </div>
      )

    case 'revenue':
      return (
        <div className="space-y-4">
          <RevenueBarChart data={revData?.byDate ?? []} loading={loading.revenue} title="Laporan Pendapatan" />
          {revData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rp {Math.round(revData.total).toLocaleString('id-ID')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Kategori</p>
                  <p className="text-2xl font-bold">{revData.byCategory?.length ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Rata-rata/Hari</p>
                  <p className="text-2xl font-bold">
                    Rp {revData.byDate.length > 0
                      ? Math.round(revData.total / revData.byDate.length).toLocaleString('id-ID')
                      : '0'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DataTableCard
              title="Pendapatan Per Tanggal"
              headers={['Tanggal', 'Jumlah']}
              rows={(revData?.byDate ?? []).map((d) => [
                new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                }),
                `Rp ${Math.round(d.amount).toLocaleString('id-ID')}`,
              ])}
              loading={loading.revenue}
            />
            <DataTableCard
              title="Pendapatan Per Kategori"
              headers={['Kategori', 'Jumlah']}
              rows={(revData?.byCategory ?? []).map((d) => [
                d.category,
                `Rp ${Math.round(d.amount).toLocaleString('id-ID')}`,
              ])}
              loading={loading.revenue}
            />
          </div>
        </div>
      )

    case 'diagnoses':
      return <TopDiagnosesTable data={diagData} loading={loading.diagnoses} />

    case 'pharmacy':
      return <PharmacyReportView data={pharmData} loading={loading.pharmacy ?? false} />

    case 'beds':
      return (
        <BedOccupancyCard
          rooms={bedsData?.rooms ?? []}
          overallBor={bedsData?.overallBor ?? 0}
          averageLos={bedsData?.averageLos ?? 0}
          loading={loading.beds ?? false}
        />
      )

    case 'patients':
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Export Daftar Pasien</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Seluruh data pasien aktif akan diekspor termasuk No. RM, NIK, Nama,
              Tanggal Lahir, Alamat, dan informasi kontak. Maksimal 5.000 baris per ekspor.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => onExport('xlsx')} disabled={!!downloading}>
                {downloading === 'xlsx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                Download Excel
              </Button>
              <Button variant="outline" onClick={() => onExport('pdf')} disabled={!!downloading}>
                {downloading === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Download PDF
              </Button>
              <Button variant="ghost" onClick={() => onExport('csv')} disabled={!!downloading}>
                {downloading === 'csv' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )

    case 'billing':
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Export Laporan Billing</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Rincian tagihan dan pembayaran dalam periode yang dipilih.
              File Excel berisi 2 sheet: Tagihan (bills) dan Pembayaran (payments)
              dengan total, diskon, dan status.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => onExport('xlsx')} disabled={!!downloading}>
                {downloading === 'xlsx' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                Download Excel
              </Button>
              <Button variant="outline" onClick={() => onExport('pdf')} disabled={!!downloading}>
                {downloading === 'pdf' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Download PDF
              </Button>
              <Button variant="ghost" onClick={() => onExport('csv')} disabled={!!downloading}>
                {downloading === 'csv' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )

    default:
      return null
  }
}

// ==========================================
// DATA TABLE CARD (reusable)
// ==========================================

function DataTableCard({
  title,
  headers,
  rows,
  loading,
}: {
  title: string
  headers: string[]
  rows: string[][]
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Tidak ada data
          </p>
        ) : (
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  {headers.map((h) => (
                    <th key={h} className="text-left py-2 px-2 font-medium text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b hover:bg-muted/50">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`py-1.5 px-2 text-sm ${
                          ci === row.length - 1 ? 'text-right font-medium tabular-nums' : ''
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==========================================
// PHARMACY REPORT VIEW
// ==========================================

function PharmacyReportView({
  data,
  loading,
}: {
  data: PharmacyReportData | undefined
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Obat Terlaris (30 Hari)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topDrugs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada data</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {data.topDrugs.map((d, idx) => (
                <div key={d.drug} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                  <span className="flex-1 min-w-0 truncate">{d.drug}</span>
                  <span className="font-bold tabular-nums shrink-0">{d.qty.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Obat Mendekati Kadaluarsa
            {data.expiringSoon.length > 0 && <Badge variant="destructive" className="ml-2 text-[10px]">{data.expiringSoon.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.expiringSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ada obat mendekati kadaluarsa</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {data.expiringSoon.map((d) => (
                <div key={`${d.drug}-${d.batch}`} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.drug}</p>
                    <p className="text-xs text-muted-foreground">Batch: {d.batch} · Stok: {d.stock}</p>
                  </div>
                  <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">
                    {new Date(d.expiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Total Nilai Stok</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">Rp {Math.round(data.totalStockValue).toLocaleString('id-ID')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Stok Rendah
            {data.lowStock.length > 0 && <Badge variant="warning" className="ml-2 text-[10px]">{data.lowStock.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Semua stok aman</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {data.lowStock.map((d) => (
                <div key={d.drug} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm">
                  <span className="flex-1 min-w-0 truncate">{d.drug}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-bold tabular-nums text-red-500">{d.stock}</span>
                    <span className="text-xs text-muted-foreground">/ min {d.minimum}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
