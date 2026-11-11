import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission } from '../../middleware/check-permission'
import { McuService } from './mcu.service'
import { McuController } from './mcu.controller'

const service = new McuService(db)
const controller = new McuController(service)

export const mcuRouter = Router()

mcuRouter.use(authenticate)

// Stats
mcuRouter.get('/stats', checkPermission('dashboard:read'), controller.getStats)

// Packages
mcuRouter.get('/packages', controller.listPackages)
mcuRouter.get('/packages/:packageId', controller.getPackage)
mcuRouter.post('/packages', checkPermission('admin:manage'), controller.createPackage)
mcuRouter.put('/packages/:packageId', checkPermission('admin:manage'), controller.updatePackage)
mcuRouter.patch('/packages/:packageId/toggle', checkPermission('admin:manage'), controller.togglePackage)
mcuRouter.delete('/packages/:packageId', checkPermission('admin:manage'), controller.deletePackage)

// Registrations
mcuRouter.post('/register', checkPermission('registration:create'), controller.register)
mcuRouter.get('/registrations', checkPermission('registration:read'), controller.listRegistrations)
mcuRouter.get('/registrations/:id', checkPermission('registration:read'), controller.getRegistration)
mcuRouter.patch('/registrations/:id/start', checkPermission('medical_record:write'), controller.startMcu)
mcuRouter.patch('/registrations/:id/conclude', checkPermission('medical_record:write'), controller.conclude)
mcuRouter.patch('/registrations/:id/cancel', checkPermission('registration:create'), controller.cancelMcu)
mcuRouter.get('/registrations/:id/certificate', checkPermission('registration:read'), controller.getCertificate)

// Examination results
mcuRouter.patch('/examinations/:examId/result', checkPermission('medical_record:write'), controller.inputExamResult)
