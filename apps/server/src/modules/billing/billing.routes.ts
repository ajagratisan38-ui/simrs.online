import { Router } from 'express'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new BillingService(db)
const controller = new BillingController(service)

const router = Router()
router.use(authenticate)

/** @openapi
 * /bills/outstanding:
 *   get:
 *     tags: [Billing]
 *     summary: Daftar tagihan belum lunas
 *     responses:
 *       200:
 *         description: Daftar tagihan outstanding
 */
router.get('/outstanding', checkAnyPermission('billing:read', 'billing:manage'), controller.outstanding)

/** @openapi
 * /bills/patient/{patientId}:
 *   get:
 *     tags: [Billing]
 *     summary: Riwayat billing pasien (semua tagihan dari semua kunjungan)
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Daftar tagihan pasien beserta ringkasan pembayaran
 */
router.get('/patient/:patientId', checkAnyPermission('billing:read', 'billing:manage'), controller.patientBills)

/** @openapi
 * /bills/summary/daily:
 *   get:
 *     tags: [Billing]
 *     summary: Ringkasan pembayaran harian (total per metode)
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Ringkasan kasir harian
 */
router.get('/summary/daily', checkAnyPermission('billing:read', 'billing:manage', 'dashboard:read'), controller.dailySummary)

/** @openapi
 * /bills/{visitId}/generate:
 *   post:
 *     tags: [Billing]
 *     summary: Generate tagihan dari kunjungan (konsultasi + tindakan + obat + kamar)
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Tagihan berhasil dibuat
 */
router.post('/:visitId/generate', checkPermission('billing:manage'), controller.generateBill)

/** @openapi
 * /bills/{visitId}:
 *   get:
 *     tags: [Billing]
 *     summary: Detail tagihan kunjungan (rincian biaya per kategori)
 *     parameters:
 *       - in: path
 *         name: visitId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data tagihan + item rincian
 */
router.get('/:visitId', checkAnyPermission('billing:read', 'billing:manage'), controller.getBill)

/** @openapi
 * /bills/{id}/discount:
 *   put:
 *     tags: [Billing]
 *     summary: Terapkan diskon ke tagihan
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
 *               discountAmount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Diskon berhasil diterapkan
 */
router.put('/:id/discount', checkPermission('billing:manage'), controller.applyDiscount)

/** @openapi
 * /bills/{id}/finalize:
 *   put:
 *     tags: [Billing]
 *     summary: Finalisasi tagihan (lock — tidak bisa diubah lagi)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Tagihan berhasil difinalisasi
 */
router.put('/:id/finalize', checkPermission('billing:manage'), controller.finalizeBill)

/** @openapi
 * /bills/{id}/pay:
 *   post:
 *     tags: [Billing]
 *     summary: Proses pembayaran
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
 *             required: [metode, jumlah]
 *             properties:
 *               metode: { type: string, enum: [tunai, debit, kredit, transfer, bpjs, asuransi] }
 *               jumlah: { type: number, description: Jumlah dibayar }
 *               referensi_pembayaran: { type: string }
 *     responses:
 *       200:
 *         description: Pembayaran berhasil (termasuk data kembalian)
 */
router.post('/:id/pay', checkPermission('billing:manage'), controller.processPayment)

export default router
