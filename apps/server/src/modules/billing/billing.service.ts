import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'
import type { ProcessPaymentInput } from './billing.validator'
import { DoctorService } from '../doctor/doctor.service'

interface BillItem {
  kategori: string
  deskripsi: string
  qty: number
  harga_satuan: number
  subtotal: number
  discount: number
  total: number
  referensi_id?: string
  referensi_tipe?: string
}

export class BillingService {
  constructor(private db: Knex) {}

  // ===================================================
  // GENERATE BILL
  // ===================================================

  async generateBill(visitId: string, userId: string, tenantSchema: string) {
    // Check visit exists
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('v.*', 'p.nama as patient_nama', 'p.no_rekam_medis')
      .from('visits as v')
      .join('patients as p', 'p.id', 'v.patient_id')
      .where('v.id', visitId)
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    // Check no duplicate bill
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('bills')
      .where({ visit_id: visitId })
      .first()

    if (existing) throw new ConflictError('Tagihan untuk kunjungan ini sudah ada')

    return this.db.transaction(async (trx) => {
      const items: BillItem[] = []

      // Determine room kelas for class-based pricing
      let roomKelas: number | null = null
      if (visit.bed_id) {
        const roomInfo = await trx.withSchema(tenantSchema)
          .select('r.kelas')
          .from('beds as b').join('rooms as r', 'r.id', 'b.room_id')
          .where('b.id', visit.bed_id).first()
        roomKelas = roomInfo?.kelas ? Number(roomInfo.kelas) : null
      }
      const visitTipe = visit.tipe as string

      // Helper to resolve class-based tariff
      const resolveKompTarif = (komp: Record<string, unknown>): number => {
        if (visitTipe === 'igd') return Number(komp.tarif_igd) || 0
        if (visitTipe !== 'rawat_inap') return Number(komp.tarif_poli) || 0
        switch (roomKelas) {
          case 3: return Number(komp.tarif_kelas_3) || 0
          case 2: return Number(komp.tarif_kelas_2) || 0
          case 1: return Number(komp.tarif_kelas_1) || 0
          case 0: return Number(komp.tarif_vip) || 0
          default: return Number(komp.tarif_kelas_3) || 0
        }
      }

      // 1. Konsultasi/Visite dokter — komponen_tarif only
      const doctor = await trx
        .withSchema(tenantSchema)
        .select('d.spesialisasi', 'u.name as doctor_nama')
        .from('doctors as d')
        .join('users as u', 'u.id', 'd.user_id')
        .where('d.id', visit.doctor_id)
        .first()

      if (doctor) {
        const spesialisasi = (doctor.spesialisasi as string || '').toLowerCase()
        let visiteKode = 'VIS-UMUM'
        if (spesialisasi.includes('sub')) visiteKode = 'VIS-SUBSPESIALIS'
        else if (spesialisasi.includes('gigi')) visiteKode = 'VIS-GIGI'
        else if (spesialisasi && spesialisasi !== 'umum') visiteKode = 'VIS-SPESIALIS'

        const kompVisite = await trx.withSchema(tenantSchema)
          .select('*').from('komponen_tarif')
          .where({ kode: visiteKode, is_active: true }).first()

        if (kompVisite) {
          const tarif = resolveKompTarif(kompVisite)
          const kelasLabel = roomKelas !== null
            ? (roomKelas === 0 ? 'VIP' : `Kelas ${roomKelas}`)
            : (visitTipe === 'igd' ? 'IGD' : 'Poli')

          if (tarif > 0) {
            items.push({
              kategori: 'konsultasi',
              deskripsi: `Visite ${doctor.doctor_nama} (${kelasLabel})`,
              qty: 1,
              harga_satuan: tarif,
              subtotal: tarif,
              discount: 0,
              total: tarif,
            })
          }
        }
      }

      // 2. Tindakan — class-based with fallback
      const procedures = await trx
        .withSchema(tenantSchema)
        .select('pr.*')
        .from('procedures as pr')
        .join('medical_records as mr', 'mr.id', 'pr.medical_record_id')
        .where('mr.visit_id', visitId)

      for (const proc of procedures) {
        let tarif = Number(proc.tarif)

        if (proc.kode_tindakan) {
          const kompTindakan = await trx.withSchema(tenantSchema)
            .select('*').from('komponen_tarif')
            .where({ kode: proc.kode_tindakan, is_active: true }).first()
          if (kompTindakan) {
            const resolved = resolveKompTarif(kompTindakan)
            if (resolved > 0) tarif = resolved
          }
        }

        const qty = Number(proc.qty)
        const total = tarif * qty
        items.push({
          kategori: 'tindakan',
          deskripsi: proc.nama_tindakan,
          qty,
          harga_satuan: tarif,
          subtotal: total,
          discount: 0,
          total,
          referensi_id: proc.id,
          referensi_tipe: 'procedure',
        })
      }

      // 3. Obat (dispensing items with harga_jual from drugs)
      const dispensingItems = await trx
        .withSchema(tenantSchema)
        .select(
          'di.id as di_id',
          'di.jumlah_diberikan',
          'di.drug_id',
          'dr.nama as drug_nama',
          'dr.harga_jual',
        )
        .from('dispensing_items as di')
        .join('dispensing as dp', 'dp.id', 'di.dispensing_id')
        .join('drugs as dr', 'dr.id', 'di.drug_id')
        .where('dp.visit_id', visitId)
        .andWhere('di.jumlah_diberikan', '>', 0)

      for (const di of dispensingItems) {
        const qty = Number(di.jumlah_diberikan)
        const harga = Number(di.harga_jual)
        const total = harga * qty
        items.push({
          kategori: 'obat',
          deskripsi: di.drug_nama,
          qty,
          harga_satuan: harga,
          subtotal: total,
          discount: 0,
          total,
          referensi_id: di.di_id,
          referensi_tipe: 'dispensing_item',
        })
      }

      // 4. Kamar — per-segment billing using bed_transfers
      if (visit.tipe === 'rawat_inap' && visit.bed_id) {
        const transfers = await trx.withSchema(tenantSchema)
          .select('*').from('bed_transfers')
          .where({ visit_id: visitId }).orderBy('transferred_at', 'asc')

        const now = new Date()
        const admissionDate = visit.tanggal ? new Date(visit.tanggal) : new Date(visit.created_at)

        if (transfers.length > 0) {
          for (let i = 0; i < transfers.length; i++) {
            const transfer = transfers[i]
            const segStart = i === 0 ? admissionDate : new Date(transfer.transferred_at as string)
            const segEnd = i < transfers.length - 1
              ? new Date(transfers[i + 1].transferred_at as string)
              : now

            const roomNama = transfer.to_room_nama as string || 'Ruangan'
            const tarif = Number(transfer.to_room_tarif) || 0
            const kelas = transfer.to_room_kelas ? ` Kelas ${transfer.to_room_kelas}` : ''
            if (tarif <= 0) continue

            const diffMs = segEnd.getTime() - segStart.getTime()
            const days = Math.max(1, isNaN(diffMs) ? 1 : Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
            const total = tarif * days

            items.push({
              kategori: 'kamar',
              deskripsi: `${roomNama}${kelas} (${days} hari)`,
              qty: days,
              harga_satuan: tarif,
              subtotal: total,
              discount: 0,
              total,
            })
          }
        } else {
          // Legacy fallback
          const bed = await trx.withSchema(tenantSchema)
            .select('b.room_id', 'r.nama as room_nama', 'r.tarif_per_hari', 'r.kelas')
            .from('beds as b').join('rooms as r', 'r.id', 'b.room_id')
            .where('b.id', visit.bed_id).first()

          if (bed && Number(bed.tarif_per_hari) > 0) {
            const diffMs = now.getTime() - admissionDate.getTime()
            const days = Math.max(1, isNaN(diffMs) ? 1 : Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
            const tarif = Number(bed.tarif_per_hari)
            const kelas = bed.kelas ? ` Kelas ${bed.kelas}` : ''
            const total = tarif * days
            items.push({
              kategori: 'kamar',
              deskripsi: `${bed.room_nama}${kelas} (${days} hari)`,
              qty: days,
              harga_satuan: tarif,
              subtotal: total,
              discount: 0,
              total,
            })
          }
        }
      }

      // 5. Jasa Perawatan Harian (rawat inap, class-based)
      if (visitTipe === 'rawat_inap') {
        const kompPerawatan = await trx.withSchema(tenantSchema)
          .select('*').from('komponen_tarif')
          .where({ kode: 'PRW-HARIAN', is_active: true }).first()

        if (kompPerawatan) {
          const tarifPrw = resolveKompTarif(kompPerawatan)
          if (tarifPrw > 0) {
            const admDate = visit.tanggal ? new Date(visit.tanggal) : new Date(visit.created_at)
            const diffMs = new Date().getTime() - admDate.getTime()
            const days = Math.max(1, isNaN(diffMs) ? 1 : Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
            items.push({
              kategori: 'tindakan',
              deskripsi: `Jasa Perawatan Harian (${days} hari)`,
              qty: days,
              harga_satuan: tarifPrw,
              subtotal: tarifPrw * days,
              discount: 0,
              total: tarifPrw * days,
            })
          }
        }
      }

      // 6. Rehabilitasi (sesi terapi dari rehabilitation_orders)
      const rehabSessions = await trx
        .withSchema(tenantSchema)
        .select(
          'rs.id as session_id',
          'rs.sesi_ke',
          'ro.tarif_per_sesi',
          'ro.therapy_type',
          'ep.nama as practitioner_nama',
          'ep.profesi as practitioner_profesi',
        )
        .from('rehabilitation_sessions as rs')
        .join('rehabilitation_orders as ro', 'ro.id', 'rs.order_id')
        .leftJoin('external_practitioners as ep', 'ep.id', 'rs.practitioner_id')
        .where('ro.visit_id', visitId)
        .andWhere('rs.status', 'selesai')

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

      for (const rs of rehabSessions) {
        const tarif = Number(rs.tarif_per_sesi)
        if (tarif <= 0) continue
        const label = therapyLabels[rs.therapy_type as string] || 'Rehabilitasi'
        const practName = rs.practitioner_nama ? ` — ${rs.practitioner_nama}` : ''
        items.push({
          kategori: 'rehabilitasi',
          deskripsi: `${label} Sesi #${rs.sesi_ke}${practName}`,
          qty: 1,
          harga_satuan: tarif,
          subtotal: tarif,
          discount: 0,
          total: tarif,
          referensi_id: rs.session_id,
          referensi_tipe: 'rehab_session',
        })
      }

      // 7. Biaya Administrasi (class-based)
      const kompAdmin = await trx.withSchema(tenantSchema)
        .select('*').from('komponen_tarif')
        .where({ kode: 'ADM-MASUK', is_active: true }).first()

      if (kompAdmin) {
        const tarifAdm = resolveKompTarif(kompAdmin)
        if (tarifAdm > 0) {
          items.push({
            kategori: 'admin',
            deskripsi: 'Biaya Administrasi',
            qty: 1,
            harga_satuan: tarifAdm,
            subtotal: tarifAdm,
            discount: 0,
            total: tarifAdm,
          })
        }
      }

      // Calculate totals
      const totalAmount = items.reduce((sum, it) => sum + it.total, 0)

      // Create bill
      const [bill] = await trx
        .withSchema(tenantSchema)
        .insert({
          visit_id: visitId,
          patient_id: visit.patient_id,
          total_amount: totalAmount,
          discount_amount: 0,
          final_amount: totalAmount,
          penjamin: visit.penjamin,
          insurance_id: visit.insurance_id ?? null,
          status: 'draft',
          created_by: userId,
        })
        .into('bills')
        .returning('*')

      // Insert bill items
      if (items.length > 0) {
        await trx
          .withSchema(tenantSchema)
          .insert(
            items.map((it) => ({
              bill_id: bill.id,
              kategori: it.kategori,
              deskripsi: it.deskripsi,
              qty: it.qty,
              harga_satuan: it.harga_satuan,
              subtotal: it.subtotal,
              discount: it.discount,
              total: it.total,
              referensi_id: it.referensi_id || null,
              referensi_tipe: it.referensi_tipe || null,
            })),
          )
          .into('bill_items')
      }

      logger.info('Bill generated', {
        billId: bill.id,
        visitId,
        totalAmount,
        itemCount: items.length,
      })

      return this.getBillDetail(bill.id, tenantSchema, trx)
    })
  }

  // ===================================================
  // GET BILL
  // ===================================================

  async getBill(visitId: string, tenantSchema: string) {
    const bill = await this.db
      .withSchema(tenantSchema)
      .select('b.*', 'p.nama as patient_nama', 'p.no_rekam_medis')
      .from('bills as b')
      .join('patients as p', 'p.id', 'b.patient_id')
      .where('b.visit_id', visitId)
      .first()

    if (!bill) throw new NotFoundError('Tagihan')

    return this.getBillDetail(bill.id, tenantSchema)
  }

  async getBillById(id: string, tenantSchema: string) {
    return this.getBillDetail(id, tenantSchema)
  }

  private async getBillDetail(
    billId: string,
    tenantSchema: string,
    conn?: Knex | Knex.Transaction,
  ) {
    const db = conn || this.db

    const bill = await db
      .withSchema(tenantSchema)
      .select(
        'b.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'v.visit_number',
        'v.tipe as visit_tipe',
        'v.tanggal',
        'v.penjamin',
        'r.nama as room_nama',
        'u.name as doctor_nama',
      )
      .from('bills as b')
      .join('patients as p', 'p.id', 'b.patient_id')
      .join('visits as v', 'v.id', 'b.visit_id')
      .join('rooms as r', 'r.id', 'v.room_id')
      .join('doctors as d', 'd.id', 'v.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .where('b.id', billId)
      .first()

    if (!bill) throw new NotFoundError('Tagihan')

    const items = await db
      .withSchema(tenantSchema)
      .select('*')
      .from('bill_items')
      .where({ bill_id: billId })
      .orderBy('created_at', 'asc')

    const payments = await db
      .withSchema(tenantSchema)
      .select('py.*', 'u.name as received_by_name')
      .from('payments as py')
      .leftJoin('users as u', 'u.id', 'py.received_by')
      .where('py.bill_id', billId)
      .orderBy('py.paid_at', 'asc')

    const totalPaid = payments.reduce(
      (sum: number, p: { jumlah: number }) => sum + Number(p.jumlah),
      0,
    )

    return {
      ...bill,
      total_amount: Number(bill.total_amount),
      discount_amount: Number(bill.discount_amount),
      final_amount: Number(bill.final_amount),
      items,
      payments,
      total_paid: totalPaid,
      sisa_bayar: Number(bill.final_amount) - totalPaid,
    }
  }

  // ===================================================
  // DISCOUNT
  // ===================================================

  async applyDiscount(
    billId: string,
    discountAmount: number,
    catatan: string,
    tenantSchema: string,
  ) {
    const bill = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'total_amount')
      .from('bills')
      .where({ id: billId })
      .first()

    if (!bill) throw new NotFoundError('Tagihan')

    if (bill.status !== 'draft') {
      throw new ValidationError('Diskon hanya bisa diterapkan pada tagihan draft')
    }

    const total = Number(bill.total_amount)
    if (discountAmount > total) {
      throw new ValidationError(
        `Diskon (${discountAmount}) tidak boleh melebihi total (${total})`,
      )
    }

    const finalAmount = total - discountAmount

    await this.db
      .withSchema(tenantSchema)
      .from('bills')
      .where({ id: billId })
      .update({
        discount_amount: discountAmount,
        final_amount: finalAmount,
        catatan,
      })

    logger.info('Discount applied', { billId, discountAmount, finalAmount })

    return this.getBillDetail(billId, tenantSchema)
  }

  // ===================================================
  // FINALIZE
  // ===================================================

  async finalizeBill(billId: string, tenantSchema: string) {
    const bill = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('bills')
      .where({ id: billId })
      .first()

    if (!bill) throw new NotFoundError('Tagihan')

    if (bill.status !== 'draft') {
      throw new ValidationError(
        `Tagihan dengan status '${bill.status}' tidak bisa difinalisasi`,
      )
    }

    await this.db
      .withSchema(tenantSchema)
      .from('bills')
      .where({ id: billId })
      .update({ status: 'final' })

    logger.info('Bill finalized', { billId })

    return this.getBillDetail(billId, tenantSchema)
  }

  // ===================================================
  // PAYMENT
  // ===================================================

  async processPayment(
    billId: string,
    data: ProcessPaymentInput,
    userId: string,
    tenantSchema: string,
  ) {
    const bill = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'final_amount')
      .from('bills')
      .where({ id: billId })
      .first()

    if (!bill) throw new NotFoundError('Tagihan')

    if (!['draft', 'final'].includes(bill.status)) {
      throw new ValidationError(
        `Tagihan dengan status '${bill.status}' tidak bisa dibayar`,
      )
    }

    return this.db.transaction(async (trx) => {
      // Get existing payments
      const [{ sum }] = await trx
        .withSchema(tenantSchema)
        .from('payments')
        .where({ bill_id: billId })
        .sum('jumlah as sum')

      const totalPaid = Number(sum) || 0
      const finalAmount = Number(bill.final_amount)
      const remaining = finalAmount - totalPaid

      if (remaining <= 0) {
        throw new ValidationError('Tagihan sudah lunas')
      }

      // Create payment
      const [payment] = await trx
        .withSchema(tenantSchema)
        .insert({
          bill_id: billId,
          metode: data.metode,
          jumlah: data.jumlah,
          referensi_pembayaran: data.referensi_pembayaran || null,
          catatan: data.catatan || null,
          received_by: userId,
          paid_at: new Date().toISOString(),
        })
        .into('payments')
        .returning('*')

      const newTotalPaid = totalPaid + data.jumlah
      const kembalian = Math.max(0, newTotalPaid - finalAmount)

      // Update bill status if fully paid
      if (newTotalPaid >= finalAmount) {
        await trx
          .withSchema(tenantSchema)
          .from('bills')
          .where({ id: billId })
          .update({ status: 'dibayar' })

        // Auto-record doctor fee transaction on full payment
        try {
          await this.recordDoctorFeeFromBill(billId, tenantSchema, trx)
        } catch (feeErr) {
          logger.warn('Auto-record doctor fee failed', {
            billId,
            error: String(feeErr),
          })
        }
      }

      logger.info('Payment processed', {
        billId,
        paymentId: payment.id,
        jumlah: data.jumlah,
        metode: data.metode,
        kembalian,
      })

      const billDetail = await this.getBillDetail(billId, tenantSchema, trx)

      return {
        payment,
        kembalian,
        bill: billDetail,
      }
    })
  }

  // ===================================================
  // REPORTS
  // ===================================================

  async getDailySummary(date: string | undefined, tenantSchema: string) {
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Total per payment method
    const byMethod = await this.db
      .withSchema(tenantSchema)
      .select('py.metode')
      .sum('py.jumlah as total')
      .count('py.id as count')
      .from('payments as py')
      .whereRaw('py.paid_at::date = ?', [targetDate])
      .groupBy('py.metode')

    // Total paid visits
    const [paidCount] = await this.db
      .withSchema(tenantSchema)
      .from('bills')
      .where('status', 'dibayar')
      .whereRaw('updated_at::date = ?', [targetDate])
      .count('id as count')

    // Total unpaid visits today
    const [unpaidCount] = await this.db
      .withSchema(tenantSchema)
      .from('bills')
      .whereIn('status', ['draft', 'final'])
      .whereRaw('created_at::date = ?', [targetDate])
      .count('id as count')

    // Grand total
    const [{ sum: grandTotal }] = await this.db
      .withSchema(tenantSchema)
      .from('payments as py')
      .whereRaw('py.paid_at::date = ?', [targetDate])
      .sum('py.jumlah as sum')

    return {
      tanggal: targetDate,
      total_pendapatan: Number(grandTotal) || 0,
      jumlah_sudah_bayar: Number(paidCount?.count) || 0,
      jumlah_belum_bayar: Number(unpaidCount?.count) || 0,
      per_metode: byMethod.map((m: { metode: string; total: string; count: string }) => ({
        metode: m.metode,
        total: Number(m.total),
        jumlah_transaksi: Number(m.count),
      })),
    }
  }

  // ===================================================
  // PATIENT BILLING HISTORY
  // ===================================================

  async getPatientBills(
    patientId: string,
    page: number,
    limit: number,
    tenantSchema: string,
  ) {
    const offset = (page - 1) * limit

    const patient = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'no_rekam_medis')
      .from('patients')
      .where({ id: patientId })
      .whereNull('deleted_at')
      .first()

    if (!patient) throw new NotFoundError('Pasien')

    const countQuery = await this.db
      .withSchema(tenantSchema)
      .from('bills')
      .where({ patient_id: patientId })
      .count('id as count')
      .first()

    const total = Number(countQuery?.count) || 0

    const bills = await this.db
      .withSchema(tenantSchema)
      .select(
        'b.*',
        'v.visit_number',
        'v.tanggal',
        'v.tipe as visit_tipe',
        'r.nama as room_nama',
        'u.name as doctor_nama',
      )
      .from('bills as b')
      .join('visits as v', 'v.id', 'b.visit_id')
      .join('rooms as r', 'r.id', 'v.room_id')
      .join('doctors as d', 'd.id', 'v.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .where('b.patient_id', patientId)
      .orderBy('b.created_at', 'desc')
      .offset(offset)
      .limit(limit)

    // For each bill, get payment summary
    for (const bill of bills) {
      const [{ sum }] = await this.db
        .withSchema(tenantSchema)
        .from('payments')
        .where({ bill_id: bill.id })
        .sum('jumlah as sum')

      bill.total_paid = Number(sum) || 0
      bill.sisa_bayar = Number(bill.final_amount) - bill.total_paid
      bill.total_amount = Number(bill.total_amount)
      bill.discount_amount = Number(bill.discount_amount)
      bill.final_amount = Number(bill.final_amount)

      // Get bill items summary
      const items = await this.db
        .withSchema(tenantSchema)
        .select('kategori')
        .count('id as count')
        .sum('total as total')
        .from('bill_items')
        .where({ bill_id: bill.id })
        .groupBy('kategori')

      bill.items_summary = items.map((it: Record<string, unknown>) => ({
        kategori: it.kategori,
        count: Number(it.count),
        total: Number(it.total),
      }))
    }

    return {
      patient,
      data: bills,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getOutstandingBills(
    page: number,
    limit: number,
    tenantSchema: string,
  ) {
    const offset = (page - 1) * limit

    const countQuery = await this.db
      .withSchema(tenantSchema)
      .from('bills')
      .whereIn('status', ['draft', 'final'])
      .count('id as count')
      .first()

    const total = Number(countQuery?.count) || 0

    const bills = await this.db
      .withSchema(tenantSchema)
      .select(
        'b.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'v.visit_number',
        'v.tanggal',
        'v.tipe as visit_tipe',
        'r.nama as room_nama',
        'u.name as doctor_nama',
      )
      .from('bills as b')
      .join('patients as p', 'p.id', 'b.patient_id')
      .join('visits as v', 'v.id', 'b.visit_id')
      .join('rooms as r', 'r.id', 'v.room_id')
      .join('doctors as d', 'd.id', 'v.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .whereIn('b.status', ['draft', 'final'])
      .orderBy('b.created_at', 'asc')
      .offset(offset)
      .limit(limit)

    return {
      data: bills.map((b: Record<string, unknown>) => ({
        ...b,
        total_amount: Number(b.total_amount),
        discount_amount: Number(b.discount_amount),
        final_amount: Number(b.final_amount),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  // ===================================================
  // AUTO-RECORD DOCTOR FEE FROM PAID BILL
  // ===================================================

  private async recordDoctorFeeFromBill(
    billId: string,
    tenantSchema: string,
    trx: Knex.Transaction,
  ) {
    // Get bill + visit info
    const bill = await trx
      .withSchema(tenantSchema)
      .select('b.id', 'b.visit_id', 'b.total_amount')
      .from('bills as b')
      .where('b.id', billId)
      .first()

    if (!bill?.visit_id) return

    // Get visit with doctor info + substitution info
    const visit = await trx
      .withSchema(tenantSchema)
      .select(
        'v.id',
        'v.doctor_id',
        'v.original_doctor_id',
        'v.substitution_id',
        'u.name as doctor_nama',
        'd.spesialisasi',
      )
      .from('visits as v')
      .join('doctors as d', 'd.id', 'v.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .where('v.id', bill.visit_id)
      .first()

    if (!visit) return

    // Check if fee transaction already exists for this visit
    const existingFee = await trx
      .withSchema(tenantSchema)
      .select('id')
      .from('doctor_fee_transactions')
      .where({ visit_id: bill.visit_id })
      .first()

    if (existingFee) {
      logger.info('Doctor fee already recorded for this visit', {
        visitId: bill.visit_id,
      })
      return
    }

    // Get bill items to calculate fee per category
    const items = await trx
      .withSchema(tenantSchema)
      .select('kategori', 'deskripsi', 'total')
      .from('bill_items')
      .where({ bill_id: billId })

    // Doctor gets fee from konsultasi + tindakan items
    const feeableItems = items.filter(
      (it) => it.kategori === 'konsultasi' || it.kategori === 'tindakan',
    )
    const totalFeeable = feeableItems.reduce(
      (sum, it) => sum + Number(it.total),
      0,
    )

    if (totalFeeable <= 0) return

    // Determine fee split from doctor_fees or default 80/20
    let persenDokter = 80
    let persenRS = 20

    const doctorFee = await trx
      .withSchema(tenantSchema)
      .select('persentase_dokter', 'persentase_rs')
      .from('doctor_fees')
      .where({ doctor_id: visit.doctor_id, is_active: true })
      .first()

    if (doctorFee) {
      persenDokter = Number(doctorFee.persentase_dokter) || 80
      persenRS = Number(doctorFee.persentase_rs) || 20
    }

    const jumlahDokter = (totalFeeable * persenDokter) / 100
    const jumlahRS = (totalFeeable * persenRS) / 100

    // Build description
    let deskripsi = feeableItems.map((it) => it.deskripsi).join(', ')

    // If substituted, note it
    if (visit.original_doctor_id && visit.substitution_id) {
      const originalDoc = await trx
        .withSchema(tenantSchema)
        .select('u.name')
        .from('doctors as d')
        .join('users as u', 'u.id', 'd.user_id')
        .where('d.id', visit.original_doctor_id)
        .first()

      if (originalDoc) {
        deskripsi += ` (pengganti dr. ${originalDoc.name})`
      }
    }

    // Insert fee transaction — fee goes to visit.doctor_id (the actual treating doctor)
    await trx
      .withSchema(tenantSchema)
      .insert({
        doctor_id: visit.doctor_id,
        visit_id: bill.visit_id,
        deskripsi,
        tarif: totalFeeable,
        jumlah_dokter: jumlahDokter,
        jumlah_rs: jumlahRS,
      })
      .into('doctor_fee_transactions')

    logger.info('Doctor fee recorded from bill payment', {
      billId,
      visitId: bill.visit_id,
      doctorId: visit.doctor_id,
      totalFeeable,
      jumlahDokter,
      jumlahRS,
      isSubstituted: !!visit.substitution_id,
    })
  }
}
