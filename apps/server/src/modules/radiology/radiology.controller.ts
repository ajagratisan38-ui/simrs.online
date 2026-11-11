import { Request, Response, NextFunction } from 'express'
import { RadiologyService } from './radiology.service'
import {
  createRadiologyOrderSchema,
  scheduleOrderSchema,
  inputResultSchema,
  listRadiologyOrdersSchema,
  searchExaminationsSchema,
} from './radiology.validator'

export class RadiologyController {
  constructor(private service: RadiologyService) {}

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createRadiologyOrderSchema.parse(req.body)
      const order = await this.service.createOrder(
        data,
        req.doctorId || req.userId!,
        req.userId!,
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listRadiologyOrdersSchema.parse(req.query)
      const result = await this.service.listOrders(filters, req.tenantSchema!)
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.getOrderById(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  scheduleOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = scheduleOrderSchema.parse(req.body)
      const order = await this.service.scheduleOrder(
        req.params.id, data, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  startProcessing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.startProcessing(
        req.params.id, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  inputResults = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = inputResultSchema.parse(req.body)
      const order = await this.service.inputResults(
        req.params.id, data, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.cancelOrder(
        req.params.id, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  getResultsByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.service.getResultsByVisit(
        req.params.visitId, req.tenantSchema!,
      )
      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  getPatientHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.service.getPatientHistory(
        req.params.patientId, req.tenantSchema!,
      )
      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  searchExaminations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = searchExaminationsSchema.parse(req.query)
      const results = await this.service.searchExaminations(filters)
      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  getModalities = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const modalities = await this.service.getModalities()
      res.json({ success: true, data: modalities })
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
}
