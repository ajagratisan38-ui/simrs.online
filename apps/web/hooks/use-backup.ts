import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBackupStats,
  listBackups,
  createBackup,
  deleteBackup,
  getBackupSchedule,
  updateBackupSchedule,
  validateRestore,
  getRestoreCommand,
  type UpdateScheduleInput,
} from '@/lib/api/backup'
import { toast } from 'sonner'

export function useBackupStats() {
  return useQuery({
    queryKey: ['backup-stats'],
    queryFn: () => getBackupStats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useBackupList(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ['backup-list', page, limit, status],
    queryFn: () => listBackups(page, limit, status),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useCreateBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type?: 'manual' | 'pre_migration') => createBackup(type),
    onSuccess: (res) => {
      const status = res.data.status
      if (status === 'success') {
        toast.success('Backup berhasil dibuat')
      } else if (status === 'failed') {
        toast.error(`Backup gagal: ${res.data.error_message || 'Unknown error'}`)
      } else {
        toast.info('Backup sedang berjalan...')
      }
      qc.invalidateQueries({ queryKey: ['backup-list'] })
      qc.invalidateQueries({ queryKey: ['backup-stats'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal membuat backup: ${err.message}`)
    },
  })
}

export function useDeleteBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBackup(id),
    onSuccess: () => {
      toast.success('Backup berhasil dihapus')
      qc.invalidateQueries({ queryKey: ['backup-list'] })
      qc.invalidateQueries({ queryKey: ['backup-stats'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal menghapus: ${err.message}`)
    },
  })
}

export function useBackupSchedule() {
  return useQuery({
    queryKey: ['backup-schedule'],
    queryFn: () => getBackupSchedule(),
    staleTime: 60_000,
  })
}

export function useUpdateBackupSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateScheduleInput) => updateBackupSchedule(input),
    onSuccess: () => {
      toast.success('Jadwal backup berhasil diperbarui')
      qc.invalidateQueries({ queryKey: ['backup-schedule'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal update jadwal: ${err.message}`)
    },
  })
}

export function useValidateRestore(id: string) {
  return useQuery({
    queryKey: ['backup-validate', id],
    queryFn: () => validateRestore(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useRestoreCommand(id: string) {
  return useQuery({
    queryKey: ['backup-restore-cmd', id],
    queryFn: () => getRestoreCommand(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}
