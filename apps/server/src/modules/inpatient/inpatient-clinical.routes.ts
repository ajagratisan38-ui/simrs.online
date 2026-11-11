import { Router } from 'express'
import { InpatientClinicalController } from './inpatient-clinical.controller'
import { InpatientClinicalService } from './inpatient-clinical.service'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'

const service = new InpatientClinicalService(db)
const controller = new InpatientClinicalController(service)

const router = Router()

router.use(authenticate)

// ── Inpatient List ──
router.get(
  '/patients',
  checkAnyPermission('registration:read', 'medical-record:read'),
  controller.listInpatients,
)

// ── Clinical Summary ──
router.get(
  '/summary/:visitId',
  checkAnyPermission('registration:read', 'medical-record:read'),
  controller.getClinicalSummary,
)

// ── Vital Signs ──
router.post(
  '/vitals',
  checkAnyPermission('medical-record:create', 'assessment:create'),
  controller.recordVitals,
)
router.get(
  '/vitals/:visitId',
  checkAnyPermission('medical-record:read', 'assessment:read'),
  controller.getVitalsByVisit,
)
router.get(
  '/vitals/:visitId/trend',
  checkAnyPermission('medical-record:read', 'assessment:read'),
  controller.getVitalsTrend,
)
router.get(
  '/vitals/:visitId/latest',
  checkAnyPermission('medical-record:read', 'assessment:read'),
  controller.getLatestVitals,
)
router.delete(
  '/vitals/:vitalId',
  checkAnyPermission('medical-record:create', 'assessment:create'),
  controller.deleteVital,
)

// ── Medical Orders ──
router.post(
  '/orders',
  checkAnyPermission('medical-record:create'),
  controller.createOrder,
)
router.get(
  '/orders/:visitId',
  checkAnyPermission('medical-record:read', 'assessment:read'),
  controller.listOrders,
)
router.patch(
  '/orders/:orderId/status',
  checkAnyPermission('medical-record:create', 'medical-record:update'),
  controller.updateOrderStatus,
)
router.post(
  '/orders/:orderId/execute',
  checkAnyPermission('assessment:create', 'medical-record:create'),
  controller.executeOrder,
)
router.delete(
  '/orders/:orderId',
  checkAnyPermission('medical-record:create'),
  controller.deleteOrder,
)

// ── Nursing Notes ──
router.post(
  '/nursing-notes',
  checkAnyPermission('assessment:create'),
  controller.createNursingNote,
)
router.get(
  '/nursing-notes/:visitId',
  checkAnyPermission('assessment:read', 'medical-record:read'),
  controller.listNursingNotes,
)
router.put(
  '/nursing-notes/:noteId',
  checkAnyPermission('assessment:create'),
  controller.updateNursingNote,
)
router.patch(
  '/nursing-notes/:noteId/finalize',
  checkAnyPermission('assessment:create'),
  controller.finalizeNursingNote,
)
router.delete(
  '/nursing-notes/:noteId',
  checkAnyPermission('assessment:create'),
  controller.deleteNursingNote,
)

// ── Discharge Planning ──
router.get(
  '/discharge-plan/:visitId',
  checkAnyPermission('registration:read', 'medical-record:read'),
  controller.getDischargePlan,
)
router.put(
  '/discharge-plan/:planId',
  checkAnyPermission('medical-record:create', 'registration:update'),
  controller.updateDischargePlan,
)

export { router as inpatientClinicalRouter }
