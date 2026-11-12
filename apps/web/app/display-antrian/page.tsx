'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Volume2, VolumeX, Maximize, Minimize, Settings,
  ArrowLeft, Users, PhoneCall, Clock, Activity, X,
  Monitor,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAllQueues, useRooms } from '@/hooks/use-queues'
import { cn } from '@/lib/utils'
import type { QueueItemWithRoom } from '@/lib/api/queues'

export default function DisplayAntrianPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-3 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          <div className="text-white/60 text-lg">Memuat Display Antrian...</div>
        </div>
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
  const [showSettings, setShowSettings] = useState(false)
  const [lastCalledId, setLastCalledId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

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
    ? rooms.find((r) => r.id === filterRoomId)?.nama || 'Semua Poli'
    : 'Semua Poli / Ruangan'

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex flex-col select-none overflow-hidden">
      {/* ─── TOP BAR ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-blue-900/80 to-blue-800/60 border-b border-blue-700/30">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl px-5 py-2.5 shadow-lg shadow-blue-500/20">
            <span className="text-2xl font-extrabold tracking-wider">SIMRS</span>
          </div>
          <div>
            <div className="text-xl font-bold">{activeRoomName}</div>
            <div className="text-sm text-blue-300/80 font-medium">Sistem Antrean Digital</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Quick controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                'p-2.5 rounded-lg transition-all',
                soundEnabled
                  ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
              )}
              title={soundEnabled ? 'Suara Aktif' : 'Suara Mati'}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
              title="Fullscreen"
            >
              {isFullscreen
                ? <Minimize className="h-5 w-5" />
                : <Maximize className="h-5 w-5" />
              }
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'p-2.5 rounded-lg transition-all',
                showSettings
                  ? 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white',
              )}
              title="Pengaturan"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          {/* Clock */}
          <div className="text-right pl-4 border-l border-white/10">
            <div className="text-3xl font-mono font-bold tracking-wider tabular-nums">
              {clockTime}
            </div>
            <div className="text-xs text-blue-300/70">{clockDate}</div>
          </div>
        </div>
      </div>

      {/* ─── SETTINGS PANEL ──────────────────────────────────────────── */}
      {showSettings && (
        <div className="bg-blue-950/95 border-b border-blue-700/30 px-8 py-4">
          <div className="flex items-center gap-6">
            <Link href="/pendaftaran/antrian">
              <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-400/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:text-white text-sm font-medium transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke Antrian
              </button>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <label className="text-sm text-blue-300 font-medium">Filter Poli:</label>
              <select
                value={filterRoomId}
                onChange={(e) => setFilterRoomId(e.target.value)}
                className="bg-slate-800 border border-blue-400/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-slate-800 [&>option]:text-white"
              >
                <option value="">Semua Poli / Ruangan</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.nama}</option>
                ))}
              </select>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 gap-5 p-6 min-h-0">
        {/* LEFT: SEDANG DIPANGGIL (5 cols) */}
        <div className="col-span-5 flex flex-col gap-4 min-h-0">
          {/* Column header */}
          <div className="flex items-center justify-center gap-2.5 py-2">
            <PhoneCall className="h-5 w-5 text-amber-400" />
            <span className="text-base font-bold text-amber-400 uppercase tracking-[0.2em]">
              Sedang Dipanggil
            </span>
          </div>

          {/* Main call display */}
          {currentCalled ? (
            <div
              className={cn(
                'flex-1 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden',
                'bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent',
                'border-2 border-amber-500/40',
              )}
            >
              {/* Animated glow ring */}
              {lastCalledId === currentCalled.id && (
                <div className="absolute inset-0 rounded-2xl animate-pulse bg-amber-500/5" />
              )}
              <div className="relative z-10 text-center">
                <div className="text-[130px] font-black leading-none text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                  {currentCalled.nomor_antrian}
                </div>
                <div className="mt-4 text-2xl font-bold text-white">
                  {currentCalled.patient_nama}
                </div>
                <div className="mt-1.5 text-base text-blue-300/80 font-mono">
                  {currentCalled.no_rekam_medis}
                </div>
                {currentCalled.room_nama && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-5 py-2 text-sm font-semibold text-blue-300">
                    <Monitor className="h-4 w-4" />
                    {currentCalled.room_nama}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-2xl flex flex-col items-center justify-center bg-white/[0.03] border border-white/[0.06]">
              <PhoneCall className="h-16 w-16 text-white/10 mb-4" />
              <div className="text-lg text-white/20 font-medium">
                Belum ada panggilan
              </div>
            </div>
          )}

          {/* Previous calls */}
          {called.length > 1 && (
            <div className="space-y-1.5">
              <div className="text-xs text-blue-400/60 uppercase tracking-wider text-center font-semibold">
                Panggilan sebelumnya
              </div>
              {called.slice(0, -1).reverse().slice(0, 3).map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between bg-amber-500/[0.06] border border-amber-500/10 rounded-xl px-4 py-2.5"
                >
                  <span className="text-xl font-bold text-amber-400/80">
                    {q.nomor_antrian}
                  </span>
                  <span className="text-sm text-white/60 truncate mx-3">{q.patient_nama}</span>
                  <span className="text-xs text-blue-300/60 shrink-0">{q.room_nama}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MIDDLE: MENUNGGU (4 cols) */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <div className="flex items-center justify-center gap-2.5 py-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span className="text-base font-bold text-blue-400 uppercase tracking-[0.2em]">
              Menunggu
            </span>
            {waiting.length > 0 && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[28px] text-center">
                {waiting.length}
              </span>
            )}
          </div>

          <div className="flex-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden flex flex-col min-h-0">
            {waiting.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Users className="h-14 w-14 text-white/10 mb-3" />
                <div className="text-base text-white/20 font-medium">Tidak ada antrian</div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                {waiting.slice(0, 20).map((q, i) => (
                  <div
                    key={q.id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3.5 transition-colors',
                      i === 0 && 'bg-blue-500/10',
                    )}
                  >
                    <div className="text-2xl font-bold text-blue-400 w-14 text-center tabular-nums">
                      {q.nomor_antrian}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{q.patient_nama}</div>
                      <div className="text-xs text-blue-300/50">{q.room_nama}</div>
                    </div>
                    {i === 0 && (
                      <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 rounded-full px-2.5 py-1 uppercase tracking-wider shrink-0">
                        Berikutnya
                      </span>
                    )}
                  </div>
                ))}
                {waiting.length > 20 && (
                  <div className="text-center py-3 text-xs text-white/30">
                    +{waiting.length - 20} antrian lagi
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: SEDANG DILAYANI (3 cols) */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0">
          <div className="flex items-center justify-center gap-2.5 py-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span className="text-base font-bold text-emerald-400 uppercase tracking-[0.2em]">
              Dilayani
            </span>
            {served.length > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[28px] text-center">
                {served.length}
              </span>
            )}
          </div>

          <div className="flex-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden flex flex-col min-h-0">
            {served.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Activity className="h-14 w-14 text-white/10 mb-3" />
                <div className="text-base text-white/20 font-medium">Belum ada</div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                {served.slice(0, 20).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className="text-xl font-bold text-emerald-400 w-12 text-center tabular-nums">
                      {q.nomor_antrian}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{q.patient_nama}</div>
                      <div className="text-xs text-emerald-300/50">{q.room_nama}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── BOTTOM BAR ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-3 bg-gradient-to-r from-blue-900/60 to-blue-800/40 border-t border-blue-700/20">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-blue-300/60">
            Total: <span className="text-white font-semibold">{queueItems.length}</span> pasien
          </span>
          <span className="text-amber-400/60">
            Dipanggil: <span className="text-amber-400 font-semibold">{called.length}</span>
          </span>
          <span className="text-blue-400/60">
            Menunggu: <span className="text-blue-400 font-semibold">{waiting.length}</span>
          </span>
          <span className="text-emerald-400/60">
            Dilayani: <span className="text-emerald-400 font-semibold">{served.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          Auto-refresh aktif
        </div>
      </div>
    </div>
  )
}
