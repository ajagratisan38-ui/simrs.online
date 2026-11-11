import { z } from 'zod'

export const applyDiscountSchema = z.object({
  discount_amount: z.number().min(0, 'Diskon tidak boleh negatif'),
  catatan: z.string().min(3, 'Alasan diskon minimal 3 karakter'),
})

export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>

export const processPaymentSchema = z.object({
  metode: z.enum(
    ['tunai', 'debit', 'kredit', 'transfer', 'bpjs', 'asuransi'],
    { required_error: 'Metode pembayaran wajib diisi' },
  ),
  jumlah: z.number().min(1, 'Jumlah pembayaran minimal 1'),
  referensi_pembayaran: z.string().max(100).optional(),
  catatan: z.string().optional(),
})

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>

export const dailySummarySchema = z.object({
  date: z.string().optional(),
})

export type DailySummaryInput = z.infer<typeof dailySummarySchema>

export const outstandingSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type OutstandingInput = z.infer<typeof outstandingSchema>
