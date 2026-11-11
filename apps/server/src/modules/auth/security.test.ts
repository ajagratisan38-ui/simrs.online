import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'

// Mock Redis
jest.mock('../../config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null as string | null),
    set: jest.fn().mockResolvedValue('OK' as string),
    del: jest.fn().mockResolvedValue(1 as number),
    sadd: jest.fn().mockResolvedValue(1 as number),
    srem: jest.fn().mockResolvedValue(1 as number),
    smembers: jest.fn().mockResolvedValue([] as string[]),
    expire: jest.fn().mockResolvedValue(1 as number),
    exists: jest.fn().mockResolvedValue(1 as number),
    quit: jest.fn().mockResolvedValue('OK' as string),
    call: jest.fn().mockResolvedValue(null),
  },
}))

import { encrypt, decrypt, encryptFields, decryptFields } from '../../shared/encryption'
import { sanitizeInput } from '../../middleware/sanitize'
import { writeAuditLog } from '../../middleware/audit'
import { AuditService } from '../audit/audit.service'
import { Request, Response, NextFunction } from 'express'

// ─── Encryption Tests ───

describe('Encryption (AES-256-GCM)', () => {
  it('should encrypt and decrypt a string', () => {
    const plaintext = '3201234567890123'
    const encrypted = encrypt(plaintext)

    expect(encrypted).not.toBe(plaintext)
    expect(encrypted.length).toBeGreaterThan(0)

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = '08123456789'
    const enc1 = encrypt(plaintext)
    const enc2 = encrypt(plaintext)

    expect(enc1).not.toBe(enc2)
    expect(decrypt(enc1)).toBe(plaintext)
    expect(decrypt(enc2)).toBe(plaintext)
  })

  it('should handle empty string', () => {
    expect(encrypt('')).toBe('')
    expect(decrypt('')).toBe('')
  })

  it('should handle corrupted ciphertext gracefully', () => {
    const result = decrypt('not-valid-base64-ciphertext!!!')
    expect(result).toBe('[DECRYPTION_FAILED]')
  })

  it('should encrypt specific fields on an object', () => {
    const patient = {
      nama: 'John Doe',
      nik: '3201234567890123',
      no_telepon: '08123456789',
      alamat: 'Jl. Merdeka No. 1',
    }

    const encrypted = encryptFields(patient, ['nik', 'no_telepon', 'alamat'])

    expect(encrypted.nik).toBe('3201234567890123')
    expect(typeof encrypted.nik_encrypted).toBe('string')
    expect(encrypted.nik_encrypted).not.toBe('')
    expect(typeof encrypted.no_telepon_encrypted).toBe('string')
    expect(typeof encrypted.alamat_encrypted).toBe('string')
    expect(encrypted.nama).toBe('John Doe')
  })

  it('should decrypt specific fields on an object', () => {
    const patient = {
      nama: 'John Doe',
      nik: '',
      nik_encrypted: encrypt('3201234567890123'),
      no_telepon: '',
      no_telepon_encrypted: encrypt('08123456789'),
      alamat: '',
      alamat_encrypted: encrypt('Jl. Merdeka No. 1'),
    }

    const decrypted = decryptFields(patient, ['nik', 'no_telepon', 'alamat'])

    expect(decrypted.nik).toBe('3201234567890123')
    expect(decrypted.no_telepon).toBe('08123456789')
    expect(decrypted.alamat).toBe('Jl. Merdeka No. 1')
  })

  it('should handle unicode characters', () => {
    const text = 'Jl. Raya Cibubur №123, Jakarta Timur'
    const encrypted = encrypt(text)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(text)
  })
})

// ─── Sanitization Tests ───

describe('Input Sanitization', () => {
  function mockReq(body: Record<string, unknown>): Request {
    return { body, query: {} } as unknown as Request
  }
  function mockRes(): Response {
    return {} as Response
  }

  it('should trim and escape HTML in body', () => {
    const req = mockReq({
      name: '  <script>alert("xss")</script>  ',
      email: 'test@example.com',
    })
    const next = jest.fn() as unknown as NextFunction

    sanitizeInput(req, mockRes(), next)

    expect(req.body.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(req.body.email).toBe('test@example.com')
    expect(next).toHaveBeenCalled()
  })

  it('should not sanitize password fields', () => {
    const req = mockReq({
      email: 'test@example.com',
      password: 'P@ssw0rd<>"&',
    })
    const next = jest.fn() as unknown as NextFunction

    sanitizeInput(req, mockRes(), next)

    expect(req.body.password).toBe('P@ssw0rd<>"&')
  })

  it('should sanitize nested objects', () => {
    const req = mockReq({
      data: {
        name: '<b>bold</b>',
        inner: { value: '<img src=x onerror=alert(1)>' },
      },
    })
    const next = jest.fn() as unknown as NextFunction

    sanitizeInput(req, mockRes(), next)

    const data = req.body.data as Record<string, unknown>
    expect(data.name).toBe('&lt;b&gt;bold&lt;/b&gt;')
    const inner = data.inner as Record<string, string>
    expect(inner.value).toContain('&lt;img')
  })

  it('should sanitize arrays', () => {
    const req = mockReq({
      tags: ['<script>bad</script>', 'normal'],
    })
    const next = jest.fn() as unknown as NextFunction

    sanitizeInput(req, mockRes(), next)

    const tags = req.body.tags as string[]
    expect(tags[0]).toBe('&lt;script&gt;bad&lt;/script&gt;')
    expect(tags[1]).toBe('normal')
  })

  it('should handle null body gracefully', () => {
    const req = { body: null, query: {} } as unknown as Request
    const next = jest.fn() as unknown as NextFunction

    sanitizeInput(req, mockRes(), next)

    expect(next).toHaveBeenCalled()
  })
})

// ─── Audit Service Tests ───

describe('AuditService', () => {
  const mockRows = [
    {
      id: 'a1',
      action: 'view',
      entity_type: 'patients',
      user_name: 'Dr. Test',
      user_id: 'u1',
      user_role: 'dokter',
      entity_id: 'p1',
      entity_description: 'GET /patients/p1',
      ip_address: '127.0.0.1',
      created_at: '2026-10-12T00:00:00Z',
    },
  ]

  function createMockKnex() {
    const chain: Record<string, unknown> = {}

    chain.count = jest.fn().mockResolvedValue([{ count: '1' }])
    chain.where = jest.fn().mockReturnValue(chain)
    chain.orderBy = jest.fn().mockReturnValue(chain)
    chain.limit = jest.fn().mockReturnValue(chain)
    chain.offset = jest.fn().mockResolvedValue(mockRows)
    chain.del = jest.fn().mockResolvedValue(3)

    return jest.fn().mockReturnValue(chain)
  }

  it('should format CSV export correctly', async () => {
    const mockKnex = createMockKnex()
    const service = new AuditService(mockKnex as never)
    const csv = await service.exportLogs({})

    expect(csv).toContain('Waktu')
    expect(csv).toContain('Aksi')
    expect(csv).toContain('Entitas')
    expect(csv).toContain('view')
    expect(csv).toContain('patients')
  })

  it('should return paginated results', async () => {
    const mockKnex = createMockKnex()
    const service = new AuditService(mockKnex as never)
    const result = await service.getLogs({ page: 1, limit: 10 })

    expect(result.meta.page).toBe(1)
    expect(result.meta.limit).toBe(10)
    expect(result.meta.total).toBe(1)
    expect(result.data).toHaveLength(1)
  })

  it('should cap limit at 100', async () => {
    const mockKnex = createMockKnex()
    const service = new AuditService(mockKnex as never)
    const result = await service.getLogs({ page: 1, limit: 500 })

    expect(result.meta.limit).toBe(100)
  })
})

// ─── Rate Limiter Config Tests ───

describe('Rate Limiter', () => {
  it('should have login and API limiters defined', () => {
    const { loginRateLimiter, apiRateLimiter } = require('../../middleware/rate-limiter')
    expect(typeof loginRateLimiter).toBe('function')
    expect(typeof apiRateLimiter).toBe('function')
  })
})

// ─── MFA Service Tests ───

describe('MFA Service', () => {
  it('should import speakeasy correctly', () => {
    const speakeasy = require('speakeasy')
    expect(speakeasy.generateSecret).toBeDefined()
    expect(speakeasy.totp).toBeDefined()
  })

  it('should generate a TOTP secret', () => {
    const speakeasy = require('speakeasy')
    const secret = speakeasy.generateSecret({
      name: 'SIMRS Test',
      issuer: 'SIMRS SaaS',
      length: 20,
    })

    expect(secret.base32).toBeDefined()
    expect(secret.base32.length).toBeGreaterThan(10)
    expect(secret.otpauth_url).toContain('otpauth://totp/')
  })

  it('should verify a valid TOTP token', () => {
    const speakeasy = require('speakeasy')
    const secret = speakeasy.generateSecret({ length: 20 })

    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
    })

    const verified = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token,
      window: 1,
    })

    expect(verified).toBe(true)
  })

  it('should reject an invalid TOTP token', () => {
    const speakeasy = require('speakeasy')
    const secret = speakeasy.generateSecret({ length: 20 })

    const verified = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token: '000000',
      window: 0,
    })

    expect(verified).toBeFalsy()
  })

  it('should encrypt and decrypt MFA secret', () => {
    const speakeasy = require('speakeasy')
    const secret = speakeasy.generateSecret({ length: 20 })

    const encrypted = encrypt(secret.base32)
    expect(encrypted).not.toBe(secret.base32)

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(secret.base32)

    const token = speakeasy.totp({
      secret: decrypted,
      encoding: 'base32',
    })

    const verified = speakeasy.totp.verify({
      secret: decrypted,
      encoding: 'base32',
      token,
      window: 1,
    })

    expect(verified).toBe(true)
  })
})

// ─── Env Config Tests ───

describe('Security Config', () => {
  it('should have security config properties', () => {
    const { env } = require('../../config/env')

    expect(env.security).toBeDefined()
    expect(env.security.mfaIssuer).toBeDefined()
    expect(env.security.auditRetentionDays).toBeGreaterThan(0)
    expect(env.security.maxSessionsPerUser).toBeGreaterThan(0)
    expect(env.security.rateLimitLogin).toBeGreaterThan(0)
    expect(env.security.rateLimitApi).toBeGreaterThan(0)
  })

  it('should have encryption config', () => {
    const { env } = require('../../config/env')

    expect(env.encryption).toBeDefined()
    expect(env.encryption.key).toBeDefined()
    expect(env.encryption.key.length).toBeGreaterThan(0)
  })
})
