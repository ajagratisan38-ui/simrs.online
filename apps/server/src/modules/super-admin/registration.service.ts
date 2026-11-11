import bcrypt from 'bcryptjs'
import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors'
import { getPlatformTimezone } from '../../shared/timezone'
import { sendEmail } from '../../shared/email'
import { generateInvoicePdf } from './invoice.service'
import {
  emailRegistrationActivated,
  emailPaymentInstructions,
  emailPaymentVerified,
  emailRsApproved,
  emailRsRejected,
  emailPaymentProofReceived,
  emailNewRegistrationNotif,
  emailSubscriptionExpiring,
} from '../../shared/email/templates'

const SALT_ROUNDS = 12

export interface RegistrationInput {
  nama_rs: string
  tipe_rs?: string
  alamat?: string
  provinsi?: string
  kota?: string
  no_telepon?: string
  email_rs?: string
  website?: string
  nomor_izin?: string
  admin_nama: string
  admin_jabatan?: string
  admin_email: string
  admin_phone?: string
  admin_password: string
  plan_code?: string
  billing_period?: string
  payment_method?: string
  payment_reference?: string
  payment_amount?: number
  requested_slug: string
  migrasi_requested?: boolean
  migrasi_source?: string
  migrasi_notes?: string
}

export interface RegistrationRecord {
  id: string
  nama_rs: string
  tipe_rs: string | null
  alamat: string | null
  provinsi: string | null
  kota: string | null
  no_telepon: string | null
  email_rs: string | null
  website: string | null
  nomor_izin: string | null
  admin_nama: string
  admin_jabatan: string | null
  admin_email: string
  admin_phone: string | null
  plan_code: string
  billing_period: string
  payment_method: string | null
  payment_reference: string | null
  payment_proof_url: string | null
  payment_amount: number
  payment_verified_at: string | null
  requested_slug: string
  tenant_id: string | null
  migrasi_requested: boolean
  migrasi_source: string | null
  migrasi_notes: string | null
  status: string
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  provisioned_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ReviewInput {
  action: 'approve' | 'reject'
  rejection_reason?: string
  notes?: string
}

export class RegistrationService {
  constructor(private db: Knex) {}

  async isRegistrationOpen(): Promise<boolean> {
    const row = await this.db('platform_settings')
      .where({ key: 'enable_self_registration' })
      .first()
    return row?.value !== 'false'
  }

  private async getPlatformDomain(): Promise<string> {
    const row = await this.db('platform_settings')
      .where({ key: 'primary_domain' })
      .first()
    return row?.value || 'simrs.id'
  }

  private async getBillingSettings(): Promise<{
    bankName: string
    bankAccountNumber: string
    bankAccountName: string
  }> {
    const rows = await this.db('platform_settings')
      .whereIn('key', ['bank_name', 'bank_account_number', 'bank_account_name'])
      .select('key', 'value')
    const m: Record<string, string> = {}
    for (const r of rows) m[r.key] = r.value || ''
    return {
      bankName: m.bank_name || '',
      bankAccountNumber: m.bank_account_number || '',
      bankAccountName: m.bank_account_name || '',
    }
  }

  private async getSuperAdminEmail(): Promise<string | null> {
    const row = await this.db('platform_settings')
      .where({ key: 'contact_email' })
      .first()
    return row?.value || null
  }

  private calculateAmount(
    plan: Record<string, unknown> | undefined,
    billingPeriod?: string,
  ): number {
    if (!plan) return 0
    const monthly = Number(plan.price_monthly) || 0
    const yearly = Number(plan.price_yearly) || 0
    if (billingPeriod === 'yearly') {
      return yearly > 0 ? yearly : monthly * 10
    }
    return monthly
  }

  async submitRegistration(input: RegistrationInput): Promise<RegistrationRecord> {
    const cleanSlug = input.requested_slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    if (cleanSlug.length < 3) {
      throw new ValidationError('Slug RS minimal 3 karakter (huruf kecil, angka, strip)')
    }

    // Check slug availability
    const existingTenant = await this.db('tenants').where({ slug: cleanSlug }).first()
    if (existingTenant) {
      throw new ConflictError(`Subdomain "${cleanSlug}" sudah digunakan`)
    }

    const existingReg = await this.db('tenant_registrations')
      .where({ requested_slug: cleanSlug })
      .whereNotIn('status', ['rejected'])
      .first()
    if (existingReg) {
      throw new ConflictError(`Subdomain "${cleanSlug}" sudah dalam proses pendaftaran`)
    }

    // Check admin email uniqueness
    const existingEmail = await this.db('tenant_registrations')
      .where({ admin_email: input.admin_email })
      .whereNotIn('status', ['rejected'])
      .first()
    if (existingEmail) {
      throw new ConflictError(`Email "${input.admin_email}" sudah terdaftar dalam proses pendaftaran`)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.admin_password, SALT_ROUNDS)

    // Determine initial status based on plan
    const planCode = input.plan_code || 'trial'
    const plan = await this.db('subscription_plans').where({ code: planCode }).first()
    const isTrial = plan ? plan.trial_days > 0 : planCode === 'trial'

    // Get platform setting for auto-approve trial
    const autoApproveSetting = await this.db('platform_settings')
      .where({ key: 'auto_approve_trial' })
      .first()
    const autoApproveTrial = autoApproveSetting?.value === 'true'

    let status: string
    if (isTrial && autoApproveTrial) {
      status = 'approved'
    } else if (isTrial) {
      status = 'under_review'
    } else {
      status = 'payment_pending'
    }

    const [registration] = await this.db('tenant_registrations')
      .insert({
        nama_rs: input.nama_rs,
        tipe_rs: input.tipe_rs || null,
        alamat: input.alamat || null,
        provinsi: input.provinsi || null,
        kota: input.kota || null,
        no_telepon: input.no_telepon || null,
        email_rs: input.email_rs || null,
        website: input.website || null,
        nomor_izin: input.nomor_izin || null,
        admin_nama: input.admin_nama,
        admin_jabatan: input.admin_jabatan || null,
        admin_email: input.admin_email,
        admin_phone: input.admin_phone || null,
        admin_password_hash: passwordHash,
        plan_code: planCode,
        billing_period: input.billing_period || 'monthly',
        payment_method: input.payment_method || null,
        payment_reference: input.payment_reference || null,
        payment_amount: input.payment_amount || (isTrial ? 0 : this.calculateAmount(plan, input.billing_period)),
        requested_slug: cleanSlug,
        migrasi_requested: input.migrasi_requested || false,
        migrasi_source: input.migrasi_source || null,
        migrasi_notes: input.migrasi_notes || null,
        status,
      })
      .returning('*')

    logger.info('New registration submitted', {
      registrationId: registration.id,
      slug: cleanSlug,
      plan: planCode,
      status,
    })

    // If auto-approved trial, provision immediately
    if (status === 'approved') {
      try {
        await this.provisionTenant(registration.id)
        // Email: RS aktif (trial auto-approved)
        const platformDomain = await this.getPlatformDomain()
        const tmpl = emailRegistrationActivated({
          adminNama: input.admin_nama,
          namaRs: input.nama_rs,
          slug: cleanSlug,
          adminEmail: input.admin_email,
          platformDomain,
        })
        await sendEmail(this.db, { to: input.admin_email, ...tmpl })
      } catch (err) {
        logger.error('Auto-provision failed for trial registration', {
          registrationId: registration.id,
          error: String(err),
        })
      }
    } else if (status === 'payment_pending') {
      // Email: instruksi pembayaran
      const platformDomain = await this.getPlatformDomain()
      const billing = await this.getBillingSettings()
      const tmpl = emailPaymentInstructions({
        adminNama: input.admin_nama,
        namaRs: input.nama_rs,
        planName: plan?.name || planCode,
        billingPeriod: input.billing_period || 'monthly',
        amount: Number(input.payment_amount || plan?.price_monthly || 0),
        registrationId: registration.id,
        bankName: billing.bankName,
        bankAccountNumber: billing.bankAccountNumber,
        bankAccountName: billing.bankAccountName,
        platformDomain,
      })
      await sendEmail(this.db, { to: input.admin_email, ...tmpl })
    }

    // Notify super admin about new registration
    const saEmail = await this.getSuperAdminEmail()
    if (saEmail) {
      const platformDomain = await this.getPlatformDomain()
      const notif = emailNewRegistrationNotif({
        namaRs: input.nama_rs,
        planCode,
        slug: cleanSlug,
        adminEmail: input.admin_email,
        status,
        platformDomain,
      })
      await sendEmail(this.db, { to: saEmail, ...notif })
    }

    return registration
  }

  async listRegistrations(filters?: {
    status?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{ data: RegistrationRecord[]; total: number }> {
    const page = filters?.page || 1
    const limit = Math.min(filters?.limit || 20, 100)
    const offset = (page - 1) * limit

    let query = this.db('tenant_registrations')
    let countQuery = this.db('tenant_registrations')

    if (filters?.status) {
      query = query.where('status', filters.status)
      countQuery = countQuery.where('status', filters.status)
    }

    if (filters?.search) {
      const s = `%${filters.search}%`
      query = query.where(function () {
        this.whereILike('nama_rs', s)
          .orWhereILike('admin_email', s)
          .orWhereILike('requested_slug', s)
          .orWhereILike('kota', s)
      })
      countQuery = countQuery.where(function () {
        this.whereILike('nama_rs', s)
          .orWhereILike('admin_email', s)
          .orWhereILike('requested_slug', s)
          .orWhereILike('kota', s)
      })
    }

    const [{ count }] = await countQuery.count('* as count')
    const data = await query
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return { data, total: Number(count) }
  }

  async getRegistration(id: string): Promise<RegistrationRecord> {
    const reg = await this.db('tenant_registrations').where({ id }).first()
    if (!reg) throw new NotFoundError('Registrasi')
    return reg
  }

  async reviewRegistration(
    registrationId: string,
    review: ReviewInput,
    reviewedBy: string,
  ): Promise<RegistrationRecord> {
    const reg = await this.db('tenant_registrations').where({ id: registrationId }).first()
    if (!reg) throw new NotFoundError('Registrasi')

    if (!['pending', 'under_review', 'payment_pending'].includes(reg.status)) {
      throw new ValidationError(
        `Registrasi dengan status "${reg.status}" tidak bisa di-review`,
      )
    }

    const platformDomain = await this.getPlatformDomain()
    const plan = await this.db('subscription_plans').where({ code: reg.plan_code }).first()

    if (review.action === 'reject') {
      const [updated] = await this.db('tenant_registrations')
        .where({ id: registrationId })
        .update({
          status: 'rejected',
          rejection_reason: review.rejection_reason || 'Ditolak oleh admin',
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          notes: review.notes || null,
        })
        .returning('*')

      logger.info('Registration rejected', {
        registrationId,
        reason: review.rejection_reason,
      })

      // Email: registrasi ditolak
      const tmpl = emailRsRejected({
        adminNama: reg.admin_nama,
        namaRs: reg.nama_rs,
        reason: review.rejection_reason || 'Ditolak oleh admin',
        platformDomain,
      })
      await sendEmail(this.db, { to: reg.admin_email, ...tmpl })

      return updated
    }

    // Approve
    const [updated] = await this.db('tenant_registrations')
      .where({ id: registrationId })
      .update({
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        notes: review.notes || null,
      })
      .returning('*')

    logger.info('Registration approved', { registrationId })

    // Provision tenant
    try {
      await this.provisionTenant(registrationId)

      // Email: RS aktif
      const tmpl = emailRsApproved({
        adminNama: reg.admin_nama,
        namaRs: reg.nama_rs,
        slug: reg.requested_slug,
        adminEmail: reg.admin_email,
        planName: plan?.name || reg.plan_code,
        platformDomain,
      })
      await sendEmail(this.db, { to: reg.admin_email, ...tmpl })
    } catch (err) {
      logger.error('Provisioning failed after approval', {
        registrationId,
        error: String(err),
      })
    }

    return await this.db('tenant_registrations').where({ id: registrationId }).first()
  }

  async verifyPayment(
    registrationId: string,
    verifiedBy: string,
  ): Promise<RegistrationRecord> {
    const reg = await this.db('tenant_registrations').where({ id: registrationId }).first()
    if (!reg) throw new NotFoundError('Registrasi')

    if (reg.status !== 'payment_pending') {
      throw new ValidationError('Hanya registrasi dengan status pembayaran pending yang bisa diverifikasi')
    }

    const [updated] = await this.db('tenant_registrations')
      .where({ id: registrationId })
      .update({
        status: 'under_review',
        payment_verified_at: new Date().toISOString(),
        payment_verified_by: verifiedBy,
      })
      .returning('*')

    logger.info('Payment verified for registration', { registrationId })

    // Generate invoice PDF
    let invoiceUrl = ''
    try {
      const plan = await this.db('subscription_plans')
        .where({ code: reg.plan_code })
        .first<{ name: string; price_monthly: number; price_yearly: number }>()

      const amount = reg.billing_period === 'yearly'
        ? (plan?.price_yearly || 0)
        : (plan?.price_monthly || 0)

      const { filePath, invoiceNumber } = await generateInvoicePdf(this.db, {
        namaRs: reg.nama_rs,
        adminEmail: reg.admin_email,
        planName: plan?.name || reg.plan_code,
        period: reg.billing_period || 'monthly',
        amount,
        transactionDate: new Date(),
      })
      invoiceUrl = filePath
      logger.info('Invoice generated for registration', { registrationId, invoiceNumber })
    } catch (err) {
      logger.error('Failed to generate invoice', { registrationId, error: String(err) })
    }

    // Email: pembayaran terverifikasi
    const platformDomain = await this.getPlatformDomain()
    const tmpl = emailPaymentVerified({
      adminNama: reg.admin_nama,
      namaRs: reg.nama_rs,
      registrationId,
      platformDomain,
      invoiceUrl,
    })
    await sendEmail(this.db, { to: reg.admin_email, ...tmpl })

    return updated
  }

  async uploadPaymentProof(
    registrationId: string,
    fileUrl: string,
  ): Promise<RegistrationRecord> {
    const reg = await this.db('tenant_registrations').where({ id: registrationId }).first()
    if (!reg) throw new NotFoundError('Registrasi')

    if (reg.status !== 'payment_pending') {
      throw new ValidationError('Bukti pembayaran hanya bisa diunggah untuk registrasi yang menunggu pembayaran')
    }

    const [updated] = await this.db('tenant_registrations')
      .where({ id: registrationId })
      .update({ payment_proof_url: fileUrl })
      .returning('*')

    logger.info('Payment proof uploaded', { registrationId, fileUrl })

    // Email: bukti bayar diterima
    const platformDomain = await this.getPlatformDomain()
    const tmpl = emailPaymentProofReceived({
      adminNama: reg.admin_nama,
      namaRs: reg.nama_rs,
      registrationId,
      platformDomain,
    })
    await sendEmail(this.db, { to: reg.admin_email, ...tmpl })

    // Notify super admin
    const saEmail = await this.getSuperAdminEmail()
    if (saEmail) {
      await sendEmail(this.db, {
        to: saEmail,
        subject: `📎 Bukti Bayar Diunggah — ${reg.nama_rs}`,
        html: `<p>Registrasi <strong>${reg.nama_rs}</strong> (${reg.requested_slug}) telah mengunggah bukti pembayaran. Silakan verifikasi.</p>`,
      })
    }

    return updated
  }

  async provisionTenant(registrationId: string): Promise<void> {
    const reg = await this.db('tenant_registrations').where({ id: registrationId }).first()
    if (!reg) throw new NotFoundError('Registrasi')

    if (!['approved'].includes(reg.status)) {
      throw new ValidationError('Hanya registrasi yang sudah disetujui yang bisa di-provision')
    }

    // Update status to provisioning
    await this.db('tenant_registrations')
      .where({ id: registrationId })
      .update({ status: 'provisioning' })

    try {
      const cleanSlug = reg.requested_slug

      // Check slug again
      const existing = await this.db('tenants').where({ slug: cleanSlug }).first()
      if (existing) {
        throw new ConflictError(`Slug "${cleanSlug}" sudah digunakan`)
      }

      // Resolve plan
      const plan = await this.db('subscription_plans')
        .where({ code: reg.plan_code })
        .first()
      const isTrial = plan ? plan.trial_days > 0 : reg.plan_code === 'trial'

      const now = new Date()
      let expiresAt: Date

      if (isTrial) {
        expiresAt = new Date(now)
        expiresAt.setDate(expiresAt.getDate() + (plan?.trial_days || 30))
      } else if (reg.billing_period === 'yearly') {
        expiresAt = new Date(now)
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt = new Date(now)
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      // Create tenant record
      const [tenant] = await this.db('tenants')
        .insert({
          name: reg.nama_rs,
          slug: cleanSlug,
          address: reg.alamat || null,
          phone: reg.no_telepon || null,
          email: reg.email_rs || null,
          subscription_plan: reg.plan_code,
          plan_id: plan?.id || null,
          subscription_started_at: now.toISOString(),
          subscription_expires_at: expiresAt.toISOString(),
          is_active: true,
          registration_id: registrationId,
          settings: JSON.stringify({
            timezone: await getPlatformTimezone(),
            locale: 'id-ID',
            currency: 'IDR',
            tipe_rs: reg.tipe_rs,
            provinsi: reg.provinsi,
            kota: reg.kota,
            website: reg.website,
            nomor_izin: reg.nomor_izin,
          }),
        })
        .returning('*')

      // Create schema (includes base tables + extension provisioning)
      await this.db.raw('SELECT create_tenant_schema(?)', [cleanSlug])

      // Safety net: explicitly provision extensions in case create_tenant_schema
      // hasn't been patched yet (e.g. running older migration version)
      try {
        await this.db.raw('SELECT provision_tenant_extensions(?)', [cleanSlug])
      } catch {
        // Fallback: call individual functions if provision_tenant_extensions doesn't exist
        const schema = `tenant_${cleanSlug}`
        try { await this.db.raw('SELECT add_asset_tables(?)', [cleanSlug]) } catch { /* noop */ }
        try { await this.db.raw('SELECT add_inpatient_clinical_tables(?)', [schema]) } catch { /* noop */ }
        try { await this.db.raw('SELECT add_doctor_status(?)', [cleanSlug]) } catch { /* noop */ }
      }

      // Create admin user
      await this.db.withSchema(schema).insert({
        email: reg.admin_email,
        password_hash: reg.admin_password_hash,
        name: reg.admin_nama,
        role: 'admin',
        is_active: true,
      }).into('users')

      // Record subscription transaction
      if (plan) {
        await this.db('subscription_transactions').insert({
          tenant_id: tenant.id,
          plan_id: plan.id,
          type: isTrial ? 'trial' : 'new',
          amount: isTrial ? 0 : Number(reg.payment_amount || plan.price_monthly),
          payment_method: isTrial ? 'free' : (reg.payment_method || 'transfer'),
          payment_reference: reg.payment_reference || null,
          notes: isTrial
            ? `Trial ${plan.trial_days} hari — auto provisioned`
            : `Paket ${plan.name} — ${reg.billing_period}`,
          period: reg.billing_period || 'monthly',
          period_start: now.toISOString(),
          period_end: expiresAt.toISOString(),
          status: 'paid',
          created_by: null,
        })
      }

      // Update registration
      await this.db('tenant_registrations')
        .where({ id: registrationId })
        .update({
          status: 'active',
          tenant_id: tenant.id,
          provisioned_at: new Date().toISOString(),
        })

      logger.info('Tenant provisioned successfully', {
        registrationId,
        tenantId: tenant.id,
        slug: cleanSlug,
      })
    } catch (err) {
      // Revert status on failure
      await this.db('tenant_registrations')
        .where({ id: registrationId })
        .update({ status: 'approved', notes: `Provisioning gagal: ${String(err)}` })

      throw err
    }
  }

  async getRegistrationStats(): Promise<{
    total: number
    pending: number
    paymentPending: number
    underReview: number
    approved: number
    active: number
    rejected: number
  }> {
    const rows = await this.db('tenant_registrations')
      .select('status')
      .count('* as count')
      .groupBy('status')

    const counts: Record<string, number> = {}
    for (const r of rows) {
      counts[r.status] = Number(r.count)
    }

    return {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      pending: counts.pending || 0,
      paymentPending: counts.payment_pending || 0,
      underReview: counts.under_review || 0,
      approved: counts.approved || 0,
      active: counts.active || 0,
      rejected: counts.rejected || 0,
    }
  }

  // =====================
  // Subscription Expiry Checker
  // =====================
  private async getSuspendSettings(): Promise<{ gracePeriodDays: number; autoSuspendDays: number }> {
    const rows = await this.db('platform_settings')
      .whereIn('key', ['auto_suspend_days', 'grace_period_days'])
      .select('key', 'value')
    const m: Record<string, string> = {}
    for (const r of rows) m[r.key] = r.value || ''
    return {
      gracePeriodDays: parseInt(m.grace_period_days || '3', 10),
      autoSuspendDays: parseInt(m.auto_suspend_days || '7', 10),
    }
  }

  async checkExpiringSubscriptions(): Promise<{
    notified: number
    suspended: number
    errors: number
  }> {
    let notified = 0
    let suspended = 0
    let errors = 0
    const platformDomain = await this.getPlatformDomain()

    // --- Phase 1: Send expiry notifications (14, 7, 3, 1 days before) ---
    const thresholds = [14, 7, 3, 1]
    const now = new Date()

    for (const days of thresholds) {
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + days)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      const expiring = await this.db('tenants')
        .where('is_active', true)
        .whereBetween('subscription_expires_at', [startOfDay.toISOString(), endOfDay.toISOString()])
        .select('*')

      for (const tenant of expiring) {
        try {
          const schema = `tenant_${tenant.slug}`
          const admin = await this.db.withSchema(schema)
            .select('email', 'name')
            .from('users')
            .where({ role: 'admin' })
            .first()

          if (!admin) continue

          const plan = tenant.plan_id
            ? await this.db('subscription_plans').where({ id: tenant.plan_id }).first()
            : null

          const tmpl = emailSubscriptionExpiring({
            adminNama: admin.name,
            namaRs: tenant.name,
            planName: plan?.name || tenant.subscription_plan || 'Unknown',
            expiresAt: tenant.subscription_expires_at,
            daysLeft: days,
            slug: tenant.slug,
            platformDomain,
          })
          const sent = await sendEmail(this.db, { to: admin.email, ...tmpl })
          if (sent) notified++
        } catch (err) {
          errors++
          logger.error('Failed to send expiry notification', {
            tenantId: tenant.id,
            slug: tenant.slug,
            days,
            error: String(err),
          })
        }
      }
    }

    // --- Phase 2: Auto-suspend tenants past grace period ---
    try {
      const { gracePeriodDays } = await this.getSuspendSettings()
      const suspendCutoff = new Date(now)
      suspendCutoff.setDate(suspendCutoff.getDate() - gracePeriodDays)

      const toSuspend = await this.db('tenants')
        .where('is_active', true)
        .where('subscription_expires_at', '<', suspendCutoff.toISOString())
        .whereNotNull('subscription_expires_at')
        .select('id', 'slug', 'name')

      for (const tenant of toSuspend) {
        try {
          await this.db('tenants')
            .where({ id: tenant.id })
            .update({ is_active: false })

          suspended++
          logger.info('Tenant auto-suspended (past grace period)', {
            tenantId: tenant.id,
            slug: tenant.slug,
            gracePeriodDays,
          })
        } catch (err) {
          errors++
          logger.error('Failed to auto-suspend tenant', {
            tenantId: tenant.id,
            slug: tenant.slug,
            error: String(err),
          })
        }
      }
    } catch (err) {
      logger.error('Failed to run auto-suspend check', { error: String(err) })
    }

    logger.info('Subscription expiry check completed', { notified, suspended, errors })
    return { notified, suspended, errors }
  }

  // =====================
  // Platform Settings
  // =====================
  async getSettings(category?: string): Promise<Array<{
    key: string
    value: string | null
    category: string
    description: string | null
  }>> {
    let query = this.db('platform_settings').select('key', 'value', 'category', 'description')
    if (category) query = query.where({ category })
    return query.orderBy('category').orderBy('key')
  }

  async updateSetting(key: string, value: string, updatedBy?: string): Promise<void> {
    const existing = await this.db('platform_settings').where({ key }).first()
    if (!existing) throw new NotFoundError(`Setting "${key}"`)

    await this.db('platform_settings')
      .where({ key })
      .update({ value, updated_by: updatedBy || null })
  }

  async updateSettings(
    updates: Array<{ key: string; value: string }>,
    updatedBy?: string,
  ): Promise<void> {
    await this.db.transaction(async (trx) => {
      for (const { key, value } of updates) {
        await trx('platform_settings')
          .where({ key })
          .update({ value, updated_by: updatedBy || null })
      }
    })
  }

  // =====================
  // Activity log
  // =====================
  async logActivity(
    adminId: string,
    adminEmail: string,
    action: string,
    entityType?: string,
    entityId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    await this.db('super_admin_activity_log').insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: JSON.stringify(details || {}),
      ip_address: ipAddress || null,
    })
  }

  async getActivityLog(filters?: {
    adminId?: string
    action?: string
    page?: number
    limit?: number
  }): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
    const page = filters?.page || 1
    const limit = Math.min(filters?.limit || 50, 100)
    const offset = (page - 1) * limit

    let query = this.db('super_admin_activity_log')
    let countQuery = this.db('super_admin_activity_log')

    if (filters?.adminId) {
      query = query.where('admin_id', filters.adminId)
      countQuery = countQuery.where('admin_id', filters.adminId)
    }
    if (filters?.action) {
      query = query.where('action', filters.action)
      countQuery = countQuery.where('action', filters.action)
    }

    const [{ count }] = await countQuery.count('* as count')
    const data = await query
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return { data, total: Number(count) }
  }

  async checkSlugAvailability(slug: string): Promise<{
    available: boolean
    reason?: string
  }> {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    if (cleanSlug.length < 3) {
      return { available: false, reason: 'Minimal 3 karakter' }
    }

    const reservedSlugs = ['admin', 'api', 'www', 'mail', 'ftp', 'portal', 'app', 'sa', 'superadmin', 'demo', 'test', 'staging', 'dev']
    if (reservedSlugs.includes(cleanSlug)) {
      return { available: false, reason: 'Subdomain ini sudah dipesan oleh sistem' }
    }

    const existingTenant = await this.db('tenants').where({ slug: cleanSlug }).first()
    if (existingTenant) {
      return { available: false, reason: 'Sudah digunakan oleh RS lain' }
    }

    const existingReg = await this.db('tenant_registrations')
      .where({ requested_slug: cleanSlug })
      .whereNotIn('status', ['rejected'])
      .first()
    if (existingReg) {
      return { available: false, reason: 'Sedang dalam proses pendaftaran' }
    }

    return { available: true }
  }
}
