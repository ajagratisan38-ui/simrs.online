import { Request, Response, NextFunction } from 'express'
import { GeneralConsentService } from './general-consent.service'
import { z } from 'zod'

const createConsentSchema = z.object({
  patient_id: z.string().uuid(),
  visit_id: z.string().uuid().optional().nullable(),
  persetujuan_rawat: z.boolean(),
  persetujuan_informasi: z.boolean(),
  persetujuan_privasi: z.boolean(),
  persetujuan_biaya: z.boolean(),
  persetujuan_tata_tertib: z.boolean(),
  persetujuan_pelepasan_info: z.boolean(),
  penanggung_jawab_nama: z.string().max(255).optional().nullable(),
  penanggung_jawab_hubungan: z.string().max(100).optional().nullable(),
  penanggung_jawab_telepon: z.string().max(20).optional().nullable(),
  penanggung_jawab_alamat: z.string().optional().nullable(),
  signed_by: z.string().max(255).optional().nullable(),
  catatan: z.string().optional().nullable(),
})

export class GeneralConsentController {
  constructor(private service: GeneralConsentService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createConsentSchema.parse(req.body)
      const consent = await this.service.create(
        data,
        req.tenantSchema!,
        req.userId!,
      )
      res.status(201).json({ success: true, data: consent })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consent = await this.service.getById(
        req.params.id,
        req.tenantSchema!,
      )
      res.json({ success: true, data: consent })
    } catch (error) {
      next(error)
    }
  }

  listByPatient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consents = await this.service.listByPatient(
        req.params.patientId,
        req.tenantSchema!,
      )
      res.json({ success: true, data: consents })
    } catch (error) {
      next(error)
    }
  }

  getByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consent = await this.service.getByVisit(
        req.params.visitId,
        req.tenantSchema!,
      )
      res.json({ success: true, data: consent })
    } catch (error) {
      next(error)
    }
  }
}
