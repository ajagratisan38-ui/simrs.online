'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PieChartIcon } from 'lucide-react'

const COLORS = [
  'hsl(210, 80%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(35, 90%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 70%, 55%)',
]

const PENJAMIN_LABELS: Record<string, string> = {
  umum: 'Umum',
  bpjs: 'BPJS',
  asuransi: 'Asuransi',
  perusahaan: 'Perusahaan',
}

export interface PayerPieChartProps {
  data: { penjamin: string; count: number }[]
  loading?: boolean
}

export function PayerPieChart({ data, loading }: PayerPieChartProps) {
  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Kunjungan per Penjamin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    name: PENJAMIN_LABELS[d.penjamin] || d.penjamin,
    value: d.count,
  }))

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" />
          Kunjungan per Penjamin
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 || total === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            Belum ada data
          </div>
        ) : (
          <div className="h-[260px] w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={260} debounce={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={{ strokeWidth: 1 }}
              >
                {chartData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={COLORS[idx % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  Number(value).toLocaleString('id-ID'),
                  'Kunjungan',
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
