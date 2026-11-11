'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity, Wrench, ArrowLeft, RefreshCw } from 'lucide-react'
import { getRegistrationConfig } from '@/lib/api/registration'

export default function MaintenancePage() {
  const [brandName, setBrandName] = useState('SIMRS')

  useEffect(() => {
    getRegistrationConfig()
      .then((cfg) => { if (cfg.platform_name) setBrandName(cfg.platform_name) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-6">
          <Wrench className="h-10 w-10 text-amber-600" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-extrabold text-slate-900 dark:text-white">{brandName}</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Sedang Maintenance
        </h1>
        <p className="text-slate-500 mb-2">
          Platform sedang dalam pemeliharaan terjadwal untuk peningkatan layanan.
        </p>
        <p className="text-sm text-slate-400 mb-8">
          Silakan coba beberapa saat lagi. Kami mohon maaf atas ketidaknyamanannya.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Coba Lagi
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
        </div>

        <div className="mt-10 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg">
          <p className="text-xs text-slate-400">
            Jika Anda adalah Super Admin, panel admin tetap dapat diakses di{' '}
            <Link href="/sa" className="text-teal-600 hover:underline font-medium">/sa</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
