import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { PortalService } from './portal.service'

const loginSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit'),
  tanggal_lahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD'),
  tenant_slug: z.string().min(3, 'Slug RS wajib diisi'),
})

export class PortalController {
  constructor(private service: PortalService) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body)
      const tenantSchema = `tenant_${data.tenant_slug}`

      const result = await this.service.authenticatePatient(
        tenantSchema,
        data.nik,
        data.tanggal_lahir,
      )

      res.json({
        success: true,
        data: {
          token: result.token,
          patient: result.patient,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await this.service.getPatientProfile(
        req.portalTenantSchema!,
        req.portalPatientId!,
      )
      res.json({ success: true, data: patient })
    } catch (error) {
      next(error)
    }
  }

  getVisitHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query
      const result = await this.service.getVisitHistory(
        req.portalTenantSchema!,
        req.portalPatientId!,
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
      )
      res.json({
        success: true,
        data: result.data,
        meta: { total: result.total },
      })
    } catch (error) {
      next(error)
    }
  }

  getUpcoming = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visits = await this.service.getUpcomingVisits(
        req.portalTenantSchema!,
        req.portalPatientId!,
      )
      res.json({ success: true, data: visits })
    } catch (error) {
      next(error)
    }
  }

  getBills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, page, limit } = req.query
      const result = await this.service.getBills(
        req.portalTenantSchema!,
        req.portalPatientId!,
        {
          status: status as string | undefined,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
      )
      res.json({
        success: true,
        data: result.data,
        meta: { total: result.total },
      })
    } catch (error) {
      next(error)
    }
  }

  getMedicalSummaries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query
      const result = await this.service.getMedicalSummaries(
        req.portalTenantSchema!,
        req.portalPatientId!,
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
      )
      res.json({
        success: true,
        data: result.data,
        meta: { total: result.total },
      })
    } catch (error) {
      next(error)
    }
  }
}
