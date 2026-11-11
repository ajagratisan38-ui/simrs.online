import { Request, Response, NextFunction } from 'express'
import { SubscriptionService } from './subscription.service'
import { ValidationError } from '../../shared/errors'

export class SubscriptionController {
  constructor(private service: SubscriptionService) {}

  // ==================== PLANS ====================

  listPublicPlans = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await this.service.listPublicPlans()
      res.json({ success: true, data: plans })
    } catch (error) {
      next(error)
    }
  }

  listPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeInactive = req.query.includeInactive === 'true'
      const plans = await this.service.listPlans(includeInactive)
      res.json({ success: true, data: plans })
    } catch (error) {
      next(error)
    }
  }

  createPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, price_monthly, max_users, max_patients, max_doctors,
        max_storage_gb, allowed_modules } = req.body

      if (!code || !name) {
        throw new ValidationError('code dan name wajib diisi')
      }
      if (typeof price_monthly !== 'number') {
        throw new ValidationError('price_monthly harus angka')
      }

      const plan = await this.service.createPlan({
        code,
        name,
        description: req.body.description,
        price_monthly,
        price_yearly: req.body.price_yearly,
        max_users: max_users ?? 5,
        max_patients: max_patients ?? 100,
        max_doctors: max_doctors ?? 3,
        max_storage_gb: max_storage_gb ?? 5,
        allowed_modules: allowed_modules ?? [],
        trial_days: req.body.trial_days,
        sort_order: req.body.sort_order,
        is_public: req.body.is_public,
      })

      res.status(201).json({ success: true, data: plan })
    } catch (error) {
      next(error)
    }
  }

  updatePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const plan = await this.service.updatePlan(id as string, req.body)
      res.json({ success: true, data: plan })
    } catch (error) {
      next(error)
    }
  }

  togglePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { is_active } = req.body
      if (typeof is_active !== 'boolean') {
        throw new ValidationError('is_active harus boolean')
      }
      await this.service.togglePlan(id as string, is_active)
      res.json({ success: true, data: { message: is_active ? 'Plan diaktifkan' : 'Plan dinonaktifkan' } })
    } catch (error) {
      next(error)
    }
  }

  deletePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      await this.service.deletePlan(id as string)
      res.json({ success: true, data: { message: 'Plan berhasil dihapus' } })
    } catch (error) {
      next(error)
    }
  }

  // ==================== SUBSCRIPTIONS ====================

  getTenantSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.params
      const detail = await this.service.getTenantSubscription(tenantId as string)
      res.json({ success: true, data: detail })
    } catch (error) {
      next(error)
    }
  }

  renewSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenant_id, plan_code, amount, payment_method, payment_reference, notes, period } = req.body

      if (!tenant_id || !plan_code || !payment_method) {
        throw new ValidationError('tenant_id, plan_code, dan payment_method wajib diisi')
      }
      if (typeof amount !== 'number' || amount < 0) {
        throw new ValidationError('amount harus angka positif')
      }
      if (!['monthly', 'yearly'].includes(period)) {
        throw new ValidationError('period harus monthly atau yearly')
      }

      const tx = await this.service.renewSubscription({
        tenant_id, plan_code, amount, payment_method,
        payment_reference, notes, period,
      }, req.userId)

      res.status(201).json({ success: true, data: tx })
    } catch (error) {
      next(error)
    }
  }

  changePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.params
      const { plan_code } = req.body

      if (!plan_code) throw new ValidationError('plan_code wajib diisi')

      await this.service.changePlan(tenantId as string, plan_code)
      res.json({ success: true, data: { message: `Plan diubah ke ${plan_code}` } })
    } catch (error) {
      next(error)
    }
  }

  // ==================== TRANSACTIONS ====================

  listTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant_id = req.query.tenant_id as string | undefined
      const limit = parseInt(req.query.limit as string) || 50
      const offset = parseInt(req.query.offset as string) || 0

      const result = await this.service.listTransactions({ tenant_id, limit, offset })
      res.json({
        success: true,
        data: result.data,
        meta: { total: result.total, limit, offset },
      })
    } catch (error) {
      next(error)
    }
  }

  // ==================== ALERTS & STATS ====================

  getExpiringTenants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days = parseInt(req.query.days as string) || 30
      const tenants = await this.service.getExpiringTenants(days)
      res.json({ success: true, data: tenants })
    } catch (error) {
      next(error)
    }
  }

  getPlatformStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.service.getPlatformStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      next(error)
    }
  }
}
