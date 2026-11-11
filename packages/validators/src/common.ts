import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export type PaginationInput = z.infer<typeof paginationSchema>

// Reusable field validators untuk data Indonesia
export const nikSchema = z
  .string()
  .regex(/^\d{16}$/, 'NIK harus 16 digit angka')

export const phoneSchema = z
  .string()
  .regex(/^(\+62|62|0)8\d{8,12}$/, 'Format nomor telepon tidak valid (contoh: 08xx atau +62xx)')

export const noBpjsSchema = z
  .string()
  .regex(/^\d{13}$/, 'Nomor BPJS harus 13 digit angka')
