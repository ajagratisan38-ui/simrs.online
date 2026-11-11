import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMySubscriptions,
  sendNotification,
  testPushNotification,
  type SendNotificationPayload,
} from '@/lib/api/notifications'

export function useMySubscriptions() {
  return useQuery({
    queryKey: ['push-subscriptions'],
    queryFn: getMySubscriptions,
    staleTime: 60_000,
  })
}

export function useSendNotification() {
  return useMutation({
    mutationFn: (payload: SendNotificationPayload) => sendNotification(payload),
  })
}

export function useTestPush() {
  return useMutation({
    mutationFn: testPushNotification,
  })
}

export function useRemoveSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (endpoint: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/unsubscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        },
      )
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] })
    },
  })
}
