import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redis } from '../config/redis'
import { env } from '../config/env'

function createRedisStore(prefix: string) {
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (redis as any).call(...args)
      } catch {
        return null
      }
    },
    prefix,
  })
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.security.rateLimitLogin,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
    },
  },
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for']
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : req.socket.remoteAddress
    return `login:${ip ?? 'unknown'}`
  },
  store: createRedisStore('rl:login:'),
  skip: () => env.isDev,
})

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.security.rateLimitApi,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Terlalu banyak request. Coba lagi dalam 1 menit.',
    },
  },
  keyGenerator: (req) => {
    const r = req as typeof req & { userId?: string }
    if (r.userId) return `api:${r.userId}`
    const forwarded = req.headers['x-forwarded-for']
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : req.socket.remoteAddress
    return `api:${ip ?? 'unknown'}`
  },
  store: createRedisStore('rl:api:'),
  skip: () => env.isDev,
})
