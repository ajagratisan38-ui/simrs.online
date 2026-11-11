'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Volume2, VolumeX, Maximize, Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAllQueues, useRooms } from '@/hooks/use-queues'
import { cn } from '@/lib/utils'
import type { QueueItemWithRoom } from '@/lib/api/queues'

export default function DisplayAntrianPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Memuat Display Antrian...</div>
      </div>
    }>
      <DisplayAntrianContent />
    </Suspense>
  )
}

function DisplayAntrianContent() {
  const searchParams = useSearchParams()
  const initialRoom = searchParams.get('room') || ''

  const [filterRoomId, setFilterRoomId] = useState(initialRoom)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(true)
  const [lastCalledId, setLastCalledId] = useState<string | null>(null)

  const prevCalledRef = useRef<Set<string>>(new Set())

  const { data: roomsData } = useRooms()
  const rooms = roomsData?.data ?? []

  const { data: allQueueData } = useAllQueues()
  const allItems: QueueItemWithRoom[] = allQueueData?.data ?? []

  const queueItems = filterRoomId
    ? allItems.filter((q) => q.room_id === filterRoomId)
    : allItems

  const called = queueItems.filter((q) => q.status === 'dipanggil')
  const waiting = queueItems.filter((q) => q.status === 'menunggu')
  const served = queueItems.filter((q) => q.status === 'dilayani')

  const currentCalled = called.length > 0 ? called[called.length - 1] : null

  const playBell = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(830, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
      osc.frequency.setValueAtTime(830, ctx.currentTime + 0.35)
      gain.gain.setValueAtTime(0.6, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.6)
    } catch {
      // Audio not available
    }
  }, [soundEnabled])

  useEffect(() => {
    const currentCalledIds = new Set(called.map((q) => q.id))
    for (const id of currentCalledIds) {
      if (!prevCalledRef.current.has(id)) {
        playBell()
        setLastCalledId(id)
        break
      }
    }
    prevCalledRef.current = currentCalledIds
  }, [called, playBell])

  useEffect(() => {
    if (showSettings) {
      const timer = setTimeout(() => setShowSettings(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [showSettings])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const [clock, setClock] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const clockTime = clock.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const clockDate = clock.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const activeRoomName = filterRoomId
    ? rooms.find((r) => r.id === filterRoomId)?.nama || 'Semua'
    : 'Semua Poli / Ruangan'

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950 text-white relative select-none cursor-pointer"
      onClick={() => setShowSettings(true)}
    >
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/30">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold tracking-wider">SIMRS</span>
          </div>
          <div>
            <div className="text-xl font-semibold">{activeRoomName}</div>
            <div className="text-sm text-blue-300">Sistem Antrean Digital</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold tracking-wider">
            {clockTime}
          </div>
          <div className="text-sm text-blue-300">{clockDate}</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-3 gap-6 p-8 h-[calc(100vh-100px)]">
        {/* LEFT: CURRENTLY CALLED */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="text-center text-lg font-semibold text-blue-300 uppercase tracking-widest">
            Sedang Dipanggil
          </div>

          {currentCalled ? (
            <div
              className={cn(
                'flex-1 rounded-2xl flex flex-col items-center justify-center p-8',
                'bg-gradient-to-b from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/50',
                lastCalledId === currentCalled.id && 'animate-pulse',
              )}
            >
              <div className="text-[120px] font-black leading-none text-yellow-400 drop-shadow-lg">
                {currentCalled.nomor_antrian}
              </div>
              <div className="mt-4 text-2xl font-bold text-white">
                {currentCalled.patient_nama}
              </div>
              <div className="mt-2 text-lg text-blue-300">
                {currentCalled.no_rekam_medis}
              </div>
              {currentCalled.room_nama && (
                <div className="mt-3 bg-blue-600/50 rounded-full px-6 py-2 text-lg font-medium">
                  {currentCalled.room_nama}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 rounded-2xl flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10">
              <div className="text-6xl text-white/20 font-bold">—</div>
              <div className="mt-4 text-lg text-white/30">
                Belum ada panggilan
              </div>
            </div>
          )}

          {called.length > 1 && (
            <div className="space-y-2">
              <div className="text-xs text-blue-400 uppercase tracking-wider text-center">
                Panggilan sebelumnya
              </div>
              {called.slice(0, -1).reverse().slice(0, 3).map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3"
                >
                  <span className="text-2xl font-bold text-yellow-400">
                    {q.nomor_antrian}
                  </span>
                  <span className="text-sm text-white/70">{q.patient_nama}</span>
                  <span className="text-xs text-blue-300">{q.room_nama}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MIDDLE: WAITING LIST */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="text-center text-lg font-semibold text-blue-300 uppercase tracking-widest">
            Menunggu
            <Badge className="ml-2 bg-blue-600 text-white text-sm">
              {waiting.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl bg-white/5 border border-white/10">
            <div className="divide-y divide-white/5 overflow-y-auto h-full">
              {waiting.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white/30 text-lg">
                  Tidak ada antrian
                </div>
              ) : (
                waiting.slice(0, 15).map((q, i) => (
                  <div
                    key={q.id}
                    className={cn(
                      'flex items-center gap-4 px-6 py-4',
                      i === 0 && 'bg-blue-500/10',
                    )}
                  >
                    <div className="text-3xl font-bold text-blue-400 w-16 text-center">
                      {q.nomor_antrian}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium truncate">
                        {q.patient_nama}
                      </div>
                      <div className="text-xs text-blue-300/70">
                        {q.room_nama || q.no_rekam_medis}
                      </div>
                    </div>
                    {i === 0 && (
                      <div className="text-xs bg-blue-600/50 rounded-full px-3 py-1">
                        Selanjutnya
                      </div>
                    )}
                  </div>
                ))
              )}
              {waiting.length > 15 && (
                <div className="text-center py-3 text-sm text-white/40">
                  +{waiting.length - 15} antrian lagi
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: CURRENTLY BEING SERVED */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="text-center text-lg font-semibold text-blue-300 uppercase tracking-widest">
            Sedang Dilayani
            <Badge className="ml-2 bg-green-600 text-white text-sm">
              {served.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl bg-white/5 border border-white/10">
            <div className="divide-y divide-white/5 overflow-y-auto h-full">
              {served.length === 0 ? (
                <div className="flex items-center justify-center h-full text-white/30 text-lg">
                  Belum ada
                </div>
              ) : (
                served.slice(0, 15).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    <div className="text-3xl font-bold text-green-400 w-16 text-center">
                      {q.nomor_antrian}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium truncate">
                        {q.patient_nama}
                      </div>
                      <div className="text-xs text-green-300/70">
                        {q.room_nama || q.no_rekam_medis}
                      </div>
                    </div>
                    <div className="text-xs bg-green-600/40 rounded-full px-3 py-1">
                      Dilayani
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM TICKER */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-900/80 border-t border-blue-700/50 px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-blue-300">
            Total hari ini: {queueItems.length} pasien
            &nbsp;•&nbsp;
            Menunggu: {waiting.length}
            &nbsp;•&nbsp;
            Dipanggil: {called.length}
            &nbsp;•&nbsp;
            Dilayani: {served.length}
          </div>
          <div className="text-sm text-blue-300">
            Auto-refresh setiap 10 detik
          </div>
        </div>
      </div>

      {/* FLOATING SETTINGS (auto-hide) */}
      {showSettings && (
        <div
          className="fixed top-4 right-4 bg-black/80 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-white/10 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Settings className="h-4 w-4" />
            <span>Pengaturan Display</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/pendaftaran/antrian">
              <Button variant="outline" size="sm" className="text-white border-white/20">
                <ArrowLeft className="h-3 w-3 mr-1" />
                Kembali
              </Button>
            </Link>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Filter Poli
            </label>
            <Select
              value={filterRoomId}
              onChange={(e) => setFilterRoomId(e.target.value)}
              className="bg-white/10 border-white/20 text-white text-sm"
            >
              <option value="">Semua Poli / Ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white border-white/20"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 mr-1" />
              ) : (
                <VolumeX className="h-4 w-4 mr-1" />
              )}
              {soundEnabled ? 'Suara ON' : 'Suara OFF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white border-white/20"
            >
              <Maximize className="h-4 w-4 mr-1" />
              Fullscreen
            </Button>
          </div>

          <div className="text-[10px] text-white/30">
            Klik di mana saja untuk tampilkan pengaturan
          </div>
        </div>
      )}
    </div>
  )
}
