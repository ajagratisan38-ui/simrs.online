import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'
import type {
  CreateDrugInput,
  UpdateDrugInput,
  ListDrugsInput,
  SearchDrugInput,
  AddStockInput,
  AdjustStockInput,
  DispenseInput,
  ExpiringInput,
} from './pharmacy.validator'

export class PharmacyService {
  constructor(private db: Knex) {}

  // ===================================================
  // DRUG CRUD
  // ===================================================

  async getDrugList(filters: ListDrugsInput, tenantSchema: string) {
    const { search, kategori, is_active, page, limit } = filters
    const offset = (page - 1) * limit

    const query = this.db
      .withSchema(tenantSchema)
      .from('drugs as d')
      .whereNull('d.deleted_at')

    if (search) {
      const pattern = `%${search}%`
      query.andWhere(function () {
        this.whereILike('d.kode', pattern)
          .orWhereILike('d.nama', pattern)
          .orWhereILike('d.nama_generik', pattern)
      })
    }
    if (kategori) query.andWhere('d.kategori', kategori)
    if (is_active !== undefined) query.andWhere('d.is_active', is_active)

    const countQuery = query.clone().count('d.id as count').first()
    const [{ count }] = await countQuery.then((r) => [r || { count: 0 }])
    const total = Number(count)

    // Get drugs with aggregated stock
    const drugs = await this.db
      .withSchema(tenantSchema)
      .select(
        'd.*',
        this.db.raw(`COALESCE(
          (SELECT SUM(ds.stok_sisa) FROM "${tenantSchema}".drug_stocks ds
           WHERE ds.drug_id = d.id AND ds.stok_sisa > 0), 0
        )::integer AS total_stok`),
      )
      .from('drugs as d')
      .whereNull('d.deleted_at')
      .modify((qb) => {
        if (search) {
          const p = `%${search}%`
          qb.andWhere(function () {
            this.whereILike('d.kode', p)
              .orWhereILike('d.nama', p)
              .orWhereILike('d.nama_generik', p)
          })
        }
        if (kategori) qb.andWhere('d.kategori', kategori)
        if (is_active !== undefined) qb.andWhere('d.is_active', is_active)
      })
      .orderBy('d.nama', 'asc')
      .offset(offset)
      .limit(limit)

    return {
      data: drugs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getDrugDetail(id: string, tenantSchema: string) {
    const drug = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('drugs')
      .where({ id })
      .first()

    if (!drug) throw new NotFoundError('Obat')

    // Get stock per batch
    const stocks = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('drug_stocks')
      .where({ drug_id: id })
      .orderBy('tanggal_kadaluarsa', 'asc')

    const totalStok = stocks.reduce(
      (sum: number, s: { stok_sisa: number }) => sum + s.stok_sisa,
      0,
    )

    return { ...drug, total_stok: totalStok, stocks }
  }

  async searchDrug(filters: SearchDrugInput, tenantSchema: string) {
    const { q, limit } = filters
    const pattern = `%${q}%`

    return this.db
      .withSchema(tenantSchema)
      .select(
        'd.*',
        this.db.raw(`COALESCE(
          (SELECT SUM(ds.stok_sisa) FROM "${tenantSchema}".drug_stocks ds
           WHERE ds.drug_id = d.id AND ds.stok_sisa > 0), 0
        )::integer AS total_stok`),
      )
      .from('drugs as d')
      .where('d.is_active', true)
      .andWhere(function () {
        this.whereILike('d.kode', pattern)
          .orWhereILike('d.nama', pattern)
          .orWhereILike('d.nama_generik', pattern)
      })
      .orderByRaw('CASE WHEN d.kode ILIKE ? THEN 0 ELSE 1 END', [pattern])
      .orderBy('d.nama', 'asc')
      .limit(limit)
  }

  async createDrug(data: CreateDrugInput, tenantSchema: string) {
    // Check if active drug with same kode exists
    const activeExisting = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('drugs')
      .where({ kode: data.kode })
      .whereNull('deleted_at')
      .first()

    if (activeExisting) throw new ConflictError(`Obat dengan kode '${data.kode}' sudah ada`)

    // Check if soft-deleted drug with same kode exists — restore it
    const deletedExisting = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('drugs')
      .where({ kode: data.kode })
      .whereNotNull('deleted_at')
      .first()

    if (deletedExisting) {
      const [restored] = await this.db
        .withSchema(tenantSchema)
        .from('drugs')
        .where({ id: deletedExisting.id })
        .update({
          ...data,
          is_active: true,
          deleted_at: null,
          updated_at: new Date(),
        })
        .returning('*')
      return restored
    }

    const [drug] = await this.db
      .withSchema(tenantSchema)
      .insert(data)
      .into('drugs')
      .returning('*')

    return drug
  }

  async updateDrug(id: string, data: UpdateDrugInput, tenantSchema: string) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('drugs')
      .where({ id })
      .first()

    if (!existing) throw new NotFoundError('Obat')

    // Check unique kode if changed (only among active drugs)
    if (data.kode) {
      const dup = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('drugs')
        .where({ kode: data.kode })
        .whereNot({ id })
        .whereNull('deleted_at')
        .first()

      if (dup) throw new ConflictError(`Obat dengan kode '${data.kode}' sudah ada`)
    }

    const [drug] = await this.db
      .withSchema(tenantSchema)
      .from('drugs')
      .where({ id })
      .update(data)
      .returning('*')

    return drug
  }

  async deleteDrug(id: string, tenantSchema: string) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('drugs')
      .where({ id })
      .whereNull('deleted_at')
      .first()

    if (!existing) throw new NotFoundError('Obat')

    await this.db
      .withSchema(tenantSchema)
      .from('drugs')
      .where({ id })
      .update({ deleted_at: new Date(), is_active: false })

    return { message: 'Obat berhasil dihapus' }
  }

  // ===================================================
  // STOCK MANAGEMENT
  // ===================================================

  async addStock(
    drugId: string,
    data: AddStockInput,
    userId: string,
    tenantSchema: string,
  ) {
    const drug = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama')
      .from('drugs')
      .where({ id: drugId })
      .first()

    if (!drug) throw new NotFoundError('Obat')

    return this.db.transaction(async (trx) => {
      // Create drug_stock record
      const [stock] = await trx
        .withSchema(tenantSchema)
        .insert({
          drug_id: drugId,
          batch_number: data.batch_number || null,
          tanggal_kadaluarsa: data.tanggal_kadaluarsa || null,
          stok_awal: data.jumlah,
          stok_sisa: data.jumlah,
          harga_beli_per_unit: data.harga_beli_per_unit || 0,
          supplier: data.supplier || null,
          tanggal_masuk: data.tanggal_masuk || new Date().toISOString().split('T')[0],
        })
        .into('drug_stocks')
        .returning('*')

      // Get total stok sebelum
      const [{ sum }] = await trx
        .withSchema(tenantSchema)
        .from('drug_stocks')
        .where({ drug_id: drugId })
        .whereNot({ id: stock.id })
        .sum('stok_sisa as sum')

      const stokSebelum = Number(sum) || 0

      // Create transaction record
      await trx
        .withSchema(tenantSchema)
        .insert({
          drug_id: drugId,
          drug_stock_id: stock.id,
          tipe: 'masuk',
          jumlah: data.jumlah,
          stok_sebelum: stokSebelum,
          stok_sesudah: stokSebelum + data.jumlah,
          catatan: `Stok masuk: ${data.batch_number || '-'} dari ${data.supplier || '-'}`,
          created_by: userId,
        })
        .into('drug_transactions')

      logger.info('Stock added', {
        drugId,
        batch: data.batch_number,
        qty: data.jumlah,
      })

      return stock
    })
  }

  async adjustStock(
    drugId: string,
    data: AdjustStockInput,
    userId: string,
    tenantSchema: string,
  ) {
    const drug = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('drugs')
      .where({ id: drugId })
      .first()

    if (!drug) throw new NotFoundError('Obat')

    const stock = await this.db
      .withSchema(tenantSchema)
      .select('id', 'stok_sisa')
      .from('drug_stocks')
      .where({ id: data.batch_id, drug_id: drugId })
      .first()

    if (!stock) throw new NotFoundError('Batch stok')

    const newSisa = stock.stok_sisa + data.jumlah
    if (newSisa < 0) {
      throw new ValidationError(
        `Stok tidak cukup untuk penyesuaian (sisa: ${stock.stok_sisa}, penyesuaian: ${data.jumlah})`,
      )
    }

    return this.db.transaction(async (trx) => {
      await trx
        .withSchema(tenantSchema)
        .from('drug_stocks')
        .where({ id: data.batch_id })
        .update({ stok_sisa: newSisa })

      // Total stok for transaction record
      const [{ sum }] = await trx
        .withSchema(tenantSchema)
        .from('drug_stocks')
        .where({ drug_id: drugId })
        .sum('stok_sisa as sum')

      const totalAfter = Number(sum) || 0

      await trx
        .withSchema(tenantSchema)
        .insert({
          drug_id: drugId,
          drug_stock_id: data.batch_id,
          tipe: 'penyesuaian',
          jumlah: data.jumlah,
          stok_sebelum: totalAfter - data.jumlah,
          stok_sesudah: totalAfter,
          catatan: `Penyesuaian: ${data.alasan}`,
          created_by: userId,
        })
        .into('drug_transactions')

      logger.info('Stock adjusted', {
        drugId,
        batchId: data.batch_id,
        adjustment: data.jumlah,
      })

      return { batch_id: data.batch_id, stok_sisa: newSisa }
    })
  }

  async getStockHistory(drugId: string, tenantSchema: string) {
    const drug = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'kode')
      .from('drugs')
      .where({ id: drugId })
      .first()

    if (!drug) throw new NotFoundError('Obat')

    const transactions = await this.db
      .withSchema(tenantSchema)
      .select('dt.*', 'ds.batch_number')
      .from('drug_transactions as dt')
      .leftJoin('drug_stocks as ds', 'ds.id', 'dt.drug_stock_id')
      .where('dt.drug_id', drugId)
      .orderBy('dt.created_at', 'desc')
      .limit(200)

    return { drug, transactions }
  }

  // ===================================================
  // DISPENSING (FIFO)
  // ===================================================

  async dispense(
    prescriptionId: string,
    data: DispenseInput,
    userId: string,
    tenantSchema: string,
  ) {
    // Validate prescription exists and is in correct status
    const prescription = await this.db
      .withSchema(tenantSchema)
      .select('id', 'visit_id', 'status')
      .from('prescriptions')
      .where({ id: prescriptionId })
      .first()

    if (!prescription) throw new NotFoundError('Resep')

    if (!['dikirim', 'diproses'].includes(prescription.status)) {
      throw new ValidationError(
        `Resep dengan status '${prescription.status}' tidak bisa diproses`,
      )
    }

    return this.db.transaction(async (trx) => {
      // Create dispensing record
      const [dispensing] = await trx
        .withSchema(tenantSchema)
        .insert({
          prescription_id: prescriptionId,
          visit_id: prescription.visit_id,
          status: 'diproses',
          catatan_apoteker: data.catatan_apoteker || null,
          dispensed_by: userId,
          dispensed_at: new Date().toISOString(),
        })
        .into('dispensing')
        .returning('*')

      let allComplete = true

      for (const item of data.items) {
        const remaining = item.jumlah_diberikan

        if (remaining <= 0) {
          // Skip — tidak diberikan
          await trx
            .withSchema(tenantSchema)
            .insert({
              dispensing_id: dispensing.id,
              prescription_item_id: item.prescription_item_id || null,
              drug_id: item.drug_id,
              drug_stock_id: null,
              jumlah_diminta: item.jumlah_diminta,
              jumlah_diberikan: 0,
              catatan: item.catatan || 'Tidak tersedia',
            })
            .into('dispensing_items')
          allComplete = false
          continue
        }

        // FIFO: get batches sorted by expiry date (earliest first)
        const batches = await trx
          .withSchema(tenantSchema)
          .select('id', 'stok_sisa', 'batch_number')
          .from('drug_stocks')
          .where({ drug_id: item.drug_id })
          .where('stok_sisa', '>', 0)
          .andWhere(function () {
            this.whereNull('tanggal_kadaluarsa')
              .orWhere('tanggal_kadaluarsa', '>', trx.fn.now())
          })
          .orderByRaw('tanggal_kadaluarsa ASC NULLS LAST')

        let toDispense = remaining
        let totalDispensed = 0

        for (const batch of batches) {
          if (toDispense <= 0) break

          const take = Math.min(toDispense, batch.stok_sisa)
          const stokBefore = batch.stok_sisa
          const stokAfter = stokBefore - take

          // Reduce stock
          await trx
            .withSchema(tenantSchema)
            .from('drug_stocks')
            .where({ id: batch.id })
            .update({ stok_sisa: stokAfter })

          // Create transaction
          // Get total before this deduction
          const [{ sum: totalBefore }] = await trx
            .withSchema(tenantSchema)
            .from('drug_stocks')
            .where({ drug_id: item.drug_id })
            .sum('stok_sisa as sum')

          await trx
            .withSchema(tenantSchema)
            .insert({
              drug_id: item.drug_id,
              drug_stock_id: batch.id,
              tipe: 'keluar',
              jumlah: take,
              stok_sebelum: Number(totalBefore) + take,
              stok_sesudah: Number(totalBefore),
              referensi_id: prescription.visit_id,
              referensi_tipe: 'dispensing',
              catatan: `Dispensing resep, batch ${batch.batch_number || '-'}`,
              created_by: userId,
            })
            .into('drug_transactions')

          // Create dispensing item
          await trx
            .withSchema(tenantSchema)
            .insert({
              dispensing_id: dispensing.id,
              prescription_item_id: item.prescription_item_id || null,
              drug_id: item.drug_id,
              drug_stock_id: batch.id,
              jumlah_diminta: item.jumlah_diminta,
              jumlah_diberikan: take,
              catatan: item.catatan || null,
            })
            .into('dispensing_items')

          totalDispensed += take
          toDispense -= take
        }

        if (totalDispensed < remaining) {
          allComplete = false
          logger.warn('Insufficient stock for dispensing', {
            drugId: item.drug_id,
            requested: remaining,
            dispensed: totalDispensed,
          })
        }
      }

      // Update dispensing status
      const finalStatus = allComplete ? 'selesai' : 'sebagian'
      await trx
        .withSchema(tenantSchema)
        .from('dispensing')
        .where({ id: dispensing.id })
        .update({ status: finalStatus })

      // Update prescription status
      await trx
        .withSchema(tenantSchema)
        .from('prescriptions')
        .where({ id: prescriptionId })
        .update({ status: allComplete ? 'selesai' : 'diproses' })

      logger.info('Dispensing completed', {
        dispensingId: dispensing.id,
        status: finalStatus,
        prescriptionId,
      })

      return this.getDispensingDetail(dispensing.id, tenantSchema, trx)
    })
  }

  async getDispensingDetail(
    id: string,
    tenantSchema: string,
    trxOrDb?: Knex | Knex.Transaction,
  ) {
    const conn = trxOrDb || this.db

    const dispensing = await conn
      .withSchema(tenantSchema)
      .select(
        'dp.*',
        'u.name as dispensed_by_name',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'v.visit_number',
      )
      .from('dispensing as dp')
      .leftJoin('users as u', 'u.id', 'dp.dispensed_by')
      .join('visits as v', 'v.id', 'dp.visit_id')
      .join('patients as p', 'p.id', 'v.patient_id')
      .where('dp.id', id)
      .first()

    if (!dispensing) throw new NotFoundError('Dispensing')

    const items = await conn
      .withSchema(tenantSchema)
      .select('di.*', 'd.nama as drug_nama', 'd.kode as drug_kode', 'd.satuan_kecil')
      .from('dispensing_items as di')
      .join('drugs as d', 'd.id', 'di.drug_id')
      .where('di.dispensing_id', id)

    return { ...dispensing, items }
  }

  async getPendingDispensing(tenantSchema: string) {
    // Get prescriptions with status 'dikirim' (sent from doctor)
    const prescriptions = await this.db
      .withSchema(tenantSchema)
      .select(
        'rx.id',
        'rx.visit_id',
        'rx.status',
        'rx.catatan_dokter',
        'rx.created_at',
        'v.visit_number',
        'v.tanggal',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'r.nama as room_nama',
        'u.name as doctor_nama',
      )
      .from('prescriptions as rx')
      .join('visits as v', 'v.id', 'rx.visit_id')
      .join('patients as p', 'p.id', 'v.patient_id')
      .join('rooms as r', 'r.id', 'v.room_id')
      .join('doctors as d', 'd.id', 'v.doctor_id')
      .join('users as u', 'u.id', 'd.user_id')
      .whereIn('rx.status', ['dikirim', 'diproses'])
      .orderBy('rx.created_at', 'asc')

    // For each prescription, get items
    for (const rx of prescriptions) {
      rx.items = await this.db
        .withSchema(tenantSchema)
        .select('*')
        .from('prescription_items')
        .where({ prescription_id: rx.id })
    }

    return prescriptions
  }

  // ===================================================
  // ALERTS
  // ===================================================

  async getExpiringDrugs(filters: ExpiringInput, tenantSchema: string) {
    const { days } = filters

    return this.db
      .withSchema(tenantSchema)
      .select(
        'ds.id as stock_id',
        'ds.batch_number',
        'ds.tanggal_kadaluarsa',
        'ds.stok_sisa',
        'd.id as drug_id',
        'd.kode',
        'd.nama',
        'd.satuan_kecil',
      )
      .from('drug_stocks as ds')
      .join('drugs as d', 'd.id', 'ds.drug_id')
      .where('ds.stok_sisa', '>', 0)
      .whereNotNull('ds.tanggal_kadaluarsa')
      .whereRaw(`ds.tanggal_kadaluarsa <= CURRENT_DATE + INTERVAL '${days} days'`)
      .orderBy('ds.tanggal_kadaluarsa', 'asc')
  }

  async getLowStockDrugs(tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select(
        'd.*',
        this.db.raw(`COALESCE(
          (SELECT SUM(ds.stok_sisa) FROM "${tenantSchema}".drug_stocks ds
           WHERE ds.drug_id = d.id AND ds.stok_sisa > 0), 0
        )::integer AS total_stok`),
      )
      .from('drugs as d')
      .where('d.is_active', true)
      .whereRaw(`COALESCE(
        (SELECT SUM(ds.stok_sisa) FROM "${tenantSchema}".drug_stocks ds
         WHERE ds.drug_id = d.id AND ds.stok_sisa > 0), 0
      ) < d.stok_minimum`)
      .orderBy('d.nama', 'asc')
  }
}
