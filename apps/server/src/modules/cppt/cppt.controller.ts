import { Request, Response, NextFunction } from 'express'
import { CpptService } from './cppt.service'
import { z } from 'zod'

const createCpptSchema = z.object({
  visit_id: z.string().uuid(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  planning: z.string().optional(),
  instruksi: z.string().optional(),
  evaluasi: z.string().optional(),
})

const updateCpptSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  planning: z.string().optional(),
  instruksi: z.string().optional(),
  evaluasi: z.string().optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  profesi: z.string().optional(),
})

export class CpptController {
  constructor(private service: CpptService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createCpptSchema.parse(req.body)
      const result = await this.service.create(
        data,
        req.userId!,
        req.role!,
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateCpptSchema.parse(req.body)
      const id = req.params.id as string
      const result = await this.service.update(
        id,
        data,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const result = await this.service.verify(
        id,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      await this.service.delete(
        id,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, message: 'Entry CPPT berhasil dihapus' })
    } catch (error) {
      next(error)
    }
  }

  listByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listQuerySchema.parse(req.query)
      const visitId = req.params.visitId as string
      const result = await this.service.listByVisit(
        visitId,
        filters,
        req.tenantSchema!,
      )
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  listByPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listQuerySchema.parse(req.query)
      const patientId = req.params.patientId as string
      const result = await this.service.listByPatient(
        patientId,
        filters,
        req.tenantSchema!,
      )
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }
}
