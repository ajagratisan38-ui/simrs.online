import { Queue, Worker, type Job } from 'bullmq'
import { env } from '../../config/env'
import { db } from '../../config/database'
import { SatusehatService } from './satusehat.service'
import { logger } from '../../shared/logger'

// --- Queue & Job Types ---

export interface SatusehatSyncJob {
  visitId: string
  tenantSchema: string
  attempt?: number
}

const redisUrl = new URL(env.redis.url)
const connection = {
  host: redisUrl.hostname || '127.0.0.1',
  port: parseInt(redisUrl.port || '6379', 10),
  password: redisUrl.password || undefined,
}

export const satusehatQueue = new Queue<SatusehatSyncJob>(
  'satusehat-sync',
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5_000,
      },
      removeOnComplete: { age: 86_400 },
      removeOnFail: { age: 604_800 },
    },
  },
)

// --- Worker ---

const satusehatService = new SatusehatService(db)

export const satusehatWorker = new Worker<SatusehatSyncJob>(
  'satusehat-sync',
  async (job: Job<SatusehatSyncJob>) => {
    const { visitId, tenantSchema } = job.data

    logger.info('SATUSEHAT sync job started', {
      jobId: job.id,
      visitId,
      tenantSchema,
      attempt: job.attemptsMade + 1,
    })

    const result = await satusehatService.syncVisit(visitId, tenantSchema)

    logger.info('SATUSEHAT sync job completed', {
      jobId: job.id,
      visitId,
      encounterId: result.encounterId,
      conditions: result.conditionIds.length,
      observations: result.observationIds.length,
      medications: result.medicationIds.length,
    })

    return result
  },
  {
    connection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60_000,
    },
  },
)

// --- Event Listeners ---

satusehatWorker.on('completed', (job) => {
  logger.info('SATUSEHAT sync job completed', {
    jobId: job.id,
    visitId: job.data.visitId,
  })
})

satusehatWorker.on('failed', (job, err) => {
  logger.error('SATUSEHAT sync job failed', {
    jobId: job?.id,
    visitId: job?.data.visitId,
    error: err.message,
    attempt: job?.attemptsMade,
  })
})

satusehatWorker.on('error', (err) => {
  logger.error('SATUSEHAT worker error', { error: err.message })
})

// --- Helper to enqueue ---

export async function enqueueSatusehatSync(
  visitId: string,
  tenantSchema: string,
): Promise<string> {
  const job = await satusehatQueue.add(
    'sync-visit',
    { visitId, tenantSchema },
    { jobId: `satusehat-${tenantSchema}-${visitId}` },
  )
  logger.info('SATUSEHAT sync job enqueued', {
    jobId: job.id,
    visitId,
  })
  return job.id!
}
