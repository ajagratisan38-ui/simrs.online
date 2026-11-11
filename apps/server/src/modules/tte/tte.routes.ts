import { Router } from 'express'
import { TteService } from './tte.service'
import { TteController } from './tte.controller'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new TteService(db)
const controller = new TteController(service, db)

export const tteRouter = Router()
tteRouter.use(authenticate)

// Sign permissions — nakes (dokter, perawat, apoteker) + admin
const signPermissions = checkAnyPermission(
  'medical-record:create',
  'assessment:create',
  'pharmacy:create',
  'admin:manage',
)

// Read permissions — broader access
const readPermissions = checkAnyPermission(
  'medical-record:read',
  'assessment:read',
  'patient:read',
  'admin:manage',
)

// Admin only for config
const adminOnly = checkAnyPermission('admin:manage')

/** @openapi
 * /tte/sign:
 *   post:
 *     tags: [TTE]
 *     summary: Tanda tangani dokumen secara digital
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [document_type, document_id, signature_data]
 *             properties:
 *               document_type: { type: string, enum: [medical_record, cppt, general_consent, resume_medis, resep, lab_result, radiology_result, nursing_assessment, surgery_report] }
 *               document_id: { type: string, format: uuid }
 *               signature_data: { type: string, description: 'Base64 encoded signature image' }
 *               sip_number: { type: string, description: 'Nomor SIP/STR untuk nakes' }
 *     responses:
 *       201:
 *         description: Dokumen berhasil ditandatangani
 */
tteRouter.post('/sign', signPermissions, controller.sign)

/** @openapi
 * /tte/verify/{signatureId}:
 *   get:
 *     tags: [TTE]
 *     summary: Verifikasi tanda tangan digital
 *     parameters:
 *       - in: path
 *         name: signatureId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Hasil verifikasi
 */
tteRouter.get('/verify/:signatureId', readPermissions, controller.verify)

/** @openapi
 * /tte/document/{documentType}/{documentId}:
 *   get:
 *     tags: [TTE]
 *     summary: Daftar tanda tangan pada dokumen
 */
tteRouter.get(
  '/document/:documentType/:documentId',
  readPermissions,
  controller.getDocumentSignatures,
)

/** @openapi
 * /tte/signable/{visitId}:
 *   get:
 *     tags: [TTE]
 *     summary: Dokumen yang bisa ditandatangani dalam kunjungan
 */
tteRouter.get('/signable/:visitId', signPermissions, controller.getSignableDocuments)

/** @openapi
 * /tte/stats:
 *   get:
 *     tags: [TTE]
 *     summary: Statistik TTE
 */
tteRouter.get('/stats', adminOnly, controller.getStats)

/** @openapi
 * /tte/config:
 *   get:
 *     tags: [TTE]
 *     summary: Konfigurasi TTE saat ini
 */
tteRouter.get('/config', adminOnly, controller.getConfig)

/** @openapi
 * /tte/config:
 *   put:
 *     tags: [TTE]
 *     summary: Update konfigurasi TTE
 */
tteRouter.put('/config', adminOnly, controller.updateConfig)

/** @openapi
 * /tte/{id}:
 *   get:
 *     tags: [TTE]
 *     summary: Detail tanda tangan digital
 */
tteRouter.get('/:id', readPermissions, controller.getById)
