import { useMemo } from 'react'
import type { Role, Permission, MenuItem } from '@simrs/shared-types'
import { ROLE_PERMISSIONS, MENU_ITEMS } from '@simrs/constants'
import { useAuthStore } from '@/stores/auth-store'

const HREF_TO_MODULE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/pendaftaran': 'pendaftaran',
  '/pasien': 'pasien',
  '/rekam-medis': 'rekam-medis',
  '/farmasi': 'farmasi',
  '/kasir': 'kasir',
  '/laboratorium': 'laboratorium',
  '/radiologi': 'radiologi',
  '/bedah': 'bedah',
  '/gizi': 'gizi',
  '/igd': 'igd',
  '/keuangan': 'keuangan',
  '/kepegawaian': 'kepegawaian',
  '/mcu': 'mcu',
  '/rawat-inap': 'rawat-inap',
  '/gudang': 'gudang',
  '/laporan': 'laporan',
  '/admin/satusehat': 'satusehat',
}

function isModuleAllowed(href: string, allowedModules: string[], role?: string): boolean {
  if (role === 'admin' || role === 'superadmin') return true
  if (allowedModules.includes('*')) return true

  const moduleName = HREF_TO_MODULE[href]
  if (!moduleName) return true

  return allowedModules.includes(moduleName)
}

export function usePermissions() {
  const { user } = useAuthStore()
  const role = user?.role as Role | undefined
  const allowedModules = user?.allowedModules ?? ['*']

  const permissions = useMemo(() => {
    if (!role) return [] as readonly Permission[]
    return ROLE_PERMISSIONS[role] ?? []
  }, [role])

  const hasPermission = useMemo(() => {
    const permSet = new Set<string>(permissions)
    return (permission: Permission) => permSet.has(permission)
  }, [permissions])

  const hasAnyPermission = useMemo(() => {
    const permSet = new Set<string>(permissions)
    return (...perms: Permission[]) => perms.some((p) => permSet.has(p))
  }, [permissions])

  const hasRole = useMemo(() => {
    return (...roles: Role[]) => !!role && roles.includes(role)
  }, [role])

  const menuItems = useMemo(() => {
    if (!role) return []

    const filterItems = (items: readonly MenuItem[]): MenuItem[] => {
      return items
        .filter((item) => item.roles.includes(role) && isModuleAllowed(item.href, allowedModules, role))
        .map((item) => ({
          ...item,
          children: item.children ? filterItems(item.children) : undefined,
        }))
    }

    return filterItems(MENU_ITEMS)
  }, [role, allowedModules])

  return {
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasRole,
    menuItems,
    allowedModules,
  }
}
