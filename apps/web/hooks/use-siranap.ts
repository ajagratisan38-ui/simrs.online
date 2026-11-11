import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSiranapConfig,
  updateSiranapConfig,
  testSiranapConnection,
  getSiranapBedData,
  sendSiranapNow,
  getSiranapStats,
  listSiranapSubmissions,
  type SiranapConfig,
} from '@/lib/api/siranap'

export function useSiranapConfig() {
  return useQuery({
    queryKey: ['siranap', 'config'],
    queryFn: async () => {
      const res = await getSiranapConfig()
      return res.data
    },
    staleTime: 60_000,
  })
}

export function useUpdateSiranapConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SiranapConfig>) => updateSiranapConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siranap', 'config'] })
    },
  })
}

export function useTestSiranapConnection() {
  return useMutation({
    mutationFn: () => testSiranapConnection(),
  })
}

export function useSiranapBedData() {
  return useQuery({
    queryKey: ['siranap', 'bed-data'],
    queryFn: async () => {
      const res = await getSiranapBedData()
      return res.data
    },
    refetchInterval: 60_000,
  })
}

export function useSendSiranap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => sendSiranapNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siranap', 'stats'] })
      qc.invalidateQueries({ queryKey: ['siranap', 'submissions'] })
    },
  })
}

export function useSiranapStats() {
  return useQuery({
    queryKey: ['siranap', 'stats'],
    queryFn: async () => {
      const res = await getSiranapStats()
      return res.data
    },
    refetchInterval: 60_000,
  })
}

export function useSiranapSubmissions(
  limit = 20,
  offset = 0,
  status?: string,
  days?: number,
) {
  return useQuery({
    queryKey: ['siranap', 'submissions', { limit, offset, status, days }],
    queryFn: async () => {
      const res = await listSiranapSubmissions(limit, offset, status, days)
      return { data: res.data, total: res.total }
    },
    refetchInterval: 30_000,
  })
}
