import { z } from 'zod'

export const syncOperationSchema = z.object({
  action: z.enum(['create', 'update', 'delete']),
  entity: z.string().min(1),
  entityId: z.string().min(1),
  payload: z.record(z.unknown()),
  timestamp: z.number(),
})

export const syncBatchSchema = z.object({
  operations: z.array(syncOperationSchema).min(1).max(100),
})

export type SyncOperation = z.infer<typeof syncOperationSchema>
export type SyncBatchInput = z.infer<typeof syncBatchSchema>
