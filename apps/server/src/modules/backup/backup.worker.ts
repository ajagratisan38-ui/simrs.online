import { Queue, Worker, type Job } from 'bullmq'
import { env } from '../../config/env'
import { db } from '../../config/database'
import { BackupService } from './backup.service'
import { logger } from '../../shared/logger'

const redisUrl = new URL(env.redis.url)
const connection = {
  host: redisUrl.hostname || '127.0.0.1',
  port: parseInt(redisUrl.port || '6379', 10),
  password: redisUrl.password || undefined,
}

// --- Queue ---

export const backupQueue = new Queue('backup-scheduler', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { age: 86_400 },
    removeOnFail: { age: 86_400 * 7 },
  },
})

// --- Worker ---

const backupService = new BackupService(db)

export const backupWorker = new Worker(
  'backup-scheduler',
  async (_job: Job) => {
    logger.info('Backup scheduler tick — checking schedule')
    const result = await backupService.checkAndRunSchedule()
    if (result) {
      logger.info('Scheduled backup completed', {
        id: result.id,
        status: result.status,
        filename: result.filename,
      })
    }
    return { ran: !!result, backupId: result?.id || null }
  },
  {
    connection,
    concurrency: 1,
  },
)

backupWorker.on('failed', (job, err) => {
  logger.error('Backup scheduler job failed', {
    jobId: job?.id,
    error: err.message,
  })
})

backupWorker.on('completed', (job) => {
  logger.debug('Backup scheduler job completed', { jobId: job.id })
})

// --- Start repeatable job (every 15 minutes check) ---

export async function initBackupScheduler() {
  try {
    // Remove existing repeatable jobs
    const existing = await backupQueue.getRepeatableJobs()
    for (const job of existing) {
      await backupQueue.removeRepeatableByKey(job.key)
    }

    // Add repeatable job: check every 15 minutes
    await backupQueue.add(
      'check-schedule',
      {},
      {
        repeat: {
          pattern: '*/15 * * * *',
        },
      },
    )

    logger.info('Backup scheduler initialized (checks every 15 minutes)')
  } catch (err) {
    logger.warn('Failed to initialize backup scheduler', {
      error: (err as Error).message,
    })
  }
}
