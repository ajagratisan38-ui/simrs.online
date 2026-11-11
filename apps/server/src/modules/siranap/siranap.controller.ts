import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { SiranapService } from './siranap.service'

const configSchema = z.object({
  kode_rs: z.string().min(1, 'Kode RS wajib diisi').optional(),
  password: z.string().min(1, 'Password wajib diisi').optional(),
  endpoint: z.string().url().optional().or(z.literal('')),
  auto_send: z.boolean().optional(),
  send_times: z.array(
    z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu HH:mm'),
  ).min(1).max(4).optional(),
  send_on_change: z.boolean().optional(),
})

export class SiranapController {
  constructor(private service: SiranapService) {}

  getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await this.service.getConfig(req.tenantSchema!)
      res.json({ success: true, data: config })
    } catch (error) {
      next(error)
    }
  }

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = configSchema.parse(req.body)
      const config = await this.service.updateConfig(
        req.tenantSchema!,
        data,
        req.userId!,
      )
      res.json({ success: true, data: config })
    } catch (error) {
      next(error)
    }
  }

  testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.testConnection(req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getLiveBedData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getLiveBedData(req.tenantSchema!)

      const totalTT = data.reduce((s, r) => s + r.total_tt, 0)
      const totalTerpakai = data.reduce(
        (s, r) => s + r.terpakai_pria + r.terpakai_wanita, 0,
      )
      const totalKosong = data.reduce(
        (s, r) => s + r.kosong_pria + r.kosong_wanita, 0,
      )
      const bor = totalTT > 0
        ? Math.round((totalTerpakai / totalTT) * 100)
        : 0

      res.json({
        success: true,
        data: {
          rooms: data,
          summary: {
            total_ruang: data.length,
            total_tt: totalTT,
            total_terpakai: totalTerpakai,
            total_kosong: totalKosong,
            bor,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  sendNow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.sendToKemenkes(
        req.tenantSchema!,
        req.userId!,
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  listSubmissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
      const offset = parseInt(req.query.offset as string) || 0
      const status = req.query.status as 'success' | 'failed' | undefined
      const days = parseInt(req.query.days as string) || undefined

      const result = await this.service.listSubmissions(
        req.tenantSchema!,
        { limit, offset, status, days },
      )

      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  getSubmission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const submission = await this.service.getSubmission(
        req.params.id,
        req.tenantSchema!,
      )
      res.json({ success: true, data: submission })
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
