import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAccounts,
  getAccountByKode,
  createAccount,
  updateAccount,
  deleteAccount,
  createJournal,
  listJournals,
  getJournal,
  postJournal,
  reverseJournal,
  deleteJournal,
  createJournalFromPayment,
  createJournalFromPO,
  getLedger,
  getTrialBalance,
  getBalanceSheet,
  getIncomeStatement,
  getCashFlow,
  getAccountingDashboard,
  getFiscalPeriods,
  closeFiscalPeriod,
  type CreateJournalInput,
  type CreateAccountInput,
  type UpdateAccountInput,
} from '@/lib/api/accounting'

// ─── COA ──────────────────────────────────────────────────

export function useAccounts() {
  return useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => getAccounts().then((r) => r.data),
    staleTime: 60_000,
  })
}

export function useAccountByKode(kode: string) {
  return useQuery({
    queryKey: ['accounting', 'accounts', kode],
    queryFn: () => getAccountByKode(kode).then((r) => r.data),
    enabled: !!kode,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAccountInput) => createAccount(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting', 'accounts'] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountInput }) => updateAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting', 'accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting', 'accounts'] }),
  })
}

// ─── JOURNALS ─────────────────────────────────────────────

export function useJournals(params: {
  tanggalMulai?: string
  tanggalSelesai?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['accounting', 'journals', params],
    queryFn: () => listJournals(params),
    placeholderData: (prev) => prev,
  })
}

export function useJournal(id: string) {
  return useQuery({
    queryKey: ['accounting', 'journals', id],
    queryFn: () => getJournal(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateJournalInput) => createJournal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting', 'journals'] })
      qc.invalidateQueries({ queryKey: ['accounting', 'dashboard'] })
    },
  })
}

export function usePostJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => postJournal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}

export function useReverseJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reverseJournal(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}

export function useDeleteJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteJournal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting', 'journals'] })
      qc.invalidateQueries({ queryKey: ['accounting', 'dashboard'] })
    },
  })
}

export function useCreateJournalFromPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => createJournalFromPayment(paymentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting'] }),
  })
}

export function useCreateJournalFromPO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (poId: string) => createJournalFromPO(poId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting'] }),
  })
}

// ─── LEDGER ───────────────────────────────────────────────

export function useLedger(accountId: string, params: {
  tanggalMulai?: string
  tanggalSelesai?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['accounting', 'ledger', accountId, params],
    queryFn: () => getLedger(accountId, params),
    enabled: !!accountId,
    placeholderData: (prev) => prev,
  })
}

// ─── REPORTS ──────────────────────────────────────────────

export function useTrialBalance(asOfDate?: string) {
  return useQuery({
    queryKey: ['accounting', 'trial-balance', asOfDate],
    queryFn: () => getTrialBalance(asOfDate).then((r) => r.data),
  })
}

export function useBalanceSheet(asOfDate?: string) {
  return useQuery({
    queryKey: ['accounting', 'balance-sheet', asOfDate],
    queryFn: () => getBalanceSheet(asOfDate).then((r) => r.data),
  })
}

export function useIncomeStatement(start?: string, end?: string) {
  return useQuery({
    queryKey: ['accounting', 'income-statement', start, end],
    queryFn: () => getIncomeStatement(start, end).then((r) => r.data),
  })
}

export function useCashFlow(start?: string, end?: string) {
  return useQuery({
    queryKey: ['accounting', 'cash-flow', start, end],
    queryFn: () => getCashFlow(start, end).then((r) => r.data),
  })
}

export function useAccountingDashboard() {
  return useQuery({
    queryKey: ['accounting', 'dashboard'],
    queryFn: () => getAccountingDashboard().then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

// ─── FISCAL PERIODS ──────────────────────────────────────

export function useFiscalPeriods() {
  return useQuery({
    queryKey: ['accounting', 'fiscal-periods'],
    queryFn: () => getFiscalPeriods().then((r) => r.data),
  })
}

export function useCloseFiscalPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => closeFiscalPeriod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting', 'fiscal-periods'] }),
  })
}
