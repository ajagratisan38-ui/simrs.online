import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listDrugs,
  getDrug,
  searchDrugs,
  createDrug,
  updateDrug,
  deleteDrug,
  addStock,
  adjustStock,
  getStockHistory,
  getExpiringDrugs,
  getLowStockDrugs,
  getPendingDispensing,
  dispenseprescription,
  type DrugFilters,
  type DispenseInput,
} from '@/lib/api/pharmacy'

// --- Drug hooks ---

export function useDrugs(filters: DrugFilters = {}) {
  return useQuery({
    queryKey: ['drugs', filters],
    queryFn: () => listDrugs(filters),
    staleTime: 30_000,
  })
}

export function useDrugDetail(id: string) {
  return useQuery({
    queryKey: ['drug', id],
    queryFn: () => getDrug(id),
    enabled: !!id,
  })
}

export function useDrugSearch(query: string) {
  return useQuery({
    queryKey: ['drug-search', query],
    queryFn: () => searchDrugs(query),
    enabled: query.length >= 1,
    staleTime: 30_000,
  })
}

export function useCreateDrug() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createDrug(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drugs'] })
    },
  })
}

export function useUpdateDrug() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateDrug(id, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['drugs'] })
      qc.invalidateQueries({ queryKey: ['drug', vars.id] })
    },
  })
}

export function useDeleteDrug() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDrug(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['drugs'] })
    },
  })
}

// --- Stock hooks ---

export function useAddStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      drugId,
      data,
    }: {
      drugId: string
      data: Record<string, unknown>
    }) => addStock(drugId, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['drugs'] })
      qc.invalidateQueries({ queryKey: ['drug', vars.drugId] })
      qc.invalidateQueries({ queryKey: ['stock-history', vars.drugId] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
    },
  })
}

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      drugId,
      data,
    }: {
      drugId: string
      data: Record<string, unknown>
    }) => adjustStock(drugId, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['drugs'] })
      qc.invalidateQueries({ queryKey: ['drug', vars.drugId] })
      qc.invalidateQueries({ queryKey: ['stock-history', vars.drugId] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
    },
  })
}

export function useStockHistory(drugId: string) {
  return useQuery({
    queryKey: ['stock-history', drugId],
    queryFn: () => getStockHistory(drugId),
    enabled: !!drugId,
  })
}

// --- Alert hooks ---

export function useExpiringDrugs(days = 90) {
  return useQuery({
    queryKey: ['expiring-drugs', days],
    queryFn: () => getExpiringDrugs(days),
    staleTime: 60_000,
  })
}

export function useLowStockDrugs() {
  return useQuery({
    queryKey: ['low-stock'],
    queryFn: () => getLowStockDrugs(),
    staleTime: 60_000,
  })
}

// --- Dispensing hooks ---

export function usePendingDispensing() {
  return useQuery({
    queryKey: ['pending-dispensing'],
    queryFn: () => getPendingDispensing(),
    refetchInterval: 15_000,
  })
}

export function useDispense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      prescriptionId,
      data,
    }: {
      prescriptionId: string
      data: DispenseInput
    }) => dispenseprescription(prescriptionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-dispensing'] })
      qc.invalidateQueries({ queryKey: ['drugs'] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      qc.invalidateQueries({ queryKey: ['expiring-drugs'] })
    },
  })
}
