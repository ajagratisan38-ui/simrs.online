import { Request, Response, NextFunction } from 'express'
import { SatusehatService } from './satusehat.service'
import { ValidationError, NotFoundError } from '../../shared/errors'

export class SatusehatController {
  constructor(private satusehatService: SatusehatService) {}

  getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await this.satusehatService.getConfig(req.tenantId!)
      res.json({ success: true, data: config })
    } catch (error) {
      next(error)
    }
  }

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, clientSecret, baseUrl, orgId, environment } = req.body

      if (!clientId && !clientSecret && !baseUrl && !orgId && !environment) {
        throw new ValidationError('Minimal satu field harus diisi')
      }

      if (environment && !['sandbox', 'staging', 'production'].includes(environment)) {
        throw new ValidationError('Environment harus sandbox, staging, atau production')
      }

      const config = await this.satusehatService.updateConfig(req.tenantId!, {
        clientId,
        clientSecret,
        baseUrl,
        orgId,
        environment,
      })

      res.json({ success: true, data: config })
    } catch (error) {
      next(error)
    }
  }

  testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.satusehatService.testConnection(req.tenantId!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  syncVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visitId = req.params.visitId as string
      if (!visitId) throw new ValidationError('Visit ID wajib diisi')

      const result = await this.satusehatService.syncVisit(
        visitId,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visitId = req.params.visitId as string
      if (!visitId) throw new ValidationError('Visit ID wajib diisi')

      const status = await this.satusehatService.getSyncStatus(
        visitId,
        req.tenantSchema!,
      )

      if (!status) throw new NotFoundError('Visit')

      res.json({ success: true, data: status })
    } catch (error) {
      next(error)
    }
  }

  getPending = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

      const result = await this.satusehatService.getPendingVisits(
        page,
        limit,
        req.tenantSchema!,
      )

      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  retrySync = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const visitId = req.params.visitId as string
      if (!visitId) throw new ValidationError('Visit ID wajib diisi')

      const result = await this.satusehatService.syncVisit(
        visitId,
        req.tenantSchema!,
      )
      res.json({
        success: true,
        data: result,
        message: 'Retry sync berhasil',
      })
    } catch (error) {
      next(error)
    }
  }

  getSyncHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
      const status = req.query.status as string | undefined
      const from = req.query.from as string | undefined
      const to = req.query.to as string | undefined

      const result = await this.satusehatService.getSyncHistory(
        page,
        limit,
        req.tenantSchema!,
        { status, from, to },
      )

      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  getSyncStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30
      const stats = await this.satusehatService.getSyncStats(
        req.tenantSchema!,
        days,
      )
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }

  // --- Individual Resource Endpoints ---

  createProcedure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await this.satusehatService.createProcedure(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data: { satusehatId: id } })
    } catch (error) {
      next(error)
    }
  }

  createAllergyIntolerance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await this.satusehatService.createAllergyIntolerance(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data: { satusehatId: id } })
    } catch (error) {
      next(error)
    }
  }

  createMedicationDispense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await this.satusehatService.createMedicationDispense(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data: { satusehatId: id } })
    } catch (error) {
      next(error)
    }
  }

  createServiceRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await this.satusehatService.createServiceRequest(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data: { satusehatId: id } })
    } catch (error) {
      next(error)
    }
  }

  createDiagnosticReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await this.satusehatService.createDiagnosticReport(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data: { satusehatId: id } })
    } catch (error) {
      next(error)
    }
  }

  createComposition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await this.satusehatService.createComposition(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data: { satusehatId: id } })
    } catch (error) {
      next(error)
    }
  }

  createPractitioner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await this.satusehatService.createPractitioner(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data: { satusehatId: id } })
    } catch (error) {
      next(error)
    }
  }

  createLocationResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await this.satusehatService.createLocation(req.body, req.tenantSchema!)
      res.status(201).json({ success: true, data: { satusehatId: id } })
    } catch (error) {
      next(error)
    }
  }

  getResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { resourceType, resourceId } = req.params
      if (!resourceType || !resourceId) throw new ValidationError('resourceType dan resourceId wajib diisi')
      const data = await this.satusehatService.getResource(resourceType, resourceId)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }
}
