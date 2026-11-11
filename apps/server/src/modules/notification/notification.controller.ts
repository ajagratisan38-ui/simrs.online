import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { NotificationService } from './notification.service'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const sendSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().optional(),
  tag: z.string().optional(),
  targetUserId: z.string().uuid().optional(),
  targetRole: z.string().optional(),
})

export class NotificationController {
  constructor(private service: NotificationService) {}

  getVapidPublicKey = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const key = this.service.getVapidPublicKey()
      res.json({ success: true, data: { vapidPublicKey: key } })
    } catch (error) {
      next(error)
    }
  }

  subscribe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = subscribeSchema.parse(req.body)
      const result = await this.service.saveSubscription(
        req.userId!,
        req.tenantSchema!,
        data,
        req.headers['user-agent'],
      )
      res.status(result.updated ? 200 : 201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { endpoint } = z.object({ endpoint: z.string().url() }).parse(req.body)
      const removed = await this.service.removeSubscription(
        req.userId!,
        req.tenantSchema!,
        endpoint,
      )
      res.json({ success: true, data: { removed } })
    } catch (error) {
      next(error)
    }
  }

  getMySubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subs = await this.service.getSubscriptions(req.userId!, req.tenantSchema!)
      res.json({ success: true, data: subs })
    } catch (error) {
      next(error)
    }
  }

  sendNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = sendSchema.parse(req.body)
      const payload = {
        title: data.title,
        body: data.body,
        url: data.url,
        tag: data.tag,
      }

      let result
      if (data.targetUserId) {
        result = await this.service.sendToUser(
          data.targetUserId,
          req.tenantSchema!,
          payload,
        )
      } else if (data.targetRole) {
        result = await this.service.sendToRole(
          req.tenantSchema!,
          data.targetRole,
          payload,
        )
      } else {
        result = await this.service.broadcast(req.tenantSchema!, payload)
      }

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  testPush = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.sendToUser(
        req.userId!,
        req.tenantSchema!,
        {
          title: 'SIMRS Test Notification',
          body: 'Push notification berfungsi dengan baik! 🎉',
          tag: 'test',
          url: '/dashboard',
        },
      )
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
