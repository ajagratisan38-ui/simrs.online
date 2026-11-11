import { Router } from 'express'
import { OtcSalesController } from './otc-sales.controller'
import { OtcSalesService } from './otc-sales.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new OtcSalesService(db)
const controller = new OtcSalesController(service)

export const otcSalesRouter = Router()
otcSalesRouter.use(authenticate)

/** @openapi
 * /otc-sales:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Daftar penjualan obat bebas (OTC)
 *     responses:
 *       200:
 *         description: Daftar penjualan
 *   post:
 *     tags: [Pharmacy]
 *     summary: Buat transaksi penjualan obat bebas (potong stok otomatis)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, payment_method]
 *             properties:
 *               customer_name: { type: string }
 *               payment_method: { type: string, enum: [tunai, debit, kredit, transfer] }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     drug_id: { type: string, format: uuid }
 *                     quantity: { type: integer }
 *     responses:
 *       201:
 *         description: Penjualan berhasil
 */
otcSalesRouter.get('/', checkAnyPermission('pharmacy:read', 'billing:read'), controller.listSales)
otcSalesRouter.post('/', checkAnyPermission('pharmacy:manage'), controller.createSale)

/** @openapi
 * /otc-sales/summary:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Ringkasan penjualan harian OTC
 *     responses:
 *       200:
 *         description: Total penjualan + per metode pembayaran
 */
otcSalesRouter.get('/summary', checkAnyPermission('pharmacy:read', 'billing:read'), controller.getDailySummary)

/** @openapi
 * /otc-sales/{id}:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Detail penjualan OTC
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data penjualan + item
 */
otcSalesRouter.get('/:id', checkAnyPermission('pharmacy:read', 'billing:read'), controller.getSale)
