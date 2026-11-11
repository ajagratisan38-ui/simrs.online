import { Router } from 'express'
import { CpptService } from './cppt.service'
import { CpptController } from './cppt.controller'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new CpptService(db)
const controller = new CpptController(service)

export const cpptRouter = Router()
cpptRouter.use(authenticate)

// Dokter, perawat, apoteker, dan profesi lain bisa baca CPPT
const readPermissions = checkAnyPermission(
  'medical-record:read',
  'medical-record:create',
  'assessment:read',
  'assessment:create',
)

// Dokter, perawat, apoteker bisa tulis CPPT
const writePermissions = checkAnyPermission(
  'medical-record:create',
  'assessment:create',
)

/** @openapi
 * /cppt/visit/{visitId}:
 *   get:
 *     tags: [CPPT]
 *     summary: Daftar CPPT per kunjungan (timeline)
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: profesi
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Timeline CPPT
 */
cpptRouter.get('/visit/:visitId', readPermissions, controller.listByVisit)

/** @openapi
 * /cppt/patient/{patientId}:
 *   get:
 *     tags: [CPPT]
 *     summary: Riwayat CPPT seluruh kunjungan pasien
 */
cpptRouter.get('/patient/:patientId', readPermissions, controller.listByPatient)

/** @openapi
 * /cppt:
 *   post:
 *     tags: [CPPT]
 *     summary: Tambah entry CPPT baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visit_id]
 *             properties:
 *               visit_id: { type: string, format: uuid }
 *               subjective: { type: string }
 *               objective: { type: string }
 *               assessment: { type: string }
 *               planning: { type: string }
 *               instruksi: { type: string }
 *               evaluasi: { type: string }
 *     responses:
 *       201:
 *         description: Entry CPPT berhasil dibuat
 */
cpptRouter.post('/', writePermissions, controller.create)

/** @openapi
 * /cppt/{id}:
 *   put:
 *     tags: [CPPT]
 *     summary: Update entry CPPT (hanya pemilik, belum diverifikasi)
 */
cpptRouter.put('/:id', writePermissions, controller.update)

/** @openapi
 * /cppt/{id}/verify:
 *   put:
 *     tags: [CPPT]
 *     summary: Verifikasi entry CPPT (dokter penanggung jawab)
 */
cpptRouter.put('/:id/verify', writePermissions, controller.verify)

/** @openapi
 * /cppt/{id}:
 *   delete:
 *     tags: [CPPT]
 *     summary: Hapus entry CPPT (soft delete, hanya pemilik, belum diverifikasi)
 */
cpptRouter.delete('/:id', writePermissions, controller.delete)
