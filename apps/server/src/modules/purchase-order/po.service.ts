import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

// --- Supplier types ---

export interface CreateSupplierInput {
  kode: string
  nama: string
  alamat?: string
  kota?: string
  telepon?: string
  email?: string
  kontak_person?: string
  npwp?: string
  catatan?: string
}

export interface UpdateSupplierInput {
  nama?: string
  alamat?: string
  kota?: string
  telepon?: string
  email?: string
  kontak_person?: string
  npwp?: string
  catatan?: string
  is_active?: boolean
}

// --- PO types ---

export interface POItem {
  drug_id: string
  drug_nama: string
  satuan: string
  jumlah: number
  harga_satuan: number
}

export interface CreatePOInput {
  supplier_id: string
  tanggal_dibutuhkan?: string
  catatan?: string
  diskon?: number
  ppn_persen?: number
  items: POItem[]
}

export interface ReceiveItemInput {
  item_id: string
  jumlah_diterima: number
  batch_number?: string
  tanggal_kadaluarsa?: string
}

export interface ListPOFilters {
  page: number
  limit: number
  status?: string
  supplier_id?: string
  search?: string
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['approved', 'cancelled'],
  approved: ['ordered', 'cancelled'],
  ordered: ['received'],
  received: ['completed'],
}

export class PurchaseOrderService {
  constructor(private db: Knex) {}

  // ==========================
  // SUPPLIER CRUD
  // ==========================

  async listSuppliers(tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('suppliers')
      .whereNull('deleted_at')
      .orderBy('nama', 'asc')
  }

  async createSupplier(data: CreateSupplierInput, tenantSchema: string) {
    const exists = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('suppliers')
      .where({ kode: data.kode })
      .whereNull('deleted_at')
      .first()

    if (exists) {
      throw new ValidationError(`Supplier dengan kode '${data.kode}' sudah ada`)
    }

    const [supplier] = await this.db
      .withSchema(tenantSchema)
      .insert({
        kode: data.kode,
        nama: data.nama,
        alamat: data.alamat || null,
        kota: data.kota || null,
        telepon: data.telepon || null,
        email: data.email || null,
        kontak_person: data.kontak_person || null,
        npwp: data.npwp || null,
        catatan: data.catatan || null,
      })
      .into('suppliers')
      .returning('*')

    logger.info('Supplier created', { id: supplier.id, kode: data.kode })
    return supplier
  }

  async updateSupplier(id: string, data: UpdateSupplierInput, tenantSchema: string) {
    const supplier = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('suppliers')
      .where({ id })
      .whereNull('deleted_at')
      .first()

    if (!supplier) throw new NotFoundError('Supplier')

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (data.nama !== undefined) updateData.nama = data.nama
    if (data.alamat !== undefined) updateData.alamat = data.alamat
    if (data.kota !== undefined) updateData.kota = data.kota
    if (data.telepon !== undefined) updateData.telepon = data.telepon
    if (data.email !== undefined) updateData.email = data.email
    if (data.kontak_person !== undefined) updateData.kontak_person = data.kontak_person
    if (data.npwp !== undefined) updateData.npwp = data.npwp
    if (data.catatan !== undefined) updateData.catatan = data.catatan
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('suppliers')
      .where({ id })
      .update(updateData)
      .returning('*')

    return updated
  }

  async deleteSupplier(id: string, tenantSchema: string) {
    const supplier = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('suppliers')
      .where({ id })
      .whereNull('deleted_at')
      .first()

    if (!supplier) throw new NotFoundError('Supplier')

    await this.db
      .withSchema(tenantSchema)
      .from('suppliers')
      .where({ id })
      .update({ deleted_at: new Date() })
  }

  // ==========================
  // PURCHASE ORDER
  // ==========================

  async createPO(data: CreatePOInput, userId: string, tenantSchema: string) {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('PO harus memiliki minimal 1 item')
    }

    const supplier = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama')
      .from('suppliers')
      .where({ id: data.supplier_id, is_active: true })
      .whereNull('deleted_at')
      .first()

    if (!supplier) throw new NotFoundError('Supplier')

    return this.db.transaction(async (trx) => {
      const nomorPO = await this.generatePONumber(tenantSchema, trx)

      const subtotal = data.items.reduce((sum, item) => sum + (item.jumlah * item.harga_satuan), 0)
      const diskon = data.diskon || 0
      const ppnPersen = data.ppn_persen || 0
      const ppn = Math.round((subtotal - diskon) * ppnPersen / 100)
      const grandTotal = subtotal - diskon + ppn

      const [po] = await trx
        .withSchema(tenantSchema)
        .insert({
          nomor_po: nomorPO,
          supplier_id: data.supplier_id,
          status: 'draft',
          tanggal_po: new Date().toISOString().split('T')[0],
          tanggal_dibutuhkan: data.tanggal_dibutuhkan || null,
          subtotal,
          diskon,
          ppn,
          grand_total: grandTotal,
          catatan: data.catatan || null,
          created_by: userId,
        })
        .into('purchase_orders')
        .returning('*')

      const itemRows = data.items.map((item) => ({
        po_id: po.id,
        drug_id: item.drug_id,
        drug_nama: item.drug_nama,
        satuan: item.satuan,
        jumlah: item.jumlah,
        harga_satuan: item.harga_satuan,
        total: item.jumlah * item.harga_satuan,
      }))

      await trx
        .withSchema(tenantSchema)
        .insert(itemRows)
        .into('purchase_order_items')

      logger.info('PO created', { id: po.id, nomor: nomorPO, supplier: supplier.nama })

      return this.getByIdInternal(po.id, tenantSchema, trx)
    })
  }

  async listPO(filters: ListPOFilters, tenantSchema: string) {
    const { page, limit, status, supplier_id, search } = filters
    const offset = (page - 1) * limit

    const baseQuery = this.db
      .withSchema(tenantSchema)
      .from('purchase_orders as po')
      .join('suppliers as s', 's.id', 'po.supplier_id')
      .whereNull('po.deleted_at')

    if (status) baseQuery.andWhere('po.status', status)
    if (supplier_id) baseQuery.andWhere('po.supplier_id', supplier_id)
    if (search) {
      baseQuery.andWhere(function () {
        this.whereILike('po.nomor_po', `%${search}%`)
          .orWhereILike('s.nama', `%${search}%`)
      })
    }

    const countResult = await baseQuery.clone().count('po.id as count').first()
    const total = Number((countResult as Record<string, unknown>)?.count || 0)
    const totalPages = Math.ceil(total / limit)

    const orders = await baseQuery
      .clone()
      .select(
        'po.*',
        's.nama as supplier_nama',
        's.kode as supplier_kode',
      )
      .orderBy('po.created_at', 'desc')
      .offset(offset)
      .limit(limit)

    // Fetch item count per PO
    for (const po of orders) {
      const result = await this.db
        .withSchema(tenantSchema)
        .from('purchase_order_items')
        .where({ po_id: po.id })
        .count('id as count')
        .first()
      po.item_count = Number((result as Record<string, unknown>)?.count || 0)
    }

    return {
      data: orders,
      meta: { page, limit, total, totalPages },
    }
  }

  async getById(id: string, tenantSchema: string) {
    return this.getByIdInternal(id, tenantSchema)
  }

  async updateStatus(
    id: string,
    newStatus: string,
    userId: string,
    tenantSchema: string,
    extraData?: { catatan_penerimaan?: string },
  ) {
    const po = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('purchase_orders')
      .where({ id })
      .whereNull('deleted_at')
      .first()

    if (!po) throw new NotFoundError('Purchase Order')

    const allowedNext = VALID_TRANSITIONS[po.status]
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new ValidationError(
        `Status '${po.status}' tidak bisa diubah ke '${newStatus}'`,
      )
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date(),
    }

    if (newStatus === 'approved') {
      updateData.approved_by = userId
      updateData.approved_at = new Date()
    }

    if (newStatus === 'received') {
      updateData.received_by = userId
      updateData.received_at = new Date()
      if (extraData?.catatan_penerimaan) {
        updateData.catatan_penerimaan = extraData.catatan_penerimaan
      }
    }

    await this.db
      .withSchema(tenantSchema)
      .from('purchase_orders')
      .where({ id })
      .update(updateData)

    logger.info('PO status updated', { id, from: po.status, to: newStatus })

    return this.getByIdInternal(id, tenantSchema)
  }

  async receiveItems(
    poId: string,
    items: ReceiveItemInput[],
    userId: string,
    tenantSchema: string,
  ) {
    const po = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'supplier_id')
      .from('purchase_orders')
      .where({ id: poId })
      .first()

    if (!po) throw new NotFoundError('Purchase Order')

    if (po.status !== 'ordered' && po.status !== 'received') {
      throw new ValidationError(
        `PO dengan status '${po.status}' belum bisa diterima. Status harus 'ordered'`,
      )
    }

    const supplier = await this.db
      .withSchema(tenantSchema)
      .select('nama')
      .from('suppliers')
      .where({ id: po.supplier_id })
      .first()

    return this.db.transaction(async (trx) => {
      for (const receiveItem of items) {
        const poItem = await trx
          .withSchema(tenantSchema)
          .select('*')
          .from('purchase_order_items')
          .where({ id: receiveItem.item_id, po_id: poId })
          .first()

        if (!poItem) continue

        const totalDiterima = poItem.jumlah_diterima + receiveItem.jumlah_diterima
        if (totalDiterima > poItem.jumlah) {
          throw new ValidationError(
            `Jumlah diterima untuk '${poItem.drug_nama}' melebihi jumlah PO (max: ${poItem.jumlah}, sudah: ${poItem.jumlah_diterima}, input: ${receiveItem.jumlah_diterima})`,
          )
        }

        // Update PO item
        await trx
          .withSchema(tenantSchema)
          .from('purchase_order_items')
          .where({ id: receiveItem.item_id })
          .update({
            jumlah_diterima: totalDiterima,
            batch_number: receiveItem.batch_number || poItem.batch_number || null,
            tanggal_kadaluarsa: receiveItem.tanggal_kadaluarsa || poItem.tanggal_kadaluarsa || null,
          })

        // Auto-add stock to drug_stocks
        if (receiveItem.jumlah_diterima > 0) {
          const [stock] = await trx
            .withSchema(tenantSchema)
            .insert({
              drug_id: poItem.drug_id,
              batch_number: receiveItem.batch_number || null,
              tanggal_kadaluarsa: receiveItem.tanggal_kadaluarsa || null,
              stok_awal: receiveItem.jumlah_diterima,
              stok_sisa: receiveItem.jumlah_diterima,
              harga_beli_per_unit: poItem.harga_satuan,
              supplier: supplier?.nama || null,
              tanggal_masuk: new Date().toISOString().split('T')[0],
            })
            .into('drug_stocks')
            .returning('*')

          // Get total stok for transaction record
          const sumResult = await trx
            .withSchema(tenantSchema)
            .from('drug_stocks')
            .where({ drug_id: poItem.drug_id })
            .whereNot({ id: stock.id })
            .sum('stok_sisa as sum')
            .first()

          const stokSebelum = Number((sumResult as Record<string, unknown>)?.sum || 0)

          await trx
            .withSchema(tenantSchema)
            .insert({
              drug_id: poItem.drug_id,
              drug_stock_id: stock.id,
              tipe: 'masuk',
              jumlah: receiveItem.jumlah_diterima,
              stok_sebelum: stokSebelum,
              stok_sesudah: stokSebelum + receiveItem.jumlah_diterima,
              referensi_id: poId,
              referensi_tipe: 'purchase_order',
              catatan: `Penerimaan PO — batch: ${receiveItem.batch_number || '-'}`,
              created_by: userId,
            })
            .into('drug_transactions')

          logger.info('Stock received from PO', {
            poId,
            drugId: poItem.drug_id,
            qty: receiveItem.jumlah_diterima,
            batch: receiveItem.batch_number,
          })
        }
      }

      // Check if all items fully received → auto-update PO status to 'received'
      if (po.status === 'ordered') {
        const allItems = await trx
          .withSchema(tenantSchema)
          .select('jumlah', 'jumlah_diterima')
          .from('purchase_order_items')
          .where({ po_id: poId })

        const allReceived = allItems.every(
          (i) => Number((i as Record<string, unknown>).jumlah_diterima) >= Number((i as Record<string, unknown>).jumlah),
        )

        if (allReceived) {
          await trx
            .withSchema(tenantSchema)
            .from('purchase_orders')
            .where({ id: poId })
            .update({
              status: 'received',
              received_by: userId,
              received_at: new Date(),
              updated_at: new Date(),
            })
        }
      }

      return this.getByIdInternal(poId, tenantSchema, trx)
    })
  }

  // ==========================
  // INTERNAL
  // ==========================

  private async getByIdInternal(id: string, tenantSchema: string, trxOrDb?: Knex | Knex.Transaction) {
    const conn = trxOrDb || this.db

    const po = await conn
      .withSchema(tenantSchema)
      .select(
        'po.*',
        's.nama as supplier_nama',
        's.kode as supplier_kode',
        's.telepon as supplier_telepon',
        'uc.name as created_by_nama',
        'ua.name as approved_by_nama',
        'ur.name as received_by_nama',
      )
      .from('purchase_orders as po')
      .join('suppliers as s', 's.id', 'po.supplier_id')
      .leftJoin('users as uc', 'uc.id', 'po.created_by')
      .leftJoin('users as ua', 'ua.id', 'po.approved_by')
      .leftJoin('users as ur', 'ur.id', 'po.received_by')
      .where({ 'po.id': id })
      .first()

    if (!po) throw new NotFoundError('Purchase Order')

    po.items = await conn
      .withSchema(tenantSchema)
      .select('*')
      .from('purchase_order_items')
      .where({ po_id: id })
      .orderBy('created_at', 'asc')

    return po
  }

  private async generatePONumber(tenantSchema: string, trx: Knex.Transaction) {
    const today = new Date()
    const yy = String(today.getFullYear()).slice(-2)
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const prefix = `PO${yy}${mm}`

    const last = await trx
      .withSchema(tenantSchema)
      .select('nomor_po')
      .from('purchase_orders')
      .whereILike('nomor_po', `${prefix}%`)
      .orderBy('nomor_po', 'desc')
      .first()

    let seq = 1
    if (last) {
      const lastSeq = parseInt(last.nomor_po.slice(prefix.length), 10)
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }

    return `${prefix}${String(seq).padStart(4, '0')}`
  }
}
