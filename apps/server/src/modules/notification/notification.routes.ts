import { Router } from 'express'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission } from '../../middleware/check-permission'
import { NotificationService } from './notification.service'
import { NotificationController } from './notification.controller'

const service = new NotificationService(db)
const controller = new NotificationController(service)

export const notificationRouter = Router()

notificationRouter.get('/vapid-key', controller.getVapidPublicKey)

notificationRouter.use(authenticate)

notificationRouter.post('/subscribe', controller.subscribe)
notificationRouter.post('/unsubscribe', controller.unsubscribe)
notificationRouter.get('/subscriptions', controller.getMySubscriptions)
notificationRouter.post('/test', controller.testPush)

notificationRouter.post(
  '/send',
  checkPermission('admin:manage'),
  controller.sendNotification,
)
