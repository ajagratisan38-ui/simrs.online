import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  checkPrescription,
  checkDrug,
  checkInteraction,
  getHighAlertDrugs,
  setHighAlert,
  getLasaDrugs,
  setLasa,
  detectLasaPairs,
  searchInteractions,
  addInteraction,
  updateInteraction,
  deleteInteraction,
  getInteractionStats,
  overrideAlert,
  getAlertsByVisit,
  getAlertStats,
} from '@/lib/api/cdss'
import { toast } from 'sonner'

// ── Prescription check ──

export function useCheckPrescription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { drugIds: string[]; visitId?: string; patientId?: string }) =>
      checkPrescription(data.drugIds, data.visitId, data.patientId),
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── Single drug check ──

export function useCheckDrug(drugId: string | undefined) {
  return useQuery({
    queryKey: ['cdss', 'check-drug', drugId],
    queryFn: () => checkDrug(drugId!),
    enabled: !!drugId,
    staleTime: 60_000,
  })
}

// ── Interaction check ──

export function useCheckInteraction(drugAId?: string, drugBId?: string) {
  return useQuery({
    queryKey: ['cdss', 'interaction', drugAId, drugBId],
    queryFn: () => checkInteraction(drugAId!, drugBId!),
    enabled: !!drugAId && !!drugBId,
    staleTime: 60_000,
  })
}

// ── High-alert drugs ──

export function useHighAlertDrugs() {
  return useQuery({
    queryKey: ['cdss', 'high-alert'],
    queryFn: getHighAlertDrugs,
    staleTime: 30_000,
  })
}

export function useSetHighAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      drugId: string
      is_high_alert: boolean
      high_alert_category?: string | null
      special_instructions?: string | null
    }) => setHighAlert(data.drugId, {
      is_high_alert: data.is_high_alert,
      high_alert_category: data.high_alert_category,
      special_instructions: data.special_instructions,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdss', 'high-alert'] })
      queryClient.invalidateQueries({ queryKey: ['drugs'] })
      toast.success('Status high-alert berhasil diperbarui')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── LASA / NORUM ──

export function useLasaDrugs() {
  return useQuery({
    queryKey: ['cdss', 'lasa'],
    queryFn: getLasaDrugs,
    staleTime: 30_000,
  })
}

export function useSetLasa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      drugId: string
      is_lasa: boolean
      is_norum?: boolean
      lasa_pairs?: string[]
    }) => setLasa(data.drugId, {
      is_lasa: data.is_lasa,
      is_norum: data.is_norum,
      lasa_pairs: data.lasa_pairs,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdss', 'lasa'] })
      queryClient.invalidateQueries({ queryKey: ['drugs'] })
      toast.success('Status LASA/NORUM berhasil diperbarui')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDetectLasaPairs() {
  return useQuery({
    queryKey: ['cdss', 'lasa', 'detect'],
    queryFn: detectLasaPairs,
    enabled: false, // manual trigger only
    staleTime: 0,
  })
}

// ── Interactions database ──

export function useSearchInteractions(q?: string, severity?: string) {
  return useQuery({
    queryKey: ['cdss', 'interactions', q, severity],
    queryFn: () => searchInteractions(q, severity),
    staleTime: 30_000,
  })
}

export function useAddInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addInteraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdss', 'interactions'] })
      toast.success('Interaksi obat berhasil ditambahkan')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; updates: Record<string, unknown> }) =>
      updateInteraction(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdss', 'interactions'] })
      toast.success('Interaksi obat berhasil diperbarui')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteInteraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdss', 'interactions'] })
      toast.success('Interaksi obat berhasil dihapus')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useInteractionStats() {
  return useQuery({
    queryKey: ['cdss', 'interactions', 'stats'],
    queryFn: getInteractionStats,
    staleTime: 60_000,
  })
}

// ── Alert management ──

export function useOverrideAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { alertId: string; reason: string }) =>
      overrideAlert(data.alertId, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdss', 'alerts'] })
      toast.success('Alert berhasil di-override')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAlertsByVisit(visitId?: string) {
  return useQuery({
    queryKey: ['cdss', 'alerts', 'visit', visitId],
    queryFn: () => getAlertsByVisit(visitId!),
    enabled: !!visitId,
    staleTime: 30_000,
  })
}

export function useAlertStats(from?: string, to?: string) {
  return useQuery({
    queryKey: ['cdss', 'alerts', 'stats', from, to],
    queryFn: () => getAlertStats(from, to),
    staleTime: 60_000,
  })
}
