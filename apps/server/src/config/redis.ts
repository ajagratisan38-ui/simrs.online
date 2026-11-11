import Redis from 'ioredis'
import { env } from './env'
import { logger } from '../shared/logger'

export const redis = new Redis(env.redis.url, {
  maxRetriesPerRequest: 3,
  commandTimeout: 5000,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (times > 10) {
      logger.error('Redis max reconnect attempts reached')
      return null
    }
    const delay = Math.min(times * 200, 3000)
    return delay
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'EPIPE']
    return targetErrors.some((e) => err.message.includes(e))
  },
  lazyConnect: true,
})

redis.on('connect', () => {
  logger.info('Redis connection established')
})

redis.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message })
})

redis.on('close', () => {
  logger.warn('Redis connection closed')
})

export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.connect()
    await redis.ping()
    logger.info('Redis ping successful')
    return true
  } catch (error) {
    logger.error('Redis connection failed', { error })
    return false
  }
}
