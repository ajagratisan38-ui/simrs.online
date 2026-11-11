import { Router } from 'express'
import { RadiologyController } from './radiology.controller'
import { RadiologyService } from './radiology.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new RadiologyService(db)
const controller = new RadiologyController(service)

export const radiologyOrderRouter = Router()
radiologyOrderRouter.use(authenticate)

/** @openapi
 * /radiology-orders/stats:
 *   get:
 *     tags: [Radiology]
 *     summary: Statistik radiologi hari ini
 *     responses:
 *       200:
 *         description: Jumlah antrian per status
 */
radiologyOrderRouter.get('/stats', checkAnyPermission('radiology-order:read', 'radiology-result:read'), controller.getStats)

/** @openapi
 * /radiology-orders:
 *   get:
 *     tags: [Radiology]
 *     summary: Antrian order radiologi (filter status, modalitas)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ordered, scheduled, processing, completed, cancelled] }
 *       - in: query
 *         name: modality
 *         schema: { type: string, enum: [x-ray, usg, ct-scan, mri, mammography, panoramic] }
 *     responses:
 *       200:
 *         description: Daftar order radiologi
 *   post:
 *     tags: [Radiology]
 *     summary: Buat order radiologi baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visit_id, examination_id]
 *             properties:
 *               visit_id: { type: string, format: uuid }
 *               examination_id: { type: string, format: uuid }
 *               clinical_notes: { type: string }
 *               priority: { type: string, enum: [normal, cito] }
 *     responses:
 *       201:
 *         description: Order radiologi berhasil dibuat
 */
radiologyOrderRouter.get('/', checkAnyPermission('radiology-order:read', 'radiology-result:read'), controller.listOrders)
radiologyOrderRouter.post('/', checkAnyPermission('medical-record:create', 'medical-record:update'), controller.createOrder)

/** @openapi
 * /radiology-orders/{id}:
 *   get:
 *     tags: [Radiology]
 *     summary: Detail order radiologi + bacaan + kesan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data order radiologi lengkap
 */
radiologyOrderRouter.get('/:id', checkAnyPermission('radiology-order:read', 'radiology-result:read'), controller.getOrder)

/** @openapi
 * /radiology-orders/{id}/schedule:
 *   post:
 *     tags: [Radiology]
 *     summary: Jadwalkan pemeriksaan radiologi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Jadwal berhasil diset
 */
radiologyOrderRouter.post('/:id/schedule', checkPermission('radiology-result:create'), controller.scheduleOrder)

/** @openapi
 * /radiology-orders/{id}/process:
 *   post:
 *     tags: [Radiology]
 *     summary: Mulai proses pemeriksaan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pemeriksaan dimulai
 */
radiologyOrderRouter.post('/:id/process', checkPermission('radiology-result:create'), controller.startProcessing)

/** @openapi
 * /radiology-orders/{id}/results:
 *   post:
 *     tags: [Radiology]
 *     summary: Input bacaan + kesan radiologi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Hasil radiologi berhasil diinput
 */
radiologyOrderRouter.post('/:id/results', checkPermission('radiology-result:create'), controller.inputResults)

/** @openapi
 * /radiology-orders/{id}/cancel:
 *   post:
 *     tags: [Radiology]
 *     summary: Batalkan order radiologi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order dibatalkan
 */
radiologyOrderRouter.post('/:id/cancel', checkAnyPermission('radiology-result:create', 'medical-record:update'), controller.cancelOrder)

/** @openapi
 * /radiology-orders/visit/{visitId}:
 *   get:
 *     tags: [Radiology]
 *     summary: Hasil radiologi per kunjungan
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Daftar order radiologi kunjungan
 */
radiologyOrderRouter.get('/visit/:visitId', checkAnyPermission('radiology-order:read', 'radiology-result:read', 'medical-record:read'), controller.getResultsByVisit)

/** @openapi
 * /radiology-orders/patient/{patientId}:
 *   get:
 *     tags: [Radiology]
 *     summary: Riwayat radiologi pasien
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Riwayat pemeriksaan radiologi
 */
radiologyOrderRouter.get('/patient/:patientId', checkAnyPermission('radiology-order:read', 'radiology-result:read', 'medical-record:read'), controller.getPatientHistory)

export const radiologyExamRouter = Router()
radiologyExamRouter.use(authenticate)

/** @openapi
 * /radiology-examinations/search:
 *   get:
 *     tags: [Radiology]
 *     summary: Cari jenis pemeriksaan radiologi
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Daftar jenis pemeriksaan yang cocok
 */
radiologyExamRouter.get('/search', checkAnyPermission('radiology-order:read', 'radiology-result:read', 'medical-record:create'), controller.searchExaminations)

/** @openapi
 * /radiology-examinations/modalities:
 *   get:
 *     tags: [Radiology]
 *     summary: Daftar modalitas radiologi (X-Ray, USG, CT, MRI, dll)
 *     responses:
 *       200:
 *         description: Daftar modalitas
 */
radiologyExamRouter.get('/modalities', checkAnyPermission('radiology-order:read', 'radiology-result:read', 'medical-record:create'), controller.getModalities)
