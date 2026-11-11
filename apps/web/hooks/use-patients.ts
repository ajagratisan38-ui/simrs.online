import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  checkDuplicate,
  type PatientFilters,
  type PatientListResponse,
  type PatientDetailResponse,
} from '@/lib/api/patients'
import { offlineDb, cachePatients, addToQueue } from '@/lib/offline'
import type { ApiResponse, Patient } from '@simrs/shared-types'

// Offline fallback: read patients from IndexedDB
async function listPatientsOffline(
  filters: PatientFilters,
): Promise<PatientListResponse> {
  let collection = offlineDb.patients.toCollection()

  if (filters.search) {
    const q = filters.search.toLowerCase()
    collection = offlineDb.patients
      .filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          p.nik.includes(q) ||
          p.no_rekam_medis.includes(q),
      )
  }

  const total = await collection.count()
  const page = filters.page || 1
  const limit = filters.limit || 20
  const offset = (page - 1) * limit

  const items = await collection
    .offset(offset)
    .limit(limit)
    .toArray()

  return {
    success: true,
    data: items.map((i) => i.data as unknown as Patient),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

async function getPatientOffline(
  id: string,
): Promise<PatientDetailResponse> {
  const record = await offlineDb.patients.get(id)
  if (!record) {
    throw new Error('Pasien tidak ditemukan di data offline')
  }
  return {
    success: true,
    data: { ...(record.data as unknown as Patient), visits: [] },
  }
}

export function usePatients(filters: PatientFilters) {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: async () => {
      try {
        const result = await listPatients(filters)
        // Cache for offline use
        if (result.data) {
          cachePatients(
            result.data as unknown as Record<string, unknown>[],
          ).catch(() => {})
        }
        return result
      } catch {
        // Offline fallback
        return listPatientsOffline(filters)
      }
    },
    staleTime: 30_000,
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      try {
        return await getPatient(id)
      } catch {
        return getPatientOffline(id)
      }
    },
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      try {
        return await createPatient(data)
      } catch {
        // Offline: store locally
        const id = crypto.randomUUID()
        await offlineDb.patients.add({
          id,
          nik: (data.nik as string) || '',
          nama: (data.nama as string) || '',
          no_rekam_medis: '',
          synced: 0,
          lastModified: Date.now(),
          data: { id, ...data },
        })
        await addToQueue('create', 'patient', id, data)
        return {
          success: true,
          data: { id, ...data },
        } as ApiResponse<Patient>
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useUpdatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Record<string, unknown>
    }) => {
      try {
        return await updatePatient(id, data)
      } catch {
        // Offline: update locally
        const existing = await offlineDb.patients.get(id)
        if (existing) {
          await offlineDb.patients.update(id, {
            ...existing,
            nama: (data.nama as string) || existing.nama,
            synced: 0,
            lastModified: Date.now(),
            data: { ...existing.data, ...data },
          })
        }
        await addToQueue('update', 'patient', id, data)
        return {
          success: true,
          data: { id, ...data },
        } as ApiResponse<Patient>
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patient', vars.id] })
    },
  })
}

export function useDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await deletePatient(id)
      } catch {
        await offlineDb.patients.update(id, { synced: 0 })
        await addToQueue('delete', 'patient', id, {})
        return { success: true } as ApiResponse
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useDuplicateCheck() {
  return useMutation({
    mutationFn: checkDuplicate,
  })
}
