import { Request, Response, NextFunction } from 'express'
import { PractitionerService } from './practitioner.service'
import { z } from 'zod'

const createSchema = z.object({
  nama: z.string().min(1).max(200),
  profesi: z.string().min(1).max(100),
  spesialisasi: z.string().max(200).optional(),
  no_sip: z.string().max(50).optional(),
  no_str: z.string().max(50).optional(),
  instansi_asal: z.string().max(200).optional(),
  telepon: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  alamat: z.string().optional(),
  fee_share_persen: z.coerce.number().min(0).max(100).default(70),
  fee_share_rs_persen: z.coerce.number().min(0).max(100).default(30),
  kontrak_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  kontrak_selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  catatan: z.string().optional(),
})

const updateSchema = createSchema.partial().extend({
  status: z.enum(['aktif', 'nonaktif', 'kontrak_habis']).optional(),
})

export class PractitionerController {
  constructor(private service: PractitionerService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listPractitioners(req.tenantSchema!, {
        profesi: req.query.profesi as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      })
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getPractitioner(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createSchema.parse(req.body)
      const data = await this.service.createPractitioner(body, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateSchema.parse(req.body)
      const data = await this.service.updatePractitioner(req.params.id, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deletePractitioner(req.params.id, req.tenantSchema!)
      res.json({ success: true, message: 'Tenaga kesehatan luar dihapus' })
    } catch (error) { next(error) }
  }

  dropdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getActiveDropdown(
        req.tenantSchema!,
        req.query.profesi as string | undefined,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getStats(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }
}
