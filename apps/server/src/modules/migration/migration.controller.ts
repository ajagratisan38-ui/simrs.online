import { Request, Response, NextFunction } from 'express'
import { MigrationService, KhanzaConnectionConfig } from './migration.service'
import { ValidationError } from '../../shared/errors'

export class MigrationController {
  constructor(private service: MigrationService) {}

  testConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = this.parseConfig(req.body)
      const result = await this.service.testConnection(config)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  analyze = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = this.parseConfig(req.body)
      const tables = await this.service.analyze(config)
      const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0)
      const tablesFound = tables.filter((t) => t.exists).length
      res.json({
        success: true,
        data: {
          tables,
          summary: {
            totalTables: tables.length,
            tablesFound,
            tablesMissing: tables.length - tablesFound,
            totalRows,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  startMigration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = this.parseConfig(req.body)
      const dryRun = req.body.dryRun === true
      const tenantSchema = req.tenantSchema!

      const sessionId = await this.service.startMigration(config, tenantSchema, dryRun)
      res.json({
        success: true,
        data: {
          sessionId,
          message: dryRun
            ? 'Dry-run dimulai — tidak ada data yang ditulis'
            : 'Migrasi dimulai',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.params.sessionId as string
      if (!sessionId) {
        throw new ValidationError('sessionId wajib diisi')
      }

      const progress = this.service.getProgress(sessionId)
      if (!progress) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Sesi migrasi tidak ditemukan' },
        })
        return
      }

      res.json({ success: true, data: progress })
    } catch (error) {
      next(error)
    }
  }

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = this.parseConfig(req.body)
      const tenantSchema = req.tenantSchema!
      const results = await this.service.verify(config, tenantSchema)
      res.json({ success: true, data: results })
    } catch (error) {
      next(error)
    }
  }

  private parseConfig(body: Record<string, unknown>): KhanzaConnectionConfig {
    const host = body.host as string
    const port = Number(body.port) || 3306
    const user = body.user as string
    const password = body.password as string
    const database = (body.database as string) || 'sik'

    if (!host || !user) {
      throw new ValidationError('Host dan user database Khanza wajib diisi')
    }

    return { host, port, user, password: password || '', database }
  }
}
