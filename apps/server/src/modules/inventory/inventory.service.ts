import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

export interface CreateTransferInput {
  drug_id: string
  from_location: string
  to_location: string
  jumlah: number
  catatan?: string
}

export interface ListTransferInput {
  page: number
  limit: number
  status?: string
  from_location?: string
  to_location?: string
  search?: string
}

export class InventoryService {
  constructor(private db: Knex) {}

  private async generateTransferNumber(tenantSchema: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = `MUT-${today}-`
    const [result] = await this.db
      .withSchema(tenantSchema)
      .from('item_transfers')
      .where('nomor_mutasi', 'like', `${prefix}%`)
      .count('id as count')
    const seq = Number(result.count) + 1
    return `${prefix}${String(seq).padStart(4, '0')}`
  }

  async createTransfer(
    data: CreateTransferInput,
    userId: string,
    tenantSchema: string,
  ) {
    if (data.from_location === data.to_location) {
      throw new ValidationError('Lokasi asal dan tujuan tidak boleh sama')
    }

    const drug = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'satuan')
      .from('drugs')
      .where({ id: data.drug_id })
      .first()

    if (!drug) throw new NotFoundError('Obat/barang')

    const nomorMutasi = await this.generateTransferNumber(tenantSchema)

    const [transfer] = await this.db
      .withSchema(tenantSchema)
      .insert({
        nomor_mutasi: nomorMutasi,
        drug_id: data.drug_id,
        drug_nama: drug.nama,
        from_location: data.from_location,
        to_location: data.to_location,
        jumlah: data.jumlah,
        satuan: drug.satuan,
        status: 'pending',
        catatan: data.catatan || null,
        requested_by: userId,
        created_by: userId,
        updated_by: userId,
      })
      .into('item_transfers')
      .returning('*')

    logger.info('Item transfer created', {
      transferId: transfer.id,
      nomorMutasi,
      drug: drug.nama,
      from: data.from_location,
      to: data.to_location,
    })

    return transfer
  }

  async approveTransfer(transferId: string, userId: string, tenantSchema: string) {
    const transfer = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('item_transfers')
      .where({ id: transferId })
      .first()

    if (!transfer) throw new NotFoundError('Mutasi barang')
    if (transfer.status !== 'pending') {
      throw new ValidationError(`Mutasi dengan status '${transfer.status}' tidak bisa disetujui`)
    }

    await this.db
      .withSchema(tenantSchema)
      .from('item_transfers')
      .where({ id: transferId })
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_by: userId,
      })

    logger.info('Item transfer approved', { transferId, userId })
    return this.db.withSchema(tenantSchema).select('*').from('item_transfers').where({ id: transferId }).first()
  }

  async completeTransfer(transferId: string, userId: string, tenantSchema: string) {
    const transfer = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('item_transfers')
      .where({ id: transferId })
      .first()

    if (!transfer) throw new NotFoundError('Mutasi barang')
    if (transfer.status !== 'approved') {
      throw new ValidationError(`Mutasi dengan status '${transfer.status}' tidak bisa diselesaikan`)
    }

    await this.db
      .withSchema(tenantSchema)
      .from('item_transfers')
      .where({ id: transferId })
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_by: userId,
      })

    logger.info('Item transfer completed', { transferId, userId })
    return this.db.withSchema(tenantSchema).select('*').from('item_transfers').where({ id: transferId }).first()
  }

  async rejectTransfer(transferId: string, alasan: string, userId: string, tenantSchema: string) {
    const transfer = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status')
      .from('item_transfers')
      .where({ id: transferId })
      .first()

    if (!transfer) throw new NotFoundError('Mutasi barang')
    if (!['pending', 'approved'].includes(transfer.status)) {
      throw new ValidationError(`Mutasi dengan status '${transfer.status}' tidak bisa ditolak`)
    }

    await this.db
      .withSchema(tenantSchema)
      .from('item_transfers')
      .where({ id: transferId })
      .update({
        status: 'rejected',
        catatan: alasan,
        updated_by: userId,
      })

    return this.db.withSchema(tenantSchema).select('*').from('item_transfers').where({ id: transferId }).first()
  }

  async listTransfers(filters: ListTransferInput, tenantSchema: string) {
    const { page, limit, status, from_location, to_location, search } = filters
    const offset = (page - 1) * limit

    const query = this.db
      .withSchema(tenantSchema)
      .from('item_transfers as it')

    if (status) query.where('it.status', status)
    if (from_location) query.where('it.from_location', from_location)
    if (to_location) query.where('it.to_location', to_location)
    if (search) {
      query.andWhere(function () {
        this.whereILike('it.drug_nama', `%${search}%`)
          .orWhereILike('it.nomor_mutasi', `%${search}%`)
      })
    }

    const [{ count }] = await query.clone().count('it.id as count')
    const total = Number(count)

    const transfers = await query
      .clone()
      .select('it.*')
      .orderBy('it.created_at', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: transfers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getTransfer(transferId: string, tenantSchema: string) {
    const transfer = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('item_transfers')
      .where({ id: transferId })
      .first()

    if (!transfer) throw new NotFoundError('Mutasi barang')
    return transfer
  }
}
