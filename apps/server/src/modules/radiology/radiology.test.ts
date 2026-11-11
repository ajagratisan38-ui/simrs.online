import { describe, it, expect, jest } from '@jest/globals'
import { RadiologyService } from './radiology.service'
import { Knex } from 'knex'

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
} as unknown as Knex

const ts = 'tenant_test'

describe('RadiologyService', () => {
  const service = new RadiologyService(mockDb)

  beforeEach(() => jest.clearAllMocks())

  describe('createOrder', () => {
    it('should throw NotFoundError if visit does not exist', async () => {
      ;(mockDb as any).first.mockResolvedValue(null)
      await expect(
        service.createOrder(
          { visit_id: 'x', examination_id: 'e1', prioritas: 'normal' },
          'd1', 'u1', ts,
        ),
      ).rejects.toThrow('tidak ditemukan')
    })

    it('should throw ValidationError if visit status invalid', async () => {
      ;(mockDb as any).first.mockResolvedValue({ id: 'v1', patient_id: 'p1', status: 'selesai' })
      await expect(
        service.createOrder(
          { visit_id: 'v1', examination_id: 'e1', prioritas: 'normal' },
          'd1', 'u1', ts,
        ),
      ).rejects.toThrow('tidak bisa dibuat order radiologi')
    })
  })

  describe('scheduleOrder', () => {
    it('should throw NotFoundError if order does not exist', async () => {
      ;(mockDb as any).first.mockResolvedValue(null)
      await expect(
        service.scheduleOrder('x', { tanggal_jadwal: '2026-10-15' }, 'u1', ts),
      ).rejects.toThrow('tidak ditemukan')
    })

    it('should throw ValidationError if status is not dikirim', async () => {
      ;(mockDb as any).first.mockResolvedValue({ id: 'o1', status: 'diproses' })
      await expect(
        service.scheduleOrder('o1', { tanggal_jadwal: '2026-10-15' }, 'u1', ts),
      ).rejects.toThrow('tidak bisa dijadwalkan')
    })
  })

  describe('inputResults', () => {
    it('should throw ValidationError if status is not diproses', async () => {
      ;(mockDb as any).first.mockResolvedValue({ id: 'o1', status: 'dijadwalkan' })
      await expect(
        service.inputResults('o1', { hasil_bacaan: 'Normal', kesan: 'Dalam batas normal' }, 'u1', ts),
      ).rejects.toThrow('tidak bisa diinput hasil')
    })
  })

  describe('cancelOrder', () => {
    it('should throw ValidationError if already completed', async () => {
      ;(mockDb as any).first.mockResolvedValue({ id: 'o1', status: 'selesai' })
      await expect(service.cancelOrder('o1', 'u1', ts)).rejects.toThrow('tidak bisa dibatalkan')
    })

    it('should throw ValidationError if already cancelled', async () => {
      ;(mockDb as any).first.mockResolvedValue({ id: 'o1', status: 'batal' })
      await expect(service.cancelOrder('o1', 'u1', ts)).rejects.toThrow('sudah dibatalkan')
    })
  })

  describe('searchExaminations', () => {
    it('should search examinations by keyword', async () => {
      const mock = [
        { id: '1', kode: 'XR-THORAX', nama: 'Rontgen Thorax PA', modalitas: 'xray' },
      ]
      ;(mockDb as any).limit.mockResolvedValue(mock)
      const result = await service.searchExaminations({ q: 'thorax', limit: 50 })
      expect(result).toHaveLength(1)
      expect(result[0].kode).toBe('XR-THORAX')
    })
  })

  describe('getStats', () => {
    it('should return radiology statistics', async () => {
      ;(mockDb as any).count.mockResolvedValue([{ count: '3' }])
      const stats = await service.getStats(ts)
      expect(stats).toHaveProperty('pending')
      expect(stats).toHaveProperty('today')
      expect(stats).toHaveProperty('cito')
      expect(stats).toHaveProperty('completed_today')
    })
  })
})
