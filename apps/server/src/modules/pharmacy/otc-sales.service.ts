import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

export interface OtcSaleItem {
  drug_id: string
  jumlah: number
  harga_satuan: number
}

export interface CreateOtcSaleInput {
  nama_pembeli?: string
  items: OtcSaleItem[]
  metode_bayar: 'tunai' | 'qris' | 'debit' | 'kredit'
  diskon_persen?: number
  catatan?: string
}

export class OtcSalesService {
  constructor(private db: Knex) {}

  private async generateReceiptNumber(tenantSchema: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `OTC-${today}-`
    const [result] = await this.db
      .withSchema(tenantSchema)
      .from('otc_sales')
      .where('receipt_number', 'like', `${prefix}%`)
      .count('id as count')
    const seq = Number(result.count) + 1
    return `${prefix}${String(seq).padStart(4, '0')}`
  }

  async createSale(data: CreateOtcSaleInput, userId: string, tenantSchema: string) {
    if (!data.items.length) {
      throw new ValidationError('Minimal 1 item obat diperlukan')
    }

    return this.db.transaction(async (trx) => {
      const receiptNumber = await this.generateReceiptNumber(tenantSchema)

      let subtotal = 0
      const validatedItems: Array<OtcSaleItem & { drug_nama: string; total: number }> = []

      for (const item of data.items) {
        const drug = await trx
          .withSchema(tenantSchema)
          .select('id', 'nama', 'harga_jual')
          .from('drugs')
          .where({ id: item.drug_id })
          .first()

        if (!drug) throw new NotFoundError(`Obat (${item.drug_id})`)

        const [stockResult] = await trx
          .withSchema(tenantSchema)
          .from('drug_stocks')
          .where({ drug_id: item.drug_id })
          .where('stok_sisa', '>', 0)
          .sum('stok_sisa as total_stok')

        const totalStok = Number(stockResult?.total_stok) || 0

        if (totalStok < item.jumlah) {
          throw new ValidationError(
            `Stok ${drug.nama} tidak cukup (tersedia: ${totalStok}, diminta: ${item.jumlah})`,
          )
        }

        const itemTotal = item.jumlah * item.harga_satuan
        subtotal += itemTotal
        validatedItems.push({
          ...item,
          drug_nama: drug.nama,
          total: itemTotal,
        })
      }

      const diskon = data.diskon_persen
        ? Math.round(subtotal * (data.diskon_persen / 100))
        : 0
      const grandTotal = subtotal - diskon

      const [sale] = await trx
        .withSchema(tenantSchema)
        .insert({
          receipt_number: receiptNumber,
          nama_pembeli: data.nama_pembeli || 'Umum',
          subtotal,
          diskon,
          diskon_persen: data.diskon_persen || 0,
          grand_total: grandTotal,
          metode_bayar: data.metode_bayar,
          catatan: data.catatan || null,
          created_by: userId,
        })
        .into('otc_sales')
        .returning('*')

      for (const item of validatedItems) {
        await trx
          .withSchema(tenantSchema)
          .insert({
            otc_sale_id: sale.id,
            drug_id: item.drug_id,
            drug_nama: item.drug_nama,
            jumlah: item.jumlah,
            harga_satuan: item.harga_satuan,
            total: item.total,
          })
          .into('otc_sale_items')

        // deduct stock FIFO from drug_stocks
        let remaining = item.jumlah
        const batches = await trx
          .withSchema(tenantSchema)
          .select('id', 'stok_sisa')
          .from('drug_stocks')
          .where({ drug_id: item.drug_id })
          .where('stok_sisa', '>', 0)
          .orderBy('tanggal_kadaluarsa', 'asc')

        for (const batch of batches) {
          if (remaining <= 0) break
          const deduct = Math.min(remaining, batch.stok_sisa)
          await trx
            .withSchema(tenantSchema)
            .from('drug_stocks')
            .where({ id: batch.id })
            .update({ stok_sisa: batch.stok_sisa - deduct })
          remaining -= deduct
        }
      }

      const saleItems = await trx
        .withSchema(tenantSchema)
        .select('*')
        .from('otc_sale_items')
        .where({ otc_sale_id: sale.id })

      logger.info('OTC sale created', {
        saleId: sale.id,
        receiptNumber,
        grandTotal,
        itemCount: data.items.length,
      })

      return { ...sale, items: saleItems }
    })
  }

  async listSales(
    tenantSchema: string,
    page = 1,
    limit = 20,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const offset = (page - 1) * limit

    const query = this.db
      .withSchema(tenantSchema)
      .from('otc_sales')

    if (dateFrom) query.where('created_at', '>=', dateFrom)
    if (dateTo) query.where('created_at', '<=', `${dateTo}T23:59:59`)

    const [{ count }] = await query.clone().count('id as count')
    const total = Number(count)

    const sales = await query
      .clone()
      .select('*')
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: sales,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getSale(saleId: string, tenantSchema: string) {
    const sale = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('otc_sales')
      .where({ id: saleId })
      .first()

    if (!sale) throw new NotFoundError('Penjualan')

    const items = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('otc_sale_items')
      .where({ otc_sale_id: saleId })

    return { ...sale, items }
  }

  async getDailySummary(tenantSchema: string, date: string) {
    const [summary] = await this.db
      .withSchema(tenantSchema)
      .from('otc_sales')
      .whereRaw('DATE(created_at) = ?', [date])
      .select(
        this.db.raw('COUNT(*) as total_transaksi'),
        this.db.raw('COALESCE(SUM(grand_total), 0) as total_pendapatan'),
        this.db.raw('COALESCE(SUM(diskon), 0) as total_diskon'),
      )

    const byMethod = await this.db
      .withSchema(tenantSchema)
      .from('otc_sales')
      .whereRaw('DATE(created_at) = ?', [date])
      .groupBy('metode_bayar')
      .select(
        'metode_bayar',
        this.db.raw('COUNT(*) as jumlah'),
        this.db.raw('SUM(grand_total) as total'),
      )

    return { ...summary, perMetodeBayar: byMethod }
  }
}
