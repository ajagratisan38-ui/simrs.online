'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, RefreshCw, Monitor, TabletSmartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGate } from '@/components/ui/permission-gate'
import { useAllQueues, useCallNext, useRooms } from '@/hooks/use-queues'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

export default function AntrianPage() {
  const { data: roomsData } = useRooms()
  const rooms = roomsData?.data ?? []
  const [filterRoomId, setFilterRoomId] = useState('')

  const { data: allQueueData, isLoading, refetch } = useAllQueues()
  const callNextMutation = useCallNext()

  const allItems = allQueueData?.data ?? []

  // Filter by room if selected
  const queueItems = filterRoomId
    ? allItems.filter((q) => q.room_id === filterRoomId)
    : allItems

  const waiting = queueItems.filter((q) => q.status === 'menunggu')
  const called = queueItems.filter((q) => q.status === 'dipanggil')
  const served = queueItems.filter((q) => q.status === 'dilayani')
  const done = queueItems.filter((q) => q.status === 'selesai')

  const activeRoom = rooms.find((r) => r.id === filterRoomId)

  function handleCallNext() {
    // If a specific poli is selected, use it. Otherwise auto-detect from first waiting patient.
    let targetRoomId = filterRoomId
    if (!targetRoomId) {
      const firstWaiting = allItems.find((q) => q.status === 'menunggu')
      if (firstWaiting) {
        targetRoomId = firstWaiting.room_id
      } else {
        toast.info('Tidak ada antrian yang menunggu')
        return
      }
    }
    callNextMutation.mutate(targetRoomId, {
      onSuccess: (res) => {
        if (res.data) {
          toast.success(
            `Antrian ${res.data.nomor_antrian} — ${res.data.patient_nama} dipanggil`,
          )
        } else {
          toast.info('Tidak ada antrian yang menunggu')
        }
      },
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pendaftaran"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Antrian</h1>
            <p className="text-muted-foreground">
              Kelola antrian poli hari ini
              <span className="text-xs ml-2">(auto-refresh 10 detik)</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/display-antrian${filterRoomId ? `?room=${filterRoomId}` : ''}`} target="_blank">
              <Monitor className="h-4 w-4 mr-1" />
              Display TV
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/kiosk" target="_blank">
              <TabletSmartphone className="h-4 w-4 mr-1" />
              Kiosk
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <PermissionGate permission="queue:manage">
            <Button
              size="sm"
              onClick={handleCallNext}
              disabled={callNextMutation.isPending || waiting.length === 0}
              title={waiting.length === 0 ? 'Tidak ada antrian menunggu' : ''}
            >
              <Bell className="h-4 w-4 mr-1" />
              Panggil Berikutnya
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Room filter */}
      <Select
        value={filterRoomId}
        onChange={(e) => setFilterRoomId(e.target.value)}
        className="max-w-sm"
      >
        <option value="">Semua Poli / Ruangan</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.kode} — {r.nama}
          </option>
        ))}
      </Select>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold">{waiting.length}</p>
            <p className="text-xs text-muted-foreground">Menunggu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{called.length}</p>
            <p className="text-xs text-muted-foreground">Dipanggil</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-primary">{served.length}</p>
            <p className="text-xs text-muted-foreground">Dilayani</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-green-600">{done.length}</p>
            <p className="text-xs text-muted-foreground">Selesai</p>
          </CardContent>
        </Card>
      </div>

      {/* Currently called */}
      {called.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sedang Dipanggil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              {called.map((q) => (
                <div key={q.id} className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center text-xl font-bold">
                    {q.nomor_antrian}
                  </div>
                  <div>
                    <p className="font-medium">{q.patient_nama}</p>
                    <p className="text-sm text-muted-foreground">
                      {q.no_rekam_medis}
                      {q.room_nama && (
                        <span className="ml-1">· {q.room_nama}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daftar Antrian — {activeRoom?.nama || 'Semua Poli / Ruangan'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : queueItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada antrian hari ini
            </p>
          ) : (
            <div className="divide-y">
              {queueItems.map((q) => (
                <div
                  key={q.id}
                  className={cn(
                    'flex items-center gap-4 py-3',
                    q.status === 'dipanggil' && 'bg-yellow-50 dark:bg-yellow-950 -mx-6 px-6 rounded',
                  )}
                >
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                      q.status === 'menunggu' && 'bg-muted',
                      q.status === 'dipanggil' && 'bg-yellow-200 dark:bg-yellow-800',
                      q.status === 'dilayani' && 'bg-primary/10 text-primary',
                      q.status === 'selesai' && 'bg-green-100 text-green-800',
                      q.status === 'batal' && 'bg-red-100 text-red-800 line-through',
                    )}
                  >
                    {q.nomor_antrian}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{q.patient_nama}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.no_rekam_medis} · {q.visit_number}
                      {q.room_nama && !filterRoomId && (
                        <span className="ml-1">
                          · <span className="font-medium">{q.room_nama}</span>
                        </span>
                      )}
                      {q.penjamin !== 'umum' && (
                        <span className="ml-1">
                          · <span className="uppercase">{q.penjamin}</span>
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {q.is_laka_lantas && (
                      <Badge className="bg-amber-500 text-white text-[10px]">LAKA</Badge>
                    )}
                    {q.room_nama && !filterRoomId && (
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                        {q.room_kode || q.room_nama}
                      </Badge>
                    )}
                    <Badge variant={STATUS_COLORS[q.status] || 'outline'}>
                      {STATUS_LABELS[q.status] || q.status}
                    </Badge>
                    {q.called_at && (
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(q.called_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
