import { Request, Response, NextFunction } from 'express'
import { db } from '../config/database'
import { logger } from '../shared/logger'

type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'print'

interface AuditEntry {
  tenant_id?: string
  user_id?: string
  user_name?: string
  user_role?: string
  action: AuditAction
  entity_type: string
  entity_id?: string
  entity_description?: string
  ip_address?: string
  user_agent?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db('audit_logs').insert({
      ...entry,
      old_data: entry.old_data ? JSON.stringify(entry.old_data) : null,
      new_data: entry.new_data ? JSON.stringify(entry.new_data) : null,
    })
  } catch (err) {
    logger.error('Failed to write audit log', { error: String(err), entry })
  }
}

function methodToAction(method: string): AuditAction {
  switch (method.toUpperCase()) {
    case 'GET': return 'view'
    case 'POST': return 'create'
    case 'PUT':
    case 'PATCH': return 'update'
    case 'DELETE': return 'delete'
    default: return 'view'
  }
}

function getEntityFromPath(path: string): { type: string; id?: string } {
  const segments = path.replace(/^\/api\/v1\//, '').split('/')

  const entityType = segments[0] ?? 'unknown'

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-/i
  const entityId = segments.find((s) => uuidPattern.test(s))

  return { type: entityType, id: entityId }
}

const SENSITIVE_ENTITIES = new Set([
  'patients',
  'medical-records',
  'bills',
  'auth',
  'drugs',
  'dispensing',
])

export function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalEnd = res.end

  const entity = getEntityFromPath(req.path)

  if (!SENSITIVE_ENTITIES.has(entity.type)) {
    next()
    return
  }

  res.end = function (this: Response, ...args: Parameters<typeof originalEnd>) {
    const statusCode = res.statusCode

    if (statusCode < 400) {
      const action = methodToAction(req.method)

      const r = req as Request & { tenantId?: string; userId?: string; role?: string }
      writeAuditLog({
        tenant_id: r.tenantId,
        user_id: r.userId,
        user_name: undefined,
        user_role: r.role,
        action,
        entity_type: entity.type,
        entity_id: entity.id,
        entity_description: `${req.method} ${req.path}`,
        ip_address: getClientIp(req),
        user_agent: req.headers['user-agent']?.slice(0, 500),
      }).catch(() => {})
    }

    return originalEnd.apply(this, args)
  } as typeof originalEnd

  next()
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? ''
  if (Array.isArray(forwarded)) return forwarded[0] ?? ''
  return req.socket.remoteAddress ?? ''
}
