import { Request, Response, NextFunction } from 'express'
import { PharmacyService } from './pharmacy.service'
import {
  createDrugSchema,
  updateDrugSchema,
  listDrugsSchema,
  searchDrugSchema,
  addStockSchema,
  adjustStockSchema,
  dispenseSchema,
  expiringSchema,
} from './pharmacy.validator'

export class PharmacyController {
  constructor(private service: PharmacyService) {}

  // --- Drugs ---

  listDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listDrugsSchema.parse(req.query)
      const result = await this.service.getDrugList(filters, req.tenantSchema!)
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  getDrug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getDrugDetail(
        req.params.id,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  searchDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = searchDrugSchema.parse(req.query)
      const result = await this.service.searchDrug(filters, req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  createDrug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createDrugSchema.parse(req.body)
      const drug = await this.service.createDrug(data, req.tenantSchema!)
      res.status(201).json({ success: true, data: drug })
    } catch (error) {
      next(error)
    }
  }

  updateDrug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateDrugSchema.parse(req.body)
      const drug = await this.service.updateDrug(
        req.params.id,
        data,
        req.tenantSchema!,
      )
      res.json({ success: true, data: drug })
    } catch (error) {
      next(error)
    }
  }

  deleteDrug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.deleteDrug(
        req.params.id as string,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // --- Stock ---

  addStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = addStockSchema.parse(req.body)
      const stock = await this.service.addStock(
        req.params.id,
        data,
        req.userId!,
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data: stock })
    } catch (error) {
      next(error)
    }
  }

  adjustStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = adjustStockSchema.parse(req.body)
      const result = await this.service.adjustStock(
        req.params.id,
        data,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getStockHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getStockHistory(
        req.params.id,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // --- Alerts ---

  expiringDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = expiringSchema.parse(req.query)
      const result = await this.service.getExpiringDrugs(
        filters,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  lowStockDrugs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getLowStockDrugs(req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // --- Dispensing ---

  getPending = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getPendingDispensing(req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  dispense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = dispenseSchema.parse(req.body)
      const result = await this.service.dispense(
        req.params.prescriptionId,
        data,
        req.userId!,
        req.tenantSchema!,
      )
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getDispensing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getDispensingDetail(
        req.params.id,
        req.tenantSchema!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
