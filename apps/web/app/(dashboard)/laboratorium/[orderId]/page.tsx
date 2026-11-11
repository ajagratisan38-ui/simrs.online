'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  FlaskConical,
  User,
  Stethoscope,
  Clock,
  CheckCircle2,
  XCircle,
  Printer,
  AlertTriangle,
  TestTubes,
  Save,
} from 'lucide-react'
import {
  useLabOrder,
  useReceiveSample,
  useStartProcessing,
  useInputLabResults,
  useFinalizeLabOrder,
  useCancelLabOrder,
} from '@/hooks/use-laboratory'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  dikirim: 'Menunggu Sampel',
  sampel_diterima: 'Sampel Diterima',
  diproses: 'Diproses',
  selesai: 'Selesai',
  batal: 'Batal',
}

const FLAG_COLORS: Record<string, string> = {
  normal: 'text-green-600',
  rendah: 'text-teal-600',
  tinggi: 'text-orange-600',
  kritis: 'text-red-600 font-bold',
}

export default function LabOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const { data: order, isLoading, refetch } = useLabOrder(orderId)
  const receiveSample = useReceiveSample()
  const startProcessing = useStartProcessing()
  const inputResults = useInputLabResults()
  const finalizeOrder = useFinalizeLabOrder()
  const cancelOrder = useCancelLabOrder()

  const [results, setResults] = useState<Record<string, {
    hasil: string
    keterangan: string
    flag: string
  }>>({})

  const handleResultChange = useCallback((itemId: string, field: string, value: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        hasil: prev[itemId]?.hasil ?? '',
        keterangan: prev[itemId]?.keterangan ?? '',
        flag: prev[itemId]?.flag ?? '',
        [field]: value,
      },
    }))
  }, [])

  const handleReceiveSample = async () => {
    try {
      await receiveSample.mutateAsync({ orderId })
      toast.success('Sampel berhasil diterima')
      refetch()
    } catch {
      toast.error('Gagal menerima sampel')
    }
  }

  const handleStartProcessing = async () => {
    try {
      await startProcessing.mutateAsync(orderId)
      toast.success('Pemeriksaan dimulai')
      refetch()
    } catch {
      toast.error('Gagal memulai pemeriksaan')
    }
  }

  const handleSaveResults = async () => {
    const resultEntries = Object.entries(results)
      .filter(([_, v]) => v.hasil?.trim())
      .map(([itemId, v]) => ({
        item_id: itemId,
        hasil: v.hasil.trim(),
        keterangan: v.keterangan?.trim() || undefined,
        flag: (v.flag as 'normal' | 'rendah' | 'tinggi' | 'kritis') || undefined,
      }))

    if (resultEntries.length === 0) {
      toast.error('Belum ada hasil yang diinput')
      return
    }

    try {
      await inputResults.mutateAsync({ orderId, results: resultEntries })
      toast.success(`${resultEntries.length} hasil berhasil disimpan`)
      refetch()
    } catch {
      toast.error('Gagal menyimpan hasil')
    }
  }

  const handleFinalize = async () => {
    try {
      await finalizeOrder.mutateAsync(orderId)
      toast.success('Hasil lab berhasil difinalisasi')
      refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Gagal memfinalisasi'
      toast.error(msg)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelOrder.mutateAsync(orderId)
      toast.success('Order lab dibatalkan')
      refetch()
    } catch {
      toast.error('Gagal membatalkan order')
    }
  }

  const handlePrint = () => {
    window.print()
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
        <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Order Lab Tidak Ditemukan</h2>
        <Link href="/laboratorium">
          <Button variant="outline" className="mt-4">Kembali ke Daftar</Button>
        </Link>
      </div>
    )
  }

  const items = order.items || []
  const isEditable = ['sampel_diterima', 'diproses'].includes(order.status)
  const canReceive = order.status === 'dikirim'
  const canProcess = order.status === 'sampel_diterima'
  const canFinalize = order.status === 'diproses'
  const canCancel = !['selesai', 'batal'].includes(order.status)

  // Group items by kategori
  const grouped: Record<string, typeof items> = {}
  for (const item of items) {
    const cat = item.kategori || 'Lainnya'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  return (
    <div className="space-y-6 print:space-y-4 lab-result-print">
      {/* Print-only header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-3 mb-4">
        <h1 className="text-base font-bold uppercase">Hasil Pemeriksaan Laboratorium</h1>
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
          <Link href="/laboratorium">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6" />
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
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {order.status === 'selesai' && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Cetak Hasil
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
                  <AlertDialogTitle>Batalkan Order Lab?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Order lab {order.nomor_order} akan dibatalkan. Tindakan ini tidak bisa
                    dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>
                    Ya, Batalkan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">HASIL PEMERIKSAAN LABORATORIUM</h1>
        <p className="text-sm">{order.nomor_order}</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patient Info */}
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
              <span className="text-muted-foreground">NIK</span>
              <span className="font-mono">{order.nik}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jenis Kelamin</span>
              <span>{order.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tgl Lahir</span>
              <span>
                {new Date(order.tanggal_lahir || '').toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Info Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dokter</span>
              <span>{order.doctor_nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spesialisasi</span>
              <span>{order.doctor_spesialisasi || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Waktu Order</span>
              <span>
                {new Date(order.tanggal_order).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {order.tanggal_sampel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waktu Sampel</span>
                <span>
                  {new Date(order.tanggal_sampel).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {order.tanggal_selesai && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waktu Selesai</span>
                <span>
                  {new Date(order.tanggal_selesai).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {order.petugas_lab_nama && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Petugas Lab</span>
                <span>{order.petugas_lab_nama}</span>
              </div>
            )}
            {order.catatan_klinis && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground block mb-1">Catatan Klinis:</span>
                <p className="text-sm">{order.catatan_klinis}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 print:hidden">
        {canReceive && (
          <Button onClick={handleReceiveSample} disabled={receiveSample.isPending}>
            <TestTubes className="h-4 w-4 mr-2" />
            {receiveSample.isPending ? 'Memproses...' : 'Terima Sampel'}
          </Button>
        )}
        {canProcess && (
          <Button onClick={handleStartProcessing} disabled={startProcessing.isPending}>
            <FlaskConical className="h-4 w-4 mr-2" />
            {startProcessing.isPending ? 'Memproses...' : 'Mulai Pemeriksaan'}
          </Button>
        )}
        {isEditable && (
          <Button onClick={handleSaveResults} disabled={inputResults.isPending} variant="secondary">
            <Save className="h-4 w-4 mr-2" />
            {inputResults.isPending ? 'Menyimpan...' : 'Simpan Hasil'}
          </Button>
        )}
        {canFinalize && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" disabled={finalizeOrder.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalisasi Hasil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finalisasi Hasil Lab?</AlertDialogTitle>
                <AlertDialogDescription>
                  Setelah difinalisasi, hasil tidak bisa diubah lagi dan akan otomatis
                  tampil di rekam medis dokter. Pastikan semua hasil sudah benar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleFinalize}>
                  Ya, Finalisasi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Results Table */}
      {Object.entries(grouped).map(([kategori, categoryItems]) => (
        <Card key={kategori}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{kategori}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Kode</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Spesimen</TableHead>
                    {(isEditable || order.status === 'selesai' || order.status === 'diproses') && (
                      <>
                        <TableHead>Hasil</TableHead>
                        <TableHead>Satuan</TableHead>
                        <TableHead>Nilai Normal</TableHead>
                        <TableHead>Flag</TableHead>
                        {isEditable && <TableHead>Keterangan</TableHead>}
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryItems.map((item) => {
                    const itemId = item.id
                    const existingResult = item.hasil
                    const currentResult = results[itemId]

                    return (
                      <TableRow key={itemId}>
                        <TableCell className="font-mono text-sm">
                          {item.parameter_kode as string}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.parameter_nama as string}
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {(item.specimen as string).replace('_', ' ')}
                        </TableCell>
                        {(isEditable || order.status === 'selesai' || order.status === 'diproses') && (
                          <>
                            <TableCell>
                              {isEditable ? (
                                <Input
                                  className="w-[120px]"
                                  placeholder="Hasil"
                                  defaultValue={existingResult || ''}
                                  onChange={(e) => handleResultChange(itemId, 'hasil', e.target.value)}
                                />
                              ) : (
                                <span className={
                                  item.flag ? FLAG_COLORS[item.flag as string] || '' : ''
                                }>
                                  {existingResult || '-'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.satuan as string || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.nilai_normal as string || '-'}
                            </TableCell>
                            <TableCell>
                              {isEditable ? (
                                <Select
                                  className="w-[100px]"
                                  value={currentResult?.flag || item.flag as string || ''}
                                  onChange={(e) => handleResultChange(itemId, 'flag', e.target.value)}
                                >
                                  <option value="">-</option>
                                  <option value="normal">Normal</option>
                                  <option value="rendah">Rendah</option>
                                  <option value="tinggi">Tinggi</option>
                                  <option value="kritis">Kritis</option>
                                </Select>
                              ) : (
                                item.flag ? (
                                  <Badge variant={
                                    item.flag === 'kritis' ? 'destructive' :
                                    item.flag === 'tinggi' ? 'default' :
                                    item.flag === 'rendah' ? 'secondary' : 'outline'
                                  }>
                                    {(item.flag as string).charAt(0).toUpperCase() + (item.flag as string).slice(1)}
                                  </Badge>
                                ) : '-'
                              )}
                            </TableCell>
                            {isEditable && (
                              <TableCell>
                                <Input
                                  className="w-[120px]"
                                  placeholder="Keterangan"
                                  defaultValue={item.keterangan as string || ''}
                                  onChange={(e) => handleResultChange(itemId, 'keterangan', e.target.value)}
                                />
                              </TableCell>
                            )}
                          </>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

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
            {order.tanggal_sampel && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">
                  {new Date(order.tanggal_sampel).toLocaleString('id-ID')}
                </span>
                <span>Sampel diterima{order.petugas_lab_nama ? ` oleh ${order.petugas_lab_nama}` : ''}</span>
              </div>
            )}
            {order.status === 'diproses' && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Sedang diproses</span>
              </div>
            )}
            {order.tanggal_selesai && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">
                  {new Date(order.tanggal_selesai).toLocaleString('id-ID')}
                </span>
                <span>Hasil difinalisasi</span>
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
