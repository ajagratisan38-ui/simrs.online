import { Queue, Worker } from 'bullmq'
import { env } from '../../config/env'
import { db } from '../../config/database'
import { RegistrationService } from './registration.service'
import { logger } from '../../shared/logger'

const QUEUE_NAME = 'subscription-expiry'

const redisUrl = new URL(env.redis.url)
const connection = {
  host: redisUrl.hostname || '127.0.0.1',
  port: parseInt(redisUrl.port || '6379', 10),
  password: redisUrl.password || undefined,
}

export async function initExpiryScheduler(): Promise<void> {
  const expiryQueue = new Queue(QUEUE_NAME, { connection })

  // Remove existing repeatable jobs and add fresh one
  const existingJobs = await expiryQueue.getRepeatableJobs()
  for (const job of existingJobs) {
    await expiryQueue.removeRepeatableByKey(job.key)
  }

  // Run daily at 08:00 WIB (01:00 UTC)
  await expiryQueue.add(
    'check-expiring',
    {},
    {
      repeat: { pattern: '0 1 * * *' },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    },
  )

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const service = new RegistrationService(db)
      const result = await service.checkExpiringSubscriptions()
      logger.info('Subscription expiry check job completed', result)
      return result
    },
    { connection, concurrency: 1 },
  )

  worker.on('completed', (job) => {
    logger.info(`Expiry check job ${job?.id} completed`)
  })

  worker.on('failed', (job, err) => {
    logger.error(`Expiry check job ${job?.id} failed`, { error: err.message })
  })

  logger.info('Subscription expiry scheduler initialized — runs daily at 08:00 WIB')
}
