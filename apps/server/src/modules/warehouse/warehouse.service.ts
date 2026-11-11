import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'

// ── WAREHOUSE ITEMS ──

export class WarehouseService {
  constructor(private db: Knex) {}

  async listItems(tenantSchema: string, filters?: {
    search?: string
    kategori?: string
    page?: number
    limit?: number
  }) {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 50
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .from('warehouse_items as wi')

    if (filters?.kategori) query = query.where('wi.kategori', filters.kategori)
    if (filters?.search) {
      query = query.where(function () {
        this.whereILike('wi.nama', `%${filters!.search}%`)
          .orWhereILike('wi.kode', `%${filters!.search}%`)
      })
    }

    const [{ count }] = await query.clone().count('wi.id as count')
    const total = Number(count)

    const items = await query
      .clone()
      .select(
        'wi.*',
        this.db.raw(`COALESCE(
          (SELECT SUM(ws.stok_sisa) FROM "${tenantSchema}".warehouse_stocks ws
           WHERE ws.item_id = wi.id AND ws.stok_sisa > 0), 0
        )::integer AS total_stok`),
      )
      .orderBy('wi.nama')
      .offset(offset)
      .limit(limit)

    return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async getItem(id: string, tenantSchema: string) {
    const item = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('warehouse_items')
      .where({ id })
      .first()
    if (!item) throw new NotFoundError('Barang gudang')

    const stocks = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('warehouse_stocks')
      .where({ item_id: id })
      .where('stok_sisa', '>', 0)
      .orderBy('tanggal_masuk', 'asc')

    const totalStok = stocks.reduce((s: number, st: { stok_sisa: number }) => s + st.stok_sisa, 0)
    return { ...item, total_stok: totalStok, stocks }
  }

  async createItem(
    data: {
      kode: string; nama: string; kategori?: string
      satuan?: string; harga_beli?: number; stok_minimum?: number; lokasi?: string
    },
    tenantSchema: string,
  ) {
    try {
      const [item] = await this.db
        .withSchema(tenantSchema)
        .insert({
          kode: data.kode,
          nama: data.nama,
          kategori: data.kategori ?? 'lain_lain',
          satuan: data.satuan ?? 'pcs',
          harga_beli: data.harga_beli ?? 0,
          stok_minimum: data.stok_minimum ?? 5,
          lokasi: data.lokasi ?? null,
        })
        .into('warehouse_items')
        .returning('*')
      logger.info('Warehouse item created', { id: item.id, kode: data.kode })
      return item
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr.code === '23505') throw new ConflictError(`Kode "${data.kode}" sudah ada`)
      throw err
    }
  }

  async updateItem(id: string, data: Record<string, unknown>, tenantSchema: string) {
    const [updated] = await this.db
      .withSchema(tenantSchema)
      .table('warehouse_items')
      .where({ id })
      .update(data)
      .returning('*')
    if (!updated) throw new NotFoundError('Barang gudang')
    return updated
  }

  async deleteItem(id: string, tenantSchema: string) {
    const cnt = await this.db.withSchema(tenantSchema).table('warehouse_items').where({ id }).del()
    if (cnt === 0) throw new NotFoundError('Barang gudang')
  }

  async addStock(
    data: {
      item_id: string; jumlah: number; batch_number?: string
      tanggal_kadaluarsa?: string; harga_beli_per_unit?: number; supplier?: string
    },
    userId: string,
    tenantSchema: string,
  ) {
    const item = await this.db.withSchema(tenantSchema)
      .select('id', 'nama').from('warehouse_items').where({ id: data.item_id }).first()
    if (!item) throw new NotFoundError('Barang gudang')

    return this.db.transaction(async (trx) => {
      const [stock] = await trx.withSchema(tenantSchema).insert({
        item_id: data.item_id,
        batch_number: data.batch_number ?? null,
        tanggal_kadaluarsa: data.tanggal_kadaluarsa ?? null,
        stok_awal: data.jumlah,
        stok_sisa: data.jumlah,
        harga_beli_per_unit: data.harga_beli_per_unit ?? 0,
        supplier: data.supplier ?? null,
      }).into('warehouse_stocks').returning('*')

      const [{ sum }] = await trx.withSchema(tenantSchema)
        .from('warehouse_stocks').where({ item_id: data.item_id })
        .sum('stok_sisa as sum')
      const stokBefore = (Number(sum) || 0) - data.jumlah

      await trx.withSchema(tenantSchema).insert({
        item_id: data.item_id,
        stock_id: stock.id,
        tipe: 'masuk',
        jumlah: data.jumlah,
        stok_sebelum: stokBefore,
        stok_sesudah: stokBefore + data.jumlah,
        catatan: `Stok masuk batch ${data.batch_number || '-'}`,
        created_by: userId,
      }).into('warehouse_transactions')

      return stock
    })
  }

  // ── STOCK OPNAME ──

  async createOpname(
    data: { tipe: string; catatan?: string },
    userId: string,
    tenantSchema: string,
  ) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `OPN-${today}-`
    const [{ count }] = await this.db.withSchema(tenantSchema)
      .from('stock_opnames').where('nomor_opname', 'like', `${prefix}%`).count('id as count')
    const seq = Number(count) + 1
    const nomorOpname = `${prefix}${String(seq).padStart(3, '0')}`

    return this.db.transaction(async (trx) => {
      const [opname] = await trx.withSchema(tenantSchema).insert({
        nomor_opname: nomorOpname,
        tipe: data.tipe,
        tanggal: new Date().toISOString().split('T')[0],
        status: 'draft',
        catatan: data.catatan ?? null,
        created_by: userId,
      }).into('stock_opnames').returning('*')

      // Auto-populate items based on type
      if (data.tipe === 'farmasi') {
        const drugs = await trx.withSchema(tenantSchema)
          .select(
            'drugs.id as item_id',
            'drugs.nama as item_nama',
            'drugs.satuan_kecil as satuan',
            trx.raw(`COALESCE(
              (SELECT SUM(ds.stok_sisa) FROM "${tenantSchema}".drug_stocks ds
               WHERE ds.drug_id = drugs.id AND ds.stok_sisa > 0), 0
            )::integer AS stok_sistem`),
          )
          .from('drugs')
          .where('drugs.is_active', true)
          .orderBy('drugs.nama')

        if (drugs.length > 0) {
          await trx.withSchema(tenantSchema).insert(
            drugs.map((d: Record<string, unknown>) => ({
              opname_id: opname.id,
              item_type: 'drug',
              item_id: d.item_id,
              item_nama: d.item_nama,
              satuan: d.satuan,
              stok_sistem: d.stok_sistem,
            })),
          ).into('stock_opname_items')
        }
      } else {
        const items = await trx.withSchema(tenantSchema)
          .select(
            'warehouse_items.id as item_id',
            'warehouse_items.nama as item_nama',
            'warehouse_items.satuan',
            trx.raw(`COALESCE(
              (SELECT SUM(ws.stok_sisa) FROM "${tenantSchema}".warehouse_stocks ws
               WHERE ws.item_id = warehouse_items.id AND ws.stok_sisa > 0), 0
            )::integer AS stok_sistem`),
          )
          .from('warehouse_items')
          .where('warehouse_items.is_active', true)
          .orderBy('warehouse_items.nama')

        if (items.length > 0) {
          await trx.withSchema(tenantSchema).insert(
            items.map((i: Record<string, unknown>) => ({
              opname_id: opname.id,
              item_type: 'warehouse',
              item_id: i.item_id,
              item_nama: i.item_nama,
              satuan: i.satuan,
              stok_sistem: i.stok_sistem,
            })),
          ).into('stock_opname_items')
        }
      }

      logger.info('Stock opname created', { id: opname.id, nomor: nomorOpname, tipe: data.tipe })
      return opname
    })
  }

  async listOpnames(tenantSchema: string, filters?: {
    status?: string; tipe?: string; page?: number; limit?: number
  }) {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    const offset = (page - 1) * limit

    let query = this.db.withSchema(tenantSchema).from('stock_opnames')
    if (filters?.status) query = query.where('status', filters.status)
    if (filters?.tipe) query = query.where('tipe', filters.tipe)

    const [{ count }] = await query.clone().count('id as count')
    const total = Number(count)

    const opnames = await query.clone()
      .select('*')
      .orderBy('created_at', 'desc')
      .offset(offset).limit(limit)

    return { data: opnames, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async getOpname(id: string, tenantSchema: string) {
    const opname = await this.db.withSchema(tenantSchema)
      .select('*').from('stock_opnames').where({ id }).first()
    if (!opname) throw new NotFoundError('Stock opname')

    const items = await this.db.withSchema(tenantSchema)
      .select('*').from('stock_opname_items')
      .where({ opname_id: id })
      .orderBy('item_nama')

    return { ...opname, items }
  }

  async inputOpnameCount(
    opnameId: string,
    itemId: string,
    stokFisik: number,
    catatan: string | null,
    tenantSchema: string,
  ) {
    const opname = await this.db.withSchema(tenantSchema)
      .select('status').from('stock_opnames').where({ id: opnameId }).first()
    if (!opname) throw new NotFoundError('Stock opname')
    if (opname.status === 'completed' || opname.status === 'cancelled') {
      throw new ValidationError('Opname sudah selesai/dibatalkan')
    }

    // Update status to in_progress if still draft
    if (opname.status === 'draft') {
      await this.db.withSchema(tenantSchema).table('stock_opnames')
        .where({ id: opnameId }).update({ status: 'in_progress', started_at: new Date() })
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .table('stock_opname_items')
      .where({ id: itemId, opname_id: opnameId })
      .update({ stok_fisik: stokFisik, catatan, counted_at: new Date() })
      .returning('*')

    if (!updated) throw new NotFoundError('Item opname')
    return updated
  }

  async completeOpname(opnameId: string, userId: string, tenantSchema: string) {
    const opname = await this.db.withSchema(tenantSchema)
      .select('*').from('stock_opnames').where({ id: opnameId }).first()
    if (!opname) throw new NotFoundError('Stock opname')
    if (opname.status === 'completed') throw new ValidationError('Opname sudah selesai')

    // Check all items counted
    const [{ uncounted }] = await this.db.withSchema(tenantSchema)
      .from('stock_opname_items')
      .where({ opname_id: opnameId })
      .whereNull('stok_fisik')
      .count('id as uncounted')

    if (Number(uncounted) > 0) {
      throw new ValidationError(`Masih ada ${uncounted} item yang belum dihitung`)
    }

    // Get items with differences
    const diffs = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('stock_opname_items')
      .where({ opname_id: opnameId })
      .whereRaw('stok_fisik != stok_sistem')

    // Apply adjustments
    await this.db.transaction(async (trx) => {
      for (const diff of diffs) {
        const selisih = diff.stok_fisik - diff.stok_sistem
        if (diff.item_type === 'drug') {
          // Get the latest stock batch
          const stock = await trx.withSchema(tenantSchema)
            .select('id', 'stok_sisa')
            .from('drug_stocks')
            .where({ drug_id: diff.item_id })
            .where('stok_sisa', '>', 0)
            .orderBy('tanggal_masuk', 'desc')
            .first()

          if (stock) {
            const newSisa = Math.max(0, stock.stok_sisa + selisih)
            await trx.withSchema(tenantSchema)
              .table('drug_stocks')
              .where({ id: stock.id })
              .update({ stok_sisa: newSisa })

            await trx.withSchema(tenantSchema).insert({
              drug_id: diff.item_id,
              drug_stock_id: stock.id,
              tipe: selisih > 0 ? 'penyesuaian_tambah' : 'penyesuaian_kurang',
              jumlah: Math.abs(selisih),
              stok_sebelum: stock.stok_sisa,
              stok_sesudah: newSisa,
              catatan: `Stock opname ${opname.nomor_opname}`,
              created_by: userId,
            }).into('drug_transactions')
          }
        } else {
          // Warehouse item
          const stock = await trx.withSchema(tenantSchema)
            .select('id', 'stok_sisa')
            .from('warehouse_stocks')
            .where({ item_id: diff.item_id })
            .where('stok_sisa', '>', 0)
            .orderBy('tanggal_masuk', 'desc')
            .first()

          if (stock) {
            const newSisa = Math.max(0, stock.stok_sisa + selisih)
            await trx.withSchema(tenantSchema)
              .table('warehouse_stocks')
              .where({ id: stock.id })
              .update({ stok_sisa: newSisa })

            await trx.withSchema(tenantSchema).insert({
              item_id: diff.item_id,
              stock_id: stock.id,
              tipe: selisih > 0 ? 'penyesuaian_tambah' : 'penyesuaian_kurang',
              jumlah: Math.abs(selisih),
              stok_sebelum: stock.stok_sisa,
              stok_sesudah: newSisa,
              catatan: `Stock opname ${opname.nomor_opname}`,
              created_by: userId,
            }).into('warehouse_transactions')
          }
        }
      }

      await trx.withSchema(tenantSchema).table('stock_opnames')
        .where({ id: opnameId })
        .update({ status: 'completed', completed_at: new Date(), completed_by: userId })
    })

    logger.info('Stock opname completed', {
      opnameId, adjustments: diffs.length, tenant: tenantSchema,
    })

    return this.getOpname(opnameId, tenantSchema)
  }

  async cancelOpname(opnameId: string, tenantSchema: string) {
    const [updated] = await this.db.withSchema(tenantSchema)
      .table('stock_opnames')
      .where({ id: opnameId })
      .whereNot('status', 'completed')
      .update({ status: 'cancelled' })
      .returning('*')
    if (!updated) throw new ValidationError('Opname tidak dapat dibatalkan')
    return updated
  }
}
