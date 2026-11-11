import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMcuStats, listMcuPackages, createMcuPackage, updateMcuPackage, toggleMcuPackage, deleteMcuPackage,
  registerMcu, listMcuRegistrations, getMcuRegistration, startMcu,
  inputExamResult, concludeMcu, cancelMcu, getMcuCertificate,
} from '@/lib/api/mcu'

export function useMcuStats() {
  return useQuery({ queryKey: ['mcu-stats'], queryFn: getMcuStats, staleTime: 30_000 })
}

export function useMcuPackages() {
  return useQuery({ queryKey: ['mcu-packages'], queryFn: listMcuPackages, staleTime: 60_000 })
}

export function useCreateMcuPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMcuPackage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mcu-packages'] }),
  })
}

export function useUpdateMcuPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateMcuPackage(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mcu-packages'] }),
  })
}

export function useToggleMcuPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleMcuPackage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mcu-packages'] }),
  })
}

export function useDeleteMcuPackage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMcuPackage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mcu-packages'] }),
  })
}

export function useRegisterMcu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: registerMcu,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mcu-registrations'] })
      qc.invalidateQueries({ queryKey: ['mcu-stats'] })
    },
  })
}

export function useMcuRegistrations(params: Record<string, string>) {
  return useQuery({
    queryKey: ['mcu-registrations', params],
    queryFn: () => listMcuRegistrations(params),
    staleTime: 15_000,
  })
}

export function useMcuRegistration(id: string) {
  return useQuery({
    queryKey: ['mcu-registration', id],
    queryFn: () => getMcuRegistration(id),
    enabled: !!id,
  })
}

export function useStartMcu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => startMcu(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['mcu-registration', id] })
      qc.invalidateQueries({ queryKey: ['mcu-registrations'] })
    },
  })
}

export function useInputExamResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, data }: { examId: string; data: Record<string, unknown> }) =>
      inputExamResult(examId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mcu-registration'] })
    },
  })
}

export function useConcludeMcu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { conclusion: string; conclusion_notes?: string } }) =>
      concludeMcu(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['mcu-registration', vars.id] })
      qc.invalidateQueries({ queryKey: ['mcu-registrations'] })
      qc.invalidateQueries({ queryKey: ['mcu-stats'] })
    },
  })
}

export function useCancelMcu() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelMcu(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['mcu-registration', id] })
      qc.invalidateQueries({ queryKey: ['mcu-registrations'] })
      qc.invalidateQueries({ queryKey: ['mcu-stats'] })
    },
  })
}

export function useMcuCertificate(id: string) {
  return useQuery({
    queryKey: ['mcu-certificate', id],
    queryFn: () => getMcuCertificate(id),
    enabled: !!id,
  })
}
