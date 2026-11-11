import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PortalController } from './portal.controller'
import { PortalService } from './portal.service'
import { env } from '../../config/env'
import { db } from '../../config/database'

const service = new PortalService(db)
const controller = new PortalController(service)

// Portal-specific auth middleware
function authenticatePortal(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new Error('Token portal tidak ditemukan'))
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as {
      patientId: string
      tenantSchema: string
      nik: string
      type: string
    }

    if (decoded.type !== 'portal') {
      return next(new Error('Token bukan tipe portal'))
    }

    req.portalPatientId = decoded.patientId
    req.portalTenantSchema = decoded.tenantSchema
    next()
  } catch {
    return next(new Error('Token portal tidak valid atau sudah expired'))
  }
}

export const portalRouter = Router()

// Public — patient login
portalRouter.post('/login', controller.login)

// Protected — requires portal token
portalRouter.get('/profile', authenticatePortal, controller.getProfile)
portalRouter.get('/visits', authenticatePortal, controller.getVisitHistory)
portalRouter.get('/visits/upcoming', authenticatePortal, controller.getUpcoming)
portalRouter.get('/bills', authenticatePortal, controller.getBills)
portalRouter.get('/medical-summaries', authenticatePortal, controller.getMedicalSummaries)
