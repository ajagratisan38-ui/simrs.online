import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getQueue,
  getAllQueues,
  callNextQueue,
  listRooms,
  listDoctors,
  createVisit,
} from '@/lib/api/queues'

export function useQueue(roomId: string, date?: string) {
  return useQuery({
    queryKey: ['queues', roomId, date],
    queryFn: () => getQueue(roomId, date),
    enabled: !!roomId,
    refetchInterval: 10_000,
  })
}

export function useAllQueues(date?: string) {
  return useQuery({
    queryKey: ['queues', 'all', date],
    queryFn: () => getAllQueues(date),
    refetchInterval: 10_000,
  })
}

export function useCallNext() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: callNextQueue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queues'] })
      qc.invalidateQueries({ queryKey: ['visits'] })
    },
  })
}

export function useRooms(tipe?: string) {
  return useQuery({
    queryKey: ['rooms', tipe],
    queryFn: () => listRooms(tipe),
    staleTime: 60_000,
  })
}

export function useDoctors(roomId?: string) {
  return useQuery({
    queryKey: ['doctors', roomId],
    queryFn: () => listDoctors(roomId),
    staleTime: 60_000,
  })
}

export function useCreateVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createVisit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queues'] })
      qc.invalidateQueries({ queryKey: ['visits'] })
      qc.invalidateQueries({ queryKey: ['inpatient'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}
