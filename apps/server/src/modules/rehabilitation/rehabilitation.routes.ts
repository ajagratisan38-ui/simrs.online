import { Router } from 'express'
import { RehabilitationController } from './rehabilitation.controller'
import { RehabilitationService } from './rehabilitation.service'
import { PractitionerController } from './practitioner.controller'
import { PractitionerService } from './practitioner.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

// ── Rehabilitation Orders Router ──

const rehabRouter = Router()
const rehabService = new RehabilitationService(db)
const rehabController = new RehabilitationController(rehabService)

rehabRouter.use(authenticate)

rehabRouter.get('/stats', checkAnyPermission('patient:read', 'dashboard:read'), rehabController.stats)
rehabRouter.get('/', checkAnyPermission('patient:read', 'registration:read'), rehabController.listOrders)
rehabRouter.post('/', checkAnyPermission('medical_record:write', 'patient:write'), rehabController.createOrder)
rehabRouter.get('/patient/:patientId', checkPermission('patient:read'), rehabController.patientHistory)
rehabRouter.get('/:id', checkAnyPermission('patient:read', 'registration:read'), rehabController.getOrder)
rehabRouter.patch('/:id/status', checkAnyPermission('medical_record:write', 'patient:write'), rehabController.updateStatus)
rehabRouter.patch('/:id/assign', checkAnyPermission('medical_record:write', 'settings:manage'), rehabController.assignPractitioner)

// Sessions
rehabRouter.post('/:orderId/sessions', checkAnyPermission('medical_record:write', 'patient:write'), rehabController.addSession)
rehabRouter.put('/sessions/:sessionId', checkAnyPermission('medical_record:write', 'patient:write'), rehabController.updateSession)
rehabRouter.delete('/sessions/:sessionId', checkAnyPermission('medical_record:write', 'settings:manage'), rehabController.deleteSession)

// ── External Practitioners Router ──

const practitionerRouter = Router()
const practitionerService = new PractitionerService(db)
const practitionerController = new PractitionerController(practitionerService)

practitionerRouter.use(authenticate)

practitionerRouter.get('/stats', checkPermission('settings:manage'), practitionerController.stats)
practitionerRouter.get('/dropdown', checkAnyPermission('patient:read', 'registration:read'), practitionerController.dropdown)
practitionerRouter.get('/', checkAnyPermission('settings:manage', 'patient:read'), practitionerController.list)
practitionerRouter.post('/', checkPermission('settings:manage'), practitionerController.create)
practitionerRouter.get('/:id', checkAnyPermission('settings:manage', 'patient:read'), practitionerController.getById)
practitionerRouter.put('/:id', checkPermission('settings:manage'), practitionerController.update)
practitionerRouter.delete('/:id', checkPermission('settings:manage'), practitionerController.delete)

export { rehabRouter, practitionerRouter }
