'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
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
  FlaskConical,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TestTubes,
  Activity,
  RefreshCw,
} from 'lucide-react'
import { useLabOrders, useLabStats } from '@/hooks/use-laboratory'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  dikirim: { label: 'Menunggu Sampel', variant: 'outline' },
  sampel_diterima: { label: 'Sampel Diterima', variant: 'secondary' },
  diproses: { label: 'Diproses', variant: 'default' },
  selesai: { label: 'Selesai', variant: 'default' },
  batal: { label: 'Batal', variant: 'destructive' },
}

export default function LaboratoriumPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [prioritasFilter, setPrioritasFilter] = useState<string>('')

  const { data: statsData } = useLabStats()
  const { data: ordersData, isLoading } = useLabOrders({
    page,
    limit: 20,
    status: statusFilter || undefined,
    prioritas: prioritasFilter || undefined,
    search: search || undefined,
  })

  const stats = statsData
  const orders = ordersData?.data || []
  const meta = ordersData?.meta

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laboratorium</h1>
          <p className="text-muted-foreground">
            Kelola permintaan dan hasil pemeriksaan laboratorium
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Menunggu</p>
                <p className="text-2xl font-bold">{stats?.pending ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CITO</p>
                <p className="text-2xl font-bold">{stats?.cito ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-teal-100 text-teal-600">
                <TestTubes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hari Ini</p>
                <p className="text-2xl font-bold">{stats?.today ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Selesai Hari Ini</p>
                <p className="text-2xl font-bold">{stats?.completed_today ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Antrian Pemeriksaan Lab
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama pasien, no RM, atau nomor order..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Select
              className="w-[180px]"
              value={statusFilter || 'all'}
              onChange={(e) => { setStatusFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
            >
              <option value="all">Semua Status</option>
              <option value="dikirim">Menunggu Sampel</option>
              <option value="sampel_diterima">Sampel Diterima</option>
              <option value="diproses">Diproses</option>
              <option value="selesai">Selesai</option>
              <option value="batal">Batal</option>
            </Select>
            <Select
              className="w-[140px]"
              value={prioritasFilter || 'all'}
              onChange={(e) => { setPrioritasFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
            >
              <option value="all">Semua</option>
              <option value="cito">CITO</option>
              <option value="normal">Normal</option>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Order</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead>No. RM</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead className="text-center">Pemeriksaan</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu Order</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Belum ada order lab
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const statusConf = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.dikirim
                    return (
                      <TableRow key={order.id as string}>
                        <TableCell className="font-mono text-sm">
                          {order.nomor_order as string}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.patient_nama as string}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.no_rekam_medis as string}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.doctor_nama as string}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{order.item_count ?? 0} item</Badge>
                        </TableCell>
                        <TableCell>
                          {order.prioritas === 'cito' ? (
                            <Badge variant="destructive">CITO</Badge>
                          ) : (
                            <Badge variant="outline">Normal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConf?.variant ?? 'secondary'}>{statusConf?.label ?? ''}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.tanggal_order as string).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <Link href={`/laboratorium/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              {['dikirim', 'sampel_diterima', 'diproses'].includes(order.status as string)
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
        </CardContent>
      </Card>
    </div>
  )
}
