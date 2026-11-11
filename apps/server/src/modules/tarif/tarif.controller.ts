import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { TarifService } from './tarif.service'

const createTarifSchema = z.object({
  kode: z.string().min(1).max(30),
  nama: z.string().min(1).max(200),
  kategori: z.enum(['visite', 'tindakan', 'administrasi', 'keperawatan']),
  tarif_kelas_3: z.number().min(0).optional().default(0),
  tarif_kelas_2: z.number().min(0).optional().default(0),
  tarif_kelas_1: z.number().min(0).optional().default(0),
  tarif_vip: z.number().min(0).optional().default(0),
  tarif_igd: z.number().min(0).optional().default(0),
  tarif_poli: z.number().min(0).optional().default(0),
})

const updateTarifSchema = z.object({
  nama: z.string().min(1).max(200).optional(),
  kategori: z.enum(['visite', 'tindakan', 'administrasi', 'keperawatan']).optional(),
  tarif_kelas_3: z.number().min(0).optional(),
  tarif_kelas_2: z.number().min(0).optional(),
  tarif_kelas_1: z.number().min(0).optional(),
  tarif_vip: z.number().min(0).optional(),
  tarif_igd: z.number().min(0).optional(),
  tarif_poli: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
})

export class TarifController {
  constructor(private service: TarifService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { kategori, search, is_active } = req.query as Record<string, string>
      const data = await this.service.list(req.tenantSchema!, {
        kategori,
        search,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
      })
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getById(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createTarifSchema.parse(req.body)
      const data = await this.service.create(body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateTarifSchema.parse(req.body)
      const data = await this.service.update(req.params.id, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.delete(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  toggleActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.toggleActive(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getStats(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }
}
