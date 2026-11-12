'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Stethoscope,
  User,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useVisits } from '@/hooks/use-registration'
import { useRooms } from '@/hooks/use-queues'
import { cn, getTodayLocal } from '@/lib/utils'

const STATUS_COLORS: Record<string, 'warning' | 'default' | 'success' | 'secondary'> = {
  dipanggil: 'warning',
  diperiksa: 'default',
  menunggu: 'secondary',
  selesai: 'success',
}

const STATUS_LABELS: Record<string, string> = {
  dipanggil: 'Dipanggil',
  diperiksa: 'Sedang Diperiksa',
  menunggu: 'Menunggu',
  selesai: 'Selesai',
}

export default function RekamMedisPage() {
  const [selectedRoom, setSelectedRoom] = useState('')

  const { data: roomsData } = useRooms('poli')
  const rooms = roomsData?.data ?? []

  const today = getTodayLocal()

  // Fetch visits yang statusnya diperiksa
  const {
    data: visitsData,
    isLoading,
    refetch,
  } = useVisits({
    tanggal: today,
    status: 'diperiksa',
    room_id: selectedRoom || undefined,
    limit: 50,
  })

  // Fetch visits yang statusnya dipanggil
  const { data: calledData, refetch: refetchCalled } = useVisits({
    tanggal: today,
    status: 'dipanggil',
    room_id: selectedRoom || undefined,
    limit: 50,
  })

  const examVisits = visitsData?.data ?? []
  const calledVisits = calledData?.data ?? []

  // Combine: dipanggil first (urgent), then diperiksa
  const allVisits = [
    ...calledVisits.map((v) => ({ ...v, _priority: 0 })),
    ...examVisits.map((v) => ({ ...v, _priority: 1 })),
  ].sort((a, b) => a._priority - b._priority)

  const handleRefresh = () => {
    refetch()
    refetchCalled()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-6 w-6" />
            Rekam Medis
          </h1>
          <p className="text-muted-foreground">
            Pasien yang siap diperiksa hari ini
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="w-48"
          >
            <option value="">Semua Poli</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.kode} — {r.nama}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : allVisits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Tidak ada pasien yang siap diperiksa saat ini
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allVisits.map((visit) => (
            <Link
              key={visit.id}
              href={`/rekam-medis/${visit.id}`}
              className="block group"
            >
              <Card
                className={cn(
                  'transition-all hover:shadow-md hover:border-primary/40 cursor-pointer h-full',
                  visit.status === 'dipanggil' &&
                    'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30',
                  visit.status === 'diperiksa' &&
                    'border-primary/30 bg-primary/5',
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {visit.queue ? (
                          <span className="text-sm font-bold">
                            {visit.queue.nomor_antrian}
                          </span>
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {visit.patient_nama || 'Pasien'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {visit.no_rekam_medis}
                        </p>
                      </div>
                    </div>
                    <Badge variant={STATUS_COLORS[visit.status] || 'outline'}>
                      {STATUS_LABELS[visit.status] || visit.status}
                    </Badge>
                  </div>

                  {visit.keluhan_utama && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      <span className="font-medium">Keluhan:</span>{' '}
                      {visit.keluhan_utama}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{visit.room_nama || visit.room_kode}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {visit.visit_number}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-end text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Mulai Periksa
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
