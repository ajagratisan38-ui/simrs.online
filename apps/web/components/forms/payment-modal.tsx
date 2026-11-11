'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  CreditCard,
  Banknote,
  Building,
  ArrowRightLeft,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  amount: number
  onSubmit: (data: {
    metode: string
    jumlah: number
    referensi_pembayaran?: string
    catatan?: string
  }) => Promise<void>
  loading?: boolean
}

const METODE_OPTIONS = [
  { value: 'tunai', label: 'Tunai', icon: Banknote },
  { value: 'debit', label: 'Debit', icon: CreditCard },
  { value: 'kredit', label: 'Kredit', icon: CreditCard },
  { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
] as const


export function PaymentModal({
  open,
  onClose,
  amount,
  onSubmit,
  loading,
}: PaymentModalProps) {
  const [metode, setMetode] = useState('tunai')
  const [jumlahBayar, setJumlahBayar] = useState('')
  const [referensi, setReferensi] = useState('')
  const [catatan, setCatatan] = useState('')

  useEffect(() => {
    if (open) {
      setJumlahBayar(String(amount))
      setMetode('tunai')
      setReferensi('')
      setCatatan('')
    }
  }, [open, amount])

  const bayar = Number(jumlahBayar) || 0
  const kembalian = metode === 'tunai' ? Math.max(0, bayar - amount) : 0
  const canSubmit = bayar >= amount || metode !== 'tunai'
  const actualAmount = metode === 'tunai' ? bayar : amount

  async function handleSubmit() {
    await onSubmit({
      metode,
      jumlah: metode === 'tunai' ? bayar : amount,
      referensi_pembayaran: referensi || undefined,
      catatan: catatan || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogHeader>
        <DialogTitle>Proses Pembayaran</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>
      <DialogContent>
        <div className="space-y-5">
          {/* Amount */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Jumlah yang harus dibayar</p>
            <p className="text-3xl font-bold text-primary mt-1">
              {formatRupiah(amount)}
            </p>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-4 gap-2">
              {METODE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = metode === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMetode(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-sm',
                      active
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-muted hover:border-muted-foreground/30',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cash input */}
          {metode === 'tunai' && (
            <div className="space-y-2">
              <Label>Jumlah Dibayar</Label>
              <Input
                type="number"
                min={0}
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                className="text-right text-lg font-medium"
              />
              {/* Quick amount buttons */}
              <div className="flex gap-2 flex-wrap">
                {[amount, 50000, 100000, 200000, 500000].map((v) => (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    onClick={() => setJumlahBayar(String(v))}
                    className="text-xs"
                  >
                    {formatRupiah(v)}
                  </Button>
                ))}
              </div>
              {bayar >= amount && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Kembalian
                  </span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-300">
                    {formatRupiah(kembalian)}
                  </span>
                </div>
              )}
              {bayar > 0 && bayar < amount && (
                <p className="text-xs text-red-500">
                  Jumlah kurang {formatRupiah(amount - bayar)}
                </p>
              )}
            </div>
          )}

          {/* Reference (for non-cash) */}
          {metode !== 'tunai' && (
            <div className="space-y-2">
              <Label>No. Referensi / Approval Code</Label>
              <Input
                placeholder={
                  metode === 'transfer' ? 'No. Transfer' : 'Approval Code'
                }
                value={referensi}
                onChange={(e) => setReferensi(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              placeholder="Catatan pembayaran..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || (metode === 'tunai' && bayar < amount)}
        >
          {loading ? (
            'Memproses...'
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Bayar {formatRupiah(metode === 'tunai' ? bayar : amount)}
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
