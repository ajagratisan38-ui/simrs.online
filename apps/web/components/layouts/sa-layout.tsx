'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { logoutApi } from '@/lib/api/auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  CreditCard,
  Package,
  Settings,
  Activity,
  Shield,
  LogOut,
  Menu,
  ChevronRight,
  Monitor,
  Users,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'

interface SAMenuItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  exact?: boolean
  ownerOnly?: boolean
}

const SA_MENU: SAMenuItem[] = [
  {
    label: 'Dashboard',
    href: '/sa',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Pendaftaran RS',
    href: '/sa/registrations',
    icon: ClipboardCheck,
  },
  {
    label: 'Kelola Tenant',
    href: '/sa/tenants',
    icon: Building2,
  },
  {
    label: 'Verifikasi Pembayaran',
    href: '/sa/payments',
    icon: CreditCard,
  },
  {
    label: 'Paket & Transaksi',
    href: '/sa/plans',
    icon: Package,
    ownerOnly: true,
  },
  {
    label: 'Monitoring',
    href: '/sa/monitoring',
    icon: Monitor,
  },
  {
    label: 'Pengaturan Platform',
    href: '/sa/settings',
    icon: Settings,
    ownerOnly: true,
  },
  {
    label: 'Super Admin',
    href: '/sa/super-admins',
    icon: Users,
    ownerOnly: true,
  },
  {
    label: 'Activity Log',
    href: '/sa/activity',
    icon: Activity,
  },
]

export function SALayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const isOwner = user?.saRole === 'owner'
  const visibleMenu = SA_MENU.filter((item) => !item.ownerOnly || isOwner)

  const sidebarWidth = collapsed ? 64 : 250

  const handleLogout = async () => {
    try { await logoutApi() } catch { /* noop */ }
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-gradient-to-r from-indigo-700 to-indigo-800 dark:from-indigo-900 dark:to-indigo-950 text-white flex items-center px-4 shadow-lg">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden mr-3 p-1.5 rounded-md hover:bg-white/10 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex mr-3 p-1.5 rounded-md hover:bg-white/10 transition-colors"
          title={collapsed ? 'Perlebar sidebar' : 'Perkecil sidebar'}
        >
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <Link href="/sa" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-base leading-none">SIMRS</span>
            <span className="text-indigo-200 text-xs ml-1.5">Super Admin</span>
          </div>
          <span className="font-bold text-base sm:hidden">SA Panel</span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-1.5">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <span className={cn(
                'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full',
                isOwner
                  ? 'bg-amber-400/20 text-amber-200'
                  : 'bg-white/15 text-indigo-200',
              )}>
                {isOwner ? 'owner' : 'operator'}
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">{user?.email}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Sidebar — Desktop */}
      <aside
        className={cn(
          'fixed top-14 left-0 bottom-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-all duration-200 ease-in-out flex-col hidden lg:flex',
        )}
        style={{ width: sidebarWidth }}
      >
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleMenu.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-lg text-[13px] font-medium transition-all',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-indigo-600 dark:text-indigo-400')} />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Environment</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  process.env.NODE_ENV === 'production' ? 'bg-emerald-500' : 'bg-amber-500',
                )} />
                {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
              </p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <span className={cn(
              'h-2 w-2 rounded-full',
              process.env.NODE_ENV === 'production' ? 'bg-emerald-500' : 'bg-amber-500',
            )} />
          </div>
        )}
      </aside>

      {/* Sidebar — Mobile (overlay) */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed top-14 left-0 bottom-0 w-[250px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 flex flex-col lg:hidden animate-in slide-in-from-left duration-200">
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {visibleMenu.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                    )}
                  >
                    <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-indigo-600 dark:text-indigo-400')} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                  </Link>
                )
              })}
            </nav>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Environment</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    process.env.NODE_ENV === 'production' ? 'bg-emerald-500' : 'bg-amber-500',
                  )} />
                  {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
                </p>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <main
        className="pt-14 transition-all duration-200 ease-in-out"
        style={{ paddingLeft: `max(0px, ${sidebarWidth}px)` }}
      >
        <div className="p-5 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>

      {/* CSS for lg breakpoint paddingLeft override on mobile */}
      <style jsx>{`
        @media (max-width: 1023px) {
          main { padding-left: 0 !important; }
        }
      `}</style>
    </div>
  )
}
