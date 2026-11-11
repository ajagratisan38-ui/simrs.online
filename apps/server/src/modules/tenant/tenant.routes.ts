import { Router } from 'express'
import { TenantController } from './tenant.controller'
import { TenantService } from './tenant.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new TenantService(db)
const controller = new TenantController(service)

export const tenantRouter = Router()
tenantRouter.use(authenticate)
tenantRouter.use(checkAnyPermission('tenant:manage', 'settings:manage'))

/** @openapi
 * /tenant/profile:
 *   get:
 *     tags: [Tenant]
 *     summary: Profil RS tenant saat ini (nama, alamat, kontak, logo, stats)
 *     responses:
 *       200:
 *         description: Data profil RS
 *   put:
 *     tags: [Tenant]
 *     summary: Update profil RS tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               address: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               logo_url: { type: string }
 *     responses:
 *       200:
 *         description: Profil RS berhasil diupdate
 */
tenantRouter.get('/profile', controller.getProfile)
tenantRouter.put('/profile', controller.updateProfile)
