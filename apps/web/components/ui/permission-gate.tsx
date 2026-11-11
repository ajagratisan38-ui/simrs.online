'use client'

import type { Permission, Role } from '@simrs/shared-types'
import { usePermissions } from '@/hooks/use-permissions'

interface PermissionGateProps {
  children: React.ReactNode
  permission?: Permission
  permissions?: Permission[]
  roles?: Role[]
  requireAll?: boolean
  fallback?: React.ReactNode
}

export function PermissionGate({
  children,
  permission,
  permissions,
  roles,
  requireAll = false,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasRole } = usePermissions()

  // Cek role dulu jika diberikan
  if (roles && roles.length > 0) {
    if (!hasRole(...roles)) {
      return <>{fallback}</>
    }
  }

  // Cek single permission
  if (permission) {
    if (!hasPermission(permission)) {
      return <>{fallback}</>
    }
  }

  // Cek multiple permissions
  if (permissions && permissions.length > 0) {
    if (requireAll) {
      const allGranted = permissions.every((p) => hasPermission(p))
      if (!allGranted) return <>{fallback}</>
    } else {
      if (!hasAnyPermission(...permissions)) return <>{fallback}</>
    }
  }

  return <>{children}</>
}
