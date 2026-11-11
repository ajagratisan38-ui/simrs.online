import { z } from 'zod'

// --- Drug ---
export const createDrugSchema = z.object({
  kode: z.string().min(2, 'Kode minimal 2 karakter').max(30),
  nama: z.string().min(2, 'Nama minimal 2 karakter').max(200),
  nama_generik: z.string().max(200).optional(),
  kategori: z.enum(['obat', 'alkes', 'bmhp', 'nutrisi']).default('obat'),
  satuan_kecil: z.string().max(30).default('tablet'),
  satuan_besar: z.string().max(30).optional(),
  konversi: z.number().int().min(1).default(1),
  harga_beli: z.number().min(0).default(0),
  harga_jual: z.number().min(0).default(0),
  margin_persen: z.number().min(0).max(100).default(0),
  stok_minimum: z.number().int().min(0).default(10),
})

export type CreateDrugInput = z.infer<typeof createDrugSchema>

export const updateDrugSchema = createDrugSchema.partial()
export type UpdateDrugInput = z.infer<typeof updateDrugSchema>

export const listDrugsSchema = z.object({
  search: z.string().optional(),
  kategori: z.enum(['obat', 'alkes', 'bmhp', 'nutrisi']).optional(),
  is_active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListDrugsInput = z.infer<typeof listDrugsSchema>

export const searchDrugSchema = z.object({
  q: z.string().min(1, 'Kata kunci minimal 1 karakter'),
  limit: z.coerce.number().int().min(1).max(50).default(15),
})

export type SearchDrugInput = z.infer<typeof searchDrugSchema>

// --- Stock ---
export const addStockSchema = z.object({
  batch_number: z.string().max(50).optional(),
  tanggal_kadaluarsa: z.string().optional(),
  jumlah: z.number().int().min(1, 'Jumlah minimal 1'),
  harga_beli_per_unit: z.number().min(0).default(0),
  supplier: z.string().max(200).optional(),
  tanggal_masuk: z.string().optional(),
})

export type AddStockInput = z.infer<typeof addStockSchema>

export const adjustStockSchema = z.object({
  batch_id: z.string().uuid('ID batch tidak valid'),
  jumlah: z.number().int(), // positive = tambah, negative = kurangi
  alasan: z.string().min(3, 'Alasan minimal 3 karakter'),
})

export type AdjustStockInput = z.infer<typeof adjustStockSchema>

// --- Dispensing ---
export const dispenseItemSchema = z.object({
  prescription_item_id: z.string().uuid().optional(),
  drug_id: z.string().uuid('ID obat tidak valid'),
  jumlah_diminta: z.number().int().min(1),
  jumlah_diberikan: z.number().int().min(0),
  catatan: z.string().optional(),
})

export const dispenseSchema = z.object({
  items: z.array(dispenseItemSchema).min(1, 'Minimal 1 item'),
  catatan_apoteker: z.string().optional(),
})

export type DispenseInput = z.infer<typeof dispenseSchema>

// --- Alerts ---
export const expiringSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(90),
})

export type ExpiringInput = z.infer<typeof expiringSchema>
