import { Router } from 'express'
import { EducationService } from './education.service'
import { EducationController } from './education.controller'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new EducationService(db)
const controller = new EducationController(service)

export const educationRouter = Router()
educationRouter.use(authenticate)

const readPermissions = checkAnyPermission(
  'medical-record:read',
  'medical-record:create',
  'registration:read',
)

const writePermissions = checkAnyPermission(
  'medical-record:create',
  'assessment:create',
)

const adminPermissions = checkAnyPermission(
  'admin:manage',
)

// =====================================================
// TOPICS (Master Data)
// =====================================================

/** @openapi
 * /education/topics:
 *   get:
 *     tags: [Education]
 *     summary: Daftar topik edukasi (master data)
 *     parameters:
 *       - in: query
 *         name: kategori
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Daftar topik edukasi
 */
educationRouter.get('/topics', readPermissions, controller.listTopics)

/** @openapi
 * /education/topics/categories:
 *   get:
 *     tags: [Education]
 *     summary: Daftar kategori topik edukasi dengan jumlah
 *     responses:
 *       200:
 *         description: Kategori dan jumlah topik
 */
educationRouter.get('/topics/categories', readPermissions, controller.getTopicCategories)

/** @openapi
 * /education/topics/{id}:
 *   get:
 *     tags: [Education]
 *     summary: Detail topik edukasi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detail topik edukasi
 */
educationRouter.get('/topics/:id', readPermissions, controller.getTopic)

/** @openapi
 * /education/topics:
 *   post:
 *     tags: [Education]
 *     summary: Tambah topik edukasi baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [kode, nama, kategori]
 *             properties:
 *               kode: { type: string }
 *               nama: { type: string }
 *               kategori: { type: string }
 *               deskripsi: { type: string }
 *               materi: { type: string }
 *     responses:
 *       201:
 *         description: Topik edukasi berhasil dibuat
 */
educationRouter.post('/topics', adminPermissions, controller.createTopic)

/** @openapi
 * /education/topics/{id}:
 *   put:
 *     tags: [Education]
 *     summary: Update topik edukasi
 */
educationRouter.put('/topics/:id', adminPermissions, controller.updateTopic)

/** @openapi
 * /education/topics/{id}:
 *   delete:
 *     tags: [Education]
 *     summary: Hapus topik edukasi (hanya jika belum digunakan)
 */
educationRouter.delete('/topics/:id', adminPermissions, controller.deleteTopic)

// =====================================================
// RECORDS
// =====================================================

/** @openapi
 * /education/records:
 *   post:
 *     tags: [Education]
 *     summary: Buat catatan edukasi baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visit_id, kategori, materi_diberikan, metode, sasaran, evaluasi_pemahaman]
 *             properties:
 *               visit_id: { type: string, format: uuid }
 *               topic_id: { type: string, format: uuid }
 *               topik_manual: { type: string }
 *               kategori: { type: string }
 *               materi_diberikan: { type: string }
 *               metode: { type: array, items: { type: string } }
 *               bahasa: { type: string }
 *               sasaran: { type: string }
 *               nama_sasaran: { type: string }
 *               hubungan_sasaran: { type: string }
 *               evaluasi_pemahaman: { type: string }
 *               evaluasi_catatan: { type: string }
 *               catatan: { type: string }
 *               status: { type: string }
 *     responses:
 *       201:
 *         description: Catatan edukasi berhasil dibuat
 */
educationRouter.post('/records', writePermissions, controller.createRecord)

/** @openapi
 * /education/records/pending-reeducation:
 *   get:
 *     tags: [Education]
 *     summary: Daftar edukasi yang perlu re-edukasi
 *     responses:
 *       200:
 *         description: Daftar pending re-edukasi
 */
educationRouter.get('/records/pending-reeducation', readPermissions, controller.listPendingReeducation)

/** @openapi
 * /education/records/visit/{visitId}:
 *   get:
 *     tags: [Education]
 *     summary: Daftar edukasi per kunjungan
 */
educationRouter.get('/records/visit/:visitId', readPermissions, controller.listByVisit)

/** @openapi
 * /education/records/patient/{patientId}:
 *   get:
 *     tags: [Education]
 *     summary: Riwayat edukasi seluruh kunjungan pasien
 */
educationRouter.get('/records/patient/:patientId', readPermissions, controller.listByPatient)

/** @openapi
 * /education/records/{id}:
 *   get:
 *     tags: [Education]
 *     summary: Detail catatan edukasi
 */
educationRouter.get('/records/:id', readPermissions, controller.getRecord)

/** @openapi
 * /education/records/{id}:
 *   put:
 *     tags: [Education]
 *     summary: Update catatan edukasi (jika belum diverifikasi)
 */
educationRouter.put('/records/:id', writePermissions, controller.updateRecord)

/** @openapi
 * /education/records/{id}:
 *   delete:
 *     tags: [Education]
 *     summary: Hapus catatan edukasi (hanya draft)
 */
educationRouter.delete('/records/:id', writePermissions, controller.deleteRecord)

/** @openapi
 * /education/records/{id}/verify:
 *   put:
 *     tags: [Education]
 *     summary: Verifikasi catatan edukasi dengan tanda tangan pasien
 */
educationRouter.put('/records/:id/verify', writePermissions, controller.verifyRecord)

/** @openapi
 * /education/records/{id}/reeducation:
 *   put:
 *     tags: [Education]
 *     summary: Jadwalkan re-edukasi
 */
educationRouter.put('/records/:id/reeducation', writePermissions, controller.scheduleReeducation)

// =====================================================
// STATS
// =====================================================

/** @openapi
 * /education/stats:
 *   get:
 *     tags: [Education]
 *     summary: Statistik edukasi keseluruhan
 */
educationRouter.get('/stats', readPermissions, controller.getStats)

/** @openapi
 * /education/stats/visit/{visitId}:
 *   get:
 *     tags: [Education]
 *     summary: Statistik edukasi per kunjungan
 */
educationRouter.get('/stats/visit/:visitId', readPermissions, controller.getStatsByVisit)
