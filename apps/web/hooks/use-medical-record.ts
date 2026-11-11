import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createMedicalRecord,
  updateMedicalRecord,
  getMedicalRecordByVisit,
  finalizeMedicalRecord,
  getPatientMedicalHistory,
  getResumeMedis,
  searchICD10,
  searchICD9CM,
  getICD9CMCategories,
  listTemplates,
  createTemplate,
  type MedicalRecordInput,
} from '@/lib/api/medical-records'

export function useMedicalRecordByVisit(visitId: string) {
  return useQuery({
    queryKey: ['medical-record', 'visit', visitId],
    queryFn: () => getMedicalRecordByVisit(visitId),
    enabled: !!visitId,
  })
}

export function useCreateMedicalRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      visitId,
      data,
    }: {
      visitId: string
      data: MedicalRecordInput & { doctor_id?: string }
    }) => createMedicalRecord(visitId, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({
        queryKey: ['medical-record', 'visit', vars.visitId],
      })
      qc.invalidateQueries({ queryKey: ['visits'] })
      qc.invalidateQueries({ queryKey: ['queues'] })
    },
  })
}

export function useUpdateMedicalRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MedicalRecordInput }) =>
      updateMedicalRecord(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-record'] })
    },
  })
}

export function useFinalizeMedicalRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => finalizeMedicalRecord(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-record'] })
      qc.invalidateQueries({ queryKey: ['visits'] })
      qc.invalidateQueries({ queryKey: ['queues'] })
    },
  })
}

export function usePatientHistory(patientId: string, page = 1) {
  return useQuery({
    queryKey: ['patient-history', patientId, page],
    queryFn: () => getPatientMedicalHistory(patientId, page),
    enabled: !!patientId,
  })
}

export function useResumeMedis(visitId: string, enabled = true) {
  return useQuery({
    queryKey: ['resume-medis', visitId],
    queryFn: () => getResumeMedis(visitId),
    enabled: !!visitId && enabled,
    staleTime: 60_000,
  })
}

export function useICD10Search(query: string) {
  return useQuery({
    queryKey: ['icd10', query],
    queryFn: () => searchICD10(query, 15),
    enabled: query.length >= 2,
    staleTime: 60_000,
  })
}

export function useICD9CMSearch(query: string, category?: string) {
  return useQuery({
    queryKey: ['icd9cm', query, category],
    queryFn: () => searchICD9CM(query, category, 20),
    enabled: query.length >= 2,
    staleTime: 60_000,
  })
}

export function useICD9CMCategories() {
  return useQuery({
    queryKey: ['icd9cm-categories'],
    queryFn: getICD9CMCategories,
    staleTime: 300_000,
  })
}

export function useTemplates(category?: string) {
  return useQuery({
    queryKey: ['templates', category],
    queryFn: () => listTemplates(category),
    staleTime: 120_000,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; category: string; content: Record<string, unknown> }) =>
      createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}
