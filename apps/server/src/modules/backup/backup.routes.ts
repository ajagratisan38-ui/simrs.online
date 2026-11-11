import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { BackupService } from './backup.service'
import { BackupController } from './backup.controller'

const service = new BackupService(db)
const controller = new BackupController(service)

const router = Router()

router.use(authenticate)

const adminOnly = checkAnyPermission('settings:manage')

// Stats
router.get('/stats', adminOnly, controller.getStats)

// Backup CRUD
router.get('/list', adminOnly, controller.listBackups)
router.post('/create', adminOnly, controller.createBackup)
router.delete('/:id', adminOnly, controller.deleteBackup)
router.get('/:id/download', adminOnly, controller.downloadBackup)

// Schedule
router.get('/schedule', adminOnly, controller.getSchedule)
router.put('/schedule', adminOnly, controller.updateSchedule)

// Restore
router.get('/:id/validate', adminOnly, controller.validateRestore)
router.get('/:id/restore-command', adminOnly, controller.getRestoreCommand)

// Manual cron check (for testing)
router.post('/run-schedule', adminOnly, controller.runScheduledCheck)

export { router as backupRoutes }
