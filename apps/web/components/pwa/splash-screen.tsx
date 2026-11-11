'use client'

import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (!isStandalone) {
      setVisible(false)
      return
    }

    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(() => setVisible(false), 500)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-in zoom-in-75 duration-700">
        <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
          <Activity className="h-12 w-12 text-white" />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">SIMRS</h1>
          <p className="text-teal-200 text-sm mt-1">
            Sistem Informasi Manajemen RS
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-4">
          <div
            className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>

      <div className="absolute bottom-8 text-center">
        <p className="text-teal-300/60 text-xs">SaaS Healthcare Platform</p>
      </div>
    </div>
  )
}
