'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, BellRing, Loader2, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function getApiUrl(): Promise<string> {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
}

export function NotificationToggle({ className }: { className?: string }) {
  const { token } = useAuthStore()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window

    setSupported(isSupported)

    if (isSupported) {
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  const checkSubscription = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {
      setSubscribed(false)
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) return
    setLoading(true)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        setLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const apiUrl = await getApiUrl()
      const subJson = sub.toJSON()

      await fetch(`${apiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || '',
          },
        }),
      })

      setSubscribed(true)
    } catch (err) {
      console.error('Push subscription failed:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (sub) {
        const apiUrl = await getApiUrl()
        await fetch(`${apiUrl}/notifications/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })

        await sub.unsubscribe()
      }

      setSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  if (!supported || !VAPID_PUBLIC_KEY) return null

  if (permission === 'denied') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground',
          className,
        )}
        title="Notifikasi diblokir oleh browser. Ubah di pengaturan browser."
      >
        <BellOff className="h-4 w-4 text-red-400" />
        <span>Notifikasi diblokir</span>
      </div>
    )
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm transition-colors w-full',
        subscribed
          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
          : 'text-muted-foreground hover:bg-accent',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <BellRing className="h-4 w-4 text-emerald-500" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      <span className="flex-1 text-left">
        {loading
          ? 'Memproses...'
          : subscribed
            ? 'Notifikasi Aktif'
            : 'Aktifkan Notifikasi'}
      </span>
      {subscribed && !loading && <Check className="h-3.5 w-3.5 text-emerald-500" />}
    </button>
  )
}
