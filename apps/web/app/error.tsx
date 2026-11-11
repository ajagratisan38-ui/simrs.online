'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl font-bold text-destructive/30">500</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Terjadi Kesalahan
          </h1>
          <p className="text-muted-foreground">
            Maaf, terjadi kesalahan saat memuat halaman ini.
            Silakan coba lagi atau hubungi administrator.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Coba Lagi
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Ke Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
