import { Request, Response, NextFunction } from 'express'
import { db } from '../config/database'
import { NotFoundError, UnauthorizedError } from '../shared/errors'
import { logger } from '../shared/logger'

interface TenantRow {
  id: string
  slug: string
  is_active: boolean
  custom_domain: string | null
  custom_domain_verified: boolean
}

// Cached platform domain settings
let cachedPrimaryDomain: string | null = null
let cachedCustomDomainEnabled: boolean | null = null
let domainSettingsLoadedAt = 0
const DOMAIN_CACHE_TTL = 300_000 // 5 min

async function loadDomainSettings(): Promise<{ primaryDomain: string; customDomainEnabled: boolean }> {
  const now = Date.now()
  if (cachedPrimaryDomain !== null && cachedCustomDomainEnabled !== null
    && now - domainSettingsLoadedAt < DOMAIN_CACHE_TTL) {
    return { primaryDomain: cachedPrimaryDomain, customDomainEnabled: cachedCustomDomainEnabled }
  }

  try {
    const rows = await db('platform_settings')
      .whereIn('key', ['primary_domain', 'custom_domain_enabled'])
      .select('key', 'value')

    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value

    cachedPrimaryDomain = map.primary_domain || 'simrs.id'
    cachedCustomDomainEnabled = map.custom_domain_enabled === 'true'
    domainSettingsLoadedAt = now
  } catch {
    cachedPrimaryDomain = cachedPrimaryDomain || 'simrs.id'
    cachedCustomDomainEnabled = cachedCustomDomainEnabled || false
  }

  return { primaryDomain: cachedPrimaryDomain, customDomainEnabled: cachedCustomDomainEnabled }
}

export function invalidateDomainSettingsCache(): void {
  cachedPrimaryDomain = null
  cachedCustomDomainEnabled = null
  domainSettingsLoadedAt = 0
}

export async function extractTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    const { primaryDomain, customDomainEnabled } = await loadDomainSettings()

    // Prioritas: 1) header X-Tenant-Slug, 2) subdomain, 3) custom domain lookup, 4) query param
    let tenantSlug =
      (req.headers['x-tenant-slug'] as string) ||
      extractSubdomain(req.hostname, primaryDomain) ||
      (req.query.tenant as string)

    // Custom domain lookup: if no slug found and custom domains enabled, try matching hostname
    if (!tenantSlug && customDomainEnabled) {
      tenantSlug = await lookupCustomDomain(req.hostname) || undefined as unknown as string
    }

    if (!tenantSlug) {
      throw new UnauthorizedError('Tenant tidak teridentifikasi')
    }

    // Bersihkan slug
    tenantSlug = tenantSlug.toLowerCase().trim()

    // Cari tenant di database
    const tenant = await db('tenants')
      .where({ slug: tenantSlug })
      .first<TenantRow>()

    if (!tenant) {
      throw new NotFoundError('Tenant')
    }

    if (!tenant.is_active) {
      throw new UnauthorizedError('Tenant tidak aktif')
    }

    // Attach ke request
    req.tenantId = tenant.id
    req.tenantSchema = `tenant_${tenantSlug}`

    next()
  } catch (error) {
    next(error)
  }
}

function extractSubdomain(hostname: string, primaryDomain: string): string | null {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null
  }

  // Dynamic: strip primary domain suffix to get subdomain
  // e.g. rs-demo.simrs.online → strip ".simrs.online" → "rs-demo"
  const domainParts = primaryDomain.split('.').length
  const hostParts = hostname.split('.')

  if (hostParts.length > domainParts) {
    const sub = hostParts.slice(0, hostParts.length - domainParts).join('.')
    if (sub && sub !== 'www' && sub !== 'admin') return sub
  }

  return null
}

async function lookupCustomDomain(hostname: string): Promise<string | null> {
  try {
    const tenant = await db('tenants')
      .where({ custom_domain: hostname, custom_domain_verified: true, is_active: true })
      .select('slug')
      .first<{ slug: string }>()

    if (tenant) {
      logger.debug('Custom domain resolved', { hostname, slug: tenant.slug })
      return tenant.slug
    }
  } catch {
    // Silently fail, fallback to no match
  }
  return null
}
