import { Router, Request, Response, NextFunction } from 'express'
import { SuperAdminController } from './super-admin.controller'
import { SuperAdminService } from './super-admin.service'
import { SubscriptionController } from './subscription.controller'
import { SubscriptionService } from './subscription.service'
import { RegistrationController } from './registration.controller'
import { RegistrationService } from './registration.service'
import { authenticate } from '../../middleware/authenticate'
import { ForbiddenError } from '../../shared/errors'
import { db } from '../../config/database'
import { uploadPaymentProof } from '../../config/upload'

const service = new SuperAdminService(db)
const controller = new SuperAdminController(service)

const subService = new SubscriptionService(db)
const subController = new SubscriptionController(subService)

const regService = new RegistrationService(db)
const regController = new RegistrationController(regService)

function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.role !== 'superadmin') {
    return next(new ForbiddenError('Hanya super admin yang dapat mengakses fitur ini'))
  }
  next()
}

function requireOwner(req: Request, _res: Response, next: NextFunction) {
  if (req.role !== 'superadmin') {
    return next(new ForbiddenError('Hanya super admin yang dapat mengakses fitur ini'))
  }
  if (req.saRole !== 'owner') {
    return next(new ForbiddenError('Hanya owner yang dapat mengakses fitur ini'))
  }
  next()
}

// ======================================
// PUBLIC ROUTES — no auth required
// ======================================
export const publicRegistrationRouter = Router()

publicRegistrationRouter.get('/register/config', regController.getRegistrationConfig)
publicRegistrationRouter.get('/register/plans', subController.listPublicPlans)
publicRegistrationRouter.post('/register', regController.submit)
publicRegistrationRouter.get('/register/check-slug/:slug', regController.checkSlug)
publicRegistrationRouter.get('/register/status/:id', regController.checkStatus)
publicRegistrationRouter.get('/register/payment-info/:id', regController.getPaymentInfo)
publicRegistrationRouter.post(
  '/register/upload-proof/:id',
  uploadPaymentProof.single('file'),
  regController.uploadPaymentProof,
)


// ======================================
// SUPER ADMIN ROUTES — requires superadmin role
// ======================================
export const superAdminRouter = Router()
superAdminRouter.use(authenticate)
superAdminRouter.use(requireSuperAdmin)

// ==============================================
// OPERATOR + OWNER (semua SA bisa akses)
// ==============================================

// --- Dashboard & Monitoring (read-only) ---
superAdminRouter.get('/stats', subController.getPlatformStats)
superAdminRouter.get('/monitoring', controller.getMonitoring)
superAdminRouter.get('/activity-log', regController.getActivityLog)

// --- Tenants (read + toggle) ---
superAdminRouter.get('/tenants', controller.listTenants)
superAdminRouter.get('/tenants/:id/detail', controller.getTenantDetail)
superAdminRouter.get('/tenants/:tenantId/subscription', subController.getTenantSubscription)

// --- Registrations (review workflow) ---
superAdminRouter.get('/registrations', regController.list)
superAdminRouter.get('/registrations/stats', regController.getStats)
superAdminRouter.get('/registrations/:id', regController.getById)
superAdminRouter.post('/registrations/:id/review', regController.review)
superAdminRouter.post('/registrations/:id/verify-payment', regController.verifyPayment)
superAdminRouter.post('/registrations/:id/provision', regController.retryProvision)

// --- Payments (verifikasi) ---
superAdminRouter.get('/payments/pending', controller.getPaymentsPending)
superAdminRouter.get('/payments/revenue', controller.getRevenueSummary)

// --- Plans (read-only) ---
superAdminRouter.get('/plans', subController.listPlans)
superAdminRouter.get('/transactions', subController.listTransactions)
superAdminRouter.get('/alerts/expiring', subController.getExpiringTenants)

// --- Settings (read-only) ---
superAdminRouter.get('/settings', regController.getSettings)

// ==============================================
// OWNER ONLY (aksi destruktif & konfigurasi)
// ==============================================

// --- Tenant management (create/toggle/delete) ---
superAdminRouter.post('/tenants', requireOwner, controller.createTenant)
superAdminRouter.patch('/tenants/:id/toggle', requireOwner, controller.toggleTenant)
superAdminRouter.delete('/tenants/:id', requireOwner, controller.deleteTenant)

// --- Plan management (CRUD) ---
superAdminRouter.post('/plans', requireOwner, subController.createPlan)
superAdminRouter.put('/plans/:id', requireOwner, subController.updatePlan)
superAdminRouter.patch('/plans/:id/toggle', requireOwner, subController.togglePlan)
superAdminRouter.delete('/plans/:id', requireOwner, subController.deletePlan)
superAdminRouter.patch('/tenants/:tenantId/plan', requireOwner, subController.changePlan)
superAdminRouter.post('/transactions', requireOwner, subController.renewSubscription)

// --- Platform Settings (write) ---
superAdminRouter.put('/settings', requireOwner, regController.updateSettings)
superAdminRouter.post('/test-email', requireOwner, regController.sendTestEmail)
superAdminRouter.post('/check-expiring', requireOwner, regController.checkExpiring)

// --- Super Admin Management (CRUD) ---
superAdminRouter.get('/admins', requireOwner, controller.listSuperAdmins)
superAdminRouter.post('/admins', requireOwner, controller.createSuperAdmin)
superAdminRouter.patch('/admins/:id/toggle', requireOwner, controller.toggleSuperAdmin)
superAdminRouter.delete('/admins/:id', requireOwner, controller.deleteSuperAdmin)
