import type { Knex } from 'knex'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../../shared/logger'
import { env } from '../../config/env'

const execAsync = promisify(exec)

// --- Types ---

export interface BackupLog {
  id: string
  tenant_schema: string | null
  type: 'auto_daily' | 'auto_weekly' | 'manual' | 'pre_migration'
  status: 'running' | 'success' | 'failed'
  filename: string | null
  filepath: string | null
  size_bytes: number | null
  storage: 'local' | 's3' | 'gcs'
  storage_url: string | null
  error_message: string | null
  duration_ms: number | null
  pg_version: string | null
  table_count: number | null
  triggered_by: string | null
  started_at: string
  completed_at: string | null
}

export interface BackupSchedule {
  id: string
  tenant_schema: string | null
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  day_of_week: number | null
  day_of_month: number | null
  retention_days: number
  is_active: boolean
  storage: 'local' | 's3' | 'gcs'
  storage_config: Record<string, unknown> | null
  last_run_at: string | null
  next_run_at: string | null
}

export interface BackupStats {
  totalBackups: number
  successfulBackups: number
  failedBackups: number
  totalSizeBytes: number
  lastSuccessful: BackupLog | null
  lastFailed: BackupLog | null
  scheduleActive: boolean
}

export interface CreateBackupInput {
  type?: 'manual' | 'pre_migration'
  tenantSchema?: string
  triggeredBy?: string
}

export interface UpdateScheduleInput {
  frequency?: 'daily' | 'weekly' | 'monthly'
  time?: string
  day_of_week?: number
  day_of_month?: number
  retention_days?: number
  is_active?: boolean
  storage?: 'local' | 's3' | 'gcs'
  storage_config?: Record<string, unknown>
}

// --- Constants ---

const BACKUP_DIR = path.resolve(
  process.env.BACKUP_DIR || path.join(__dirname, '../../../../backups'),
)

// --- Service ---

export class BackupService {
  constructor(private db: Knex) {}

  // ==============================
  // CREATE BACKUP
  // ==============================

  async createBackup(input: CreateBackupInput = {}): Promise<BackupLog> {
    const type = input.type || 'manual'
    const startTime = Date.now()

    // Ensure backup dir exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `simrs_${type}_${timestamp}.sql.gz`
    const filepath = path.join(BACKUP_DIR, filename)

    // Insert log as running
    const [log] = await this.db('backup_logs')
      .insert({
        tenant_schema: input.tenantSchema || null,
        type,
        status: 'running',
        filename,
        filepath,
        storage: 'local',
        triggered_by: input.triggeredBy || null,
        started_at: new Date(),
      })
      .returning('*')

    try {
      // Get PG version
      const versionRow = await this.db.raw('SHOW server_version')
      const pgVersion = versionRow?.rows?.[0]?.server_version || 'unknown'

      // Get table count
      const tableCountRow = await this.db.raw(`
        SELECT COUNT(*) as cnt FROM information_schema.tables
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      `)
      const tableCount = Number(tableCountRow?.rows?.[0]?.cnt || 0)

      // Parse DB URL for pg_dump
      const dbUrl = env.database.url
      const isDocker = process.env.USE_DOCKER_PG === 'true'
      const containerName = process.env.POSTGRES_CONTAINER || 'simrs-postgres'

      let cmd: string
      if (isDocker) {
        const pgUser = process.env.POSTGRES_USER || 'simrs'
        const pgDb = process.env.POSTGRES_DB || 'simrs_db'
        cmd = `docker exec ${containerName} pg_dump -U ${pgUser} -d ${pgDb} --no-owner --no-privileges --format=plain | gzip > "${filepath}"`
      } else {
        cmd = `pg_dump "${dbUrl}" --no-owner --no-privileges --format=plain | gzip > "${filepath}"`
      }

      await execAsync(cmd, { timeout: 600_000 })

      // Get file size
      const stats = fs.statSync(filepath)
      const sizeBytes = stats.size
      const durationMs = Date.now() - startTime

      // Update log as success
      const [updated] = await this.db('backup_logs')
        .where({ id: log.id })
        .update({
          status: 'success',
          size_bytes: sizeBytes,
          duration_ms: durationMs,
          pg_version: pgVersion,
          table_count: tableCount,
          completed_at: new Date(),
        })
        .returning('*')

      logger.info('Backup completed', {
        id: log.id,
        filename,
        sizeBytes,
        durationMs,
        type,
      })

      // Cleanup old backups per retention
      await this.cleanupOldBackups()

      return updated
    } catch (err) {
      const durationMs = Date.now() - startTime
      const errorMessage = (err as Error).message

      await this.db('backup_logs')
        .where({ id: log.id })
        .update({
          status: 'failed',
          error_message: errorMessage,
          duration_ms: durationMs,
          completed_at: new Date(),
        })

      logger.error('Backup failed', {
        id: log.id,
        error: errorMessage,
        type,
      })

      const [failed] = await this.db('backup_logs')
        .where({ id: log.id })
        .returning('*')

      return failed
    }
  }

  // ==============================
  // LIST BACKUPS
  // ==============================

  async listBackups(page = 1, limit = 20, statusFilter?: string): Promise<{
    data: BackupLog[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const query = this.db('backup_logs')

    if (statusFilter && statusFilter !== 'all') {
      query.where({ status: statusFilter })
    }

    const countQuery = query.clone().count('id as count')
    const total = Number((await countQuery)[0]?.count || 0)

    const data = await query
      .orderBy('started_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  // ==============================
  // GET BACKUP BY ID
  // ==============================

  async getBackup(id: string): Promise<BackupLog | null> {
    return this.db('backup_logs').where({ id }).first()
  }

  // ==============================
  // DELETE BACKUP
  // ==============================

  async deleteBackup(id: string): Promise<void> {
    const backup = await this.db('backup_logs').where({ id }).first()
    if (!backup) return

    // Delete file if exists
    if (backup.filepath && backup.storage === 'local') {
      try {
        if (fs.existsSync(backup.filepath)) {
          fs.unlinkSync(backup.filepath)
        }
      } catch (err) {
        logger.warn('Failed to delete backup file', {
          filepath: backup.filepath,
          error: (err as Error).message,
        })
      }
    }

    await this.db('backup_logs').where({ id }).del()
  }

  // ==============================
  // DOWNLOAD BACKUP (get file path)
  // ==============================

  async getBackupFilePath(id: string): Promise<{ filepath: string; filename: string } | null> {
    const backup = await this.db('backup_logs').where({ id, status: 'success' }).first()
    if (!backup || !backup.filepath) return null

    if (backup.storage === 'local' && fs.existsSync(backup.filepath)) {
      return { filepath: backup.filepath, filename: backup.filename }
    }

    return null
  }

  // ==============================
  // STATS
  // ==============================

  async getStats(): Promise<BackupStats> {
    const totalRow = await this.db('backup_logs').count('id as count')
    const successRow = await this.db('backup_logs').where({ status: 'success' }).count('id as count')
    const failedRow = await this.db('backup_logs').where({ status: 'failed' }).count('id as count')
    const sizeRow = await this.db('backup_logs')
      .where({ status: 'success' })
      .sum('size_bytes as total')

    const lastSuccessful = await this.db('backup_logs')
      .where({ status: 'success' })
      .orderBy('completed_at', 'desc')
      .first()

    const lastFailed = await this.db('backup_logs')
      .where({ status: 'failed' })
      .orderBy('completed_at', 'desc')
      .first()

    const schedule = await this.getSchedule()

    return {
      totalBackups: Number(totalRow[0]?.count || 0),
      successfulBackups: Number(successRow[0]?.count || 0),
      failedBackups: Number(failedRow[0]?.count || 0),
      totalSizeBytes: Number(sizeRow[0]?.total || 0),
      lastSuccessful: lastSuccessful || null,
      lastFailed: lastFailed || null,
      scheduleActive: schedule?.is_active ?? false,
    }
  }

  // ==============================
  // SCHEDULE MANAGEMENT
  // ==============================

  async getSchedule(): Promise<BackupSchedule | null> {
    let schedule = await this.db('backup_schedules').first()

    // Auto-create default schedule if none
    if (!schedule) {
      const [created] = await this.db('backup_schedules')
        .insert({
          frequency: 'daily',
          time: '02:00',
          retention_days: 30,
          is_active: true,
          storage: 'local',
          next_run_at: this.calcNextRunAt('daily', '02:00'),
        })
        .returning('*')
      schedule = created
    }

    return schedule
  }

  async updateSchedule(input: UpdateScheduleInput): Promise<BackupSchedule> {
    let schedule = await this.getSchedule()

    const nextRunAt = this.calcNextRunAt(
      input.frequency || schedule!.frequency,
      input.time || schedule!.time,
      input.day_of_week ?? schedule!.day_of_week ?? undefined,
      input.day_of_month ?? schedule!.day_of_month ?? undefined,
    )

    const [updated] = await this.db('backup_schedules')
      .where({ id: schedule!.id })
      .update({
        ...input,
        next_run_at: input.is_active === false ? null : nextRunAt,
        updated_at: new Date(),
      })
      .returning('*')

    return updated
  }

  // ==============================
  // CRON TICK — called by BullMQ repeatable job
  // ==============================

  async checkAndRunSchedule(): Promise<BackupLog | null> {
    const schedule = await this.getSchedule()
    if (!schedule || !schedule.is_active) return null

    const now = new Date()
    const nextRun = schedule.next_run_at ? new Date(schedule.next_run_at) : null

    if (!nextRun || now < nextRun) return null

    logger.info('Running scheduled backup', {
      frequency: schedule.frequency,
      scheduleId: schedule.id,
    })

    const type = schedule.frequency === 'weekly' ? 'auto_weekly' : 'auto_daily'
    const backup = await this.createBackup({ type })

    // Update next run
    const newNext = this.calcNextRunAt(
      schedule.frequency,
      schedule.time,
      schedule.day_of_week ?? undefined,
      schedule.day_of_month ?? undefined,
    )

    await this.db('backup_schedules')
      .where({ id: schedule.id })
      .update({
        last_run_at: now,
        next_run_at: newNext,
        updated_at: now,
      })

    return backup
  }

  // ==============================
  // RESTORE (validate only — actual restore is manual for safety)
  // ==============================

  async validateRestore(id: string): Promise<{
    valid: boolean
    filename: string
    sizeBytes: number
    createdAt: string
    message: string
  }> {
    const backup = await this.db('backup_logs')
      .where({ id, status: 'success' })
      .first()

    if (!backup) {
      return {
        valid: false,
        filename: '',
        sizeBytes: 0,
        createdAt: '',
        message: 'Backup tidak ditemukan atau belum selesai',
      }
    }

    if (backup.storage === 'local') {
      if (!backup.filepath || !fs.existsSync(backup.filepath)) {
        return {
          valid: false,
          filename: backup.filename || '',
          sizeBytes: Number(backup.size_bytes || 0),
          createdAt: backup.started_at,
          message: 'File backup tidak ditemukan di server',
        }
      }
    }

    return {
      valid: true,
      filename: backup.filename || '',
      sizeBytes: Number(backup.size_bytes || 0),
      createdAt: backup.started_at,
      message: 'Backup valid dan siap untuk di-restore',
    }
  }

  async getRestoreCommand(id: string): Promise<string | null> {
    const backup = await this.db('backup_logs')
      .where({ id, status: 'success' })
      .first()

    if (!backup || !backup.filepath) return null

    const isDocker = process.env.USE_DOCKER_PG === 'true'
    const containerName = process.env.POSTGRES_CONTAINER || 'simrs-postgres'
    const pgUser = process.env.POSTGRES_USER || 'simrs'
    const pgDb = process.env.POSTGRES_DB || 'simrs_db'

    if (isDocker) {
      return [
        `# 1. Stop application (recommended)`,
        `docker-compose stop server`,
        ``,
        `# 2. Restore from backup`,
        `gunzip < "${backup.filepath}" | docker exec -i ${containerName} psql -U ${pgUser} -d ${pgDb}`,
        ``,
        `# 3. Restart application`,
        `docker-compose start server`,
      ].join('\n')
    }

    return [
      `# 1. Stop application`,
      `pm2 stop simrs-server`,
      ``,
      `# 2. Restore from backup`,
      `gunzip < "${backup.filepath}" | psql "${env.database.url}"`,
      ``,
      `# 3. Restart application`,
      `pm2 start simrs-server`,
    ].join('\n')
  }

  // ==============================
  // CLEANUP
  // ==============================

  private async cleanupOldBackups(): Promise<number> {
    const schedule = await this.getSchedule()
    const retentionDays = schedule?.retention_days ?? 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - retentionDays)

    const oldBackups = await this.db('backup_logs')
      .where('started_at', '<', cutoff)
      .where({ status: 'success', storage: 'local' })

    let deleted = 0
    for (const backup of oldBackups) {
      try {
        if (backup.filepath && fs.existsSync(backup.filepath)) {
          fs.unlinkSync(backup.filepath)
        }
        await this.db('backup_logs').where({ id: backup.id }).del()
        deleted++
      } catch (err) {
        logger.warn('Cleanup backup failed', {
          id: backup.id,
          error: (err as Error).message,
        })
      }
    }

    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} old backup(s)`)
    }

    return deleted
  }

  // ==============================
  // HELPERS
  // ==============================

  private calcNextRunAt(
    frequency: string,
    time: string,
    dayOfWeek?: number,
    dayOfMonth?: number,
  ): Date {
    const [hours, minutes] = time.split(':').map(Number)
    const next = new Date()
    next.setHours(hours!, minutes!, 0, 0)

    if (next <= new Date()) {
      next.setDate(next.getDate() + 1)
    }

    if (frequency === 'weekly' && dayOfWeek !== undefined) {
      while (next.getDay() !== dayOfWeek) {
        next.setDate(next.getDate() + 1)
      }
    }

    if (frequency === 'monthly' && dayOfMonth !== undefined) {
      next.setDate(dayOfMonth)
      if (next <= new Date()) {
        next.setMonth(next.getMonth() + 1)
      }
    }

    return next
  }
}
