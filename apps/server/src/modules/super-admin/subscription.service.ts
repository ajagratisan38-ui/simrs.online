import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'
import { generateInvoicePdf } from './invoice.service'

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
  created_at: string
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
  created_by: string | null
  created_at: string
  tenant_name?: string
  plan_name?: string
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
  usage: {
    users: number
    patients: number
    doctors: number
  }
  status: 'active' | 'trial' | 'expiring_soon' | 'expired' | 'suspended'
  days_remaining: number | null
}

export interface CreateTransactionInput {
  tenant_id: string
  plan_code: string
  amount: number
  payment_method: string
  payment_reference?: string
  notes?: string
  period: 'monthly' | 'yearly'
}

export interface PlanInput {
  code: string
  name: string
  description?: string
  price_monthly: number
  price_yearly?: number
  max_users: number
  max_patients: number
  max_doctors: number
  max_storage_gb: number
  allowed_modules: string[]
  trial_days?: number
  sort_order?: number
  is_public?: boolean
}

export class SubscriptionService {
  constructor(private db: Knex) {}

  // ==================== PLANS ====================

  async listPublicPlans(): Promise<SubscriptionPlan[]> {
    const rows = await this.db('subscription_plans')
      .where({ is_active: true, is_public: true })
      .orderBy('sort_order', 'asc')
    return rows.map(this.formatPlan)
  }

  async listPlans(includeInactive = false): Promise<SubscriptionPlan[]> {
    const query = this.db('subscription_plans').orderBy('sort_order', 'asc')
    if (!includeInactive) {
      query.where({ is_active: true })
    }
    const rows = await query
    return rows.map(this.formatPlan)
  }

  async getPlan(id: string): Promise<SubscriptionPlan> {
    const row = await this.db('subscription_plans').where({ id }).first()
    if (!row) throw new NotFoundError('Plan')
    return this.formatPlan(row)
  }

  async getPlanByCode(code: string): Promise<SubscriptionPlan> {
    const row = await this.db('subscription_plans').where({ code }).first()
    if (!row) throw new NotFoundError('Plan')
    return this.formatPlan(row)
  }

  async createPlan(input: PlanInput): Promise<SubscriptionPlan> {
    const existing = await this.db('subscription_plans').where({ code: input.code }).first()
    if (existing) throw new ValidationError(`Plan "${input.code}" sudah ada`)

    const [row] = await this.db('subscription_plans').insert({
      code: input.code.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name: input.name,
      description: input.description || null,
      price_monthly: input.price_monthly,
      price_yearly: input.price_yearly || null,
      max_users: input.max_users,
      max_patients: input.max_patients,
      max_doctors: input.max_doctors,
      max_storage_gb: input.max_storage_gb,
      allowed_modules: JSON.stringify(input.allowed_modules),
      trial_days: input.trial_days || 0,
      sort_order: input.sort_order ?? 99,
      is_active: true,
      is_public: input.is_public ?? true,
    }).returning('*')

    logger.info('Subscription plan created', { code: input.code })
    return this.formatPlan(row)
  }

  async updatePlan(id: string, input: Partial<PlanInput>): Promise<SubscriptionPlan> {
    const plan = await this.db('subscription_plans').where({ id }).first()
    if (!plan) throw new NotFoundError('Plan')

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.price_monthly !== undefined) updateData.price_monthly = input.price_monthly
    if (input.price_yearly !== undefined) updateData.price_yearly = input.price_yearly
    if (input.max_users !== undefined) updateData.max_users = input.max_users
    if (input.max_patients !== undefined) updateData.max_patients = input.max_patients
    if (input.max_doctors !== undefined) updateData.max_doctors = input.max_doctors
    if (input.max_storage_gb !== undefined) updateData.max_storage_gb = input.max_storage_gb
    if (input.allowed_modules !== undefined) {
      updateData.allowed_modules = JSON.stringify(input.allowed_modules)
    }
    if (input.trial_days !== undefined) updateData.trial_days = input.trial_days
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
    if (input.is_public !== undefined) updateData.is_public = input.is_public

    const [row] = await this.db('subscription_plans')
      .where({ id })
      .update(updateData)
      .returning('*')

    logger.info('Subscription plan updated', { planId: id })
    return this.formatPlan(row)
  }

  async togglePlan(id: string, isActive: boolean): Promise<void> {
    const plan = await this.db('subscription_plans').where({ id }).first()
    if (!plan) throw new NotFoundError('Plan')
    await this.db('subscription_plans').where({ id }).update({ is_active: isActive })
  }

  async deletePlan(id: string): Promise<void> {
    const plan = await this.db('subscription_plans').where({ id }).first()
    if (!plan) throw new NotFoundError('Plan')

    const tenantsUsing = await this.db('tenants').where({ plan_id: id }).count('* as cnt').first()
    if (Number(tenantsUsing?.cnt) > 0) {
      throw new ConflictError('Paket ini masih digunakan oleh tenant, nonaktifkan terlebih dahulu')
    }

    await this.db('subscription_plans').where({ id }).del()
  }

  // ==================== SUBSCRIPTIONS ====================

  async getTenantSubscription(tenantId: string): Promise<TenantSubscriptionDetail> {
    const tenant = await this.db('tenants').where({ id: tenantId }).first()
    if (!tenant) throw new NotFoundError('Tenant')

    let plan: SubscriptionPlan | null = null
    if (tenant.plan_id) {
      const planRow = await this.db('subscription_plans').where({ id: tenant.plan_id }).first()
      if (planRow) plan = this.formatPlan(planRow)
    }

    const schema = `tenant_${tenant.slug}`
    let usage = { users: 0, patients: 0, doctors: 0 }
    try {
      const [usersR, patientsR, doctorsR] = await Promise.all([
        this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."users" WHERE deleted_at IS NULL`),
        this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."patients" WHERE deleted_at IS NULL`),
        this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."users" WHERE role = 'dokter' AND deleted_at IS NULL`).catch(() => ({ rows: [{ cnt: 0 }] })),
      ])
      usage = {
        users: Number(usersR.rows[0]?.cnt || 0),
        patients: Number(patientsR.rows[0]?.cnt || 0),
        doctors: Number(doctorsR.rows[0]?.cnt || 0),
      }
    } catch {
      // schema might not exist
    }

    const now = new Date()
    const expires = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : null
    let daysRemaining: number | null = null
    let status: TenantSubscriptionDetail['status'] = 'active'

    if (!tenant.is_active) {
      status = 'suspended'
    } else if (tenant.subscription_plan === 'trial') {
      status = 'trial'
      if (expires) {
        daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysRemaining <= 0) status = 'expired'
      }
    } else if (expires) {
      daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysRemaining <= 0) status = 'expired'
      else if (daysRemaining <= 14) status = 'expiring_soon'
    }

    return {
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      slug: tenant.slug,
      plan,
      subscription_plan: tenant.subscription_plan,
      subscription_started_at: tenant.subscription_started_at,
      subscription_expires_at: tenant.subscription_expires_at,
      is_active: tenant.is_active,
      usage,
      status,
      days_remaining: daysRemaining,
    }
  }

  async renewSubscription(input: CreateTransactionInput, createdBy?: string): Promise<SubscriptionTransaction> {
    const tenant = await this.db('tenants').where({ id: input.tenant_id }).first()
    if (!tenant) throw new NotFoundError('Tenant')

    const plan = await this.getPlanByCode(input.plan_code)

    const now = new Date()
    const currentExpiry = tenant.subscription_expires_at
      ? new Date(tenant.subscription_expires_at)
      : now

    const startDate = currentExpiry > now ? currentExpiry : now
    const endDate = new Date(startDate)

    if (input.period === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    // Create transaction
    const [tx] = await this.db('subscription_transactions').insert({
      tenant_id: input.tenant_id,
      plan_id: plan.id,
      type: tenant.subscription_plan === plan.code ? 'renewal' : 'upgrade',
      amount: input.amount,
      payment_method: input.payment_method,
      payment_reference: input.payment_reference || null,
      notes: input.notes || null,
      period: input.period,
      period_start: startDate.toISOString(),
      period_end: endDate.toISOString(),
      status: 'paid',
      created_by: createdBy || null,
    }).returning('*')

    // Update tenant
    await this.db('tenants').where({ id: input.tenant_id }).update({
      plan_id: plan.id,
      subscription_plan: plan.code,
      subscription_started_at: tenant.subscription_started_at || now.toISOString(),
      subscription_expires_at: endDate.toISOString(),
      is_active: true,
    })

    logger.info('Subscription renewed', {
      tenantId: input.tenant_id,
      plan: plan.code,
      period: input.period,
      until: endDate.toISOString(),
    })

    // Generate invoice PDF
    try {
      const adminUser = await this.db
        .withSchema(`tenant_${tenant.slug}`)
        .select('email')
        .from('users')
        .where({ role: 'admin' })
        .first<{ email: string }>()

      await generateInvoicePdf(this.db, {
        namaRs: tenant.name,
        adminEmail: adminUser?.email || '',
        planName: plan.name,
        period: input.period,
        amount: input.amount,
        paymentMethod: input.payment_method,
        paymentReference: input.payment_reference,
        transactionDate: now,
      })
    } catch (err) {
      logger.error('Failed to generate invoice for renewal', {
        tenantId: input.tenant_id,
        error: String(err),
      })
    }

    return { ...tx, plan_name: plan.name, tenant_name: tenant.name }
  }

  async changePlan(tenantId: string, planCode: string): Promise<void> {
    const tenant = await this.db('tenants').where({ id: tenantId }).first()
    if (!tenant) throw new NotFoundError('Tenant')

    const plan = await this.getPlanByCode(planCode)

    await this.db('tenants').where({ id: tenantId }).update({
      plan_id: plan.id,
      subscription_plan: plan.code,
    })

    logger.info('Plan changed', { tenantId, from: tenant.subscription_plan, to: plan.code })
  }

  // ==================== TRANSACTIONS ====================

  async listTransactions(filters?: {
    tenant_id?: string
    limit?: number
    offset?: number
  }): Promise<{ data: SubscriptionTransaction[]; total: number }> {
    const query = this.db('subscription_transactions as st')
      .join('tenants as t', 'st.tenant_id', 't.id')
      .join('subscription_plans as sp', 'st.plan_id', 'sp.id')
      .select(
        'st.*',
        't.name as tenant_name',
        'sp.name as plan_name',
      )
      .orderBy('st.created_at', 'desc')

    const countQuery = this.db('subscription_transactions as st')

    if (filters?.tenant_id) {
      query.where('st.tenant_id', filters.tenant_id)
      countQuery.where('st.tenant_id', filters.tenant_id)
    }

    const [{ count }] = await countQuery.count('* as count')
    const total = Number(count)

    if (filters?.limit) query.limit(filters.limit)
    if (filters?.offset) query.offset(filters.offset)

    const rows = await query

    return { data: rows, total }
  }

  // ==================== ALERTS ====================

  async getExpiringTenants(withinDays = 30): Promise<TenantSubscriptionDetail[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + withinDays)

    const tenants = await this.db('tenants')
      .where('is_active', true)
      .where('subscription_expires_at', '<=', futureDate.toISOString())
      .where('subscription_expires_at', '>', new Date().toISOString())
      .orderBy('subscription_expires_at', 'asc')

    const results: TenantSubscriptionDetail[] = []
    for (const t of tenants) {
      const detail = await this.getTenantSubscription(t.id)
      results.push(detail)
    }
    return results
  }

  async getExpiredTenants(): Promise<TenantSubscriptionDetail[]> {
    const tenants = await this.db('tenants')
      .where('is_active', true)
      .where('subscription_expires_at', '<', new Date().toISOString())
      .orderBy('subscription_expires_at', 'asc')

    const results: TenantSubscriptionDetail[] = []
    for (const t of tenants) {
      const detail = await this.getTenantSubscription(t.id)
      results.push(detail)
    }
    return results
  }

  // ==================== PLATFORM STATS ====================

  async getPlatformStats(): Promise<{
    totalTenants: number
    activeTenants: number
    trialTenants: number
    expiredTenants: number
    mrr: number
    arr: number
    recentTransactions: SubscriptionTransaction[]
    planDistribution: { plan: string; count: number }[]
    expiringCount: number
  }> {
    const [totalR] = await this.db('tenants').count('* as cnt')
    const [activeR] = await this.db('tenants').where({ is_active: true })
      .where(function () {
        this.whereNull('subscription_expires_at')
          .orWhere('subscription_expires_at', '>', new Date().toISOString())
      })
      .count('* as cnt')
    const [trialR] = await this.db('tenants')
      .where({ subscription_plan: 'trial', is_active: true })
      .count('* as cnt')
    const [expiredR] = await this.db('tenants')
      .where('is_active', true)
      .where('subscription_expires_at', '<', new Date().toISOString())
      .count('* as cnt')

    // MRR: sum of monthly price of all active tenants with valid subscription
    const mrrResult = await this.db('tenants as t')
      .join('subscription_plans as sp', 't.plan_id', 'sp.id')
      .where('t.is_active', true)
      .where(function () {
        this.whereNull('t.subscription_expires_at')
          .orWhere('t.subscription_expires_at', '>', new Date().toISOString())
      })
      .sum('sp.price_monthly as total')
    const mrr = Number(mrrResult[0]?.total || 0)

    // Recent transactions
    const recentTx = await this.db('subscription_transactions as st')
      .join('tenants as t', 'st.tenant_id', 't.id')
      .join('subscription_plans as sp', 'st.plan_id', 'sp.id')
      .select('st.*', 't.name as tenant_name', 'sp.name as plan_name')
      .orderBy('st.created_at', 'desc')
      .limit(10)

    // Plan distribution
    const distRows = await this.db('tenants')
      .select('subscription_plan as plan')
      .count('* as count')
      .where('is_active', true)
      .groupBy('subscription_plan')
      .orderBy('count', 'desc')

    // Expiring within 14 days
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 14)
    const [expiringR] = await this.db('tenants')
      .where('is_active', true)
      .where('subscription_expires_at', '<=', futureDate.toISOString())
      .where('subscription_expires_at', '>', new Date().toISOString())
      .count('* as cnt')

    return {
      totalTenants: Number(totalR.cnt),
      activeTenants: Number(activeR.cnt),
      trialTenants: Number(trialR.cnt),
      expiredTenants: Number(expiredR.cnt),
      mrr,
      arr: mrr * 12,
      recentTransactions: recentTx,
      planDistribution: distRows.map((r: { plan: string; count: string }) => ({
        plan: r.plan,
        count: Number(r.count),
      })),
      expiringCount: Number(expiringR.cnt),
    }
  }

  // ==================== HELPERS ====================

  private formatPlan(row: Record<string, unknown>): SubscriptionPlan {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      description: row.description as string | null,
      price_monthly: Number(row.price_monthly),
      price_yearly: row.price_yearly ? Number(row.price_yearly) : null,
      max_users: Number(row.max_users),
      max_patients: Number(row.max_patients),
      max_doctors: Number(row.max_doctors),
      max_storage_gb: Number(row.max_storage_gb),
      allowed_modules: typeof row.allowed_modules === 'string'
        ? JSON.parse(row.allowed_modules)
        : (row.allowed_modules as string[]),
      trial_days: Number(row.trial_days),
      sort_order: Number(row.sort_order),
      is_active: row.is_active as boolean,
      is_public: row.is_public as boolean,
      created_at: row.created_at as string,
    }
  }
}
