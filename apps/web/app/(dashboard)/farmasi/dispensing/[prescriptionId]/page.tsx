'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Pill,
  User,
  Stethoscope,
  Clock,
  AlertTriangle,
  Check,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { usePendingDispensing, useDispense } from '@/hooks/use-pharmacy'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PendingPrescriptionData, PrescriptionItemData } from '@/lib/api/pharmacy'
import { SaveIndicator } from '@/components/ui/save-indicator'
import { useAutoSave } from '@/hooks/use-auto-save'
import { CdssAlertBanner } from '@/components/cdss/cdss-alert-banner'
import { HighAlertBadge } from '@/components/cdss/high-alert-badge'
import { useCheckPrescription, useOverrideAlert } from '@/hooks/use-cdss'
import type { CdssAlert } from '@/lib/api/cdss'

interface DispenseRow {
  prescription_item_id: string
  drug_id: string
  nama_obat: string
  dosis: string
  satuan: string
  frekuensi: string
  durasi_hari: number
  jumlah_diminta: number
  jumlah_diberikan: number
  stok_tersedia: number | null
  catatan: string
  loading: boolean
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DispensingPage({
  params,
}: {
  params: { prescriptionId: string }
}) {
  const { prescriptionId } = params
  const router = useRouter()
  const [rows, setRows] = useState<DispenseRow[]>([])
  const [catatanApoteker, setCatatanApoteker] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  const { data: pendingData, isLoading } = usePendingDispensing()
  const dispense = useDispense()
  const { saveState, markSaving, markSaved, markOffline, markError } = useAutoSave()
  const cdssCheck = useCheckPrescription()
  const overrideAlert = useOverrideAlert()
  const [cdssAlerts, setCdssAlerts] = useState<CdssAlert[]>([])
  const [cdssChecked, setCdssChecked] = useState(false)
  const [criticalOverridden, setCriticalOverridden] = useState(false)

  // Find this prescription from the pending list
  const prescription = (pendingData?.data ?? []).find(
    (rx: PendingPrescriptionData) => rx.id === prescriptionId,
  )

  // Initialize rows when prescription loads
  useEffect(() => {
    if (!prescription?.items || rows.length > 0) return
    setRows(
      prescription.items.map((item: PrescriptionItemData) => ({
        prescription_item_id: item.id,
        drug_id: item.drug_id || '',
        nama_obat: item.nama_obat,
        dosis: item.dosis || '',
        satuan: item.satuan || '',
        frekuensi: item.frekuensi || '',
        durasi_hari: item.durasi_hari || 0,
        jumlah_diminta: item.jumlah,
        jumlah_diberikan: item.jumlah,
        stok_tersedia: null,
        catatan: item.catatan || '',
        loading: false,
      })),
    )
  }, [prescription, rows.length])

  // After rows are loaded, check stock per drug
  useEffect(() => {
    if (rows.length === 0) return

    const checkStock = async () => {
      const updated: DispenseRow[] = [...rows]
      for (const row of updated) {
        if (!row.drug_id) continue
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'}/drugs/${row.drug_id}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Slug': localStorage.getItem('simrs-tenant-slug') || 'rs-demo',
                Authorization: `Bearer ${
                  JSON.parse(localStorage.getItem('simrs-auth') || '{}')?.state
                    ?.accessToken || ''
                }`,
              },
            },
          )
          if (res.ok) {
            const data = await res.json()
            const stok = (data?.data?.total_stok as number) ?? 0
            row.stok_tersedia = stok
            if (stok < row.jumlah_diberikan) {
              row.jumlah_diberikan = stok
            }
          }
        } catch {
          // keep null
        }
      }
      setRows(updated)
    }

    checkStock()
    // Run only once after rows init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length > 0 ? 'loaded' : 'waiting'])

  // CDSS check — run once when rows are loaded
  useEffect(() => {
    if (rows.length === 0 || cdssChecked) return
    const drugIds = rows.map((r) => r.drug_id).filter(Boolean)
    if (drugIds.length === 0) return
    setCdssChecked(true)
    cdssCheck.mutate(
      { drugIds, visitId: prescription?.visit_id, patientId: undefined },
      {
        onSuccess: (res) => {
          setCdssAlerts(res.data || [])
        },
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length > 0 ? 'loaded' : 'waiting'])

  function handleCdssOverride(alert: CdssAlert, reason: string) {
    // If alert has been logged (has id), override it server-side
    if (alert.id) {
      overrideAlert.mutate({ alertId: alert.id, reason })
    }
    // Mark critical alerts as overridden locally so dispensing can proceed
    const remainingCritical = cdssAlerts.filter(
      (a) => a.severity === 'critical' && a !== alert,
    )
    if (remainingCritical.length === 0) {
      setCriticalOverridden(true)
    }
  }

  const hasCriticalCdss = cdssAlerts.some((a) => a.severity === 'critical') && !criticalOverridden

  function updateRow(index: number, field: keyof DispenseRow, value: string | number) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
    )
  }

  async function handleDispense() {
    if (!prescription) return

    const items = rows.map((r) => ({
      prescription_item_id: r.prescription_item_id,
      drug_id: r.drug_id,
      jumlah_diminta: r.jumlah_diminta,
      jumlah_diberikan: r.jumlah_diberikan,
      catatan: r.catatan || undefined,
    }))

    markSaving()
    try {
      await dispense.mutateAsync({
        prescriptionId: prescription.id,
        data: {
          items,
          catatan_apoteker: catatanApoteker || undefined,
        },
      })
      setConfirmOpen(false)
      if (navigator.onLine) {
        markSaved()
      } else {
        markOffline()
      }
      setSuccessOpen(true)
    } catch (err) {
      markError(err instanceof Error ? err.message : 'Gagal menyerahkan obat')
    }
  }

  const hasInsufficient = rows.some(
    (r) =>
      r.stok_tersedia !== null && r.stok_tersedia < r.jumlah_diminta,
  )

  const allZero = rows.every((r) => r.jumlah_diberikan === 0)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="space-y-4">
        <Link
          href="/farmasi"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Farmasi
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Resep tidak ditemukan atau sudah selesai diproses
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/farmasi"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Farmasi
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Pill className="h-6 w-6" />
            Proses Resep
          </h1>
          <p className="text-muted-foreground text-sm">
            {prescription.visit_number} &middot;{' '}
            {formatTime(prescription.created_at)}
          </p>
        </div>
        <SaveIndicator state={saveState} />
        <Badge
          variant={
            prescription.status === 'dikirim' ? 'warning' : 'default'
          }
          className="text-sm px-3 py-1"
        >
          {prescription.status === 'dikirim' ? 'Menunggu' : 'Diproses'}
        </Badge>
      </div>

      {/* Patient & Doctor info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <User className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{prescription.patient_nama}</p>
              <p className="text-xs text-muted-foreground">
                RM: {prescription.no_rekam_medis}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{prescription.doctor_nama}</p>
              <p className="text-xs text-muted-foreground">
                {prescription.room_nama}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor notes */}
      {prescription.catatan_dokter && (
        <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-teal-700 dark:text-teal-300 mb-1">
              Catatan Dokter:
            </p>
            <p className="text-teal-600 dark:text-teal-400 italic">
              {prescription.catatan_dokter}
            </p>
          </CardContent>
        </Card>
      )}

      {/* CDSS Alerts */}
      {cdssAlerts.length > 0 && (
        <CdssAlertBanner
          alerts={cdssAlerts}
          onOverride={handleCdssOverride}
          overridePending={overrideAlert.isPending}
        />
      )}

      {/* Insufficient stock warning */}
      {hasInsufficient && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Beberapa obat stoknya tidak mencukupi. Jumlah diberikan telah
          disesuaikan otomatis.
        </div>
      )}

      {/* Items table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">#</th>
              <th className="text-left p-3 font-medium">Nama Obat</th>
              <th className="text-left p-3 font-medium">Dosis</th>
              <th className="text-left p-3 font-medium">Frekuensi</th>
              <th className="text-right p-3 font-medium">Durasi</th>
              <th className="text-right p-3 font-medium">Diminta</th>
              <th className="text-right p-3 font-medium">Stok</th>
              <th className="text-right p-3 font-medium w-28">Diberikan</th>
              <th className="text-left p-3 font-medium">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => {
              const insufficient =
                row.stok_tersedia !== null &&
                row.stok_tersedia < row.jumlah_diminta
              const noStock =
                row.stok_tersedia !== null && row.stok_tersedia === 0

              return (
                <tr
                  key={row.prescription_item_id}
                  className={cn(
                    noStock && 'bg-red-50 dark:bg-red-950/20',
                    insufficient && !noStock && 'bg-yellow-50 dark:bg-yellow-950/10',
                  )}
                >
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium">{row.nama_obat}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.dosis} {row.satuan}
                  </td>
                  <td className="p-3 text-muted-foreground">{row.frekuensi}</td>
                  <td className="p-3 text-right text-muted-foreground">
                    {row.durasi_hari > 0 ? `${row.durasi_hari} hari` : '-'}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {row.jumlah_diminta}
                  </td>
                  <td className="p-3 text-right">
                    {row.stok_tersedia === null ? (
                      <span className="text-muted-foreground">...</span>
                    ) : noStock ? (
                      <span className="text-red-600 font-medium">0</span>
                    ) : (
                      <span
                        className={cn(
                          'font-medium',
                          insufficient ? 'text-yellow-600' : 'text-green-600',
                        )}
                      >
                        {row.stok_tersedia}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      min={0}
                      max={
                        row.stok_tersedia !== null
                          ? Math.min(row.jumlah_diminta, row.stok_tersedia)
                          : row.jumlah_diminta
                      }
                      value={row.jumlah_diberikan}
                      onChange={(e) =>
                        updateRow(i, 'jumlah_diberikan', Number(e.target.value))
                      }
                      className={cn(
                        'w-20 h-8 text-right text-sm',
                        row.jumlah_diberikan < row.jumlah_diminta &&
                          'border-yellow-400',
                        row.jumlah_diberikan === 0 && 'border-red-400',
                      )}
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      placeholder="Catatan..."
                      value={row.catatan}
                      onChange={(e) =>
                        updateRow(i, 'catatan', e.target.value)
                      }
                      className="h-8 text-sm min-w-[120px]"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Catatan apoteker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Catatan Apoteker</label>
        <Textarea
          placeholder="Catatan tambahan untuk dispensing..."
          value={catatanApoteker}
          onChange={(e) => setCatatanApoteker(e.target.value)}
          rows={3}
        />
      </div>

      {/* Summary & Actions */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{rows.length}</span>{' '}
          item &middot;{' '}
          <span className="font-medium text-foreground">
            {rows.reduce((s, r) => s + r.jumlah_diberikan, 0)}
          </span>{' '}
          total diberikan dari{' '}
          <span className="font-medium text-foreground">
            {rows.reduce((s, r) => s + r.jumlah_diminta, 0)}
          </span>{' '}
          diminta
        </div>
        <div className="flex items-center gap-2">
          <Link href="/farmasi">
            <Button variant="outline">Batal</Button>
          </Link>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={dispense.isPending || allZero || hasCriticalCdss}
            title={hasCriticalCdss ? 'Override semua alert kritis terlebih dahulu' : undefined}
          >
            <Check className="h-4 w-4 mr-1" />
            Selesai Dispensing
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogHeader>
          <DialogTitle>Konfirmasi Dispensing</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3 text-sm">
            <p>
              Pasien: <strong>{prescription.patient_nama}</strong>
            </p>
            <p>
              Total item: <strong>{rows.length}</strong> obat
            </p>
            <p>
              Total diberikan:{' '}
              <strong>
                {rows.reduce((s, r) => s + r.jumlah_diberikan, 0)}
              </strong>{' '}
              dari{' '}
              <strong>
                {rows.reduce((s, r) => s + r.jumlah_diminta, 0)}
              </strong>{' '}
              diminta
            </p>

            {rows.some((r) => r.jumlah_diberikan < r.jumlah_diminta) && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Ada obat dengan jumlah diberikan kurang dari diminta. Status
                dispensing akan menjadi &quot;Sebagian&quot;.
              </div>
            )}

            <p className="text-muted-foreground mt-2">
              Stok obat akan otomatis berkurang. Lanjutkan?
            </p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleDispense}
            disabled={dispense.isPending}
          >
            {dispense.isPending ? 'Memproses...' : 'Ya, Proses'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={successOpen} onOpenChange={(open) => {
        setSuccessOpen(open)
        if (!open) router.push('/farmasi')
      }}>
        <DialogHeader>
          <DialogTitle>Dispensing Berhasil</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              Resep untuk <strong>{prescription.patient_nama}</strong> telah
              selesai diproses. Stok obat telah diperbarui.
            </p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Cetak Etiket
          </Button>
          <Button onClick={() => router.push('/farmasi')}>
            Kembali ke Farmasi
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
