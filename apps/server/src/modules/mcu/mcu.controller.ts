import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { McuService } from './mcu.service'

const EXAM_CATEGORIES = [
  'fisik_umum', 'mata', 'tht', 'gigi', 'lab', 'radiologi',
  'ekg', 'spirometri', 'audiometri', 'psikologi',
] as const

const packageItemSchema = z.object({
  kategori: z.enum(EXAM_CATEGORIES),
  nama: z.string().min(1).max(200),
  deskripsi: z.string().optional(),
  is_required: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

const createPackageSchema = z.object({
  nama: z.string().min(1).max(100),
  kode: z.string().min(1).max(20),
  deskripsi: z.string().optional(),
  harga: z.number().min(0),
  items: z.array(packageItemSchema).min(1),
})

const registerSchema = z.object({
  patient_id: z.string().uuid(),
  package_id: z.string().uuid(),
  tanggal: z.string().optional(),
  tujuan: z.string().max(100).optional(),
  perusahaan: z.string().max(200).optional(),
  doctor_id: z.string().uuid().optional(),
})

const examResultSchema = z.object({
  hasil: z.string().optional(),
  nilai: z.string().max(100).optional(),
  satuan: z.string().max(50).optional(),
  nilai_normal: z.string().max(100).optional(),
  is_abnormal: z.boolean().optional(),
  catatan: z.string().optional(),
})

const conclusionSchema = z.object({
  conclusion: z.enum(['fit', 'fit_with_notes', 'temporarily_unfit', 'unfit']),
  conclusion_notes: z.string().optional(),
})

export class McuController {
  constructor(private service: McuService) {}

  listPackages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const packages = await this.service.listPackages(req.tenantSchema!)
      res.json({ success: true, data: packages })
    } catch (error) {
      next(error)
    }
  }

  getPackage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pkg = await this.service.getPackage(req.tenantSchema!, req.params.packageId)
      if (!pkg) return res.status(404).json({ success: false, error: { message: 'Paket tidak ditemukan' } })
      res.json({ success: true, data: pkg })
    } catch (error) {
      next(error)
    }
  }

  createPackage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createPackageSchema.parse(req.body)
      const pkg = await this.service.createPackage(req.tenantSchema!, data)
      res.status(201).json({ success: true, data: pkg })
    } catch (error) {
      next(error)
    }
  }

  updatePackage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createPackageSchema.partial().parse(req.body)
      const pkg = await this.service.updatePackage(req.tenantSchema!, req.params.packageId, data)
      res.json({ success: true, data: pkg })
    } catch (error) {
      next(error)
    }
  }

  togglePackage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.togglePackage(req.tenantSchema!, req.params.packageId)
      if (!result) return res.status(404).json({ success: false, error: { message: 'Paket tidak ditemukan' } })
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  deletePackage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deletePackage(req.tenantSchema!, req.params.packageId)
      res.json({ success: true, data: { deleted: true } })
    } catch (error) {
      next(error)
    }
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = registerSchema.parse(req.body)
      const reg = await this.service.register(req.tenantSchema!, data, req.userId!)
      res.status(201).json({ success: true, data: reg })
    } catch (error) {
      next(error)
    }
  }

  listRegistrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, tanggal_from, tanggal_to, search, page, limit } = req.query
      const result = await this.service.listRegistrations(req.tenantSchema!, {
        status: status as string,
        tanggal_from: tanggal_from as string,
        tanggal_to: tanggal_to as string,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      })
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  getRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await this.service.getRegistration(req.tenantSchema!, req.params.id)
      if (!reg) return res.status(404).json({ success: false, error: { message: 'MCU tidak ditemukan' } })
      res.json({ success: true, data: reg })
    } catch (error) {
      next(error)
    }
  }

  startMcu = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await this.service.startMcu(req.tenantSchema!, req.params.id)
      res.json({ success: true, data: reg })
    } catch (error) {
      next(error)
    }
  }

  inputExamResult = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = examResultSchema.parse(req.body)
      const exam = await this.service.inputExamResult(
        req.tenantSchema!,
        req.params.examId,
        data,
        req.userId!,
      )
      res.json({ success: true, data: exam })
    } catch (error) {
      next(error)
    }
  }

  conclude = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = conclusionSchema.parse(req.body)
      const reg = await this.service.conclude(req.tenantSchema!, req.params.id, data, req.userId!)
      res.json({ success: true, data: reg })
    } catch (error) {
      next(error)
    }
  }

  cancelMcu = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await this.service.cancelMcu(req.tenantSchema!, req.params.id)
      res.json({ success: true, data: reg })
    } catch (error) {
      next(error)
    }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getStats(req.tenantSchema!)
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }

  getCertificate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getCertificateData(req.tenantSchema!, req.params.id)
      if (!data) return res.status(404).json({ success: false, error: { message: 'Sertifikat tidak tersedia' } })
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }
}
