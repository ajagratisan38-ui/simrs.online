import { Router } from 'express'
import { UserManagementController } from './user-management.controller'
import { UserManagementService } from './user-management.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new UserManagementService(db)
const controller = new UserManagementController(service)

export const userManagementRouter = Router()
userManagementRouter.use(authenticate)
userManagementRouter.use(checkAnyPermission('user:read', 'user:create', 'user:update', 'user:delete'))

/** @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Daftar pengguna (admin only)
 *     responses:
 *       200:
 *         description: Daftar user + role
 *   post:
 *     tags: [Users]
 *     summary: Buat pengguna baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [admin, dokter, perawat, apoteker, kasir, lab_analis, radiografer, gizi, pendaftaran, manajemen] }
 *     responses:
 *       201:
 *         description: User berhasil dibuat
 */
userManagementRouter.get('/', controller.list)
userManagementRouter.post('/', checkAnyPermission('user:create'), controller.create)

/** @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Detail pengguna
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Data user
 *   put:
 *     tags: [Users]
 *     summary: Update pengguna
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User berhasil diupdate
 *   delete:
 *     tags: [Users]
 *     summary: Hapus pengguna (soft delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User berhasil dihapus
 */
userManagementRouter.get('/:id', controller.getById)
userManagementRouter.put('/:id', checkAnyPermission('user:update'), controller.update)
userManagementRouter.delete('/:id', checkAnyPermission('user:delete'), controller.remove)

/** @openapi
 * /users/{id}/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Reset password pengguna (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Password berhasil direset
 */
userManagementRouter.post('/:id/reset-password', checkAnyPermission('user:update'), controller.resetPassword)
