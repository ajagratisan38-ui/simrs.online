'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePOStatus,
  receivePOItems,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type CreatePOInput,
  type POStatus,
  type ReceiveItemInput,
} from '@/lib/api/purchase-order'

// --- Supplier hooks ---

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
    staleTime: 60_000,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSupplierInput) => createSupplier(data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInput }) =>
      updateSupplier(id, data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

// --- PO hooks ---

export function usePurchaseOrders(params?: {
  page?: number
  limit?: number
  status?: string
  supplier_id?: string
  search?: string
}) {
  const stableParams = useMemo(
    () => ({
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      status: params?.status,
      supplier_id: params?.supplier_id,
      search: params?.search,
    }),
    [params?.page, params?.limit, params?.status, params?.supplier_id, params?.search],
  )

  return useQuery({
    queryKey: ['purchase-orders', stableParams],
    queryFn: () => listPurchaseOrders(stableParams),
    placeholderData: (prev) => prev,
  })
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrder(id),
    enabled: !!id,
  })
}

export function useCreatePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePOInput) => createPurchaseOrder(data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}

export function useUpdatePOStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: POStatus; catatan?: string }) =>
      updatePOStatus(id, status, catatan),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['purchase-order'] })
    },
  })
}

export function useReceivePOItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: ReceiveItemInput[] }) =>
      receivePOItems(id, items),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['purchase-order'] })
      qc.invalidateQueries({ queryKey: ['drugs'] })
    },
  })
}
