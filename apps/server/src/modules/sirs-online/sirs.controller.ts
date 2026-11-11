import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { SirsService } from './sirs.service'

const configSchema = z.object({
  kode_rs: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  endpoint: z.string().url().optional().or(z.literal('')),
  mode: z.enum(['sandbox', 'production']).optional(),
  auto_send_rl13: z.boolean().optional(),
  rl13_times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(4).optional(),
})

const periodSchema = z.object({
  tahun: z.coerce.number().int().min(2020).max(2100),
  bulan: z.coerce.number().int().min(1).max(12),
})

const sendSchema = z.object({
  rl_type: z.string().min(1),
  periode: z.string().min(1),
})

const RL_TYPES = [
  'rl13', 'rl32', 'rl33', 'rl34', 'rl35',
  'rl38', 'rl39', 'rl312', 'rl41', 'rl51',
] as const

export class SirsController {
  constructor(private service: SirsService) {}

  // --- Config ---
  getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await this.service.getConfig(req.tenantSchema!)
      res.json({ success: true, data: config })
    } catch (error) { next(error) }
  }

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = configSchema.parse(req.body)
      const config = await this.service.updateConfig(req.tenantSchema!, data, req.userId!)
      res.json({ success: true, data: config })
    } catch (error) { next(error) }
  }

  testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.testConnection(req.tenantSchema!)
      res.json({ success: true, data: result })
    } catch (error) { next(error) }
  }

  // --- Generate RL ---
  generateRL = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rlType = req.params.rlType
      if (!RL_TYPES.includes(rlType as typeof RL_TYPES[number])) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_RL_TYPE', message: `RL type '${rlType}' tidak valid` },
        })
      }

      const schema = req.tenantSchema!

      if (rlType === 'rl13') {
        const data = await this.service.generateRL13(schema)
        return res.json({ success: true, data })
      }

      const period = periodSchema.parse(req.query)

      const generators: Record<string, () => Promise<unknown>> = {
        rl32: () => this.service.generateRL32(schema, period),
        rl33: () => this.service.generateRL33(schema, period),
        rl34: () => this.service.generateRL34(schema, period),
        rl35: () => this.service.generateRL35(schema, period),
        rl38: () => this.service.generateRL38(schema, period),
        rl39: () => this.service.generateRL39(schema, period),
        rl312: () => this.service.generateRL312(schema, period),
        rl41: () => this.service.generateRL41(schema, period),
        rl51: () => this.service.generateRL51(schema, period),
      }

      const data = await generators[rlType]!()
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // --- Generate All ---
  generateAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = periodSchema.parse(req.query)
      const data = await this.service.generateAll(req.tenantSchema!, period)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // --- Indikator RS ---
  getIndikator = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = periodSchema.parse(req.query)
      const data = await this.service.generateIndikator(req.tenantSchema!, period)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // --- Send to Kemenkes ---
  sendToKemenkes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rl_type, periode } = sendSchema.parse(req.body)
      const schema = req.tenantSchema!

      // Generate the data first
      const period = this.parsePeriode(periode)

      const generators: Record<string, () => Promise<unknown>> = {
        rl13: () => this.service.generateRL13(schema),
        rl32: () => this.service.generateRL32(schema, period),
        rl33: () => this.service.generateRL33(schema, period),
        rl34: () => this.service.generateRL34(schema, period),
        rl35: () => this.service.generateRL35(schema, period),
        rl38: () => this.service.generateRL38(schema, period),
        rl39: () => this.service.generateRL39(schema, period),
        rl312: () => this.service.generateRL312(schema, period),
        rl41: () => this.service.generateRL41(schema, period),
        rl51: () => this.service.generateRL51(schema, period),
      }

      if (!generators[rl_type]) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_RL_TYPE', message: `RL type '${rl_type}' tidak valid` },
        })
      }

      const data = await generators[rl_type]!()
      const submission = await this.service.sendToKemenkes(
        schema, rl_type, periode, data, req.userId!,
      )

      res.json({ success: true, data: submission })
    } catch (error) { next(error) }
  }

  // --- Submission Log ---
  listSubmissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
      const offset = parseInt(req.query.offset as string) || 0
      const rlType = req.query.rl_type as string | undefined
      const status = req.query.status as string | undefined

      const result = await this.service.listSubmissions(
        req.tenantSchema!, { limit, offset, rlType, status },
      )
      res.json({ success: true, ...result })
    } catch (error) { next(error) }
  }

  getSubmissionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getSubmissionStats(req.tenantSchema!)
      res.json({ success: true, data: stats })
    } catch (error) { next(error) }
  }

  // --- Helper ---
  private parsePeriode(periode: string): { tahun: number; bulan: number } {
    const parts = periode.split('/')
    if (parts.length === 2) {
      return { bulan: parseInt(parts[0]), tahun: parseInt(parts[1]) }
    }
    const now = new Date()
    return { tahun: now.getFullYear(), bulan: now.getMonth() + 1 }
  }
}
