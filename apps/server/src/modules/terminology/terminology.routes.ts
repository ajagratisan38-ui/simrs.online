import { Router } from 'express'
import { TerminologyController } from './terminology.controller'
import { TerminologyService } from './terminology.service'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission, checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new TerminologyService(db)
const controller = new TerminologyController(service)

export const terminologyRouter = Router()
terminologyRouter.use(authenticate)

// ===== LOINC routes =====

terminologyRouter.get(
  '/loinc/search',
  checkAnyPermission('lab-order:read', 'lab-result:read', 'medical-record:read', 'settings:manage'),
  controller.searchLoinc,
)

terminologyRouter.get(
  '/loinc/categories',
  checkAnyPermission('lab-order:read', 'lab-result:read', 'medical-record:read', 'settings:manage'),
  controller.getLoincCategories,
)

terminologyRouter.get(
  '/loinc/stats',
  checkAnyPermission('lab-order:read', 'lab-result:read', 'settings:manage'),
  controller.getLoincStats,
)

terminologyRouter.get(
  '/loinc/:code',
  checkAnyPermission('lab-order:read', 'lab-result:read', 'medical-record:read', 'settings:manage'),
  controller.getLoincByCode,
)

// ===== KFA routes =====

terminologyRouter.get(
  '/kfa/search',
  checkAnyPermission('pharmacy:read', 'stock:read', 'medical-record:read', 'settings:manage'),
  controller.searchKfa,
)

terminologyRouter.get(
  '/kfa/categories',
  checkAnyPermission('pharmacy:read', 'stock:read', 'settings:manage'),
  controller.getKfaCategories,
)

terminologyRouter.get(
  '/kfa/golongan',
  checkAnyPermission('pharmacy:read', 'stock:read', 'settings:manage'),
  controller.getKfaGolongan,
)

terminologyRouter.get(
  '/kfa/stats',
  checkAnyPermission('pharmacy:read', 'stock:read', 'settings:manage'),
  controller.getKfaStats,
)

terminologyRouter.get(
  '/kfa/:code',
  checkAnyPermission('pharmacy:read', 'stock:read', 'medical-record:read', 'settings:manage'),
  controller.getKfaByCode,
)

// ===== Mapping routes (admin only) =====

terminologyRouter.put(
  '/mapping/lab/:labKode/loinc',
  checkPermission('settings:manage'),
  controller.mapLabToLoinc,
)

terminologyRouter.put(
  '/mapping/drug/:drugId/kfa',
  checkPermission('settings:manage'),
  controller.mapDrugToKfa,
)

terminologyRouter.post(
  '/mapping/auto-map-drugs',
  checkPermission('settings:manage'),
  controller.autoMapDrugs,
)

terminologyRouter.get(
  '/mapping/unmapped/lab',
  checkPermission('settings:manage'),
  controller.getUnmappedLab,
)

terminologyRouter.get(
  '/mapping/unmapped/drugs',
  checkPermission('settings:manage'),
  controller.getUnmappedDrugs,
)
