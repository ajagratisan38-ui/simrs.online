'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  Loader2,
  Printer,
  ShoppingCart,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  usePurchaseOrder,
  useUpdatePOStatus,
  useReceivePOItems,
} from '@/hooks/use-purchase-order'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { POItem } from '@/lib/api/purchase-order'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Disetujui',
  ordered: 'Dipesan',
  received: 'Diterima',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const STATUS_STEP_ORDER = ['draft', 'approved', 'ordered', 'received', 'completed']

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDateTime(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PODetailPage() {
  const params = useParams<{ poId: string }>()
  const router = useRouter()
  const poId = params.poId

  const { data: poRes, isLoading } = usePurchaseOrder(poId)
  const po = poRes?.data
  const items = po?.items ?? []

  const statusMut = useUpdatePOStatus()
  const receiveMut = useReceivePOItems()

  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [receiveItems, setReceiveItems] = useState<Record<string, {
    jumlah_diterima: number
    batch_number: string
    tanggal_kadaluarsa: string
  }>>({})

  const openReceiveDialog = () => {
    const initial: typeof receiveItems = {}
    for (const item of items) {
      const remaining = item.jumlah - item.jumlah_diterima
      if (remaining > 0) {
        initial[item.id] = {
          jumlah_diterima: remaining,
          batch_number: item.batch_number || '',
          tanggal_kadaluarsa: item.tanggal_kadaluarsa?.split('T')[0] || '',
        }
      }
    }
    setReceiveItems(initial)
    setShowReceiveDialog(true)
  }

  const handleStatusChange = useCallback(async (newStatus: string) => {
    const confirmMsg: Record<string, string> = {
      approved: 'Setujui PO ini? Setelah disetujui, PO bisa dikirim ke supplier.',
      ordered: 'Tandai PO sudah dipesan ke supplier?',
      completed: 'Tandai PO selesai? Pastikan semua item sudah diterima.',
      cancelled: 'Batalkan PO ini? Tindakan ini tidak bisa dibatalkan.',
    }
    if (confirmMsg[newStatus] && !confirm(confirmMsg[newStatus])) return

    try {
      await statusMut.mutateAsync({ id: poId, status: newStatus as 'approved' })
      toast.success(`Status PO diubah ke ${STATUS_LABELS[newStatus]}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status')
    }
  }, [poId, statusMut])

  const handleReceive = useCallback(async () => {
    const itemsToReceive = Object.entries(receiveItems)
      .filter(([_, v]) => v.jumlah_diterima > 0)
      .map(([item_id, v]) => ({
        item_id,
        jumlah_diterima: v.jumlah_diterima,
        batch_number: v.batch_number || undefined,
        tanggal_kadaluarsa: v.tanggal_kadaluarsa || undefined,
      }))

    if (itemsToReceive.length === 0) {
      toast.error('Tidak ada item yang diterima')
      return
    }

    try {
      await receiveMut.mutateAsync({ id: poId, items: itemsToReceive })
      toast.success('Penerimaan barang berhasil disimpan. Stok otomatis terupdate.')
      setShowReceiveDialog(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan penerimaan')
    }
  }, [poId, receiveItems, receiveMut])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!po) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Purchase Order tidak ditemukan</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/farmasi/purchase-order">Kembali</Link>
        </Button>
      </div>
    )
  }

  const currentStep = STATUS_STEP_ORDER.indexOf(po.status)
  const isCancelled = po.status === 'cancelled'
  const canApprove = po.status === 'draft'
  const canOrder = po.status === 'approved'
  const canReceive = po.status === 'ordered' || po.status === 'received'
  const canComplete = po.status === 'received'
  const canCancel = po.status === 'draft' || po.status === 'approved'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/farmasi/purchase-order">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-teal-600" />
            {po.nomor_po}
          </h1>
          <p className="text-sm text-muted-foreground">
            {po.supplier_nama} · {formatDate(po.tanggal_po)}
          </p>
        </div>
        <Badge variant={
          isCancelled ? 'destructive' :
          po.status === 'completed' || po.status === 'received' ? 'success' : 'default'
        } className="text-sm px-3 py-1">
          {STATUS_LABELS[po.status]}
        </Badge>
      </div>

      {/* Status progress */}
      {!isCancelled && (
        <div className="flex items-center gap-1">
          {STATUS_STEP_ORDER.map((step, idx) => {
            const isDone = idx <= currentStep
            const isCurrent = idx === currentStep
            return (
              <div key={step} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium shrink-0',
                  isDone ? 'bg-teal-600 text-white' : 'bg-muted text-muted-foreground',
                  isCurrent && 'ring-2 ring-teal-400 ring-offset-2',
                )}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={cn(
                  'text-xs hidden sm:block',
                  isDone ? 'text-teal-700 font-medium' : 'text-muted-foreground',
                )}>
                  {STATUS_LABELS[step]}
                </span>
                {idx < STATUS_STEP_ORDER.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-1',
                    idx < currentStep ? 'bg-teal-400' : 'bg-muted',
                  )} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {canApprove && (
          <Button onClick={() => handleStatusChange('approved')} disabled={statusMut.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Setujui
          </Button>
        )}
        {canOrder && (
          <Button onClick={() => handleStatusChange('ordered')} disabled={statusMut.isPending}>
            <Truck className="h-4 w-4 mr-2" />
            Tandai Dipesan
          </Button>
        )}
        {canReceive && (
          <Button onClick={openReceiveDialog}>
            <Package className="h-4 w-4 mr-2" />
            Terima Barang
          </Button>
        )}
        {canComplete && (
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleStatusChange('completed')}
            disabled={statusMut.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Selesai
          </Button>
        )}
        {canCancel && (
          <Button variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={statusMut.isPending}>
            <XCircle className="h-4 w-4 mr-2" />
            Batalkan
          </Button>
        )}
        {statusMut.isPending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{po.supplier_nama}</p>
            <p className="text-sm text-muted-foreground">{po.supplier_kode}</p>
            {po.supplier_telepon && (
              <p className="text-sm text-muted-foreground">{po.supplier_telepon}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Riwayat</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dibuat</span>
              <span>{po.created_by_nama || '-'}</span>
            </div>
            {po.approved_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disetujui</span>
                <span>{po.approved_by_nama} · {formatDateTime(po.approved_at)}</span>
              </div>
            )}
            {po.received_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diterima</span>
                <span>{po.received_by_nama} · {formatDateTime(po.received_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatRupiah(Number(po.grand_total))}</p>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              <div>Subtotal: {formatRupiah(Number(po.subtotal))}</div>
              {Number(po.diskon) > 0 && <div>Diskon: -{formatRupiah(Number(po.diskon))}</div>}
              {Number(po.ppn) > 0 && <div>PPN: +{formatRupiah(Number(po.ppn))}</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Item ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obat</TableHead>
                <TableHead className="text-center">Jumlah</TableHead>
                <TableHead className="text-center">Diterima</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Kadaluarsa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const pct = item.jumlah > 0 ? Math.round((item.jumlah_diterima / item.jumlah) * 100) : 0
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{item.drug_nama}</div>
                      <div className="text-xs text-muted-foreground">{item.satuan}</div>
                    </TableCell>
                    <TableCell className="text-center">{item.jumlah}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={cn(
                          'font-medium',
                          pct === 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : '',
                        )}>
                          {item.jumlah_diterima}
                        </span>
                        {pct === 100 && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatRupiah(Number(item.harga_satuan))}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupiah(Number(item.total))}</TableCell>
                    <TableCell className="text-sm">{item.batch_number || '-'}</TableCell>
                    <TableCell className="text-sm">{item.tanggal_kadaluarsa ? formatDate(item.tanggal_kadaluarsa) : '-'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Catatan */}
      {po.catatan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Catatan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{po.catatan}</p>
          </CardContent>
        </Card>
      )}

      {/* === RECEIVE DIALOG === */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Penerimaan Barang — {po.nomor_po}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {items
              .filter((item) => item.jumlah - item.jumlah_diterima > 0)
              .map((item) => {
                const remaining = item.jumlah - item.jumlah_diterima
                const ri = receiveItems[item.id]
                if (!ri) return null
                return (
                  <Card key={item.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{item.drug_nama}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            (sisa: {remaining} {item.satuan})
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Jumlah Diterima</Label>
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            value={ri.jumlah_diterima}
                            onChange={(e) => setReceiveItems({
                              ...receiveItems,
                              [item.id]: { ...ri, jumlah_diterima: parseInt(e.target.value) || 0 },
                            })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">No. Batch</Label>
                          <Input
                            value={ri.batch_number}
                            onChange={(e) => setReceiveItems({
                              ...receiveItems,
                              [item.id]: { ...ri, batch_number: e.target.value },
                            })}
                            className="h-8"
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Kadaluarsa</Label>
                          <DateInput
                            value={ri.tanggal_kadaluarsa}
                            onChange={(val) => setReceiveItems({
                              ...receiveItems,
                              [item.id]: { ...ri, tanggal_kadaluarsa: val },
                            })}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            {items.every((i) => i.jumlah_diterima >= i.jumlah) && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Semua item sudah diterima lengkap
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>Batal</Button>
            <Button onClick={handleReceive} disabled={receiveMut.isPending}>
              {receiveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan Penerimaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
