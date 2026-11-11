import { Router } from 'express'
import { TarifService } from './tarif.service'
import { TarifController } from './tarif.controller'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new TarifService(db)
const controller = new TarifController(service)

const tarifRouter = Router()

tarifRouter.use(authenticate)

tarifRouter.get('/', checkPermission('settings:manage'), controller.list)
tarifRouter.get('/stats', checkPermission('settings:manage'), controller.getStats)
tarifRouter.get('/:id', checkPermission('settings:manage'), controller.getById)
tarifRouter.post('/', checkPermission('settings:manage'), controller.create)
tarifRouter.put('/:id', checkPermission('settings:manage'), controller.update)
tarifRouter.patch('/:id/toggle', checkPermission('settings:manage'), controller.toggleActive)
tarifRouter.delete('/:id', checkPermission('settings:manage'), controller.delete)

export { tarifRouter }
