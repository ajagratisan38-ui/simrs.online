import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import path from 'path'
import { RegistrationService } from './registration.service'
import { invalidateMaintenanceCache } from '../../middleware/maintenance'
import { formatDateTime, invalidateTimezoneCache } from '../../shared/timezone'
import {
  invalidateSessionTimeoutCache,
  invalidateMaxConcurrentSessionsCache,
  invalidateEnforce2faCache,
} from '../auth/auth.service'
import { invalidateIpWhitelistCache } from '../../middleware/ip-whitelist'
import { invalidateDomainSettingsCache } from '../../middleware/tenant'
import { invalidateInvoiceSettingsCache } from './invoice.service'

const submitSchema = z.object({
  nama_rs: z.string().min(3, 'Nama RS minimal 3 karakter').max(200),
  tipe_rs: z.string().optional(),
  alamat: z.string().optional(),
  provinsi: z.string().optional(),
  kota: z.string().optional(),
  no_telepon: z.string().optional(),
  email_rs: z.string().email('Format email RS tidak valid').optional(),
  website: z.string().optional(),
  nomor_izin: z.string().optional(),
  admin_nama: z.string().min(2, 'Nama admin minimal 2 karakter'),
  admin_jabatan: z.string().optional(),
  admin_email: z.string().email('Format email admin tidak valid'),
  admin_phone: z.string().optional(),
  admin_password: z.string().min(8, 'Password minimal 8 karakter'),
  plan_code: z.string().optional(),
  billing_period: z.enum(['monthly', 'yearly']).optional(),
  payment_method: z.string().optional(),
  payment_reference: z.string().optional(),
  payment_amount: z.number().optional(),
  requested_slug: z.string().min(3, 'Subdomain minimal 3 karakter').max(50)
    .regex(/^[a-z0-9-]+$/, 'Subdomain hanya boleh huruf kecil, angka, dan strip'),
  migrasi_requested: z.boolean().optional(),
  migrasi_source: z.string().optional(),
  migrasi_notes: z.string().optional(),
})

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().optional(),
  notes: z.string().optional(),
})

const settingsUpdateSchema = z.object({
  updates: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).min(1),
})

export class RegistrationController {
  constructor(private service: RegistrationService) {}

  // PUBLIC — registration config (is registration open?)
  getRegistrationConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [generalSettings, domainSettings] = await Promise.all([
        this.service.getSettings('general'),
        this.service.getSettings('domain'),
      ])
      const map: Record<string, string> = {}
      for (const s of [...generalSettings, ...domainSettings]) map[s.key] = s.value || ''

      res.json({
        success: true,
        data: {
          registration_open: map.enable_self_registration !== 'false',
          maintenance_mode: map.maintenance_mode === 'true',
          platform_name: map.platform_name || 'SIMRS',
          platform_tagline: map.platform_tagline || '',
          contact_email: map.contact_email || '',
          contact_phone: map.contact_phone || '',
          primary_domain: map.primary_domain || 'simrs.id',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // PUBLIC — no auth required
  submit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const regOpen = await this.service.isRegistrationOpen()
      if (!regOpen) {
        res.status(403).json({
          success: false,
          error: {
            code: 'REGISTRATION_CLOSED',
            message: 'Registrasi sedang ditutup. Silakan hubungi admin platform.',
          },
        })
        return
      }

      const data = submitSchema.parse(req.body)
      const registration = await this.service.submitRegistration(data)
      res.status(201).json({
        success: true,
        data: {
          id: registration.id,
          status: registration.status,
          requested_slug: registration.requested_slug,
          plan_code: registration.plan_code,
          message: registration.status === 'active'
            ? 'Registrasi berhasil! RS Anda sudah aktif. Silakan login.'
            : registration.status === 'payment_pending'
              ? 'Registrasi diterima. Silakan lakukan pembayaran untuk mengaktifkan akun.'
              : 'Registrasi diterima dan sedang ditinjau. Kami akan menghubungi Anda melalui email.',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // PUBLIC — check slug availability
  checkSlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug || req.query.slug as string
      if (!slug) {
        res.status(400).json({ success: false, error: { message: 'Slug wajib diisi' } })
        return
      }
      const result = await this.service.checkSlugAvailability(slug)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // PUBLIC — check registration status
  checkStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const reg = await this.service.getRegistration(id)
      res.json({
        success: true,
        data: {
          id: reg.id,
          nama_rs: reg.nama_rs,
          status: reg.status,
          requested_slug: reg.requested_slug,
          plan_code: reg.plan_code,
          admin_email: reg.admin_email,
          payment_proof_url: reg.payment_proof_url ? true : false,
          rejection_reason: reg.status === 'rejected' ? reg.rejection_reason : null,
          created_at: reg.created_at,
          reviewed_at: reg.reviewed_at,
          provisioned_at: reg.provisioned_at,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // PUBLIC — upload payment proof
  uploadPaymentProof = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { message: 'File bukti pembayaran wajib diunggah' },
        })
        return
      }

      const fileUrl = `/uploads/payment-proofs/${req.file.filename}`
      const updated = await this.service.uploadPaymentProof(id, fileUrl)

      res.json({
        success: true,
        data: {
          id: updated.id,
          status: updated.status,
          payment_proof_url: updated.payment_proof_url,
          message: 'Bukti pembayaran berhasil diunggah. Tim kami akan segera memverifikasi.',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // PUBLIC — get payment info (bank details for a registration)
  getPaymentInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const reg = await this.service.getRegistration(id)

      if (reg.status !== 'payment_pending') {
        res.json({
          success: true,
          data: {
            status: reg.status,
            needsPayment: false,
          },
        })
        return
      }

      // Get billing settings for bank info
      const settings = await this.service.getSettings('billing')
      const bankInfo: Record<string, string> = {}
      for (const s of settings) {
        bankInfo[s.key] = s.value || ''
      }

      res.json({
        success: true,
        data: {
          status: reg.status,
          needsPayment: true,
          nama_rs: reg.nama_rs,
          plan_code: reg.plan_code,
          billing_period: reg.billing_period,
          payment_amount: reg.payment_amount,
          payment_proof_uploaded: !!reg.payment_proof_url,
          bank: {
            name: bankInfo.bank_name || '',
            accountNumber: bankInfo.bank_account_number || '',
            accountName: bankInfo.bank_account_name || '',
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — list all registrations
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, search, page, limit } = req.query
      const result = await this.service.listRegistrations({
        status: status as string,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      })
      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Math.min(Number(req.query.limit) || 20, 100),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — get single registration detail
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reg = await this.service.getRegistration(req.params.id)
      res.json({ success: true, data: reg })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — review (approve/reject)
  review = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = reviewSchema.parse(req.body)
      const updated = await this.service.reviewRegistration(
        req.params.id,
        data,
        req.userId!,
      )

      // Log activity
      await this.service.logActivity(
        req.userId!,
        req.userEmail || '',
        data.action === 'approve' ? 'approve_registration' : 'reject_registration',
        'tenant_registration',
        req.params.id,
        { nama_rs: updated.nama_rs, slug: updated.requested_slug },
        req.ip,
      )

      res.json({
        success: true,
        data: updated,
        message: data.action === 'approve'
          ? 'Registrasi disetujui dan RS sedang diaktifkan. Email notifikasi sudah dikirim.'
          : 'Registrasi ditolak. Email notifikasi sudah dikirim.',
      })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — verify payment
  verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await this.service.verifyPayment(
        req.params.id,
        req.userId!,
      )

      await this.service.logActivity(
        req.userId!,
        req.userEmail || '',
        'verify_payment',
        'tenant_registration',
        req.params.id,
        { nama_rs: updated.nama_rs, amount: updated.payment_amount },
        req.ip,
      )

      res.json({
        success: true,
        data: updated,
        message: 'Pembayaran terverifikasi. Email notifikasi sudah dikirim ke RS.',
      })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — retry provisioning
  retryProvision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.provisionTenant(req.params.id)

      await this.service.logActivity(
        req.userId!,
        req.userEmail || '',
        'retry_provision',
        'tenant_registration',
        req.params.id,
        {},
        req.ip,
      )

      const reg = await this.service.getRegistration(req.params.id)
      res.json({ success: true, data: reg })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — registration stats
  getStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getRegistrationStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — platform settings
  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined
      const settings = await this.service.getSettings(category)
      res.json({ success: true, data: settings })
    } catch (error) {
      next(error)
    }
  }

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updates } = settingsUpdateSchema.parse(req.body)
      await this.service.updateSettings(updates, req.userId)

      // Invalidate caches if relevant settings changed
      const changedKeys = updates.map((u) => u.key)
      if (changedKeys.includes('maintenance_mode')) {
        invalidateMaintenanceCache()
      }
      if (changedKeys.includes('default_timezone')) {
        invalidateTimezoneCache()
      }
      if (changedKeys.includes('session_timeout_minutes')) {
        invalidateSessionTimeoutCache()
      }
      if (changedKeys.includes('max_concurrent_sessions')) {
        invalidateMaxConcurrentSessionsCache()
      }
      if (changedKeys.includes('enforce_2fa_superadmin')) {
        invalidateEnforce2faCache()
      }
      if (changedKeys.includes('allowed_ips_superadmin')) {
        invalidateIpWhitelistCache()
      }
      if (changedKeys.includes('primary_domain') || changedKeys.includes('custom_domain_enabled')) {
        invalidateDomainSettingsCache()
      }
      if (changedKeys.includes('invoice_prefix') || changedKeys.includes('invoice_footer')) {
        invalidateInvoiceSettingsCache()
      }

      await this.service.logActivity(
        req.userId!,
        req.userEmail || '',
        'update_settings',
        'platform_settings',
        undefined,
        { keys: updates.map((u) => u.key) },
        req.ip,
      )

      res.json({ success: true, message: 'Settings berhasil diperbarui' })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — send test email
  sendTestEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to } = req.body
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        res.status(400).json({
          success: false,
          error: { message: 'Email tujuan tidak valid' },
        })
        return
      }

      const { sendEmail } = await import('../../shared/email')
      const { db } = await import('../../config/database')
      const nowFormatted = await formatDateTime(new Date())
      const sent = await sendEmail(db, {
        to,
        subject: `✅ Test Email — ${nowFormatted}`,
        html: `<div style="padding:20px;font-family:sans-serif;">
          <h2 style="color:#0d9488;">Test Email Berhasil!</h2>
          <p>Konfigurasi SMTP Anda sudah benar. Email ini dikirim pada <strong>${nowFormatted}</strong>.</p>
          <p style="color:#94a3b8;font-size:12px;">SIMRS Platform</p>
        </div>`,
      })

      if (sent) {
        res.json({ success: true, message: `Email test berhasil dikirim ke ${to}` })
      } else {
        res.status(500).json({
          success: false,
          error: { message: 'Gagal mengirim email. Periksa konfigurasi SMTP.' },
        })
      }
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — trigger subscription expiry check
  checkExpiring = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.checkExpiringSubscriptions()

      await this.service.logActivity(
        req.userId!,
        req.userEmail || '',
        'check_expiring_subscriptions',
        'subscription',
        undefined,
        result,
        req.ip,
      )

      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  // SUPER ADMIN — activity log
  getActivityLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { admin_id, action, page, limit } = req.query
      const result = await this.service.getActivityLog({
        adminId: admin_id as string,
        action: action as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      })
      res.json({
        success: true,
        data: result.data,
        meta: { total: result.total },
      })
    } catch (error) {
      next(error)
    }
  }
}
