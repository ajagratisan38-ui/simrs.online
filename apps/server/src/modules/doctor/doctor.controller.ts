import { Request, Response, NextFunction } from 'express'
import { DoctorService, type DoctorStatus } from './doctor.service'
import { z } from 'zod'

const scheduleSchema = z.object({
  room_id: z.string().uuid(),
  hari: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']),
  jam_mulai: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam: HH:mm'),
  jam_selesai: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam: HH:mm'),
  kuota: z.coerce.number().int().min(1).max(200).default(30),
  catatan: z.string().optional(),
})

const feeSchema = z.object({
  kode: z.string().min(1).max(30),
  nama_layanan: z.string().min(1).max(200),
  kategori: z.string().default('konsultasi'),
  tarif: z.coerce.number().min(0),
  persentase_dokter: z.coerce.number().min(0).max(100).default(80),
  persentase_rs: z.coerce.number().min(0).max(100).default(20),
})

const updateDoctorSchema = z.object({
  spesialisasi: z.string().optional(),
  no_sip: z.string().optional(),
  no_str: z.string().optional(),
  tarif_konsultasi: z.coerce.number().min(0).optional(),
  is_available: z.boolean().optional(),
  status: z.enum(['aktif', 'cuti_panjang', 'pindah', 'resign', 'pensiun']).optional(),
  status_note: z.string().max(500).optional(),
})

const feeTransactionSchema = z.object({
  doctor_id: z.string().uuid(),
  visit_id: z.string().uuid(),
  fee_id: z.string().uuid().optional(),
  deskripsi: z.string().min(1),
  tarif: z.coerce.number().min(0),
  persentase_dokter: z.coerce.number().min(0).max(100).optional(),
  persentase_rs: z.coerce.number().min(0).max(100).optional(),
})

export class DoctorController {
  constructor(private service: DoctorService) {}

  listDoctors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, includeInactive, includeDeleted } = req.query as {
        status?: DoctorStatus
        includeInactive?: string
        includeDeleted?: string
      }
      const data = await this.service.listDoctors(req.tenantSchema!, {
        status,
        includeInactive: includeInactive === 'true',
        includeDeleted: includeDeleted === 'true',
      })
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getDoctorById(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  updateDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateDoctorSchema.parse(req.body)
      const data = await this.service.updateDoctor(req.params.id, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ── Schedules ──

  listSchedules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listSchedules(req.params.doctorId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  upsertSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = scheduleSchema.parse(req.body)
      const data = await this.service.upsertSchedule(req.params.doctorId, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  deleteSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteSchedule(req.params.scheduleId, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Jadwal berhasil dihapus' } })
    } catch (error) { next(error) }
  }

  toggleSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { is_active } = z.object({ is_active: z.boolean() }).parse(req.body)
      const data = await this.service.toggleSchedule(req.params.scheduleId, is_active, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getTodaySchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getTodaySchedule(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ── Fees ──

  listFees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listFees(req.params.doctorId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  createFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = feeSchema.parse(req.body)
      const data = await this.service.createFee(req.params.doctorId, body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  updateFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = feeSchema.partial().extend({ is_active: z.boolean().optional() }).parse(req.body)
      const data = await this.service.updateFee(req.params.feeId, body, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  deleteFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteFee(req.params.feeId, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Tarif layanan berhasil dihapus' } })
    } catch (error) { next(error) }
  }

  // ── Fee Transactions ──

  recordTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = feeTransactionSchema.parse(req.body)
      const data = await this.service.recordFeeTransaction(body, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  getDoctorEarnings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query as { start?: string; end?: string }
      const data = await this.service.getDoctorEarnings(
        req.params.doctorId, req.tenantSchema!, { start, end },
      )
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getAllEarnings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query as { start?: string; end?: string }
      const data = await this.service.getAllDoctorEarnings(req.tenantSchema!, { start, end })
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ── Deactivate / Reactivate ──

  deactivateDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason } = z.object({ reason: z.string().max(500).optional() }).parse(req.body)
      const data = await this.service.deactivateDoctor(req.params.id, req.tenantSchema!, reason)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  reactivateDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.reactivateDoctor(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }
}
