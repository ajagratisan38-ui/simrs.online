'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSurgeries, getSurgery, getFullSurgeryDetail, getTodaySchedule,
  createSurgery, updateSurgery,
  getTeamMembers, setTeamMembers,
  getInstruments, setInstruments,
  getAnesthesiaRecord, upsertAnesthesia,
  getNursingRecords, upsertNursingRecord,
} from '@/lib/api/surgery'
import type {
  CreateSurgeryInput, UpdateSurgeryInput,
  TeamMemberInput, InstrumentInput, AnesthesiaInput, NursingInput,
} from '@/lib/api/surgery'

export function useSurgeries(params?: {
  status?: string; tanggal?: string; ruang?: string; doctor_id?: string; page?: number; limit?: number
}) {
  return useQuery({ queryKey: ['surgeries', params], queryFn: () => listSurgeries(params), staleTime: 30_000 })
}

export function useSurgery(id: string) {
  return useQuery({ queryKey: ['surgeries', id], queryFn: () => getSurgery(id), enabled: !!id })
}

export function useFullSurgeryDetail(id: string) {
  return useQuery({ queryKey: ['surgeries', id, 'full'], queryFn: () => getFullSurgeryDetail(id), enabled: !!id })
}

export function useTodaySchedule() {
  return useQuery({ queryKey: ['surgeries', 'today'], queryFn: getTodaySchedule, staleTime: 60_000, refetchInterval: 60_000 })
}

export function useCreateSurgery() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: CreateSurgeryInput) => createSurgery(data), onSuccess: () => qc.invalidateQueries({ queryKey: ['surgeries'] }) })
}

export function useUpdateSurgery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSurgeryInput }) => updateSurgery(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['surgeries'] }),
  })
}

export function useTeamMembers(surgeryId: string) {
  return useQuery({ queryKey: ['surgeries', surgeryId, 'team'], queryFn: () => getTeamMembers(surgeryId), enabled: !!surgeryId })
}

export function useSetTeamMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, members }: { id: string; members: TeamMemberInput[] }) => setTeamMembers(id, members),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['surgeries', id] }),
  })
}

export function useInstruments(surgeryId: string) {
  return useQuery({ queryKey: ['surgeries', surgeryId, 'instruments'], queryFn: () => getInstruments(surgeryId), enabled: !!surgeryId })
}

export function useSetInstruments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, instruments }: { id: string; instruments: InstrumentInput[] }) => setInstruments(id, instruments),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['surgeries', id] }),
  })
}

export function useAnesthesia(surgeryId: string) {
  return useQuery({ queryKey: ['surgeries', surgeryId, 'anesthesia'], queryFn: () => getAnesthesiaRecord(surgeryId), enabled: !!surgeryId })
}

export function useUpsertAnesthesia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AnesthesiaInput }) => upsertAnesthesia(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['surgeries', id] }),
  })
}

export function useNursingRecords(surgeryId: string) {
  return useQuery({ queryKey: ['surgeries', surgeryId, 'nursing'], queryFn: () => getNursingRecords(surgeryId), enabled: !!surgeryId })
}

export function useUpsertNursing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NursingInput }) => upsertNursingRecord(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['surgeries', id] }),
  })
}
