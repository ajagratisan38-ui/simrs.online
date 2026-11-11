import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listInsurances, getInsurance, createInsurance, updateInsurance,
  toggleInsurance, deleteInsurance, getInsuranceDropdown, getInsuranceStats,
  listPatientInsurances, getPatientActiveInsurances,
  addPatientInsurance, updatePatientInsurance, removePatientInsurance,
} from '@/lib/api/insurance'

// Master insurances
export function useInsurances(params?: {
  search?: string; tipe?: string; is_active?: boolean; page?: number; limit?: number
}) {
  return useQuery({
    queryKey: ['insurances', params],
    queryFn: () => listInsurances(params),
  })
}

export function useInsurance(id: string) {
  return useQuery({
    queryKey: ['insurance', id],
    queryFn: () => getInsurance(id),
    enabled: !!id,
  })
}

export function useCreateInsurance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInsurance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurances'] }),
  })
}

export function useUpdateInsurance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateInsurance(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insurances'] })
      qc.invalidateQueries({ queryKey: ['insurance'] })
    },
  })
}

export function useToggleInsurance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: toggleInsurance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurances'] }),
  })
}

export function useDeleteInsurance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteInsurance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurances'] }),
  })
}

export function useInsuranceDropdown() {
  return useQuery({
    queryKey: ['insurance-dropdown'],
    queryFn: getInsuranceDropdown,
    staleTime: 5 * 60 * 1000,
  })
}

export function useInsuranceStats() {
  return useQuery({
    queryKey: ['insurance-stats'],
    queryFn: getInsuranceStats,
  })
}

// Patient insurances
export function usePatientInsurances(patientId: string) {
  return useQuery({
    queryKey: ['patient-insurances', patientId],
    queryFn: () => listPatientInsurances(patientId),
    enabled: !!patientId,
  })
}

export function usePatientActiveInsurances(patientId: string) {
  return useQuery({
    queryKey: ['patient-active-insurances', patientId],
    queryFn: () => getPatientActiveInsurances(patientId),
    enabled: !!patientId,
  })
}

export function useAddPatientInsurance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addPatientInsurance,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-insurances', variables.patient_id] })
      qc.invalidateQueries({ queryKey: ['patient-active-insurances', variables.patient_id] })
    },
  })
}

export function useUpdatePatientInsurance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ patientId, id, data }: {
      patientId: string; id: string; data: Record<string, unknown>
    }) => updatePatientInsurance(patientId, id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-insurances', variables.patientId] })
      qc.invalidateQueries({ queryKey: ['patient-active-insurances', variables.patientId] })
    },
  })
}

export function useRemovePatientInsurance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ patientId, id }: { patientId: string; id: string }) =>
      removePatientInsurance(patientId, id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['patient-insurances', variables.patientId] })
      qc.invalidateQueries({ queryKey: ['patient-active-insurances', variables.patientId] })
    },
  })
}
