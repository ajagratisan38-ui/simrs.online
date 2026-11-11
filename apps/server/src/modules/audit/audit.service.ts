import { Knex } from 'knex'
import { env } from '../../config/env'
import { logger } from '../../shared/logger'

export interface AuditLogRow {
  id: string
  tenant_id: string | null
  user_id: string | null
  user_name: string | null
  user_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_description: string | null
  ip_address: string | null
  user_agent: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface AuditFilters {
  tenantId?: string
  userId?: string
  action?: string
  entityType?: string
  entityId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export class AuditService {
  constructor(private db: Knex) {}

  async getLogs(filters: AuditFilters): Promise<{
    data: AuditLogRow[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }> {
    const page = filters.page ?? 1
    const limit = Math.min(filters.limit ?? 50, 100)
    const offset = (page - 1) * limit

    let query = this.db('audit_logs')
    let countQuery = this.db('audit_logs')

    if (filters.tenantId) {
      query = query.where('tenant_id', filters.tenantId)
      countQuery = countQuery.where('tenant_id', filters.tenantId)
    }
    if (filters.userId) {
      query = query.where('user_id', filters.userId)
      countQuery = countQuery.where('user_id', filters.userId)
    }
    if (filters.action) {
      query = query.where('action', filters.action)
      countQuery = countQuery.where('action', filters.action)
    }
    if (filters.entityType) {
      query = query.where('entity_type', filters.entityType)
      countQuery = countQuery.where('entity_type', filters.entityType)
    }
    if (filters.entityId) {
      query = query.where('entity_id', filters.entityId)
      countQuery = countQuery.where('entity_id', filters.entityId)
    }
    if (filters.from) {
      query = query.where('created_at', '>=', filters.from)
      countQuery = countQuery.where('created_at', '>=', filters.from)
    }
    if (filters.to) {
      query = query.where('created_at', '<=', `${filters.to}T23:59:59Z`)
      countQuery = countQuery.where('created_at', '<=', `${filters.to}T23:59:59Z`)
    }

    const countResult = await countQuery.count('* as count')
    const total = Number((countResult[0] as Record<string, unknown>)?.count ?? 0)
    const data = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return {
      data,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }
  }

  async exportLogs(filters: AuditFilters): Promise<string> {
    const allFilters = { ...filters, page: 1, limit: 10000 }
    const { data } = await this.getLogs(allFilters)

    const headers = [
      'Waktu',
      'User',
      'Role',
      'Aksi',
      'Entitas',
      'Entity ID',
      'Deskripsi',
      'IP Address',
    ]

    const rows = data.map((row) => [
      row.created_at,
      row.user_name || row.user_id || '-',
      row.user_role || '-',
      row.action,
      row.entity_type,
      row.entity_id || '-',
      row.entity_description || '-',
      row.ip_address || '-',
    ])

    const csvRows = [headers, ...rows]
    return csvRows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '')
            return str.includes(',') || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str
          })
          .join(','),
      )
      .join('\n')
  }

  async cleanupOldLogs(): Promise<number> {
    const retentionDays = env.security.auditRetentionDays
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const deleted = await this.db('audit_logs')
      .where('created_at', '<', cutoffDate.toISOString())
      .del()

    logger.info(`Audit log cleanup: deleted ${deleted} records older than ${retentionDays} days`)
    return deleted
  }
}
