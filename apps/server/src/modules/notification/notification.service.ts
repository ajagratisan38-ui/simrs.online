import webpush from 'web-push'
import type { Knex } from 'knex'
import { env } from '../../config/env'
import { logger } from '../../shared/logger'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  data?: Record<string, unknown>
}

const vapidPublicKey = env.vapid?.publicKey || ''
const vapidPrivateKey = env.vapid?.privateKey || ''
const vapidEmail = env.vapid?.email || 'mailto:admin@simrs.id'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
}

export class NotificationService {
  constructor(private db: Knex) {}

  async saveSubscription(
    userId: string,
    tenantSchema: string,
    subscription: PushSubscriptionData,
    userAgent?: string,
  ) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('push_subscriptions')
      .where({ user_id: userId, endpoint: subscription.endpoint })
      .first()

    if (existing) {
      await this.db
        .withSchema(tenantSchema)
        .table('push_subscriptions')
        .where({ id: existing.id })
        .update({
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent || null,
          updated_at: this.db.fn.now(),
        })
      return { id: existing.id, updated: true }
    }

    const [row] = await this.db
      .withSchema(tenantSchema)
      .table('push_subscriptions')
      .insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent || null,
      })
      .returning('id')

    return { id: row.id, updated: false }
  }

  async removeSubscription(userId: string, tenantSchema: string, endpoint: string) {
    const deleted = await this.db
      .withSchema(tenantSchema)
      .table('push_subscriptions')
      .where({ user_id: userId, endpoint })
      .delete()

    return deleted > 0
  }

  async getSubscriptions(userId: string, tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select('id', 'endpoint', 'user_agent', 'created_at')
      .from('push_subscriptions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
  }

  async sendToUser(
    userId: string,
    tenantSchema: string,
    payload: NotificationPayload,
  ) {
    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.warn('VAPID keys not configured, skipping push notification')
      return { sent: 0, failed: 0 }
    }

    const subscriptions = await this.db
      .withSchema(tenantSchema)
      .select('id', 'endpoint', 'p256dh', 'auth')
      .from('push_subscriptions')
      .where({ user_id: userId })

    let sent = 0
    let failed = 0
    const staleIds: string[] = []

    const notifPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.svg',
      badge: payload.badge || '/icons/icon-96.svg',
      tag: payload.tag,
      data: {
        url: payload.url || '/dashboard',
        ...payload.data,
      },
    })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notifPayload,
        )
        sent++
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id)
        }
        failed++
        logger.warn(`Push notification failed for subscription ${sub.id}`, { err })
      }
    }

    if (staleIds.length > 0) {
      await this.db
        .withSchema(tenantSchema)
        .table('push_subscriptions')
        .whereIn('id', staleIds)
        .delete()
      logger.info(`Cleaned up ${staleIds.length} stale push subscriptions`)
    }

    return { sent, failed }
  }

  async sendToRole(
    tenantSchema: string,
    role: string,
    payload: NotificationPayload,
  ) {
    const users = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('users')
      .where({ role, is_active: true })

    let totalSent = 0
    let totalFailed = 0

    for (const user of users) {
      const result = await this.sendToUser(user.id, tenantSchema, payload)
      totalSent += result.sent
      totalFailed += result.failed
    }

    return { sent: totalSent, failed: totalFailed, users: users.length }
  }

  async broadcast(tenantSchema: string, payload: NotificationPayload) {
    const allSubs = await this.db
      .withSchema(tenantSchema)
      .select('id', 'endpoint', 'p256dh', 'auth')
      .from('push_subscriptions')

    if (!vapidPublicKey || !vapidPrivateKey || allSubs.length === 0) {
      return { sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0
    const staleIds: string[] = []

    const notifPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.svg',
      badge: payload.badge || '/icons/icon-96.svg',
      tag: payload.tag,
      data: { url: payload.url || '/dashboard', ...payload.data },
    })

    for (const sub of allSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notifPayload,
        )
        sent++
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id)
        }
        failed++
      }
    }

    if (staleIds.length > 0) {
      await this.db
        .withSchema(tenantSchema)
        .table('push_subscriptions')
        .whereIn('id', staleIds)
        .delete()
    }

    return { sent, failed }
  }

  getVapidPublicKey() {
    return vapidPublicKey
  }
}
