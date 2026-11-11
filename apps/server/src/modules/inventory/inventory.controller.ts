import { Request, Response, NextFunction } from 'express'
import { InventoryService } from './inventory.service'
import { z } from 'zod'

const createTransferSchema = z.object({
  drug_id: z.string().uuid(),
  from_location: z.string().min(1).max(100),
  to_location: z.string().min(1).max(100),
  jumlah: z.number().int().min(1),
  catatan: z.string().max(500).optional(),
})

const rejectSchema = z.object({
  alasan: z.string().min(1).max(500),
})

export class InventoryController {
  constructor(private service: InventoryService) {}

  createTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createTransferSchema.parse(req.body)
      const transfer = await this.service.createTransfer(data, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data: transfer })
    } catch (error) {
      next(error)
    }
  }

  approveTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transfer = await this.service.approveTransfer(
        req.params.id, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: transfer })
    } catch (error) {
      next(error)
    }
  }

  completeTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transfer = await this.service.completeTransfer(
        req.params.id, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: transfer })
    } catch (error) {
      next(error)
    }
  }

  rejectTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { alasan } = rejectSchema.parse(req.body)
      const transfer = await this.service.rejectTransfer(
        req.params.id, alasan, req.userId!, req.tenantSchema!,
      )
      res.json({ success: true, data: transfer })
    } catch (error) {
      next(error)
    }
  }

  listTransfers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listTransfers({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status as string | undefined,
        from_location: req.query.from_location as string | undefined,
        to_location: req.query.to_location as string | undefined,
        search: req.query.search as string | undefined,
      }, req.tenantSchema!)
      res.json({ success: true, data: result.data, meta: result.meta })
    } catch (error) {
      next(error)
    }
  }

  getTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transfer = await this.service.getTransfer(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: transfer })
    } catch (error) {
      next(error)
    }
  }
}
