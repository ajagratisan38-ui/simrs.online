'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)

  // Wait for Zustand to hydrate from localStorage before making auth decisions
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    // If already hydrated (fast path)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
    }
    return () => { unsub() }
  }, [])

  // Only redirect AFTER hydration is complete
  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [hydrated, isAuthenticated, router])

  // Show spinner only until hydration completes — not on every isAuthenticated toggle
  if (!hydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 rounded-full animate-spin border-[3px] border-teal-200 border-t-teal-600 dark:border-teal-800 dark:border-t-teal-400 mx-auto" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
