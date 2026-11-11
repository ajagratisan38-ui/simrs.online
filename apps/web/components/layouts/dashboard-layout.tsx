'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { logoutApi } from '@/lib/api/auth'
import { TopNavbar } from '@/components/layouts/top-navbar'
import { OnlineStatusBanner } from '@/components/ui/online-status-banner'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try {
      await logoutApi()
    } catch {
      // tetap logout meskipun API gagal
    } finally {
      clearAuth()
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar onLogout={handleLogout} />
      <div className="pt-14">
        <OnlineStatusBanner />
        <main className="p-4 lg:p-6 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  )
}
