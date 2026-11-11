import type { Knex } from 'knex'
import { redis } from '../../config/redis'
import { logger } from '../../shared/logger'

// --- Cache helpers ---

async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key)
    if (hit) {
      logger.debug('Dashboard cache hit', { key })
      return JSON.parse(hit) as T
    }
  } catch {
    // Redis unavailable
  }

  const data = await fn()

  try {
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch {
    // Redis unavailable
  }

  return data
}

export async function invalidateDashboardCache(tenantSchema: string) {
  try {
    const keys = await redis.keys(`dashboard:${tenantSchema}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
      logger.debug('Dashboard cache invalidated', { tenantSchema, count: keys.length })
    }
  } catch {
    // Redis unavailable
  }
}

// --- Types ---

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string
}

export interface OverviewData {
  visits: {
    total: number
    rawat_jalan: number
    igd: number
    rawat_inap: number
  }
  queues: {
    menunggu: number
    dilayani: number
  }
  bedOccupancy: {
    occupied: number
    total: number
    rate: number
  }
  revenue: {
    total: number
    byMethod: { method: string; amount: number }[]
  }
  newPatients: number
}

export interface VisitStatsData {
  byDate: { date: string; count: number }[]
  byRoom: { room: string; count: number }[]
  byDoctor: { doctor: string; count: number }[]
  byPenjamin: { penjamin: string; count: number }[]
}

export interface DiagnosisRank {
  icd10_code: string
  icd10_name: string
  count: number
}

export interface RevenueData {
  byDate: { date: string; amount: number }[]
  byCategory: { category: string; amount: number }[]
  byPenjamin: { penjamin: string; amount: number }[]
  total: number
}

export interface PharmacyReportData {
  topDrugs: { drug: string; qty: number }[]
  expiringSoon: { drug: string; batch: string; expiry: string; stock: number }[]
  totalStockValue: number
  lowStock: { drug: string; stock: number; minimum: number }[]
}

export interface BedOccupancyData {
  rooms: { room: string; occupied: number; total: number; rate: number }[]
  averageLos: number
  overallBor: number
}

// --- Service ---

export class DashboardService {
  constructor(private db: Knex) {}

  // ===============================
  // OVERVIEW — cache 60s
  // ===============================

  async getOverview(tenantSchema: string): Promise<OverviewData> {
    const cacheKey = `dashboard:${tenantSchema}:overview`
    return cached(cacheKey, 60, () => this.buildOverview(tenantSchema))
  }

  private async buildOverview(s: string): Promise<OverviewData> {
    const today = new Date().toISOString().slice(0, 10)

    // Visits today by type
    const visitRows = await this.db
      .withSchema(s)
      .select('tipe')
      .count('id as count')
      .from('visits')
      .where('tanggal', today)
      .whereNull('deleted_at')
      .groupBy('tipe')

    const visitMap: Record<string, number> = {}
    let totalVisits = 0
    for (const r of visitRows) {
      const c = Number(r.count)
      visitMap[r.tipe as string] = c
      totalVisits += c
    }

    // Active queues
    const queueRows = await this.db
      .withSchema(s)
      .select('q.status')
      .count('q.id as count')
      .from('queues as q')
      .join('visits as v', 'q.visit_id', 'v.id')
      .where('v.tanggal', today)
      .whereIn('q.status', ['menunggu', 'dipanggil', 'dilayani'])
      .groupBy('q.status')

    let menunggu = 0
    let dilayani = 0
    for (const r of queueRows) {
      const c = Number(r.count)
      if (r.status === 'menunggu') menunggu = c
      else dilayani += c // dipanggil + dilayani
    }

    // Bed occupancy
    const bedRows = await this.db
      .withSchema(s)
      .select(
        this.db.raw(`COUNT(*) as total`),
        this.db.raw(`COUNT(*) FILTER (WHERE status = 'terisi') as occupied`),
      )
      .from('beds')

    const totalBeds = Number(bedRows[0]?.total ?? 0)
    const occupiedBeds = Number(bedRows[0]?.occupied ?? 0)

    // Revenue today
    const revRow = await this.db
      .withSchema(s)
      .select(this.db.raw(`COALESCE(SUM(jumlah), 0) as total`))
      .from('payments')
      .whereRaw(`paid_at::date = ?`, [today])

    const totalRevenue = Number(revRow[0]?.total ?? 0)

    const revByMethod = await this.db
      .withSchema(s)
      .select('metode as method')
      .sum('jumlah as amount')
      .from('payments')
      .whereRaw(`paid_at::date = ?`, [today])
      .groupBy('metode')
      .orderBy('amount', 'desc')

    // New patients today
    const newPtRow = await this.db
      .withSchema(s)
      .count('id as count')
      .from('patients')
      .whereRaw(`created_at::date = ?`, [today])
      .whereNull('deleted_at')

    return {
      visits: {
        total: totalVisits,
        rawat_jalan: visitMap['rawat_jalan'] || 0,
        igd: visitMap['igd'] || 0,
        rawat_inap: visitMap['rawat_inap'] || 0,
      },
      queues: { menunggu, dilayani },
      bedOccupancy: {
        occupied: occupiedBeds,
        total: totalBeds,
        rate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      },
      revenue: {
        total: totalRevenue,
        byMethod: revByMethod.map((r) => ({
          method: r.method as string,
          amount: Number(r.amount),
        })),
      },
      newPatients: Number(newPtRow[0]?.count ?? 0),
    }
  }

  // ===============================
  // VISIT STATS — cache 300s
  // ===============================

  async getVisitStats(
    range: DateRange,
    groupBy: 'day' | 'week' | 'month',
    tenantSchema: string,
  ): Promise<VisitStatsData> {
    const cacheKey = `dashboard:${tenantSchema}:visits:${range.from}:${range.to}:${groupBy}`
    return cached(cacheKey, 300, () =>
      this.buildVisitStats(range, groupBy, tenantSchema),
    )
  }

  private async buildVisitStats(
    range: DateRange,
    groupBy: string,
    s: string,
  ): Promise<VisitStatsData> {
    const dateExpr =
      groupBy === 'month'
        ? `TO_CHAR(tanggal, 'YYYY-MM')`
        : groupBy === 'week'
          ? `TO_CHAR(DATE_TRUNC('week', tanggal), 'YYYY-MM-DD')`
          : `TO_CHAR(tanggal, 'YYYY-MM-DD')`

    // By date
    const byDate = await this.db
      .withSchema(s)
      .select(this.db.raw(`${dateExpr} as date`))
      .count('id as count')
      .from('visits')
      .whereBetween('tanggal', [range.from, range.to])
      .whereNull('deleted_at')
      .groupByRaw(dateExpr)
      .orderByRaw(`${dateExpr}`)

    // By room (poli)
    const byRoom = await this.db
      .withSchema(s)
      .select('r.nama as room')
      .count('v.id as count')
      .from('visits as v')
      .join('rooms as r', 'v.room_id', 'r.id')
      .whereBetween('v.tanggal', [range.from, range.to])
      .whereNull('v.deleted_at')
      .groupBy('r.nama')
      .orderBy('count', 'desc')

    // By doctor
    const byDoctor = await this.db
      .withSchema(s)
      .select('u.name as doctor')
      .count('v.id as count')
      .from('visits as v')
      .join('doctors as d', 'v.doctor_id', 'd.id')
      .join('users as u', 'd.user_id', 'u.id')
      .whereBetween('v.tanggal', [range.from, range.to])
      .whereNull('v.deleted_at')
      .groupBy('u.name')
      .orderBy('count', 'desc')

    // By penjamin
    const byPenjamin = await this.db
      .withSchema(s)
      .select('penjamin')
      .count('id as count')
      .from('visits')
      .whereBetween('tanggal', [range.from, range.to])
      .whereNull('deleted_at')
      .groupBy('penjamin')
      .orderBy('count', 'desc')

    return {
      byDate: byDate.map((r) => ({ date: r.date as string, count: Number(r.count) })),
      byRoom: byRoom.map((r) => ({ room: r.room as string, count: Number(r.count) })),
      byDoctor: byDoctor.map((r) => ({ doctor: r.doctor as string, count: Number(r.count) })),
      byPenjamin: byPenjamin.map((r) => ({
        penjamin: r.penjamin as string,
        count: Number(r.count),
      })),
    }
  }

  // ===============================
  // TOP DIAGNOSES — cache 300s
  // ===============================

  async getTopDiagnoses(
    range: DateRange,
    limit: number,
    tenantSchema: string,
  ): Promise<DiagnosisRank[]> {
    const cacheKey = `dashboard:${tenantSchema}:diagnoses:${range.from}:${range.to}:${limit}`
    return cached(cacheKey, 300, () =>
      this.buildTopDiagnoses(range, limit, tenantSchema),
    )
  }

  private async buildTopDiagnoses(
    range: DateRange,
    limit: number,
    s: string,
  ): Promise<DiagnosisRank[]> {
    const rows = await this.db
      .withSchema(s)
      .select('dx.icd10_code', 'dx.icd10_name')
      .count('dx.id as count')
      .from('diagnoses as dx')
      .join('medical_records as mr', 'dx.medical_record_id', 'mr.id')
      .join('visits as v', 'mr.visit_id', 'v.id')
      .whereBetween('v.tanggal', [range.from, range.to])
      .whereNull('v.deleted_at')
      .groupBy('dx.icd10_code', 'dx.icd10_name')
      .orderBy('count', 'desc')
      .limit(limit)

    return rows.map((r) => ({
      icd10_code: r.icd10_code as string,
      icd10_name: r.icd10_name as string,
      count: Number(r.count),
    }))
  }

  // ===============================
  // REVENUE REPORT — cache 900s
  // ===============================

  async getRevenueReport(
    range: DateRange,
    groupBy: 'day' | 'week' | 'month',
    tenantSchema: string,
  ): Promise<RevenueData> {
    const cacheKey = `dashboard:${tenantSchema}:revenue:${range.from}:${range.to}:${groupBy}`
    return cached(cacheKey, 900, () =>
      this.buildRevenueReport(range, groupBy, tenantSchema),
    )
  }

  private async buildRevenueReport(
    range: DateRange,
    groupBy: string,
    s: string,
  ): Promise<RevenueData> {
    const dateExpr =
      groupBy === 'month'
        ? `TO_CHAR(p.paid_at, 'YYYY-MM')`
        : groupBy === 'week'
          ? `TO_CHAR(DATE_TRUNC('week', p.paid_at), 'YYYY-MM-DD')`
          : `TO_CHAR(p.paid_at, 'YYYY-MM-DD')`

    // By date
    const byDate = await this.db
      .withSchema(s)
      .select(this.db.raw(`${dateExpr} as date`))
      .sum('p.jumlah as amount')
      .from('payments as p')
      .whereRaw(`p.paid_at::date BETWEEN ? AND ?`, [range.from, range.to])
      .groupByRaw(dateExpr)
      .orderByRaw(dateExpr)

    // By category (from bill_items via bills → payments)
    const byCategory = await this.db
      .withSchema(s)
      .select('bi.kategori as category')
      .sum('bi.total as amount')
      .from('bill_items as bi')
      .join('bills as b', 'bi.bill_id', 'b.id')
      .whereBetween(this.db.raw(`b.created_at::date`), [range.from, range.to])
      .where('b.status', '!=', 'batal')
      .groupBy('bi.kategori')
      .orderBy('amount', 'desc')

    // By penjamin
    const byPenjamin = await this.db
      .withSchema(s)
      .select('b.penjamin')
      .sum('b.final_amount as amount')
      .from('bills as b')
      .whereBetween(this.db.raw(`b.created_at::date`), [range.from, range.to])
      .whereIn('b.status', ['final', 'dibayar'])
      .groupBy('b.penjamin')
      .orderBy('amount', 'desc')

    // Total
    const totalRow = await this.db
      .withSchema(s)
      .sum('jumlah as total')
      .from('payments')
      .whereRaw(`paid_at::date BETWEEN ? AND ?`, [range.from, range.to])

    return {
      byDate: byDate.map((r) => ({ date: r.date as string, amount: Number(r.amount) })),
      byCategory: byCategory.map((r) => ({
        category: r.category as string,
        amount: Number(r.amount),
      })),
      byPenjamin: byPenjamin.map((r) => ({
        penjamin: r.penjamin as string,
        amount: Number(r.amount),
      })),
      total: Number(totalRow[0]?.total ?? 0),
    }
  }

  // ===============================
  // PHARMACY REPORT — cache 300s
  // ===============================

  async getPharmacyReport(tenantSchema: string): Promise<PharmacyReportData> {
    const cacheKey = `dashboard:${tenantSchema}:pharmacy`
    return cached(cacheKey, 300, () => this.buildPharmacyReport(tenantSchema))
  }

  private async buildPharmacyReport(s: string): Promise<PharmacyReportData> {
    // Top drugs by dispensed qty (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const fromDate = thirtyDaysAgo.toISOString().slice(0, 10)

    const topDrugs = await this.db
      .withSchema(s)
      .select('dr.nama as drug')
      .sum('di.jumlah_diberikan as qty')
      .from('dispensing_items as di')
      .join('dispensing as disp', 'di.dispensing_id', 'disp.id')
      .join('drugs as dr', 'di.drug_id', 'dr.id')
      .where('disp.status', 'selesai')
      .where('disp.dispensed_at', '>=', fromDate)
      .groupBy('dr.nama')
      .orderBy('qty', 'desc')
      .limit(20)

    // Expiring within 90 days
    const ninetyDaysFromNow = new Date()
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90)
    const expiryLimit = ninetyDaysFromNow.toISOString().slice(0, 10)

    const expiringSoon = await this.db
      .withSchema(s)
      .select('dr.nama as drug', 'ds.batch_number as batch', 'ds.tanggal_kadaluarsa as expiry', 'ds.stok_sisa as stock')
      .from('drug_stocks as ds')
      .join('drugs as dr', 'ds.drug_id', 'dr.id')
      .where('ds.stok_sisa', '>', 0)
      .where('ds.tanggal_kadaluarsa', '<=', expiryLimit)
      .whereNotNull('ds.tanggal_kadaluarsa')
      .orderBy('ds.tanggal_kadaluarsa', 'asc')
      .limit(50)

    // Total stock value
    const stockValueRow = await this.db
      .withSchema(s)
      .select(this.db.raw('COALESCE(SUM(ds.stok_sisa * ds.harga_beli_per_unit), 0) as total'))
      .from('drug_stocks as ds')
      .where('ds.stok_sisa', '>', 0)

    // Low stock
    const lowStock = await this.db
      .withSchema(s)
      .select('dr.nama as drug', 'dr.stok_minimum as minimum')
      .sum('ds.stok_sisa as stock')
      .from('drugs as dr')
      .leftJoin('drug_stocks as ds', 'dr.id', 'ds.drug_id')
      .where('dr.is_active', true)
      .groupBy('dr.id', 'dr.nama', 'dr.stok_minimum')
      .havingRaw('COALESCE(SUM(ds.stok_sisa), 0) <= dr.stok_minimum')
      .orderByRaw('COALESCE(SUM(ds.stok_sisa), 0) ASC')
      .limit(50)

    return {
      topDrugs: topDrugs.map((r) => ({
        drug: r.drug as string,
        qty: Number(r.qty),
      })),
      expiringSoon: expiringSoon.map((r) => ({
        drug: r.drug as string,
        batch: (r.batch as string) || '-',
        expiry: r.expiry as string,
        stock: Number(r.stock),
      })),
      totalStockValue: Number(stockValueRow[0]?.total ?? 0),
      lowStock: lowStock.map((r) => ({
        drug: r.drug as string,
        stock: Number(r.stock),
        minimum: Number(r.minimum),
      })),
    }
  }

  // ===============================
  // BED OCCUPANCY — cache 60s
  // ===============================

  async getBedOccupancy(tenantSchema: string): Promise<BedOccupancyData> {
    const cacheKey = `dashboard:${tenantSchema}:beds`
    return cached(cacheKey, 60, () => this.buildBedOccupancy(tenantSchema))
  }

  private async buildBedOccupancy(s: string): Promise<BedOccupancyData> {
    // Per room
    const rooms = await this.db
      .withSchema(s)
      .select(
        'r.nama as room',
        this.db.raw(`COUNT(b.id) as total`),
        this.db.raw(`COUNT(b.id) FILTER (WHERE b.status = 'terisi') as occupied`),
      )
      .from('rooms as r')
      .join('beds as b', 'r.id', 'b.room_id')
      .where('r.tipe', 'rawat_inap')
      .groupBy('r.id', 'r.nama')
      .orderBy('r.nama')

    const roomData = rooms.map((r) => {
      const total = Number(r.total)
      const occupied = Number(r.occupied)
      return {
        room: r.room as string,
        occupied,
        total,
        rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      }
    })

    // Overall BOR
    const totalAllBeds = roomData.reduce((s, r) => s + r.total, 0)
    const occupiedAllBeds = roomData.reduce((s, r) => s + r.occupied, 0)
    const overallBor = totalAllBeds > 0
      ? Math.round((occupiedAllBeds / totalAllBeds) * 100)
      : 0

    // Average Length of Stay (finished visits with rawat_inap in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const losRow = await this.db
      .withSchema(s)
      .avg(
        this.db.raw(
          `EXTRACT(EPOCH FROM (v.updated_at - v.created_at)) / 86400`,
        ),
      )
      .from('visits as v')
      .where('v.tipe', 'rawat_inap')
      .where('v.status', 'selesai')
      .where('v.created_at', '>=', thirtyDaysAgo.toISOString())
      .as('avg_los')

    const avgLos = Number(losRow[0]?.avg ?? 0)

    return {
      rooms: roomData,
      averageLos: Math.round(avgLos * 10) / 10,
      overallBor,
    }
  }

  // ===============================
  // EXPORT — no cache
  // ===============================

  async exportReport(
    reportType: 'visits' | 'revenue' | 'pharmacy' | 'diagnoses' | 'patients' | 'billing',
    range: DateRange,
    format: 'csv' | 'xlsx' | 'pdf',
    tenantSchema: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const sheets = await this.buildExportSheets(reportType, range, tenantSchema)

    if (format === 'xlsx') {
      const buffer = await this.toXlsx(sheets)
      return {
        buffer,
        filename: `${sheets.filename}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    }

    if (format === 'pdf') {
      const buffer = await this.toPdf(sheets, range)
      return {
        buffer,
        filename: `${sheets.filename}.pdf`,
        contentType: 'application/pdf',
      }
    }

    const csvContent = this.toCsv(sheets.sheets[0]?.rows ?? [])
    const buffer = Buffer.from(csvContent, 'utf-8')
    return {
      buffer,
      filename: `${sheets.filename}.csv`,
      contentType: 'text/csv',
    }
  }

  private async buildExportSheets(
    reportType: 'visits' | 'revenue' | 'pharmacy' | 'diagnoses' | 'patients' | 'billing',
    range: DateRange,
    s: string,
  ): Promise<ExportData> {
    switch (reportType) {
      case 'visits': {
        const data = await this.buildVisitStats(range, 'day', s)
        const totalVisits = data.byDate.reduce((a, r) => a + r.count, 0)
        return {
          title: 'Laporan Kunjungan',
          filename: `laporan-kunjungan-${range.from}-${range.to}`,
          summary: [
            { label: 'Total Kunjungan', value: totalVisits.toLocaleString('id-ID') },
            { label: 'Rata-rata/Hari', value: data.byDate.length > 0 ? Math.round(totalVisits / data.byDate.length).toLocaleString('id-ID') : '0' },
          ],
          sheets: [
            {
              name: 'Per Tanggal',
              rows: data.byDate.map((r) => ({ Tanggal: r.date, Jumlah: r.count })),
            },
            {
              name: 'Per Poli',
              rows: data.byRoom.map((r) => ({ Poli: r.room, Jumlah: r.count })),
            },
            {
              name: 'Per Dokter',
              rows: data.byDoctor.map((r) => ({ Dokter: r.doctor, Jumlah: r.count })),
            },
            {
              name: 'Per Penjamin',
              rows: data.byPenjamin.map((r) => ({ Penjamin: r.penjamin, Jumlah: r.count })),
            },
          ],
        }
      }

      case 'revenue': {
        const data = await this.buildRevenueReport(range, 'day', s)
        return {
          title: 'Laporan Pendapatan',
          filename: `laporan-pendapatan-${range.from}-${range.to}`,
          summary: [
            { label: 'Total Pendapatan', value: `Rp ${Math.round(data.total).toLocaleString('id-ID')}` },
          ],
          sheets: [
            {
              name: 'Per Tanggal',
              rows: data.byDate.map((r) => ({ Tanggal: r.date, Pendapatan: r.amount })),
            },
            {
              name: 'Per Kategori',
              rows: data.byCategory.map((r) => ({ Kategori: r.category, Jumlah: r.amount })),
            },
            {
              name: 'Per Penjamin',
              rows: data.byPenjamin.map((r) => ({ Penjamin: r.penjamin, Jumlah: r.amount })),
            },
          ],
        }
      }

      case 'pharmacy': {
        const data = await this.buildPharmacyReport(s)
        return {
          title: 'Laporan Farmasi',
          filename: `laporan-farmasi-${range.from}`,
          summary: [
            { label: 'Total Nilai Stok', value: `Rp ${Math.round(data.totalStockValue).toLocaleString('id-ID')}` },
            { label: 'Obat Hampir Kadaluarsa', value: String(data.expiringSoon.length) },
            { label: 'Stok Rendah', value: String(data.lowStock.length) },
          ],
          sheets: [
            {
              name: 'Obat Terlaris',
              rows: data.topDrugs.map((r, i) => ({ No: i + 1, Obat: r.drug, Jumlah_Dispensing: r.qty })),
            },
            {
              name: 'Mendekati Kadaluarsa',
              rows: data.expiringSoon.map((r) => ({
                Obat: r.drug,
                Batch: r.batch,
                Tanggal_Kadaluarsa: r.expiry,
                Sisa_Stok: r.stock,
              })),
            },
            {
              name: 'Stok Rendah',
              rows: data.lowStock.map((r) => ({
                Obat: r.drug,
                Stok_Saat_Ini: r.stock,
                Minimum: r.minimum,
              })),
            },
          ],
        }
      }

      case 'diagnoses': {
        const data = await this.buildTopDiagnoses(range, 100, s)
        return {
          title: 'Laporan Diagnosa',
          filename: `laporan-diagnosa-${range.from}-${range.to}`,
          summary: [
            { label: 'Total Diagnosa Unik', value: String(data.length) },
            { label: 'Diagnosa Terbanyak', value: data.length > 0 ? `${data[0]!.icd10_code} - ${data[0]!.icd10_name}` : '-' },
          ],
          sheets: [
            {
              name: 'Diagnosa',
              rows: data.map((r, i) => ({
                No: i + 1,
                Kode_ICD10: r.icd10_code,
                Nama_Diagnosa: r.icd10_name,
                Jumlah: r.count,
              })),
            },
          ],
        }
      }

      case 'patients': {
        const rows = await this.db
          .withSchema(s)
          .select(
            'p.no_rekam_medis',
            'p.nik',
            'p.nama',
            'p.tanggal_lahir',
            'p.jenis_kelamin',
            'p.alamat',
            'p.no_telepon',
            'p.golongan_darah',
            'p.created_at',
          )
          .from('patients as p')
          .whereNull('p.deleted_at')
          .orderBy('p.no_rekam_medis', 'asc')
          .limit(5000)

        return {
          title: 'Daftar Pasien',
          filename: `daftar-pasien-${range.from}`,
          summary: [
            { label: 'Total Pasien', value: String(rows.length) },
          ],
          sheets: [
            {
              name: 'Pasien',
              rows: rows.map((r, i) => ({
                No: i + 1,
                No_RM: r.no_rekam_medis,
                NIK: r.nik,
                Nama: r.nama,
                Tanggal_Lahir: r.tanggal_lahir ? String(r.tanggal_lahir).slice(0, 10) : '',
                Jenis_Kelamin: r.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
                Alamat: r.alamat || '',
                No_Telepon: r.no_telepon || '',
                Golongan_Darah: r.golongan_darah || '-',
                Terdaftar: r.created_at ? String(r.created_at).slice(0, 10) : '',
              })),
            },
          ],
        }
      }

      case 'billing': {
        const bills = await this.db
          .withSchema(s)
          .select(
            'b.bill_number',
            'b.penjamin',
            'b.total_amount',
            'b.discount_amount',
            'b.final_amount',
            'b.status',
            'b.created_at',
            'v.visit_number',
            'v.tanggal',
            'p.nama as patient_nama',
            'p.no_rekam_medis',
          )
          .from('bills as b')
          .join('visits as v', 'b.visit_id', 'v.id')
          .join('patients as p', 'v.patient_id', 'p.id')
          .whereBetween(this.db.raw('b.created_at::date'), [range.from, range.to])
          .orderBy('b.created_at', 'desc')
          .limit(5000)

        const payments = await this.db
          .withSchema(s)
          .select(
            'py.jumlah',
            'py.metode',
            'py.paid_at',
            'b.bill_number',
            'p.nama as patient_nama',
          )
          .from('payments as py')
          .join('bills as b', 'py.bill_id', 'b.id')
          .join('visits as v', 'b.visit_id', 'v.id')
          .join('patients as p', 'v.patient_id', 'p.id')
          .whereRaw('py.paid_at::date BETWEEN ? AND ?', [range.from, range.to])
          .orderBy('py.paid_at', 'desc')
          .limit(5000)

        const totalBilled = bills.reduce((a, r) => a + Number(r.final_amount || 0), 0)
        const totalPaid = payments.reduce((a, r) => a + Number(r.jumlah || 0), 0)

        return {
          title: 'Laporan Billing & Pembayaran',
          filename: `laporan-billing-${range.from}-${range.to}`,
          summary: [
            { label: 'Total Tagihan', value: `Rp ${Math.round(totalBilled).toLocaleString('id-ID')}` },
            { label: 'Total Pembayaran', value: `Rp ${Math.round(totalPaid).toLocaleString('id-ID')}` },
            { label: 'Jumlah Bill', value: String(bills.length) },
          ],
          sheets: [
            {
              name: 'Tagihan',
              rows: bills.map((r) => ({
                No_Bill: r.bill_number,
                Pasien: r.patient_nama,
                No_RM: r.no_rekam_medis,
                No_Visit: r.visit_number,
                Tanggal: String(r.tanggal).slice(0, 10),
                Penjamin: r.penjamin,
                Total: Number(r.total_amount || 0),
                Diskon: Number(r.discount_amount || 0),
                Final: Number(r.final_amount || 0),
                Status: r.status,
              })),
            },
            {
              name: 'Pembayaran',
              rows: payments.map((r) => ({
                No_Bill: r.bill_number,
                Pasien: r.patient_nama,
                Jumlah: Number(r.jumlah || 0),
                Metode: r.metode,
                Tanggal_Bayar: r.paid_at ? String(r.paid_at).slice(0, 19) : '',
              })),
            },
          ],
        }
      }
    }
  }

  // ===============================
  // XLSX Writer (multi-sheet)
  // ===============================

  private async toXlsx(data: ExportData): Promise<Buffer> {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'SIMRS SaaS'
    workbook.created = new Date()

    for (const sheet of data.sheets) {
      const ws = workbook.addWorksheet(sheet.name)

      if (sheet.rows.length === 0) {
        ws.addRow(['Tidak ada data'])
        continue
      }

      const headers = Object.keys(sheet.rows[0]!)

      // Title row
      const titleRow = ws.addRow([data.title])
      titleRow.font = { bold: true, size: 14 }
      ws.mergeCells(1, 1, 1, headers.length)

      // Summary rows
      if (data.summary.length > 0) {
        for (const s of data.summary) {
          const sr = ws.addRow([s.label, s.value])
          sr.getCell(1).font = { bold: true, size: 10 }
          sr.getCell(2).font = { size: 10 }
        }
      }

      ws.addRow([]) // empty spacer

      // Header row with styling
      const headerRow = ws.addRow(headers.map((h) => h.replace(/_/g, ' ')))
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' },
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF1D4ED8' } },
          bottom: { style: 'thin', color: { argb: 'FF1D4ED8' } },
          left: { style: 'thin', color: { argb: 'FF1D4ED8' } },
          right: { style: 'thin', color: { argb: 'FF1D4ED8' } },
        }
      })

      // Data rows
      for (let ri = 0; ri < sheet.rows.length; ri++) {
        const row = sheet.rows[ri]!
        const values = headers.map((h) => {
          const val = row[h]
          if (typeof val === 'number') return val
          return String(val ?? '')
        })
        const dataRow = ws.addRow(values)

        const isEven = ri % 2 === 0
        dataRow.eachCell((cell, colNumber) => {
          const val = row[headers[colNumber - 1]!]
          if (typeof val === 'number') {
            cell.numFmt = '#,##0'
            cell.alignment = { horizontal: 'right' }
          }
          if (isEven) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' },
            }
          }
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          }
        })
      }

      // Total row for numeric columns
      const numericCols = headers.filter((h) => {
        return sheet.rows.some((r) => typeof r[h] === 'number')
      })
      if (numericCols.length > 0) {
        ws.addRow([]) // spacer
        const totals: Record<string, unknown> = {}
        for (const h of headers) {
          if (numericCols.includes(h)) {
            totals[h] = sheet.rows.reduce((a, r) => a + (Number(r[h]) || 0), 0)
          } else {
            totals[h] = h === headers[0] ? 'TOTAL' : ''
          }
        }
        const totalRow = ws.addRow(headers.map((h) => totals[h]))
        totalRow.eachCell((cell) => {
          cell.font = { bold: true, size: 10 }
          cell.border = {
            top: { style: 'double', color: { argb: 'FF1D4ED8' } },
          }
        })
      }

      // Auto-fit column widths
      for (let i = 0; i < headers.length; i++) {
        const col = ws.getColumn(i + 1)
        let maxLen = headers[i]!.length
        for (const row of sheet.rows.slice(0, 50)) {
          const val = String(row[headers[i]!] ?? '')
          if (val.length > maxLen) maxLen = val.length
        }
        col.width = Math.min(Math.max(maxLen + 4, 12), 50)
      }

      // Freeze header row + title
      const headerRowNum = 2 + data.summary.length + 1 // title + summaries + spacer + header
      ws.views = [{ state: 'frozen', ySplit: headerRowNum }]
    }

    // Footer sheet: generated info
    const infoSheet = workbook.addWorksheet('Info')
    infoSheet.addRow(['Digenerate oleh', 'SIMRS SaaS'])
    infoSheet.addRow(['Tanggal', new Date().toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })])
    infoSheet.addRow(['Laporan', data.title])

    const buf = await workbook.xlsx.writeBuffer()
    return Buffer.from(buf)
  }

  // ===============================
  // PDF Writer (multi-section)
  // ===============================

  private async toPdf(data: ExportData, range: DateRange): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width - 100

      // ---- Cover / Header ----
      doc.fontSize(18).font('Helvetica-Bold').text('SIMRS SaaS', { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(14).font('Helvetica-Bold').text(data.title, { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica')
        .text(`Periode: ${range.from} s/d ${range.to}`, { align: 'center' })
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })}`, { align: 'center' })

      // Summary box
      if (data.summary.length > 0) {
        doc.moveDown(0.8)
        const boxY = doc.y
        const boxHeight = data.summary.length * 18 + 16
        doc.rect(50, boxY, pageWidth, boxHeight)
          .fillAndStroke('#EFF6FF', '#BFDBFE')

        let sy = boxY + 10
        for (const s of data.summary) {
          doc.fillColor('#1E40AF').fontSize(9).font('Helvetica-Bold')
            .text(s.label + ': ', 60, sy, { continued: true })
          doc.fillColor('#1F2937').font('Helvetica')
            .text(s.value)
          sy += 18
        }
        doc.y = boxY + boxHeight + 10
      }

      // ---- Sheets as sections ----
      for (let si = 0; si < data.sheets.length; si++) {
        const sheet = data.sheets[si]!
        const rows = sheet.rows

        if (si > 0) {
          doc.moveDown(1)
        }

        // Section title
        doc.fillColor('#1F2937').fontSize(12).font('Helvetica-Bold')
          .text(sheet.name)
        doc.moveDown(0.4)

        if (rows.length === 0) {
          doc.fontSize(9).font('Helvetica').fillColor('#6B7280')
            .text('Tidak ada data')
          continue
        }

        const headers = Object.keys(rows[0]!)
        const colCount = headers.length
        const colWidths = this.calcPdfColWidths(headers, rows, pageWidth)

        // Table header
        let y = doc.y
        const headerHeight = 22
        doc.rect(50, y, pageWidth, headerHeight).fill('#2563EB')

        let x = 50
        for (let i = 0; i < colCount; i++) {
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
            .text(headers[i]!.replace(/_/g, ' '), x + 4, y + 6, {
              width: colWidths[i]! - 8,
              align: typeof rows[0]![headers[i]!] === 'number' ? 'right' : 'left',
            })
          x += colWidths[i]!
        }

        y += headerHeight

        // Data rows
        for (let ri = 0; ri < rows.length; ri++) {
          const rowHeight = 18

          if (y + rowHeight > doc.page.height - 60) {
            doc.addPage()
            y = 50

            // Reprint header on new page
            doc.rect(50, y, pageWidth, headerHeight).fill('#2563EB')
            x = 50
            for (let i = 0; i < colCount; i++) {
              doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
                .text(headers[i]!.replace(/_/g, ' '), x + 4, y + 6, {
                  width: colWidths[i]! - 8,
                  align: typeof rows[0]![headers[i]!] === 'number' ? 'right' : 'left',
                })
              x += colWidths[i]!
            }
            y += headerHeight
          }

          if (ri % 2 === 0) {
            doc.rect(50, y, pageWidth, rowHeight).fill('#F9FAFB')
          }

          doc.moveTo(50, y + rowHeight).lineTo(50 + pageWidth, y + rowHeight)
            .strokeColor('#E5E7EB').lineWidth(0.5).stroke()

          x = 50
          const row = rows[ri]!
          for (let i = 0; i < colCount; i++) {
            const val = row[headers[i]!]
            const isNum = typeof val === 'number'
            const text = isNum
              ? (val as number).toLocaleString('id-ID')
              : String(val ?? '')

            doc.fillColor('#1F2937').fontSize(7.5).font('Helvetica')
              .text(text, x + 4, y + 4, {
                width: colWidths[i]! - 8,
                align: isNum ? 'right' : 'left',
              })
            x += colWidths[i]!
          }
          y += rowHeight
        }

        // Row count
        doc.y = y + 4
        doc.fillColor('#6B7280').fontSize(7).font('Helvetica')
          .text(`${rows.length} baris`, 50)
      }

      // Page numbers
      const pageCount = doc.bufferedPageRange().count
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i)
        doc.fillColor('#9CA3AF').fontSize(7).font('Helvetica')
          .text(
            `Halaman ${i + 1} / ${pageCount}`,
            50,
            doc.page.height - 35,
            { width: pageWidth, align: 'center' },
          )
      }

      doc.end()
    })
  }

  private calcPdfColWidths(
    headers: string[],
    rows: Record<string, unknown>[],
    totalWidth: number,
  ): number[] {
    const colCount = headers.length
    const weights: number[] = []

    for (let i = 0; i < colCount; i++) {
      let maxLen = headers[i]!.length
      for (const row of rows.slice(0, 30)) {
        const val = String(row[headers[i]!] ?? '')
        if (val.length > maxLen) maxLen = val.length
      }
      weights.push(Math.max(maxLen, 6))
    }

    const totalWeight = weights.reduce((s, w) => s + w, 0)
    return weights.map((w) => Math.round((w / totalWeight) * totalWidth))
  }

  private toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return ''
    const headers = Object.keys(rows[0]!)
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h]
            const str = String(val ?? '')
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str
          })
          .join(','),
      ),
    ]
    return lines.join('\n')
  }
}

// --- Export Data Structure ---

interface ExportSheet {
  name: string
  rows: Record<string, unknown>[]
}

interface ExportData {
  title: string
  filename: string
  summary: { label: string; value: string }[]
  sheets: ExportSheet[]
}
