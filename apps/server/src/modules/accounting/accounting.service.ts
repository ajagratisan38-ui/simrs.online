import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateAccountInput {
  kode: string
  nama: string
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'
  sub_tipe?: string
  parent_id?: string
  level: number
  is_header?: boolean
  saldo_normal: 'debit' | 'kredit'
}

interface UpdateAccountInput {
  nama?: string
  sub_tipe?: string
  parent_id?: string | null
  level?: number
  is_header?: boolean
  is_active?: boolean
}

interface JournalLine {
  account_id: string
  deskripsi?: string
  debit: number
  kredit: number
}

interface CreateJournalInput {
  tanggal: string
  deskripsi: string
  referensi_tipe?: string
  referensi_id?: string
  catatan?: string
  lines: JournalLine[]
}

interface JournalFilters {
  tanggalMulai?: string
  tanggalSelesai?: string
  status?: string
  search?: string
  page: number
  limit: number
}

interface LedgerFilters {
  tanggalMulai?: string
  tanggalSelesai?: string
  page: number
  limit: number
}

interface Account {
  id: string
  kode: string
  nama: string
  tipe: string
  sub_tipe: string | null
  parent_id: string | null
  level: number
  is_header: boolean
  saldo_normal: string
  is_active: boolean
  children?: Account[]
}

// Mapping payment methods → COA kode
const PAYMENT_METHOD_ACCOUNT: Record<string, string> = {
  tunai: '1-1001',
  debit: '1-1002',
  kredit: '1-1002',
  transfer: '1-1002',
  qris: '1-1002',
  bpjs: '1-1004',
  asuransi: '1-1005',
}

// Mapping bill_items kategori → COA kode
const KATEGORI_REVENUE_ACCOUNT: Record<string, string> = {
  konsultasi: '4-1009',
  tindakan: '4-1008',
  obat: '4-1006',
  lab: '4-1004',
  radiologi: '4-1005',
  kamar: '4-1002',
  bedah: '4-1007',
  bahan: '4-1006',
  rehabilitasi: '4-1010',
  lain: '4-2003',
}

// Mapping visit type → default revenue account kode
const VISIT_TYPE_REVENUE: Record<string, string> = {
  rawat_jalan: '4-1001',
  rawat_inap: '4-1002',
  igd: '4-1003',
}

export class AccountingService {
  constructor(private db: Knex) {}

  // ═══════════════════════════════════════════════════════════
  // COA (Chart of Accounts)
  // ═══════════════════════════════════════════════════════════

  async getAccounts(tenantSchema: string): Promise<Account[]> {
    const rows = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('chart_of_accounts')
      .orderBy('kode', 'asc')

    return this.buildTree(rows)
  }

  private buildTree(rows: Account[]): Account[] {
    const map = new Map<string, Account>()
    const roots: Account[] = []

    for (const row of rows) {
      map.set(row.id, { ...row, children: [] })
    }
    for (const row of rows) {
      const node = map.get(row.id)!
      if (row.parent_id && map.has(row.parent_id)) {
        map.get(row.parent_id)!.children!.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }

  async getAccountByKode(kode: string, tenantSchema: string) {
    const account = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('chart_of_accounts')
      .where({ kode })
      .first()

    if (!account) throw new NotFoundError('Akun')
    return account
  }

  async getAccountById(id: string, tenantSchema: string) {
    const account = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('chart_of_accounts')
      .where({ id })
      .first()

    if (!account) throw new NotFoundError('Akun')
    return account
  }

  async createAccount(data: CreateAccountInput, tenantSchema: string) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('chart_of_accounts')
      .where({ kode: data.kode })
      .first()

    if (existing) throw new ConflictError(`Akun dengan kode '${data.kode}' sudah ada`)

    if (data.parent_id) {
      const parent = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('chart_of_accounts')
        .where({ id: data.parent_id })
        .first()
      if (!parent) throw new NotFoundError('Akun parent')
    }

    const [account] = await this.db
      .withSchema(tenantSchema)
      .insert({
        kode: data.kode,
        nama: data.nama,
        tipe: data.tipe,
        sub_tipe: data.sub_tipe || null,
        parent_id: data.parent_id || null,
        level: data.level,
        is_header: data.is_header ?? false,
        saldo_normal: data.saldo_normal,
        is_active: true,
      })
      .into('chart_of_accounts')
      .returning('*')

    logger.info('COA account created', { kode: data.kode, nama: data.nama })
    return account
  }

  async updateAccount(id: string, data: UpdateAccountInput, tenantSchema: string) {
    const account = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('chart_of_accounts')
      .where({ id })
      .first()

    if (!account) throw new NotFoundError('Akun')

    const updateData: Record<string, unknown> = {}
    if (data.nama !== undefined) updateData.nama = data.nama
    if (data.sub_tipe !== undefined) updateData.sub_tipe = data.sub_tipe
    if (data.parent_id !== undefined) updateData.parent_id = data.parent_id
    if (data.level !== undefined) updateData.level = data.level
    if (data.is_header !== undefined) updateData.is_header = data.is_header
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('chart_of_accounts')
      .where({ id })
      .update(updateData)
      .returning('*')

    return updated
  }

  async deleteAccount(id: string, tenantSchema: string) {
    const account = await this.db
      .withSchema(tenantSchema)
      .select('id', 'kode')
      .from('chart_of_accounts')
      .where({ id })
      .first()

    if (!account) throw new NotFoundError('Akun')

    // Check if account has transactions
    const hasLines = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('journal_entry_lines')
      .where({ account_id: id })
      .first()

    if (hasLines) {
      throw new ConflictError('Akun tidak bisa dihapus karena sudah memiliki transaksi jurnal')
    }

    // Check if account has children
    const hasChildren = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('chart_of_accounts')
      .where({ parent_id: id })
      .first()

    if (hasChildren) {
      throw new ConflictError('Akun tidak bisa dihapus karena memiliki sub-akun')
    }

    await this.db
      .withSchema(tenantSchema)
      .from('chart_of_accounts')
      .where({ id })
      .del()

    logger.info('COA account deleted', { kode: account.kode })
  }

  // ═══════════════════════════════════════════════════════════
  // JOURNAL ENTRIES
  // ═══════════════════════════════════════════════════════════

  private async generateNomorJurnal(tanggal: string, tenantSchema: string): Promise<string> {
    const dateStr = tanggal.replace(/-/g, '')
    const prefix = `JU-${dateStr}`

    const [row] = await this.db
      .withSchema(tenantSchema)
      .from('journal_entries')
      .where('nomor_jurnal', 'like', `${prefix}-%`)
      .count('id as count')

    const seq = (Number(row?.count) || 0) + 1
    return `${prefix}-${String(seq).padStart(5, '0')}`
  }

  async createJournal(data: CreateJournalInput, userId: string, tenantSchema: string) {
    if (!data.lines || data.lines.length < 2) {
      throw new ValidationError('Jurnal harus memiliki minimal 2 baris (debit dan kredit)')
    }

    const totalDebit = data.lines.reduce((sum, l) => sum + Number(l.debit), 0)
    const totalKredit = data.lines.reduce((sum, l) => sum + Number(l.kredit), 0)

    if (Math.abs(totalDebit - totalKredit) > 0.01) {
      throw new ValidationError(
        `Jurnal tidak seimbang: Debit ${totalDebit.toFixed(2)} ≠ Kredit ${totalKredit.toFixed(2)}`,
      )
    }

    // Check fiscal period is not closed
    await this.checkFiscalPeriodOpen(data.tanggal, tenantSchema)

    // Validate all account_ids exist and are not headers
    for (const line of data.lines) {
      const acct = await this.db
        .withSchema(tenantSchema)
        .select('id', 'is_header', 'kode')
        .from('chart_of_accounts')
        .where({ id: line.account_id })
        .first()
      if (!acct) throw new NotFoundError(`Akun (id: ${line.account_id})`)
      if (acct.is_header) {
        throw new ValidationError(`Akun '${acct.kode}' adalah header dan tidak bisa dipakai untuk transaksi`)
      }
    }

    return this.db.transaction(async (trx) => {
      const nomorJurnal = await this.generateNomorJurnal(data.tanggal, tenantSchema)

      const [journal] = await trx
        .withSchema(tenantSchema)
        .insert({
          nomor_jurnal: nomorJurnal,
          tanggal: data.tanggal,
          deskripsi: data.deskripsi,
          referensi_tipe: data.referensi_tipe || null,
          referensi_id: data.referensi_id || null,
          total_debit: totalDebit,
          total_kredit: totalKredit,
          status: 'draft',
          catatan: data.catatan || null,
          created_by: userId,
        })
        .into('journal_entries')
        .returning('*')

      const lineInserts = data.lines.map((l) => ({
        journal_entry_id: journal.id,
        account_id: l.account_id,
        deskripsi: l.deskripsi || null,
        debit: l.debit,
        kredit: l.kredit,
      }))

      await trx
        .withSchema(tenantSchema)
        .insert(lineInserts)
        .into('journal_entry_lines')

      logger.info('Journal entry created', {
        nomorJurnal,
        totalDebit,
        totalKredit,
      })

      return this.getJournal(journal.id, tenantSchema, trx)
    })
  }

  async postJournal(id: string, userId: string, tenantSchema: string) {
    const journal = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('journal_entries')
      .where({ id })
      .first()

    if (!journal) throw new NotFoundError('Jurnal')
    if (journal.status !== 'draft') {
      throw new ValidationError(`Jurnal dengan status '${journal.status}' tidak bisa di-posting`)
    }

    if (Math.abs(Number(journal.total_debit) - Number(journal.total_kredit)) > 0.01) {
      throw new ValidationError('Jurnal tidak seimbang — tidak bisa di-posting')
    }

    await this.checkFiscalPeriodOpen(journal.tanggal, tenantSchema)

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('journal_entries')
      .where({ id })
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: userId,
      })
      .returning('*')

    logger.info('Journal posted', { nomorJurnal: updated.nomor_jurnal })
    return this.getJournal(id, tenantSchema)
  }

  async reverseJournal(id: string, userId: string, reason: string, tenantSchema: string) {
    const journal = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('journal_entries')
      .where({ id })
      .first()

    if (!journal) throw new NotFoundError('Jurnal')
    if (journal.status !== 'posted') {
      throw new ValidationError('Hanya jurnal yang sudah di-posting yang bisa di-reverse')
    }

    const lines = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('journal_entry_lines')
      .where({ journal_entry_id: id })

    return this.db.transaction(async (trx) => {
      const today = new Date().toISOString().split('T')[0]
      const nomorReverse = await this.generateNomorJurnal(today, tenantSchema)

      // Create reversing entry with flipped debit/kredit
      const [reversingJournal] = await trx
        .withSchema(tenantSchema)
        .insert({
          nomor_jurnal: nomorReverse,
          tanggal: today,
          deskripsi: `Reverse: ${journal.deskripsi} — ${reason}`,
          referensi_tipe: 'reversal',
          referensi_id: journal.id,
          total_debit: journal.total_kredit,
          total_kredit: journal.total_debit,
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_by: userId,
          catatan: reason,
          created_by: userId,
        })
        .into('journal_entries')
        .returning('*')

      // Insert reversed lines
      const reversedLines = lines.map((l: Record<string, unknown>) => ({
        journal_entry_id: reversingJournal.id,
        account_id: l.account_id,
        deskripsi: `Reverse: ${l.deskripsi || ''}`,
        debit: l.kredit,
        kredit: l.debit,
      }))

      await trx
        .withSchema(tenantSchema)
        .insert(reversedLines)
        .into('journal_entry_lines')

      // Mark original as reversed
      await trx
        .withSchema(tenantSchema)
        .from('journal_entries')
        .where({ id })
        .update({
          status: 'reversed',
          reversed_by: userId,
          reversed_at: new Date().toISOString(),
          reverse_ref: reversingJournal.id,
        })

      logger.info('Journal reversed', {
        original: journal.nomor_jurnal,
        reversing: nomorReverse,
      })

      return {
        original: await this.getJournal(id, tenantSchema, trx),
        reversing: await this.getJournal(reversingJournal.id, tenantSchema, trx),
      }
    })
  }

  async getJournal(id: string, tenantSchema: string, conn?: Knex | Knex.Transaction) {
    const qb = conn || this.db

    const journal = await qb
      .withSchema(tenantSchema)
      .select('je.*', 'u.name as created_by_name')
      .from('journal_entries as je')
      .leftJoin('users as u', 'u.id', 'je.created_by')
      .where('je.id', id)
      .first()

    if (!journal) throw new NotFoundError('Jurnal')

    const lines = await qb
      .withSchema(tenantSchema)
      .select('jel.*', 'coa.kode as account_kode', 'coa.nama as account_nama')
      .from('journal_entry_lines as jel')
      .join('chart_of_accounts as coa', 'coa.id', 'jel.account_id')
      .where('jel.journal_entry_id', id)
      .orderBy('jel.created_at', 'asc')

    return {
      ...journal,
      total_debit: Number(journal.total_debit),
      total_kredit: Number(journal.total_kredit),
      lines: lines.map((l: Record<string, unknown>) => ({
        ...l,
        debit: Number(l.debit),
        kredit: Number(l.kredit),
      })),
    }
  }

  async listJournals(filters: JournalFilters, tenantSchema: string) {
    const { tanggalMulai, tanggalSelesai, status, search, page, limit } = filters
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .from('journal_entries as je')
      .leftJoin('users as u', 'u.id', 'je.created_by')

    if (tanggalMulai) query = query.where('je.tanggal', '>=', tanggalMulai)
    if (tanggalSelesai) query = query.where('je.tanggal', '<=', tanggalSelesai)
    if (status) query = query.where('je.status', status)
    if (search) {
      query = query.where((qb) => {
        qb.whereILike('je.nomor_jurnal', `%${search}%`)
          .orWhereILike('je.deskripsi', `%${search}%`)
      })
    }

    const countResult = await query.clone().count('je.id as count').first()
    const total = Number(countResult?.count) || 0

    const data = await query
      .clone()
      .select('je.*', 'u.name as created_by_name')
      .orderBy('je.tanggal', 'desc')
      .orderBy('je.created_at', 'desc')
      .offset(offset)
      .limit(limit)

    return {
      data: data.map((j: Record<string, unknown>) => ({
        ...j,
        total_debit: Number(j.total_debit),
        total_kredit: Number(j.total_kredit),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async deleteJournal(id: string, tenantSchema: string) {
    const journal = await this.db
      .withSchema(tenantSchema)
      .select('id', 'status', 'nomor_jurnal')
      .from('journal_entries')
      .where({ id })
      .first()

    if (!journal) throw new NotFoundError('Jurnal')
    if (journal.status !== 'draft') {
      throw new ValidationError('Hanya jurnal berstatus draft yang bisa dihapus')
    }

    await this.db
      .withSchema(tenantSchema)
      .from('journal_entries')
      .where({ id })
      .del()

    logger.info('Journal deleted', { nomorJurnal: journal.nomor_jurnal })
  }

  // ═══════════════════════════════════════════════════════════
  // AUTO-JOURNAL FROM BILLING
  // ═══════════════════════════════════════════════════════════

  async createJournalFromPayment(paymentId: string, tenantSchema: string) {
    const payment = await this.db
      .withSchema(tenantSchema)
      .select('py.*', 'b.visit_id', 'b.id as bill_id')
      .from('payments as py')
      .join('bills as b', 'b.id', 'py.bill_id')
      .where('py.id', paymentId)
      .first()

    if (!payment) throw new NotFoundError('Pembayaran')

    // Check if journal already exists for this payment
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('journal_entries')
      .where({ referensi_tipe: 'payment', referensi_id: paymentId })
      .first()

    if (existing) throw new ConflictError('Jurnal untuk pembayaran ini sudah ada')

    // Get visit info
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('tipe')
      .from('visits')
      .where({ id: payment.visit_id })
      .first()

    // Get bill items grouped by kategori
    const itemsByKategori = await this.db
      .withSchema(tenantSchema)
      .select('kategori')
      .sum('total as total')
      .from('bill_items')
      .where({ bill_id: payment.bill_id })
      .groupBy('kategori')

    const paymentAmount = Number(payment.jumlah)
    const debitAccountKode = PAYMENT_METHOD_ACCOUNT[payment.metode] || '1-1001'

    // Build journal lines
    const lines: JournalLine[] = []

    // Debit: Kas/Bank/Piutang
    const debitAccount = await this.resolveAccountByKode(debitAccountKode, tenantSchema)
    lines.push({
      account_id: debitAccount.id,
      deskripsi: `Penerimaan ${payment.metode} — Pembayaran`,
      debit: paymentAmount,
      kredit: 0,
    })

    // Kredit: split by kategori
    if (itemsByKategori.length > 0) {
      // Calculate proportional amounts
      const totalBillItems = itemsByKategori.reduce(
        (sum: number, it: { total: string }) => sum + Number(it.total), 0,
      )

      let allocated = 0
      for (let i = 0; i < itemsByKategori.length; i++) {
        const item = itemsByKategori[i]
        const proportion = Number(item.total) / totalBillItems
        const isLast = i === itemsByKategori.length - 1
        const amount = isLast
          ? paymentAmount - allocated
          : Math.round(paymentAmount * proportion * 100) / 100

        const revenueKode = KATEGORI_REVENUE_ACCOUNT[item.kategori]
          || VISIT_TYPE_REVENUE[visit?.tipe] || '4-2003'

        const revenueAccount = await this.resolveAccountByKode(revenueKode, tenantSchema)
        lines.push({
          account_id: revenueAccount.id,
          deskripsi: `Pendapatan ${item.kategori}`,
          debit: 0,
          kredit: amount,
        })
        allocated += amount
      }
    } else {
      // Fallback: single revenue line
      const revenueKode = VISIT_TYPE_REVENUE[visit?.tipe] || '4-1001'
      const revenueAccount = await this.resolveAccountByKode(revenueKode, tenantSchema)
      lines.push({
        account_id: revenueAccount.id,
        deskripsi: 'Pendapatan layanan',
        debit: 0,
        kredit: paymentAmount,
      })
    }

    const journal = await this.createJournal(
      {
        tanggal: new Date(payment.paid_at).toISOString().split('T')[0],
        deskripsi: `Pembayaran tagihan (${payment.metode}) — ${payment.bill_id}`,
        referensi_tipe: 'payment',
        referensi_id: paymentId,
        lines,
      },
      payment.received_by,
      tenantSchema,
    )

    // Auto-post payment journals
    return this.postJournal(journal.id, payment.received_by, tenantSchema)
  }

  async createJournalFromPurchaseOrder(poId: string, tenantSchema: string) {
    const po = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('purchase_orders')
      .where({ id: poId })
      .first()

    if (!po) throw new NotFoundError('Purchase Order')

    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('journal_entries')
      .where({ referensi_tipe: 'purchase', referensi_id: poId })
      .first()

    if (existing) throw new ConflictError('Jurnal untuk PO ini sudah ada')

    const totalAmount = Number(po.total_amount)
    const inventoryAccount = await this.resolveAccountByKode('1-1006', tenantSchema)
    const payableAccount = await this.resolveAccountByKode('2-1001', tenantSchema)

    const lines: JournalLine[] = [
      {
        account_id: inventoryAccount.id,
        deskripsi: `Pembelian barang — PO ${po.po_number}`,
        debit: totalAmount,
        kredit: 0,
      },
      {
        account_id: payableAccount.id,
        deskripsi: `Utang supplier — PO ${po.po_number}`,
        debit: 0,
        kredit: totalAmount,
      },
    ]

    const journal = await this.createJournal(
      {
        tanggal: new Date().toISOString().split('T')[0],
        deskripsi: `Pembelian dari PO ${po.po_number}`,
        referensi_tipe: 'purchase',
        referensi_id: poId,
        lines,
      },
      po.created_by,
      tenantSchema,
    )

    return this.postJournal(journal.id, po.created_by, tenantSchema)
  }

  private async resolveAccountByKode(kode: string, tenantSchema: string) {
    const account = await this.db
      .withSchema(tenantSchema)
      .select('id', 'kode', 'nama')
      .from('chart_of_accounts')
      .where({ kode })
      .first()

    if (!account) throw new NotFoundError(`Akun dengan kode '${kode}'`)
    return account
  }

  // ═══════════════════════════════════════════════════════════
  // BUKU BESAR (General Ledger)
  // ═══════════════════════════════════════════════════════════

  async getBukuBesar(accountId: string, filters: LedgerFilters, tenantSchema: string) {
    const account = await this.getAccountById(accountId, tenantSchema)
    const { tanggalMulai, tanggalSelesai, page, limit } = filters
    const offset = (page - 1) * limit

    // Opening balance: sum of all posted entries before tanggalMulai
    let openingDebit = 0
    let openingKredit = 0
    if (tanggalMulai) {
      const opening = await this.db
        .withSchema(tenantSchema)
        .select(
          this.db.raw('COALESCE(SUM(jel.debit), 0) as total_debit'),
          this.db.raw('COALESCE(SUM(jel.kredit), 0) as total_kredit'),
        )
        .from('journal_entry_lines as jel')
        .join('journal_entries as je', 'je.id', 'jel.journal_entry_id')
        .where('jel.account_id', accountId)
        .where('je.status', 'posted')
        .where('je.tanggal', '<', tanggalMulai)
        .first()

      openingDebit = Number(opening?.total_debit) || 0
      openingKredit = Number(opening?.total_kredit) || 0
    }

    let openingBalance: number
    if (account.saldo_normal === 'debit') {
      openingBalance = openingDebit - openingKredit
    } else {
      openingBalance = openingKredit - openingDebit
    }

    // Build query for the filtered range
    let query = this.db
      .withSchema(tenantSchema)
      .from('journal_entry_lines as jel')
      .join('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .where('jel.account_id', accountId)
      .where('je.status', 'posted')

    if (tanggalMulai) query = query.where('je.tanggal', '>=', tanggalMulai)
    if (tanggalSelesai) query = query.where('je.tanggal', '<=', tanggalSelesai)

    const countResult = await query.clone().count('jel.id as count').first()
    const total = Number(countResult?.count) || 0

    const rows = await query
      .clone()
      .select(
        'jel.id',
        'jel.debit',
        'jel.kredit',
        'jel.deskripsi as line_deskripsi',
        'je.nomor_jurnal',
        'je.tanggal',
        'je.deskripsi as journal_deskripsi',
      )
      .orderBy('je.tanggal', 'asc')
      .orderBy('je.created_at', 'asc')
      .offset(offset)
      .limit(limit)

    // Calculate running balance for this page
    // First get sum of all lines before this page offset (within range)
    let priorDebit = 0
    let priorKredit = 0
    if (offset > 0) {
      let priorQuery = this.db
        .withSchema(tenantSchema)
        .select(
          this.db.raw('COALESCE(SUM(jel.debit), 0) as total_debit'),
          this.db.raw('COALESCE(SUM(jel.kredit), 0) as total_kredit'),
        )
        .from('journal_entry_lines as jel')
        .join('journal_entries as je', 'je.id', 'jel.journal_entry_id')
        .where('jel.account_id', accountId)
        .where('je.status', 'posted')

      if (tanggalMulai) priorQuery = priorQuery.where('je.tanggal', '>=', tanggalMulai)
      if (tanggalSelesai) priorQuery = priorQuery.where('je.tanggal', '<=', tanggalSelesai)

      const prior = await priorQuery
        .orderBy('je.tanggal', 'asc')
        .orderBy('je.created_at', 'asc')
        .limit(offset)
        .first()

      priorDebit = Number(prior?.total_debit) || 0
      priorKredit = Number(prior?.total_kredit) || 0
    }

    let runningBalance = openingBalance
    if (account.saldo_normal === 'debit') {
      runningBalance += priorDebit - priorKredit
    } else {
      runningBalance += priorKredit - priorDebit
    }

    const entries = rows.map((row: Record<string, unknown>) => {
      const d = Number(row.debit)
      const k = Number(row.kredit)
      if (account.saldo_normal === 'debit') {
        runningBalance += d - k
      } else {
        runningBalance += k - d
      }
      return {
        ...row,
        debit: d,
        kredit: k,
        saldo: runningBalance,
      }
    })

    return {
      account,
      saldo_awal: openingBalance,
      data: entries,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getAccountBalance(accountId: string, asOfDate: string, tenantSchema: string) {
    const account = await this.getAccountById(accountId, tenantSchema)

    const result = await this.db
      .withSchema(tenantSchema)
      .select(
        this.db.raw('COALESCE(SUM(jel.debit), 0) as total_debit'),
        this.db.raw('COALESCE(SUM(jel.kredit), 0) as total_kredit'),
      )
      .from('journal_entry_lines as jel')
      .join('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .where('jel.account_id', accountId)
      .where('je.status', 'posted')
      .where('je.tanggal', '<=', asOfDate)
      .first()

    const totalDebit = Number(result?.total_debit) || 0
    const totalKredit = Number(result?.total_kredit) || 0
    const saldo = account.saldo_normal === 'debit'
      ? totalDebit - totalKredit
      : totalKredit - totalDebit

    return { account, total_debit: totalDebit, total_kredit: totalKredit, saldo }
  }

  async getAllBalances(asOfDate: string, tenantSchema: string) {
    const accounts = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('chart_of_accounts')
      .where({ is_active: true })
      .orderBy('kode', 'asc')

    const balances = await this.db
      .withSchema(tenantSchema)
      .select(
        'jel.account_id',
        this.db.raw('COALESCE(SUM(jel.debit), 0) as total_debit'),
        this.db.raw('COALESCE(SUM(jel.kredit), 0) as total_kredit'),
      )
      .from('journal_entry_lines as jel')
      .join('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .where('je.status', 'posted')
      .where('je.tanggal', '<=', asOfDate)
      .groupBy('jel.account_id')

    const balanceMap = new Map<string, { total_debit: number; total_kredit: number }>()
    for (const b of balances) {
      balanceMap.set(b.account_id as string, {
        total_debit: Number(b.total_debit),
        total_kredit: Number(b.total_kredit),
      })
    }

    return accounts.map((acct: Record<string, unknown>) => {
      const bal = balanceMap.get(acct.id as string) || { total_debit: 0, total_kredit: 0 }
      const saldo = acct.saldo_normal === 'debit'
        ? bal.total_debit - bal.total_kredit
        : bal.total_kredit - bal.total_debit

      return {
        ...acct,
        total_debit: bal.total_debit,
        total_kredit: bal.total_kredit,
        saldo,
      }
    })
  }

  // ═══════════════════════════════════════════════════════════
  // FINANCIAL REPORTS
  // ═══════════════════════════════════════════════════════════

  async getNeracaSaldo(asOfDate: string, tenantSchema: string) {
    const allBalances = await this.getAllBalances(asOfDate, tenantSchema)

    const accounts = allBalances.filter(
      (a: Record<string, unknown>) => !a.is_header && (a.total_debit !== 0 || a.total_kredit !== 0),
    )

    const totalDebit = accounts
      .filter((a: Record<string, unknown>) => a.saldo_normal === 'debit')
      .reduce((sum: number, a: Record<string, unknown>) => sum + Math.abs(Number(a.saldo)), 0)

    const totalKredit = accounts
      .filter((a: Record<string, unknown>) => a.saldo_normal === 'kredit')
      .reduce((sum: number, a: Record<string, unknown>) => sum + Math.abs(Number(a.saldo)), 0)

    return {
      tanggal: asOfDate,
      accounts,
      total_debit: totalDebit,
      total_kredit: totalKredit,
      selisih: Math.abs(totalDebit - totalKredit),
      is_balanced: Math.abs(totalDebit - totalKredit) < 0.01,
    }
  }

  async getNeraca(asOfDate: string, tenantSchema: string) {
    const allBalances = await this.getAllBalances(asOfDate, tenantSchema)

    const groupBySubTipe = (tipe: string) => {
      const filtered = allBalances.filter(
        (a: Record<string, unknown>) => a.tipe === tipe && !a.is_header,
      )
      const grouped: Record<string, { accounts: Record<string, unknown>[]; subtotal: number }> = {}

      for (const acct of filtered) {
        const key = (acct.sub_tipe as string) || tipe
        if (!grouped[key]) grouped[key] = { accounts: [], subtotal: 0 }
        grouped[key].accounts.push(acct)
        grouped[key].subtotal += Number(acct.saldo)
      }
      return grouped
    }

    const aset = groupBySubTipe('aset')
    const kewajiban = groupBySubTipe('kewajiban')
    const ekuitas = groupBySubTipe('ekuitas')

    const totalAset = Object.values(aset).reduce((s, g) => s + g.subtotal, 0)
    const totalKewajiban = Object.values(kewajiban).reduce((s, g) => s + g.subtotal, 0)
    const totalEkuitas = Object.values(ekuitas).reduce((s, g) => s + g.subtotal, 0)

    return {
      tanggal: asOfDate,
      aset,
      kewajiban,
      ekuitas,
      total_aset: totalAset,
      total_kewajiban: totalKewajiban,
      total_ekuitas: totalEkuitas,
      total_kewajiban_ekuitas: totalKewajiban + totalEkuitas,
      is_balanced: Math.abs(totalAset - (totalKewajiban + totalEkuitas)) < 0.01,
    }
  }

  async getLabaRugi(periodeStart: string, periodeEnd: string, tenantSchema: string) {
    const accounts = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('chart_of_accounts')
      .whereIn('tipe', ['pendapatan', 'beban'])
      .where({ is_active: true, is_header: false })
      .orderBy('kode', 'asc')

    const balances = await this.db
      .withSchema(tenantSchema)
      .select(
        'jel.account_id',
        this.db.raw('COALESCE(SUM(jel.debit), 0) as total_debit'),
        this.db.raw('COALESCE(SUM(jel.kredit), 0) as total_kredit'),
      )
      .from('journal_entry_lines as jel')
      .join('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .where('je.status', 'posted')
      .where('je.tanggal', '>=', periodeStart)
      .where('je.tanggal', '<=', periodeEnd)
      .groupBy('jel.account_id')

    const balanceMap = new Map<string, { total_debit: number; total_kredit: number }>()
    for (const b of balances) {
      balanceMap.set(b.account_id as string, {
        total_debit: Number(b.total_debit),
        total_kredit: Number(b.total_kredit),
      })
    }

    const buildGroup = (tipe: string) => {
      const filtered = accounts.filter((a: Record<string, unknown>) => a.tipe === tipe)
      const grouped: Record<string, { accounts: Array<Record<string, unknown>>; subtotal: number }> = {}

      for (const acct of filtered) {
        const key = (acct.sub_tipe as string) || tipe
        if (!grouped[key]) grouped[key] = { accounts: [], subtotal: 0 }

        const bal = balanceMap.get(acct.id as string) || { total_debit: 0, total_kredit: 0 }
        const saldo = acct.saldo_normal === 'debit'
          ? bal.total_debit - bal.total_kredit
          : bal.total_kredit - bal.total_debit

        grouped[key].accounts.push({ ...acct, saldo })
        grouped[key].subtotal += saldo
      }
      return grouped
    }

    const pendapatan = buildGroup('pendapatan')
    const beban = buildGroup('beban')

    const totalPendapatan = Object.values(pendapatan).reduce((s, g) => s + g.subtotal, 0)
    const totalBeban = Object.values(beban).reduce((s, g) => s + g.subtotal, 0)

    return {
      periode: { mulai: periodeStart, selesai: periodeEnd },
      pendapatan,
      beban,
      total_pendapatan: totalPendapatan,
      total_beban: totalBeban,
      laba_rugi: totalPendapatan - totalBeban,
    }
  }

  async getArusKas(periodeStart: string, periodeEnd: string, tenantSchema: string) {
    // Simplified cash flow based on kas & bank account transactions
    const kasAccounts = await this.db
      .withSchema(tenantSchema)
      .select('id', 'kode', 'nama')
      .from('chart_of_accounts')
      .whereIn('kode', ['1-1001', '1-1002'])

    const kasIds = kasAccounts.map((a: { id: string }) => a.id)
    if (kasIds.length === 0) {
      return {
        periode: { mulai: periodeStart, selesai: periodeEnd },
        operasi: { penerimaan: 0, pengeluaran: 0, neto: 0, detail: [] },
        investasi: { penerimaan: 0, pengeluaran: 0, neto: 0, detail: [] },
        pendanaan: { penerimaan: 0, pengeluaran: 0, neto: 0, detail: [] },
        total_perubahan_kas: 0,
      }
    }

    const kasTransactions = await this.db
      .withSchema(tenantSchema)
      .select(
        'jel.*',
        'je.tanggal',
        'je.deskripsi as journal_deskripsi',
        'je.referensi_tipe',
      )
      .from('journal_entry_lines as jel')
      .join('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .whereIn('jel.account_id', kasIds)
      .where('je.status', 'posted')
      .where('je.tanggal', '>=', periodeStart)
      .where('je.tanggal', '<=', periodeEnd)
      .orderBy('je.tanggal', 'asc')

    // Classify: payment/adjustment → operasi, purchase → investasi, opening/closing → pendanaan
    let operasiPenerimaan = 0
    let operasiPengeluaran = 0
    let investasiPenerimaan = 0
    let investasiPengeluaran = 0
    let pendanaanPenerimaan = 0
    let pendanaanPengeluaran = 0

    const operasiDetail: Array<Record<string, unknown>> = []
    const investasiDetail: Array<Record<string, unknown>> = []
    const pendanaanDetail: Array<Record<string, unknown>> = []

    for (const tx of kasTransactions) {
      const debit = Number(tx.debit)
      const kredit = Number(tx.kredit)
      const entry = {
        tanggal: tx.tanggal,
        deskripsi: tx.journal_deskripsi,
        debit,
        kredit,
      }

      const refTipe = tx.referensi_tipe as string
      if (refTipe === 'purchase') {
        investasiDetail.push(entry)
        investasiPenerimaan += debit
        investasiPengeluaran += kredit
      } else if (refTipe === 'opening' || refTipe === 'closing') {
        pendanaanDetail.push(entry)
        pendanaanPenerimaan += debit
        pendanaanPengeluaran += kredit
      } else {
        operasiDetail.push(entry)
        operasiPenerimaan += debit
        operasiPengeluaran += kredit
      }
    }

    return {
      periode: { mulai: periodeStart, selesai: periodeEnd },
      operasi: {
        penerimaan: operasiPenerimaan,
        pengeluaran: operasiPengeluaran,
        neto: operasiPenerimaan - operasiPengeluaran,
        detail: operasiDetail,
      },
      investasi: {
        penerimaan: investasiPenerimaan,
        pengeluaran: investasiPengeluaran,
        neto: investasiPenerimaan - investasiPengeluaran,
        detail: investasiDetail,
      },
      pendanaan: {
        penerimaan: pendanaanPenerimaan,
        pengeluaran: pendanaanPengeluaran,
        neto: pendanaanPenerimaan - pendanaanPengeluaran,
        detail: pendanaanDetail,
      },
      total_perubahan_kas:
        (operasiPenerimaan - operasiPengeluaran) +
        (investasiPenerimaan - investasiPengeluaran) +
        (pendanaanPenerimaan - pendanaanPengeluaran),
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FISCAL PERIODS
  // ═══════════════════════════════════════════════════════════

  async getFiscalPeriods(tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('fiscal_periods')
      .orderBy('tanggal_mulai', 'desc')
  }

  async closePeriod(periodId: string, userId: string, tenantSchema: string) {
    const period = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('fiscal_periods')
      .where({ id: periodId })
      .first()

    if (!period) throw new NotFoundError('Periode fiskal')
    if (period.is_closed) throw new ConflictError('Periode sudah ditutup')

    // Check all journals in period are posted or reversed (no drafts)
    const draftCount = await this.db
      .withSchema(tenantSchema)
      .from('journal_entries')
      .where('tanggal', '>=', period.tanggal_mulai)
      .where('tanggal', '<=', period.tanggal_selesai)
      .where('status', 'draft')
      .count('id as count')
      .first()

    if (Number(draftCount?.count) > 0) {
      throw new ValidationError(
        `Masih ada ${draftCount?.count} jurnal berstatus draft dalam periode ini. Posting atau hapus terlebih dahulu.`,
      )
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('fiscal_periods')
      .where({ id: periodId })
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: userId,
      })
      .returning('*')

    logger.info('Fiscal period closed', { periodId, nama: period.nama })
    return updated
  }

  private async checkFiscalPeriodOpen(tanggal: string, tenantSchema: string) {
    const closedPeriod = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama')
      .from('fiscal_periods')
      .where('tanggal_mulai', '<=', tanggal)
      .where('tanggal_selesai', '>=', tanggal)
      .where('is_closed', true)
      .first()

    if (closedPeriod) {
      throw new ValidationError(
        `Tanggal ${tanggal} berada dalam periode fiskal '${closedPeriod.nama}' yang sudah ditutup`,
      )
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════

  async getAccountingDashboard(tenantSchema: string) {
    const today = new Date().toISOString().split('T')[0]
    const firstOfMonth = today.substring(0, 8) + '01'
    const firstOfYear = today.substring(0, 5) + '01-01'

    const allBalances = await this.getAllBalances(today, tenantSchema)

    const sumByTipe = (tipe: string) =>
      allBalances
        .filter((a: Record<string, unknown>) => a.tipe === tipe && !a.is_header)
        .reduce((s: number, a: Record<string, unknown>) => s + Number(a.saldo), 0)

    const totalAset = sumByTipe('aset')
    const totalKewajiban = sumByTipe('kewajiban')
    const totalEkuitas = sumByTipe('ekuitas')

    // Monthly P&L
    const monthlyPnL = await this.getLabaRugi(firstOfMonth, today, tenantSchema)

    // Yearly P&L
    const yearlyPnL = await this.getLabaRugi(firstOfYear, today, tenantSchema)

    // Kas & Bank balances
    const kasBank = allBalances.filter(
      (a: Record<string, unknown>) =>
        ['1-1001', '1-1002'].includes(a.kode as string),
    )

    // Recent journals
    const recentJournals = await this.db
      .withSchema(tenantSchema)
      .select('je.*', 'u.name as created_by_name')
      .from('journal_entries as je')
      .leftJoin('users as u', 'u.id', 'je.created_by')
      .orderBy('je.created_at', 'desc')
      .limit(10)

    // Journal counts by status
    const journalStats = await this.db
      .withSchema(tenantSchema)
      .select('status')
      .count('id as count')
      .from('journal_entries')
      .groupBy('status')

    const statMap: Record<string, number> = {}
    for (const s of journalStats) {
      statMap[s.status as string] = Number(s.count)
    }

    return {
      total_aset: totalAset,
      total_kewajiban: totalKewajiban,
      total_ekuitas: totalEkuitas,
      pendapatan_bulan_ini: monthlyPnL.total_pendapatan,
      beban_bulan_ini: monthlyPnL.total_beban,
      laba_rugi_bulan_ini: monthlyPnL.laba_rugi,
      pendapatan_tahun_ini: yearlyPnL.total_pendapatan,
      beban_tahun_ini: yearlyPnL.total_beban,
      laba_rugi_tahun_ini: yearlyPnL.laba_rugi,
      kas_bank: kasBank.map((a: Record<string, unknown>) => ({
        kode: a.kode,
        nama: a.nama,
        saldo: Number(a.saldo),
      })),
      recent_journals: recentJournals.map((j: Record<string, unknown>) => ({
        ...j,
        total_debit: Number(j.total_debit),
        total_kredit: Number(j.total_kredit),
      })),
      journal_counts: {
        draft: statMap.draft || 0,
        posted: statMap.posted || 0,
        reversed: statMap.reversed || 0,
      },
    }
  }
}
