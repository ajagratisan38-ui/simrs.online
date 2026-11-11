import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError } from '../../shared/errors'

interface FeeTransactionResult {
  id: string
  practitioner_id: string
  order_id: string
  session_id: string | null
  visit_id: string | null
  deskripsi: string
  tarif_sesi: number
  jumlah_practitioner: number
  jumlah_rs: number
  fee_share_persen: number
  fee_share_rs_persen: number
  created_at: string
}

export class PractitionerFeeService {
  constructor(private db: Knex) {}

  /**
   * Record fee split when a rehabilitation session is completed.
   * Automatically calculates practitioner vs RS share based on contract.
   */
  async recordSessionFee(
    sessionId: string,
    tenantSchema: string,
  ): Promise<FeeTransactionResult> {
    const session = await this.db
      .withSchema(tenantSchema)
      .select('rs.*', 'ro.tarif_per_sesi', 'ro.therapy_type', 'ro.visit_id', 'ro.practitioner_id as order_practitioner_id')
      .from('rehabilitation_sessions as rs')
      .join('rehabilitation_orders as ro', 'ro.id', 'rs.order_id')
      .where('rs.id', sessionId)
      .first()

    if (!session) throw new NotFoundError('Sesi rehabilitasi')

    const practitionerId = session.practitioner_id || session.order_practitioner_id
    if (!practitionerId) {
      logger.warn(`Session ${sessionId} has no practitioner, skipping fee`, { tenantSchema })
      throw new NotFoundError('Tidak ada tenaga luar yang ditugaskan pada sesi ini')
    }

    const practitioner = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'profesi', 'fee_share_persen', 'fee_share_rs_persen')
      .from('external_practitioners')
      .where('id', practitionerId)
      .first()

    if (!practitioner) throw new NotFoundError('Tenaga kesehatan luar')

    const tarif = Number(session.tarif_per_sesi) || 0
    const feePersen = Number(practitioner.fee_share_persen) || 70
    const feeRsPersen = Number(practitioner.fee_share_rs_persen) || 30
    const jumlahPractitioner = Math.round((tarif * feePersen) / 100 * 100) / 100
    const jumlahRs = Math.round((tarif * feeRsPersen) / 100 * 100) / 100

    const therapyLabels: Record<string, string> = {
      fisioterapi: 'Fisioterapi',
      terapi_wicara: 'Terapi Wicara',
      terapi_okupasi: 'Terapi Okupasi',
      terapi_psikologi: 'Terapi Psikologi',
      terapi_respirasi: 'Terapi Respirasi',
      rehabilitasi_jantung: 'Rehab Jantung',
      rehabilitasi_neurologi: 'Rehab Neurologi',
      lainnya: 'Rehabilitasi',
    }
    const label = therapyLabels[session.therapy_type as string] || 'Rehabilitasi'

    const [tx] = await this.db
      .withSchema(tenantSchema)
      .insert({
        practitioner_id: practitionerId,
        order_id: session.order_id,
        session_id: sessionId,
        visit_id: session.visit_id || null,
        deskripsi: `${label} Sesi #${session.sesi_ke} — ${practitioner.nama}`,
        tarif_sesi: tarif,
        jumlah_practitioner: jumlahPractitioner,
        jumlah_rs: jumlahRs,
        fee_share_persen: feePersen,
        fee_share_rs_persen: feeRsPersen,
      })
      .into('practitioner_fee_transactions')
      .returning('*')

    logger.info(`Practitioner fee recorded: ${practitioner.nama} — Rp${jumlahPractitioner} / RS Rp${jumlahRs}`, {
      tenantSchema,
      sessionId,
      orderId: session.order_id,
    })

    return tx
  }

  /**
   * Get fee transactions for a specific practitioner with totals.
   */
  async getPractitionerEarnings(
    practitionerId: string,
    tenantSchema: string,
    filters?: { start?: string; end?: string },
  ) {
    let query = this.db
      .withSchema(tenantSchema)
      .select('pft.*', 'ro.therapy_type')
      .from('practitioner_fee_transactions as pft')
      .join('rehabilitation_orders as ro', 'ro.id', 'pft.order_id')
      .where('pft.practitioner_id', practitionerId)
      .orderBy('pft.created_at', 'desc')

    if (filters?.start) {
      query = query.where('pft.created_at', '>=', filters.start)
    }
    if (filters?.end) {
      query = query.where('pft.created_at', '<=', `${filters.end} 23:59:59`)
    }

    const transactions = await query

    const totals = transactions.reduce(
      (acc, tx) => ({
        total_tarif: acc.total_tarif + Number(tx.tarif_sesi),
        total_practitioner: acc.total_practitioner + Number(tx.jumlah_practitioner),
        total_rs: acc.total_rs + Number(tx.jumlah_rs),
        jumlah_sesi: acc.jumlah_sesi + 1,
      }),
      { total_tarif: 0, total_practitioner: 0, total_rs: 0, jumlah_sesi: 0 },
    )

    return { transactions, totals }
  }

  /**
   * Get fee transactions for a specific order.
   */
  async getOrderFees(orderId: string, tenantSchema: string) {
    const transactions = await this.db
      .withSchema(tenantSchema)
      .select('pft.*', 'ep.nama as practitioner_nama')
      .from('practitioner_fee_transactions as pft')
      .join('external_practitioners as ep', 'ep.id', 'pft.practitioner_id')
      .where('pft.order_id', orderId)
      .orderBy('pft.created_at', 'asc')

    return transactions
  }

  /**
   * Summary report: all practitioners earnings in a period.
   */
  async getFeeSummary(
    tenantSchema: string,
    filters?: { start?: string; end?: string },
  ) {
    let query = this.db
      .withSchema(tenantSchema)
      .select(
        'ep.id',
        'ep.nama',
        'ep.profesi',
        'ep.instansi_asal',
        'ep.fee_share_persen',
        'ep.fee_share_rs_persen',
      )
      .count('pft.id as jumlah_sesi')
      .sum('pft.tarif_sesi as total_tarif')
      .sum('pft.jumlah_practitioner as total_practitioner')
      .sum('pft.jumlah_rs as total_rs')
      .from('practitioner_fee_transactions as pft')
      .join('external_practitioners as ep', 'ep.id', 'pft.practitioner_id')
      .groupBy('ep.id', 'ep.nama', 'ep.profesi', 'ep.instansi_asal', 'ep.fee_share_persen', 'ep.fee_share_rs_persen')
      .orderBy('total_practitioner', 'desc')

    if (filters?.start) {
      query = query.where('pft.created_at', '>=', filters.start)
    }
    if (filters?.end) {
      query = query.where('pft.created_at', '<=', `${filters.end} 23:59:59`)
    }

    const rows = await query

    const grandTotal = rows.reduce(
      (acc, r) => ({
        total_tarif: acc.total_tarif + Number(r.total_tarif || 0),
        total_practitioner: acc.total_practitioner + Number(r.total_practitioner || 0),
        total_rs: acc.total_rs + Number(r.total_rs || 0),
        jumlah_sesi: acc.jumlah_sesi + Number(r.jumlah_sesi || 0),
      }),
      { total_tarif: 0, total_practitioner: 0, total_rs: 0, jumlah_sesi: 0 },
    )

    return { practitioners: rows, grandTotal }
  }
}
