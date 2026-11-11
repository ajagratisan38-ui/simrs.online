'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useExpiringDrugs, useLowStockDrugs } from '@/hooks/use-pharmacy'
import { cn } from '@/lib/utils'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
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

export default function AlertsPage() {
  const {
    data: expiringData,
    isLoading: loadingExpiring,
    refetch: refetchExpiring,
  } = useExpiringDrugs(90)
  const {
    data: lowStockData,
    isLoading: loadingLowStock,
    refetch: refetchLowStock,
  } = useLowStockDrugs()

  const expiringDrugs = expiringData?.data ?? []
  const lowStockDrugs = lowStockData?.data ?? []

  function refetchAll() {
    refetchExpiring()
    refetchLowStock()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/farmasi"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Alerts Farmasi
            </h1>
            <p className="text-muted-foreground">
              Monitoring obat expired dan stok rendah
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className={cn(
            expiringDrugs.length > 0 &&
              'border-yellow-300 dark:border-yellow-700',
          )}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div
              className={cn(
                'h-12 w-12 rounded-full flex items-center justify-center',
                expiringDrugs.length > 0
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : 'bg-muted',
              )}
            >
              <AlertTriangle
                className={cn(
                  'h-6 w-6',
                  expiringDrugs.length > 0
                    ? 'text-yellow-600'
                    : 'text-muted-foreground',
                )}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiringDrugs.length}</p>
              <p className="text-sm text-muted-foreground">
                Batch hampir expired
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            lowStockDrugs.length > 0 &&
              'border-red-300 dark:border-red-700',
          )}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div
              className={cn(
                'h-12 w-12 rounded-full flex items-center justify-center',
                lowStockDrugs.length > 0
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-muted',
              )}
            >
              <Package
                className={cn(
                  'h-6 w-6',
                  lowStockDrugs.length > 0
                    ? 'text-red-600'
                    : 'text-muted-foreground',
                )}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">{lowStockDrugs.length}</p>
              <p className="text-sm text-muted-foreground">
                Obat stok rendah
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring section */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Obat Hampir Expired
          <span className="text-sm font-normal text-muted-foreground">
            (dalam 90 hari)
          </span>
        </h2>

        {loadingExpiring ? (
          <Skeleton className="h-40 w-full rounded-lg" />
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
                  <th className="text-left p-3 font-medium">Satuan</th>
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
                        days > 0 &&
                          days <= 30 &&
                          'bg-yellow-50 dark:bg-yellow-950/20',
                      )}
                    >
                      <td className="p-3 font-mono text-xs">{item.kode}</td>
                      <td className="p-3 font-medium">{item.nama}</td>
                      <td className="p-3 text-muted-foreground">
                        {item.batch_number || '-'}
                      </td>
                      <td className="p-3 text-right">{item.stok_sisa}</td>
                      <td className="p-3 text-muted-foreground">
                        {item.satuan_kecil}
                      </td>
                      <td className="p-3">{formatDate(item.tanggal_kadaluarsa)}</td>
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
      </section>

      {/* Low Stock section */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Package className="h-5 w-5 text-red-500" />
          Stok Rendah
          <span className="text-sm font-normal text-muted-foreground">
            (di bawah stok minimum)
          </span>
        </h2>

        {loadingLowStock ? (
          <Skeleton className="h-40 w-full rounded-lg" />
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
                  <th className="text-left p-3 font-medium">Satuan</th>
                  <th className="text-right p-3 font-medium">Stok Sisa</th>
                  <th className="text-right p-3 font-medium">Stok Min</th>
                  <th className="text-right p-3 font-medium">Kurang</th>
                  <th className="text-center p-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lowStockDrugs.map((drug) => {
                  const deficit = drug.stok_minimum - drug.total_stok

                  return (
                    <tr
                      key={drug.id}
                      className="bg-red-50/50 dark:bg-red-950/10"
                    >
                      <td className="p-3 font-mono text-xs">{drug.kode}</td>
                      <td className="p-3 font-medium">{drug.nama}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize">
                          {drug.kategori}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {drug.satuan_kecil}
                      </td>
                      <td className="p-3 text-right font-medium text-red-600">
                        {drug.total_stok}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {drug.stok_minimum}
                      </td>
                      <td className="p-3 text-right font-medium text-red-600">
                        -{deficit}
                      </td>
                      <td className="p-3 text-center">
                        <Link href="/farmasi/stok">
                          <Button variant="outline" size="sm">
                            Restock
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
