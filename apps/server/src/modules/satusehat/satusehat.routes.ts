import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { SatusehatService } from './satusehat.service'
import { SatusehatController } from './satusehat.controller'

const satusehatService = new SatusehatService(db)
const satusehatController = new SatusehatController(satusehatService)

const router = Router()

router.use(authenticate)

// --- Config endpoints (admin only) ---

router.get('/config', checkAnyPermission('settings:manage'), satusehatController.getConfig)
router.put('/config', checkAnyPermission('settings:manage'), satusehatController.updateConfig)
router.post('/config/test', checkAnyPermission('settings:manage'), satusehatController.testConnection)

// --- Sync endpoints ---

router.post('/sync/:visitId', checkAnyPermission('medical-record:create', 'registration:create'), satusehatController.syncVisit)
router.get('/status/:visitId', checkAnyPermission('medical-record:read', 'registration:read'), satusehatController.getStatus)
router.get('/pending', checkAnyPermission('dashboard:read'), satusehatController.getPending)
router.get('/history', checkAnyPermission('dashboard:read', 'settings:manage'), satusehatController.getSyncHistory)
router.get('/stats', checkAnyPermission('dashboard:read', 'settings:manage'), satusehatController.getSyncStats)
router.post('/retry/:visitId', checkAnyPermission('medical-record:create'), satusehatController.retrySync)

// --- Individual FHIR resource endpoints ---

const fhirWrite = checkAnyPermission('medical-record:create', 'settings:manage')

router.post('/fhir/Procedure', fhirWrite, satusehatController.createProcedure)
router.post('/fhir/AllergyIntolerance', fhirWrite, satusehatController.createAllergyIntolerance)
router.post('/fhir/MedicationDispense', fhirWrite, satusehatController.createMedicationDispense)
router.post('/fhir/ServiceRequest', fhirWrite, satusehatController.createServiceRequest)
router.post('/fhir/DiagnosticReport', fhirWrite, satusehatController.createDiagnosticReport)
router.post('/fhir/Composition', fhirWrite, satusehatController.createComposition)
router.post('/fhir/Practitioner', fhirWrite, satusehatController.createPractitioner)
router.post('/fhir/Location', fhirWrite, satusehatController.createLocationResource)

// Generic resource GET
router.get('/fhir/:resourceType/:resourceId', checkAnyPermission('medical-record:read', 'settings:manage'), satusehatController.getResource)

export { router as satusehatRoutes }
