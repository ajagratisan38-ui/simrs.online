import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { SiranapService } from './siranap.service'
import { SiranapController } from './siranap.controller'

const service = new SiranapService(db)
const controller = new SiranapController(service)

const router = Router()

router.use(authenticate)

const adminOnly = checkAnyPermission('settings:manage')

// Config
router.get('/config', adminOnly, controller.getConfig)
router.put('/config', adminOnly, controller.updateConfig)
router.post('/test-connection', adminOnly, controller.testConnection)

// Live bed data (viewable by admin + manajemen)
router.get('/bed-data', checkAnyPermission('settings:manage', 'dashboard:read'), controller.getLiveBedData)

// Send
router.post('/send', adminOnly, controller.sendNow)

// Stats
router.get('/stats', adminOnly, controller.getStats)

// Submission log
router.get('/submissions', adminOnly, controller.listSubmissions)
router.get('/submissions/:id', adminOnly, controller.getSubmission)

export { router as siranapRouter }
