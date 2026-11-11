'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  getTopicCategories,
  createEducationRecord,
  getEducationRecord,
  updateEducationRecord,
  deleteEducationRecord,
  listEducationByVisit,
  listEducationByPatient,
  verifyEducationRecord,
  scheduleReeducation,
  listPendingReeducation,
  getEducationStats,
  getEducationStatsByVisit,
  type CreateTopicInput,
  type UpdateTopicInput,
  type CreateEducationRecordInput,
  type UpdateEducationRecordInput,
} from '@/lib/api/education'

// =====================================================
// TOPIC HOOKS
// =====================================================

export function useEducationTopics(
  params?: { kategori?: string; search?: string; is_active?: boolean },
) {
  const stableParams = useMemo(
    () => ({
      kategori: params?.kategori,
      search: params?.search,
      is_active: params?.is_active,
    }),
    [params?.kategori, params?.search, params?.is_active],
  )

  return useQuery({
    queryKey: ['education-topics', stableParams],
    queryFn: () => listTopics(stableParams),
    placeholderData: (prev) => prev,
  })
}

export function useEducationTopic(id: string) {
  return useQuery({
    queryKey: ['education-topics', id],
    queryFn: () => getTopic(id),
    enabled: !!id,
  })
}

export function useCreateEducationTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTopicInput) => createTopic(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['education-topics'] })
    },
  })
}

export function useUpdateEducationTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTopicInput }) =>
      updateTopic(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['education-topics'] })
    },
  })
}

export function useDeleteEducationTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTopic(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['education-topics'] })
    },
  })
}

export function useTopicCategories() {
  return useQuery({
    queryKey: ['education-topics', 'categories'],
    queryFn: () => getTopicCategories(),
  })
}

// =====================================================
// RECORD HOOKS
// =====================================================

export function useEducationByVisit(visitId: string) {
  return useQuery({
    queryKey: ['education-records', 'visit', visitId],
    queryFn: () => listEducationByVisit(visitId),
    enabled: !!visitId,
    placeholderData: (prev) => prev,
  })
}

export function useEducationByPatient(patientId: string) {
  return useQuery({
    queryKey: ['education-records', 'patient', patientId],
    queryFn: () => listEducationByPatient(patientId),
    enabled: !!patientId,
    placeholderData: (prev) => prev,
  })
}

export function useEducationRecord(id: string) {
  return useQuery({
    queryKey: ['education-records', id],
    queryFn: () => getEducationRecord(id),
    enabled: !!id,
  })
}

export function useCreateEducationRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEducationRecordInput) => createEducationRecord(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['education-records'] })
      qc.invalidateQueries({ queryKey: ['education-stats'] })
    },
  })
}

export function useUpdateEducationRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEducationRecordInput }) =>
      updateEducationRecord(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['education-records'] })
      qc.invalidateQueries({ queryKey: ['education-stats'] })
    },
  })
}

export function useDeleteEducationRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEducationRecord(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['education-records'] })
      qc.invalidateQueries({ queryKey: ['education-stats'] })
    },
  })
}

export function useVerifyEducationRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, signatureData }: { id: string; signatureData: string }) =>
      verifyEducationRecord(id, signatureData),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['education-records'] })
      qc.invalidateQueries({ queryKey: ['education-stats'] })
    },
  })
}

export function useScheduleReeducation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tanggal }: { id: string; tanggal: string }) =>
      scheduleReeducation(id, tanggal),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['education-records'] })
      qc.invalidateQueries({ queryKey: ['education-stats'] })
    },
  })
}

export function usePendingReeducation() {
  return useQuery({
    queryKey: ['education-records', 'pending-reeducation'],
    queryFn: () => listPendingReeducation(),
  })
}

// =====================================================
// STATS HOOKS
// =====================================================

export function useEducationStats() {
  return useQuery({
    queryKey: ['education-stats'],
    queryFn: () => getEducationStats(),
  })
}

export function useEducationStatsByVisit(visitId: string) {
  return useQuery({
    queryKey: ['education-stats', 'visit', visitId],
    queryFn: () => getEducationStatsByVisit(visitId),
    enabled: !!visitId,
  })
}
