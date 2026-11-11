import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { BpjsService } from './bpjs.service'
import { BpjsController } from './bpjs.controller'

const bpjsService = new BpjsService(db)
const bpjsController = new BpjsController(bpjsService)

const router = Router()

router.use(authenticate)

/** @openapi
 * /bpjs/peserta/{noBpjs}:
 *   get:
 *     tags: [BPJS]
 *     summary: Cek data peserta BPJS by nomor kartu
 *     parameters:
 *       - in: path
 *         name: noBpjs
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Data peserta BPJS (nama, kelas, status aktif, faskes)
 */
router.get('/peserta/:noBpjs', checkAnyPermission('registration:create', 'patient:read'), bpjsController.getPeserta)

/** @openapi
 * /bpjs/peserta/nik/{nik}:
 *   get:
 *     tags: [BPJS]
 *     summary: Cek data peserta BPJS by NIK
 *     parameters:
 *       - in: path
 *         name: nik
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Data peserta BPJS
 */
router.get('/peserta/nik/:nik', checkAnyPermission('registration:create', 'patient:read'), bpjsController.getPesertaByNik)

/** @openapi
 * /bpjs/sep:
 *   post:
 *     tags: [BPJS]
 *     summary: Buat SEP (Surat Elegibilitas Peserta)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [noKartu, tglSep, ppkPelayanan, jnsPelayanan, klsRawat, diagAwal, poliTujuan]
 *             properties:
 *               noKartu: { type: string }
 *               tglSep: { type: string, format: date }
 *               ppkPelayanan: { type: string }
 *               jnsPelayanan: { type: string, enum: ['1', '2'] }
 *               klsRawat: { type: string }
 *               diagAwal: { type: string }
 *               poliTujuan: { type: string }
 *     responses:
 *       201:
 *         description: SEP berhasil dibuat
 *   put:
 *     tags: [BPJS]
 *     summary: Update SEP
 *     responses:
 *       200:
 *         description: SEP berhasil diupdate
 */
// SEP Quota
router.get('/sep-quota', checkAnyPermission('registration:create', 'registration:read'), bpjsController.getSepQuota)
router.get('/sep-quota/check', checkAnyPermission('registration:create'), bpjsController.checkSepQuota)

router.post('/sep', checkAnyPermission('registration:create'), bpjsController.createSEP)
router.put('/sep', checkAnyPermission('registration:create'), bpjsController.updateSEP)

/** @openapi
 * /bpjs/sep/{noSEP}:
 *   delete:
 *     tags: [BPJS]
 *     summary: Hapus SEP
 *     parameters:
 *       - in: path
 *         name: noSEP
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: SEP berhasil dihapus
 *   get:
 *     tags: [BPJS]
 *     summary: Detail SEP
 *     parameters:
 *       - in: path
 *         name: noSEP
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Data SEP
 */
router.delete('/sep/:noSEP', checkAnyPermission('registration:create'), bpjsController.deleteSEP)
router.get('/sep/:noSEP', checkAnyPermission('registration:create', 'billing:read'), bpjsController.getSEP)

/** @openapi
 * /bpjs/rujukan/{noKartu}:
 *   get:
 *     tags: [BPJS]
 *     summary: Daftar rujukan FKTP peserta
 *     parameters:
 *       - in: path
 *         name: noKartu
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Data rujukan
 */
router.get('/rujukan/:noKartu', checkAnyPermission('registration:create'), bpjsController.getRujukan)

/** @openapi
 * /bpjs/referensi/poli:
 *   get:
 *     tags: [BPJS]
 *     summary: Cari referensi poli BPJS
 *     parameters:
 *       - in: query
 *         name: nama
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Daftar poli BPJS
 */
router.get('/referensi/poli', checkAnyPermission('registration:create'), bpjsController.searchPoli)

/** @openapi
 * /bpjs/referensi/diagnosa:
 *   get:
 *     tags: [BPJS]
 *     summary: Cari referensi diagnosa BPJS
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Daftar diagnosa BPJS
 */
router.get('/referensi/diagnosa', checkAnyPermission('registration:create', 'medical-record:create'), bpjsController.searchDiagnosa)

/** @openapi
 * /bpjs/fingerprint/{noKartu}:
 *   get:
 *     tags: [BPJS]
 *     summary: Cek status verifikasi sidik jari peserta (wajib ≥17 tahun, non-IGD)
 *     parameters:
 *       - in: path
 *         name: noKartu
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status fingerprint
 */
router.get('/fingerprint/:noKartu', checkAnyPermission('registration:create'), bpjsController.checkFingerprint)

// --- Referensi Lanjutan ---
router.get('/referensi/prosedur', checkAnyPermission('registration:create', 'medical-record:create'), bpjsController.searchProsedur)
router.get('/referensi/faskes', checkAnyPermission('registration:create'), bpjsController.searchFaskes)
router.get('/referensi/dokter', checkAnyPermission('registration:create'), bpjsController.searchDokter)
router.get('/referensi/spesialistik', checkAnyPermission('registration:create'), bpjsController.getSpesialistik)

// --- Monitoring ---
router.get('/monitoring/kunjungan/:tahun/:bulan', checkAnyPermission('dashboard:read'), bpjsController.getKunjunganBulanan)

// --- PCare ---
router.post('/pcare/pendaftaran', checkAnyPermission('registration:create'), bpjsController.pcareCreatePendaftaran)
router.delete('/pcare/pendaftaran/:noUrut/tgl/:tglDaftar', checkAnyPermission('registration:create'), bpjsController.pcareDeletePendaftaran)
router.post('/pcare/kunjungan', checkAnyPermission('medical-record:create'), bpjsController.pcareCreateKunjungan)
router.get('/pcare/kunjungan/tanggal/:tglDaftar', checkAnyPermission('registration:read'), bpjsController.pcareGetKunjungan)
router.get('/pcare/kunjungan/riwayat/:noKartu', checkAnyPermission('registration:read', 'medical-record:read'), bpjsController.pcareGetRiwayatKunjungan)
router.get('/pcare/obat', checkAnyPermission('pharmacy:read', 'medical-record:create'), bpjsController.pcareSearchObat)

// --- e-Klaim / INACBG ---
router.post('/eklaim/grouping', checkAnyPermission('billing:create'), bpjsController.eklaimGrouping)
router.get('/eklaim/claim/:noSep', checkAnyPermission('billing:read'), bpjsController.eklaimGetClaim)
router.get('/eklaim/claims', checkAnyPermission('billing:read'), bpjsController.eklaimListClaims)
router.get('/eklaim/status/:noSep', checkAnyPermission('billing:read'), bpjsController.eklaimGetStatus)
router.delete('/eklaim/claim/:noSep', checkAnyPermission('billing:create'), bpjsController.eklaimDeleteClaim)

// --- Aplicare ---
router.get('/aplicare/bed/:ppkCode', checkAnyPermission('registration:read', 'dashboard:read'), bpjsController.aplicareBedAvailability)

// --- Antrol (Antrean Online BPJS / Mobile JKN) ---
router.get('/antrol/ref/poli', checkAnyPermission('registration:read'), bpjsController.antrolRefPoli)
router.get('/antrol/ref/dokter', checkAnyPermission('registration:read'), bpjsController.antrolRefDokter)
router.get('/antrol/jadwal/:kodePoli/:tanggal', checkAnyPermission('registration:read'), bpjsController.antrolGetJadwalDokter)
router.post('/antrol/antrean', checkAnyPermission('registration:create'), bpjsController.antrolTambahAntrean)
router.put('/antrol/antrean', checkAnyPermission('registration:create'), bpjsController.antrolUpdateAntrean)
router.put('/antrol/batal', checkAnyPermission('registration:create'), bpjsController.antrolBatalAntrean)
router.get('/antrol/tasks/:kodePoli/:tanggal', checkAnyPermission('registration:read'), bpjsController.antrolGetListTask)
router.post('/antrol/sync/:kodePoli/:tanggal', checkAnyPermission('registration:create'), bpjsController.antrolSyncTasks)
router.get('/antrol/dashboard', checkAnyPermission('dashboard:read'), bpjsController.antrolDashboard)
router.get('/antrol/bookings', checkAnyPermission('registration:read'), bpjsController.antrolGetLocalBookings)
router.put('/antrol/link/:kodebooking', checkAnyPermission('registration:create'), bpjsController.antrolLinkVisit)

export { router as bpjsRoutes }
