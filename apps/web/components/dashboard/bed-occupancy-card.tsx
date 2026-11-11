'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BedDouble } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BedOccupancyCardProps {
  rooms: { room: string; occupied: number; total: number; rate: number }[]
  overallBor: number
  averageLos: number
  loading?: boolean
}

export function BedOccupancyCard({
  rooms,
  overallBor,
  averageLos,
  loading,
}: BedOccupancyCardProps) {
  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            Okupansi Kamar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            Okupansi Kamar
          </CardTitle>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>BOR: <span className="font-bold text-foreground">{overallBor}%</span></span>
            <span>LOS: <span className="font-bold text-foreground">{averageLos}h</span></span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Tidak ada data kamar rawat inap
          </p>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {rooms.map((r) => (
              <div key={r.room} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium truncate">{r.room}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {r.occupied}/{r.total} ({r.rate}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      r.rate >= 90
                        ? 'bg-red-500'
                        : r.rate >= 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500',
                    )}
                    style={{ width: `${Math.min(r.rate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
