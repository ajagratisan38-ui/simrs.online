'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Wallet,
  User,
  Stethoscope,
  FileText,
  Printer,
  Lock,
  Check,
  AlertTriangle,
  Receipt as ReceiptIcon,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { PaymentModal } from '@/components/forms/payment-modal'
import { Receipt } from '@/components/print/receipt'
import {
  useBill,
  useGenerateBill,
  useApplyDiscount,
  useFinalizeBill,
  useProcessPayment,
} from '@/hooks/use-billing'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { BillData, PaymentData } from '@/lib/api/billing'
import { SaveIndicator } from '@/components/ui/save-indicator'
import { useAutoSave } from '@/hooks/use-auto-save'

const KATEGORI_LABELS: Record<string, string> = {
  konsultasi: 'Konsultasi',
  tindakan: 'Tindakan',
  obat: 'Obat & Farmasi',
  kamar: 'Kamar',
  lab: 'Laboratorium',
  radiologi: 'Radiologi',
  admin: 'Administrasi',
}

const KATEGORI_ORDER = [
  'konsultasi',
  'tindakan',
  'obat',
  'kamar',
  'lab',
  'radiologi',
  'admin',
]

const STATUS_BADGE: Record<
  string,
  { variant: 'warning' | 'default' | 'success' | 'destructive'; label: string }
> = {
  draft: { variant: 'warning', label: 'Draft' },
  final: { variant: 'default', label: 'Final' },
  dibayar: { variant: 'success', label: 'Dibayar' },
  batal: { variant: 'destructive', label: 'Batal' },
}


function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BillingDetailPage({
  params,
}: {
  params: { visitId: string }
}) {
  const { visitId } = params
  const router = useRouter()
  const receiptRef = useRef<HTMLDivElement>(null)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [lastPayment, setLastPayment] = useState<PaymentData | null>(null)
  const [lastKembalian, setLastKembalian] = useState(0)

  const [discountAmount, setDiscountAmount] = useState('')
  const [discountReason, setDiscountReason] = useState('')

  const { data: billData, isLoading, error } = useBill(visitId)
  const generateBill = useGenerateBill()
  const applyDiscountMut = useApplyDiscount()
  const finalizeBillMut = useFinalizeBill()
  const processPayment = useProcessPayment()
  const { saveState, markSaving, markSaved, markOffline, markError } = useAutoSave()

  const bill = billData?.data as BillData | undefined

  // Group items by category
  const groupedItems = bill
    ? KATEGORI_ORDER.reduce(
        (acc, cat) => {
          const items = bill.items.filter((it) => it.kategori === cat)
          if (items.length > 0) acc.push({ kategori: cat, items })
          return acc
        },
        [] as { kategori: string; items: typeof bill.items }[],
      )
    : []

  async function handleGenerateBill() {
    await generateBill.mutateAsync(visitId)
  }

  async function handleApplyDiscount() {
    if (!bill) return
    await applyDiscountMut.mutateAsync({
      billId: bill.id,
      data: {
        discount_amount: Number(discountAmount) || 0,
        catatan: discountReason,
      },
    })
    setDiscountOpen(false)
    setDiscountAmount('')
    setDiscountReason('')
  }

  async function handleFinalize() {
    if (!bill) return
    await finalizeBillMut.mutateAsync(bill.id)
    setFinalizeOpen(false)
  }

  async function handlePayment(data: {
    metode: string
    jumlah: number
    referensi_pembayaran?: string
    catatan?: string
  }) {
    if (!bill) return
    markSaving()
    try {
      const result = await processPayment.mutateAsync({
        billId: bill.id,
        data: {
          metode: data.metode as 'tunai' | 'debit' | 'kredit' | 'transfer',
          jumlah: data.jumlah,
          referensi_pembayaran: data.referensi_pembayaran,
          catatan: data.catatan,
        },
      })
      setPaymentOpen(false)
      if (navigator.onLine) {
        markSaved('Pembayaran berhasil diproses')
      } else {
        markOffline()
      }
      if (result?.data) {
        setLastPayment(result.data.payment)
        setLastKembalian(result.data.kembalian)
        setReceiptOpen(true)
      }
    } catch (err) {
      markError(err instanceof Error ? err.message : 'Gagal proses pembayaran')
    }
  }

  function handlePrint() {
    window.print()
  }

  // Bill not found — offer to generate
  if (!isLoading && !bill && error) {
    return (
      <div className="space-y-6">
        <Link
          href="/kasir"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Kasir
        </Link>

        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <ReceiptIcon className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Tagihan belum dibuat untuk kunjungan ini
            </p>
            <Button
              onClick={handleGenerateBill}
              disabled={generateBill.isPending}
            >
              {generateBill.isPending
                ? 'Membuat tagihan...'
                : 'Buat Tagihan Otomatis'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!bill) return null

  const badge = STATUS_BADGE[bill.status] || {
    variant: 'warning' as const,
    label: bill.status,
  }
  const isDraft = bill.status === 'draft'
  const isPaid = bill.status === 'dibayar'
  const canPay = ['draft', 'final'].includes(bill.status)
  const isBpjs = bill.penjamin === 'bpjs'

  return (
    <div className="space-y-6">
      {/* Print-only receipt */}
      <div className="hidden print:block">
        <Receipt
          ref={receiptRef}
          bill={bill}
          payment={lastPayment}
          kembalian={lastKembalian}
        />
      </div>

      <div className="print:hidden space-y-6">
        {/* Back */}
        <Link
          href="/kasir"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Kasir
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              Detail Tagihan
            </h1>
            <p className="text-muted-foreground text-sm">
              {bill.visit_number} &middot; {formatDate(bill.tanggal)}
            </p>
          </div>
          <SaveIndicator state={saveState} />
          <div className="flex items-center gap-2">
            <Badge variant={badge.variant} className="text-sm px-3 py-1">
              {isPaid && <Check className="h-3 w-3 mr-1" />}
              {badge.label}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1 capitalize">
              {bill.penjamin}
            </Badge>
          </div>
        </div>

        {/* Patient & Doctor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <User className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{bill.patient_nama}</p>
                <p className="text-xs text-muted-foreground">
                  RM: {bill.no_rekam_medis}
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
                <p className="text-sm font-medium">{bill.doctor_nama}</p>
                <p className="text-xs text-muted-foreground">
                  {bill.room_nama} &middot; {bill.visit_tipe === 'rawat_inap' ? 'Rawat Inap' : 'Rawat Jalan'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BPJS placeholder */}
        {isBpjs && (
          <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
            <CardContent className="p-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-teal-600" />
                <span className="font-medium text-teal-700 dark:text-teal-300">
                  Estimasi Klaim BPJS (INA-CBG)
                </span>
              </div>
              <p className="text-teal-600 dark:text-teal-400">
                Fitur estimasi INA-CBG akan tersedia di versi mendatang.
                Grouper otomatis berdasarkan diagnosis dan prosedur.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Bill Items Table */}
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th className="text-left p-3 font-medium">Deskripsi</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Harga Satuan</th>
                <th className="text-right p-3 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupedItems.map((group) => (
                <>
                  {/* Category header */}
                  <tr
                    key={`hdr-${group.kategori}`}
                    className="bg-muted/20"
                  >
                    <td
                      colSpan={5}
                      className="p-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {KATEGORI_LABELS[group.kategori] || group.kategori}
                    </td>
                  </tr>
                  {group.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3" />
                      <td className="p-3">{item.deskripsi}</td>
                      <td className="p-3 text-right">{item.qty}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {formatRupiah(Number(item.harga_satuan))}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatRupiah(Number(item.total))}
                      </td>
                    </tr>
                  ))}
                </>
              ))}

              {bill.items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Tidak ada item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary box */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRupiah(bill.total_amount)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Diskon</span>
                {isDraft && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setDiscountAmount(String(bill.discount_amount))
                      setDiscountReason(bill.catatan || '')
                      setDiscountOpen(true)
                    }}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <span
                className={cn(
                  bill.discount_amount > 0 && 'text-green-600 font-medium',
                )}
              >
                {bill.discount_amount > 0
                  ? `-${formatRupiah(bill.discount_amount)}`
                  : formatRupiah(0)}
              </span>
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-lg font-semibold">Grand Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatRupiah(bill.final_amount)}
              </span>
            </div>

            {/* Payment history */}
            {bill.payments.length > 0 && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium">Riwayat Pembayaran</p>
                {bill.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm text-muted-foreground"
                  >
                    <span className="capitalize">
                      {p.metode}
                      {p.referensi_pembayaran && ` — ${p.referensi_pembayaran}`}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatRupiah(Number(p.jumlah))}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Sisa Bayar</span>
                  <span
                    className={cn(
                      bill.sisa_bayar <= 0
                        ? 'text-green-600'
                        : 'text-red-600',
                    )}
                  >
                    {formatRupiah(Math.max(0, bill.sisa_bayar))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {isPaid && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Cetak Struk
            </Button>
          )}

          {isDraft && (
            <Button
              variant="outline"
              onClick={() => setFinalizeOpen(true)}
            >
              <Lock className="h-4 w-4 mr-1" />
              Finalisasi Tagihan
            </Button>
          )}

          {canPay && bill.sisa_bayar > 0 && (
            <Button onClick={() => setPaymentOpen(true)}>
              <Wallet className="h-4 w-4 mr-1" />
              Proses Pembayaran
            </Button>
          )}
        </div>

        {/* Discount Dialog */}
        <Dialog
          open={discountOpen}
          onOpenChange={(o) => !o && setDiscountOpen(false)}
        >
          <DialogHeader>
            <DialogTitle>Edit Diskon</DialogTitle>
            <DialogClose onClose={() => setDiscountOpen(false)} />
          </DialogHeader>
          <DialogContent>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Jumlah Diskon (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  max={bill.total_amount}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Maksimal {formatRupiah(bill.total_amount)}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Alasan <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Contoh: Diskon keluarga karyawan"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDiscountOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleApplyDiscount}
              disabled={
                !discountReason ||
                discountReason.length < 3 ||
                applyDiscountMut.isPending
              }
            >
              {applyDiscountMut.isPending ? 'Menyimpan...' : 'Simpan Diskon'}
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Finalize Dialog */}
        <Dialog
          open={finalizeOpen}
          onOpenChange={(o) => !o && setFinalizeOpen(false)}
        >
          <DialogHeader>
            <DialogTitle>Finalisasi Tagihan</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="h-4 w-4" />
                <p className="font-medium">
                  Tagihan yang sudah difinalisasi tidak bisa diubah lagi
                </p>
              </div>
              <p className="text-muted-foreground">
                Grand total: <strong>{formatRupiah(bill.final_amount)}</strong>
              </p>
              <p className="text-muted-foreground">Lanjutkan?</p>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFinalizeOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={finalizeBillMut.isPending}
            >
              {finalizeBillMut.isPending ? 'Memproses...' : 'Ya, Finalisasi'}
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Payment Modal */}
        <PaymentModal
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          amount={bill.sisa_bayar}
          onSubmit={handlePayment}
          loading={processPayment.isPending}
        />

        {/* Receipt Dialog (after payment) */}
        <Dialog
          open={receiptOpen}
          onOpenChange={(o) => {
            setReceiptOpen(o)
          }}
        >
          <DialogHeader>
            <DialogTitle>Pembayaran Berhasil</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <div className="flex justify-center">
              <Receipt
                bill={bill}
                payment={lastPayment}
                kembalian={lastKembalian}
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              Tutup
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Cetak Struk
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  )
}
