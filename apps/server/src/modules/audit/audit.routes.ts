import { Router } from 'express'
import { AuditController } from './audit.controller'
import { AuditService } from './audit.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { db } from '../../config/database'

const router = Router()

const auditService = new AuditService(db)
const auditController = new AuditController(auditService)

router.use(authenticate)
router.use(authorize('admin'))

/** @openapi
 * /audit:
 *   get:
 *     tags: [Audit]
 *     summary: Daftar audit log (siapa, kapan, apa, akses data pasien)
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Daftar log audit (UU PDP compliance)
 */
router.get('/', auditController.getLogs)

/** @openapi
 * /audit/export:
 *   get:
 *     tags: [Audit]
 *     summary: Export audit log ke CSV
 *     responses:
 *       200:
 *         description: File CSV audit log
 *         content:
 *           text/csv: {}
 */
router.get('/export', auditController.exportLogs)

/** @openapi
 * /audit/cleanup:
 *   post:
 *     tags: [Audit]
 *     summary: Cleanup audit log lama (sesuai retention policy)
 *     responses:
 *       200:
 *         description: Jumlah log yang dihapus
 */
router.post('/cleanup', auditController.cleanup)

export { router as auditRoutes }
