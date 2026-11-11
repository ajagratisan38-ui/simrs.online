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
  ScanLine,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { useRadiologyOrders, useRadiologyStats } from '@/hooks/use-radiology'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  dikirim: { label: 'Menunggu', variant: 'outline' },
  dijadwalkan: { label: 'Dijadwalkan', variant: 'secondary' },
  diproses: { label: 'Diproses', variant: 'default' },
  selesai: { label: 'Selesai', variant: 'default' },
  batal: { label: 'Batal', variant: 'destructive' },
}

const MODALITY_LABELS: Record<string, string> = {
  xray: 'X-Ray',
  usg: 'USG',
  ct_scan: 'CT Scan',
  mri: 'MRI',
  mammografi: 'Mammografi',
  panoramik: 'Panoramik',
  fluoroskopi: 'Fluoroskopi',
  lainnya: 'Lainnya',
}

export default function RadiologiPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalitasFilter, setModalitasFilter] = useState<string>('')

  const { data: statsData } = useRadiologyStats()
  const { data: ordersData, isLoading } = useRadiologyOrders({
    page,
    limit: 20,
    status: statusFilter || undefined,
    modalitas: modalitasFilter || undefined,
    search: search || undefined,
  })

  const stats = statsData
  const orders = ordersData?.data || []
  const meta = ordersData?.meta

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Radiologi</h1>
          <p className="text-muted-foreground">
            Kelola permintaan dan hasil pemeriksaan radiologi
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
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
                <Zap className="h-5 w-5" />
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

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Antrian Pemeriksaan Radiologi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama pasien, no RM, atau nomor order..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Select
              className="w-[160px]"
              value={statusFilter || 'all'}
              onChange={(e) => { setStatusFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
            >
              <option value="all">Semua Status</option>
              <option value="dikirim">Menunggu</option>
              <option value="dijadwalkan">Dijadwalkan</option>
              <option value="diproses">Diproses</option>
              <option value="selesai">Selesai</option>
              <option value="batal">Batal</option>
            </Select>
            <Select
              className="w-[140px]"
              value={modalitasFilter || 'all'}
              onChange={(e) => { setModalitasFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
            >
              <option value="all">Semua</option>
              <option value="xray">X-Ray</option>
              <option value="usg">USG</option>
              <option value="ct_scan">CT Scan</option>
              <option value="mri">MRI</option>
              <option value="mammografi">Mammografi</option>
              <option value="panoramik">Panoramik</option>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Order</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Pemeriksaan</TableHead>
                  <TableHead>Modalitas</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waktu</TableHead>
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
                      Belum ada order radiologi
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const statusConf = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.dikirim
                    return (
                      <TableRow key={order.id as string}>
                        <TableCell className="font-mono text-sm">{order.nomor_order as string}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.patient_nama as string}</p>
                            <p className="text-xs text-muted-foreground">{order.no_rekam_medis as string}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{order.examination_nama as string}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {MODALITY_LABELS[order.modalitas] || order.modalitas}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{order.doctor_nama as string}</TableCell>
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
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <Link href={`/radiologi/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              {['dikirim', 'dijadwalkan', 'diproses'].includes(order.status as string)
                                ? 'Proses' : 'Lihat'}
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
    </div>
  )
}
