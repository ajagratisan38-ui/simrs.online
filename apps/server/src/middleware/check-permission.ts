import { Request, Response, NextFunction } from 'express'
import type { Role, Permission } from '@simrs/shared-types'
import { ROLE_PERMISSIONS } from '@simrs/constants'
import { ForbiddenError } from '../shared/errors'

/**
 * Middleware factory — cek apakah role user punya permission tertentu.
 *
 * Contoh: router.get('/patients', authenticate, checkPermission('patient:read'), controller.list)
 */
export function checkPermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.role as Role | undefined

    if (!userRole) {
      return next(new ForbiddenError('Role tidak ditemukan'))
    }

    const rolePerms = ROLE_PERMISSIONS[userRole]
    if (!rolePerms) {
      return next(new ForbiddenError(`Role '${userRole}' tidak dikenali`))
    }

    const allowed = (rolePerms as readonly string[]).includes(permission)
    if (!allowed) {
      return next(
        new ForbiddenError(
          `Role '${userRole}' tidak memiliki permission '${permission}'`,
        ),
      )
    }

    next()
  }
}

/**
 * Middleware factory — cek apakah user punya salah satu dari beberapa permission.
 */
export function checkAnyPermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.role as Role | undefined

    if (!userRole) {
      return next(new ForbiddenError('Role tidak ditemukan'))
    }

    const rolePerms = ROLE_PERMISSIONS[userRole]
    if (!rolePerms) {
      return next(new ForbiddenError(`Role '${userRole}' tidak dikenali`))
    }

    const hasAny = permissions.some((p) =>
      (rolePerms as readonly string[]).includes(p),
    )
    if (!hasAny) {
      return next(
        new ForbiddenError(
          `Role '${userRole}' tidak memiliki permission yang diperlukan`,
        ),
      )
    }

    next()
  }
}
