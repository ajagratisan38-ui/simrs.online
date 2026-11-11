import { Request, Response, NextFunction } from 'express'
import { AuthService } from './auth.service'
import { MfaService } from './mfa.service'
import {
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  mfaVerifySchema,
} from './auth.validator'

export class AuthController {
  constructor(
    private authService: AuthService,
    private mfaService: MfaService,
  ) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, tenantSlug, mfaToken } = loginSchema.parse(req.body)
      const result = await this.authService.login(email, password, tenantSlug, mfaToken)

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  setupMfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!
      const tenantSchema = req.tenantSchema!
      let result
      if (req.role === 'superadmin') {
        result = await this.mfaService.setupSuperAdminMFA(userId)
      } else {
        result = await this.mfaService.enableMFA(userId, tenantSchema)
      }

      res.status(200).json({
        success: true,
        data: {
          qrCodeUrl: result.qrCodeUrl,
          otpauthUrl: result.otpauthUrl,
          message: 'Scan QR code dengan aplikasi authenticator, lalu verifikasi dengan kode 6 digit',
        },
      })
    } catch (error) {
      next(error)
    }
  }

  activateMfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = mfaVerifySchema.parse(req.body)
      const userId = req.userId!
      const tenantSchema = req.tenantSchema!
      if (req.role === 'superadmin') {
        await this.mfaService.verifySuperAdminMFAAndActivate(userId, token)
      } else {
        await this.mfaService.verifyAndActivate(userId, token, tenantSchema)
      }

      res.status(200).json({
        success: true,
        data: { message: 'MFA berhasil diaktifkan' },
      })
    } catch (error) {
      next(error)
    }
  }

  disableMfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = mfaVerifySchema.parse(req.body)
      const userId = req.userId!
      const tenantSchema = req.tenantSchema!
      if (req.role === 'superadmin') {
        await this.mfaService.verifySuperAdminMFA(userId, token)
        await this.mfaService.disableSuperAdminMFA(userId)
      } else {
        await this.mfaService.verifyMFA(userId, token, tenantSchema)
        await this.mfaService.disableMFA(userId, tenantSchema)
      }

      res.status(200).json({
        success: true,
        data: { message: 'MFA berhasil dinonaktifkan' },
      })
    } catch (error) {
      next(error)
    }
  }

  getMfaStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!
      const tenantSchema = req.tenantSchema!
      let enabled: boolean
      if (req.role === 'superadmin') {
        enabled = await this.mfaService.isSuperAdminMfaEnabled(userId)
      } else {
        enabled = await this.mfaService.isMfaEnabled(userId, tenantSchema)
      }

      res.status(200).json({
        success: true,
        data: { mfaEnabled: enabled },
      })
    } catch (error) {
      next(error)
    }
  }

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = refreshSchema.parse(req.body)
      const result = await this.authService.refresh(refreshToken)

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!
      const tenantId = req.tenantId!

      await this.authService.logout(userId, tenantId)

      res.status(200).json({
        success: true,
        data: { message: 'Berhasil logout' },
      })
    } catch (error) {
      next(error)
    }
  }

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = changePasswordSchema.parse(req.body)
      const userId = req.userId!
      const tenantSchema = req.tenantSchema!

      await this.authService.changePassword(userId, tenantSchema, oldPassword, newPassword)

      res.status(200).json({
        success: true,
        data: { message: 'Password berhasil diubah' },
      })
    } catch (error) {
      next(error)
    }
  }
}
