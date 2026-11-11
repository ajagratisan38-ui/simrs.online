import { Router } from 'express'
import { SurgeryController } from './surgery.controller'
import { SurgeryService } from './surgery.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new SurgeryService(db)
const controller = new SurgeryController(service)

export const surgeryRouter = Router()
surgeryRouter.use(authenticate)

const read = checkAnyPermission('medical-record:read', 'patient:read')
const write = checkAnyPermission('medical-record:create', 'medical-record:update')

surgeryRouter.get('/', read, controller.list)
surgeryRouter.post('/', write, controller.create)
surgeryRouter.get('/today', read, controller.todaySchedule)

surgeryRouter.get('/:id', read, controller.getById)
surgeryRouter.put('/:id', write, controller.update)
surgeryRouter.get('/:id/full', read, controller.getFullDetail)

surgeryRouter.get('/:id/team', read, controller.getTeam)
surgeryRouter.put('/:id/team', write, controller.setTeam)

surgeryRouter.get('/:id/instruments', read, controller.getInstruments)
surgeryRouter.put('/:id/instruments', write, controller.setInstruments)

surgeryRouter.get('/:id/anesthesia', read, controller.getAnesthesia)
surgeryRouter.put('/:id/anesthesia', write, controller.upsertAnesthesia)

surgeryRouter.get('/:id/nursing', read, controller.getNursing)
surgeryRouter.put('/:id/nursing', write, controller.upsertNursing)
