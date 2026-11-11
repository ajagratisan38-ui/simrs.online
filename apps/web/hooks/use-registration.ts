import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listRegistrations,
  getRegistration,
  getRegistrationStats,
  reviewRegistration,
  verifyPayment,
  retryProvision,
  getSettings,
  updateSettings,
  getActivityLog,
  listVisits,
  getVisit,
} from '@/lib/api/registration'

export function useRegistrations(params?: {
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['registrations', params],
    queryFn: () => listRegistrations(params),
    refetchInterval: 30_000,
  })
}

export function useRegistration(id: string) {
  return useQuery({
    queryKey: ['registration', id],
    queryFn: () => getRegistration(id),
    enabled: !!id,
  })
}

export function useRegistrationStats() {
  return useQuery({
    queryKey: ['registration-stats'],
    queryFn: getRegistrationStats,
    refetchInterval: 30_000,
  })
}

export function useReviewRegistration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      id: string
      action: 'approve' | 'reject'
      rejection_reason?: string
      notes?: string
    }) => reviewRegistration(params.id, {
      action: params.action,
      rejection_reason: params.rejection_reason,
      notes: params.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] })
      qc.invalidateQueries({ queryKey: ['registration-stats'] })
      qc.invalidateQueries({ queryKey: ['platform-stats'] })
    },
  })
}

export function useVerifyPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => verifyPayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] })
      qc.invalidateQueries({ queryKey: ['registration-stats'] })
    },
  })
}

export function useRetryProvision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => retryProvision(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations'] })
      qc.invalidateQueries({ queryKey: ['registration-stats'] })
    },
  })
}

export function usePlatformSettings(category?: string) {
  return useQuery({
    queryKey: ['platform-settings', category],
    queryFn: () => getSettings(category),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: Array<{ key: string; value: string }>) =>
      updateSettings(updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-settings'] })
    },
  })
}

export function useActivityLog(params?: {
  admin_id?: string
  action?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['activity-log', params],
    queryFn: () => getActivityLog(params),
  })
}

// ===== Visit hooks (patient visits / kunjungan) =====

export function useVisits(params?: {
  tanggal?: string
  status?: string
  patient_id?: string
  room_id?: string
  tipe?: string
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['visits', params],
    queryFn: () => listVisits(params),
    refetchInterval: 15_000,
  })
}

export function useVisit(id: string) {
  return useQuery({
    queryKey: ['visit', id],
    queryFn: () => getVisit(id),
    enabled: !!id,
  })
}
