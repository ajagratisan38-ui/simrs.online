import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listDoctorsAdmin,
  getDoctorDetail,
  updateDoctor,
  deactivateDoctor,
  reactivateDoctor,
  getTodaySchedule,
  upsertSchedule,
  deleteSchedule,
  toggleSchedule,
  createDoctorFee,
  updateDoctorFee,
  deleteDoctorFee,
  getDoctorEarnings,
  getAllDoctorEarnings,
  type DoctorStatus,
} from '@/lib/api/doctors'

export function useDoctorList(filters?: { status?: DoctorStatus; includeInactive?: boolean; includeDeleted?: boolean }) {
  return useQuery({
    queryKey: ['doctors-admin', filters],
    queryFn: () => listDoctorsAdmin(filters),
  })
}

export function useDoctorDetail(id: string) {
  return useQuery({
    queryKey: ['doctor-detail', id],
    queryFn: () => getDoctorDetail(id),
    enabled: !!id,
  })
}

export function useUpdateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateDoctor>[1] }) =>
      updateDoctor(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors-admin'] })
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
    },
  })
}

export function useDeactivateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      deactivateDoctor(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors-admin'] })
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
    },
  })
}

export function useReactivateDoctor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivateDoctor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctors-admin'] })
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
    },
  })
}

export function useTodaySchedule() {
  return useQuery({
    queryKey: ['today-schedule'],
    queryFn: getTodaySchedule,
  })
}

export function useUpsertSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ doctorId, data }: {
      doctorId: string
      data: Parameters<typeof upsertSchedule>[1]
    }) => upsertSchedule(doctorId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
      qc.invalidateQueries({ queryKey: ['today-schedule'] })
    },
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
      qc.invalidateQueries({ queryKey: ['today-schedule'] })
    },
  })
}

export function useToggleSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleSchedule(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
    },
  })
}

export function useCreateFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ doctorId, data }: {
      doctorId: string
      data: Parameters<typeof createDoctorFee>[1]
    }) => createDoctorFee(doctorId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
    },
  })
}

export function useUpdateFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ feeId, data }: {
      feeId: string
      data: Parameters<typeof updateDoctorFee>[1]
    }) => updateDoctorFee(feeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
    },
  })
}

export function useDeleteFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteDoctorFee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor-detail'] })
    },
  })
}

export function useDoctorEarnings(doctorId: string, filters?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['doctor-earnings', doctorId, filters],
    queryFn: () => getDoctorEarnings(doctorId, filters),
    enabled: !!doctorId,
  })
}

export function useAllDoctorEarnings(filters?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['all-doctor-earnings', filters],
    queryFn: () => getAllDoctorEarnings(filters),
  })
}
