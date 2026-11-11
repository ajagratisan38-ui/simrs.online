import { Request, Response, NextFunction } from 'express'
import { LogbookService } from './logbook.service'

export class LogbookController {
  constructor(private service: LogbookService) {}

  getLogbook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.doctorId || req.userId!
      const page = Math.max(1, Number(req.query.page) || 1)
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))

      const result = await this.service.getLogbook(
        doctorId,
        {
          page,
          limit,
          startDate: req.query.startDate as string | undefined,
          endDate: req.query.endDate as string | undefined,
          tipe: req.query.tipe as string | undefined,
          search: req.query.search as string | undefined,
        },
        req.tenantSchema!,
      )

      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.doctorId || req.userId!

      const stats = await this.service.getLogbookStats(
        doctorId,
        req.tenantSchema!,
        req.query.startDate as string | undefined,
        req.query.endDate as string | undefined,
      )

      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }
}
