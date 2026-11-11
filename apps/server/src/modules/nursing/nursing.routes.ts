import { Router } from 'express'
import { NursingController } from './nursing.controller'
import { NursingService } from './nursing.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new NursingService(db)
const controller = new NursingController(service)

const nursingRouter = Router()
nursingRouter.use(authenticate)

nursingRouter.post('/', checkAnyPermission('assessment:create', 'medical-record:create'), controller.create)
nursingRouter.get('/visit/:visitId', checkAnyPermission('assessment:read', 'medical-record:read'), controller.getByVisit)
nursingRouter.get('/patient/:patientId', checkAnyPermission('assessment:read', 'medical-record:read'), controller.listByPatient)
nursingRouter.get('/:id', checkAnyPermission('assessment:read', 'medical-record:read'), controller.getById)
nursingRouter.put('/:id', checkAnyPermission('assessment:create', 'medical-record:create'), controller.update)
nursingRouter.post('/:id/finalize', checkAnyPermission('assessment:create', 'medical-record:create'), controller.finalize)
nursingRouter.delete('/:id', checkAnyPermission('assessment:create', 'medical-record:create'), controller.delete)

export { nursingRouter }
