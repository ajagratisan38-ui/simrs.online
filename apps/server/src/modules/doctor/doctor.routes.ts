import { Router } from 'express'
import { DoctorController } from './doctor.controller'
import { DoctorService } from './doctor.service'
import { SubstitutionController } from './substitution.controller'
import { SubstitutionService } from './substitution.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const router = Router()
const service = new DoctorService(db)
const controller = new DoctorController(service)
const subService = new SubstitutionService(db)
const subController = new SubstitutionController(subService)

router.use(authenticate)

// Doctor list & static routes (before /:id catch-all)
router.get('/', checkAnyPermission('registration:read', 'patient:read'), controller.listDoctors)
router.get('/today-schedule', checkAnyPermission('registration:read', 'queue:manage'), controller.getTodaySchedule)
router.get('/earnings', checkPermission('dashboard:read'), controller.getAllEarnings)

// Substitutions — static paths before /:id
router.get('/substitutions', checkAnyPermission('settings:manage', 'registration:read'), subController.list)
router.get('/substitutions/stats', checkPermission('settings:manage'), subController.getStats)
router.post('/substitutions', checkPermission('settings:manage'), subController.create)
router.post('/substitutions/complete-expired', checkPermission('settings:manage'), subController.completeExpired)
router.get('/substitutions/:id', checkAnyPermission('settings:manage', 'registration:read'), subController.getById)
router.post('/substitutions/:id/cancel', checkPermission('settings:manage'), subController.cancel)

// Doctor by ID
router.get('/:id', checkAnyPermission('registration:read', 'patient:read'), controller.getDoctor)
router.put('/:id', checkPermission('settings:manage'), controller.updateDoctor)

// Schedules
router.get('/:doctorId/schedules', checkAnyPermission('registration:read', 'patient:read'), controller.listSchedules)
router.post('/:doctorId/schedules', checkPermission('settings:manage'), controller.upsertSchedule)
router.delete('/schedules/:scheduleId', checkPermission('settings:manage'), controller.deleteSchedule)
router.patch('/schedules/:scheduleId/toggle', checkPermission('settings:manage'), controller.toggleSchedule)

// Fees
router.get('/:doctorId/fees', checkAnyPermission('registration:read', 'dashboard:read'), controller.listFees)
router.post('/:doctorId/fees', checkPermission('settings:manage'), controller.createFee)
router.put('/fees/:feeId', checkPermission('settings:manage'), controller.updateFee)
router.delete('/fees/:feeId', checkPermission('settings:manage'), controller.deleteFee)

// Fee transactions
router.post('/fee-transactions', checkPermission('billing:create'), controller.recordTransaction)
router.get('/:doctorId/earnings', checkAnyPermission('dashboard:read', 'billing:read'), controller.getDoctorEarnings)

// Deactivate / Reactivate
router.post('/:id/deactivate', checkPermission('settings:manage'), controller.deactivateDoctor)
router.post('/:id/reactivate', checkPermission('settings:manage'), controller.reactivateDoctor)

// Doctor-specific substitution history
router.get('/:doctorId/substitutions', checkAnyPermission('settings:manage', 'registration:read'), subController.getDoctorHistory)
router.get('/:doctorId/active-substitute', checkAnyPermission('settings:manage', 'registration:read'), subController.getActiveForDoctor)

export { router as doctorRouter }
