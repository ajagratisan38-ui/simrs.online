'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Wallet,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Receipt,
  Clock,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Building,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useOutstandingBills, useDailySummary } from '@/hooks/use-billing'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string, { variant: 'warning' | 'default' | 'success' | 'destructive'; label: string }> = {
  draft: { variant: 'warning', label: 'Draft' },
  final: { variant: 'default', label: 'Final' },
  dibayar: { variant: 'success', label: 'Dibayar' },
  batal: { variant: 'destructive', label: 'Batal' },
}

const PENJAMIN_LABELS: Record<string, string> = {
  umum: 'Umum',
  bpjs: 'BPJS',
  asuransi: 'Asuransi',
  perusahaan: 'Perusahaan',
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const METODE_ICONS: Record<string, typeof Banknote> = {
  tunai: Banknote,
  debit: CreditCard,
  kredit: CreditCard,
  transfer: ArrowRightLeft,
  bpjs: Building,
  asuransi: Building,
}

const METODE_LABELS: Record<string, string> = {
  tunai: 'Tunai',
  debit: 'Kartu Debit',
  kredit: 'Kartu Kredit',
  transfer: 'Transfer',
  bpjs: 'BPJS',
  asuransi: 'Asuransi',
}

function formatCurrency(n: number | string) {
  const num = Math.round(Number(n) || 0)
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${formatted}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function KasirPage() {
  const [activeTab, setActiveTab] = useState('tagihan')
  const [page, setPage] = useState(1)
  const [summaryDate, setSummaryDate] = useState(
    new Date().toISOString().split('T')[0],
  )

  const {
    data: outstandingData,
    isLoading: loadingBills,
    refetch: refetchBills,
  } = useOutstandingBills(page, 20)

  const {
    data: summaryData,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useDailySummary(summaryDate)

  const bills = outstandingData?.data ?? []
  const meta = outstandingData?.meta
  const summary = summaryData?.data

  const pieData = useMemo(() => {
    if (!summary?.per_metode) return []
    return summary.per_metode.map((m) => ({
      name: METODE_LABELS[m.metode] || m.metode,
      value: m.total,
      count: m.jumlah_transaksi,
    }))
  }, [summary])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Kasir
          </h1>
          <p className="text-muted-foreground">
            Kelola tagihan dan pembayaran
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchBills()
            refetchSummary()
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tagihan">
            <Receipt className="h-4 w-4 mr-1.5" />
            Tagihan Aktif
            {bills.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {meta?.total ?? bills.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ringkasan">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Ringkasan Hari Ini
          </TabsTrigger>
        </TabsList>

        {/* ============================== */}
        {/* TAB: Tagihan Aktif */}
        {/* ============================== */}
        <TabsContent value="tagihan">
          {loadingBills ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Tidak ada tagihan yang belum dibayar
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="border rounded-lg overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">No. Visit</th>
                      <th className="text-left p-3 font-medium">Pasien</th>
                      <th className="text-left p-3 font-medium">Poli</th>
                      <th className="text-left p-3 font-medium">Tanggal</th>
                      <th className="text-right p-3 font-medium">
                        Total Tagihan
                      </th>
                      <th className="text-center p-3 font-medium">Penjamin</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bills.map((bill) => {
                      const badge = STATUS_BADGE[bill.status] || {
                        variant: 'warning' as const,
                        label: bill.status,
                      }
                      return (
                        <tr
                          key={bill.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 font-mono text-xs">
                            {bill.visit_number}
                          </td>
                          <td className="p-3">
                            <p className="font-medium">{bill.patient_nama}</p>
                            <p className="text-xs text-muted-foreground">
                              {bill.no_rekam_medis}
                            </p>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {bill.room_nama}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {formatDate(bill.tanggal)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(bill.final_amount)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="capitalize">
                              {PENJAMIN_LABELS[bill.penjamin] || bill.penjamin}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={badge.variant}>
                              {badge.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Link href={`/kasir/${bill.visit_id}`}>
                              <Button variant="ghost" size="sm">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm mt-4">
                  <span className="text-muted-foreground">
                    Halaman {meta.page} dari {meta.totalPages} ({meta.total}{' '}
                    tagihan)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ============================== */}
        {/* TAB: Ringkasan Hari Ini */}
        {/* ============================== */}
        <TabsContent value="ringkasan">
          <div className="space-y-6">
            {/* Date picker */}
            <div className="flex items-center gap-3">
              <DateInput
                value={summaryDate}
                onChange={(val) => setSummaryDate(val)}
                className="w-44"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSummaryDate(new Date().toISOString().split('T')[0])
                }
              >
                Hari Ini
              </Button>
            </div>

            {loadingSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total Pendapatan
                          </p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(summary?.total_pendapatan ?? 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Sudah Bayar
                          </p>
                          <p className="text-xl font-bold">
                            {summary?.jumlah_sudah_bayar ?? 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Belum Bayar
                          </p>
                          <p className="text-xl font-bold text-yellow-600">
                            {summary?.jumlah_belum_bayar ?? 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pie chart + Method breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie chart */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-semibold mb-4">
                        Pendapatan per Metode Pembayaran
                      </h3>
                      {pieData.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                          Belum ada pembayaran
                        </div>
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={90}
                                paddingAngle={3}
                                dataKey="value"
                                labelLine={false}
                              >
                                {pieData.map((_, index) => (
                                  <Cell
                                    key={index}
                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value) =>
                                  formatCurrency(Number(value))
                                }
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Method breakdown */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-semibold mb-4">
                        Detail per Metode
                      </h3>
                      {!summary?.per_metode?.length ? (
                        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                          Belum ada pembayaran
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {summary.per_metode.map((m, i) => {
                            const Icon =
                              METODE_ICONS[m.metode] || Banknote
                            const pct =
                              summary.total_pendapatan > 0
                                ? (m.total / summary.total_pendapatan) * 100
                                : 0

                            return (
                              <div key={m.metode} className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {METODE_LABELS[m.metode] || m.metode}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({m.jumlah_transaksi} transaksi)
                                    </span>
                                  </div>
                                  <span className="font-medium">
                                    {formatCurrency(m.total)}
                                  </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor:
                                        PIE_COLORS[i % PIE_COLORS.length],
                                    }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
