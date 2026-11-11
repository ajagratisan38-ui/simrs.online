'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Pill,
  User,
  Clock,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Package,
  ScrollText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  usePendingDispensing,
  useExpiringDrugs,
  useLowStockDrugs,
} from '@/hooks/use-pharmacy'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<
  string,
  { variant: 'warning' | 'default' | 'success'; label: string }
> = {
  dikirim: { variant: 'warning', label: 'Menunggu' },
  diproses: { variant: 'default', label: 'Diproses' },
  selesai: { variant: 'success', label: 'Selesai' },
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function daysUntil(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function FarmasiPage() {
  const [activeTab, setActiveTab] = useState('resep')

  const {
    data: pendingData,
    isLoading: loadingPending,
    refetch: refetchPending,
  } = usePendingDispensing()

  const { data: expiringData, isLoading: loadingExpiring } = useExpiringDrugs(90)
  const { data: lowStockData, isLoading: loadingLowStock } = useLowStockDrugs()

  const prescriptions = pendingData?.data ?? []
  const expiringDrugs = expiringData?.data ?? []
  const lowStockDrugs = lowStockData?.data ?? []

  const alertCount = expiringDrugs.length + lowStockDrugs.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Pill className="h-6 w-6" />
            Farmasi
          </h1>
          <p className="text-muted-foreground">
            Kelola resep, stok obat, dan dispensing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/farmasi/stok">
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4 mr-1" />
              Kelola Stok
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPending()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="resep">
            <ScrollText className="h-4 w-4 mr-1.5" />
            Resep Masuk
            {prescriptions.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {prescriptions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Alerts
            {alertCount > 0 && (
              <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {alertCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Resep Masuk */}
        <TabsContent value="resep">
          {loadingPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ) : prescriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ScrollText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Tidak ada resep yang menunggu diproses
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prescriptions.map((rx) => {
                const badge = STATUS_BADGE[rx.status] ?? { variant: 'warning' as const, label: rx.status }
                return (
                  <Link
                    key={rx.id}
                    href={`/farmasi/dispensing/${rx.id}`}
                    className="block group"
                  >
                    <Card className="transition-all hover:shadow-md hover:border-primary/40 cursor-pointer h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {rx.patient_nama}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {rx.no_rekam_medis}
                              </p>
                            </div>
                          </div>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>

                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <p>
                            <span className="font-medium text-foreground">
                              Dokter:
                            </span>{' '}
                            {rx.doctor_nama}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">
                              Poli:
                            </span>{' '}
                            {rx.room_nama}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Pill className="h-3 w-3" />
                              {rx.items?.length || 0} item obat
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(rx.created_at)}
                            </span>
                          </div>
                        </div>

                        {rx.catatan_dokter && (
                          <p className="mt-2 text-xs text-muted-foreground italic line-clamp-1">
                            &quot;{rx.catatan_dokter}&quot;
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-end text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Proses Resep
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts">
          <div className="space-y-6">
            {/* Expiring */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Obat Hampir Expired
                <span className="text-sm font-normal text-muted-foreground">
                  (dalam 90 hari)
                </span>
              </h2>

              {loadingExpiring ? (
                <Skeleton className="h-32 w-full rounded-lg" />
              ) : expiringDrugs.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Tidak ada obat yang akan expired dalam 90 hari
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Kode</th>
                        <th className="text-left p-3 font-medium">Nama Obat</th>
                        <th className="text-left p-3 font-medium">Batch</th>
                        <th className="text-right p-3 font-medium">Sisa Stok</th>
                        <th className="text-left p-3 font-medium">Kadaluarsa</th>
                        <th className="text-right p-3 font-medium">Sisa Hari</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {expiringDrugs.map((item) => {
                        const days = daysUntil(item.tanggal_kadaluarsa)
                        const isExpired = days <= 0
                        return (
                          <tr
                            key={item.stock_id}
                            className={cn(
                              isExpired && 'bg-red-50 dark:bg-red-950/20',
                              days > 0 && days <= 30 && 'bg-yellow-50 dark:bg-yellow-950/20',
                            )}
                          >
                            <td className="p-3 font-mono text-xs">{item.kode}</td>
                            <td className="p-3">{item.nama}</td>
                            <td className="p-3 text-muted-foreground">
                              {item.batch_number || '-'}
                            </td>
                            <td className="p-3 text-right">
                              {item.stok_sisa} {item.satuan_kecil}
                            </td>
                            <td className="p-3">
                              {formatDate(item.tanggal_kadaluarsa)}
                            </td>
                            <td className="p-3 text-right">
                              {isExpired ? (
                                <Badge variant="destructive">EXPIRED</Badge>
                              ) : (
                                <span
                                  className={cn(
                                    'font-medium',
                                    days <= 30 && 'text-red-600',
                                    days > 30 && days <= 60 && 'text-yellow-600',
                                    days > 60 && 'text-muted-foreground',
                                  )}
                                >
                                  {days} hari
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Low Stock */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-red-500" />
                Stok Rendah
                <span className="text-sm font-normal text-muted-foreground">
                  (di bawah stok minimum)
                </span>
              </h2>

              {loadingLowStock ? (
                <Skeleton className="h-32 w-full rounded-lg" />
              ) : lowStockDrugs.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Semua stok obat di atas batas minimum
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Kode</th>
                        <th className="text-left p-3 font-medium">Nama Obat</th>
                        <th className="text-left p-3 font-medium">Kategori</th>
                        <th className="text-right p-3 font-medium">Stok Sisa</th>
                        <th className="text-right p-3 font-medium">Stok Min</th>
                        <th className="text-center p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lowStockDrugs.map((drug) => (
                        <tr key={drug.id} className="bg-red-50 dark:bg-red-950/20">
                          <td className="p-3 font-mono text-xs">{drug.kode}</td>
                          <td className="p-3">{drug.nama}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize">
                              {drug.kategori}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-medium text-red-600">
                            {drug.total_stok} {drug.satuan_kecil}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {drug.stok_minimum} {drug.satuan_kecil}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="destructive">Perlu Restock</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
