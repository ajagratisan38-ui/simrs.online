import { Request, Response, NextFunction } from 'express'
import { ForbiddenError } from '../shared/errors'

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.role

    if (!userRole) {
      return next(new ForbiddenError('Role tidak ditemukan'))
    }

    if (!allowedRoles.includes(userRole)) {
      return next(new ForbiddenError(`Role '${userRole}' tidak memiliki akses ke resource ini`))
    }

    next()
  }
}
