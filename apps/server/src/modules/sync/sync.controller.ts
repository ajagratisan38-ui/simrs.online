import { Request, Response, NextFunction } from 'express'
import { SyncService } from './sync.service'
import { syncBatchSchema } from './sync.validator'

export class SyncController {
  constructor(private syncService: SyncService) {}

  processBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { operations } = syncBatchSchema.parse(req.body)
      const userId = req.userId!
      const tenantSchema = req.tenantSchema!

      const result = await this.syncService.processBatch(
        operations,
        userId,
        tenantSchema,
      )

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantSchema = req.tenantSchema!
      const status = await this.syncService.getSyncStatus(tenantSchema)
      res.json({ success: true, data: status })
    } catch (error) {
      next(error)
    }
  }
}
