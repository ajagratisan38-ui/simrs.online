import { Knex } from 'knex'
import crypto from 'crypto'
import { logger } from '../../shared/logger'
import { ValidationError, NotFoundError } from '../../shared/errors'

interface SiranapConfig {
  kode_rs: string
  password: string
  endpoint: string
  auto_send: boolean
  send_times: string[]
  send_on_change: boolean
}

interface RoomBedSummary {
  kode_ruang: string
  nama_ruang: string
  kelas: number | null
  total_tt: number
  terpakai_pria: number
  terpakai_wanita: number
  kosong_pria: number
  kosong_wanita: number
  waiting: number
}

interface SiranapSubmission {
  id: string
  tenant_schema: string
  status: 'success' | 'failed' | 'pending'
  rooms_sent: number
  response_code: string | null
  response_message: string | null
  error_message: string | null
  duration_ms: number | null
  payload_xml: string | null
  created_at: Date
}

const SIRANAP_DEFAULT_ENDPOINT = 'https://sirs.yankes.kemkes.go.id/sirsservice/ranap'

export class SiranapService {
  constructor(private db: Knex) {}

  // ==================== CONFIG ====================

  async getConfig(tenantSchema: string): Promise<SiranapConfig> {
    const row = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('siranap_config')
      .first()

    if (!row) {
      return {
        kode_rs: '',
        password: '',
        endpoint: SIRANAP_DEFAULT_ENDPOINT,
        auto_send: false,
        send_times: ['06:00', '18:00'],
        send_on_change: false,
      }
    }

    return {
      kode_rs: row.kode_rs || '',
      password: row.password || '',
      endpoint: row.endpoint || SIRANAP_DEFAULT_ENDPOINT,
      auto_send: row.auto_send ?? false,
      send_times: row.send_times ? JSON.parse(row.send_times) : ['06:00', '18:00'],
      send_on_change: row.send_on_change ?? false,
    }
  }

  async updateConfig(
    tenantSchema: string,
    data: Partial<SiranapConfig>,
    userId: string,
  ): Promise<SiranapConfig> {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('siranap_config')
      .first()

    const row: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
    }

    if (data.kode_rs !== undefined) row.kode_rs = data.kode_rs
    if (data.password !== undefined) row.password = data.password
    if (data.endpoint !== undefined) row.endpoint = data.endpoint || SIRANAP_DEFAULT_ENDPOINT
    if (data.auto_send !== undefined) row.auto_send = data.auto_send
    if (data.send_times !== undefined) row.send_times = JSON.stringify(data.send_times)
    if (data.send_on_change !== undefined) row.send_on_change = data.send_on_change

    if (existing) {
      await this.db.withSchema(tenantSchema)
        .from('siranap_config')
        .where({ id: existing.id })
        .update(row)
    } else {
      row.created_by = userId
      await this.db.withSchema(tenantSchema)
        .insert(row)
        .into('siranap_config')
    }

    logger.info('SIRANAP config updated', { tenantSchema, userId })
    return this.getConfig(tenantSchema)
  }

  // ==================== LIVE BED DATA ====================

  async getLiveBedData(tenantSchema: string): Promise<RoomBedSummary[]> {
    const rooms = await this.db
      .withSchema(tenantSchema)
      .select(
        'r.id',
        'r.kode',
        'r.nama',
        'r.kelas',
        'r.kapasitas',
      )
      .from('rooms as r')
      .where('r.tipe', 'rawat_inap')
      .where('r.is_active', true)
      .orderBy('r.kode')

    const results: RoomBedSummary[] = []

    for (const room of rooms) {
      const beds = await this.db
        .withSchema(tenantSchema)
        .select(
          'b.status',
          'b.current_patient_id',
          'p.jenis_kelamin',
        )
        .from('beds as b')
        .leftJoin('patients as p', 'p.id', 'b.current_patient_id')
        .where('b.room_id', room.id)

      let terpakai_pria = 0
      let terpakai_wanita = 0
      let kosong = 0

      for (const bed of beds) {
        if (bed.status === 'terisi' && bed.current_patient_id) {
          if (bed.jenis_kelamin === 'L') {
            terpakai_pria++
          } else {
            terpakai_wanita++
          }
        } else if (bed.status === 'tersedia') {
          kosong++
        }
      }

      const totalTT = beds.filter(
        (b: { status: string }) => b.status !== 'maintenance',
      ).length

      const halfKosong = Math.floor(kosong / 2)
      const kosongRemainder = kosong % 2

      results.push({
        kode_ruang: room.kode,
        nama_ruang: room.nama,
        kelas: room.kelas ? Number(room.kelas) : null,
        total_tt: totalTT,
        terpakai_pria,
        terpakai_wanita,
        kosong_pria: halfKosong + kosongRemainder,
        kosong_wanita: halfKosong,
        waiting: 0,
      })
    }

    return results
  }

  // ==================== BUILD XML ====================

  buildXmlPayload(
    kodeRs: string,
    bedData: RoomBedSummary[],
  ): string {
    const roomElements = bedData.map((r) => `
    <data>
      <kode_ruang>${this.escapeXml(r.kode_ruang)}</kode_ruang>
      <nama_ruang>${this.escapeXml(r.nama_ruang)}</nama_ruang>
      <kelas>${r.kelas ?? 0}</kelas>
      <total_TT>${r.total_tt}</total_TT>
      <terpakai_male>${r.terpakai_pria}</terpakai_male>
      <terpakai_female>${r.terpakai_wanita}</terpakai_female>
      <kosong_male>${r.kosong_pria}</kosong_male>
      <kosong_female>${r.kosong_wanita}</kosong_female>
      <waiting>${r.waiting}</waiting>
    </data>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <kode_rs>${this.escapeXml(kodeRs)}</kode_rs>
  <daftar_ruang>${roomElements}
  </daftar_ruang>
</root>`
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  // ==================== SEND TO KEMENKES ====================

  async sendToKemenkes(
    tenantSchema: string,
    userId?: string,
  ): Promise<SiranapSubmission> {
    const config = await this.getConfig(tenantSchema)

    if (!config.kode_rs || !config.password) {
      throw new ValidationError(
        'Konfigurasi SIRANAP belum lengkap. Isi Kode RS dan Password terlebih dahulu.',
      )
    }

    const startTime = Date.now()
    const bedData = await this.getLiveBedData(tenantSchema)

    if (bedData.length === 0) {
      throw new ValidationError(
        'Tidak ada data ruang rawat inap aktif untuk dikirim.',
      )
    }

    const xml = this.buildXmlPayload(config.kode_rs, bedData)
    const passwordMd5 = crypto.createHash('md5').update(config.password).digest('hex')

    let status: 'success' | 'failed' = 'success'
    let responseCode: string | null = null
    let responseMessage: string | null = null
    let errorMessage: string | null = null

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'X-rs-id': config.kode_rs,
          'X-pass': passwordMd5,
        },
        body: xml,
        signal: AbortSignal.timeout(30_000),
      })

      const responseText = await response.text()

      if (response.ok) {
        responseCode = String(response.status)
        responseMessage = responseText.substring(0, 500)
        status = 'success'
        logger.info('SIRANAP submission success', {
          tenantSchema,
          kodeRs: config.kode_rs,
          roomsSent: bedData.length,
          httpStatus: response.status,
        })
      } else {
        status = 'failed'
        responseCode = String(response.status)
        errorMessage = `HTTP ${response.status}: ${responseText.substring(0, 500)}`
        logger.warn('SIRANAP submission failed', {
          tenantSchema,
          httpStatus: response.status,
          body: responseText.substring(0, 200),
        })
      }
    } catch (err) {
      status = 'failed'
      errorMessage = (err as Error).message
      logger.error('SIRANAP submission error', {
        tenantSchema,
        error: errorMessage,
      })
    }

    const durationMs = Date.now() - startTime

    const [submission] = await this.db
      .withSchema(tenantSchema)
      .insert({
        status,
        rooms_sent: bedData.length,
        response_code: responseCode,
        response_message: responseMessage,
        error_message: errorMessage,
        duration_ms: durationMs,
        payload_xml: xml,
        triggered_by: userId || 'scheduler',
      })
      .into('siranap_submissions')
      .returning('*')

    return submission
  }

  // ==================== TEST CONNECTION ====================

  async testConnection(tenantSchema: string): Promise<{
    success: boolean
    message: string
    latencyMs: number
  }> {
    const config = await this.getConfig(tenantSchema)

    if (!config.kode_rs || !config.password) {
      return {
        success: false,
        message: 'Kode RS dan Password belum diisi',
        latencyMs: 0,
      }
    }

    const startTime = Date.now()

    try {
      const response = await fetch(config.endpoint, {
        method: 'HEAD',
        headers: {
          'X-rs-id': config.kode_rs,
        },
        signal: AbortSignal.timeout(10_000),
      })

      const latencyMs = Date.now() - startTime

      return {
        success: response.status < 500,
        message: response.status < 500
          ? `Terhubung (HTTP ${response.status}, ${latencyMs}ms)`
          : `Server error (HTTP ${response.status})`,
        latencyMs,
      }
    } catch (err) {
      return {
        success: false,
        message: `Gagal koneksi: ${(err as Error).message}`,
        latencyMs: Date.now() - startTime,
      }
    }
  }

  // ==================== SUBMISSION LOG ====================

  async listSubmissions(
    tenantSchema: string,
    options?: {
      limit?: number
      offset?: number
      status?: 'success' | 'failed'
      days?: number
    },
  ) {
    const limit = options?.limit ?? 20
    const offset = options?.offset ?? 0

    let query = this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('siranap_submissions')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    if (options?.status) {
      query = query.where('status', options.status)
    }

    if (options?.days) {
      const since = new Date()
      since.setDate(since.getDate() - options.days)
      query = query.where('created_at', '>=', since)
    }

    const [submissions, countResult] = await Promise.all([
      query,
      this.db.withSchema(tenantSchema)
        .count('id as cnt')
        .from('siranap_submissions')
        .first(),
    ])

    return {
      data: submissions,
      total: Number(countResult?.cnt ?? 0),
      limit,
      offset,
    }
  }

  async getSubmission(id: string, tenantSchema: string) {
    const submission = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('siranap_submissions')
      .where({ id })
      .first()

    if (!submission) throw new NotFoundError('Submission SIRANAP')
    return submission
  }

  async getStats(tenantSchema: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalResult,
      todayResult,
      successResult,
      failedResult,
      lastSuccess,
      lastSubmission,
    ] = await Promise.all([
      this.db.withSchema(tenantSchema)
        .count('id as cnt').from('siranap_submissions').first(),
      this.db.withSchema(tenantSchema)
        .count('id as cnt').from('siranap_submissions')
        .where('created_at', '>=', today).first(),
      this.db.withSchema(tenantSchema)
        .count('id as cnt').from('siranap_submissions')
        .where('status', 'success').first(),
      this.db.withSchema(tenantSchema)
        .count('id as cnt').from('siranap_submissions')
        .where('status', 'failed').first(),
      this.db.withSchema(tenantSchema)
        .select('*').from('siranap_submissions')
        .where('status', 'success')
        .orderBy('created_at', 'desc').first(),
      this.db.withSchema(tenantSchema)
        .select('*').from('siranap_submissions')
        .orderBy('created_at', 'desc').first(),
    ])

    const total = Number(totalResult?.cnt ?? 0)
    const successCount = Number(successResult?.cnt ?? 0)

    return {
      total,
      today: Number(todayResult?.cnt ?? 0),
      success: successCount,
      failed: Number(failedResult?.cnt ?? 0),
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      lastSuccess: lastSuccess?.created_at ?? null,
      lastSubmission: lastSubmission?.created_at ?? null,
      lastStatus: lastSubmission?.status ?? null,
    }
  }

  // ==================== SCHEDULER SUPPORT ====================

  async checkAndSendScheduled(): Promise<{
    tenant: string
    sent: boolean
    result?: SiranapSubmission
    error?: string
  }[]> {
    const tenants = await this.db
      .select('slug')
      .from('tenants')
      .where('is_active', true)

    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const results: {
      tenant: string
      sent: boolean
      result?: SiranapSubmission
      error?: string
    }[] = []

    for (const tenant of tenants) {
      const tenantSchema = `tenant_${tenant.slug}`

      try {
        const hasTable = await this.db.schema
          .withSchema(tenantSchema)
          .hasTable('siranap_config')

        if (!hasTable) continue

        const config = await this.getConfig(tenantSchema)

        if (!config.auto_send || !config.kode_rs || !config.password) continue

        const shouldSend = config.send_times.some((time) => {
          const [h, m] = time.split(':')
          const scheduledTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
          const diff = Math.abs(
            this.timeToMinutes(currentTime) - this.timeToMinutes(scheduledTime),
          )
          return diff <= 7
        })

        if (!shouldSend) {
          results.push({ tenant: tenantSchema, sent: false })
          continue
        }

        const recentSent = await this.db
          .withSchema(tenantSchema)
          .select('id')
          .from('siranap_submissions')
          .where('created_at', '>=', new Date(now.getTime() - 30 * 60_000))
          .first()

        if (recentSent) {
          results.push({ tenant: tenantSchema, sent: false })
          continue
        }

        const result = await this.sendToKemenkes(tenantSchema, 'scheduler')
        results.push({ tenant: tenantSchema, sent: true, result })
      } catch (err) {
        results.push({
          tenant: tenantSchema,
          sent: false,
          error: (err as Error).message,
        })
      }
    }

    return results
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
}
