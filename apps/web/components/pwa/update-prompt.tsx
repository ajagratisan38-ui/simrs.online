'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, X } from 'lucide-react'

export function PwaUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleUpdate = async () => {
      const reg = await navigator.serviceWorker.ready

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            setRegistration(reg)
            setShowUpdate(true)
          }
        })
      })
    }

    handleUpdate()
  }, [])

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage('SKIP_WAITING')
    }
    window.location.reload()
  }

  if (!showUpdate) return null

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="bg-blue-600 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 border border-blue-500">
        <RefreshCw className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Versi baru tersedia</span>
        <button
          onClick={handleUpdate}
          className="px-3 py-1 bg-white text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors"
        >
          Update
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="text-blue-200 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
