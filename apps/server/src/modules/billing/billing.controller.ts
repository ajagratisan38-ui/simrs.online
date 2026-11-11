import { Request, Response, NextFunction } from 'express'
import { BillingService } from './billing.service'
import {
  applyDiscountSchema,
  processPaymentSchema,
  dailySummarySchema,
  outstandingSchema,
} from './billing.validator'

export class BillingController {
  constructor(private service: BillingService) {}

  generateBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.generateBill(
        req.params.visitId,
        req.userId!,
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getBill(
        req.params.visitId,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  applyDiscount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = applyDiscountSchema.parse(req.body)
      const result = await this.service.applyDiscount(
        req.params.id,
        data.discount_amount,
        data.catatan,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  finalizeBill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.finalizeBill(
        req.params.id,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  processPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = processPaymentSchema.parse(req.body)
      const result = await this.service.processPayment(
        req.params.id,
        data,
        req.userId!,
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  patientBills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))
      const result = await this.service.getPatientBills(
        req.params.patientId,
        page,
        limit,
        req.tenantSchema!,
      )
      res.json({
        success: true,
        data: result.data,
        patient: result.patient,
        meta: result.meta,
      })
    } catch (error) {
      next(error)
    }
  }

  outstanding = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = outstandingSchema.parse(req.query)
      const result = await this.service.getOutstandingBills(
        filters.page,
        filters.limit,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  dailySummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = dailySummarySchema.parse(req.query)
      const result = await this.service.getDailySummary(
        filters.date,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
