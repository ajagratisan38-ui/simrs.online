import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

export interface OnboardingStatus {
  completed: boolean
  steps: {
    profile: boolean
    rooms: boolean
    doctors: boolean
    schedules: boolean
  }
  tenant: {
    name: string
    slug: string
    logo_url: string | null
    address: string | null
    phone: string | null
    email: string | null
    settings: Record<string, unknown>
  }
  counts: {
    rooms: number
    doctors: number
    schedules: number
    users: number
  }
}

export class OnboardingService {
  constructor(private db: Knex) {}

  async getStatus(tenantId: string, tenantSchema: string): Promise<OnboardingStatus> {
    const tenant = await this.db('tenants').where({ id: tenantId }).first()
    if (!tenant) throw new NotFoundError('Tenant')

    const settings = typeof tenant.settings === 'string'
      ? JSON.parse(tenant.settings)
      : tenant.settings || {}

    // Count resources
    const countFrom = async (table: string): Promise<number> => {
      try {
        const result = await this.db.raw(
          `SELECT COUNT(*) as cnt FROM "${tenantSchema}"."${table}"`,
        )
        return Number(result.rows[0]?.cnt || 0)
      } catch {
        return 0
      }
    }

    const [rooms, doctors, users] = await Promise.all([
      countFrom('rooms'),
      countFrom('doctors'),
      countFrom('users'),
    ])

    // Check schedules
    let schedules = 0
    try {
      const result = await this.db.raw(
        `SELECT COUNT(*) as cnt FROM "${tenantSchema}"."doctor_schedules"`,
      )
      schedules = Number(result.rows[0]?.cnt || 0)
    } catch {
      schedules = 0
    }

    // Profile is "done" if RS name, address, phone are filled
    const profileDone = !!(tenant.name && tenant.address && tenant.phone)

    return {
      completed: tenant.onboarding_completed || false,
      steps: {
        profile: profileDone,
        rooms: rooms > 0,
        doctors: doctors > 0,
        schedules: schedules > 0,
      },
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.logo_url || null,
        address: tenant.address || null,
        phone: tenant.phone || null,
        email: tenant.email || null,
        settings,
      },
      counts: { rooms, doctors, schedules, users },
    }
  }

  async updateProfile(
    tenantId: string,
    data: {
      name?: string
      address?: string
      phone?: string
      email?: string
      logo_url?: string
      settings?: Record<string, unknown>
    },
  ): Promise<void> {
    const tenant = await this.db('tenants').where({ id: tenantId }).first()
    if (!tenant) throw new NotFoundError('Tenant')

    const currentSettings = typeof tenant.settings === 'string'
      ? JSON.parse(tenant.settings)
      : tenant.settings || {}

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (data.name) update.name = data.name
    if (data.address) update.address = data.address
    if (data.phone) update.phone = data.phone
    if (data.email) update.email = data.email
    if (data.logo_url) update.logo_url = data.logo_url
    if (data.settings) {
      update.settings = JSON.stringify({ ...currentSettings, ...data.settings })
    }

    await this.db('tenants').where({ id: tenantId }).update(update)
    logger.info('Onboarding: profile updated', { tenantId })
  }

  async addRoom(
    tenantSchema: string,
    data: { kode: string; nama: string; tipe: string },
  ): Promise<{ id: string }> {
    const [room] = await this.db.withSchema(tenantSchema)
      .insert({
        kode: data.kode,
        nama: data.nama,
        tipe: data.tipe,
        is_active: true,
      })
      .into('rooms')
      .returning('id')

    logger.info('Onboarding: room added', { tenantSchema, kode: data.kode })
    return { id: room.id || room }
  }

  async addDoctor(
    tenantSchema: string,
    data: {
      name: string
      email: string
      password_hash: string
      sip?: string
      spesialisasi?: string
    },
  ): Promise<{ userId: string; doctorId: string }> {
    // Create user
    const [user] = await this.db.withSchema(tenantSchema)
      .insert({
        name: data.name,
        email: data.email,
        password_hash: data.password_hash,
        role: 'dokter',
        is_active: true,
      })
      .into('users')
      .returning('id')

    const userId = user.id || user

    // Create doctor record
    const [doctor] = await this.db.withSchema(tenantSchema)
      .insert({
        user_id: userId,
        nama: data.name,
        sip: data.sip || null,
        spesialisasi: data.spesialisasi || 'Umum',
        is_active: true,
      })
      .into('doctors')
      .returning('id')

    logger.info('Onboarding: doctor added', { tenantSchema, name: data.name })
    return { userId, doctorId: doctor.id || doctor }
  }

  async completeOnboarding(tenantId: string): Promise<void> {
    await this.db('tenants')
      .where({ id: tenantId })
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })

    logger.info('Onboarding completed', { tenantId })
  }

  async skipOnboarding(tenantId: string): Promise<void> {
    await this.db('tenants')
      .where({ id: tenantId })
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })

    logger.info('Onboarding skipped', { tenantId })
  }
}
