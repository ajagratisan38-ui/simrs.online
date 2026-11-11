import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getIGDBoard,
  getIGDStats,
  setTriage,
  setResponseTime,
  setDisposition,
  quickRegisterIGD,
  type QuickRegisterInput,
} from '@/lib/api/igd'
import { toast } from 'sonner'

export function useIGDBoard(date?: string) {
  return useQuery({
    queryKey: ['igd-board', date],
    queryFn: () => getIGDBoard(date),
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useIGDStats() {
  return useQuery({
    queryKey: ['igd-stats'],
    queryFn: () => getIGDStats(),
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useSetTriage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ visitId, triageLevel, igdBedNumber }: {
      visitId: string; triageLevel: string; igdBedNumber?: string
    }) => setTriage(visitId, triageLevel, igdBedNumber),
    onSuccess: () => {
      toast.success('Triage berhasil disimpan')
      qc.invalidateQueries({ queryKey: ['igd-board'] })
      qc.invalidateQueries({ queryKey: ['igd-stats'] })
    },
    onError: (err: Error) => toast.error(`Gagal set triage: ${err.message}`),
  })
}

export function useSetResponseTime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (visitId: string) => setResponseTime(visitId),
    onSuccess: () => {
      toast.success('Response time dicatat')
      qc.invalidateQueries({ queryKey: ['igd-board'] })
      qc.invalidateQueries({ queryKey: ['igd-stats'] })
    },
    onError: (err: Error) => toast.error(`Gagal: ${err.message}`),
  })
}

export function useSetDisposition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ visitId, disposition, notes }: {
      visitId: string; disposition: string; notes?: string
    }) => setDisposition(visitId, disposition, notes),
    onSuccess: () => {
      toast.success('Disposisi berhasil disimpan')
      qc.invalidateQueries({ queryKey: ['igd-board'] })
      qc.invalidateQueries({ queryKey: ['igd-stats'] })
    },
    onError: (err: Error) => toast.error(`Gagal: ${err.message}`),
  })
}

export function useQuickRegisterIGD() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: QuickRegisterInput) => quickRegisterIGD(input),
    onSuccess: () => {
      toast.success('Pasien IGD berhasil didaftarkan')
      qc.invalidateQueries({ queryKey: ['igd-board'] })
      qc.invalidateQueries({ queryKey: ['igd-stats'] })
    },
    onError: (err: Error) => toast.error(`Pendaftaran gagal: ${err.message}`),
  })
}
