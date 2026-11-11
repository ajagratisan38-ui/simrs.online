import { Request, Response, NextFunction } from 'express'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return escapeHtml(value.trim())
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>)
  }
  return value
}

function sanitizeObject(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeValue(value)
  }
  return result
}

const SKIP_FIELDS = new Set(['password', 'oldPassword', 'newPassword', 'confirmPassword', 'mfaToken', 'token', 'refreshToken'])

export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body && typeof req.body === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(req.body as Record<string, unknown>)) {
      if (SKIP_FIELDS.has(key)) {
        sanitized[key] = value
      } else {
        sanitized[key] = sanitizeValue(value)
      }
    }
    req.body = sanitized
  }

  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      const val = req.query[key]
      if (typeof val === 'string') {
        ;(req.query as Record<string, string>)[key] = escapeHtml(val.trim())
      }
    }
  }

  next()
}
