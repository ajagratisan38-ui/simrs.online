import { Router } from 'express'
import { MedicalRecordController } from './medical-record.controller'
import { MedicalRecordService } from './medical-record.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const router = Router()

const service = new MedicalRecordService(db)
const controller = new MedicalRecordController(service)

router.use(authenticate)

/** @openapi
 * /medical-records/{visitId}:
 *   post:
 *     tags: [Medical Records]
 *     summary: Buat rekam medis baru (SOAP, diagnosa, tindakan, resep)
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subjective: { type: string }
 *               objective: { type: string }
 *               assessment: { type: string }
 *               plan: { type: string }
 *               diagnoses: { type: array, items: { type: object, properties: { icd10_code: { type: string }, description: { type: string }, is_primary: { type: boolean } } } }
 *               procedures: { type: array, items: { type: object } }
 *               prescriptions: { type: array, items: { type: object } }
 *     responses:
 *       201:
 *         description: Rekam medis berhasil dibuat
 *   get:
 *     tags: [Medical Records]
 *     summary: Detail rekam medis berdasarkan kunjungan
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data rekam medis + diagnosa + resep
 */
router.post('/:visitId', checkPermission('medical-record:create'), controller.create)
router.get('/:visitId', checkAnyPermission('medical-record:read', 'medical-record:create'), controller.getByVisit)

/** @openapi
 * /medical-records/{id}:
 *   put:
 *     tags: [Medical Records]
 *     summary: Update rekam medis (hanya status draft)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Rekam medis berhasil diupdate
 */
/** @openapi
 * /medical-records/{visitId}/resume:
 *   get:
 *     tags: [Medical Records]
 *     summary: Resume medis lengkap per kunjungan (untuk cetak)
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data resume medis lengkap (pasien, RS, SOAP, diagnosa, tindakan, resep)
 */
router.get('/:visitId/resume', checkAnyPermission('medical-record:read', 'medical-record:create'), controller.getResumeMedis)

router.put('/:id', checkPermission('medical-record:update'), controller.update)

/** @openapi
 * /medical-records/{id}/finalize:
 *   put:
 *     tags: [Medical Records]
 *     summary: Finalisasi rekam medis (lock permanen, tidak bisa diubah)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Rekam medis berhasil difinalisasi
 */
router.put('/:id/finalize', checkPermission('medical-record:finalize'), controller.finalize)

export default router

export const icd10Router = Router()
icd10Router.use(authenticate)

/** @openapi
 * /icd10/search:
 *   get:
 *     tags: [Medical Records]
 *     summary: Cari kode ICD-10 (diagnosa)
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Kata kunci pencarian (kode atau nama penyakit)
 *     responses:
 *       200:
 *         description: Daftar kode ICD-10 yang cocok
 */
icd10Router.get('/search', checkAnyPermission('medical-record:read', 'medical-record:create'), controller.searchIcd10)

export const icd9cmRouter = Router()
icd9cmRouter.use(authenticate)

/** @openapi
 * /icd9cm/search:
 *   get:
 *     tags: [Medical Records]
 *     summary: Cari kode ICD-9-CM (prosedur/tindakan)
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Daftar kode ICD-9-CM yang cocok
 */
icd9cmRouter.get('/search', checkAnyPermission('medical-record:read', 'medical-record:create'), controller.searchIcd9cm)

/** @openapi
 * /icd9cm/categories:
 *   get:
 *     tags: [Medical Records]
 *     summary: Daftar kategori ICD-9-CM
 *     responses:
 *       200:
 *         description: Daftar kategori prosedur
 */
icd9cmRouter.get('/categories', checkAnyPermission('medical-record:read', 'medical-record:create'), controller.getIcd9cmCategories)

export const templateRouter = Router()
templateRouter.use(authenticate)

/** @openapi
 * /medical-templates:
 *   get:
 *     tags: [Medical Records]
 *     summary: Daftar template rekam medis (SOAP)
 *     responses:
 *       200:
 *         description: Daftar template
 *   post:
 *     tags: [Medical Records]
 *     summary: Buat template rekam medis baru
 *     responses:
 *       201:
 *         description: Template berhasil dibuat
 */
templateRouter.get('/', checkAnyPermission('medical-record:read', 'medical-record:create'), controller.listTemplates)
templateRouter.post('/', checkPermission('medical-record:create'), controller.createTemplate)

export const patientMedicalRecordRouter = Router({ mergeParams: true })
patientMedicalRecordRouter.use(authenticate)

/** @openapi
 * /patients/{patientId}/medical-records:
 *   get:
 *     tags: [Medical Records]
 *     summary: Riwayat rekam medis pasien
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Daftar rekam medis historis
 */
patientMedicalRecordRouter.get('/', checkAnyPermission('medical-record:read', 'patient:read'), controller.getPatientHistory)
