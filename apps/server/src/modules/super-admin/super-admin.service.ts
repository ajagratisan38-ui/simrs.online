import bcrypt from 'bcryptjs'
import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors'
import { getPlatformTimezone } from '../../shared/timezone'

const SALT_ROUNDS = 12

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

export class SuperAdminService {
  constructor(private db: Knex) {}

  async isSuperAdmin(email: string): Promise<boolean> {
    const row = await this.db('super_admins').where({ email }).first()
    return !!row
  }

  async listTenants(): Promise<TenantListItem[]> {
    const tenants = await this.db('tenants')
      .select('*')
      .orderBy('created_at', 'desc')

    const results: TenantListItem[] = []

    for (const t of tenants) {
      let stats = { totalUsers: 0, totalPatients: 0, totalDoctors: 0 }
      let admin: TenantListItem['admin'] = null
      const schema = `tenant_${t.slug}`

      try {
        const [usersResult, patientsResult, doctorsResult, adminResult] = await Promise.all([
          this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."users" WHERE deleted_at IS NULL`),
          this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."patients" WHERE deleted_at IS NULL`),
          this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."users" WHERE role = 'dokter' AND deleted_at IS NULL`).catch(() => ({ rows: [{ cnt: 0 }] })),
          this.db.raw(
            `SELECT name, email, phone FROM "${schema}"."users" WHERE role = 'admin' AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`,
          ),
        ])
        stats = {
          totalUsers: Number(usersResult.rows[0]?.cnt || 0),
          totalPatients: Number(patientsResult.rows[0]?.cnt || 0),
          totalDoctors: Number(doctorsResult.rows[0]?.cnt || 0),
        }
        if (adminResult.rows[0]) {
          admin = {
            name: adminResult.rows[0].name,
            email: adminResult.rows[0].email,
            phone: adminResult.rows[0].phone || null,
          }
        }
      } catch {
        // schema might not exist yet
      }

      results.push({
        id: t.id,
        name: t.name,
        slug: t.slug,
        address: t.address || null,
        email: t.email,
        phone: t.phone,
        logo_url: t.logo_url || null,
        subscription_plan: t.subscription_plan,
        subscription_started_at: t.subscription_started_at || null,
        subscription_expires_at: t.subscription_expires_at,
        is_active: t.is_active,
        created_at: t.created_at,
        stats,
        admin,
      })
    }

    return results
  }

  async createTenant(input: CreateTenantInput): Promise<TenantListItem> {
    const { name, slug, address, phone, email, subscription_plan, admin_name, admin_email, admin_password } = input

    // Validate slug format
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    if (cleanSlug.length < 3) {
      throw new ValidationError('Slug minimal 3 karakter (huruf kecil, angka, strip)')
    }

    // Check duplicate slug
    const existing = await this.db('tenants').where({ slug: cleanSlug }).first()
    if (existing) {
      throw new ConflictError(`Tenant dengan slug "${cleanSlug}" sudah ada`)
    }

    // Check duplicate admin email across all tenants
    const schemas = await this.db('tenants').select('slug')
    for (const s of schemas) {
      try {
        const existingUser = await this.db
          .withSchema(`tenant_${s.slug}`)
          .select('id')
          .from('users')
          .where({ email: admin_email })
          .first()
        if (existingUser) {
          throw new ConflictError(`Email admin "${admin_email}" sudah digunakan di tenant lain`)
        }
      } catch (err) {
        if (err instanceof ConflictError) throw err
        // schema might not exist
      }
    }

    // 1. Resolve subscription plan
    const planCode = subscription_plan || 'trial'
    const plan = await this.db('subscription_plans').where({ code: planCode }).first()
    const isTrial = plan ? plan.trial_days > 0 : planCode === 'trial'

    const now = new Date()
    let expiresAt: Date

    if (isTrial) {
      // Trial: gratis, langsung aktif selama trial_days
      expiresAt = new Date(now)
      expiresAt.setDate(expiresAt.getDate() + (plan?.trial_days || 30))
    } else {
      // Paket berbayar: expires = sekarang (belum aktif sampai bayar)
      expiresAt = new Date(now)
    }

    // 2. Create tenant record
    const [tenant] = await this.db('tenants')
      .insert({
        name,
        slug: cleanSlug,
        address: address || null,
        phone: phone || null,
        email: email || null,
        subscription_plan: planCode,
        plan_id: plan?.id || null,
        subscription_started_at: now.toISOString(),
        subscription_expires_at: expiresAt.toISOString(),
        is_active: true,
        settings: JSON.stringify({
          timezone: await getPlatformTimezone(),
          locale: 'id-ID',
          currency: 'IDR',
        }),
      })
      .returning('*')

    // 2. Create tenant schema with all tables
    try {
      await this.db.raw('SELECT create_tenant_schema(?)', [cleanSlug])

      // Safety net: explicitly provision extensions
      try {
        await this.db.raw('SELECT provision_tenant_extensions(?)', [cleanSlug])
      } catch {
        const schemaName = `tenant_${cleanSlug}`
        try { await this.db.raw('SELECT add_asset_tables(?)', [cleanSlug]) } catch { /* noop */ }
        try { await this.db.raw('SELECT add_inpatient_clinical_tables(?)', [schemaName]) } catch { /* noop */ }
        try { await this.db.raw('SELECT add_doctor_status(?)', [cleanSlug]) } catch { /* noop */ }
      }
    } catch (err) {
      // Rollback tenant record if schema creation fails
      await this.db('tenants').where({ id: tenant.id }).del()
      throw new ValidationError(
        `Gagal membuat schema database: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    // 3. Create admin user in new schema
    const schema = `tenant_${cleanSlug}`
    const passwordHash = await bcrypt.hash(admin_password, SALT_ROUNDS)

    await this.db.withSchema(schema).insert({
      email: admin_email,
      password_hash: passwordHash,
      name: admin_name,
      role: 'admin',
      is_active: true,
    }).into('users')

    // 4. Record initial transaction
    if (plan) {
      if (isTrial) {
        // Trial: catat sebagai paid, gratis
        await this.db('subscription_transactions').insert({
          tenant_id: tenant.id,
          plan_id: plan.id,
          type: 'trial',
          amount: 0,
          payment_method: 'free',
          payment_reference: null,
          notes: `Trial ${plan.trial_days} hari`,
          period: 'monthly',
          period_start: now.toISOString(),
          period_end: expiresAt.toISOString(),
          status: 'paid',
          created_by: null,
        })
      } else {
        // Paket berbayar: catat sebagai pending, menunggu pembayaran
        await this.db('subscription_transactions').insert({
          tenant_id: tenant.id,
          plan_id: plan.id,
          type: 'new',
          amount: Number(plan.price_monthly),
          payment_method: 'pending',
          payment_reference: null,
          notes: `Menunggu pembayaran paket ${plan.name}`,
          period: 'monthly',
          period_start: now.toISOString(),
          period_end: now.toISOString(),
          status: 'pending',
          created_by: null,
        })
      }
    }

    logger.info('New tenant created', { tenantId: tenant.id, slug: cleanSlug, plan: planCode })

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      address: tenant.address || null,
      email: tenant.email,
      phone: tenant.phone,
      logo_url: tenant.logo_url || null,
      subscription_plan: tenant.subscription_plan,
      subscription_started_at: tenant.subscription_started_at || null,
      subscription_expires_at: tenant.subscription_expires_at,
      is_active: tenant.is_active,
      created_at: tenant.created_at,
      stats: { totalUsers: 1, totalPatients: 0, totalDoctors: 0 },
      admin: { name: admin_name, email: admin_email, phone: null },
    }
  }

  async toggleTenant(tenantId: string, isActive: boolean): Promise<void> {
    const tenant = await this.db('tenants').where({ id: tenantId }).first()
    if (!tenant) {
      throw new NotFoundError('Tenant')
    }

    await this.db('tenants').where({ id: tenantId }).update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })

    logger.info(`Tenant ${isActive ? 'activated' : 'deactivated'}`, {
      tenantId,
      slug: tenant.slug,
    })
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.db('tenants').where({ id: tenantId }).first()
    if (!tenant) {
      throw new NotFoundError('Tenant')
    }

    // Drop schema
    try {
      await this.db.raw('SELECT drop_tenant_schema(?)', [tenant.slug])
    } catch (err) {
      logger.warn('Failed to drop tenant schema', {
        slug: tenant.slug,
        error: String(err),
      })
    }

    // Delete tenant record
    await this.db('tenants').where({ id: tenantId }).del()

    logger.info('Tenant deleted', { tenantId, slug: tenant.slug })
  }

  // ==================== TENANT DETAIL ====================

  async getTenantDetail(tenantId: string): Promise<TenantDetail> {
    const tenant = await this.db('tenants').where({ id: tenantId }).first()
    if (!tenant) throw new NotFoundError('Tenant')

    const schema = `tenant_${tenant.slug}`
    let users: TenantUser[] = []
    let stats = { totalUsers: 0, totalPatients: 0, totalDoctors: 0, totalVisits: 0, totalBills: 0 }
    let lastLogin: string | null = null

    try {
      const userRows = await this.db.raw(
        `SELECT id, name, email, role, is_active, last_login_at, created_at
         FROM "${schema}"."users" WHERE deleted_at IS NULL ORDER BY created_at ASC`,
      )
      users = userRows.rows || []

      const [usersR, patientsR, doctorsR, visitsR, billsR] = await Promise.all([
        this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."users" WHERE deleted_at IS NULL`),
        this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."patients" WHERE deleted_at IS NULL`),
        this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."users" WHERE role = 'dokter' AND deleted_at IS NULL`).catch(() => ({ rows: [{ cnt: 0 }] })),
        this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."visits" WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ cnt: 0 }] })),
        this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."bills"`).catch(() => ({ rows: [{ cnt: 0 }] })),
      ])
      stats = {
        totalUsers: Number(usersR.rows[0]?.cnt || 0),
        totalPatients: Number(patientsR.rows[0]?.cnt || 0),
        totalDoctors: Number(doctorsR.rows[0]?.cnt || 0),
        totalVisits: Number(visitsR.rows[0]?.cnt || 0),
        totalBills: Number(billsR.rows[0]?.cnt || 0),
      }

      const lastLoginRow = await this.db.raw(
        `SELECT MAX(last_login_at) as ll FROM "${schema}"."users"`,
      )
      lastLogin = lastLoginRow.rows[0]?.ll || null
    } catch {
      // schema might not exist
    }

    // Subscription history
    const subscriptionHistory = await this.db('subscription_transactions')
      .where({ tenant_id: tenantId })
      .join('subscription_plans', 'subscription_transactions.plan_id', 'subscription_plans.id')
      .select(
        'subscription_transactions.*',
        'subscription_plans.name as plan_name',
      )
      .orderBy('subscription_transactions.created_at', 'desc')
      .limit(20)

    // Plan info
    let plan = null
    if (tenant.plan_id) {
      plan = await this.db('subscription_plans').where({ id: tenant.plan_id }).first()
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      address: tenant.address,
      email: tenant.email,
      phone: tenant.phone,
      logo_url: tenant.logo_url,
      subscription_plan: tenant.subscription_plan,
      subscription_started_at: tenant.subscription_started_at,
      subscription_expires_at: tenant.subscription_expires_at,
      is_active: tenant.is_active,
      onboarding_completed: tenant.onboarding_completed,
      last_login_at: lastLogin,
      created_at: tenant.created_at,
      plan: plan ? {
        id: plan.id, code: plan.code, name: plan.name,
        price_monthly: Number(plan.price_monthly),
        max_users: Number(plan.max_users),
        max_patients: Number(plan.max_patients),
        max_doctors: Number(plan.max_doctors),
      } : null,
      stats,
      users,
      subscriptionHistory,
    }
  }

  // ==================== MONITORING ====================

  async getMonitoringData(): Promise<MonitoringData> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // All tenants with health info
    const tenants = await this.db('tenants')
      .select('id', 'name', 'slug', 'is_active', 'subscription_expires_at', 'created_at')
      .orderBy('created_at', 'desc')

    const tenantHealth: TenantHealthItem[] = []

    for (const t of tenants) {
      const schema = `tenant_${t.slug}`
      let lastLogin: string | null = null
      let userCount = 0
      let patientCount = 0
      let errorRate = 0

      try {
        const llRow = await this.db.raw(
          `SELECT MAX(last_login_at) as ll FROM "${schema}"."users"`,
        )
        lastLogin = llRow.rows[0]?.ll || null

        const [uR, pR] = await Promise.all([
          this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."users" WHERE deleted_at IS NULL`),
          this.db.raw(`SELECT COUNT(*) as cnt FROM "${schema}"."patients" WHERE deleted_at IS NULL`),
        ])
        userCount = Number(uR.rows[0]?.cnt || 0)
        patientCount = Number(pR.rows[0]?.cnt || 0)
      } catch {
        // schema might not exist
      }

      const daysSinceLogin = lastLogin
        ? Math.floor((now.getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
        : null

      tenantHealth.push({
        id: t.id,
        name: t.name,
        slug: t.slug,
        is_active: t.is_active,
        subscription_expires_at: t.subscription_expires_at,
        last_login: lastLogin,
        days_since_login: daysSinceLogin,
        user_count: userCount,
        patient_count: patientCount,
        abandoned: daysSinceLogin !== null && daysSinceLogin > 30,
        error_rate: errorRate,
      })
    }

    // DB stats
    let dbSize = '0 MB'
    let dbConnections = 0
    try {
      const sizeR = await this.db.raw(
        `SELECT pg_size_pretty(pg_database_size(current_database())) as size`,
      )
      dbSize = sizeR.rows[0]?.size || '0 MB'

      const connR = await this.db.raw(
        `SELECT count(*) as cnt FROM pg_stat_activity WHERE datname = current_database()`,
      )
      dbConnections = Number(connR.rows[0]?.cnt || 0)
    } catch { /* noop */ }

    // Backup status
    let lastBackup: string | null = null
    let backupCount = 0
    try {
      const bkR = await this.db('backup_logs')
        .where({ status: 'completed' })
        .orderBy('created_at', 'desc')
        .first()
      lastBackup = bkR?.created_at || null
      const [bkCount] = await this.db('backup_logs').count('* as cnt')
      backupCount = Number(bkCount.cnt)
    } catch { /* table might not exist */ }

    // Tenant growth (last 6 months)
    const tenantGrowth: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const [r] = await this.db('tenants')
        .where('created_at', '>=', start.toISOString())
        .where('created_at', '<=', end.toISOString())
        .count('* as cnt')
      tenantGrowth.push({
        month: start.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        count: Number(r.cnt),
      })
    }

    // Revenue trend (last 6 months)
    const revenueTrend: { month: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const [r] = await this.db('subscription_transactions')
        .where('created_at', '>=', start.toISOString())
        .where('created_at', '<=', end.toISOString())
        .where('status', 'paid')
        .sum('amount as total')
      revenueTrend.push({
        month: start.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        amount: Number(r.total || 0),
      })
    }

    return {
      system: {
        db_size: dbSize,
        db_connections: dbConnections,
        last_backup: lastBackup,
        backup_count: backupCount,
      },
      tenantHealth,
      abandonedCount: tenantHealth.filter((t) => t.abandoned).length,
      tenantGrowth,
      revenueTrend,
    }
  }

  // ==================== SUPER ADMIN MANAGEMENT ====================

  async listSuperAdmins(): Promise<SuperAdminUser[]> {
    const rows = await this.db('super_admins')
      .select('*')
      .orderBy('created_at', 'asc')
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      email: r.email as string,
      name: r.name as string || (r.email as string),
      role: (r.sa_role as string) || 'operator',
      is_active: r.is_active as boolean,
      last_login_at: r.last_login_at as string | null,
      created_at: r.created_at as string,
    }))
  }

  async createSuperAdmin(input: {
    email: string
    name: string
    password: string
    sa_role?: string
  }): Promise<SuperAdminUser> {
    const existing = await this.db('super_admins').where({ email: input.email }).first()
    if (existing) throw new ConflictError(`Super admin ${input.email} sudah ada`)

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)
    const [row] = await this.db('super_admins').insert({
      email: input.email,
      name: input.name,
      password_hash: passwordHash,
      sa_role: input.sa_role || 'operator',
      is_active: true,
    }).returning('*')

    logger.info('Super admin created', { email: input.email })

    return {
      id: row.id,
      email: row.email,
      name: row.name || row.email,
      role: row.sa_role || 'operator',
      is_active: row.is_active,
      last_login_at: row.last_login_at,
      created_at: row.created_at,
    }
  }

  async toggleSuperAdmin(id: string, isActive: boolean): Promise<void> {
    const sa = await this.db('super_admins').where({ id }).first()
    if (!sa) throw new NotFoundError('Super Admin')
    await this.db('super_admins').where({ id }).update({ is_active: isActive })
    logger.info(`Super admin ${isActive ? 'activated' : 'deactivated'}`, { id })
  }

  async deleteSuperAdmin(id: string): Promise<void> {
    const sa = await this.db('super_admins').where({ id }).first()
    if (!sa) throw new NotFoundError('Super Admin')
    const [count] = await this.db('super_admins').where({ is_active: true }).count('* as cnt')
    if (Number(count.cnt) <= 1) {
      throw new ValidationError('Tidak bisa menghapus super admin terakhir')
    }
    await this.db('super_admins').where({ id }).del()
    logger.info('Super admin deleted', { id, email: sa.email })
  }

  // ==================== PAYMENTS (dedicated) ====================

  async getPaymentsPending(): Promise<PendingPayment[]> {
    const regs = await this.db('tenant_registrations')
      .whereIn('status', ['payment_pending', 'payment_uploaded'])
      .orderBy('created_at', 'desc')

    return regs.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      nama_rs: r.nama_rs as string,
      requested_slug: r.requested_slug as string,
      admin_name: r.admin_name as string,
      admin_email: r.admin_email as string,
      plan_code: r.plan_code as string,
      status: r.status as string,
      payment_proof_url: r.payment_proof_url as string | null,
      payment_verified_at: r.payment_verified_at as string | null,
      total_amount: Number(r.total_amount || 0),
      created_at: r.created_at as string,
    }))
  }

  async getRevenueSummary(): Promise<RevenueSummary> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [dailyR] = await this.db('subscription_transactions')
      .where('status', 'paid')
      .where('created_at', '>=', todayStart.toISOString())
      .sum('amount as total')

    const [weeklyR] = await this.db('subscription_transactions')
      .where('status', 'paid')
      .where('created_at', '>=', weekStart.toISOString())
      .sum('amount as total')

    const [monthlyR] = await this.db('subscription_transactions')
      .where('status', 'paid')
      .where('created_at', '>=', monthStart.toISOString())
      .sum('amount as total')

    const [totalR] = await this.db('subscription_transactions')
      .where('status', 'paid')
      .sum('amount as total')

    return {
      daily: Number(dailyR.total || 0),
      weekly: Number(weeklyR.total || 0),
      monthly: Number(monthlyR.total || 0),
      total: Number(totalR.total || 0),
    }
  }
}

// ==================== TYPES ====================

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

export interface TenantUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
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

export interface SuperAdminUser {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

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
