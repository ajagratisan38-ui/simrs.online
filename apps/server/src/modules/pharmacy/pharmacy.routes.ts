import { Router } from 'express'
import { PharmacyController } from './pharmacy.controller'
import { PharmacyService } from './pharmacy.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new PharmacyService(db)
const controller = new PharmacyController(service)

export const drugRouter = Router()
drugRouter.use(authenticate)

/** @openapi
 * /drugs/alerts/expiring:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Daftar obat mendekati kadaluarsa
 *     responses:
 *       200:
 *         description: Obat yang akan expired dalam 90 hari
 */
drugRouter.get('/alerts/expiring', checkAnyPermission('pharmacy:read', 'pharmacy:manage'), controller.expiringDrugs)

/** @openapi
 * /drugs/alerts/low-stock:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Daftar obat stok rendah (di bawah minimum)
 *     responses:
 *       200:
 *         description: Obat dengan stok di bawah batas minimum
 */
drugRouter.get('/alerts/low-stock', checkAnyPermission('pharmacy:read', 'pharmacy:manage'), controller.lowStockDrugs)

/** @openapi
 * /drugs/search:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Cari obat (by nama, kode, atau generik)
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Daftar obat yang cocok
 */
drugRouter.get('/search', checkAnyPermission('pharmacy:read', 'prescription:create', 'stock:read'), controller.searchDrugs)

/** @openapi
 * /drugs:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Daftar obat (paginated)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Daftar obat + data stok
 *   post:
 *     tags: [Pharmacy]
 *     summary: Tambah obat baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nama, satuan, harga_jual]
 *             properties:
 *               nama: { type: string }
 *               kode: { type: string }
 *               nama_generik: { type: string }
 *               satuan: { type: string }
 *               harga_jual: { type: number }
 *               stok_minimum: { type: integer }
 *     responses:
 *       201:
 *         description: Obat berhasil ditambahkan
 */
drugRouter.get('/', checkAnyPermission('pharmacy:read', 'stock:read'), controller.listDrugs)
drugRouter.post('/', checkPermission('pharmacy:manage'), controller.createDrug)

/** @openapi
 * /drugs/{id}:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Detail obat + riwayat stok
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data obat lengkap
 *   put:
 *     tags: [Pharmacy]
 *     summary: Update data obat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Obat berhasil diupdate
 */
drugRouter.get('/:id', checkAnyPermission('pharmacy:read', 'stock:read'), controller.getDrug)
drugRouter.put('/:id', checkPermission('pharmacy:manage'), controller.updateDrug)
drugRouter.delete('/:id', checkPermission('pharmacy:manage'), controller.deleteDrug)

/** @openapi
 * /drugs/{id}/stock:
 *   post:
 *     tags: [Pharmacy]
 *     summary: Tambah stok obat (FIFO batch)
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
 *             required: [quantity, batch_number, expiry_date, purchase_price]
 *             properties:
 *               quantity: { type: integer }
 *               batch_number: { type: string }
 *               expiry_date: { type: string, format: date }
 *               purchase_price: { type: number }
 *     responses:
 *       201:
 *         description: Stok berhasil ditambahkan
 */
drugRouter.post('/:id/stock', checkPermission('stock:manage'), controller.addStock)

/** @openapi
 * /drugs/{id}/adjust:
 *   post:
 *     tags: [Pharmacy]
 *     summary: Koreksi stok (stock opname / penyesuaian)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Stok berhasil disesuaikan
 */
drugRouter.post('/:id/adjust', checkPermission('stock:manage'), controller.adjustStock)

/** @openapi
 * /drugs/{id}/history:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Riwayat mutasi stok obat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Riwayat stok masuk/keluar
 */
drugRouter.get('/:id/history', checkAnyPermission('stock:read', 'pharmacy:read'), controller.getStockHistory)

export const dispensingRouter = Router()
dispensingRouter.use(authenticate)

/** @openapi
 * /dispensing/pending:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Daftar resep menunggu dispensing
 *     responses:
 *       200:
 *         description: Antrian resep pending
 */
dispensingRouter.get('/pending', checkAnyPermission('pharmacy:read', 'pharmacy:manage', 'prescription:read'), controller.getPending)

/** @openapi
 * /dispensing/{prescriptionId}:
 *   post:
 *     tags: [Pharmacy]
 *     summary: Proses dispensing resep (FIFO — stok terlama diambil duluan)
 *     parameters:
 *       - in: path
 *         name: prescriptionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Dispensing berhasil, stok terpotong
 */
dispensingRouter.post('/:prescriptionId', checkPermission('pharmacy:manage'), controller.dispense)

/** @openapi
 * /dispensing/{id}:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Detail dispensing (obat yang diberikan + batch info)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data dispensing lengkap
 */
dispensingRouter.get('/:id', checkAnyPermission('pharmacy:read', 'prescription:read'), controller.getDispensing)
