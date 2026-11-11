import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as terminologyApi from '@/lib/api/terminology'

// ===== LOINC =====

export function useLoincSearch(q: string, kategori?: string) {
  return useQuery({
    queryKey: ['loinc', 'search', q, kategori],
    queryFn: () => terminologyApi.searchLoinc({ q, kategori }),
    enabled: q.length >= 1,
    staleTime: 60_000,
  })
}

export function useLoincByCode(code: string) {
  return useQuery({
    queryKey: ['loinc', code],
    queryFn: () => terminologyApi.getLoincByCode(code),
    enabled: !!code,
    staleTime: 300_000,
  })
}

export function useLoincCategories() {
  return useQuery({
    queryKey: ['loinc', 'categories'],
    queryFn: terminologyApi.getLoincCategories,
    staleTime: 300_000,
  })
}

export function useLoincStats() {
  return useQuery({
    queryKey: ['loinc', 'stats'],
    queryFn: terminologyApi.getLoincStats,
    staleTime: 60_000,
  })
}

// ===== KFA =====

export function useKfaSearch(q: string, kategori?: string, golongan?: string) {
  return useQuery({
    queryKey: ['kfa', 'search', q, kategori, golongan],
    queryFn: () => terminologyApi.searchKfa({ q, kategori, golongan }),
    enabled: q.length >= 1,
    staleTime: 60_000,
  })
}

export function useKfaByCode(code: string) {
  return useQuery({
    queryKey: ['kfa', code],
    queryFn: () => terminologyApi.getKfaByCode(code),
    enabled: !!code,
    staleTime: 300_000,
  })
}

export function useKfaCategories() {
  return useQuery({
    queryKey: ['kfa', 'categories'],
    queryFn: terminologyApi.getKfaCategories,
    staleTime: 300_000,
  })
}

export function useKfaGolongan() {
  return useQuery({
    queryKey: ['kfa', 'golongan'],
    queryFn: terminologyApi.getKfaGolongan,
    staleTime: 300_000,
  })
}

export function useKfaStats() {
  return useQuery({
    queryKey: ['kfa', 'stats'],
    queryFn: terminologyApi.getKfaStats,
    staleTime: 60_000,
  })
}

// ===== Mapping =====

export function useUnmappedLabParams() {
  return useQuery({
    queryKey: ['terminology', 'unmapped', 'lab'],
    queryFn: terminologyApi.getUnmappedLabParams,
    staleTime: 30_000,
  })
}

export function useUnmappedDrugs() {
  return useQuery({
    queryKey: ['terminology', 'unmapped', 'drugs'],
    queryFn: terminologyApi.getUnmappedDrugs,
    staleTime: 30_000,
  })
}

export function useMapLabToLoinc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ labKode, loincCode }: { labKode: string; loincCode: string }) =>
      terminologyApi.mapLabToLoinc(labKode, loincCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminology', 'unmapped', 'lab'] })
    },
  })
}

export function useMapDrugToKfa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ drugId, kfaCode }: { drugId: string; kfaCode: string }) =>
      terminologyApi.mapDrugToKfa(drugId, kfaCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminology', 'unmapped', 'drugs'] })
    },
  })
}

export function useAutoMapDrugs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: terminologyApi.autoMapDrugs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminology', 'unmapped', 'drugs'] })
    },
  })
}
