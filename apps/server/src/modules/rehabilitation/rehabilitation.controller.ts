import { Request, Response, NextFunction } from 'express'
import { RehabilitationService } from './rehabilitation.service'
import { PractitionerFeeService } from './practitioner-fee.service'
import { z } from 'zod'

const THERAPY_TYPES = [
  'fisioterapi', 'terapi_wicara', 'terapi_okupasi', 'terapi_psikologi',
  'terapi_respirasi', 'rehabilitasi_jantung', 'rehabilitasi_neurologi', 'lainnya',
] as const

const createOrderSchema = z.object({
  visit_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  ordering_doctor_id: z.string().uuid(),
  practitioner_id: z.string().uuid().optional(),
  therapy_type: z.enum(THERAPY_TYPES),
  diagnosa_klinis: z.string().min(1),
  indikasi: z.string().optional(),
  target_terapi: z.string().optional(),
  jumlah_sesi: z.coerce.number().int().min(1).max(100).default(1),
  catatan_dokter: z.string().optional(),
  tarif_per_sesi: z.coerce.number().min(0).default(0),
})

const updateStatusSchema = z.object({
  status: z.enum(['dijadwalkan', 'berlangsung', 'selesai', 'batal']),
  cancelled_reason: z.string().optional(),
  catatan_terapis: z.string().optional(),
  practitioner_id: z.string().uuid().optional(),
})

const sessionSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  waktu_mulai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  waktu_selesai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  practitioner_id: z.string().uuid().optional(),
  tindakan: z.string().optional(),
  hasil: z.string().optional(),
  catatan_progress: z.string().optional(),
  skala_nyeri_sebelum: z.coerce.number().int().min(0).max(10).optional(),
  skala_nyeri_sesudah: z.coerce.number().int().min(0).max(10).optional(),
  rom_sebelum: z.string().optional(),
  rom_sesudah: z.string().optional(),
})

export class RehabilitationController {
  constructor(
    private service: RehabilitationService,
    private feeService: PractitionerFeeService,
  ) {}

  // ── Orders ──

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createOrderSchema.parse(req.body)
      const data = await this.service.createOrder(body, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listOrders(req.tenantSchema!, {
        status: req.query.status as string | undefined,
        therapy_type: req.query.therapy_type as string | undefined,
        patient_id: req.query.patient_id as string | undefined,
        practitioner_id: req.query.practitioner_id as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      })
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getOrder(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateStatusSchema.parse(req.body)
      const data = await this.service.updateOrderStatus(
        req.params.id,
        body.status,
        req.userId!,
        req.tenantSchema!,
        {
          cancelled_reason: body.cancelled_reason,
          catatan_terapis: body.catatan_terapis,
          practitioner_id: body.practitioner_id,
        },
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  assignPractitioner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { practitioner_id } = z.object({
        practitioner_id: z.string().uuid(),
      }).parse(req.body)
      const data = await this.service.assignPractitioner(
        req.params.id,
        practitioner_id,
        req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ── Sessions ──

  addSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = sessionSchema.parse(req.body)
      const data = await this.service.addSession(
        req.params.orderId,
        body,
        req.userId!,
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  updateSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = sessionSchema.partial().parse(req.body)
      const data = await this.service.updateSession(
        req.params.sessionId,
        body,
        req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  deleteSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.deleteSession(
        req.params.sessionId,
        req.tenantSchema!,
      )
      res.json({ success: true, ...data })
    } catch (error) { next(error) }
  }

  // ── Patient History ──

  patientHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getPatientRehabHistory(
        req.params.patientId,
        req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ── Stats ──

  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getStats(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ── Fee Transactions ──

  orderFees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.feeService.getOrderFees(req.params.orderId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  practitionerEarnings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.feeService.getPractitionerEarnings(
        req.params.practitionerId,
        req.tenantSchema!,
        {
          start: req.query.start as string | undefined,
          end: req.query.end as string | undefined,
        },
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  feeSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.feeService.getFeeSummary(req.tenantSchema!, {
        start: req.query.start as string | undefined,
        end: req.query.end as string | undefined,
      })
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }
}
