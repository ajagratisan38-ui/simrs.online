import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { SyncService } from './sync.service'
import { SyncController } from './sync.controller'

const syncService = new SyncService(db)
const syncController = new SyncController(syncService)

const router = Router()

router.use(authenticate)

/** @openapi
 * /sync/batch:
 *   post:
 *     tags: [Sync]
 *     summary: Sinkronisasi batch dari offline ke server
 *     description: Menerima array operasi CRUD yang dilakukan saat offline, resolve konflik berdasarkan timestamp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operations]
 *             properties:
 *               operations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     table: { type: string }
 *                     operation: { type: string, enum: [create, update, delete] }
 *                     data: { type: object }
 *                     clientTimestamp: { type: number }
 *     responses:
 *       200:
 *         description: Hasil sinkronisasi (sukses, konflik, error per operasi)
 */
router.post('/batch', syncController.processBatch)

/** @openapi
 * /sync/status:
 *   get:
 *     tags: [Sync]
 *     summary: Status sinkronisasi terakhir
 *     responses:
 *       200:
 *         description: Waktu sync terakhir + jumlah pending
 */
router.get('/status', syncController.getStatus)

export { router as syncRoutes }
