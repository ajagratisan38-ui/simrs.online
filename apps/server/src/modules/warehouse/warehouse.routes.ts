import { Router } from 'express'
import { WarehouseController } from './warehouse.controller'
import { WarehouseService } from './warehouse.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new WarehouseService(db)
const controller = new WarehouseController(service)

// ── Warehouse Items ──
const warehouseRouter = Router()
warehouseRouter.use(authenticate)

warehouseRouter.get('/', checkAnyPermission('pharmacy:read', 'stock:read'), controller.listItems)
warehouseRouter.get('/:id', checkAnyPermission('pharmacy:read', 'stock:read'), controller.getItem)
warehouseRouter.post('/', checkAnyPermission('stock:manage', 'settings:manage'), controller.createItem)
warehouseRouter.put('/:id', checkAnyPermission('stock:manage', 'settings:manage'), controller.updateItem)
warehouseRouter.delete('/:id', checkAnyPermission('stock:manage', 'settings:manage'), controller.deleteItem)
warehouseRouter.post('/stock', checkAnyPermission('stock:manage', 'pharmacy:manage'), controller.addStock)

// ── Stock Opname ──
const stockOpnameRouter = Router()
stockOpnameRouter.use(authenticate)

stockOpnameRouter.get('/', checkAnyPermission('pharmacy:read', 'stock:read'), controller.listOpnames)
stockOpnameRouter.post('/', checkAnyPermission('stock:manage', 'pharmacy:manage'), controller.createOpname)
stockOpnameRouter.get('/:id', checkAnyPermission('pharmacy:read', 'stock:read'), controller.getOpname)
stockOpnameRouter.put('/:opnameId/items/:itemId/count', checkAnyPermission('stock:manage', 'pharmacy:manage'), controller.inputCount)
stockOpnameRouter.post('/:id/complete', checkAnyPermission('stock:manage', 'settings:manage'), controller.completeOpname)
stockOpnameRouter.post('/:id/cancel', checkAnyPermission('stock:manage', 'settings:manage'), controller.cancelOpname)

export { warehouseRouter, stockOpnameRouter }
