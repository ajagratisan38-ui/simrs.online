'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listOtcSales,
  getOtcSale,
  createOtcSale,
  getOtcDailySummary,
} from '@/lib/api/otc-sales'
import type { OtcSaleInput } from '@/lib/api/otc-sales'

export function useOtcSales(params?: {
  page?: number
  limit?: number
  date_from?: string
  date_to?: string
}) {
  return useQuery({
    queryKey: ['otc-sales', params],
    queryFn: () => listOtcSales(params),
    staleTime: 30_000,
  })
}

export function useOtcSale(id: string) {
  return useQuery({
    queryKey: ['otc-sales', id],
    queryFn: () => getOtcSale(id),
    enabled: !!id,
  })
}

export function useCreateOtcSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OtcSaleInput) => createOtcSale(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['otc-sales'] }),
  })
}

export function useOtcDailySummary(date?: string) {
  return useQuery({
    queryKey: ['otc-summary', date],
    queryFn: () => getOtcDailySummary(date),
    staleTime: 60_000,
  })
}
