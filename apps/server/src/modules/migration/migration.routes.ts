import { Router } from 'express'
import { MigrationController } from './migration.controller'
import { MigrationService } from './migration.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new MigrationService(db)
const controller = new MigrationController(service)

export const migrationRouter = Router()
migrationRouter.use(authenticate)
migrationRouter.use(checkAnyPermission('tenant:manage', 'settings:manage'))

/** @openapi
 * /migration/test-connection:
 *   post:
 *     tags: [Migration]
 *     summary: Test koneksi ke database Khanza (MySQL)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [host, port, database, user, password]
 *             properties:
 *               host: { type: string }
 *               port: { type: integer, default: 3306 }
 *               database: { type: string }
 *               user: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Koneksi berhasil + info versi MySQL
 */
migrationRouter.post('/test-connection', controller.testConnection)

/** @openapi
 * /migration/analyze:
 *   post:
 *     tags: [Migration]
 *     summary: Analisis database Khanza (jumlah tabel, baris, ukuran)
 *     responses:
 *       200:
 *         description: Hasil analisis (jumlah pasien, obat, kunjungan yg bisa dimigrasikan)
 */
migrationRouter.post('/analyze', controller.analyze)

/** @openapi
 * /migration/start:
 *   post:
 *     tags: [Migration]
 *     summary: Mulai migrasi data Khanza → SIMRS (batch, dengan progress tracking)
 *     responses:
 *       200:
 *         description: Session migrasi dimulai
 */
migrationRouter.post('/start', controller.startMigration)

/** @openapi
 * /migration/progress/{sessionId}:
 *   get:
 *     tags: [Migration]
 *     summary: Cek progress migrasi
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Persentase progress + status per tabel
 */
migrationRouter.get('/progress/:sessionId', controller.getProgress)

/** @openapi
 * /migration/verify:
 *   post:
 *     tags: [Migration]
 *     summary: Verifikasi hasil migrasi (row count comparison + sample check)
 *     responses:
 *       200:
 *         description: Laporan verifikasi migrasi
 */
migrationRouter.post('/verify', controller.verify)
