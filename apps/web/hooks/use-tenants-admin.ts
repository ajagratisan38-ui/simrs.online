import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listTenants,
  createTenant,
  toggleTenant,
  deleteTenant,
  listPlans,
  createPlan,
  updatePlan,
  togglePlan,
  deletePlan,
  getPlatformStats,
  getTenantSubscription,
  renewSubscription,
  changeTenantPlan,
  listTransactions,
  getExpiringTenants,
  getTenantDetail,
  getMonitoringData,
  listSuperAdmins,
  createSuperAdmin,
  toggleSuperAdmin,
  deleteSuperAdmin,
  getPaymentsPending,
  getRevenueSummary,
  type CreateTenantInput,
  type RenewInput,
  type SubscriptionPlan,
} from '@/lib/api/super-admin'

// ==================== TENANTS ====================

export function useTenantsList() {
  return useQuery({
    queryKey: ['super-admin-tenants'],
    queryFn: listTenants,
    staleTime: 30_000,
  })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTenantInput) => createTenant(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
    },
  })
}

export function useToggleTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleTenant(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
    },
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
    },
  })
}

// ==================== PLATFORM STATS ====================

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: getPlatformStats,
    staleTime: 60_000,
  })
}

// ==================== PLANS ====================

export function usePlansList(includeInactive = false) {
  return useQuery({
    queryKey: ['subscription-plans', includeInactive],
    queryFn: () => listPlans(includeInactive),
    staleTime: 60_000,
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<SubscriptionPlan>) => createPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubscriptionPlan> }) =>
      updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
  })
}

export function useTogglePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePlan(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
    },
  })
}

// ==================== SUBSCRIPTIONS ====================

export function useTenantSubscription(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: () => getTenantSubscription(tenantId!),
    enabled: !!tenantId,
    staleTime: 30_000,
  })
}

export function useRenewSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RenewInput) => renewSubscription(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
    },
  })
}

export function useChangePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, planCode }: { tenantId: string; planCode: string }) =>
      changeTenantPlan(tenantId, planCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
    },
  })
}

// ==================== TRANSACTIONS ====================

export function useTransactions(tenantId?: string) {
  return useQuery({
    queryKey: ['transactions', tenantId],
    queryFn: () => listTransactions(tenantId),
    staleTime: 30_000,
  })
}

// ==================== ALERTS ====================

export function useExpiringTenants(days = 30) {
  return useQuery({
    queryKey: ['expiring-tenants', days],
    queryFn: () => getExpiringTenants(days),
    staleTime: 60_000,
  })
}

// ==================== TENANT DETAIL ====================

export function useTenantDetail(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant-detail', tenantId],
    queryFn: () => getTenantDetail(tenantId!),
    enabled: !!tenantId,
    staleTime: 30_000,
  })
}

// ==================== MONITORING ====================

export function useMonitoringData() {
  return useQuery({
    queryKey: ['monitoring'],
    queryFn: getMonitoringData,
    staleTime: 60_000,
  })
}

// ==================== SUPER ADMIN MANAGEMENT ====================

export function useSuperAdminsList() {
  return useQuery({
    queryKey: ['super-admins'],
    queryFn: listSuperAdmins,
    staleTime: 30_000,
  })
}

export function useCreateSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; name: string; password: string; sa_role?: string }) =>
      createSuperAdmin(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['super-admins'] }) },
  })
}

export function useToggleSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleSuperAdmin(id, isActive),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['super-admins'] }) },
  })
}

export function useDeleteSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSuperAdmin(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['super-admins'] }) },
  })
}

// ==================== PAYMENTS ====================

export function usePaymentsPending() {
  return useQuery({
    queryKey: ['payments-pending'],
    queryFn: getPaymentsPending,
    refetchInterval: 30_000,
  })
}

export function useRevenueSummary() {
  return useQuery({
    queryKey: ['revenue-summary'],
    queryFn: getRevenueSummary,
    staleTime: 60_000,
  })
}
