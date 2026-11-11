'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listTransfers,
  getTransfer,
  createTransfer,
  approveTransfer,
  completeTransfer,
  rejectTransfer,
} from '@/lib/api/inventory'
import type { CreateTransferInput } from '@/lib/api/inventory'

export function useTransfers(params?: {
  page?: number
  limit?: number
  status?: string
  from_location?: string
  to_location?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['item-transfers', params],
    queryFn: () => listTransfers(params),
    staleTime: 30_000,
  })
}

export function useTransfer(id: string) {
  return useQuery({
    queryKey: ['item-transfers', id],
    queryFn: () => getTransfer(id),
    enabled: !!id,
  })
}

export function useCreateTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransferInput) => createTransfer(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['item-transfers'] }),
  })
}

export function useApproveTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveTransfer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['item-transfers'] }),
  })
}

export function useCompleteTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => completeTransfer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['item-transfers'] }),
  })
}

export function useRejectTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, alasan }: { id: string; alasan: string }) =>
      rejectTransfer(id, alasan),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['item-transfers'] }),
  })
}
