'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
} from '@/lib/api/users'
import type { CreateUserInput, UpdateUserInput } from '@/lib/api/users'

export function useUsers(params?: {
  page?: number
  limit?: number
  search?: string
}) {
  const stableParams = useMemo(
    () => ({
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      search: params?.search,
    }),
    [params?.page, params?.limit, params?.search],
  )

  return useQuery({
    queryKey: ['users', stableParams],
    queryFn: () => listUsers(stableParams),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => getUser(id),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserInput) => createUser(data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => updateUser(id, data),
    onSettled: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      resetUserPassword(id, password),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
