import { Router } from 'express'
import { PurchaseOrderService } from './po.service'
import { PurchaseOrderController } from './po.controller'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new PurchaseOrderService(db)
const controller = new PurchaseOrderController(service)

// --- Supplier routes ---
export const supplierRouter = Router()
supplierRouter.use(authenticate)

supplierRouter.get('/', checkAnyPermission('pharmacy:read', 'pharmacy:manage', 'stock:read'), controller.listSuppliers)
supplierRouter.post('/', checkPermission('pharmacy:manage'), controller.createSupplier)
supplierRouter.put('/:id', checkPermission('pharmacy:manage'), controller.updateSupplier)
supplierRouter.delete('/:id', checkPermission('pharmacy:manage'), controller.deleteSupplier)

// --- Purchase Order routes ---
export const purchaseOrderRouter = Router()
purchaseOrderRouter.use(authenticate)

purchaseOrderRouter.get('/', checkAnyPermission('pharmacy:read', 'pharmacy:manage', 'stock:read'), controller.listPO)
purchaseOrderRouter.post('/', checkPermission('pharmacy:manage'), controller.createPO)
purchaseOrderRouter.get('/:id', checkAnyPermission('pharmacy:read', 'pharmacy:manage', 'stock:read'), controller.getPO)
purchaseOrderRouter.put('/:id/status', checkPermission('pharmacy:manage'), controller.updateStatus)
purchaseOrderRouter.post('/:id/receive', checkPermission('stock:manage'), controller.receiveItems)
