import { apiClient } from './client'

// ==================== TYPES ====================

export interface TenantListItem {
  id: string
  name: string
  slug: string
  address: string | null
  email: string | null
  phone: string | null
  logo_url: string | null
  subscription_plan: string
  subscription_started_at: string | null
  subscription_expires_at: string | null
  is_active: boolean
  created_at: string
  stats?: {
    totalUsers: number
    totalPatients: number
    totalDoctors: number
  }
  admin?: {
    name: string
    email: string
    phone: string | null
  } | null
}

export interface CreateTenantInput {
  name: string
  slug: string
  address?: string
  phone?: string
  email?: string
  subscription_plan?: string
  admin_name: string
  admin_email: string
  admin_password: string
}

export interface SubscriptionPlan {
  id: string
  code: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number | null
  max_users: number
  max_patients: number
  max_doctors: number
  max_storage_gb: number
  allowed_modules: string[]
  trial_days: number
  sort_order: number
  is_active: boolean
  is_public: boolean
}

export interface TenantSubscriptionDetail {
  tenant_id: string
  tenant_name: string
  slug: string
  plan: SubscriptionPlan | null
  subscription_plan: string
  subscription_started_at: string | null
  subscription_expires_at: string | null
  is_active: boolean
  usage: { users: number; patients: number; doctors: number }
  status: 'active' | 'trial' | 'expiring_soon' | 'expired' | 'suspended'
  days_remaining: number | null
}

export interface SubscriptionTransaction {
  id: string
  tenant_id: string
  plan_id: string
  type: string
  amount: number
  payment_method: string | null
  payment_reference: string | null
  notes: string | null
  period: string
  period_start: string
  period_end: string
  status: string
  created_at: string
  tenant_name?: string
  plan_name?: string
}

export interface PlatformStats {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  expiredTenants: number
  mrr: number
  arr: number
  recentTransactions: SubscriptionTransaction[]
  planDistribution: { plan: string; count: number }[]
  expiringCount: number
}

export interface RenewInput {
  tenant_id: string
  plan_code: string
  amount: number
  payment_method: string
  payment_reference?: string
  notes?: string
  period: 'monthly' | 'yearly'
}

// ==================== TENANT MANAGEMENT ====================

export async function listTenants(): Promise<TenantListItem[]> {
  const res = await apiClient<{ success: boolean; data: TenantListItem[] }>(
    '/super-admin/tenants',
  )
  return res.data
}

export async function createTenant(input: CreateTenantInput): Promise<TenantListItem> {
  const res = await apiClient<{ success: boolean; data: TenantListItem }>(
    '/super-admin/tenants',
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data
}

export async function toggleTenant(id: string, isActive: boolean): Promise<void> {
  await apiClient(`/super-admin/tenants/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
}

export async function deleteTenant(id: string): Promise<void> {
  await apiClient(`/super-admin/tenants/${id}`, { method: 'DELETE' })
}

// ==================== PLATFORM STATS ====================

export async function getPlatformStats(): Promise<PlatformStats> {
  const res = await apiClient<{ success: boolean; data: PlatformStats }>(
    '/super-admin/stats',
  )
  return res.data
}

// ==================== PLANS ====================

export async function listPlans(includeInactive = false): Promise<SubscriptionPlan[]> {
  const qs = includeInactive ? '?includeInactive=true' : ''
  const res = await apiClient<{ success: boolean; data: SubscriptionPlan[] }>(
    `/super-admin/plans${qs}`,
  )
  return res.data
}

export async function createPlan(input: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  const res = await apiClient<{ success: boolean; data: SubscriptionPlan }>(
    '/super-admin/plans',
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data
}

export async function updatePlan(id: string, input: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  const res = await apiClient<{ success: boolean; data: SubscriptionPlan }>(
    `/super-admin/plans/${id}`,
    { method: 'PUT', body: JSON.stringify(input) },
  )
  return res.data
}

export async function togglePlan(id: string, isActive: boolean): Promise<void> {
  await apiClient(`/super-admin/plans/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
}

export async function deletePlan(id: string): Promise<void> {
  await apiClient(`/super-admin/plans/${id}`, {
    method: 'DELETE',
  })
}

// ==================== SUBSCRIPTIONS ====================

export async function getTenantSubscription(tenantId: string): Promise<TenantSubscriptionDetail> {
  const res = await apiClient<{ success: boolean; data: TenantSubscriptionDetail }>(
    `/super-admin/tenants/${tenantId}/subscription`,
  )
  return res.data
}

export async function changeTenantPlan(tenantId: string, planCode: string): Promise<void> {
  await apiClient(`/super-admin/tenants/${tenantId}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ plan_code: planCode }),
  })
}

// ==================== TRANSACTIONS ====================

export async function renewSubscription(input: RenewInput): Promise<SubscriptionTransaction> {
  const res = await apiClient<{ success: boolean; data: SubscriptionTransaction }>(
    '/super-admin/transactions',
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data
}

export async function listTransactions(tenantId?: string): Promise<SubscriptionTransaction[]> {
  const qs = tenantId ? `?tenant_id=${tenantId}` : ''
  const res = await apiClient<{ success: boolean; data: SubscriptionTransaction[] }>(
    `/super-admin/transactions${qs}`,
  )
  return res.data
}

// ==================== ALERTS ====================

export async function getExpiringTenants(days = 30): Promise<TenantSubscriptionDetail[]> {
  const res = await apiClient<{ success: boolean; data: TenantSubscriptionDetail[] }>(
    `/super-admin/alerts/expiring?days=${days}`,
  )
  return res.data
}

// ==================== TENANT DETAIL ====================

export interface TenantUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface TenantDetail {
  id: string
  name: string
  slug: string
  address: string | null
  email: string | null
  phone: string | null
  logo_url: string | null
  subscription_plan: string
  subscription_started_at: string | null
  subscription_expires_at: string | null
  is_active: boolean
  onboarding_completed: boolean
  last_login_at: string | null
  created_at: string
  plan: {
    id: string
    code: string
    name: string
    price_monthly: number
    max_users: number
    max_patients: number
    max_doctors: number
  } | null
  stats: {
    totalUsers: number
    totalPatients: number
    totalDoctors: number
    totalVisits: number
    totalBills: number
  }
  users: TenantUser[]
  subscriptionHistory: Record<string, unknown>[]
}

export async function getTenantDetail(tenantId: string): Promise<TenantDetail> {
  const res = await apiClient<{ success: boolean; data: TenantDetail }>(
    `/super-admin/tenants/${tenantId}/detail`,
  )
  return res.data
}

// ==================== MONITORING ====================

export interface TenantHealthItem {
  id: string
  name: string
  slug: string
  is_active: boolean
  subscription_expires_at: string | null
  last_login: string | null
  days_since_login: number | null
  user_count: number
  patient_count: number
  abandoned: boolean
  error_rate: number
}

export interface MonitoringData {
  system: {
    db_size: string
    db_connections: number
    last_backup: string | null
    backup_count: number
  }
  tenantHealth: TenantHealthItem[]
  abandonedCount: number
  tenantGrowth: { month: string; count: number }[]
  revenueTrend: { month: string; amount: number }[]
}

export async function getMonitoringData(): Promise<MonitoringData> {
  const res = await apiClient<{ success: boolean; data: MonitoringData }>(
    '/super-admin/monitoring',
  )
  return res.data
}

// ==================== SUPER ADMIN MANAGEMENT ====================

export interface SuperAdminUser {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export async function listSuperAdmins(): Promise<SuperAdminUser[]> {
  const res = await apiClient<{ success: boolean; data: SuperAdminUser[] }>(
    '/super-admin/admins',
  )
  return res.data
}

export async function createSuperAdmin(input: {
  email: string
  name: string
  password: string
  sa_role?: string
}): Promise<SuperAdminUser> {
  const res = await apiClient<{ success: boolean; data: SuperAdminUser }>(
    '/super-admin/admins',
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data
}

export async function toggleSuperAdmin(id: string, isActive: boolean): Promise<void> {
  await apiClient(`/super-admin/admins/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  })
}

export async function deleteSuperAdmin(id: string): Promise<void> {
  await apiClient(`/super-admin/admins/${id}`, { method: 'DELETE' })
}

// ==================== PAYMENTS ====================

export interface PendingPayment {
  id: string
  nama_rs: string
  requested_slug: string
  admin_name: string
  admin_email: string
  plan_code: string
  status: string
  payment_proof_url: string | null
  payment_verified_at: string | null
  total_amount: number
  created_at: string
}

export interface RevenueSummary {
  daily: number
  weekly: number
  monthly: number
  total: number
}

export async function getPaymentsPending(): Promise<PendingPayment[]> {
  const res = await apiClient<{ success: boolean; data: PendingPayment[] }>(
    '/super-admin/payments/pending',
  )
  return res.data
}

export async function getRevenueSummary(): Promise<RevenueSummary> {
  const res = await apiClient<{ success: boolean; data: RevenueSummary }>(
    '/super-admin/payments/revenue',
  )
  return res.data
}
