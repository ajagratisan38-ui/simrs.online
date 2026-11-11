import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAuditLogs,
  cleanupAuditLogs,
  type AuditFilters,
} from '@/lib/api/audit'

export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => getAuditLogs(filters),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useCleanupAuditLogs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cleanupAuditLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })
}
