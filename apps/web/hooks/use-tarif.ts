import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listTarif, getTarifById, createTarif, updateTarif,
  deleteTarif, toggleTarifActive, getTarifStats,
  type CreateTarifInput, type UpdateTarifInput,
} from '@/lib/api/tarif'

export function useTarifList(filters?: {
  kategori?: string
  search?: string
  is_active?: string
}) {
  return useQuery({
    queryKey: ['tarif', filters],
    queryFn: () => listTarif(filters),
    staleTime: 30_000,
  })
}

export function useTarifById(id: string | null) {
  return useQuery({
    queryKey: ['tarif', id],
    queryFn: () => getTarifById(id!),
    enabled: !!id,
  })
}

export function useTarifStats() {
  return useQuery({
    queryKey: ['tarif', 'stats'],
    queryFn: getTarifStats,
    staleTime: 60_000,
  })
}

export function useCreateTarif() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTarifInput) => createTarif(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarif'] })
    },
  })
}

export function useUpdateTarif() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTarifInput }) =>
      updateTarif(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarif'] })
    },
  })
}

export function useDeleteTarif() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTarif(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarif'] })
    },
  })
}

export function useToggleTarif() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleTarifActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarif'] })
    },
  })
}
