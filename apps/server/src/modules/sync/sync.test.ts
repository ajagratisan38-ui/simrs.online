import { describe, it, expect } from '@jest/globals'
import { syncBatchSchema, syncOperationSchema } from './sync.validator'

describe('Sync Validators', () => {
  describe('syncOperationSchema', () => {
    it('should validate a valid create operation', () => {
      const result = syncOperationSchema.parse({
        action: 'create',
        entity: 'patient',
        entityId: '123e4567-e89b-12d3-a456-426614174000',
        payload: { nama: 'John Doe', nik: '1234567890123456' },
        timestamp: Date.now(),
      })
      expect(result.action).toBe('create')
      expect(result.entity).toBe('patient')
    })

    it('should validate a valid update operation', () => {
      const result = syncOperationSchema.parse({
        action: 'update',
        entity: 'visit',
        entityId: 'abc-123',
        payload: { status: 'selesai' },
        timestamp: 1700000000000,
      })
      expect(result.action).toBe('update')
    })

    it('should validate a valid delete operation', () => {
      const result = syncOperationSchema.parse({
        action: 'delete',
        entity: 'patient',
        entityId: 'abc-123',
        payload: {},
        timestamp: Date.now(),
      })
      expect(result.action).toBe('delete')
    })

    it('should reject invalid action', () => {
      expect(() =>
        syncOperationSchema.parse({
          action: 'patch',
          entity: 'patient',
          entityId: 'abc',
          payload: {},
          timestamp: Date.now(),
        }),
      ).toThrow()
    })

    it('should reject empty entity', () => {
      expect(() =>
        syncOperationSchema.parse({
          action: 'create',
          entity: '',
          entityId: 'abc',
          payload: {},
          timestamp: Date.now(),
        }),
      ).toThrow()
    })

    it('should reject empty entityId', () => {
      expect(() =>
        syncOperationSchema.parse({
          action: 'create',
          entity: 'patient',
          entityId: '',
          payload: {},
          timestamp: Date.now(),
        }),
      ).toThrow()
    })

    it('should reject missing timestamp', () => {
      expect(() =>
        syncOperationSchema.parse({
          action: 'create',
          entity: 'patient',
          entityId: 'abc',
          payload: {},
        }),
      ).toThrow()
    })
  })

  describe('syncBatchSchema', () => {
    it('should validate batch with multiple operations', () => {
      const result = syncBatchSchema.parse({
        operations: [
          {
            action: 'create',
            entity: 'patient',
            entityId: 'p-1',
            payload: { nama: 'Test' },
            timestamp: Date.now(),
          },
          {
            action: 'update',
            entity: 'visit',
            entityId: 'v-1',
            payload: { status: 'selesai' },
            timestamp: Date.now(),
          },
        ],
      })
      expect(result.operations).toHaveLength(2)
    })

    it('should reject empty operations array', () => {
      expect(() =>
        syncBatchSchema.parse({ operations: [] }),
      ).toThrow()
    })

    it('should reject missing operations', () => {
      expect(() =>
        syncBatchSchema.parse({}),
      ).toThrow()
    })

    it('should accept up to 100 operations', () => {
      const ops = Array.from({ length: 100 }, (_, i) => ({
        action: 'create' as const,
        entity: 'patient',
        entityId: `p-${i}`,
        payload: { nama: `Patient ${i}` },
        timestamp: Date.now(),
      }))
      const result = syncBatchSchema.parse({ operations: ops })
      expect(result.operations).toHaveLength(100)
    })

    it('should reject more than 100 operations', () => {
      const ops = Array.from({ length: 101 }, (_, i) => ({
        action: 'create' as const,
        entity: 'patient',
        entityId: `p-${i}`,
        payload: {},
        timestamp: Date.now(),
      }))
      expect(() =>
        syncBatchSchema.parse({ operations: ops }),
      ).toThrow()
    })
  })
})
