import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Knex } from 'knex'
import Redis from 'ioredis'
import { env } from '../../config/env'
import { logger } from '../../shared/logger'
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'

const SALT_ROUNDS = 12
const REFRESH_TOKEN_PREFIX = 'refresh_token:'

// Cached session timeout from platform_settings
let cachedSessionTimeoutMinutes: number | null = null
let sessionTimeoutLoadedAt = 0
const SESSION_TIMEOUT_CACHE_TTL = 300_000 // 5 min

async function getSessionTimeoutMinutes(db: Knex): Promise<number> {
  const now = Date.now()
  if (cachedSessionTimeoutMinutes !== null && now - sessionTimeoutLoadedAt < SESSION_TIMEOUT_CACHE_TTL) {
    return cachedSessionTimeoutMinutes
  }
  try {
    const row = await db('platform_settings')
      .where({ key: 'session_timeout_minutes' })
      .select('value')
      .first()
    cachedSessionTimeoutMinutes = parseInt(row?.value || '480', 10)
    sessionTimeoutLoadedAt = now
    return cachedSessionTimeoutMinutes
  } catch {
    return cachedSessionTimeoutMinutes || 480
  }
}

export function invalidateSessionTimeoutCache(): void {
  cachedSessionTimeoutMinutes = null
  sessionTimeoutLoadedAt = 0
}

// Cached max concurrent sessions from platform_settings
let cachedMaxConcurrentSessions: number | null = null
let maxConcurrentLoadedAt = 0

async function getMaxConcurrentSessions(db: Knex): Promise<number> {
  const now = Date.now()
  if (cachedMaxConcurrentSessions !== null && now - maxConcurrentLoadedAt < SESSION_TIMEOUT_CACHE_TTL) {
    return cachedMaxConcurrentSessions
  }
  try {
    const row = await db('platform_settings')
      .where({ key: 'max_concurrent_sessions' })
      .select('value')
      .first()
    cachedMaxConcurrentSessions = parseInt(row?.value || '5', 10)
    maxConcurrentLoadedAt = now
    return cachedMaxConcurrentSessions
  } catch {
    return cachedMaxConcurrentSessions || 5
  }
}

export function invalidateMaxConcurrentSessionsCache(): void {
  cachedMaxConcurrentSessions = null
  maxConcurrentLoadedAt = 0
}

// Cached enforce_2fa_superadmin from platform_settings
let cachedEnforce2faSa: boolean | null = null
let enforce2faSaLoadedAt = 0

async function getEnforce2faSuperadmin(db: Knex): Promise<boolean> {
  const now = Date.now()
  if (cachedEnforce2faSa !== null && now - enforce2faSaLoadedAt < SESSION_TIMEOUT_CACHE_TTL) {
    return cachedEnforce2faSa
  }
  try {
    const row = await db('platform_settings')
      .where({ key: 'enforce_2fa_superadmin' })
      .select('value')
      .first()
    cachedEnforce2faSa = row?.value === 'true'
    enforce2faSaLoadedAt = now
    return cachedEnforce2faSa
  } catch {
    return cachedEnforce2faSa || false
  }
}

export function invalidateEnforce2faCache(): void {
  cachedEnforce2faSa = null
  enforce2faSaLoadedAt = 0
}

interface TokenPayload {
  userId: string
  tenantId: string
  tenantSchema: string
  role: string
  saRole?: string
}

interface UserRow {
  id: string
  email: string
  password_hash: string
  name: string
  role: string
  is_active: boolean
  mfa_enabled: boolean
  deleted_at: string | null
}

interface TenantRow {
  id: string
  slug: string
  is_active: boolean
}

export class AuthService {
  constructor(
    private db: Knex,
    private redis: Redis,
  ) {}

  async login(email: string, password: string, tenantSlug: string, mfaToken?: string) {
    // --- Super Admin login (tenantSlug === 'platform') ---
    if (tenantSlug === 'platform') {
      return this.loginSuperAdmin(email, password, mfaToken)
    }

    // 1. Cari tenant by slug
    const tenant = await this.db('tenants')
      .where({ slug: tenantSlug, is_active: true })
      .first<TenantRow & { plan_id: string | null }>()

    if (!tenant) {
      throw new NotFoundError('Tenant')
    }

    // Resolve allowed_modules from tenant's subscription plan
    let allowedModules: string[] = ['*']
    if (tenant.plan_id) {
      const plan = await this.db('subscription_plans')
        .where({ id: tenant.plan_id })
        .first<{ allowed_modules: string | string[] }>()
      if (plan) {
        allowedModules = typeof plan.allowed_modules === 'string'
          ? JSON.parse(plan.allowed_modules)
          : plan.allowed_modules
      }
    }

    const tenantSchema = `tenant_${tenantSlug}`

    // 2. Cari user di schema tenant
    const user = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('users')
      .where({ email })
      .whereNull('deleted_at')
      .first<UserRow>()

    if (!user) {
      throw new UnauthorizedError('Email atau password salah')
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Akun Anda dinonaktifkan. Hubungi admin.')
    }

    // 3. Verify password
    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      throw new UnauthorizedError('Email atau password salah')
    }

    // 4. Check MFA
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return {
          mfaRequired: true as const,
          userId: user.id,
          tenantSchema,
          tenantId: tenant.id,
        }
      }

      const { MfaService } = await import('./mfa.service')
      const mfaService = new MfaService(this.db)
      await mfaService.verifyMFA(user.id, mfaToken, tenantSchema)
    }

    // 5. Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      tenantSchema,
      role: user.role,
    }

    const accessToken = this.generateAccessToken(tokenPayload)
    const refreshToken = await this.generateRefreshToken(tokenPayload)

    // 6. Simpan refresh token & enforce session limit (Redis — non-blocking)
    try {
      await this.enforceSessionLimit(user.id, tenant.id)

      const refreshExpiry = await this.getRefreshExpirySeconds()
      const sessionKey = `${REFRESH_TOKEN_PREFIX}${user.id}:${tenant.id}:${Date.now()}`
      await this.redis.set(sessionKey, refreshToken, 'EX', refreshExpiry)

      const sessionsKey = `sessions:${user.id}:${tenant.id}`
      await this.redis.sadd(sessionsKey, sessionKey)
      await this.redis.expire(sessionsKey, refreshExpiry)
    } catch (err) {
      logger.warn('Redis session management failed, login proceeding without session tracking', {
        error: String(err),
        userId: user.id,
      })
    }

    // 7. Update last_login_at
    await this.db
      .withSchema(tenantSchema)
      .table('users')
      .where({ id: user.id })
      .update({ last_login_at: new Date() })

    logger.info('User logged in', {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenant: tenantSlug,
    })

    return {
      mfaRequired: false as const,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedModules,
      },
    }
  }

  private async loginSuperAdmin(email: string, password: string, mfaToken?: string) {
    const superAdmin = await this.db('super_admins')
      .where({ email })
      .first<{
        id: string; email: string; password_hash: string; name: string
        sa_role: string; is_active: boolean; mfa_enabled: boolean; mfa_secret: string | null
      }>()

    if (!superAdmin) {
      throw new UnauthorizedError('Email atau password salah')
    }

    if (!superAdmin.is_active) {
      throw new UnauthorizedError('Akun super admin nonaktif, hubungi owner')
    }

    const isValid = await bcrypt.compare(password, superAdmin.password_hash)
    if (!isValid) {
      throw new UnauthorizedError('Email atau password salah')
    }

    // Check enforce_2fa setting
    const enforce2fa = await getEnforce2faSuperadmin(this.db)

    if (enforce2fa && !superAdmin.mfa_enabled) {
      // SA hasn't set up MFA yet but it's enforced — return setup required
      // Generate a temporary token so SA can set up MFA
      const tempPayload: TokenPayload = {
        userId: superAdmin.id,
        tenantId: 'platform',
        tenantSchema: 'public',
        role: 'superadmin',
        saRole: superAdmin.sa_role || 'operator',
      }
      const tempToken = jwt.sign(tempPayload, env.jwt.secret, { expiresIn: '10m' })

      return {
        mfaRequired: true as const,
        mfaSetupRequired: true,
        tempAccessToken: tempToken,
        userId: superAdmin.id,
        tenantSchema: 'public',
        tenantId: 'platform',
      }
    }

    // Check MFA if enabled on this SA account
    if (superAdmin.mfa_enabled) {
      if (!mfaToken) {
        return {
          mfaRequired: true as const,
          userId: superAdmin.id,
          tenantSchema: 'public',
          tenantId: 'platform',
        }
      }

      const { MfaService } = await import('./mfa.service')
      const mfaService = new MfaService(this.db)
      await mfaService.verifySuperAdminMFA(superAdmin.id, mfaToken)
    }

    const saRole = superAdmin.sa_role || 'operator'

    const tokenPayload: TokenPayload = {
      userId: superAdmin.id,
      tenantId: 'platform',
      tenantSchema: 'public',
      role: 'superadmin',
      saRole,
    }

    const accessToken = this.generateAccessToken(tokenPayload)
    const refreshToken = await this.generateRefreshToken(tokenPayload)

    try {
      const refreshExpiry = await this.getRefreshExpirySeconds()
      const sessionKey = `${REFRESH_TOKEN_PREFIX}${superAdmin.id}:platform:${Date.now()}`
      await this.redis.set(sessionKey, refreshToken, 'EX', refreshExpiry)
    } catch (err) {
      logger.warn('Redis session management failed for super admin', { error: String(err) })
    }

    await this.db('super_admins').where({ id: superAdmin.id }).update({ last_login_at: new Date() })

    logger.info('Super admin logged in', { email: superAdmin.email, saRole })

    return {
      mfaRequired: false as const,
      accessToken,
      refreshToken,
      user: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'superadmin',
        saRole,
        allowedModules: ['*'] as string[],
      },
    }
  }

  async refresh(refreshToken: string) {
    // 1. Verify refresh token
    let payload: TokenPayload
    try {
      payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as TokenPayload
    } catch {
      throw new UnauthorizedError('Refresh token tidak valid atau sudah expired')
    }

    // 2. Cek apakah refresh token masih ada di Redis (multi-session)
    try {
      const sessionsKey = `sessions:${payload.userId}:${payload.tenantId}`
      const sessionKeys = await this.redis.smembers(sessionsKey)

      let foundKey: string | null = null
      for (const key of sessionKeys) {
        const stored = await this.redis.get(key)
        if (stored === refreshToken) {
          foundKey = key
          break
        }
      }

      // Fallback: check legacy single-session key
      if (!foundKey) {
        const legacyKey = `${REFRESH_TOKEN_PREFIX}${payload.userId}:${payload.tenantId}`
        const legacy = await this.redis.get(legacyKey)
        if (legacy === refreshToken) {
          foundKey = legacyKey
        }
      }

      if (!foundKey) {
        throw new UnauthorizedError('Refresh token sudah tidak berlaku')
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err
      // Redis unavailable — skip token revocation check, rely on JWT expiry
      logger.warn('Redis unavailable during token refresh, skipping revocation check', {
        error: String(err),
      })
    }

    // 3. Verify user masih aktif
    let userRole = payload.role

    if (payload.role === 'superadmin') {
      const sa = await this.db('super_admins')
        .select('id')
        .where({ id: payload.userId })
        .first()
      if (!sa) {
        throw new UnauthorizedError('Super admin tidak ditemukan')
      }
      userRole = 'superadmin'
    } else {
      const user = await this.db
        .withSchema(payload.tenantSchema)
        .select('id', 'role', 'is_active')
        .from('users')
        .where({ id: payload.userId })
        .whereNull('deleted_at')
        .first()

      if (!user || !user.is_active) {
        await this.redis.del(`${REFRESH_TOKEN_PREFIX}${payload.userId}:${payload.tenantId}`)
        throw new UnauthorizedError('Akun tidak ditemukan atau dinonaktifkan')
      }
      userRole = user.role
    }

    // 4. Generate access token baru
    const newPayload: TokenPayload = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      tenantSchema: payload.tenantSchema,
      role: userRole,
    }

    const accessToken = this.generateAccessToken(newPayload)

    logger.info('Token refreshed', { userId: payload.userId })

    return { accessToken }
  }

  async logout(userId: string, tenantId: string) {
    try {
      const sessionsKey = `sessions:${userId}:${tenantId}`
      const sessionKeys = await this.redis.smembers(sessionsKey)
      if (sessionKeys.length > 0) {
        await this.redis.del(...sessionKeys)
      }
      await this.redis.del(sessionsKey)
      await this.redis.del(`${REFRESH_TOKEN_PREFIX}${userId}:${tenantId}`)
    } catch (err) {
      logger.warn('Redis unavailable during logout', { error: String(err) })
    }

    logger.info('User logged out', { userId, tenantId })
  }

  async changePassword(
    userId: string,
    tenantSchema: string,
    oldPassword: string,
    newPassword: string,
  ) {
    // 1. Ambil user
    const user = await this.db
      .withSchema(tenantSchema)
      .select('id', 'password_hash')
      .from('users')
      .where({ id: userId })
      .first<Pick<UserRow, 'id' | 'password_hash'>>()

    if (!user) {
      throw new NotFoundError('User')
    }

    // 2. Verify password lama
    const isValid = await bcrypt.compare(oldPassword, user.password_hash)
    if (!isValid) {
      throw new ValidationError('Password lama tidak cocok')
    }

    // 3. Cek password baru tidak sama dengan yang lama
    const isSame = await bcrypt.compare(newPassword, user.password_hash)
    if (isSame) {
      throw new ConflictError('Password baru tidak boleh sama dengan password lama')
    }

    // 4. Hash dan update
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await this.db
      .withSchema(tenantSchema)
      .table('users')
      .where({ id: userId })
      .update({ password_hash: newHash })

    logger.info('Password changed', { userId })
  }

  // --- Private helpers ---

  private async enforceSessionLimit(userId: string, tenantId: string): Promise<void> {
    const maxSessions = await getMaxConcurrentSessions(this.db)
    const sessionsKey = `sessions:${userId}:${tenantId}`
    const sessionKeys = await this.redis.smembers(sessionsKey)

    // Clean up expired sessions
    const validKeys: string[] = []
    for (const key of sessionKeys) {
      const exists = await this.redis.exists(key)
      if (exists) {
        validKeys.push(key)
      } else {
        await this.redis.srem(sessionsKey, key)
      }
    }

    // If at limit, remove oldest session to make room
    if (validKeys.length >= maxSessions) {
      validKeys.sort()
      const toRemove = validKeys.slice(0, validKeys.length - maxSessions + 1)
      for (const key of toRemove) {
        await this.redis.del(key)
        await this.redis.srem(sessionsKey, key)
      }
    }
  }

  private generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.accessExpiry,
    })
  }

  private async generateRefreshToken(payload: TokenPayload): Promise<string> {
    const timeoutMin = await getSessionTimeoutMinutes(this.db)
    const expiresIn = `${timeoutMin}m`
    return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn })
  }

  private async getRefreshExpirySeconds(): Promise<number> {
    const timeoutMin = await getSessionTimeoutMinutes(this.db)
    return timeoutMin * 60
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/)
    if (!match) return 604800 // default 7 days

    const value = parseInt(match[1], 10)
    const unit = match[2]
    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 3600
      case 'd': return value * 86400
      default: return 604800
    }
  }
}
