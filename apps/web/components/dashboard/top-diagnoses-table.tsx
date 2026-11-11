'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity } from 'lucide-react'
import type { DiagnosisRank } from '@/lib/api/dashboard'

interface TopDiagnosesTableProps {
  data: DiagnosisRank[]
  loading?: boolean
}

export function TopDiagnosesTable({ data, loading }: TopDiagnosesTableProps) {
  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            10 Besar Penyakit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          10 Besar Penyakit
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Belum ada data diagnosa
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {data.map((d, idx) => (
              <div
                key={d.icd10_code}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm"
              >
                <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">
                  {idx + 1}
                </span>
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {d.icd10_code}
                </Badge>
                <span className="flex-1 min-w-0 truncate">{d.icd10_name}</span>
                <span className="font-bold tabular-nums shrink-0">
                  {d.count.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
