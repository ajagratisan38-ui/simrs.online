import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listWarehouseItems, getWarehouseItem, createWarehouseItem,
  updateWarehouseItem, deleteWarehouseItem, addWarehouseStock,
  listStockOpnames, createStockOpname, getStockOpname,
  inputOpnameCount, completeStockOpname, cancelStockOpname,
} from '@/lib/api/warehouse'

export function useWarehouseItems(params?: {
  search?: string; kategori?: string; page?: number; limit?: number
}) {
  return useQuery({
    queryKey: ['warehouse-items', params],
    queryFn: () => listWarehouseItems(params),
  })
}

export function useWarehouseItem(id: string) {
  return useQuery({
    queryKey: ['warehouse-item', id],
    queryFn: () => getWarehouseItem(id),
    enabled: !!id,
  })
}

export function useCreateWarehouseItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWarehouseItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouse-items'] }),
  })
}

export function useUpdateWarehouseItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateWarehouseItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse-items'] })
      qc.invalidateQueries({ queryKey: ['warehouse-item'] })
    },
  })
}

export function useDeleteWarehouseItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteWarehouseItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouse-items'] }),
  })
}

export function useAddWarehouseStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addWarehouseStock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouse-items'] })
      qc.invalidateQueries({ queryKey: ['warehouse-item'] })
    },
  })
}

// Stock Opname
export function useStockOpnames(params?: {
  status?: string; tipe?: string; page?: number; limit?: number
}) {
  return useQuery({
    queryKey: ['stock-opnames', params],
    queryFn: () => listStockOpnames(params),
  })
}

export function useStockOpname(id: string) {
  return useQuery({
    queryKey: ['stock-opname', id],
    queryFn: () => getStockOpname(id),
    enabled: !!id,
  })
}

export function useCreateStockOpname() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createStockOpname,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-opnames'] }),
  })
}

export function useInputOpnameCount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ opnameId, itemId, stokFisik, catatan }: {
      opnameId: string; itemId: string; stokFisik: number; catatan?: string
    }) => inputOpnameCount(opnameId, itemId, stokFisik, catatan),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-opname'] }),
  })
}

export function useCompleteStockOpname() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: completeStockOpname,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-opnames'] })
      qc.invalidateQueries({ queryKey: ['stock-opname'] })
    },
  })
}

export function useCancelStockOpname() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelStockOpname,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-opnames'] })
      qc.invalidateQueries({ queryKey: ['stock-opname'] })
    },
  })
}
