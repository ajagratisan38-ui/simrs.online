import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as labApi from '@/lib/api/laboratory'

// --- Lab Parameters ---

export function useLabParameterSearch(q: string, kategori?: string) {
  return useQuery({
    queryKey: ['lab-parameters', 'search', q, kategori],
    queryFn: () => labApi.searchLabParameters({ q, kategori }),
    enabled: q.length >= 1,
    staleTime: 60_000,
  })
}

export function useLabCategories() {
  return useQuery({
    queryKey: ['lab-parameters', 'categories'],
    queryFn: labApi.getLabCategories,
    staleTime: 300_000,
  })
}

// --- Lab Orders ---

export function useLabOrders(params?: {
  page?: number
  limit?: number
  status?: string
  prioritas?: string
  search?: string
  tanggal_dari?: string
  tanggal_sampai?: string
}) {
  return useQuery({
    queryKey: ['lab-orders', params],
    queryFn: () => labApi.listLabOrders(params),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  })
}

export function useLabOrder(id: string) {
  return useQuery({
    queryKey: ['lab-orders', id],
    queryFn: () => labApi.getLabOrder(id),
    enabled: !!id,
  })
}

export function useLabStats() {
  return useQuery({
    queryKey: ['lab-stats'],
    queryFn: labApi.getLabStats,
    refetchInterval: 30_000,
  })
}

export function useLabResultsByVisit(visitId: string) {
  return useQuery({
    queryKey: ['lab-results', 'visit', visitId],
    queryFn: () => labApi.getLabResultsByVisit(visitId),
    enabled: !!visitId,
    staleTime: 10_000,
  })
}

export function usePatientLabHistory(patientId: string) {
  return useQuery({
    queryKey: ['lab-results', 'patient', patientId],
    queryFn: () => labApi.getPatientLabHistory(patientId),
    enabled: !!patientId,
  })
}

// --- Mutations ---

export function useCreateLabOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: labApi.createLabOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] })
    },
  })
}

export function useReceiveSample() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, catatan }: { orderId: string; catatan?: string }) =>
      labApi.receiveSample(orderId, catatan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] })
    },
  })
}

export function useStartProcessing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => labApi.startProcessing(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] })
    },
  })
}

export function useInputLabResults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, results }: {
      orderId: string
      results: Array<{
        item_id: string
        hasil: string
        keterangan?: string
        flag?: 'normal' | 'rendah' | 'tinggi' | 'kritis'
      }>
    }) => labApi.inputLabResults(orderId, results),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      queryClient.invalidateQueries({ queryKey: ['lab-results'] })
    },
  })
}

export function useFinalizeLabOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => labApi.finalizeLabOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      queryClient.invalidateQueries({ queryKey: ['lab-results'] })
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] })
    },
  })
}

export function useCancelLabOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => labApi.cancelLabOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      queryClient.invalidateQueries({ queryKey: ['lab-stats'] })
    },
  })
}
