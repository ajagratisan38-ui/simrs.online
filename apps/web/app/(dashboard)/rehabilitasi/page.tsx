'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Activity, Search, RefreshCw, Clock, PlayCircle, CheckCircle2, XCircle,
  CalendarDays, Heart, Users, DollarSign, TrendingUp, Briefcase,
} from 'lucide-react'
import { useRehabOrders, useRehabStats, useFeeSummary } from '@/hooks/use-rehabilitation'
import { REHAB_THERAPY_LABELS } from '@simrs/shared-types'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: typeof Clock
}> = {
  dikirim: { label: 'Dikirim', variant: 'outline', icon: Clock },
  dijadwalkan: { label: 'Dijadwalkan', variant: 'secondary', icon: CalendarDays },
  berlangsung: { label: 'Berlangsung', variant: 'default', icon: PlayCircle },
  selesai: { label: 'Selesai', variant: 'default', icon: CheckCircle2 },
  batal: { label: 'Batal', variant: 'destructive', icon: XCircle },
}

const THERAPY_COLORS: Record<string, string> = {
  fisioterapi: 'bg-blue-100 text-blue-700',
  terapi_wicara: 'bg-purple-100 text-purple-700',
  terapi_okupasi: 'bg-amber-100 text-amber-700',
  terapi_psikologi: 'bg-pink-100 text-pink-700',
  terapi_respirasi: 'bg-cyan-100 text-cyan-700',
  rehabilitasi_jantung: 'bg-red-100 text-red-700',
  rehabilitasi_neurologi: 'bg-indigo-100 text-indigo-700',
  lainnya: 'bg-gray-100 text-gray-700',
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function RehabilitasiPage() {
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'fees'>('dashboard')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [therapyFilter, setTherapyFilter] = useState('')

  const { data: stats, isLoading: statsLoading } = useRehabStats()
  const { data: ordersData, isLoading: ordersLoading } = useRehabOrders({
    page,
    limit: 20,
    status: statusFilter || undefined,
    therapy_type: therapyFilter || undefined,
    search: search || undefined,
  })
  const { data: feeSummary } = useFeeSummary()

  const orders = ordersData?.data || []
  const meta = ordersData?.meta

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Activity },
    { id: 'orders' as const, label: 'Order Rehabilitasi', icon: Heart },
    { id: 'fees' as const, label: 'Jasa Tenaga Luar', icon: DollarSign },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rehabilitasi Medik</h1>
          <p className="text-muted-foreground">
            Fisioterapi, terapi wicara, terapi okupasi & rehabilitasi medik lainnya
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Hari Ini', value: stats?.today, color: 'bg-teal-100 text-teal-600', icon: CalendarDays },
              { label: 'Dikirim', value: stats?.dikirim, color: 'bg-orange-100 text-orange-600', icon: Clock },
              { label: 'Dijadwalkan', value: stats?.dijadwalkan, color: 'bg-blue-100 text-blue-600', icon: CalendarDays },
              { label: 'Berlangsung', value: stats?.berlangsung, color: 'bg-emerald-100 text-emerald-600', icon: PlayCircle },
              { label: 'Selesai', value: stats?.selesai, color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
              { label: 'Total', value: stats?.total, color: 'bg-gray-100 text-gray-600', icon: Activity },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-4">
                  {statsLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${s.color}`}>
                        <s.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-xl font-bold">{s.value ?? 0}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Therapy Distribution */}
          {stats?.byTherapy && stats.byTherapy.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribusi Jenis Terapi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stats.byTherapy.map((t) => {
                    const label = REHAB_THERAPY_LABELS[t.therapy_type as keyof typeof REHAB_THERAPY_LABELS] || t.therapy_type
                    const color = THERAPY_COLORS[t.therapy_type] || THERAPY_COLORS.lainnya
                    return (
                      <div
                        key={t.therapy_type}
                        className={`rounded-lg p-3 ${color}`}
                      >
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-2xl font-bold">{Number(t.count)}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fee summary quick glance */}
          {feeSummary && feeSummary.grandTotal.jumlah_sesi > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Ringkasan Jasa Tenaga Luar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sesi</p>
                    <p className="text-xl font-bold">{feeSummary.grandTotal.jumlah_sesi}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tarif</p>
                    <p className="text-xl font-bold">{formatRupiah(feeSummary.grandTotal.total_tarif)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bagian Tenaga Luar</p>
                    <p className="text-xl font-bold text-orange-600">
                      {formatRupiah(feeSummary.grandTotal.total_practitioner)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bagian RS</p>
                    <p className="text-xl font-bold text-teal-600">
                      {formatRupiah(feeSummary.grandTotal.total_rs)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Daftar Order Rehabilitasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari pasien, no RM..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-10"
                />
              </div>
              <Select
                className="w-[170px]"
                value={statusFilter || 'all'}
                onChange={(e) => { setStatusFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
              >
                <option value="all">Semua Status</option>
                <option value="dikirim">Dikirim</option>
                <option value="dijadwalkan">Dijadwalkan</option>
                <option value="berlangsung">Berlangsung</option>
                <option value="selesai">Selesai</option>
                <option value="batal">Batal</option>
              </Select>
              <Select
                className="w-[180px]"
                value={therapyFilter || 'all'}
                onChange={(e) => { setTherapyFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
              >
                <option value="all">Semua Terapi</option>
                {Object.entries(REHAB_THERAPY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pasien</TableHead>
                    <TableHead>No. RM</TableHead>
                    <TableHead>Jenis Terapi</TableHead>
                    <TableHead>Dokter Pengirim</TableHead>
                    <TableHead>Terapis</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Belum ada order rehabilitasi
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => {
                      const sc = STATUS_CONFIG[order.status as string] || STATUS_CONFIG.dikirim
                      const therapyLabel = REHAB_THERAPY_LABELS[order.therapy_type as keyof typeof REHAB_THERAPY_LABELS] || order.therapy_type
                      const therapyColor = THERAPY_COLORS[order.therapy_type as string] || THERAPY_COLORS.lainnya
                      const progress = Number(order.jumlah_sesi) > 0
                        ? Math.round((Number(order.sesi_selesai) / Number(order.jumlah_sesi)) * 100)
                        : 0
                      return (
                        <TableRow key={order.id as string}>
                          <TableCell className="font-medium">{order.patient_nama}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {order.no_rekam_medis}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${therapyColor}`}>
                              {therapyLabel}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{order.doctor_nama}</TableCell>
                          <TableCell className="text-sm">
                            {order.practitioner_nama || (
                              <span className="text-muted-foreground italic">Belum ditugaskan</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-teal-500 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {order.sesi_selesai}/{order.jumlah_sesi}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sc.variant}>{sc.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.created_at as string).toLocaleDateString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <Link href={`/rehabilitasi/${order.id}`}>
                              <Button variant="ghost" size="sm">
                                {['dikirim', 'dijadwalkan', 'berlangsung'].includes(order.status as string)
                                  ? 'Proses'
                                  : 'Lihat'}
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {orders.length} dari {meta.total} order
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
      )}

      {/* Fees Tab */}
      {tab === 'fees' && (
        <div className="space-y-6">
          {/* Grand Total Cards */}
          {feeSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Sesi</p>
                      <p className="text-xl font-bold">{feeSummary.grandTotal.jumlah_sesi}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Tarif</p>
                      <p className="text-lg font-bold">{formatRupiah(feeSummary.grandTotal.total_tarif)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bagian Tenaga Luar</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatRupiah(feeSummary.grandTotal.total_practitioner)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-teal-200">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bagian RS</p>
                      <p className="text-lg font-bold text-teal-600">
                        {formatRupiah(feeSummary.grandTotal.total_rs)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Per-Practitioner Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Rincian per Tenaga Luar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!feeSummary || feeSummary.practitioners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Belum ada data jasa tenaga luar
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Profesi</TableHead>
                        <TableHead>Instansi</TableHead>
                        <TableHead className="text-center">Sesi</TableHead>
                        <TableHead className="text-right">Total Tarif</TableHead>
                        <TableHead className="text-center">Split</TableHead>
                        <TableHead className="text-right">Jasa Tenaga Luar</TableHead>
                        <TableHead className="text-right">Jasa RS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeSummary.practitioners.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nama}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.profesi}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {p.instansi_asal || '-'}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {Number(p.jumlah_sesi)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatRupiah(Number(p.total_tarif || 0))}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs">
                              {p.fee_share_persen}% / {p.fee_share_rs_persen}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-600 font-medium">
                            {formatRupiah(Number(p.total_practitioner || 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-teal-600 font-medium">
                            {formatRupiah(Number(p.total_rs || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3}>TOTAL</TableCell>
                        <TableCell className="text-center">
                          {feeSummary.grandTotal.jumlah_sesi}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRupiah(feeSummary.grandTotal.total_tarif)}
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right text-orange-600">
                          {formatRupiah(feeSummary.grandTotal.total_practitioner)}
                        </TableCell>
                        <TableCell className="text-right text-teal-600">
                          {formatRupiah(feeSummary.grandTotal.total_rs)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
