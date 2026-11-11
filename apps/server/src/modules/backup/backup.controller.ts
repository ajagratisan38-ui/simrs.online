import { Request, Response, NextFunction } from 'express'
import { BackupService } from './backup.service'
import { ValidationError, NotFoundError } from '../../shared/errors'

export class BackupController {
  constructor(private service: BackupService) {}

  getStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }

  listBackups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
      const status = req.query.status as string | undefined

      const result = await this.service.listBackups(page, limit, status)
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  createBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.body.type || 'manual'
      if (!['manual', 'pre_migration'].includes(type)) {
        throw new ValidationError('Type harus manual atau pre_migration')
      }

      const backup = await this.service.createBackup({
        type,
        triggeredBy: req.user?.id,
      })

      res.status(201).json({ success: true, data: backup })
    } catch (error) {
      next(error)
    }
  }

  deleteBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      if (!id) throw new ValidationError('Backup ID wajib diisi')

      const backup = await this.service.getBackup(id)
      if (!backup) throw new NotFoundError('Backup')

      await this.service.deleteBackup(id)
      res.json({ success: true, message: 'Backup berhasil dihapus' })
    } catch (error) {
      next(error)
    }
  }

  downloadBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      if (!id) throw new ValidationError('Backup ID wajib diisi')

      const file = await this.service.getBackupFilePath(id)
      if (!file) throw new NotFoundError('File backup')

      res.setHeader('Content-Type', 'application/gzip')
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
      res.sendFile(file.filepath)
    } catch (error) {
      next(error)
    }
  }

  // Schedule endpoints
  getSchedule = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const schedule = await this.service.getSchedule()
      res.json({ success: true, data: schedule })
    } catch (error) {
      next(error)
    }
  }

  updateSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { frequency, time, day_of_week, day_of_month, retention_days, is_active, storage, storage_config } = req.body

      if (frequency && !['daily', 'weekly', 'monthly'].includes(frequency)) {
        throw new ValidationError('Frequency harus daily, weekly, atau monthly')
      }

      if (time && !/^\d{2}:\d{2}$/.test(time)) {
        throw new ValidationError('Time harus format HH:MM')
      }

      if (retention_days !== undefined && (retention_days < 1 || retention_days > 365)) {
        throw new ValidationError('Retention days harus 1-365')
      }

      if (storage && !['local', 's3', 'gcs'].includes(storage)) {
        throw new ValidationError('Storage harus local, s3, atau gcs')
      }

      const schedule = await this.service.updateSchedule({
        frequency,
        time,
        day_of_week,
        day_of_month,
        retention_days,
        is_active,
        storage,
        storage_config,
      })

      res.json({ success: true, data: schedule })
    } catch (error) {
      next(error)
    }
  }

  // Restore endpoints
  validateRestore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      if (!id) throw new ValidationError('Backup ID wajib diisi')

      const result = await this.service.validateRestore(id)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  getRestoreCommand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      if (!id) throw new ValidationError('Backup ID wajib diisi')

      const command = await this.service.getRestoreCommand(id)
      if (!command) throw new NotFoundError('Backup')

      res.json({ success: true, data: { command } })
    } catch (error) {
      next(error)
    }
  }

  // Manual cron tick (for testing)
  runScheduledCheck = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.checkAndRunSchedule()
      res.json({
        success: true,
        data: result,
        message: result ? 'Scheduled backup executed' : 'No backup due at this time',
      })
    } catch (error) {
      next(error)
    }
  }
}
