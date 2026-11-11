'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listCpptByVisit,
  listCpptByPatient,
  createCpptEntry,
  updateCpptEntry,
  verifyCpptEntry,
  deleteCpptEntry,
  type CreateCpptInput,
  type UpdateCpptInput,
} from '@/lib/api/cppt'

export function useCpptByVisit(
  visitId: string,
  params?: { page?: number; limit?: number; profesi?: string },
) {
  const stableParams = useMemo(
    () => ({
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
      profesi: params?.profesi,
    }),
    [params?.page, params?.limit, params?.profesi],
  )

  return useQuery({
    queryKey: ['cppt', 'visit', visitId, stableParams],
    queryFn: () => listCpptByVisit(visitId, stableParams),
    enabled: !!visitId,
    placeholderData: (prev) => prev,
  })
}

export function useCpptByPatient(
  patientId: string,
  params?: { page?: number; limit?: number },
) {
  const stableParams = useMemo(
    () => ({
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
    }),
    [params?.page, params?.limit],
  )

  return useQuery({
    queryKey: ['cppt', 'patient', patientId, stableParams],
    queryFn: () => listCpptByPatient(patientId, stableParams),
    enabled: !!patientId,
    placeholderData: (prev) => prev,
  })
}

export function useCreateCppt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCpptInput) => createCpptEntry(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cppt'] })
    },
  })
}

export function useUpdateCppt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCpptInput }) =>
      updateCpptEntry(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cppt'] })
    },
  })
}

export function useVerifyCppt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => verifyCpptEntry(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cppt'] })
    },
  })
}

export function useDeleteCppt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCpptEntry(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cppt'] })
    },
  })
}
