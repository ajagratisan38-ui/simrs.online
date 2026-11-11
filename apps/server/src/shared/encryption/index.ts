import crypto from 'crypto'
import { env } from '../../config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const ENCODING = 'base64' as const

function getKey(): Buffer {
  const secret = env.encryption?.key || env.jwt.secret
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return ''

  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING)
  encrypted += cipher.final(ENCODING)

  const tag = cipher.getAuthTag()

  const combined = Buffer.concat([
    iv,
    tag,
    Buffer.from(encrypted, ENCODING),
  ])

  return combined.toString(ENCODING)
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''

  try {
    const key = getKey()
    const combined = Buffer.from(ciphertext, ENCODING)

    const iv = combined.subarray(0, IV_LENGTH)
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted.toString(ENCODING), ENCODING, 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch {
    return '[DECRYPTION_FAILED]'
  }
}

export function encryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: string[],
): T {
  const result = { ...data }
  for (const field of fields) {
    const value = result[field]
    if (typeof value === 'string' && value.length > 0) {
      const encryptedField = `${field}_encrypted` as keyof T
      ;(result as Record<string, unknown>)[encryptedField as string] = encrypt(value)
    }
  }
  return result
}

export function decryptFields<T extends Record<string, unknown>>(
  data: T,
  fields: string[],
): T {
  const result = { ...data }
  for (const field of fields) {
    const encryptedField = `${field}_encrypted`
    const encryptedValue = result[encryptedField as keyof T]
    if (typeof encryptedValue === 'string' && encryptedValue.length > 0) {
      ;(result as Record<string, unknown>)[field] = decrypt(encryptedValue)
    }
  }
  return result
}
