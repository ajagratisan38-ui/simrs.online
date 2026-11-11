import { Request, Response, NextFunction } from 'express'
import { db } from '../config/database'
import { logger } from '../shared/logger'

let cachedAllowedIps: string[] | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 60_000 // 1 min

async function getAllowedIps(): Promise<string[]> {
  const now = Date.now()
  if (cachedAllowedIps !== null && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedAllowedIps
  }

  try {
    const row = await db('platform_settings')
      .where({ key: 'allowed_ips_superadmin' })
      .select('value')
      .first()

    const raw = (row?.value || '').trim()
    cachedAllowedIps = raw
      ? raw.split(',').map((ip: string) => ip.trim()).filter(Boolean)
      : []
    cacheLoadedAt = now
    return cachedAllowedIps
  } catch (err) {
    logger.error('Failed to load allowed_ips_superadmin', { error: String(err) })
    return cachedAllowedIps || []
  }
}

export function invalidateIpWhitelistCache(): void {
  cachedAllowedIps = null
  cacheLoadedAt = 0
}

function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]
    return first.trim()
  }
  const realIp = req.headers['x-real-ip']
  if (realIp) {
    return (Array.isArray(realIp) ? realIp[0] : realIp).trim()
  }
  return req.ip || req.socket.remoteAddress || ''
}

function normalizeIp(ip: string): string {
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1'
  if (ip.startsWith('::ffff:')) return ip.slice(7)
  return ip
}

export function saIpWhitelist(req: Request, res: Response, next: NextFunction): void {
  getAllowedIps()
    .then((allowed) => {
      // Empty list = no restriction
      if (allowed.length === 0) {
        next()
        return
      }

      const clientIp = normalizeIp(extractClientIp(req))

      if (allowed.includes(clientIp)) {
        next()
      } else {
        logger.warn('SA access blocked by IP whitelist', {
          clientIp,
          allowed,
          path: req.path,
        })
        res.status(403).json({
          success: false,
          error: {
            code: 'IP_BLOCKED',
            message: 'Akses ditolak. IP Anda tidak terdaftar dalam whitelist super admin.',
          },
        })
      }
    })
    .catch(() => next())
}
