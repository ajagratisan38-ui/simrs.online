import { Router } from 'express'
import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new InventoryService(db)
const controller = new InventoryController(service)

export const inventoryRouter = Router()
inventoryRouter.use(authenticate)

/** @openapi
 * /inventory/transfers:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Daftar amprah/mutasi barang antar gudang
 *     responses:
 *       200:
 *         description: Daftar transfer
 *   post:
 *     tags: [Pharmacy]
 *     summary: Buat permintaan amprah/mutasi barang baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [drug_id, quantity, from_warehouse, to_warehouse]
 *             properties:
 *               drug_id: { type: string, format: uuid }
 *               quantity: { type: integer }
 *               from_warehouse: { type: string }
 *               to_warehouse: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Amprah berhasil dibuat, status pending
 */
inventoryRouter.get('/', checkAnyPermission('pharmacy:read', 'patient:read'), controller.listTransfers)
inventoryRouter.post('/', checkAnyPermission('pharmacy:manage', 'stock:manage'), controller.createTransfer)

/** @openapi
 * /inventory/transfers/{id}:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Detail transfer
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data transfer
 */
inventoryRouter.get('/:id', checkAnyPermission('pharmacy:read', 'patient:read'), controller.getTransfer)

/** @openapi
 * /inventory/transfers/{id}/approve:
 *   patch:
 *     tags: [Pharmacy]
 *     summary: Approve permintaan amprah
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transfer disetujui
 */
inventoryRouter.patch('/:id/approve', checkAnyPermission('pharmacy:manage', 'stock:manage'), controller.approveTransfer)

/** @openapi
 * /inventory/transfers/{id}/complete:
 *   patch:
 *     tags: [Pharmacy]
 *     summary: Selesaikan transfer (stok terpotong + masuk)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transfer selesai, stok diupdate
 */
inventoryRouter.patch('/:id/complete', checkAnyPermission('pharmacy:manage', 'stock:manage'), controller.completeTransfer)

/** @openapi
 * /inventory/transfers/{id}/reject:
 *   patch:
 *     tags: [Pharmacy]
 *     summary: Tolak permintaan amprah
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transfer ditolak
 */
inventoryRouter.patch('/:id/reject', checkAnyPermission('pharmacy:manage', 'stock:manage'), controller.rejectTransfer)
