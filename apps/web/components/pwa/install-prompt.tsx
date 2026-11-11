'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const dismissed = localStorage.getItem('simrs-pwa-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setShowPrompt(false)
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowPrompt(false)
    localStorage.setItem('simrs-pwa-dismissed', Date.now().toString())
  }, [])

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[200] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl shadow-2xl p-4 border border-teal-500">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">Install SIMRS</h3>
            <p className="text-xs text-teal-100 mt-0.5">
              Akses lebih cepat dari home screen — tanpa perlu buka browser.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-teal-700 rounded-lg text-xs font-bold hover:bg-teal-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-teal-200 hover:text-white transition-colors"
              >
                Nanti saja
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-teal-200 hover:text-white transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
