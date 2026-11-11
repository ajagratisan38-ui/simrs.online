import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  syncVisit,
  getSyncStatus,
  getPendingVisits,
  retrySync,
  getSatusehatConfig,
  updateSatusehatConfig,
  testSatusehatConnection,
  getSyncHistory,
  getSyncStats,
  createFhirResource,
  getFhirResource,
  type UpdateSatusehatConfigInput,
} from '@/lib/api/satusehat'
import { toast } from 'sonner'

export function useSatusehatConfig() {
  return useQuery({
    queryKey: ['satusehat-config'],
    queryFn: () => getSatusehatConfig(),
    staleTime: 60_000,
  })
}

export function useUpdateSatusehatConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateSatusehatConfigInput) => updateSatusehatConfig(input),
    onSuccess: () => {
      toast.success('Konfigurasi SATUSEHAT berhasil disimpan')
      qc.invalidateQueries({ queryKey: ['satusehat-config'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal menyimpan konfigurasi: ${err.message}`)
    },
  })
}

export function useTestSatusehatConnection() {
  return useMutation({
    mutationFn: () => testSatusehatConnection(),
    onError: (err: Error) => {
      toast.error(`Test koneksi gagal: ${err.message}`)
    },
  })
}

export function useSatusehatStatus(visitId: string | undefined) {
  return useQuery({
    queryKey: ['satusehat-status', visitId],
    queryFn: () => getSyncStatus(visitId!),
    enabled: !!visitId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useSatusehatPending(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['satusehat-pending', page, limit],
    queryFn: () => getPendingVisits(page, limit),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useSatusehatSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (visitId: string) => syncVisit(visitId),
    onSuccess: (_data, visitId) => {
      toast.success('SATUSEHAT sync berhasil')
      qc.invalidateQueries({ queryKey: ['satusehat-status', visitId] })
      qc.invalidateQueries({ queryKey: ['satusehat-pending'] })
    },
    onError: (err: Error) => {
      toast.error(`SATUSEHAT sync gagal: ${err.message}`)
    },
  })
}

export function useSatusehatRetry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (visitId: string) => retrySync(visitId),
    onSuccess: (_data, visitId) => {
      toast.success('Retry sync berhasil')
      qc.invalidateQueries({ queryKey: ['satusehat-status', visitId] })
      qc.invalidateQueries({ queryKey: ['satusehat-pending'] })
      qc.invalidateQueries({ queryKey: ['satusehat-history'] })
      qc.invalidateQueries({ queryKey: ['satusehat-stats'] })
    },
    onError: (err: Error) => {
      toast.error(`Retry gagal: ${err.message}`)
    },
  })
}

export function useSatusehatHistory(params: {
  page?: number
  limit?: number
  status?: string
  from?: string
  to?: string
}) {
  return useQuery({
    queryKey: ['satusehat-history', params],
    queryFn: () => getSyncHistory(params),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useSatusehatStats(days = 30) {
  return useQuery({
    queryKey: ['satusehat-stats', days],
    queryFn: () => getSyncStats(days),
    staleTime: 60_000,
  })
}

export function useCreateFhirResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ resourceType, body }: {
      resourceType: string
      body: Record<string, unknown>
    }) => createFhirResource(resourceType, body),
    onSuccess: (_data, vars) => {
      toast.success(`FHIR ${vars.resourceType} berhasil dibuat`)
      qc.invalidateQueries({ queryKey: ['satusehat-stats'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal membuat FHIR resource: ${err.message}`)
    },
  })
}

export function useFhirResource(resourceType: string, resourceId: string) {
  return useQuery({
    queryKey: ['fhir-resource', resourceType, resourceId],
    queryFn: () => getFhirResource(resourceType, resourceId),
    enabled: !!resourceType && !!resourceId,
    staleTime: 60_000,
  })
}
