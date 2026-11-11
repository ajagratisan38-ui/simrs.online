import { Request, Response, NextFunction } from 'express'
import { InpatientClinicalService } from './inpatient-clinical.service'
import type { OrderStatus, OrderCategory, OrderPriority, NursingShift } from './inpatient-clinical.service'

export class InpatientClinicalController {
  constructor(private service: InpatientClinicalService) {}

  // ==================== VITAL SIGNS ====================

  recordVitals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.recordVitals(
        req.body, req.tenantSchema!, req.userId!,
      )
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  }

  getVitalsByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getVitalsByVisit(
        req.params.visitId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  getVitalsTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getVitalsTrend(
        req.params.visitId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  getLatestVitals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getLatestVitals(
        req.params.visitId, req.tenantSchema!,
      )
      res.json({ success: true, data: data || null })
    } catch (err) { next(err) }
  }

  deleteVital = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.deleteVital(
        req.params.vitalId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== MEDICAL ORDERS ====================

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visit_id, patient_id, kategori, prioritas, instruksi,
        dosis, frekuensi, rute, durasi, catatan } = req.body as {
        visit_id: string; patient_id: string; kategori: OrderCategory
        prioritas?: OrderPriority; instruksi: string
        dosis?: string; frekuensi?: string; rute?: string; durasi?: string
        catatan?: string
      }
      const data = await this.service.createOrder(
        { visit_id, patient_id, kategori, prioritas, instruksi,
          dosis, frekuensi, rute, durasi, catatan },
        req.tenantSchema!, req.userId!,
      )
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  }

  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as OrderStatus | undefined
      const data = await this.service.listOrders(
        req.params.visitId, req.tenantSchema!, status,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, reason } = req.body as { status: OrderStatus; reason?: string }
      const data = await this.service.updateOrderStatus(
        req.params.orderId, status, req.tenantSchema!, req.userId!, reason,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  executeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { catatan } = req.body as { catatan?: string }
      const data = await this.service.executeOrder(
        req.params.orderId, req.tenantSchema!, req.userId!, catatan,
      )
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  }

  deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.deleteOrder(
        req.params.orderId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== NURSING NOTES ====================

  createNursingNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.createNursingNote(
        req.body, req.tenantSchema!, req.userId!,
      )
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  }

  updateNursingNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.updateNursingNote(
        req.params.noteId, req.body, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  finalizeNursingNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.finalizeNursingNote(
        req.params.noteId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  listNursingNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listNursingNotes(
        req.params.visitId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  deleteNursingNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.deleteNursingNote(
        req.params.noteId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== DISCHARGE PLANNING ====================

  getDischargePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { visitId } = req.params
      const { patientId } = req.query as { patientId: string }
      const data = await this.service.getOrCreateDischargePlan(
        visitId, patientId, req.tenantSchema!, req.userId!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  updateDischargePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.updateDischargePlan(
        req.params.planId, req.body, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== INPATIENT LIST ====================

  listInpatients = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, roomId, doctorId } = req.query as {
        search?: string; roomId?: string; doctorId?: string
      }
      const data = await this.service.listInpatients(
        req.tenantSchema!, { search, roomId, doctorId },
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }

  // ==================== CLINICAL SUMMARY ====================

  getClinicalSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getPatientClinicalSummary(
        req.params.visitId, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (err) { next(err) }
  }
}
