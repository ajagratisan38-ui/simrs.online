import { DashboardService, invalidateDashboardCache } from './dashboard.service'
import type { DateRange } from './dashboard.service'

// ================================================================
// MOCK KNEX
// ================================================================

interface MockQueryBuilder {
  select: jest.Mock
  count: jest.Mock
  sum: jest.Mock
  avg: jest.Mock
  from: jest.Mock
  join: jest.Mock
  leftJoin: jest.Mock
  where: jest.Mock
  whereIn: jest.Mock
  whereNull: jest.Mock
  whereNotNull: jest.Mock
  whereRaw: jest.Mock
  whereBetween: jest.Mock
  groupBy: jest.Mock
  groupByRaw: jest.Mock
  orderBy: jest.Mock
  orderByRaw: jest.Mock
  havingRaw: jest.Mock
  limit: jest.Mock
  as: jest.Mock
  raw: jest.Mock
  then: jest.Mock
  withSchema: jest.Mock
}

function createMockQb(resolveWith: unknown = []): MockQueryBuilder {
  const qb: Partial<MockQueryBuilder> = {}
  const chainMethods = [
    'select', 'count', 'sum', 'avg', 'from', 'join', 'leftJoin',
    'where', 'whereIn', 'whereNull', 'whereNotNull', 'whereRaw',
    'whereBetween', 'groupBy', 'groupByRaw', 'orderBy', 'orderByRaw',
    'havingRaw', 'limit', 'as',
  ]
  for (const m of chainMethods) {
    qb[m as keyof MockQueryBuilder] = jest.fn().mockReturnValue(qb)
  }
  qb.raw = jest.fn().mockImplementation((expr: string) => expr)
  qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
    resolve(resolveWith)
    return Promise.resolve(resolveWith)
  })
  qb.withSchema = jest.fn().mockReturnValue(qb)
  return qb as MockQueryBuilder
}

// We need to mock redis to avoid real connection
jest.mock('../../config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  },
}))

afterAll(async () => {
  jest.restoreAllMocks()
})

// ================================================================
// SERVICE UNIT TESTS
// ================================================================

describe('DashboardService', () => {
  describe('getOverview', () => {
    it('should return overview with all fields', async () => {
      const qb = createMockQb([])

      // Override then to return different data depending on call count
      let callCount = 0
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        callCount++
        let data: unknown
        switch (callCount) {
          case 1: // visits by type
            data = [
              { tipe: 'rawat_jalan', count: '15' },
              { tipe: 'igd', count: '3' },
            ]
            break
          case 2: // queues
            data = [
              { status: 'menunggu', count: '8' },
              { status: 'dilayani', count: '4' },
            ]
            break
          case 3: // beds
            data = [{ total: '50', occupied: '32' }]
            break
          case 4: // revenue total
            data = [{ total: '5500000' }]
            break
          case 5: // revenue by method
            data = [
              { method: 'tunai', amount: '3000000' },
              { method: 'bpjs', amount: '2500000' },
            ]
            break
          case 6: // new patients
            data = [{ count: '7' }]
            break
          default:
            data = []
        }
        resolve(data)
        return Promise.resolve(data)
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const result = await service.getOverview('tenant_test')

      expect(result.visits.total).toBe(18)
      expect(result.visits.rawat_jalan).toBe(15)
      expect(result.visits.igd).toBe(3)
      expect(result.visits.rawat_inap).toBe(0)
      expect(result.queues.menunggu).toBe(8)
      expect(result.queues.dilayani).toBe(4)
      expect(result.bedOccupancy.occupied).toBe(32)
      expect(result.bedOccupancy.total).toBe(50)
      expect(result.bedOccupancy.rate).toBe(64)
      expect(result.revenue.total).toBe(5500000)
      expect(result.revenue.byMethod).toHaveLength(2)
      expect(result.newPatients).toBe(7)
    })

    it('should return zeros when no data', async () => {
      const qb = createMockQb([])

      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        resolve([])
        return Promise.resolve([])
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const result = await service.getOverview('tenant_test')

      expect(result.visits.total).toBe(0)
      expect(result.queues.menunggu).toBe(0)
      expect(result.bedOccupancy.rate).toBe(0)
      expect(result.revenue.total).toBe(0)
      expect(result.newPatients).toBe(0)
    })
  })

  describe('getVisitStats', () => {
    it('should return visit stats grouped by day', async () => {
      const qb = createMockQb([])

      let callCount = 0
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        callCount++
        let data: unknown
        switch (callCount) {
          case 1:
            data = [
              { date: '2026-10-01', count: '10' },
              { date: '2026-10-02', count: '12' },
            ]
            break
          case 2:
            data = [{ room: 'Poli Umum', count: '15' }]
            break
          case 3:
            data = [{ doctor: 'Dr. Ahmad', count: '8' }]
            break
          case 4:
            data = [
              { penjamin: 'umum', count: '10' },
              { penjamin: 'bpjs', count: '12' },
            ]
            break
          default:
            data = []
        }
        resolve(data)
        return Promise.resolve(data)
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }
      const result = await service.getVisitStats(range, 'day', 'tenant_test')

      expect(result.byDate).toHaveLength(2)
      expect(result.byDate[0].date).toBe('2026-10-01')
      expect(result.byDate[0].count).toBe(10)
      expect(result.byRoom).toHaveLength(1)
      expect(result.byDoctor).toHaveLength(1)
      expect(result.byPenjamin).toHaveLength(2)
    })
  })

  describe('getTopDiagnoses', () => {
    it('should return ranked diagnoses', async () => {
      const mockData = [
        { icd10_code: 'J06.9', icd10_name: 'ISPA', count: '45' },
        { icd10_code: 'A09', icd10_name: 'Diare', count: '32' },
        { icd10_code: 'I10', icd10_name: 'Hipertensi', count: '28' },
      ]
      const qb = createMockQb(mockData)
      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

      const result = await service.getTopDiagnoses(range, 10, 'tenant_test')

      expect(result).toHaveLength(3)
      expect(result[0].icd10_code).toBe('J06.9')
      expect(result[0].count).toBe(45)
      expect(result[2].icd10_name).toBe('Hipertensi')
    })
  })

  describe('getRevenueReport', () => {
    it('should return revenue data grouped by day', async () => {
      const qb = createMockQb([])

      let callCount = 0
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        callCount++
        let data: unknown
        switch (callCount) {
          case 1:
            data = [
              { date: '2026-10-01', amount: '1500000' },
              { date: '2026-10-02', amount: '2000000' },
            ]
            break
          case 2:
            data = [
              { category: 'konsultasi', amount: '1000000' },
              { category: 'obat', amount: '2500000' },
            ]
            break
          case 3:
            data = [{ penjamin: 'umum', amount: '2000000' }]
            break
          case 4:
            data = [{ total: '3500000' }]
            break
          default:
            data = []
        }
        resolve(data)
        return Promise.resolve(data)
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

      const result = await service.getRevenueReport(range, 'day', 'tenant_test')

      expect(result.byDate).toHaveLength(2)
      expect(result.byCategory).toHaveLength(2)
      expect(result.byPenjamin).toHaveLength(1)
      expect(result.total).toBe(3500000)
    })
  })

  describe('getPharmacyReport', () => {
    it('should return pharmacy data', async () => {
      const qb = createMockQb([])

      let callCount = 0
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        callCount++
        let data: unknown
        switch (callCount) {
          case 1: // top drugs
            data = [
              { drug: 'Paracetamol', qty: '500' },
              { drug: 'Amoxicillin', qty: '320' },
            ]
            break
          case 2: // expiring
            data = [
              { drug: 'Aspirin', batch: 'B001', expiry: '2026-12-01', stock: '100' },
            ]
            break
          case 3: // stock value
            data = [{ total: '45000000' }]
            break
          case 4: // low stock
            data = [{ drug: 'Metformin', stock: '5', minimum: '10' }]
            break
          default:
            data = []
        }
        resolve(data)
        return Promise.resolve(data)
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)

      const result = await service.getPharmacyReport('tenant_test')

      expect(result.topDrugs).toHaveLength(2)
      expect(result.topDrugs[0].drug).toBe('Paracetamol')
      expect(result.topDrugs[0].qty).toBe(500)
      expect(result.expiringSoon).toHaveLength(1)
      expect(result.totalStockValue).toBe(45000000)
      expect(result.lowStock).toHaveLength(1)
      expect(result.lowStock[0].stock).toBe(5)
      expect(result.lowStock[0].minimum).toBe(10)
    })
  })

  describe('getBedOccupancy', () => {
    it('should return bed occupancy per room with BOR', async () => {
      const qb = createMockQb([])

      let callCount = 0
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        callCount++
        let data: unknown
        switch (callCount) {
          case 1: // rooms
            data = [
              { room: 'Kelas 1', total: '10', occupied: '8' },
              { room: 'Kelas 2', total: '20', occupied: '12' },
              { room: 'Kelas 3', total: '30', occupied: '15' },
            ]
            break
          case 2: // avg LOS
            data = [{ avg: '3.5' }]
            break
          default:
            data = []
        }
        resolve(data)
        return Promise.resolve(data)
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)

      const result = await service.getBedOccupancy('tenant_test')

      expect(result.rooms).toHaveLength(3)
      expect(result.rooms[0].room).toBe('Kelas 1')
      expect(result.rooms[0].occupied).toBe(8)
      expect(result.rooms[0].total).toBe(10)
      expect(result.rooms[0].rate).toBe(80)

      // Overall BOR: (8+12+15)/(10+20+30) = 35/60 = 58%
      expect(result.overallBor).toBe(58)
      expect(result.averageLos).toBe(3.5)
    })

    it('should handle empty beds', async () => {
      const qb = createMockQb([])
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        resolve([])
        return Promise.resolve([])
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)

      const result = await service.getBedOccupancy('tenant_test')

      expect(result.rooms).toHaveLength(0)
      expect(result.overallBor).toBe(0)
      expect(result.averageLos).toBe(0)
    })
  })

  describe('exportReport', () => {
    it('should export visits as CSV', async () => {
      const qb = createMockQb([])

      let callCount = 0
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        callCount++
        switch (callCount) {
          case 1:
            resolve([
              { date: '2026-10-01', count: '10' },
              { date: '2026-10-02', count: '15' },
            ])
            break
          default:
            resolve([])
        }
        return Promise.resolve([])
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

      const result = await service.exportReport('visits', range, 'csv', 'tenant_test')

      expect(result.filename).toBe('laporan-kunjungan-2026-10-01-2026-10-31.csv')
      expect(result.contentType).toBe('text/csv')
      expect(result.buffer).toBeInstanceOf(Buffer)

      const csv = result.buffer.toString('utf-8')
      expect(csv).toContain('Tanggal,Jumlah')
      expect(csv).toContain('2026-10-01,10')
      expect(csv).toContain('2026-10-02,15')
    })

    it('should export revenue as CSV', async () => {
      const qb = createMockQb([])

      let callCount = 0
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        callCount++
        switch (callCount) {
          case 1:
            resolve([{ date: '2026-10-01', amount: '5000000' }])
            break
          case 4:
            resolve([{ total: '5000000' }])
            break
          default:
            resolve([])
        }
        return Promise.resolve([])
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

      const result = await service.exportReport('revenue', range, 'csv', 'tenant_test')

      expect(result.filename).toContain('laporan-pendapatan')
      const csv = result.buffer.toString('utf-8')
      expect(csv).toContain('Tanggal,Pendapatan')
    })

    it('should export diagnoses as CSV', async () => {
      const mockData = [
        { icd10_code: 'J06.9', icd10_name: 'ISPA', count: '45' },
      ]
      const qb = createMockQb(mockData)
      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

      const result = await service.exportReport('diagnoses', range, 'csv', 'tenant_test')

      expect(result.filename).toContain('laporan-diagnosa')
      const csv = result.buffer.toString('utf-8')
      expect(csv).toContain('Kode_ICD10,Diagnosa,Jumlah')
      expect(csv).toContain('J06.9,ISPA,45')
    })

    it('should export pharmacy as CSV', async () => {
      const qb = createMockQb([])

      let callCount = 0
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        callCount++
        switch (callCount) {
          case 1:
            resolve([{ drug: 'Paracetamol', qty: '100' }])
            break
          default:
            resolve([])
        }
        return Promise.resolve([])
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

      const result = await service.exportReport('pharmacy', range, 'csv', 'tenant_test')

      expect(result.filename).toBe('laporan-farmasi.csv')
      const csv = result.buffer.toString('utf-8')
      expect(csv).toContain('Obat,Jumlah')
      expect(csv).toContain('Paracetamol,100')
    })

    it('should handle empty export data', async () => {
      const qb = createMockQb([])
      qb.then = jest.fn().mockImplementation((resolve: (v: unknown) => void) => {
        resolve([])
        return Promise.resolve([])
      })

      const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
      const service = new DashboardService(mockDb as never)
      const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

      const result = await service.exportReport('visits', range, 'csv', 'tenant_test')
      expect(result.buffer.toString('utf-8')).toBe('')
    })
  })
})

// ================================================================
// CONTROLLER UNIT TESTS
// ================================================================

describe('DashboardController', () => {
  // Import controller after mocks are set up
  let DashboardController: typeof import('./dashboard.controller').DashboardController

  beforeAll(async () => {
    const mod = await import('./dashboard.controller')
    DashboardController = mod.DashboardController
  })

  function mockReq(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      tenantSchema: 'tenant_test',
      query: {},
      ...overrides,
    }
  }

  function mockRes() {
    const res: Record<string, jest.Mock> = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    }
    return res
  }

  it('should call overview and return success', async () => {
    const mockService = {
      getOverview: jest.fn().mockResolvedValue({ visits: { total: 5 } }),
    }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq()
    const res = mockRes()
    const next = jest.fn()

    await ctrl.overview(req as never, res as never, next)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { visits: { total: 5 } },
    })
  })

  it('should parse date range for visit stats', async () => {
    const mockService = {
      getVisitStats: jest.fn().mockResolvedValue({ byDate: [] }),
    }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq({
      query: { from: '2026-10-01', to: '2026-10-31', groupBy: 'week' },
    })
    const res = mockRes()
    const next = jest.fn()

    await ctrl.visitStats(req as never, res as never, next)

    expect(mockService.getVisitStats).toHaveBeenCalledWith(
      { from: '2026-10-01', to: '2026-10-31' },
      'week',
      'tenant_test',
    )
  })

  it('should use default 30-day range when not provided', async () => {
    const mockService = {
      getVisitStats: jest.fn().mockResolvedValue({ byDate: [] }),
    }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq({ query: {} })
    const res = mockRes()
    const next = jest.fn()

    await ctrl.visitStats(req as never, res as never, next)

    const callArgs = mockService.getVisitStats.mock.calls[0]
    const range = callArgs[0] as DateRange
    expect(range.from).toBeDefined()
    expect(range.to).toBeDefined()
    expect(range.from < range.to).toBe(true)
  })

  it('should pass limit for top diagnoses', async () => {
    const mockService = {
      getTopDiagnoses: jest.fn().mockResolvedValue([]),
    }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq({
      query: { from: '2026-10-01', to: '2026-10-31', limit: '20' },
    })
    const res = mockRes()
    const next = jest.fn()

    await ctrl.topDiagnoses(req as never, res as never, next)

    expect(mockService.getTopDiagnoses).toHaveBeenCalledWith(
      { from: '2026-10-01', to: '2026-10-31' },
      20,
      'tenant_test',
    )
  })

  it('should cap limit at 50', async () => {
    const mockService = {
      getTopDiagnoses: jest.fn().mockResolvedValue([]),
    }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq({
      query: { from: '2026-10-01', to: '2026-10-31', limit: '999' },
    })
    const res = mockRes()
    const next = jest.fn()

    await ctrl.topDiagnoses(req as never, res as never, next)

    expect(mockService.getTopDiagnoses.mock.calls[0][1]).toBe(50)
  })

  it('should reject invalid date format', async () => {
    const mockService = { getVisitStats: jest.fn() }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq({
      query: { from: '10-01-2026', to: '10-31-2026' },
    })
    const res = mockRes()
    const next = jest.fn()

    await ctrl.visitStats(req as never, res as never, next)

    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0]
    expect(err.message).toContain('YYYY-MM-DD')
  })

  it('should reject from > to', async () => {
    const mockService = { getVisitStats: jest.fn() }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq({
      query: { from: '2026-10-31', to: '2026-10-01' },
    })
    const res = mockRes()
    const next = jest.fn()

    await ctrl.visitStats(req as never, res as never, next)

    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0]
    expect(err.message).toContain('sebelum')
  })

  it('should reject invalid export type', async () => {
    const mockService = { exportReport: jest.fn() }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq({
      query: { type: 'invalid', from: '2026-10-01', to: '2026-10-31' },
    })
    const res = mockRes()
    const next = jest.fn()

    await ctrl.exportReport(req as never, res as never, next)

    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0]
    expect(err.message).toContain('visits, revenue, pharmacy')
  })

  it('should set headers for CSV export', async () => {
    const mockService = {
      exportReport: jest.fn().mockResolvedValue({
        buffer: Buffer.from('test'),
        filename: 'report.csv',
        contentType: 'text/csv',
      }),
    }
    const ctrl = new DashboardController(mockService as never)
    const req = mockReq({
      query: { type: 'visits', from: '2026-10-01', to: '2026-10-31', format: 'csv' },
    })
    const res = mockRes()
    const next = jest.fn()

    await ctrl.exportReport(req as never, res as never, next)

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv')
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="report.csv"',
    )
    expect(res.send).toHaveBeenCalled()
  })
})

// ================================================================
// CACHE INVALIDATION TEST
// ================================================================

describe('invalidateDashboardCache', () => {
  it('should call redis.keys and redis.del', async () => {
    const { redis } = require('../../config/redis')

    redis.keys.mockResolvedValue(['dashboard:tenant_test:overview', 'dashboard:tenant_test:visits:x:y:day'])
    redis.del.mockResolvedValue(2)

    await invalidateDashboardCache('tenant_test')

    expect(redis.keys).toHaveBeenCalledWith('dashboard:tenant_test:*')
    expect(redis.del).toHaveBeenCalledWith(
      'dashboard:tenant_test:overview',
      'dashboard:tenant_test:visits:x:y:day',
    )
  })

  it('should skip del when no keys found', async () => {
    const { redis } = require('../../config/redis')

    redis.keys.mockResolvedValue([])
    redis.del.mockClear()

    await invalidateDashboardCache('tenant_empty')

    expect(redis.del).not.toHaveBeenCalled()
  })
})

// ================================================================
// CSV HELPER TEST
// ================================================================

describe('CSV export format', () => {
  it('should properly escape CSV values with commas', async () => {
    const qb = createMockQb([
      { icd10_code: 'J06.9', icd10_name: 'Infeksi saluran napas atas, akut', count: '10' },
    ])
    const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
    const service = new DashboardService(mockDb as never)
    const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

    const result = await service.exportReport('diagnoses', range, 'csv', 'tenant_test')
    const csv = result.buffer.toString('utf-8')

    // Value with comma should be quoted
    expect(csv).toContain('"Infeksi saluran napas atas, akut"')
  })

  it('should properly escape CSV values with quotes', async () => {
    const qb = createMockQb([
      { icd10_code: 'X', icd10_name: 'Test "quoted" value', count: '1' },
    ])
    const mockDb = { withSchema: jest.fn().mockReturnValue(qb), raw: qb.raw }
    const service = new DashboardService(mockDb as never)
    const range: DateRange = { from: '2026-10-01', to: '2026-10-31' }

    const result = await service.exportReport('diagnoses', range, 'csv', 'tenant_test')
    const csv = result.buffer.toString('utf-8')

    // Escaped double quotes
    expect(csv).toContain('"Test ""quoted"" value"')
  })
})
