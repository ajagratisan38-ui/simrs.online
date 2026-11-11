import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as rehabApi from '@/lib/api/rehabilitation'

// ── Stats ──

export function useRehabStats() {
  return useQuery({
    queryKey: ['rehab-stats'],
    queryFn: rehabApi.getRehabStats,
    refetchInterval: 30_000,
  })
}

// ── Orders ──

export function useRehabOrders(params?: {
  page?: number
  limit?: number
  status?: string
  therapy_type?: string
  patient_id?: string
  practitioner_id?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['rehab-orders', params],
    queryFn: () => rehabApi.listRehabOrders(params),
    placeholderData: (prev) => prev,
    refetchInterval: 15_000,
  })
}

export function useRehabOrder(id: string) {
  return useQuery({
    queryKey: ['rehab-orders', id],
    queryFn: () => rehabApi.getRehabOrder(id),
    enabled: !!id,
  })
}

export function usePatientRehabHistory(patientId: string) {
  return useQuery({
    queryKey: ['rehab-history', patientId],
    queryFn: () => rehabApi.getPatientRehabHistory(patientId),
    enabled: !!patientId,
  })
}

export function useCreateRehabOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: rehabApi.createRehabOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rehab-orders'] })
      qc.invalidateQueries({ queryKey: ['rehab-stats'] })
    },
  })
}

export function useUpdateRehabStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status: string; cancelled_reason?: string; catatan_terapis?: string; practitioner_id?: string }) =>
      rehabApi.updateRehabOrderStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rehab-orders'] })
      qc.invalidateQueries({ queryKey: ['rehab-stats'] })
    },
  })
}

export function useAssignPractitioner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, practitionerId }: { orderId: string; practitionerId: string }) =>
      rehabApi.assignPractitioner(orderId, practitionerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rehab-orders'] })
    },
  })
}

// ── Sessions ──

export function useAddRehabSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, ...data }: {
      orderId: string
      tanggal: string
      waktu_mulai?: string
      waktu_selesai?: string
      practitioner_id?: string
      tindakan?: string
      hasil?: string
      catatan_progress?: string
      skala_nyeri_sebelum?: number
      skala_nyeri_sesudah?: number
      rom_sebelum?: string
      rom_sesudah?: string
    }) => rehabApi.addRehabSession(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rehab-orders'] })
      qc.invalidateQueries({ queryKey: ['rehab-stats'] })
      qc.invalidateQueries({ queryKey: ['rehab-fees'] })
    },
  })
}

export function useUpdateRehabSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, ...data }: { sessionId: string } & Record<string, unknown>) =>
      rehabApi.updateRehabSession(sessionId, data as Parameters<typeof rehabApi.updateRehabSession>[1]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rehab-orders'] })
    },
  })
}

export function useDeleteRehabSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => rehabApi.deleteRehabSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rehab-orders'] })
      qc.invalidateQueries({ queryKey: ['rehab-stats'] })
      qc.invalidateQueries({ queryKey: ['rehab-fees'] })
    },
  })
}

// ── Fees ──

export function useOrderFees(orderId: string) {
  return useQuery({
    queryKey: ['rehab-fees', 'order', orderId],
    queryFn: () => rehabApi.getOrderFees(orderId),
    enabled: !!orderId,
  })
}

export function usePractitionerEarnings(
  practitionerId: string,
  params?: { start?: string; end?: string },
) {
  return useQuery({
    queryKey: ['rehab-fees', 'practitioner', practitionerId, params],
    queryFn: () => rehabApi.getPractitionerEarnings(practitionerId, params),
    enabled: !!practitionerId,
  })
}

export function useFeeSummary(params?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['rehab-fees', 'summary', params],
    queryFn: () => rehabApi.getFeeSummary(params),
    refetchInterval: 60_000,
  })
}

// ── Practitioners ──

export function usePractitionerList(params?: {
  page?: number
  limit?: number
  profesi?: string
  status?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['practitioners', params],
    queryFn: () => rehabApi.listPractitioners(params),
    placeholderData: (prev) => prev,
  })
}

export function usePractitionerDropdown(profesi?: string) {
  return useQuery({
    queryKey: ['practitioners', 'dropdown', profesi],
    queryFn: () => rehabApi.getPractitionerDropdown(profesi),
    staleTime: 120_000,
  })
}

export function usePractitionerStats() {
  return useQuery({
    queryKey: ['practitioners', 'stats'],
    queryFn: rehabApi.getPractitionerStats,
    refetchInterval: 60_000,
  })
}

export function useCreatePractitioner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: rehabApi.createPractitioner,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practitioners'] })
    },
  })
}

export function useUpdatePractitioner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      rehabApi.updatePractitioner(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practitioners'] })
    },
  })
}

export function useDeletePractitioner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rehabApi.deletePractitioner(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practitioners'] })
    },
  })
}
