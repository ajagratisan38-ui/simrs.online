import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { SirsService } from './sirs.service'
import { SirsController } from './sirs.controller'

const service = new SirsService(db)
const controller = new SirsController(service)

const router = Router()

router.use(authenticate)

const adminOnly = checkAnyPermission('settings:manage')

// Config
router.get('/config', adminOnly, controller.getConfig)
router.put('/config', adminOnly, controller.updateConfig)
router.post('/test-connection', adminOnly, controller.testConnection)

// Generate RL reports
router.get('/generate/:rlType', adminOnly, controller.generateRL)
router.get('/generate-all', adminOnly, controller.generateAll)

// Indikator RS
router.get('/indikator', adminOnly, controller.getIndikator)

// Send to Kemenkes
router.post('/send', adminOnly, controller.sendToKemenkes)

// Submission log
router.get('/submissions', adminOnly, controller.listSubmissions)
router.get('/submissions/stats', adminOnly, controller.getSubmissionStats)

export { router as sirsOnlineRouter }
