import { Router } from 'express'
import { CdssController } from './cdss.controller'
import { CdssService } from './cdss.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new CdssService(db)
const controller = new CdssController(service)

export const cdssRouter = Router()
cdssRouter.use(authenticate)

// ── Drug checks (any authenticated medical staff) ──
cdssRouter.post(
  '/check-prescription',
  checkAnyPermission('pharmacy:read', 'prescription:create', 'pharmacy:manage'),
  controller.checkPrescription,
)

cdssRouter.get(
  '/check-drug/:drugId',
  checkAnyPermission('pharmacy:read', 'prescription:create', 'pharmacy:manage'),
  controller.checkDrug,
)

cdssRouter.get(
  '/check-interaction/:drugAId/:drugBId',
  checkAnyPermission('pharmacy:read', 'prescription:create', 'pharmacy:manage'),
  controller.checkInteraction,
)

// ── High-alert management ──
cdssRouter.get(
  '/high-alert',
  checkAnyPermission('pharmacy:read', 'pharmacy:manage'),
  controller.getHighAlertDrugs,
)

cdssRouter.put(
  '/high-alert/:drugId',
  checkAnyPermission('pharmacy:manage', 'admin:manage'),
  controller.setHighAlert,
)

// ── LASA / NORUM ──
cdssRouter.get(
  '/lasa',
  checkAnyPermission('pharmacy:read', 'pharmacy:manage'),
  controller.getLasaDrugs,
)

cdssRouter.put(
  '/lasa/:drugId',
  checkAnyPermission('pharmacy:manage', 'admin:manage'),
  controller.setLasa,
)

cdssRouter.get(
  '/lasa/detect',
  checkAnyPermission('pharmacy:manage', 'admin:manage'),
  controller.detectLasaPairs,
)

// ── Interaction database ──
cdssRouter.get(
  '/interactions',
  checkAnyPermission('pharmacy:read', 'prescription:create', 'pharmacy:manage'),
  controller.searchInteractions,
)

cdssRouter.post(
  '/interactions',
  checkAnyPermission('pharmacy:manage', 'admin:manage'),
  controller.addInteraction,
)

cdssRouter.put(
  '/interactions/:id',
  checkAnyPermission('pharmacy:manage', 'admin:manage'),
  controller.updateInteraction,
)

cdssRouter.delete(
  '/interactions/:id',
  checkAnyPermission('pharmacy:manage', 'admin:manage'),
  controller.deleteInteraction,
)

cdssRouter.get(
  '/interactions/stats',
  checkAnyPermission('pharmacy:read', 'pharmacy:manage', 'admin:manage'),
  controller.getInteractionStats,
)

// ── Alert management ──
cdssRouter.post(
  '/alerts/:alertId/override',
  checkAnyPermission('pharmacy:manage', 'prescription:create'),
  controller.overrideAlert,
)

cdssRouter.get(
  '/alerts/visit/:visitId',
  checkAnyPermission('pharmacy:read', 'prescription:read', 'pharmacy:manage'),
  controller.getAlertsByVisit,
)

cdssRouter.get(
  '/alerts/stats',
  checkAnyPermission('pharmacy:manage', 'admin:manage', 'dashboard:read'),
  controller.getAlertStats,
)
