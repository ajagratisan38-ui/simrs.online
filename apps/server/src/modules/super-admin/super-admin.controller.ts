import { Request, Response, NextFunction } from 'express'
import { SuperAdminService } from './super-admin.service'
import { ValidationError } from '../../shared/errors'

export class SuperAdminController {
  constructor(private service: SuperAdminService) {}

  listTenants = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tenants = await this.service.listTenants()
      res.json({ success: true, data: tenants })
    } catch (error) {
      next(error)
    }
  }

  createTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, slug, address, phone, email, subscription_plan, admin_name, admin_email, admin_password } = req.body

      if (!name || !slug || !admin_name || !admin_email || !admin_password) {
        throw new ValidationError(
          'Field wajib: name, slug, admin_name, admin_email, admin_password',
        )
      }

      if (admin_password.length < 8) {
        throw new ValidationError('Password admin minimal 8 karakter')
      }

      const tenant = await this.service.createTenant({
        name, slug, address, phone, email, subscription_plan,
        admin_name, admin_email, admin_password,
      })

      res.status(201).json({ success: true, data: tenant })
    } catch (error) {
      next(error)
    }
  }

  toggleTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { is_active } = req.body

      if (typeof is_active !== 'boolean') {
        throw new ValidationError('is_active harus boolean')
      }

      await this.service.toggleTenant(id as string, is_active)
      res.json({
        success: true,
        data: { message: is_active ? 'Tenant diaktifkan' : 'Tenant dinonaktifkan' },
      })
    } catch (error) {
      next(error)
    }
  }

  deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      await this.service.deleteTenant(id as string)
      res.json({ success: true, data: { message: 'Tenant berhasil dihapus' } })
    } catch (error) {
      next(error)
    }
  }

  // ==================== TENANT DETAIL ====================

  getTenantDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const detail = await this.service.getTenantDetail(req.params.id)
      res.json({ success: true, data: detail })
    } catch (error) {
      next(error)
    }
  }

  // ==================== MONITORING ====================

  getMonitoring = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getMonitoringData()
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // ==================== SUPER ADMIN MANAGEMENT ====================

  listSuperAdmins = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const admins = await this.service.listSuperAdmins()
      res.json({ success: true, data: admins })
    } catch (error) {
      next(error)
    }
  }

  createSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, password, sa_role } = req.body
      if (!email || !name || !password) {
        throw new ValidationError('email, name, password wajib diisi')
      }
      if (password.length < 8) {
        throw new ValidationError('Password minimal 8 karakter')
      }
      const admin = await this.service.createSuperAdmin({ email, name, password, sa_role })
      res.status(201).json({ success: true, data: admin })
    } catch (error) {
      next(error)
    }
  }

  toggleSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { is_active } = req.body
      if (typeof is_active !== 'boolean') {
        throw new ValidationError('is_active harus boolean')
      }
      await this.service.toggleSuperAdmin(req.params.id, is_active)
      res.json({ success: true, message: is_active ? 'Diaktifkan' : 'Dinonaktifkan' })
    } catch (error) {
      next(error)
    }
  }

  deleteSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteSuperAdmin(req.params.id)
      res.json({ success: true, message: 'Super admin dihapus' })
    } catch (error) {
      next(error)
    }
  }

  // ==================== PAYMENTS ====================

  getPaymentsPending = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const payments = await this.service.getPaymentsPending()
      res.json({ success: true, data: payments })
    } catch (error) {
      next(error)
    }
  }

  getRevenueSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await this.service.getRevenueSummary()
      res.json({ success: true, data: summary })
    } catch (error) {
      next(error)
    }
  }
}
