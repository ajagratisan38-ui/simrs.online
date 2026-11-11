import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import type { SyncOperation } from './sync.validator'

interface AppliedResult {
  entity: string
  entityId: string
  action: string
  serverTimestamp: number
}

interface ConflictResult {
  entity: string
  entityId: string
  serverData: Record<string, unknown>
  serverTimestamp: number
}

interface ErrorResult {
  entity: string
  entityId: string
  error: string
}

// Maps entity names to table names
const ENTITY_TABLE_MAP: Record<string, string> = {
  patient: 'patients',
  visit: 'visits',
  medical_record: 'medical_records',
  prescription: 'prescriptions',
  drug: 'drugs',
  queue: 'queues',
}

export class SyncService {
  constructor(private db: Knex) {}

  async processBatch(
    operations: SyncOperation[],
    userId: string,
    tenantSchema: string,
  ) {
    const applied: AppliedResult[] = []
    const conflicts: ConflictResult[] = []
    const errors: ErrorResult[] = []

    for (const op of operations) {
      try {
        const tableName = ENTITY_TABLE_MAP[op.entity]
        if (!tableName) {
          errors.push({
            entity: op.entity,
            entityId: op.entityId,
            error: `Unknown entity: ${op.entity}`,
          })
          continue
        }

        // Check for conflicts (timestamp comparison)
        const existing = await this.db
          .withSchema(tenantSchema)
          .select('id', 'updated_at')
          .from(tableName)
          .where({ id: op.entityId })
          .first()

        if (op.action === 'create') {
          if (existing) {
            // Already exists — conflict
            const serverData = await this.db
              .withSchema(tenantSchema)
              .select('*')
              .from(tableName)
              .where({ id: op.entityId })
              .first()

            conflicts.push({
              entity: op.entity,
              entityId: op.entityId,
              serverData: serverData || {},
              serverTimestamp: new Date(existing.updated_at).getTime(),
            })
            continue
          }

          // Insert new record
          const { id, synced, lastModified, data, ...insertData } = op.payload as Record<string, unknown>

          // Special handling for visits — generate visit_number + tanggal + queue
          if (op.entity === 'visit') {
            const visitNumber = await this.generateVisitNumber(tenantSchema)
            const tanggal = (insertData.tanggal as string) || new Date().toISOString().split('T')[0]

            const [visit] = await this.db
              .withSchema(tenantSchema)
              .insert({
                id: op.entityId,
                ...insertData,
                visit_number: visitNumber,
                tanggal,
                status: (insertData.status as string) || 'menunggu',
                created_by: userId,
              })
              .into(tableName)
              .returning('*')

            // Auto-create queue entry if room_id exists
            if (visit.room_id) {
              const maxResult = await this.db
                .withSchema(tenantSchema)
                .from('queues')
                .where('room_id', visit.room_id)
                .join('visits', 'queues.visit_id', 'visits.id')
                .where('visits.tanggal', tanggal)
                .max('nomor_antrian as max_antrian')

              const nomorAntrian = (maxResult[0]?.max_antrian || 0) + 1

              await this.db
                .withSchema(tenantSchema)
                .insert({
                  visit_id: visit.id,
                  room_id: visit.room_id,
                  nomor_antrian: nomorAntrian,
                  status: 'menunggu',
                })
                .into('queues')
            }
          } else {
            await this.db
              .withSchema(tenantSchema)
              .insert({
                id: op.entityId,
                ...insertData,
                created_by: userId,
              })
              .into(tableName)
          }

          applied.push({
            entity: op.entity,
            entityId: op.entityId,
            action: op.action,
            serverTimestamp: Date.now(),
          })
        } else if (op.action === 'update') {
          if (!existing) {
            errors.push({
              entity: op.entity,
              entityId: op.entityId,
              error: 'Record not found for update',
            })
            continue
          }

          const serverUpdatedAt = new Date(existing.updated_at).getTime()

          // Conflict detection: server was updated after client's timestamp
          if (serverUpdatedAt > op.timestamp) {
            const serverData = await this.db
              .withSchema(tenantSchema)
              .select('*')
              .from(tableName)
              .where({ id: op.entityId })
              .first()

            conflicts.push({
              entity: op.entity,
              entityId: op.entityId,
              serverData: serverData || {},
              serverTimestamp: serverUpdatedAt,
            })
            continue
          }

          // Apply update
          const { id, synced, lastModified, data, ...updateData } = op.payload as Record<string, unknown>
          await this.db
            .withSchema(tenantSchema)
            .from(tableName)
            .where({ id: op.entityId })
            .update({
              ...updateData,
              updated_by: userId,
            })

          applied.push({
            entity: op.entity,
            entityId: op.entityId,
            action: op.action,
            serverTimestamp: Date.now(),
          })
        } else if (op.action === 'delete') {
          if (!existing) {
            // Already deleted — treat as success
            applied.push({
              entity: op.entity,
              entityId: op.entityId,
              action: op.action,
              serverTimestamp: Date.now(),
            })
            continue
          }

          // Soft delete (set deleted_at)
          await this.db
            .withSchema(tenantSchema)
            .from(tableName)
            .where({ id: op.entityId })
            .update({
              deleted_at: new Date().toISOString(),
              updated_by: userId,
            })

          applied.push({
            entity: op.entity,
            entityId: op.entityId,
            action: op.action,
            serverTimestamp: Date.now(),
          })
        }
      } catch (err) {
        logger.error('Sync operation failed', {
          entity: op.entity,
          entityId: op.entityId,
          action: op.action,
          error: err instanceof Error ? err.message : String(err),
        })
        errors.push({
          entity: op.entity,
          entityId: op.entityId,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    logger.info('Sync batch processed', {
      applied: applied.length,
      conflicts: conflicts.length,
      errors: errors.length,
    })

    return { applied, conflicts, errors }
  }

  private async generateVisitNumber(tenantSchema: string): Promise<string> {
    try {
      const result = await this.db.raw(
        'SELECT generate_visit_number(?) as visit_number',
        [tenantSchema],
      )
      return result.rows[0].visit_number as string
    } catch {
      // Fallback if function doesn't exist
      const now = new Date()
      const prefix = `VIS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
      return `${prefix}-${rand}`
    }
  }

  async getSyncStatus(tenantSchema: string) {
    const tables = Object.values(ENTITY_TABLE_MAP)
    const counts: Record<string, number> = {}

    for (const table of tables) {
      try {
        const [{ count }] = await this.db
          .withSchema(tenantSchema)
          .from(table)
          .count('id as count')
        counts[table] = Number(count)
      } catch {
        counts[table] = 0
      }
    }

    return {
      tables: counts,
      timestamp: Date.now(),
    }
  }
}
