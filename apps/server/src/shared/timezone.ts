import { db } from '../config/database'
import { logger } from './logger'

const DEFAULT_TZ = 'Asia/Jakarta'
const DEFAULT_LOCALE = 'id-ID'

let cachedTimezone: string | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 300_000 // 5 minutes

async function loadTimezone(): Promise<string> {
  const now = Date.now()
  if (cachedTimezone && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedTimezone
  }

  try {
    const row = await db('platform_settings')
      .where({ key: 'default_timezone' })
      .select('value')
      .first()

    cachedTimezone = row?.value || DEFAULT_TZ
    cacheLoadedAt = now
    return cachedTimezone
  } catch (err) {
    logger.error('Failed to load timezone setting', { error: String(err) })
    return cachedTimezone || DEFAULT_TZ
  }
}

export function invalidateTimezoneCache(): void {
  cachedTimezone = null
  cacheLoadedAt = 0
}

export async function getPlatformTimezone(): Promise<string> {
  return loadTimezone()
}

export async function formatDateTime(date: Date | string): Promise<string> {
  const tz = await loadTimezone()
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(DEFAULT_LOCALE, { timeZone: tz })
}

export async function formatDate(date: Date | string): Promise<string> {
  const tz = await loadTimezone()
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(DEFAULT_LOCALE, { timeZone: tz })
}

export async function formatTime(date: Date | string): Promise<string> {
  const tz = await loadTimezone()
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(DEFAULT_LOCALE, { timeZone: tz })
}
