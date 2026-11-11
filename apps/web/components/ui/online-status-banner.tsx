'use client'

import { useState, useEffect, useRef } from 'react'
import {
  WifiOff,
  AlertCircle,
  CloudOff,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function OnlineStatusBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const swRegistered = useRef(false)

  // Simple online/offline detection — no health pings, no sync triggers
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }
    const goOnline = () => {
      setIsOnline(true)
      setDismissed(false)
    }
    const goOffline = () => {
      setIsOnline(false)
      setDismissed(false)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Service worker disabled temporarily for debugging scroll issue
  // useEffect(() => {
  //   if (swRegistered.current) return
  //   if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  //   swRegistered.current = true
  //   navigator.serviceWorker.register('/sw.js').catch(() => {})
  // }, [])

  // Only show when actually offline
  if (isOnline || dismissed) return null

  return (
    <div
      className={cn(
        'sticky top-0 z-[60] flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium',
        'bg-amber-500 text-white',
      )}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        Anda sedang offline. Data disimpan secara lokal dan akan
        disinkronkan saat online.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Tutup"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
