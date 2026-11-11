import { Queue, Worker, type Job } from 'bullmq'
import { env } from '../../config/env'
import { db } from '../../config/database'
import { SiranapService } from './siranap.service'
import { logger } from '../../shared/logger'

const redisUrl = new URL(env.redis.url)
const connection = {
  host: redisUrl.hostname || '127.0.0.1',
  port: parseInt(redisUrl.port || '6379', 10),
  password: redisUrl.password || undefined,
}

// --- Queue ---

export const siranapQueue = new Queue('siranap-scheduler', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { age: 86_400 },
    removeOnFail: { age: 86_400 * 7 },
  },
})

// --- Worker ---

const siranapService = new SiranapService(db)

export const siranapWorker = new Worker(
  'siranap-scheduler',
  async (_job: Job) => {
    logger.info('SIRANAP scheduler tick — checking tenant schedules')
    const results = await siranapService.checkAndSendScheduled()
    const sent = results.filter((r) => r.sent)
    if (sent.length > 0) {
      logger.info(`SIRANAP: sent bed data for ${sent.length} tenant(s)`, {
        tenants: sent.map((r) => r.tenant),
      })
    }
    return { checked: results.length, sent: sent.length }
  },
  {
    connection,
    concurrency: 1,
  },
)

siranapWorker.on('failed', (job, err) => {
  logger.error('SIRANAP scheduler job failed', {
    jobId: job?.id,
    error: err.message,
  })
})

siranapWorker.on('completed', (job) => {
  logger.debug('SIRANAP scheduler job completed', { jobId: job.id })
})

// --- Start repeatable job (every 15 minutes) ---

export async function initSiranapScheduler() {
  try {
    const existing = await siranapQueue.getRepeatableJobs()
    for (const job of existing) {
      await siranapQueue.removeRepeatableByKey(job.key)
    }

    await siranapQueue.add(
      'check-siranap-schedule',
      {},
      {
        repeat: {
          pattern: '*/15 * * * *',
        },
      },
    )

    logger.info('SIRANAP scheduler initialized (checks every 15 minutes)')
  } catch (err) {
    logger.warn('Failed to initialize SIRANAP scheduler', {
      error: (err as Error).message,
    })
  }
}
