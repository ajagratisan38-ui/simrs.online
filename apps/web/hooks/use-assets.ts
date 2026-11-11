import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as assetApi from '../lib/api/assets'

export function useAssets(filters?: Parameters<typeof assetApi.listAssets>[0]) {
  return useQuery({
    queryKey: ['assets', filters],
    queryFn: () => assetApi.listAssets(filters),
  })
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetApi.getAsset(id!),
    enabled: !!id,
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetApi.createAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<assetApi.Asset> }) =>
      assetApi.updateAsset(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['asset'] })
    },
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetApi.deleteAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useAssetStats() {
  return useQuery({
    queryKey: ['asset-stats'],
    queryFn: assetApi.getAssetStats,
    staleTime: 60_000,
  })
}

export function useDepreciationReport(tahun?: number) {
  return useQuery({
    queryKey: ['asset-depreciation', tahun],
    queryFn: () => assetApi.getDepreciationReport(tahun),
  })
}

export function useAssetLocations() {
  return useQuery({
    queryKey: ['asset-locations'],
    queryFn: assetApi.getAssetLocations,
    staleTime: 300_000,
  })
}

export function useGenerateAssetKode(kategori: string) {
  return useQuery({
    queryKey: ['asset-kode', kategori],
    queryFn: () => assetApi.generateAssetKode(kategori),
    enabled: !!kategori,
  })
}

export function useAddMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetApi.addMaintenance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset'] })
      qc.invalidateQueries({ queryKey: ['asset-maintenances'] })
      qc.invalidateQueries({ queryKey: ['asset-stats'] })
    },
  })
}

export function useMaintenances(filters?: Parameters<typeof assetApi.listMaintenances>[0]) {
  return useQuery({
    queryKey: ['asset-maintenances', filters],
    queryFn: () => assetApi.listMaintenances(filters),
  })
}

export function useDeleteMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetApi.deleteMaintenance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset'] })
      qc.invalidateQueries({ queryKey: ['asset-maintenances'] })
    },
  })
}

export function useAddMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assetApi.addMutation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['asset'] })
      qc.invalidateQueries({ queryKey: ['asset-mutations'] })
      qc.invalidateQueries({ queryKey: ['asset-stats'] })
    },
  })
}

export function useMutations(filters?: Parameters<typeof assetApi.listMutations>[0]) {
  return useQuery({
    queryKey: ['asset-mutations', filters],
    queryFn: () => assetApi.listMutations(filters),
  })
}
