import { Router } from 'express'
import { LogbookController } from './logbook.controller'
import { LogbookService } from './logbook.service'
import { authenticate } from '../../middleware/authenticate'
import { db } from '../../config/database'

const service = new LogbookService(db)
const controller = new LogbookController(service)

export const logbookRouter = Router()

logbookRouter.use(authenticate)

/** @openapi
 * /logbook:
 *   get:
 *     tags: [Logbook]
 *     summary: Logbook tindakan dokter (riwayat rekam medis yang dibuat)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: tipe
 *         schema: { type: string, enum: [rawat_jalan, igd, rawat_inap] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Cari nama pasien atau no RM
 *     responses:
 *       200:
 *         description: Daftar logbook dokter (paginated)
 */
logbookRouter.get('/', controller.getLogbook)

/** @openapi
 * /logbook/stats:
 *   get:
 *     tags: [Logbook]
 *     summary: Statistik logbook dokter
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Total pasien, kunjungan, diagnosis, tindakan, resep
 */
logbookRouter.get('/stats', controller.getStats)
