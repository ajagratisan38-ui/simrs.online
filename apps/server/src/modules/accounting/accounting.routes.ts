import { Router } from 'express'
import { AccountingController } from './accounting.controller'
import { AccountingService } from './accounting.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new AccountingService(db)
const controller = new AccountingController(service)

const router = Router()
router.use(authenticate)

const canRead = checkAnyPermission('billing:read', 'billing:manage', 'report:read', 'dashboard:read')
const canManage = checkAnyPermission('billing:manage', 'settings:manage')

// ─── COA ──────────────────────────────────────────────────
router.get('/accounts', canRead, controller.getAccounts)
router.get('/accounts/:kode', canRead, controller.getAccountByKode)
router.post('/accounts', canManage, controller.createAccount)
router.put('/accounts/:id', canManage, controller.updateAccount)
router.delete('/accounts/:id', canManage, controller.deleteAccount)

// ─── JOURNALS ─────────────────────────────────────────────
router.post('/journals', canManage, controller.createJournal)
router.get('/journals', canRead, controller.listJournals)
router.post('/journals/from-payment/:paymentId', canManage, controller.createJournalFromPayment)
router.post('/journals/from-po/:poId', canManage, controller.createJournalFromPO)
router.get('/journals/:id', canRead, controller.getJournal)
router.put('/journals/:id/post', canManage, controller.postJournal)
router.put('/journals/:id/reverse', canManage, controller.reverseJournal)
router.delete('/journals/:id', canManage, controller.deleteJournal)

// ─── LEDGER & REPORTS ─────────────────────────────────────
router.get('/ledger/:accountId', canRead, controller.getBukuBesar)
router.get('/trial-balance', canRead, controller.getTrialBalance)
router.get('/balance-sheet', canRead, controller.getBalanceSheet)
router.get('/income-statement', canRead, controller.getIncomeStatement)
router.get('/cash-flow', canRead, controller.getCashFlow)
router.get('/dashboard', canRead, controller.getDashboard)

// ─── FISCAL PERIODS ──────────────────────────────────────
router.get('/fiscal-periods', canRead, controller.getFiscalPeriods)
router.put('/fiscal-periods/:id/close', canManage, controller.closeFiscalPeriod)

export { router as accountingRouter }
