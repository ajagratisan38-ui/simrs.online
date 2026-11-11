import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTenantProfile,
  updateTenantProfile,
  UpdateTenantInput,
} from '@/lib/api/tenant'

export function useTenantProfile() {
  return useQuery({
    queryKey: ['tenant-profile'],
    queryFn: getTenantProfile,
    staleTime: 60_000,
  })
}

export function useUpdateTenantProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateTenantInput) => updateTenantProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] })
    },
  })
}
