import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  generateBill,
  getBill,
  applyDiscount,
  finalizeBill,
  processPayment,
  getOutstandingBills,
  getDailySummary,
  getPatientBills,
  type PaymentInput,
} from '@/lib/api/billing'

export function useBill(visitId: string) {
  return useQuery({
    queryKey: ['bill', visitId],
    queryFn: () => getBill(visitId),
    enabled: !!visitId,
    retry: false,
  })
}

export function useGenerateBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (visitId: string) => generateBill(visitId),
    onSuccess: (_res, visitId) => {
      qc.invalidateQueries({ queryKey: ['bill', visitId] })
      qc.invalidateQueries({ queryKey: ['outstanding-bills'] })
    },
  })
}

export function useApplyDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      billId,
      data,
    }: {
      billId: string
      data: { discount_amount: number; catatan: string }
    }) => applyDiscount(billId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bill'] })
      qc.invalidateQueries({ queryKey: ['outstanding-bills'] })
    },
  })
}

export function useFinalizeBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (billId: string) => finalizeBill(billId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bill'] })
      qc.invalidateQueries({ queryKey: ['outstanding-bills'] })
    },
  })
}

export function useProcessPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      billId,
      data,
    }: {
      billId: string
      data: PaymentInput
    }) => processPayment(billId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bill'] })
      qc.invalidateQueries({ queryKey: ['outstanding-bills'] })
      qc.invalidateQueries({ queryKey: ['daily-summary'] })
    },
  })
}

export function useOutstandingBills(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['outstanding-bills', page, limit],
    queryFn: () => getOutstandingBills(page, limit),
    staleTime: 15_000,
  })
}

export function useDailySummary(date?: string) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: () => getDailySummary(date),
    staleTime: 30_000,
  })
}

export function usePatientBills(patientId: string, page = 1) {
  return useQuery({
    queryKey: ['patient-bills', patientId, page],
    queryFn: () => getPatientBills(patientId, page),
    enabled: !!patientId,
    staleTime: 30_000,
  })
}
