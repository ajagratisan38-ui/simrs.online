import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AccountingService } from './accounting.service'

const createAccountSchema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(1).max(200),
  tipe: z.enum(['aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban']),
  sub_tipe: z.string().max(50).optional(),
  parent_id: z.string().uuid().optional(),
  level: z.number().int().min(1).max(5),
  is_header: z.boolean().optional(),
  saldo_normal: z.enum(['debit', 'kredit']),
})

const updateAccountSchema = z.object({
  nama: z.string().min(1).max(200).optional(),
  sub_tipe: z.string().max(50).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  level: z.number().int().min(1).max(5).optional(),
  is_header: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

const journalLineSchema = z.object({
  account_id: z.string().uuid(),
  deskripsi: z.string().max(300).optional(),
  debit: z.number().min(0),
  kredit: z.number().min(0),
})

const createJournalSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deskripsi: z.string().min(1),
  referensi_tipe: z.string().max(30).optional(),
  referensi_id: z.string().uuid().optional(),
  catatan: z.string().optional(),
  lines: z.array(journalLineSchema).min(2),
})

const reverseSchema = z.object({
  reason: z.string().min(1, 'Alasan reverse wajib diisi'),
})

export class AccountingController {
  constructor(private service: AccountingService) {}

  // ─── COA ────────────────────────────────────────────────

  getAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getAccounts(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getAccountByKode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getAccountByKode(req.params.kode, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  createAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createAccountSchema.parse(req.body)
      const data = await this.service.createAccount(input, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  updateAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateAccountSchema.parse(req.body)
      const data = await this.service.updateAccount(req.params.id, input, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteAccount(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Akun berhasil dihapus' } })
    } catch (error) { next(error) }
  }

  // ─── JOURNALS ───────────────────────────────────────────

  createJournal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createJournalSchema.parse(req.body)
      const data = await this.service.createJournal(input, req.userId!, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  listJournals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        tanggalMulai: req.query.tanggalMulai as string | undefined,
        tanggalSelesai: req.query.tanggalSelesai as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        page: Math.max(1, Number(req.query.page) || 1),
        limit: Math.min(100, Math.max(1, Number(req.query.limit) || 20)),
      }
      const data = await this.service.listJournals(filters, req.tenantSchema!)
      res.json({ success: true, ...data })
    } catch (error) { next(error) }
  }

  getJournal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getJournal(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  postJournal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.postJournal(req.params.id, req.userId!, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  reverseJournal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason } = reverseSchema.parse(req.body)
      const data = await this.service.reverseJournal(req.params.id, req.userId!, reason, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  deleteJournal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteJournal(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Jurnal berhasil dihapus' } })
    } catch (error) { next(error) }
  }

  createJournalFromPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.createJournalFromPayment(req.params.paymentId, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  createJournalFromPO = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.createJournalFromPurchaseOrder(req.params.poId, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ─── LEDGER & REPORTS ──────────────────────────────────

  getBukuBesar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        tanggalMulai: req.query.tanggalMulai as string | undefined,
        tanggalSelesai: req.query.tanggalSelesai as string | undefined,
        page: Math.max(1, Number(req.query.page) || 1),
        limit: Math.min(100, Math.max(1, Number(req.query.limit) || 50)),
      }
      const data = await this.service.getBukuBesar(req.params.accountId, filters, req.tenantSchema!)
      res.json({ success: true, ...data })
    } catch (error) { next(error) }
  }

  getTrialBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asOfDate = (req.query.asOfDate as string) || new Date().toISOString().split('T')[0]
      const data = await this.service.getNeracaSaldo(asOfDate, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getBalanceSheet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asOfDate = (req.query.asOfDate as string) || new Date().toISOString().split('T')[0]
      const data = await this.service.getNeraca(asOfDate, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getIncomeStatement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const start = (req.query.start as string) || today.substring(0, 8) + '01'
      const end = (req.query.end as string) || today
      const data = await this.service.getLabaRugi(start, end, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getCashFlow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const start = (req.query.start as string) || today.substring(0, 8) + '01'
      const end = (req.query.end as string) || today
      const data = await this.service.getArusKas(start, end, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getAccountingDashboard(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  // ─── FISCAL PERIODS ────────────────────────────────────

  getFiscalPeriods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getFiscalPeriods(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }

  closeFiscalPeriod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.closePeriod(req.params.id, req.userId!, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) { next(error) }
  }
}
