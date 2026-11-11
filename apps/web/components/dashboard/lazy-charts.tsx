'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function ChartSkeleton({ title }: { title?: string }) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  )
}

export const LazyVisitTrendChart = dynamic(
  () =>
    import('./visit-trend-chart').then((m) => ({
      default: m.VisitTrendChart,
    })),
  {
    loading: () => <ChartSkeleton title="Tren Kunjungan" />,
    ssr: false,
  },
)

export const LazyPayerPieChart = dynamic(
  () =>
    import('./payer-pie-chart').then((m) => ({
      default: m.PayerPieChart,
    })),
  {
    loading: () => <ChartSkeleton title="Kunjungan per Penjamin" />,
    ssr: false,
  },
)

export const LazyRevenueBarChart = dynamic(
  () =>
    import('./revenue-bar-chart').then((m) => ({
      default: m.RevenueBarChart,
    })),
  {
    loading: () => <ChartSkeleton title="Pendapatan" />,
    ssr: false,
  },
)

export const LazyBedOccupancyCard = dynamic(
  () =>
    import('./bed-occupancy-card').then((m) => ({
      default: m.BedOccupancyCard,
    })),
  {
    loading: () => <ChartSkeleton title="Okupansi Kamar" />,
    ssr: false,
  },
)
