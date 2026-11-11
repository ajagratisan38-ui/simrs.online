'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign } from 'lucide-react'

export interface RevenueBarChartProps {
  data: { date: string; amount: number }[]
  loading?: boolean
  title?: string
}

export function RevenueBarChart({
  data,
  loading,
  title = 'Pendapatan Mingguan',
}: RevenueBarChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    date: formatShortDate(d.date),
    Pendapatan: d.amount,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {title}
          </CardTitle>
          {data.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Total: Rp{' '}
              {Math.round(data.reduce((s, d) => s + Number(d.amount), 0))
                .toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            Belum ada data pendapatan
          </div>
        ) : (
          <div className="h-[260px] w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={260} debounce={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(v) => formatCompactRupiah(v)}
              />
              <Tooltip
                formatter={(value) => [
                  `Rp ${Math.round(Number(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`,
                  'Pendapatan',
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="Pendapatan"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
}

function formatCompactRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}
