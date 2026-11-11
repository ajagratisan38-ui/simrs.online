'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { SALayout } from '@/components/layouts/sa-layout'

export default function SuperAdminGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
    }
    return () => { unsub() }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (user?.role !== 'superadmin') {
      router.push('/dashboard')
      return
    }
  }, [hydrated, isAuthenticated, user, router])

  if (!hydrated || !isAuthenticated || !user || user.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 rounded-full animate-spin border-[3px] border-indigo-200 border-t-indigo-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Memuat Super Admin...</p>
        </div>
      </div>
    )
  }

  return <SALayout>{children}</SALayout>
}
