import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createNursingAssessment, updateNursingAssessment, finalizeNursingAssessment,
  getNursingByVisit, getNursingById, getNursingByPatient, deleteNursingAssessment,
} from '@/lib/api/nursing'

export function useNursingByVisit(visitId: string) {
  return useQuery({
    queryKey: ['nursing', 'visit', visitId],
    queryFn: () => getNursingByVisit(visitId),
    enabled: !!visitId,
  })
}

export function useNursingById(id: string) {
  return useQuery({
    queryKey: ['nursing', id],
    queryFn: () => getNursingById(id),
    enabled: !!id,
  })
}

export function useNursingByPatient(patientId: string) {
  return useQuery({
    queryKey: ['nursing', 'patient', patientId],
    queryFn: () => getNursingByPatient(patientId),
    enabled: !!patientId,
  })
}

export function useCreateNursing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createNursingAssessment,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['nursing'] })
    },
  })
}

export function useUpdateNursing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateNursingAssessment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nursing'] }),
  })
}

export function useFinalizeNursing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: finalizeNursingAssessment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nursing'] }),
  })
}

export function useDeleteNursing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteNursingAssessment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nursing'] }),
  })
}
