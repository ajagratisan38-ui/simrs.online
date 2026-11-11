import { z } from 'zod'

// --- Create Lab Order (dokter membuat permintaan lab) ---
export const createLabOrderSchema = z.object({
  visit_id: z.string().uuid(),
  medical_record_id: z.string().uuid().optional(),
  prioritas: z.enum(['normal', 'cito']).default('normal'),
  catatan_klinis: z.string().max(1000).optional(),
  items: z.array(z.object({
    parameter_id: z.string().uuid(),
    tarif: z.number().min(0).default(0),
  })).min(1, 'Minimal 1 pemeriksaan harus dipilih'),
})

export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>

// --- Receive Sample (petugas lab terima sampel) ---
export const receiveSampleSchema = z.object({
  catatan: z.string().max(500).optional(),
})

export type ReceiveSampleInput = z.infer<typeof receiveSampleSchema>

// --- Input Results (petugas lab input hasil per item) ---
export const inputResultSchema = z.object({
  results: z.array(z.object({
    item_id: z.string().uuid(),
    hasil: z.string().max(200),
    keterangan: z.string().max(500).optional(),
    flag: z.enum(['normal', 'rendah', 'tinggi', 'kritis']).optional(),
  })).min(1, 'Minimal 1 hasil harus diinput'),
})

export type InputResultInput = z.infer<typeof inputResultSchema>

// --- List Lab Orders (filter) ---
export const listLabOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['dikirim', 'sampel_diterima', 'diproses', 'selesai', 'batal']).optional(),
  prioritas: z.enum(['normal', 'cito']).optional(),
  search: z.string().max(100).optional(),
  tanggal_dari: z.string().optional(),
  tanggal_sampai: z.string().optional(),
})

export type ListLabOrdersInput = z.infer<typeof listLabOrdersSchema>

// --- Search Lab Parameters ---
export const searchLabParamsSchema = z.object({
  q: z.string().min(1).max(100),
  kategori: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type SearchLabParamsInput = z.infer<typeof searchLabParamsSchema>
