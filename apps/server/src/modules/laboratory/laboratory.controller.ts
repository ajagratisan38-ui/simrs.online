import { Request, Response, NextFunction } from 'express'
import { LaboratoryService } from './laboratory.service'
import {
  createLabOrderSchema,
  receiveSampleSchema,
  inputResultSchema,
  listLabOrdersSchema,
  searchLabParamsSchema,
} from './laboratory.validator'

export class LaboratoryController {
  constructor(private service: LaboratoryService) {}

  // --- Create Lab Order (dokter) ---
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createLabOrderSchema.parse(req.body)
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

  // --- List Orders (lab queue) ---
  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listLabOrdersSchema.parse(req.query)
      const result = await this.service.listOrders(filters, req.tenantSchema!)
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  // --- Get Order Detail ---
  getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.getOrderById(
        req.params.id,
        req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  // --- Receive Sample (lab technician) ---
  receiveSample = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = receiveSampleSchema.parse(req.body)
      const order = await this.service.receiveSample(
        req.params.id,
        data,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  // --- Start Processing ---
  startProcessing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.startProcessing(
        req.params.id,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  // --- Input Results ---
  inputResults = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = inputResultSchema.parse(req.body)
      const order = await this.service.inputResults(
        req.params.id,
        data,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  // --- Finalize Order ---
  finalizeOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.finalizeOrder(
        req.params.id,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  // --- Cancel Order ---
  cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.service.cancelOrder(
        req.params.id,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: order })
    } catch (error) {
      next(error)
    }
  }

  // --- Get Results by Visit (for doctor SOAP view) ---
  getResultsByVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.service.getResultsByVisit(
        req.params.visitId,
        req.tenantSchema!,
      )
      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  // --- Get Patient Lab History ---
  getPatientHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await this.service.getPatientHistory(
        req.params.patientId,
        req.tenantSchema!,
      )
      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  // --- Search Lab Parameters ---
  searchParams = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = searchLabParamsSchema.parse(req.query)
      const results = await this.service.searchParameters(filters)
      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  // --- Get Parameter Categories ---
  getCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.service.getParameterCategories()
      res.json({ success: true, data: categories })
    } catch (error) {
      next(error)
    }
  }

  // --- Get Stats ---
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getStats(req.tenantSchema!)
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }
}
