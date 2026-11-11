import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { DashboardService } from './dashboard.service'
import { DashboardController } from './dashboard.controller'

const service = new DashboardService(db)
const controller = new DashboardController(service)

const router = Router()

router.use(authenticate)

/**
 * @openapi
 * /dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Ringkasan hari ini (kunjungan, antrian, okupansi, pendapatan)
 *     responses:
 *       200:
 *         description: Data overview dashboard
 */
router.get('/overview', checkAnyPermission('dashboard:read'), controller.overview)

/**
 * @openapi
 * /dashboard/visits:
 *   get:
 *     tags: [Dashboard]
 *     summary: Statistik kunjungan (per hari/minggu/bulan, per poli, per dokter, per penjamin)
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: Tanggal mulai (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         description: Tanggal akhir (YYYY-MM-DD)
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [day, week, month], default: day }
 *     responses:
 *       200:
 *         description: Data statistik kunjungan
 */
router.get('/visits', checkAnyPermission('dashboard:read'), controller.visitStats)

/**
 * @openapi
 * /dashboard/top-diagnoses:
 *   get:
 *     tags: [Dashboard]
 *     summary: Ranking diagnosa terbanyak (ICD-10)
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Daftar diagnosa terbanyak
 */
router.get('/top-diagnoses', checkAnyPermission('dashboard:read'), controller.topDiagnoses)

/**
 * @openapi
 * /dashboard/revenue:
 *   get:
 *     tags: [Dashboard]
 *     summary: Laporan pendapatan (per tanggal, per kategori, per penjamin)
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [day, week, month], default: day }
 *     responses:
 *       200:
 *         description: Data pendapatan
 */
router.get('/revenue', checkAnyPermission('dashboard:read', 'report:read'), controller.revenue)

/**
 * @openapi
 * /dashboard/pharmacy:
 *   get:
 *     tags: [Dashboard]
 *     summary: Laporan farmasi (obat terlaris, expiring, stok rendah, nilai stok)
 *     responses:
 *       200:
 *         description: Data laporan farmasi
 */
router.get('/pharmacy', checkAnyPermission('dashboard:read', 'report:read'), controller.pharmacy)

/**
 * @openapi
 * /dashboard/bed-occupancy:
 *   get:
 *     tags: [Dashboard]
 *     summary: Okupansi kamar rawat inap (BOR, LOS, per ruangan)
 *     responses:
 *       200:
 *         description: Data okupansi kamar
 */
router.get('/bed-occupancy', checkAnyPermission('dashboard:read'), controller.bedOccupancy)

/**
 * @openapi
 * /dashboard/export:
 *   get:
 *     tags: [Dashboard]
 *     summary: Export laporan ke file (CSV, Excel, PDF)
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [visits, revenue, pharmacy, diagnoses, patients, billing] }
 *         description: Jenis laporan
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [csv, xlsx, pdf], default: csv }
 *         description: Format file output
 *     responses:
 *       200:
 *         description: File laporan (download)
 *         content:
 *           text/csv: {}
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 *           application/pdf: {}
 */
router.get('/export', checkAnyPermission('report:read'), controller.exportReport)

export { router as dashboardRoutes }
