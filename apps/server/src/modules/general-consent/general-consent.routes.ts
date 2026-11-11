import { Router } from 'express'
import { GeneralConsentController } from './general-consent.controller'
import { GeneralConsentService } from './general-consent.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new GeneralConsentService(db)
const controller = new GeneralConsentController(service)

export const generalConsentRouter = Router()

generalConsentRouter.use(authenticate)

/** @openapi
 * /general-consents:
 *   post:
 *     tags: [GeneralConsent]
 *     summary: Buat general consent baru untuk pasien
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, persetujuan_rawat, persetujuan_informasi, persetujuan_privasi, persetujuan_biaya, persetujuan_tata_tertib, persetujuan_pelepasan_info]
 *             properties:
 *               patient_id: { type: string, format: uuid }
 *               visit_id: { type: string, format: uuid }
 *               persetujuan_rawat: { type: boolean }
 *               persetujuan_informasi: { type: boolean }
 *               persetujuan_privasi: { type: boolean }
 *               persetujuan_biaya: { type: boolean }
 *               persetujuan_tata_tertib: { type: boolean }
 *               persetujuan_pelepasan_info: { type: boolean }
 *               penanggung_jawab_nama: { type: string }
 *               penanggung_jawab_hubungan: { type: string }
 *               signed_by: { type: string }
 *     responses:
 *       201:
 *         description: General consent berhasil dibuat
 */
generalConsentRouter.post(
  '/',
  checkAnyPermission('registration:create', 'patient:create'),
  controller.create,
)

/** @openapi
 * /general-consents/{id}:
 *   get:
 *     tags: [GeneralConsent]
 *     summary: Detail general consent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data general consent + data pasien
 */
generalConsentRouter.get(
  '/:id',
  checkAnyPermission('registration:read', 'patient:read'),
  controller.getById,
)

/** @openapi
 * /general-consents/patient/{patientId}:
 *   get:
 *     tags: [GeneralConsent]
 *     summary: Daftar general consent per pasien
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Daftar general consent
 */
generalConsentRouter.get(
  '/patient/:patientId',
  checkAnyPermission('registration:read', 'patient:read'),
  controller.listByPatient,
)

/** @openapi
 * /general-consents/visit/{visitId}:
 *   get:
 *     tags: [GeneralConsent]
 *     summary: General consent untuk kunjungan tertentu
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data general consent (null jika belum ada)
 */
generalConsentRouter.get(
  '/visit/:visitId',
  checkAnyPermission('registration:read', 'patient:read'),
  controller.getByVisit,
)
