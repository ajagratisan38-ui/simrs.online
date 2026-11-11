import { Request, Response, NextFunction } from 'express'
import { SubstitutionService } from './substitution.service'
import { z } from 'zod'

const createSubstitutionSchema = z.object({
  doctor_id: z.string().uuid(),
  substitute_doctor_id: z.string().uuid(),
  tanggal_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  tanggal_selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  alasan: z.string().min(1, 'Alasan wajib diisi').max(500),
  catatan: z.string().max(1000).optional(),
})

export class SubstitutionController {
  constructor(private service: SubstitutionService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createSubstitutionSchema.parse(req.body)
      const result = await this.service.createSubstitution(
        data,
        req.userId!,
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data: result })
    } catch (error) { next(error) }
  }

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        doctor_id: req.query.doctor_id as string | undefined,
        substitute_doctor_id: req.query.substitute_doctor_id as string | undefined,
        status: req.query.status as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      }
      const result = await this.service.listSubstitutions(req.tenantSchema!, filters)
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getSubstitutionById(
        req.params.id,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) { next(error) }
  }

  getActiveForDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = req.query.date as string | undefined
      const result = await this.service.getActiveSubstitute(
        req.params.doctorId,
        req.tenantSchema!,
        date,
      )
      res.json({ success: true, data: result })
    } catch (error) { next(error) }
  }

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.cancelSubstitution(
        req.params.id,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) { next(error) }
  }

  getDoctorHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = (req.query.role as string) || 'both'
      const validRoles = ['as_doctor', 'as_substitute', 'both'] as const
      const safeRole = validRoles.includes(role as typeof validRoles[number])
        ? (role as typeof validRoles[number])
        : 'both'

      const result = await this.service.getDoctorSubstitutionHistory(
        req.params.doctorId,
        req.tenantSchema!,
        safeRole,
      )
      res.json({ success: true, data: result })
    } catch (error) { next(error) }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getSubstitutionStats(req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) { next(error) }
  }

  completeExpired = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await this.service.completeExpiredSubstitutions(req.tenantSchema!)
      res.json({ success: true, data: { completed: count } })
    } catch (error) { next(error) }
  }
}
