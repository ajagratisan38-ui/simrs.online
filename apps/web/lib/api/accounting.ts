import { apiClient } from './client'

// ─── Types ──────────────────────────────────────────────────

export interface Account {
  id: string
  kode: string
  nama: string
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'
  sub_tipe: string | null
  parent_id: string | null
  level: number
  is_header: boolean
  saldo_normal: 'debit' | 'kredit'
  is_active: boolean
  children?: Account[]
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  account_id: string
  account_kode: string
  account_nama: string
  deskripsi: string | null
  debit: number
  kredit: number
}

export interface JournalEntry {
  id: string
  nomor_jurnal: string
  tanggal: string
  deskripsi: string
  referensi_tipe: string | null
  referensi_id: string | null
  total_debit: number
  total_kredit: number
  status: 'draft' | 'posted' | 'reversed'
  posted_at: string | null
  posted_by: string | null
  reversed_by: string | null
  reversed_at: string | null
  reverse_ref: string | null
  catatan: string | null
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
  lines: JournalEntryLine[]
}

export interface CreateJournalLine {
  account_id: string
  deskripsi?: string
  debit: number
  kredit: number
}

export interface CreateJournalInput {
  tanggal: string
  deskripsi: string
  referensi_tipe?: string
  catatan?: string
  lines: CreateJournalLine[]
}

export interface CreateAccountInput {
  kode: string
  nama: string
  tipe: 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'
  sub_tipe?: string
  parent_id?: string
  level: number
  is_header?: boolean
  saldo_normal: 'debit' | 'kredit'
}

export interface UpdateAccountInput {
  nama?: string
  sub_tipe?: string
  parent_id?: string | null
  level?: number
  is_header?: boolean
  is_active?: boolean
}

export interface LedgerEntry {
  id: string
  debit: number
  kredit: number
  saldo: number
  line_deskripsi: string | null
  nomor_jurnal: string
  tanggal: string
  journal_deskripsi: string
}

export interface LedgerResponse {
  success: boolean
  account: Account
  saldo_awal: number
  data: LedgerEntry[]
  meta: PaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface TrialBalanceAccount {
  id: string
  kode: string
  nama: string
  tipe: string
  saldo_normal: string
  total_debit: number
  total_kredit: number
  saldo: number
}

export interface TrialBalance {
  tanggal: string
  accounts: TrialBalanceAccount[]
  total_debit: number
  total_kredit: number
  selisih: number
  is_balanced: boolean
}

export interface NeracaGroup {
  accounts: Array<{ kode: string; nama: string; saldo: number }>
  subtotal: number
}

export interface Neraca {
  tanggal: string
  aset: Record<string, NeracaGroup>
  kewajiban: Record<string, NeracaGroup>
  ekuitas: Record<string, NeracaGroup>
  total_aset: number
  total_kewajiban: number
  total_ekuitas: number
  total_kewajiban_ekuitas: number
  is_balanced: boolean
}

export interface LabaRugiGroup {
  accounts: Array<{ kode: string; nama: string; saldo: number }>
  subtotal: number
}

export interface LabaRugi {
  periode: { mulai: string; selesai: string }
  pendapatan: Record<string, LabaRugiGroup>
  beban: Record<string, LabaRugiGroup>
  total_pendapatan: number
  total_beban: number
  laba_rugi: number
}

export interface FiscalPeriod {
  id: string
  nama: string
  tipe: 'bulanan' | 'tahunan'
  tanggal_mulai: string
  tanggal_selesai: string
  is_closed: boolean
  closed_at: string | null
  closed_by: string | null
}

export interface AccountingDashboard {
  total_aset: number
  total_kewajiban: number
  total_ekuitas: number
  pendapatan_bulan_ini: number
  beban_bulan_ini: number
  laba_rugi_bulan_ini: number
  pendapatan_tahun_ini: number
  beban_tahun_ini: number
  laba_rugi_tahun_ini: number
  kas_bank: Array<{ kode: string; nama: string; saldo: number }>
  recent_journals: JournalEntry[]
  journal_counts: { draft: number; posted: number; reversed: number }
}

// ─── API Functions ──────────────────────────────────────────

export async function getAccounts() {
  return apiClient<{ success: boolean; data: Account[] }>('/accounting/accounts')
}

export async function getAccountByKode(kode: string) {
  return apiClient<{ success: boolean; data: Account }>(`/accounting/accounts/${kode}`)
}

export async function createAccount(data: CreateAccountInput) {
  return apiClient<{ success: boolean; data: Account }>('/accounting/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAccount(id: string, data: UpdateAccountInput) {
  return apiClient<{ success: boolean; data: Account }>(`/accounting/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAccount(id: string) {
  return apiClient<{ success: boolean }>(`/accounting/accounts/${id}`, {
    method: 'DELETE',
  })
}

export async function createJournal(data: CreateJournalInput) {
  return apiClient<{ success: boolean; data: JournalEntry }>('/accounting/journals', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function listJournals(params: {
  tanggalMulai?: string
  tanggalSelesai?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (params.tanggalMulai) qs.set('tanggalMulai', params.tanggalMulai)
  if (params.tanggalSelesai) qs.set('tanggalSelesai', params.tanggalSelesai)
  if (params.status) qs.set('status', params.status)
  if (params.search) qs.set('search', params.search)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  return apiClient<{ success: boolean; data: JournalEntry[]; meta: PaginationMeta }>(
    `/accounting/journals?${qs.toString()}`,
  )
}

export async function getJournal(id: string) {
  return apiClient<{ success: boolean; data: JournalEntry }>(`/accounting/journals/${id}`)
}

export async function postJournal(id: string) {
  return apiClient<{ success: boolean; data: JournalEntry }>(`/accounting/journals/${id}/post`, {
    method: 'PUT',
  })
}

export async function reverseJournal(id: string, reason: string) {
  return apiClient<{ success: boolean; data: { original: JournalEntry; reversing: JournalEntry } }>(
    `/accounting/journals/${id}/reverse`,
    { method: 'PUT', body: JSON.stringify({ reason }) },
  )
}

export async function deleteJournal(id: string) {
  return apiClient<{ success: boolean }>(`/accounting/journals/${id}`, {
    method: 'DELETE',
  })
}

export async function createJournalFromPayment(paymentId: string) {
  return apiClient<{ success: boolean; data: JournalEntry }>(
    `/accounting/journals/from-payment/${paymentId}`,
    { method: 'POST' },
  )
}

export async function createJournalFromPO(poId: string) {
  return apiClient<{ success: boolean; data: JournalEntry }>(
    `/accounting/journals/from-po/${poId}`,
    { method: 'POST' },
  )
}

export async function getLedger(accountId: string, params: {
  tanggalMulai?: string
  tanggalSelesai?: string
  page?: number
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (params.tanggalMulai) qs.set('tanggalMulai', params.tanggalMulai)
  if (params.tanggalSelesai) qs.set('tanggalSelesai', params.tanggalSelesai)
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  return apiClient<LedgerResponse>(`/accounting/ledger/${accountId}?${qs.toString()}`)
}

export async function getTrialBalance(asOfDate?: string) {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : ''
  return apiClient<{ success: boolean; data: TrialBalance }>(`/accounting/trial-balance${qs}`)
}

export async function getBalanceSheet(asOfDate?: string) {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : ''
  return apiClient<{ success: boolean; data: Neraca }>(`/accounting/balance-sheet${qs}`)
}

export async function getIncomeStatement(start?: string, end?: string) {
  const qs = new URLSearchParams()
  if (start) qs.set('start', start)
  if (end) qs.set('end', end)
  const q = qs.toString()
  return apiClient<{ success: boolean; data: LabaRugi }>(`/accounting/income-statement${q ? '?' + q : ''}`)
}

export async function getCashFlow(start?: string, end?: string) {
  const qs = new URLSearchParams()
  if (start) qs.set('start', start)
  if (end) qs.set('end', end)
  const q = qs.toString()
  return apiClient<{ success: boolean; data: Record<string, unknown> }>(`/accounting/cash-flow${q ? '?' + q : ''}`)
}

export async function getAccountingDashboard() {
  return apiClient<{ success: boolean; data: AccountingDashboard }>('/accounting/dashboard')
}

export async function getFiscalPeriods() {
  return apiClient<{ success: boolean; data: FiscalPeriod[] }>('/accounting/fiscal-periods')
}

export async function closeFiscalPeriod(id: string) {
  return apiClient<{ success: boolean; data: FiscalPeriod }>(`/accounting/fiscal-periods/${id}/close`, {
    method: 'PUT',
  })
}
