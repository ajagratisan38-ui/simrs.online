import { Router } from 'express'
import { InpatientController } from './inpatient.controller'
import { InpatientService } from './inpatient.service'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'

const service = new InpatientService(db)
const controller = new InpatientController(service)

const router = Router()

router.use(authenticate)

// Summary & listing (read)
router.get('/summary', checkAnyPermission('registration:read'), controller.summary)
router.get('/rooms', checkAnyPermission('registration:read'), controller.listRooms)
router.get('/rooms/all', checkAnyPermission('settings:manage'), controller.listAllRooms)
router.get('/rooms/stats', checkAnyPermission('settings:manage'), controller.roomStats)
router.get('/rooms/:roomId', checkAnyPermission('registration:read'), controller.getRoom)
router.get('/rooms/:roomId/beds', checkAnyPermission('registration:read'), controller.getBedsByRoom)
router.get('/beds', checkAnyPermission('registration:read'), controller.getAllBeds)

// Bed operations (assign, transfer, release, maintenance)
router.post('/assign', checkAnyPermission('registration:create'), controller.assignBed)
router.post('/transfer', checkAnyPermission('registration:create'), controller.transferBed)
router.patch('/beds/:bedId/release', checkAnyPermission('registration:update'), controller.releaseBed)
router.patch('/beds/:bedId/maintenance', checkAnyPermission('registration:update'), controller.toggleMaintenance)

// Discharge — pulangkan pasien (status pulang, release bed, auto-bill)
router.post('/discharge/:visitId', checkAnyPermission('registration:update', 'medical-record:create'), controller.discharge)

// Validasi kelas BPJS
router.get('/validate-kelas', checkAnyPermission('registration:read'), controller.validateKelas)

// Room CRUD (admin)
router.post('/rooms', checkAnyPermission('settings:manage'), controller.createRoom)
router.put('/rooms/:roomId', checkAnyPermission('settings:manage'), controller.updateRoom)
router.patch('/rooms/:roomId/toggle', checkAnyPermission('settings:manage'), controller.toggleRoom)
router.delete('/rooms/:roomId', checkAnyPermission('settings:manage'), controller.deleteRoom)

// Bed CRUD (admin)
router.post('/rooms/:roomId/beds', checkAnyPermission('settings:manage'), controller.addBed)
router.patch('/beds/:bedId/rename', checkAnyPermission('settings:manage'), controller.renameBed)
router.delete('/beds/:bedId', checkAnyPermission('settings:manage'), controller.removeBed)

export { router as inpatientRouter }
