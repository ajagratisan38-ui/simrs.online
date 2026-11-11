import { Router } from 'express'
import { LaboratoryController } from './laboratory.controller'
import { LaboratoryService } from './laboratory.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new LaboratoryService(db)
const controller = new LaboratoryController(service)

export const labOrderRouter = Router()
labOrderRouter.use(authenticate)

/** @openapi
 * /lab-orders/stats:
 *   get:
 *     tags: [Laboratory]
 *     summary: Statistik lab hari ini (pending, in-progress, completed)
 *     responses:
 *       200:
 *         description: Statistik antrian lab
 */
labOrderRouter.get('/stats', checkAnyPermission('lab-order:read', 'lab-result:read'), controller.getStats)

/** @openapi
 * /lab-orders:
 *   get:
 *     tags: [Laboratory]
 *     summary: Antrian order lab (filter status, prioritas, tanggal)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ordered, sample_received, processing, completed, cancelled] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [normal, cito] }
 *     responses:
 *       200:
 *         description: Daftar order lab
 *   post:
 *     tags: [Laboratory]
 *     summary: Buat order lab baru (dari dokter ke laboratorium)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visit_id, items]
 *             properties:
 *               visit_id: { type: string, format: uuid }
 *               priority: { type: string, enum: [normal, cito], default: normal }
 *               clinical_notes: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     parameter_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Order lab berhasil dibuat
 */
labOrderRouter.get('/', checkAnyPermission('lab-order:read', 'lab-result:read'), controller.listOrders)
labOrderRouter.post('/', checkAnyPermission('medical-record:create', 'medical-record:update'), controller.createOrder)

/** @openapi
 * /lab-orders/{id}:
 *   get:
 *     tags: [Laboratory]
 *     summary: Detail order lab + item hasil
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data order lab lengkap
 */
labOrderRouter.get('/:id', checkAnyPermission('lab-order:read', 'lab-result:read'), controller.getOrder)

/** @openapi
 * /lab-orders/{id}/receive:
 *   post:
 *     tags: [Laboratory]
 *     summary: Terima sampel di laboratorium
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Sampel diterima
 */
labOrderRouter.post('/:id/receive', checkPermission('lab-result:create'), controller.receiveSample)

/** @openapi
 * /lab-orders/{id}/process:
 *   post:
 *     tags: [Laboratory]
 *     summary: Mulai proses pemeriksaan lab
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pemeriksaan dimulai
 */
labOrderRouter.post('/:id/process', checkPermission('lab-result:create'), controller.startProcessing)

/** @openapi
 * /lab-orders/{id}/results:
 *   post:
 *     tags: [Laboratory]
 *     summary: Input hasil pemeriksaan lab
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Hasil berhasil diinput
 */
labOrderRouter.post('/:id/results', checkPermission('lab-result:create'), controller.inputResults)

/** @openapi
 * /lab-orders/{id}/finalize:
 *   post:
 *     tags: [Laboratory]
 *     summary: Finalisasi hasil lab (lock permanen)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Hasil lab difinalisasi
 */
labOrderRouter.post('/:id/finalize', checkPermission('lab-result:create'), controller.finalizeOrder)

/** @openapi
 * /lab-orders/{id}/cancel:
 *   post:
 *     tags: [Laboratory]
 *     summary: Batalkan order lab
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order dibatalkan
 */
labOrderRouter.post('/:id/cancel', checkAnyPermission('lab-result:create', 'medical-record:update'), controller.cancelOrder)

/** @openapi
 * /lab-orders/visit/{visitId}:
 *   get:
 *     tags: [Laboratory]
 *     summary: Hasil lab per kunjungan (tampilan dokter)
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Daftar order lab kunjungan tersebut
 */
labOrderRouter.get('/visit/:visitId', checkAnyPermission('lab-order:read', 'lab-result:read', 'medical-record:read'), controller.getResultsByVisit)

/** @openapi
 * /lab-orders/patient/{patientId}:
 *   get:
 *     tags: [Laboratory]
 *     summary: Riwayat lab pasien
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Riwayat pemeriksaan lab
 */
labOrderRouter.get('/patient/:patientId', checkAnyPermission('lab-order:read', 'lab-result:read', 'medical-record:read'), controller.getPatientHistory)

export const labParamRouter = Router()
labParamRouter.use(authenticate)

/** @openapi
 * /lab-parameters/search:
 *   get:
 *     tags: [Laboratory]
 *     summary: Cari parameter lab (Hb, WBC, dll)
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Daftar parameter lab yang cocok
 */
labParamRouter.get('/search', checkAnyPermission('lab-order:read', 'lab-result:read', 'medical-record:create'), controller.searchParams)

/** @openapi
 * /lab-parameters/categories:
 *   get:
 *     tags: [Laboratory]
 *     summary: Daftar kategori parameter lab (Hematologi, Kimia Klinik, dll)
 *     responses:
 *       200:
 *         description: Daftar kategori
 */
labParamRouter.get('/categories', checkAnyPermission('lab-order:read', 'lab-result:read', 'medical-record:create'), controller.getCategories)
