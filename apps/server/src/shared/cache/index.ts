import { redis } from '../../config/redis'
import { logger } from '../logger'

const CACHE_PREFIX = 'simrs:'

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cacheKey = `${CACHE_PREFIX}${key}`

  try {
    const raw = await redis.get(cacheKey)
    if (raw) {
      return JSON.parse(raw) as T
    }
  } catch {
    // Cache miss or Redis error — proceed to fn
  }

  const result = await fn()

  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', ttlSeconds)
  } catch (err) {
    logger.warn('Failed to write cache', { key: cacheKey, error: String(err) })
  }

  return result
}

export async function invalidate(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (err) {
    logger.warn('Failed to invalidate cache', { pattern, error: String(err) })
  }
}

// Pre-defined cache keys & TTLs
export const CACHE_KEYS = {
  icd10: (search: string) => `icd10:${search}`,
  drugList: (schema: string) => `drugs:${schema}:list`,
  roomList: (schema: string) => `rooms:${schema}:list`,
  doctorList: (schema: string) => `doctors:${schema}:list`,
} as const

export const CACHE_TTL = {
  ICD10: 3600,        // 1 hour — rarely changes
  DRUG_LIST: 300,     // 5 min
  ROOM_LIST: 600,     // 10 min
  DOCTOR_LIST: 300,   // 5 min
  MASTERDATA: 900,    // 15 min
} as const
