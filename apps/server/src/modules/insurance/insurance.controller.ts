import { Request, Response, NextFunction } from 'express'
import { InsuranceService } from './insurance.service'
import { z } from 'zod'

const createInsuranceSchema = z.object({
  kode: z.string().min(1).max(30),
  nama: z.string().min(1).max(200),
  tipe: z.enum(['asuransi', 'perusahaan', 'yayasan', 'kerjasama']).default('asuransi'),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  pic_nama: z.string().optional(),
  pic_telepon: z.string().optional(),
  tarif_persen: z.coerce.number().min(0).max(100).default(100),
  catatan: z.string().optional(),
})

const addPatientInsuranceSchema = z.object({
  patient_id: z.string().uuid(),
  insurance_id: z.string().uuid(),
  no_polis: z.string().min(1).max(50),
  kelas: z.string().max(10).optional(),
  berlaku_mulai: z.string().optional(),
  berlaku_sampai: z.string().optional(),
  catatan: z.string().optional(),
})

export class InsuranceController {
  constructor(private service: InsuranceService) {}

  // ── Master Insurances ──

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, tipe, is_active, page, limit } = req.query as Record<string, string>
      const result = await this.service.listInsurances(req.tenantSchema!, {
        search, tipe,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      })
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getInsurance(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createInsuranceSchema.parse(req.body)
      const data = await this.service.createInsurance(body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createInsuranceSchema.partial().parse(req.body)
      const data = await this.service.updateInsurance(req.params.id, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  toggle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.toggleInsurance(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteInsurance(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Asuransi berhasil dihapus' } })
    } catch (error) { next(error) }
  }

  // ── Patient Insurances ──

  listPatientInsurances = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listPatientInsurances(
        req.params.patientId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  addPatientInsurance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = addPatientInsuranceSchema.parse(req.body)
      const data = await this.service.addPatientInsurance(body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  updatePatientInsurance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = addPatientInsuranceSchema.partial().omit({
        patient_id: true, insurance_id: true,
      }).parse(req.body)
      const data = await this.service.updatePatientInsurance(
        req.params.id, body, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  removePatientInsurance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.removePatientInsurance(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Kepesertaan dihapus' } })
    } catch (error) { next(error) }
  }

  // ── Lookups ──

  dropdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getActiveInsurancesForDropdown(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  patientActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getPatientActiveInsurance(
        req.params.patientId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ── Stats ──

  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getInsuranceStats(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }
}
