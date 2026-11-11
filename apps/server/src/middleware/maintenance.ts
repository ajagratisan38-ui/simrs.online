import { Request, Response, NextFunction } from 'express'
import { db } from '../config/database'
import { logger } from '../shared/logger'

let cachedMaintenanceMode: boolean | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 30_000 // 30 seconds

async function isMaintenanceMode(): Promise<boolean> {
  const now = Date.now()
  if (cachedMaintenanceMode !== null && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedMaintenanceMode
  }

  try {
    const row = await db('platform_settings')
      .where({ key: 'maintenance_mode' })
      .select('value')
      .first()

    cachedMaintenanceMode = row?.value === 'true'
    cacheLoadedAt = now
    return cachedMaintenanceMode
  } catch (err) {
    logger.error('Failed to check maintenance mode', { error: String(err) })
    return false
  }
}

export function invalidateMaintenanceCache(): void {
  cachedMaintenanceMode = null
  cacheLoadedAt = 0
}

export function maintenanceGuard(req: Request, res: Response, next: NextFunction): void {
  const path = req.path

  // Always bypass these paths
  if (
    path === '/api/health' ||
    path.startsWith('/api/v1/super-admin') ||
    path.startsWith('/api/v1/auth') ||
    path.startsWith('/api/v1/register') ||
    path.startsWith('/api-docs') ||
    path.startsWith('/uploads')
  ) {
    next()
    return
  }

  isMaintenanceMode()
    .then((maintenance) => {
      if (maintenance) {
        res.status(503).json({
          success: false,
          error: {
            code: 'MAINTENANCE',
            message: 'Platform sedang dalam mode maintenance. Silakan coba beberapa saat lagi.',
          },
        })
      } else {
        next()
      }
    })
    .catch(() => next())
}
