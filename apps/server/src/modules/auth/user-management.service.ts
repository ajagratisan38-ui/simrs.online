import bcrypt from 'bcryptjs'
import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'

const SALT_ROUNDS = 12

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: string
  is_active?: boolean
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: string
  is_active?: boolean
}

export class UserManagementService {
  constructor(private db: Knex) {}

  async listUsers(tenantSchema: string, page = 1, limit = 20, search?: string) {
    const offset = (page - 1) * limit

    const query = this.db
      .withSchema(tenantSchema)
      .from('users')
      .whereNull('deleted_at')

    if (search) {
      query.andWhere(function () {
        this.whereILike('name', `%${search}%`)
          .orWhereILike('email', `%${search}%`)
      })
    }

    const [{ count }] = await query.clone().count('id as count')
    const total = Number(count)

    const users = await query
      .clone()
      .select('id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at')
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getUserById(userId: string, tenantSchema: string) {
    const user = await this.db
      .withSchema(tenantSchema)
      .select('id', 'name', 'email', 'role', 'is_active', 'mfa_enabled', 'last_login_at', 'created_at', 'updated_at')
      .from('users')
      .where({ id: userId })
      .whereNull('deleted_at')
      .first()

    if (!user) throw new NotFoundError('Pengguna')
    return user
  }

  async createUser(data: CreateUserInput, creatorId: string, tenantSchema: string) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('users')
      .where({ email: data.email })
      .whereNull('deleted_at')
      .first()

    if (existing) {
      throw new ConflictError('Email sudah terdaftar')
    }

    const validRoles = ['admin', 'dokter', 'perawat', 'apoteker', 'kasir', 'pendaftaran', 'rekam_medis', 'manajemen', 'lab', 'radiologi']
    if (!validRoles.includes(data.role)) {
      throw new ValidationError(`Role tidak valid. Pilihan: ${validRoles.join(', ')}`)
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)

    const [user] = await this.db
      .withSchema(tenantSchema)
      .insert({
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        role: data.role,
        is_active: data.is_active !== false,
      })
      .into('users')
      .returning(['id', 'name', 'email', 'role', 'is_active', 'created_at'])

    logger.info('User created', { userId: user.id, email: data.email, role: data.role })
    return user
  }

  async updateUser(userId: string, data: UpdateUserInput, updaterId: string, tenantSchema: string) {
    const user = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('users')
      .where({ id: userId })
      .whereNull('deleted_at')
      .first()

    if (!user) throw new NotFoundError('Pengguna')

    if (data.email) {
      const existing = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('users')
        .where({ email: data.email })
        .whereNot({ id: userId })
        .whereNull('deleted_at')
        .first()

      if (existing) throw new ConflictError('Email sudah digunakan pengguna lain')
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (data.name) updateData.name = data.name
    if (data.email) updateData.email = data.email
    if (data.role) updateData.role = data.role
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    await this.db
      .withSchema(tenantSchema)
      .from('users')
      .where({ id: userId })
      .update(updateData)

    logger.info('User updated', { userId, changes: Object.keys(updateData) })
    return this.getUserById(userId, tenantSchema)
  }

  async resetPassword(userId: string, newPassword: string, updaterId: string, tenantSchema: string) {
    const user = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('users')
      .where({ id: userId })
      .whereNull('deleted_at')
      .first()

    if (!user) throw new NotFoundError('Pengguna')

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

    await this.db
      .withSchema(tenantSchema)
      .from('users')
      .where({ id: userId })
      .update({ password_hash: passwordHash, updated_at: new Date() })

    logger.info('User password reset by admin', { userId, updaterId })
  }

  async deleteUser(userId: string, deleterId: string, tenantSchema: string) {
    if (userId === deleterId) {
      throw new ValidationError('Tidak bisa menghapus akun sendiri')
    }

    const user = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('users')
      .where({ id: userId })
      .whereNull('deleted_at')
      .first()

    if (!user) throw new NotFoundError('Pengguna')

    await this.db
      .withSchema(tenantSchema)
      .from('users')
      .where({ id: userId })
      .update({ deleted_at: new Date(), updated_at: new Date() })

    logger.info('User soft-deleted', { userId, deleterId })
  }
}
