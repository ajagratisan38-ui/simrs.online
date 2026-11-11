'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ListOrdered } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { RegistrationForm } from '@/components/forms/registration-form'
import { useAllQueues, useRooms } from '@/hooks/use-queues'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'warning' | 'success' | 'destructive'> = {
  menunggu: 'secondary',
  dipanggil: 'warning',
  dilayani: 'default',
  selesai: 'success',
  batal: 'destructive',
}

const STATUS_LABELS: Record<string, string> = {
  menunggu: 'Menunggu',
  dipanggil: 'Dipanggil',
  dilayani: 'Dilayani',
  selesai: 'Selesai',
  batal: 'Batal',
}

export default function PendaftaranPage() {
  const { data: roomsData } = useRooms('poli')
  const rooms = roomsData?.data ?? []
  const [selectedRoomId, setSelectedRoomId] = useState('')

  const { data: allQueueData, isLoading: queueLoading } = useAllQueues()
  const allItems = allQueueData?.data ?? []

  const queueItems = selectedRoomId
    ? allItems.filter((q) => q.room_id === selectedRoomId)
    : allItems

  const waiting = queueItems.filter((q) => q.status === 'menunggu').length
  const called = queueItems.filter((q) => q.status === 'dipanggil').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pendaftaran</h1>
          <p className="text-muted-foreground">Daftarkan kunjungan pasien</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/pendaftaran/antrian">
            <ListOrdered className="h-4 w-4 mr-2" />
            Kelola Antrian
          </Link>
        </Button>
      </div>

      {/* Desktop: split layout | Mobile: stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form (left/top) */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Form Pendaftaran</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationForm />
            </CardContent>
          </Card>
        </div>

        {/* Queue (right/bottom) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Antrian Hari Ini</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="secondary">{waiting} menunggu</Badge>
                  {called > 0 && <Badge variant="warning">{called} dipanggil</Badge>}
                </div>
              </div>
              <Select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="mt-2"
              >
                <option value="">Semua Poli</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.kode} — {r.nama}
                  </option>
                ))}
              </Select>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : queueItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada antrian hari ini
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {queueItems.map((q) => (
                    <div
                      key={q.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md border',
                        q.status === 'dipanggil' && 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950',
                        q.status === 'dilayani' && 'border-primary/30 bg-primary/5',
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                        {q.nomor_antrian}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.patient_nama}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {q.no_rekam_medis}
                          {q.room_nama && !selectedRoomId && (
                            <span className="ml-1">· {q.room_nama}</span>
                          )}
                        </p>
                      </div>
                      <Badge variant={STATUS_COLORS[q.status] || 'outline'}>
                        {STATUS_LABELS[q.status] || q.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

