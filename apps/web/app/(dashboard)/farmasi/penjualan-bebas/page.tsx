'use client'

import { useState } from 'react'
import { useOtcSales, useOtcDailySummary } from '@/hooks/use-otc-sales'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ShoppingCart, Loader2, DollarSign, Receipt, CreditCard } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'

const formatRupiah = (n: number | string) => {
  const num = Math.round(Number(n) || 0)
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${formatted}`
}

const METODE_LABEL: Record<string, string> = {
  tunai: 'Tunai',
  qris: 'QRIS',
  debit: 'Debit',
  kredit: 'Kredit',
}

export default function PenjualanBebasPage() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const { data: summaryData } = useOtcDailySummary(today)
  const { data, isLoading } = useOtcSales({
    page,
    limit: 20,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  })

  const sales = data?.data || []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-green-600" />
          Penjualan Obat Bebas
        </h1>
        <p className="text-muted-foreground">Penjualan obat tanpa resep (OTC)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Receipt className="h-4 w-4" /> Transaksi Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData?.total_transaksi || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Pendapatan Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRupiah(Number(summaryData?.total_pendapatan || 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> Per Metode Bayar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {summaryData?.perMetodeBayar?.map((m: { metode_bayar: string; jumlah: number; total: number }) => (
                <div key={m.metode_bayar} className="flex justify-between">
                  <span>{METODE_LABEL[m.metode_bayar] || m.metode_bayar}</span>
                  <span className="font-medium">{m.jumlah}x — {formatRupiah(Number(m.total))}</span>
                </div>
              )) || <span className="text-muted-foreground">Belum ada</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Riwayat Penjualan</CardTitle>
            <div className="flex gap-2 items-center">
              <DateInput
                value={dateFrom}
                onChange={(v) => { setDateFrom(v); setPage(1) }}
                className="w-40"
              />
              <span className="text-muted-foreground">—</span>
              <DateInput
                value={dateTo}
                onChange={(v) => { setDateTo(v); setPage(1) }}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada penjualan
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Struk</TableHead>
                  <TableHead>Pembeli</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Diskon</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">
                      {sale.receipt_number || sale.nomor_transaksi}
                    </TableCell>
                    <TableCell>{sale.nama_pembeli || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(Number(sale.subtotal))}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {Number(sale.diskon) > 0 ? `-${formatRupiah(Number(sale.diskon))}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(Number(sale.grand_total))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {METODE_LABEL[sale.metode_bayar] || sale.metode_bayar}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(sale.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Halaman {meta.page} dari {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
