import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { db } from '../config/database'
import { UnauthorizedError } from '../shared/errors'

interface JwtPayload {
  userId: string
  tenantId: string
  tenantSchema: string
  role: string
  saRole?: string
  email?: string
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token tidak ditemukan')
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      throw new UnauthorizedError('Token tidak ditemukan')
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload

    // Attach user info ke request object
    req.userId = decoded.userId
    req.tenantId = decoded.tenantId
    req.tenantSchema = decoded.tenantSchema
    req.role = decoded.role
    req.saRole = decoded.saRole
    req.userEmail = decoded.email

    // Resolve doctorId for doctor role users (async, non-blocking)
    if (decoded.role === 'dokter' && decoded.tenantSchema) {
      db.withSchema(decoded.tenantSchema)
        .select('id')
        .from('doctors')
        .where({ user_id: decoded.userId })
        .first()
        .then((doctor) => {
          if (doctor) {
            req.doctorId = (doctor as { id: string }).id
          }
          next()
        })
        .catch(() => next())
      return
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token sudah expired'))
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Token tidak valid'))
    } else {
      next(error)
    }
  }
}
