import { Knex } from 'knex'
import { logger } from '../../shared/logger'

export interface TenantProfile {
  id: string
  name: string
  slug: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  subscription_plan: string
  subscription_expires_at: string | null
  is_active: boolean
  settings: TenantSettings
  created_at: string
  updated_at: string
}

export interface TenantSettings {
  timezone?: string
  locale?: string
  currency?: string
  kode_rs?: string
  kelas_rs?: string
  direktur?: string
  jumlah_tt?: number
  fax?: string
  website?: string
  npwp?: string
  provinsi?: string
  kabupaten?: string
  kecamatan?: string
  kode_pos?: string
  bpjs_sep_limit?: number
}

export interface UpdateTenantInput {
  name?: string
  address?: string
  phone?: string
  email?: string
  logo_url?: string
  settings?: Partial<TenantSettings>
}

export class TenantService {
  constructor(private db: Knex) {}

  async getProfile(tenantId: string): Promise<TenantProfile | null> {
    const row = await this.db('tenants').where('id', tenantId).first()
    if (!row) return null

    return {
      ...row,
      settings: typeof row.settings === 'string'
        ? JSON.parse(row.settings)
        : row.settings || {},
    }
  }

  async updateProfile(
    tenantId: string,
    data: UpdateTenantInput,
  ): Promise<TenantProfile | null> {
    const existing = await this.db('tenants').where('id', tenantId).first()
    if (!existing) return null

    const currentSettings = typeof existing.settings === 'string'
      ? JSON.parse(existing.settings)
      : existing.settings || {}

    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.address !== undefined) updateData.address = data.address
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url

    if (data.settings) {
      updateData.settings = JSON.stringify({
        ...currentSettings,
        ...data.settings,
      })
    }

    updateData.updated_at = new Date().toISOString()

    await this.db('tenants').where('id', tenantId).update(updateData)

    logger.info('Tenant profile updated', { tenantId })

    return this.getProfile(tenantId)
  }

  async getStats(tenantSchema: string): Promise<{
    totalUsers: number
    totalPatients: number
    totalDoctors: number
    totalRooms: number
    totalBeds: number
  }> {
    const countQuery = async (table: string): Promise<number> => {
      try {
        const result = await this.db.raw(
          `SELECT COUNT(*) as cnt FROM "${tenantSchema}"."${table}" WHERE deleted_at IS NULL`,
        )
        return Number(result.rows[0]?.cnt || 0)
      } catch {
        try {
          const result = await this.db.raw(
            `SELECT COUNT(*) as cnt FROM "${tenantSchema}"."${table}"`,
          )
          return Number(result.rows[0]?.cnt || 0)
        } catch {
          return 0
        }
      }
    }

    const [totalUsers, totalPatients, totalDoctors, totalRooms, totalBeds] =
      await Promise.all([
        countQuery('users'),
        countQuery('patients'),
        countQuery('doctors'),
        countQuery('rooms'),
        countQuery('beds'),
      ])

    return { totalUsers, totalPatients, totalDoctors, totalRooms, totalBeds }
  }
}
