import { Request, Response, NextFunction } from 'express'
import { DashboardService, type DateRange } from './dashboard.service'
import { ValidationError } from '../../shared/errors'

function parseDateRange(req: Request): DateRange {
  const from = req.query.from as string
  const to = req.query.to as string

  if (!from || !to) {
    // Default: last 30 days
    const now = new Date()
    const thirtyAgo = new Date()
    thirtyAgo.setDate(now.getDate() - 30)
    return {
      from: thirtyAgo.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new ValidationError('Format tanggal harus YYYY-MM-DD')
  }

  if (from > to) {
    throw new ValidationError('Tanggal "from" harus sebelum "to"')
  }

  return { from, to }
}

function parseGroupBy(req: Request): 'day' | 'week' | 'month' {
  const g = req.query.groupBy as string
  if (g === 'week' || g === 'month') return g
  return 'day'
}

export class DashboardController {
  constructor(private service: DashboardService) {}

  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getOverview(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }

  visitStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(req)
      const groupBy = parseGroupBy(req)
      const data = await this.service.getVisitStats(range, groupBy, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }

  topDiagnoses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(req)
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)
      const data = await this.service.getTopDiagnoses(range, limit, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }

  revenue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const range = parseDateRange(req)
      const groupBy = parseGroupBy(req)
      const data = await this.service.getRevenueReport(range, groupBy, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }

  pharmacy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getPharmacyReport(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }

  bedOccupancy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getBedOccupancy(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  }

  exportReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validTypes = ['visits', 'revenue', 'pharmacy', 'diagnoses', 'patients', 'billing']
      const reportType = req.query.type as string
      if (!validTypes.includes(reportType)) {
        throw new ValidationError(
          `Tipe laporan harus: ${validTypes.join(', ')}`,
        )
      }

      const range = parseDateRange(req)
      const format = (req.query.format as string) || 'csv'

      if (format !== 'csv' && format !== 'xlsx' && format !== 'pdf') {
        throw new ValidationError('Format export yang didukung: csv, xlsx, pdf')
      }

      const result = await this.service.exportReport(
        reportType as 'visits' | 'revenue' | 'pharmacy' | 'diagnoses' | 'patients' | 'billing',
        range,
        format as 'csv' | 'xlsx' | 'pdf',
        req.tenantSchema!,
      )

      res.setHeader('Content-Type', result.contentType)
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`,
      )
      res.send(result.buffer)
    } catch (err) {
      next(err)
    }
  }
}
