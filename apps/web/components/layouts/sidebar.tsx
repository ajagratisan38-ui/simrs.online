'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  Pill,
  Wallet,
  FlaskConical,
  ScanLine,
  BarChart3,
  Settings,
  UserPlus,
  ListOrdered,
  ScrollText,
  Package,
  UserCog,
  Building2,
  AlertTriangle,
  RefreshCw,
  Cloud,
  ChevronDown,
  BookOpen,
  BookMarked,
  Ambulance,
  BedDouble,
  CreditCard,
  Truck,
  Shield,
  Upload,
  Database,
  HardDrive,
  Utensils,
  ShieldAlert,
  Calculator,
  Heart,
  Scissors,
  ClipboardCheck,
  Briefcase,
  type LucideIcon,
} from 'lucide-react'
import type { MenuItem } from '@simrs/shared-types'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  Pill,
  Wallet,
  FlaskConical,
  ScanLine,
  BarChart3,
  Settings,
  UserPlus,
  ListOrdered,
  ScrollText,
  Package,
  UserCog,
  Building2,
  AlertTriangle,
  RefreshCw,
  Cloud,
  BookOpen,
  BookMarked,
  Ambulance,
  BedDouble,
  CreditCard,
  Truck,
  Shield,
  Upload,
  Database,
  HardDrive,
  Utensils,
  ShieldAlert,
  Calculator,
  Heart,
  Scissors,
  ClipboardCheck,
  Briefcase,
}

function SidebarItem({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const Icon = ICON_MAP[item.icon]
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const hasChildren = item.children && item.children.length > 0

  // Auto-expand jika salah satu child aktif
  const childActive = item.children?.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
  )

  const expanded = open || childActive

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(!expanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
            isActive || childActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {expanded && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map((child) => (
              <SidebarItem key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      style={{ paddingLeft: `${12 + depth * 12}px` }}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{item.label}</span>
    </Link>
  )
}

export function Sidebar() {
  const { user } = useAuthStore()
  const { menuItems } = usePermissions()

  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">SIMRS</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            SaaS
          </span>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => (
          <SidebarItem key={item.href} item={item} />
        ))}
      </nav>

      {/* User info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
