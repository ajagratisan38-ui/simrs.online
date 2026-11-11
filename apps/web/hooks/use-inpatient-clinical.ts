import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/inpatient-clinical'
import type { OrderStatus } from '@/lib/api/inpatient-clinical'

// ==================== INPATIENT LIST ====================

export function useInpatientPatients(filters?: {
  search?: string; roomId?: string; doctorId?: string
}) {
  return useQuery({
    queryKey: ['inpatient-clinical', 'patients', filters],
    queryFn: () => api.listInpatients(filters),
    refetchInterval: 30_000,
  })
}

// ==================== CLINICAL SUMMARY ====================

export function useClinicalSummary(visitId: string | null) {
  return useQuery({
    queryKey: ['inpatient-clinical', 'summary', visitId],
    queryFn: () => api.getClinicalSummary(visitId!),
    enabled: !!visitId,
  })
}

// ==================== VITAL SIGNS ====================

export function useVitalsByVisit(visitId: string | null) {
  return useQuery({
    queryKey: ['inpatient-clinical', 'vitals', visitId],
    queryFn: () => api.getVitalsByVisit(visitId!),
    enabled: !!visitId,
  })
}

export function useVitalsTrend(visitId: string | null) {
  return useQuery({
    queryKey: ['inpatient-clinical', 'vitals-trend', visitId],
    queryFn: () => api.getVitalsTrend(visitId!),
    enabled: !!visitId,
  })
}

export function useLatestVitals(visitId: string | null) {
  return useQuery({
    queryKey: ['inpatient-clinical', 'vitals-latest', visitId],
    queryFn: () => api.getLatestVitals(visitId!),
    enabled: !!visitId,
    refetchInterval: 60_000,
  })
}

export function useRecordVitals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.recordVitals,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'vitals'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'vitals-trend'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'vitals-latest'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'patients'] })
    },
  })
}

export function useDeleteVital() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteVital,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'vitals'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'vitals-trend'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'vitals-latest'] })
    },
  })
}

// ==================== MEDICAL ORDERS ====================

export function useOrders(visitId: string | null, status?: OrderStatus) {
  return useQuery({
    queryKey: ['inpatient-clinical', 'orders', visitId, status],
    queryFn: () => api.listOrders(visitId!, status),
    enabled: !!visitId,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'orders'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'summary'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status, reason }: {
      orderId: string; status: OrderStatus; reason?: string
    }) => api.updateOrderStatus(orderId, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'orders'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'summary'] })
    },
  })
}

export function useExecuteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, catatan }: { orderId: string; catatan?: string }) =>
      api.executeOrder(orderId, catatan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'orders'] })
    },
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'orders'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'summary'] })
    },
  })
}

// ==================== NURSING NOTES ====================

export function useNursingNotes(visitId: string | null) {
  return useQuery({
    queryKey: ['inpatient-clinical', 'nursing-notes', visitId],
    queryFn: () => api.listNursingNotes(visitId!),
    enabled: !!visitId,
  })
}

export function useCreateNursingNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createNursingNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'nursing-notes'] })
    },
  })
}

export function useUpdateNursingNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, ...data }: Parameters<typeof api.updateNursingNote>[1] & { noteId: string }) =>
      api.updateNursingNote(noteId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'nursing-notes'] })
    },
  })
}

export function useFinalizeNursingNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.finalizeNursingNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'nursing-notes'] })
    },
  })
}

export function useDeleteNursingNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteNursingNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'nursing-notes'] })
    },
  })
}

// ==================== DISCHARGE PLANNING ====================

export function useDischargePlan(visitId: string | null, patientId: string | null) {
  return useQuery({
    queryKey: ['inpatient-clinical', 'discharge-plan', visitId],
    queryFn: () => api.getDischargePlan(visitId!, patientId!),
    enabled: !!visitId && !!patientId,
  })
}

export function useUpdateDischargePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, ...data }: Parameters<typeof api.updateDischargePlan>[1] & { planId: string }) =>
      api.updateDischargePlan(planId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'discharge-plan'] })
      qc.invalidateQueries({ queryKey: ['inpatient-clinical', 'summary'] })
    },
  })
}
