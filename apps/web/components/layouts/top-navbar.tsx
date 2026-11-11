'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, ClipboardList, Users, FileText, Pill,
  Wallet, FlaskConical, ScanLine, BarChart3, Settings,
  UserPlus, ListOrdered, ScrollText, Package, UserCog,
  Building2, AlertTriangle, RefreshCw, Cloud, ChevronDown,
  BookOpen, BookMarked, Ambulance, BedDouble, CreditCard, Menu, X, Scissors, Utensils, Truck,
  ShoppingCart, ArrowRightLeft, Upload, Database, HardDrive, DoorOpen,
  LogOut, HelpCircle, Activity, MoreHorizontal,
  Sun, Moon, Monitor, CheckCircle2, XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { MenuItem } from '@simrs/shared-types'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useSyncStatus } from '@/hooks/use-sync'
import { cn } from '@/lib/utils'
import { NotificationToggle } from '@/components/pwa/notification-toggle'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, ClipboardList, Users, FileText, Pill,
  Wallet, FlaskConical, ScanLine, BarChart3, Settings,
  UserPlus, ListOrdered, ScrollText, Package, UserCog,
  Building2, AlertTriangle, RefreshCw, Cloud,
  BookOpen, BookMarked, Ambulance, BedDouble, CreditCard, Scissors, Utensils,
  ShoppingCart, ArrowRightLeft, Upload, Database, HardDrive, Truck, DoorOpen,
}

interface TopNavbarProps {
  onLogout: () => void
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

function NavDropdown({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const Icon = ICON_MAP[item.icon]

  const childActive = item.children?.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
  )

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200)
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
          childActive
            ? 'bg-white/20 text-white'
            : 'text-white/80 hover:bg-white/10 hover:text-white',
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span>{item.label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-52 rounded-lg border bg-popover shadow-lg z-[100] py-1 animate-in fade-in-0 zoom-in-95">
          {item.children?.map((child) => {
            const ChildIcon = ICON_MAP[child.icon]
            const isChildActive =
              pathname === child.href || pathname.startsWith(child.href + '/')
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                  isChildActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-popover-foreground hover:bg-accent',
                )}
              >
                {ChildIcon && <ChildIcon className="h-4 w-4" />}
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NavLink({ item }: { item: MenuItem }) {
  const pathname = usePathname()
  const Icon = ICON_MAP[item.icon]
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
        isActive
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:bg-white/10 hover:text-white',
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{item.label}</span>
    </Link>
  )
}

function OverflowMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const anyActive = items.some(
    (item) =>
      pathname === item.href ||
      pathname.startsWith(item.href + '/') ||
      item.children?.some(
        (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
      ),
  )

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200)
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (items.length === 0) return null

  return (
    <div
      className="relative shrink-0"
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
          anyActive
            ? 'bg-white/20 text-white'
            : 'text-white/80 hover:bg-white/10 hover:text-white',
        )}
        title={`${items.length} menu lainnya`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border bg-popover shadow-lg z-[100] py-1 animate-in fade-in-0 zoom-in-95 max-h-[70vh] overflow-y-auto">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon]
            const hasChildren = item.children && item.children.length > 0

            if (hasChildren) {
              return (
                <OverflowSubmenu key={item.href} item={item} onClose={() => setOpen(false)} />
              )
            }

            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-popover-foreground hover:bg-accent',
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OverflowSubmenu({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [subOpen, setSubOpen] = useState(false)
  const pathname = usePathname()
  const Icon = ICON_MAP[item.icon]
  const childActive = item.children?.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
  )

  return (
    <div>
      <button
        onClick={() => setSubOpen(!subOpen)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
          childActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-popover-foreground hover:bg-accent',
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', subOpen && 'rotate-180')}
        />
      </button>
      {subOpen && (
        <div className="bg-accent/30">
          {item.children?.map((child) => {
            const ChildIcon = ICON_MAP[child.icon]
            const isChildActive =
              pathname === child.href || pathname.startsWith(child.href + '/')
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 pl-9 pr-3 py-2 text-sm transition-colors',
                  isChildActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-popover-foreground hover:bg-accent',
                )}
              >
                {ChildIcon && <ChildIcon className="h-4 w-4" />}
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function UserDropdown({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pending, conflicts, syncing } = useSyncStatus()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const syncColor = !navigator.onLine
    ? 'bg-red-500'
    : syncing
      ? 'bg-teal-500'
      : conflicts > 0
        ? 'bg-red-500'
        : pending > 0
          ? 'bg-yellow-500'
          : 'bg-emerald-500'

  const syncLabel = !navigator.onLine
    ? 'Offline'
    : syncing
      ? 'Menyinkronkan...'
      : conflicts > 0
        ? `${conflicts} konflik`
        : pending > 0
          ? `${pending} pending`
          : 'Tersinkronisasi'

  const syncIcon = !navigator.onLine
    ? XCircle
    : syncing
      ? RefreshCw
      : conflicts > 0
        ? XCircle
        : pending > 0
          ? AlertTriangle
          : CheckCircle2

  const SyncIcon = syncIcon

  const activeTheme = mounted ? theme : 'system'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-colors',
          'hover:bg-white/10',
          open && 'bg-white/15',
        )}
      >
        <div className="relative">
          <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-teal-700',
              syncColor,
            )}
          />
        </div>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-white/60 transition-transform hidden sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border bg-popover shadow-xl z-[100] animate-in fade-in-0 zoom-in-95 overflow-hidden">
          {/* User header */}
          <div className="px-4 py-3 bg-accent/40 border-b">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Sync status */}
          <Link
            href="/admin/sync"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
          >
            <SyncIcon
              className={cn(
                'h-4 w-4 shrink-0',
                !navigator.onLine
                  ? 'text-red-500'
                  : syncing
                    ? 'text-teal-500 animate-spin'
                    : conflicts > 0
                      ? 'text-red-500'
                      : pending > 0
                        ? 'text-yellow-500'
                        : 'text-emerald-500',
              )}
            />
            <span className="flex-1">{syncLabel}</span>
            <div className={cn('h-2 w-2 rounded-full', syncColor)} />
          </Link>

          <div className="h-px bg-border" />

          {/* Panduan */}
          <Link
            href="/panduan"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span>Panduan</span>
          </Link>

          {/* Push Notifications */}
          <NotificationToggle className="px-4 py-2.5" />

          <div className="h-px bg-border" />

          {/* Theme switcher */}
          <div className="px-4 py-2.5">
            <p className="text-xs text-muted-foreground mb-2">Tema</p>
            <div className="flex gap-1">
              {([
                { value: 'light', icon: Sun, label: 'Terang' },
                { value: 'dark', icon: Moon, label: 'Gelap' },
                { value: 'system', icon: Monitor, label: 'Sistem' },
              ] as const).map(({ value, icon: ThemeIcon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                    activeTheme === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-accent text-muted-foreground',
                  )}
                >
                  <ThemeIcon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Logout */}
          <button
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </div>
  )
}

function MobileMenuItem({
  item,
  onClose,
  depth = 0,
}: {
  item: MenuItem
  onClose: () => void
  depth?: number
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const Icon = ICON_MAP[item.icon]
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const hasChildren = item.children && item.children.length > 0
  const childActive = item.children?.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
  )

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
            childActive ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-accent',
          )}
          style={{ paddingLeft: `${16 + depth * 16}px` }}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', (open || childActive) && 'rotate-180')}
          />
        </button>
        {(open || childActive) && (
          <div className="border-l-2 border-primary/10 ml-8">
            {item.children!.map((child) => (
              <MobileMenuItem key={child.href} item={child} onClose={onClose} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
        isActive ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-accent',
      )}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{item.label}</span>
    </Link>
  )
}

export function TopNavbar({ onLogout }: TopNavbarProps) {
  const { user } = useAuthStore()
  const { menuItems } = usePermissions()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const wrapperRef = useRef<HTMLDivElement>(null)
  const measurerRef = useRef<HTMLDivElement>(null)
  const itemWidthsRef = useRef<number[]>([])
  const [visibleCount, setVisibleCount] = useState<number | null>(null)

  const navItems = menuItems.filter(
    (item) => item.href !== '/dashboard' && item.href !== '/panduan',
  )

  const measureItemWidths = useCallback(() => {
    if (!measurerRef.current) return
    const children = measurerRef.current.children
    const widths: number[] = []
    for (let i = 0; i < children.length; i++) {
      widths.push((children[i] as HTMLElement).offsetWidth)
    }
    itemWidthsRef.current = widths
  }, [])

  const recalculate = useCallback(() => {
    if (!wrapperRef.current) return
    if (itemWidthsRef.current.length === 0) {
      measureItemWidths()
    }
    if (itemWidthsRef.current.length === 0) return

    const availableWidth = wrapperRef.current.offsetWidth
    const overflowBtnWidth = 36
    const gap = 2
    let usedWidth = 0
    let count = 0
    const widths = itemWidthsRef.current

    const totalNeeded = widths.reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0)

    if (totalNeeded <= availableWidth) {
      setVisibleCount(widths.length)
      return
    }

    for (let i = 0; i < widths.length; i++) {
      const w = widths[i] ?? 0
      const needed = w + (i > 0 ? gap : 0)
      if (usedWidth + needed + gap + overflowBtnWidth > availableWidth) {
        break
      }
      usedWidth += needed
      count++
    }

    setVisibleCount(Math.max(count, 1))
  }, [measureItemWidths])

  useIsomorphicLayoutEffect(() => {
    measureItemWidths()
    recalculate()
  }, [navItems.length, measureItemWidths, recalculate])

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new ResizeObserver(() => recalculate())
    observer.observe(el)
    return () => observer.disconnect()
  }, [recalculate])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const safeCount = visibleCount ?? navItems.length
  const visibleItems = navItems.slice(0, safeCount)
  const overflowItems = navItems.slice(safeCount)

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-gradient-to-r from-teal-700 via-teal-600 to-teal-600 shadow-md print:hidden">
        <div className="h-full px-2 lg:px-3 flex items-center">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 mr-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight hidden sm:block">
              SIMRS
            </span>
          </Link>

          {/* Desktop nav area — NO overflow-hidden so dropdowns can render */}
          <div
            ref={wrapperRef}
            className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0"
          >
            {visibleItems.map((item) =>
              item.children && item.children.length > 0 ? (
                <NavDropdown key={item.href} item={item} />
              ) : (
                <NavLink key={item.href} item={item} />
              ),
            )}

            {overflowItems.length > 0 && (
              <OverflowMenu items={overflowItems} />
            )}
          </div>

          {/* Hidden measurer — positioned way off-screen, renders ALL items for width measurement */}
          <div
            ref={measurerRef}
            aria-hidden="true"
            className="lg:flex items-center gap-0.5 pointer-events-none"
            style={{
              position: 'fixed',
              top: -9999,
              left: -9999,
              visibility: 'hidden',
              display: 'flex',
            }}
          >
            {navItems.map((item) => {
              const Icon = ICON_MAP[item.icon]
              const hasChildren = item.children && item.children.length > 0
              return (
                <div
                  key={`measure-${item.href}`}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium whitespace-nowrap"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span>{item.label}</span>
                  {hasChildren && <ChevronDown className="h-3 w-3" />}
                </div>
              )
            })}
          </div>

          {/* Right side — compact: user dropdown only */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <div className="hidden lg:block">
              <UserDropdown onLogout={onLogout} />
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 bottom-0 z-50 lg:hidden bg-background overflow-y-auto animate-in slide-in-from-top-2">
            <div className="px-4 py-4 border-b bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="py-2">
              {menuItems.map((item) => (
                <MobileMenuItem
                  key={item.href}
                  item={item}
                  onClose={() => setMobileOpen(false)}
                />
              ))}
            </div>

            <div className="border-t p-4">
              <button
                onClick={() => {
                  setMobileOpen(false)
                  onLogout()
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
