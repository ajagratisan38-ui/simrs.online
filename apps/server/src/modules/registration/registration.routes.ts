import { Router } from 'express'
import { RegistrationController } from './registration.controller'
import { RegistrationService } from './registration.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const router = Router()

const registrationService = new RegistrationService(db)
const controller = new RegistrationController(registrationService)

router.use(authenticate)

/** @openapi
 * /visits/stats/daily:
 *   get:
 *     tags: [Visits]
 *     summary: Statistik harian kunjungan (per poli, per penjamin, per status)
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Statistik harian
 */
router.get('/stats/daily', checkPermission('dashboard:read'), controller.getDailyStats)

/** @openapi
 * /visits:
 *   get:
 *     tags: [Visits]
 *     summary: Daftar kunjungan (filter tanggal, status, tipe, poli, dokter)
 *     parameters:
 *       - in: query
 *         name: tanggal
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [menunggu, diperiksa, selesai, batal, rawat_inap, pulang] }
 *       - in: query
 *         name: tipe
 *         schema: { type: string, enum: [rawat_jalan, igd, rawat_inap] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Daftar kunjungan
 *   post:
 *     tags: [Visits]
 *     summary: Daftar kunjungan baru (auto-generate nomor antrian)
 *     description: Validasi bisnis Khanza — blokir duplikasi, cek rawat inap aktif, cek ketersediaan dokter
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, tipe, room_id, doctor_id, penjamin]
 *             properties:
 *               patient_id: { type: string, format: uuid }
 *               tipe: { type: string, enum: [rawat_jalan, igd, rawat_inap] }
 *               room_id: { type: string, format: uuid }
 *               doctor_id: { type: string, format: uuid }
 *               keluhan_utama: { type: string }
 *               penjamin: { type: string, enum: [umum, bpjs, asuransi, perusahaan] }
 *     responses:
 *       201:
 *         description: Kunjungan berhasil didaftarkan + nomor antrian
 */
router.get('/', checkAnyPermission('registration:read', 'patient:read'), controller.listVisits)
router.post('/', checkPermission('registration:create'), controller.createVisit)

// Queues — MUST be before /:id to avoid catch-all
router.get('/queues', checkAnyPermission('queue:manage', 'registration:read'), controller.getAllQueues)
router.get('/queues/:roomId', checkAnyPermission('queue:manage', 'registration:read'), controller.getQueue)
router.post('/queues/:roomId/call-next', checkPermission('queue:manage'), controller.callNext)

/** @openapi
 * /visits/{id}:
 *   get:
 *     tags: [Visits]
 *     summary: Detail kunjungan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data kunjungan lengkap
 */
router.get('/:id', checkAnyPermission('registration:read', 'patient:read'), controller.getVisit)

/** @openapi
 * /visits/{id}/status:
 *   put:
 *     tags: [Visits]
 *     summary: Update status kunjungan
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [menunggu, diperiksa, selesai, batal, rawat_inap, pulang] }
 *     responses:
 *       200:
 *         description: Status berhasil diupdate
 */
router.put('/:id/status', checkAnyPermission('registration:update', 'medical-record:create'), controller.updateStatus)

/** @openapi
 * /visits/{id}:
 *   delete:
 *     tags: [Visits]
 *     summary: Batalkan kunjungan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Kunjungan dibatalkan
 */
router.delete('/:id', checkPermission('registration:cancel'), controller.cancelVisit)

export default router
