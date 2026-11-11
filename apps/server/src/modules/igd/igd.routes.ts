import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { IGDService } from './igd.service'
import { IGDController } from './igd.controller'

const igdService = new IGDService(db)
const igdController = new IGDController(igdService)

const router = Router()

router.use(authenticate)

router.get('/board', checkAnyPermission('registration:read', 'medical-record:read', 'dashboard:read'), igdController.getBoard)
router.get('/stats', checkAnyPermission('registration:read', 'dashboard:read'), igdController.getStats)
router.post('/register', checkAnyPermission('registration:create'), igdController.quickRegister)
router.put('/:visitId/triage', checkAnyPermission('registration:update', 'medical-record:create'), igdController.setTriage)
router.post('/:visitId/response', checkAnyPermission('medical-record:create'), igdController.setResponseTime)
router.put('/:visitId/disposition', checkAnyPermission('medical-record:create', 'registration:update'), igdController.setDisposition)

export { router as igdRoutes }
