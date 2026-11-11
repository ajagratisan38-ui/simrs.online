import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSirsConfig,
  updateSirsConfig,
  testSirsConnection,
  generateRL,
  generateAllRL,
  getIndikator,
  sendSirsToKemenkes,
  listSirsSubmissions,
  getSirsSubmissionStats,
  type SirsConfig,
} from '@/lib/api/sirs-online'

export function useSirsConfig() {
  return useQuery({
    queryKey: ['sirs', 'config'],
    queryFn: async () => {
      const res = await getSirsConfig()
      return res.data
    },
    staleTime: 60_000,
  })
}

export function useUpdateSirsConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SirsConfig>) => updateSirsConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sirs', 'config'] })
    },
  })
}

export function useTestSirsConnection() {
  return useMutation({
    mutationFn: () => testSirsConnection(),
  })
}

export function useGenerateRL(rlType: string, tahun?: number, bulan?: number) {
  return useQuery({
    queryKey: ['sirs', 'rl', rlType, tahun, bulan],
    queryFn: async () => {
      const res = await generateRL(rlType, tahun, bulan)
      return res.data
    },
    enabled: !!rlType && (rlType === 'rl13' || (!!tahun && !!bulan)),
    staleTime: 5 * 60_000,
  })
}

export function useGenerateAllRL(tahun: number, bulan: number) {
  return useQuery({
    queryKey: ['sirs', 'all', tahun, bulan],
    queryFn: async () => {
      const res = await generateAllRL(tahun, bulan)
      return res.data
    },
    enabled: !!tahun && !!bulan,
    staleTime: 5 * 60_000,
  })
}

export function useIndikator(tahun: number, bulan: number) {
  return useQuery({
    queryKey: ['sirs', 'indikator', tahun, bulan],
    queryFn: async () => {
      const res = await getIndikator(tahun, bulan)
      return res.data
    },
    enabled: !!tahun && !!bulan,
    staleTime: 5 * 60_000,
  })
}

export function useSendSirsToKemenkes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rl_type, periode }: { rl_type: string; periode: string }) =>
      sendSirsToKemenkes(rl_type, periode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sirs', 'submissions'] })
    },
  })
}

export function useSirsSubmissions(
  limit = 20,
  offset = 0,
  rl_type?: string,
  status?: string,
) {
  return useQuery({
    queryKey: ['sirs', 'submissions', { limit, offset, rl_type, status }],
    queryFn: async () => {
      const res = await listSirsSubmissions(limit, offset, rl_type, status)
      return { data: res.data, total: res.total }
    },
    refetchInterval: 30_000,
  })
}

export function useSirsSubmissionStats() {
  return useQuery({
    queryKey: ['sirs', 'submissions', 'stats'],
    queryFn: async () => {
      const res = await getSirsSubmissionStats()
      return res.data
    },
    refetchInterval: 60_000,
  })
}
