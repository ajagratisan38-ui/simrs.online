import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/inpatient'
import type { KelasValidation, RoomType } from '@/lib/api/inpatient'

// ==================== QUERIES ====================

export function useInpatientSummary() {
  return useQuery({
    queryKey: ['inpatient', 'summary'],
    queryFn: api.getInpatientSummary,
    refetchInterval: 30_000,
  })
}

export function useInpatientRooms() {
  return useQuery({
    queryKey: ['inpatient', 'rooms'],
    queryFn: api.getInpatientRooms,
  })
}

export function useAllRooms(filters?: { tipe?: RoomType; includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['inpatient', 'rooms', 'all', filters],
    queryFn: () => api.getAllRooms(filters),
  })
}

export function useRoomStats() {
  return useQuery({
    queryKey: ['inpatient', 'rooms', 'stats'],
    queryFn: api.getRoomStats,
  })
}

export function useToggleRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.toggleRoom,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient'] })
      qc.invalidateQueries({ queryKey: ['queues'] })
    },
  })
}

export function useBedsByRoom(roomId: string | null) {
  return useQuery({
    queryKey: ['inpatient', 'beds', roomId],
    queryFn: () => api.getBedsByRoom(roomId!),
    enabled: !!roomId,
  })
}

export function useAllBeds() {
  return useQuery({
    queryKey: ['inpatient', 'beds', 'all'],
    queryFn: api.getAllBeds,
  })
}

// ==================== VALIDASI KELAS BPJS ====================

export function useValidateKelas(roomId: string | null, hakKelas: number | null) {
  return useQuery<KelasValidation>({
    queryKey: ['inpatient', 'validate-kelas', roomId, hakKelas],
    queryFn: () => api.validateKelas(roomId!, hakKelas!),
    enabled: !!roomId && hakKelas !== null && hakKelas > 0,
    staleTime: 60_000,
  })
}

// ==================== DISCHARGE ====================

export function useDischargePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ visitId, ...options }: { visitId: string } & api.DischargeOptions) =>
      api.dischargePatient(visitId, options),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inpatient'] })
      qc.invalidateQueries({ queryKey: ['visits'] })
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['billing'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

// ==================== BED OPERATIONS ====================

export function useAssignBed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { bedId: string; patientId: string; visitId: string }) =>
      api.assignBed(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

export function useReleaseBed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.releaseBed,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

export function useTransferBed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { fromBedId: string; toBedId: string }) =>
      api.transferBed(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

export function useToggleBedMaintenance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.toggleBedMaintenance,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

// ==================== ROOM CRUD ====================

export function useCreateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      kode: string; nama: string; tipe?: RoomType; lantai?: number | null
      kapasitas: number; tarif_per_hari: number; kelas?: string
    }) => api.createRoom(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

export function useUpdateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, ...data }: {
      roomId: string; kode?: string; nama?: string; lantai?: number | null
      kapasitas?: number; tarif_per_hari?: number; is_active?: boolean
      kelas?: string
    }) => api.updateRoom(roomId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteRoom,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

// ==================== BED CRUD ====================

export function useAddBed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roomId, nomor }: { roomId: string; nomor: string }) =>
      api.addBedToRoom(roomId, nomor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

export function useRemoveBed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.removeBed,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}

export function useRenameBed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bedId, nomor }: { bedId: string; nomor: string }) =>
      api.renameBed(bedId, nomor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inpatient'] }),
  })
}
