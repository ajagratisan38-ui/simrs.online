import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'
import { LaboratoryService } from './laboratory.service'
import { Knex, knex } from 'knex'

// Mock database
const mockDb = {
  withSchema: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  whereNot: jest.fn().mockReturnThis(),
  whereNull: jest.fn().mockReturnThis(),
  whereILike: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  distinct: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  orderByRaw: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  first: jest.fn(),
  clone: jest.fn().mockReturnThis(),
  transaction: jest.fn(),
} as unknown as Knex

const tenantSchema = 'tenant_test'

describe('LaboratoryService', () => {
  const service = new LaboratoryService(mockDb)

  beforeAll(() => {
    jest.clearAllMocks()
  })

  describe('searchParameters', () => {
    it('should search lab parameters by keyword', async () => {
      const mockParams = [
        { id: '1', kode: 'HB', nama: 'Hemoglobin', kategori: 'Hematologi' },
        { id: '2', kode: 'HT', nama: 'Hematokrit', kategori: 'Hematologi' },
      ]

      ;(mockDb as any).select.mockReturnThis()
      ;(mockDb as any).from.mockReturnThis()
      ;(mockDb as any).where.mockReturnThis()
      ;(mockDb as any).andWhere.mockReturnThis()
      ;(mockDb as any).orderBy.mockReturnThis()
      ;(mockDb as any).limit.mockResolvedValue(mockParams)

      const result = await service.searchParameters({
        q: 'hemo',
        limit: 50,
      })

      expect(result).toHaveLength(2)
      expect(result[0].kode).toBe('HB')
    })
  })

  describe('getParameterCategories', () => {
    it('should return distinct categories', async () => {
      const mockCategories = [
        { kategori: 'Hematologi' },
        { kategori: 'Kimia Klinik' },
        { kategori: 'Serologi' },
      ]

      ;(mockDb as any).distinct.mockReturnThis()
      ;(mockDb as any).from.mockReturnThis()
      ;(mockDb as any).where.mockReturnThis()
      ;(mockDb as any).orderBy.mockResolvedValue(mockCategories)

      const result = await service.getParameterCategories()

      expect(result).toEqual(['Hematologi', 'Kimia Klinik', 'Serologi'])
    })
  })

  describe('createOrder validation', () => {
    it('should throw NotFoundError if visit does not exist', async () => {
      ;(mockDb as any).withSchema.mockReturnThis()
      ;(mockDb as any).select.mockReturnThis()
      ;(mockDb as any).from.mockReturnThis()
      ;(mockDb as any).where.mockReturnThis()
      ;(mockDb as any).whereNull.mockReturnThis()
      ;(mockDb as any).first.mockResolvedValue(null)

      await expect(
        service.createOrder(
          {
            visit_id: 'non-existent',
            items: [{ parameter_id: 'p1', tarif: 50000 }],
            prioritas: 'normal',
          },
          'doctor1',
          'user1',
          tenantSchema,
        ),
      ).rejects.toThrow('tidak ditemukan')
    })

    it('should throw ValidationError if visit status is invalid', async () => {
      ;(mockDb as any).first.mockResolvedValue({
        id: 'v1',
        patient_id: 'p1',
        status: 'selesai',
      })

      await expect(
        service.createOrder(
          {
            visit_id: 'v1',
            items: [{ parameter_id: 'p1', tarif: 50000 }],
            prioritas: 'normal',
          },
          'doctor1',
          'user1',
          tenantSchema,
        ),
      ).rejects.toThrow('tidak bisa dibuat order lab')
    })
  })

  describe('receiveSample validation', () => {
    it('should throw NotFoundError if order does not exist', async () => {
      ;(mockDb as any).first.mockResolvedValue(null)

      await expect(
        service.receiveSample('non-existent', {}, 'user1', tenantSchema),
      ).rejects.toThrow('tidak ditemukan')
    })

    it('should throw ValidationError if status is not dikirim', async () => {
      ;(mockDb as any).first.mockResolvedValue({
        id: 'o1',
        status: 'diproses',
      })

      await expect(
        service.receiveSample('o1', {}, 'user1', tenantSchema),
      ).rejects.toThrow('tidak bisa diterima')
    })
  })

  describe('startProcessing validation', () => {
    it('should throw ValidationError if status is not sampel_diterima', async () => {
      ;(mockDb as any).first.mockResolvedValue({
        id: 'o1',
        status: 'dikirim',
      })

      await expect(
        service.startProcessing('o1', 'user1', tenantSchema),
      ).rejects.toThrow('tidak bisa diproses')
    })
  })

  describe('finalizeOrder validation', () => {
    it('should throw ValidationError if status is not diproses', async () => {
      ;(mockDb as any).first.mockResolvedValue({
        id: 'o1',
        status: 'sampel_diterima',
      })

      await expect(
        service.finalizeOrder('o1', 'user1', tenantSchema),
      ).rejects.toThrow('tidak bisa difinalisasi')
    })
  })

  describe('cancelOrder validation', () => {
    it('should throw ValidationError if status is selesai', async () => {
      ;(mockDb as any).first.mockResolvedValue({
        id: 'o1',
        status: 'selesai',
      })

      await expect(
        service.cancelOrder('o1', 'user1', tenantSchema),
      ).rejects.toThrow('tidak bisa dibatalkan')
    })

    it('should throw ValidationError if already cancelled', async () => {
      ;(mockDb as any).first.mockResolvedValue({
        id: 'o1',
        status: 'batal',
      })

      await expect(
        service.cancelOrder('o1', 'user1', tenantSchema),
      ).rejects.toThrow('sudah dibatalkan')
    })
  })

  describe('getStats', () => {
    it('should return lab statistics', async () => {
      ;(mockDb as any).withSchema.mockReturnThis()
      ;(mockDb as any).from.mockReturnThis()
      ;(mockDb as any).whereIn.mockReturnThis()
      ;(mockDb as any).where.mockReturnThis()
      ;(mockDb as any).whereNull.mockReturnThis()
      ;(mockDb as any).count.mockResolvedValue([{ count: '5' }])

      const stats = await service.getStats(tenantSchema)
      expect(stats).toHaveProperty('pending')
      expect(stats).toHaveProperty('today')
      expect(stats).toHaveProperty('cito')
      expect(stats).toHaveProperty('completed_today')
    })
  })
})
