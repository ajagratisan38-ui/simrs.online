import { Router } from 'express'
import { InsuranceController } from './insurance.controller'
import { InsuranceService } from './insurance.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new InsuranceService(db)
const controller = new InsuranceController(service)

const insuranceRouter = Router()
insuranceRouter.use(authenticate)

// Master insurances
insuranceRouter.get('/dropdown', checkAnyPermission('registration:read', 'patient:read'), controller.dropdown)
insuranceRouter.get('/stats', checkAnyPermission('dashboard:read', 'settings:manage'), controller.stats)
insuranceRouter.get('/', checkAnyPermission('patient:read', 'settings:manage'), controller.list)
insuranceRouter.get('/:id', checkAnyPermission('patient:read', 'settings:manage'), controller.get)
insuranceRouter.post('/', checkPermission('settings:manage'), controller.create)
insuranceRouter.put('/:id', checkPermission('settings:manage'), controller.update)
insuranceRouter.patch('/:id/toggle', checkPermission('settings:manage'), controller.toggle)
insuranceRouter.delete('/:id', checkPermission('settings:manage'), controller.delete)

// Patient insurances
const patientInsuranceRouter = Router()
patientInsuranceRouter.use(authenticate)

patientInsuranceRouter.get(
  '/:patientId/insurances',
  checkAnyPermission('patient:read', 'registration:read'),
  controller.listPatientInsurances,
)
patientInsuranceRouter.get(
  '/:patientId/insurances/active',
  checkAnyPermission('patient:read', 'registration:read'),
  controller.patientActive,
)
patientInsuranceRouter.post(
  '/:patientId/insurances',
  checkAnyPermission('patient:update', 'settings:manage'),
  controller.addPatientInsurance,
)
patientInsuranceRouter.put(
  '/:patientId/insurances/:id',
  checkAnyPermission('patient:update', 'settings:manage'),
  controller.updatePatientInsurance,
)
patientInsuranceRouter.delete(
  '/:patientId/insurances/:id',
  checkAnyPermission('patient:update', 'settings:manage'),
  controller.removePatientInsurance,
)

export { insuranceRouter, patientInsuranceRouter }
