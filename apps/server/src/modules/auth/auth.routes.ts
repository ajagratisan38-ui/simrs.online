import { Router } from 'express'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { MfaService } from './mfa.service'
import { authenticate } from '../../middleware/authenticate'
import { db } from '../../config/database'
import { redis } from '../../config/redis'

const router = Router()

const authService = new AuthService(db, redis)
const mfaService = new MfaService(db)
const authController = new AuthController(authService, mfaService)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login ke sistem
 *     description: Autentikasi user dengan email, password, dan kode tenant. Jika MFA aktif, akan mengembalikan mfaRequired=true dan perlu kirim ulang dengan mfaToken.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login berhasil atau MFA required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Email atau password salah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', authController.login)

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token baru
 */
router.post('/refresh', authController.refresh)

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (invalidate session)
 *     responses:
 *       200:
 *         description: Logout berhasil
 */
router.post('/logout', authenticate, authController.logout)

/**
 * @openapi
 * /auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Ganti password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password berhasil diubah
 */
router.put('/change-password', authenticate, authController.changePassword)

/**
 * @openapi
 * /auth/mfa/status:
 *   get:
 *     tags: [Auth]
 *     summary: Cek status MFA user
 *     responses:
 *       200:
 *         description: Status MFA
 */
router.get('/mfa/status', authenticate, authController.getMfaStatus)

/**
 * @openapi
 * /auth/mfa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Setup MFA (generate QR code)
 *     responses:
 *       200:
 *         description: QR code URL untuk scan di authenticator app
 */
router.post('/mfa/setup', authenticate, authController.setupMfa)

/**
 * @openapi
 * /auth/mfa/activate:
 *   post:
 *     tags: [Auth]
 *     summary: Aktivasi MFA setelah verify token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Kode 6 digit dari authenticator app
 *     responses:
 *       200:
 *         description: MFA berhasil diaktifkan
 */
router.post('/mfa/activate', authenticate, authController.activateMfa)

/**
 * @openapi
 * /auth/mfa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Nonaktifkan MFA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: MFA berhasil dinonaktifkan
 */
router.post('/mfa/disable', authenticate, authController.disableMfa)

export default router
