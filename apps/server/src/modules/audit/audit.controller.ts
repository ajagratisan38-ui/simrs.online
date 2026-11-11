import { Request, Response, NextFunction } from 'express'
import { AuditService } from './audit.service'

export class AuditController {
  constructor(private auditService: AuditService) {}

  getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        from,
        to,
        page,
        limit,
      } = req.query

      const result = await this.auditService.getLogs({
        tenantId: req.tenantId,
        userId: userId as string,
        action: action as string,
        entityType: entityType as string,
        entityId: entityId as string,
        from: from as string,
        to: to as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      })

      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  exportLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to, action, entityType } = req.query

      const csv = await this.auditService.exportLogs({
        tenantId: req.tenantId,
        from: from as string,
        to: to as string,
        action: action as string,
        entityType: entityType as string,
      })

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      )
      res.send(csv)
    } catch (error) {
      next(error)
    }
  }

  cleanup = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await this.auditService.cleanupOldLogs()
      res.json({
        success: true,
        data: { deleted, message: `${deleted} log lama telah dihapus` },
      })
    } catch (error) {
      next(error)
    }
  }
}
