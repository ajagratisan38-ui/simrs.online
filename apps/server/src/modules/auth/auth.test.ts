import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import knex, { Knex } from 'knex'
import Redis from 'ioredis'
import { AuthService } from './auth.service'
import { UnauthorizedError, NotFoundError } from '../../shared/errors'

/**
 * Auth Service Unit Tests
 *
 * Untuk menjalankan: pnpm --filter @simrs/server test
 *
 * CATATAN: Test ini butuh database dan Redis yang running.
 * Jalankan `pnpm docker:up` sebelum test.
 */

// Test config — menggunakan database dan Redis yang sama dengan development
const TEST_DB_URL = process.env.DATABASE_URL || 'postgresql://simrs:simrs_secret@localhost:5432/simrs_db'
const TEST_REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const JWT_SECRET = 'test-jwt-secret'
const JWT_REFRESH_SECRET = 'test-refresh-secret'

describe('AuthService', () => {
  let db: Knex
  let redis: Redis
  let authService: AuthService

  // Override env for tests
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET
    process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET
    process.env.JWT_ACCESS_EXPIRY = '15m'
    process.env.JWT_REFRESH_EXPIRY = '7d'

    db = knex({ client: 'pg', connection: TEST_DB_URL })
    redis = new Redis(TEST_REDIS_URL)
    authService = new AuthService(db, redis)
  })

  afterAll(async () => {
    await redis.quit()
    await db.destroy()
  })

  describe('login', () => {
    it('berhasil login dengan credentials yang benar', async () => {
      const result = await authService.login(
        'admin@rs-demo.simrs.id',
        'Demo123!',
        'rs-demo',
      )

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result.user).toMatchObject({
        email: 'admin@rs-demo.simrs.id',
        name: 'Admin RS Demo',
        role: 'admin',
      })
      expect(result.user).toHaveProperty('id')

      // Verify JWT valid
      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as Record<string, unknown>
      expect(decoded).toHaveProperty('userId')
      expect(decoded).toHaveProperty('tenantId')
      expect(decoded).toHaveProperty('role', 'admin')
    })

    it('gagal login jika email salah', async () => {
      await expect(
        authService.login('tidak.ada@rs-demo.simrs.id', 'Demo123!', 'rs-demo'),
      ).rejects.toThrow(UnauthorizedError)
    })

    it('gagal login jika password salah', async () => {
      await expect(
        authService.login('admin@rs-demo.simrs.id', 'SalahPassword!', 'rs-demo'),
      ).rejects.toThrow(UnauthorizedError)
    })

    it('gagal login jika tenant tidak ditemukan', async () => {
      await expect(
        authService.login('admin@rs-demo.simrs.id', 'Demo123!', 'tenant-tidak-ada'),
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('refresh', () => {
    it('berhasil refresh token yang valid', async () => {
      // Login dulu untuk dapat refresh token
      const loginResult = await authService.login(
        'admin@rs-demo.simrs.id',
        'Demo123!',
        'rs-demo',
      )

      const result = await authService.refresh(loginResult.refreshToken)

      expect(result).toHaveProperty('accessToken')
      expect(typeof result.accessToken).toBe('string')

      // Verify token baru valid
      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as Record<string, unknown>
      expect(decoded).toHaveProperty('userId')
    })

    it('gagal refresh dengan token yang tidak valid', async () => {
      await expect(
        authService.refresh('token-asal-asalan'),
      ).rejects.toThrow(UnauthorizedError)
    })
  })

  describe('logout', () => {
    it('berhasil logout dan invalidate refresh token', async () => {
      // Login
      const loginResult = await authService.login(
        'dr.budi@rs-demo.simrs.id',
        'User123!',
        'rs-demo',
      )

      // Refresh harus berhasil sebelum logout
      const refreshResult = await authService.refresh(loginResult.refreshToken)
      expect(refreshResult).toHaveProperty('accessToken')

      // Decode untuk dapat userId dan tenantId
      const decoded = jwt.verify(loginResult.accessToken, JWT_SECRET) as Record<string, string>

      // Logout
      await authService.logout(decoded.userId, decoded.tenantId)

      // Refresh harus gagal setelah logout
      await expect(
        authService.refresh(loginResult.refreshToken),
      ).rejects.toThrow(UnauthorizedError)
    })
  })

  describe('changePassword', () => {
    it('berhasil ganti password', async () => {
      const tenantSchema = 'tenant_rs-demo'

      // Cari user kasir untuk test
      const user = await db
        .withSchema(tenantSchema)
        .select('id')
        .from('users')
        .where({ email: 'kasir.maya@rs-demo.simrs.id' })
        .first()

      // Ganti password
      await authService.changePassword(
        user!.id,
        tenantSchema,
        'User123!',
        'NewPassword1',
      )

      // Login dengan password baru harus berhasil
      const result = await authService.login(
        'kasir.maya@rs-demo.simrs.id',
        'NewPassword1',
        'rs-demo',
      )
      expect(result).toHaveProperty('accessToken')

      // Kembalikan password ke semula untuk test lain
      await authService.changePassword(
        user!.id,
        tenantSchema,
        'NewPassword1',
        'User123!',
      )
    })
  })
})
