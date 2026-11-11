import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  testKhanzaConnection,
  analyzeKhanza,
  startMigration,
  getMigrationProgress,
  verifyMigration,
  KhanzaConnectionConfig,
} from '@/lib/api/migration'

export function useTestConnection() {
  return useMutation({
    mutationFn: (config: KhanzaConnectionConfig) => testKhanzaConnection(config),
  })
}

export function useAnalyzeKhanza() {
  return useMutation({
    mutationFn: (config: KhanzaConnectionConfig) => analyzeKhanza(config),
  })
}

export function useStartMigration() {
  return useMutation({
    mutationFn: ({
      config,
      dryRun,
    }: {
      config: KhanzaConnectionConfig
      dryRun: boolean
    }) => startMigration(config, dryRun),
  })
}

export function useMigrationProgress(sessionId: string | null) {
  return useQuery({
    queryKey: ['migration-progress', sessionId],
    queryFn: () => getMigrationProgress(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 2000
      if (data.status === 'done' || data.status === 'error') return false
      return 1500
    },
  })
}

export function useVerifyMigration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: KhanzaConnectionConfig) => verifyMigration(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-progress'] })
    },
  })
}
