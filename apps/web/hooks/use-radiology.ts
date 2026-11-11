import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as radApi from '@/lib/api/radiology'

// --- Examinations ---

export function useExaminationSearch(q: string, modalitas?: string) {
  return useQuery({
    queryKey: ['radiology-examinations', 'search', q, modalitas],
    queryFn: () => radApi.searchExaminations({ q, modalitas }),
    enabled: q.length >= 1,
    staleTime: 60_000,
  })
}

export function useModalities() {
  return useQuery({
    queryKey: ['radiology-examinations', 'modalities'],
    queryFn: radApi.getModalities,
    staleTime: 300_000,
  })
}

// --- Orders ---

export function useRadiologyOrders(params?: {
  page?: number
  limit?: number
  status?: string
  prioritas?: string
  modalitas?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['radiology-orders', params],
    queryFn: () => radApi.listRadiologyOrders(params),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  })
}

export function useRadiologyOrder(id: string) {
  return useQuery({
    queryKey: ['radiology-orders', id],
    queryFn: () => radApi.getRadiologyOrder(id),
    enabled: !!id,
  })
}

export function useRadiologyStats() {
  return useQuery({
    queryKey: ['radiology-stats'],
    queryFn: radApi.getRadiologyStats,
    refetchInterval: 30_000,
  })
}

export function useRadiologyResultsByVisit(visitId: string) {
  return useQuery({
    queryKey: ['radiology-results', 'visit', visitId],
    queryFn: () => radApi.getRadiologyResultsByVisit(visitId),
    enabled: !!visitId,
    staleTime: 10_000,
  })
}

export function usePatientRadiologyHistory(patientId: string) {
  return useQuery({
    queryKey: ['radiology-results', 'patient', patientId],
    queryFn: () => radApi.getPatientRadiologyHistory(patientId),
    enabled: !!patientId,
  })
}

// --- Mutations ---

export function useCreateRadiologyOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: radApi.createRadiologyOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radiology-orders'] })
      qc.invalidateQueries({ queryKey: ['radiology-stats'] })
    },
  })
}

export function useScheduleRadiologyOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, data }: {
      orderId: string
      data: { tanggal_jadwal: string; catatan?: string }
    }) => radApi.scheduleRadiologyOrder(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radiology-orders'] })
      qc.invalidateQueries({ queryKey: ['radiology-stats'] })
    },
  })
}

export function useStartRadiologyProcessing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => radApi.startRadiologyProcessing(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radiology-orders'] })
      qc.invalidateQueries({ queryKey: ['radiology-stats'] })
    },
  })
}

export function useInputRadiologyResults() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, data }: {
      orderId: string
      data: { hasil_bacaan: string; kesan: string }
    }) => radApi.inputRadiologyResults(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radiology-orders'] })
      qc.invalidateQueries({ queryKey: ['radiology-results'] })
      qc.invalidateQueries({ queryKey: ['radiology-stats'] })
    },
  })
}

export function useCancelRadiologyOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => radApi.cancelRadiologyOrder(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['radiology-orders'] })
      qc.invalidateQueries({ queryKey: ['radiology-stats'] })
    },
  })
}
