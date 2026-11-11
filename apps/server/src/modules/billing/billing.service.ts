import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'
import type { ProcessPaymentInput } from './billing.validator'

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

      // 1. Konsultasi dokter
      const doctor = await trx
        .withSchema(tenantSchema)
        .select('d.tarif_konsultasi', 'u.name as doctor_nama')
        .from('doctors as d')
        .join('users as u', 'u.id', 'd.user_id')
        .where('d.id', visit.doctor_id)
        .first()

      if (doctor && Number(doctor.tarif_konsultasi) > 0) {
        const tarif = Number(doctor.tarif_konsultasi)
        items.push({
          kategori: 'konsultasi',
          deskripsi: `Konsultasi ${doctor.doctor_nama}`,
          qty: 1,
          harga_satuan: tarif,
          subtotal: tarif,
          discount: 0,
          total: tarif,
        })
      }

      // 2. Tindakan (procedures from medical_record)
      const procedures = await trx
        .withSchema(tenantSchema)
        .select('pr.*')
        .from('procedures as pr')
        .join('medical_records as mr', 'mr.id', 'pr.medical_record_id')
        .where('mr.visit_id', visitId)

      for (const proc of procedures) {
        const total = Number(proc.tarif) * Number(proc.qty)
        items.push({
          kategori: 'tindakan',
          deskripsi: proc.nama_tindakan,
          qty: Number(proc.qty),
          harga_satuan: Number(proc.tarif),
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

      // 4. Kamar (rawat inap: tarif × hari)
      if (visit.tipe === 'rawat_inap' && visit.bed_id) {
        const bed = await trx
          .withSchema(tenantSchema)
          .select('b.room_id', 'r.nama as room_nama', 'r.tarif_per_hari')
          .from('beds as b')
          .join('rooms as r', 'r.id', 'b.room_id')
          .where('b.id', visit.bed_id)
          .first()

        if (bed && Number(bed.tarif_per_hari) > 0) {
          const checkIn = new Date(visit.tanggal)
          const now = new Date()
          const diffMs = now.getTime() - checkIn.getTime()
          const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
          const tarif = Number(bed.tarif_per_hari)
          const total = tarif * days

          items.push({
            kategori: 'kamar',
            deskripsi: `Kamar ${bed.room_nama} (${days} hari)`,
            qty: days,
            harga_satuan: tarif,
            subtotal: total,
            discount: 0,
            total,
            referensi_id: visit.bed_id,
            referensi_tipe: 'bed',
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
}
