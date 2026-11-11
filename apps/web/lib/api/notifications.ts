import { apiClient } from './client'

export interface PushSubscription {
  id: string
  endpoint: string
  user_agent: string | null
  created_at: string
}

export interface SendNotificationPayload {
  title: string
  body: string
  url?: string
  tag?: string
  targetUserId?: string
  targetRole?: string
}

export async function getVapidPublicKey(): Promise<string> {
  const res = await apiClient.get('/notifications/vapid-key')
  return res.data.vapidPublicKey
}

export async function subscribeNotification(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const res = await apiClient.post('/notifications/subscribe', subscription)
  return res.data
}

export async function unsubscribeNotification(endpoint: string) {
  const res = await apiClient.post('/notifications/unsubscribe', { endpoint })
  return res.data
}

export async function getMySubscriptions(): Promise<PushSubscription[]> {
  const res = await apiClient.get('/notifications/subscriptions')
  return res.data
}

export async function sendNotification(payload: SendNotificationPayload) {
  const res = await apiClient.post('/notifications/send', payload)
  return res.data
}

export async function testPushNotification() {
  const res = await apiClient.post('/notifications/test')
  return res.data
}
