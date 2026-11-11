import { Router } from 'express'
import { PatientController } from './patient.controller'
import { PatientService } from './patient.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission } from '../../middleware/check-permission'
import { authorize } from '../../middleware/authorize'
import { db } from '../../config/database'

const router = Router()

const patientService = new PatientService(db)
const patientController = new PatientController(patientService)

router.use(authenticate)

/**
 * @openapi
 * /patients:
 *   get:
 *     tags: [Patients]
 *     summary: Daftar pasien (paginated, searchable)
 *     parameters:
 *       - $ref: '#/components/parameters/TenantSlug'
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Cari by nama, NIK, no RM, atau no BPJS
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Daftar pasien
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Patient'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', checkPermission('patient:read'), patientController.list)

/**
 * @openapi
 * /patients/duplicate-check:
 *   post:
 *     tags: [Patients]
 *     summary: Cek duplikasi pasien by NIK
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nik]
 *             properties:
 *               nik:
 *                 type: string
 *                 example: '3201234567890001'
 *     responses:
 *       200:
 *         description: Hasil cek duplikasi (data pasien jika ditemukan, null jika tidak)
 */
router.post('/duplicate-check', checkPermission('patient:read'), patientController.duplicateCheck)

/**
 * @openapi
 * /patients/merge:
 *   post:
 *     tags: [Patients]
 *     summary: Gabung 2 data pasien duplikat (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [primaryId, duplicateId]
 *             properties:
 *               primaryId:
 *                 type: string
 *                 format: uuid
 *               duplicateId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Berhasil merge
 */
router.post('/merge', authorize('admin'), patientController.merge)

/**
 * @openapi
 * /patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Detail pasien + riwayat kunjungan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data pasien
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Pasien tidak ditemukan
 */
router.get('/:id', checkPermission('patient:read'), patientController.getById)

/**
 * @openapi
 * /patients:
 *   post:
 *     tags: [Patients]
 *     summary: Tambah pasien baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nik, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat]
 *             properties:
 *               nik: { type: string, minLength: 16, maxLength: 16 }
 *               nama: { type: string }
 *               tempat_lahir: { type: string }
 *               tanggal_lahir: { type: string, format: date }
 *               jenis_kelamin: { type: string, enum: [L, P] }
 *               alamat: { type: string }
 *               no_telepon: { type: string }
 *               no_bpjs: { type: string }
 *     responses:
 *       201:
 *         description: Pasien berhasil dibuat (auto-generate no_rekam_medis)
 *       409:
 *         description: NIK sudah terdaftar
 */
router.post('/', checkPermission('patient:create'), patientController.create)

/**
 * @openapi
 * /patients/{id}:
 *   put:
 *     tags: [Patients]
 *     summary: Update data pasien
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nama: { type: string }
 *               alamat: { type: string }
 *               no_telepon: { type: string }
 *     responses:
 *       200:
 *         description: Pasien berhasil diupdate
 *   delete:
 *     tags: [Patients]
 *     summary: Soft delete pasien
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pasien berhasil dihapus (soft delete)
 */
router.put('/:id', checkPermission('patient:update'), patientController.update)
router.delete('/:id', checkPermission('patient:delete'), patientController.delete)

export default router
