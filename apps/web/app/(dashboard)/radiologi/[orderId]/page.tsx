'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  ScanLine,
  User,
  Stethoscope,
  Clock,
  CheckCircle2,
  XCircle,
  Printer,
  AlertTriangle,
  Play,
  FileText,
} from 'lucide-react'
import {
  useRadiologyOrder,
  useStartRadiologyProcessing,
  useInputRadiologyResults,
  useCancelRadiologyOrder,
} from '@/hooks/use-radiology'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  dikirim: 'Menunggu',
  dijadwalkan: 'Dijadwalkan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  batal: 'Batal',
}

const MODALITY_LABELS: Record<string, string> = {
  xray: 'X-Ray', usg: 'USG', ct_scan: 'CT Scan', mri: 'MRI',
  mammografi: 'Mammografi', panoramik: 'Panoramik', fluoroskopi: 'Fluoroskopi',
}

export default function RadiologyOrderDetailPage() {
  const params = useParams()
  const orderId = params.orderId as string

  const { data: order, isLoading, refetch } = useRadiologyOrder(orderId)
  const startProcessing = useStartRadiologyProcessing()
  const inputResults = useInputRadiologyResults()
  const cancelOrder = useCancelRadiologyOrder()

  const [hasilBacaan, setHasilBacaan] = useState('')
  const [kesan, setKesan] = useState('')

  const handleStartProcessing = async () => {
    try {
      await startProcessing.mutateAsync(orderId)
      toast.success('Pemeriksaan dimulai')
      refetch()
    } catch {
      toast.error('Gagal memulai pemeriksaan')
    }
  }

  const handleSubmitResults = async () => {
    if (!hasilBacaan.trim() || !kesan.trim()) {
      toast.error('Hasil bacaan dan kesan wajib diisi')
      return
    }
    try {
      await inputResults.mutateAsync({
        orderId,
        data: { hasil_bacaan: hasilBacaan.trim(), kesan: kesan.trim() },
      })
      toast.success('Hasil radiologi berhasil disimpan')
      refetch()
    } catch {
      toast.error('Gagal menyimpan hasil')
    }
  }

  const handleCancel = async () => {
    try {
      await cancelOrder.mutateAsync(orderId)
      toast.success('Order radiologi dibatalkan')
      refetch()
    } catch {
      toast.error('Gagal membatalkan order')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <ScanLine className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Order Radiologi Tidak Ditemukan</h2>
        <Link href="/radiologi">
          <Button variant="outline" className="mt-4">Kembali ke Daftar</Button>
        </Link>
      </div>
    )
  }

  const canProcess = ['dikirim', 'dijadwalkan'].includes(order.status)
  const canInputResults = order.status === 'diproses'
  const canCancel = !['selesai', 'batal'].includes(order.status)

  return (
    <div className="space-y-6 print:space-y-4 radiology-result-print">
      {/* Print-only header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-3 mb-4">
        <h1 className="text-base font-bold uppercase">Hasil Pemeriksaan Radiologi</h1>
        <p className="text-sm mt-1">
          No. Order: <strong>{order.nomor_order}</strong>
          {' | '}Tgl: {new Date(order.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
        <p className="text-sm">
          Pasien: <strong>{order.patient_nama}</strong>
          {' | '}RM: {order.no_rekam_medis}
          {' | '}Dokter: {order.doctor_nama}
        </p>
      </div>

      {/* Header (screen only) */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/radiologi">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScanLine className="h-6 w-6" />
              {order.nomor_order}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={
                order.status === 'selesai' ? 'default' :
                order.status === 'batal' ? 'destructive' : 'secondary'
              }>
                {STATUS_LABELS[order.status]}
              </Badge>
              {order.prioritas === 'cito' && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  CITO
                </Badge>
              )}
              <Badge variant="outline">
                {MODALITY_LABELS[order.modalitas] || order.modalitas}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {order.status === 'selesai' && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Cetak
            </Button>
          )}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <XCircle className="h-4 w-4 mr-2" />
                  Batalkan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Batalkan Order Radiologi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Order {order.nomor_order} akan dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Ya, Batalkan</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">HASIL PEMERIKSAAN RADIOLOGI</h1>
        <p className="text-sm">{order.nomor_order}</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Data Pasien
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama</span>
              <span className="font-medium">{order.patient_nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">No. RM</span>
              <span className="font-mono">{order.no_rekam_medis}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jenis Kelamin</span>
              <span>{order.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tgl Lahir</span>
              <span>
                {new Date(order.tanggal_lahir || '').toLocaleDateString('id-ID', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Info Pemeriksaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pemeriksaan</span>
              <span className="font-medium">{order.examination_nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kode</span>
              <span className="font-mono">{order.examination_kode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dokter Pengirim</span>
              <span>{order.doctor_nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Waktu Order</span>
              <span>
                {new Date(order.tanggal_order).toLocaleString('id-ID', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            {order.radiografer_nama && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Radiografer</span>
                <span>{order.radiografer_nama}</span>
              </div>
            )}
            {order.radiolog_nama && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Radiolog</span>
                <span>{order.radiolog_nama}</span>
              </div>
            )}
            {order.tarif > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarif</span>
                <span>Rp {Math.round(Number(order.tarif)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clinical notes */}
      {(order.catatan_klinis || order.diagnosa_klinis) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Catatan Klinis</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {order.catatan_klinis && (
              <div>
                <span className="text-muted-foreground">Catatan: </span>
                <span>{order.catatan_klinis}</span>
              </div>
            )}
            {order.diagnosa_klinis && (
              <div>
                <span className="text-muted-foreground">Diagnosa Klinis: </span>
                <span>{order.diagnosa_klinis}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Persiapan */}
      {order.examination_detail?.persiapan && (
        <Card className="border-amber-200 bg-amber-50 print:hidden">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Persiapan Pasien</p>
                <p className="text-sm text-amber-700 mt-1">{order.examination_detail.persiapan}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 print:hidden">
        {canProcess && (
          <Button onClick={handleStartProcessing} disabled={startProcessing.isPending}>
            <Play className="h-4 w-4 mr-2" />
            {startProcessing.isPending ? 'Memproses...' : 'Mulai Pemeriksaan'}
          </Button>
        )}
      </div>

      {/* Input Results Form */}
      {canInputResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Input Hasil Bacaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hasil">Hasil Bacaan *</Label>
              <Textarea
                id="hasil"
                rows={6}
                placeholder="Deskripsi hasil pemeriksaan radiologi..."
                value={hasilBacaan}
                onChange={(e) => setHasilBacaan(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kesan">Kesan *</Label>
              <Textarea
                id="kesan"
                rows={3}
                placeholder="Kesan / kesimpulan..."
                value={kesan}
                onChange={(e) => setKesan(e.target.value)}
              />
            </div>
            <Button onClick={handleSubmitResults} disabled={inputResults.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {inputResults.isPending ? 'Menyimpan...' : 'Simpan & Finalisasi'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* View Results (if completed) */}
      {order.status === 'selesai' && (order.hasil_bacaan || order.kesan) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Hasil Pemeriksaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Hasil Bacaan</p>
              <p className="text-sm whitespace-pre-wrap">{order.hasil_bacaan}</p>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-1">Kesan</p>
              <p className="text-sm font-medium whitespace-pre-wrap">{order.kesan}</p>
            </div>
            {order.radiolog_nama && (
              <div className="border-t pt-4 text-sm text-muted-foreground">
                Dibaca oleh: {order.radiolog_nama} |{' '}
                {order.tanggal_selesai &&
                  new Date(order.tanggal_selesai).toLocaleString('id-ID')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Riwayat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-teal-500" />
              <span className="text-muted-foreground">
                {new Date(order.created_at).toLocaleString('id-ID')}
              </span>
              <span>Order dibuat oleh dr. {order.doctor_nama}</span>
            </div>
            {order.tanggal_jadwal && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">
                  {new Date(order.tanggal_jadwal).toLocaleString('id-ID')}
                </span>
                <span>Dijadwalkan</span>
              </div>
            )}
            {order.status === 'diproses' && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Sedang diproses{order.radiografer_nama ? ` oleh ${order.radiografer_nama}` : ''}</span>
              </div>
            )}
            {order.tanggal_selesai && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">
                  {new Date(order.tanggal_selesai).toLocaleString('id-ID')}
                </span>
                <span>Hasil difinalisasi{order.radiolog_nama ? ` oleh ${order.radiolog_nama}` : ''}</span>
              </div>
            )}
            {order.status === 'batal' && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>Order dibatalkan</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
