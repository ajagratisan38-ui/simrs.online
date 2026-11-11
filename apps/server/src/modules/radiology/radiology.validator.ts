import { z } from 'zod'

export const createRadiologyOrderSchema = z.object({
  visit_id: z.string().uuid(),
  medical_record_id: z.string().uuid().optional(),
  examination_id: z.string().uuid(),
  prioritas: z.enum(['normal', 'cito']).default('normal'),
  catatan_klinis: z.string().max(1000).optional(),
  diagnosa_klinis: z.string().max(500).optional(),
})

export type CreateRadiologyOrderInput = z.infer<typeof createRadiologyOrderSchema>

export const scheduleOrderSchema = z.object({
  tanggal_jadwal: z.string(),
  catatan: z.string().max(500).optional(),
})

export type ScheduleOrderInput = z.infer<typeof scheduleOrderSchema>

export const inputResultSchema = z.object({
  hasil_bacaan: z.string().min(1, 'Hasil bacaan wajib diisi').max(5000),
  kesan: z.string().min(1, 'Kesan wajib diisi').max(2000),
})

export type InputRadiologyResultInput = z.infer<typeof inputResultSchema>

export const listRadiologyOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['dikirim', 'dijadwalkan', 'diproses', 'selesai', 'batal']).optional(),
  prioritas: z.enum(['normal', 'cito']).optional(),
  modalitas: z.enum(['xray', 'usg', 'ct_scan', 'mri', 'mammografi', 'panoramik', 'fluoroskopi', 'lainnya']).optional(),
  search: z.string().max(100).optional(),
  tanggal_dari: z.string().optional(),
  tanggal_sampai: z.string().optional(),
})

export type ListRadiologyOrdersInput = z.infer<typeof listRadiologyOrdersSchema>

export const searchExaminationsSchema = z.object({
  q: z.string().min(1).max(100),
  modalitas: z.enum(['xray', 'usg', 'ct_scan', 'mri', 'mammografi', 'panoramik', 'fluoroskopi', 'lainnya']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type SearchExaminationsInput = z.infer<typeof searchExaminationsSchema>
