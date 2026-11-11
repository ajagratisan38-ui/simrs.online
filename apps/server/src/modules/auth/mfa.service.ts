import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { Knex } from 'knex'
import { env } from '../../config/env'
import { logger } from '../../shared/logger'
import { encrypt, decrypt } from '../../shared/encryption'
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../shared/errors'

interface UserMfaRow {
  id: string
  email: string
  mfa_enabled: boolean
  mfa_secret: string | null
}

export class MfaService {
  constructor(private db: Knex) {}

  async enableMFA(
    userId: string,
    tenantSchema: string,
  ): Promise<{ secret: string; qrCodeUrl: string; otpauthUrl: string }> {
    const user = await this.getUser(userId, tenantSchema)

    if (user.mfa_enabled) {
      throw new ConflictError('MFA sudah diaktifkan untuk akun ini')
    }

    const secret = speakeasy.generateSecret({
      name: `${env.security.mfaIssuer} (${user.email})`,
      issuer: env.security.mfaIssuer,
      length: 20,
    })

    const encryptedSecret = encrypt(secret.base32)

    await this.db
      .withSchema(tenantSchema)
      .table('users')
      .where({ id: userId })
      .update({ mfa_secret: encryptedSecret })

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '')

    logger.info('MFA setup initiated', { userId })

    return {
      secret: secret.base32,
      qrCodeUrl,
      otpauthUrl: secret.otpauth_url || '',
    }
  }

  async verifyAndActivate(
    userId: string,
    token: string,
    tenantSchema: string,
  ): Promise<boolean> {
    const user = await this.getUser(userId, tenantSchema)

    if (!user.mfa_secret) {
      throw new ValidationError('MFA belum di-setup. Jalankan setup terlebih dahulu.')
    }

    const decryptedSecret = decrypt(user.mfa_secret)

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      throw new ValidationError('Kode MFA tidak valid')
    }

    await this.db
      .withSchema(tenantSchema)
      .table('users')
      .where({ id: userId })
      .update({ mfa_enabled: true })

    logger.info('MFA enabled', { userId })
    return true
  }

  async verifyMFA(
    userId: string,
    token: string,
    tenantSchema: string,
  ): Promise<boolean> {
    const user = await this.getUser(userId, tenantSchema)

    if (!user.mfa_enabled || !user.mfa_secret) {
      throw new ValidationError('MFA tidak aktif untuk akun ini')
    }

    const decryptedSecret = decrypt(user.mfa_secret)

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      throw new ValidationError('Kode MFA tidak valid')
    }

    return true
  }

  async disableMFA(userId: string, tenantSchema: string): Promise<void> {
    const user = await this.getUser(userId, tenantSchema)

    if (!user.mfa_enabled) {
      throw new ValidationError('MFA tidak aktif')
    }

    await this.db
      .withSchema(tenantSchema)
      .table('users')
      .where({ id: userId })
      .update({
        mfa_enabled: false,
        mfa_secret: null,
      })

    logger.info('MFA disabled', { userId })
  }

  async isMfaEnabled(userId: string, tenantSchema: string): Promise<boolean> {
    const user = await this.getUser(userId, tenantSchema)
    return user.mfa_enabled
  }

  // --- Super Admin MFA methods ---

  async setupSuperAdminMFA(
    saId: string,
  ): Promise<{ secret: string; qrCodeUrl: string; otpauthUrl: string }> {
    const sa = await this.getSuperAdmin(saId)

    if (sa.mfa_enabled) {
      throw new ConflictError('MFA sudah diaktifkan untuk akun ini')
    }

    const secret = speakeasy.generateSecret({
      name: `${env.security.mfaIssuer} SA (${sa.email})`,
      issuer: env.security.mfaIssuer,
      length: 20,
    })

    const encryptedSecret = encrypt(secret.base32)

    await this.db('super_admins')
      .where({ id: saId })
      .update({ mfa_secret: encryptedSecret })

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '')

    logger.info('Super admin MFA setup initiated', { saId })

    return {
      secret: secret.base32,
      qrCodeUrl,
      otpauthUrl: secret.otpauth_url || '',
    }
  }

  async verifySuperAdminMFAAndActivate(
    saId: string,
    token: string,
  ): Promise<boolean> {
    const sa = await this.getSuperAdmin(saId)

    if (!sa.mfa_secret) {
      throw new ValidationError('MFA belum di-setup. Jalankan setup terlebih dahulu.')
    }

    const decryptedSecret = decrypt(sa.mfa_secret)

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      throw new ValidationError('Kode MFA tidak valid')
    }

    await this.db('super_admins')
      .where({ id: saId })
      .update({ mfa_enabled: true })

    logger.info('Super admin MFA enabled', { saId })
    return true
  }

  async verifySuperAdminMFA(saId: string, token: string): Promise<boolean> {
    const sa = await this.getSuperAdmin(saId)

    if (!sa.mfa_enabled || !sa.mfa_secret) {
      throw new ValidationError('MFA tidak aktif untuk akun ini')
    }

    const decryptedSecret = decrypt(sa.mfa_secret)

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      throw new ValidationError('Kode MFA tidak valid')
    }

    return true
  }

  async disableSuperAdminMFA(saId: string): Promise<void> {
    const sa = await this.getSuperAdmin(saId)

    if (!sa.mfa_enabled) {
      throw new ValidationError('MFA tidak aktif')
    }

    await this.db('super_admins')
      .where({ id: saId })
      .update({ mfa_enabled: false, mfa_secret: null })

    logger.info('Super admin MFA disabled', { saId })
  }

  async isSuperAdminMfaEnabled(saId: string): Promise<boolean> {
    const sa = await this.getSuperAdmin(saId)
    return sa.mfa_enabled
  }

  private async getSuperAdmin(saId: string): Promise<UserMfaRow> {
    const sa = await this.db('super_admins')
      .select('id', 'email', 'mfa_enabled', 'mfa_secret')
      .where({ id: saId })
      .first<UserMfaRow>()

    if (!sa) {
      throw new NotFoundError('Super Admin')
    }

    return sa
  }

  private async getUser(
    userId: string,
    tenantSchema: string,
  ): Promise<UserMfaRow> {
    const user = await this.db
      .withSchema(tenantSchema)
      .select('id', 'email', 'mfa_enabled', 'mfa_secret')
      .from('users')
      .where({ id: userId })
      .whereNull('deleted_at')
      .first<UserMfaRow>()

    if (!user) {
      throw new NotFoundError('User')
    }

    return user
  }
}
