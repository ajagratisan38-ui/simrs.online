import { z } from 'zod'

// Penjamin Laka Lantas codes (BPJS VClaim spec)
// 0 = Bukan Laka, 1 = Jasa Raharja PT, 2 = BPJS Ketenagakerjaan,
// 3 = TASPEN PT, 4 = ASABRI PT
export const lakaLantasDataSchema = z.object({
  penjamin_laka: z.enum(['1', '2', '3', '4', '0'], {
    errorMap: () => ({ message: 'Penjamin laka lantas tidak valid' }),
  }),
  tgl_kejadian: z.string().min(1, 'Tanggal kejadian wajib diisi'),
  keterangan: z.string().min(3, 'Keterangan kejadian minimal 3 karakter'),
  no_lp_polisi: z.string().optional(),
  lokasi_propinsi: z.string().optional(),
  lokasi_kabupaten: z.string().optional(),
  lokasi_kecamatan: z.string().optional(),
  no_sep_suplesi: z.string().optional(),
})

export type LakaLantasData = z.infer<typeof lakaLantasDataSchema>

export const createVisitSchema = z
  .object({
    patient_id: z.string().uuid('ID pasien tidak valid'),
    tipe: z.enum(['rawat_jalan', 'igd', 'rawat_inap'], {
      errorMap: () => ({ message: 'Tipe kunjungan harus rawat_jalan, igd, atau rawat_inap' }),
    }),
    room_id: z.string().uuid('ID ruangan tidak valid'),
    doctor_id: z.string().uuid('ID dokter tidak valid'),
    bed_id: z.string().uuid('ID tempat tidur tidak valid').nullable().optional(),
    keluhan_utama: z.string().min(3, 'Keluhan utama minimal 3 karakter').optional(),
    cara_masuk: z
      .enum(['datang_sendiri', 'rujukan', 'kontrol', 'kiosk'])
      .default('datang_sendiri'),
    penjamin: z
      .enum(['umum', 'bpjs', 'asuransi', 'perusahaan'])
      .default('umum'),
    no_sep: z.string().optional(),
    insurance_id: z.string().uuid('ID asuransi tidak valid').nullable().optional(),
    no_rujukan: z.string().optional(),
    catatan: z.string().optional(),
    is_laka_lantas: z.boolean().default(false),
    laka_lantas_data: lakaLantasDataSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.penjamin === 'bpjs' && !data.no_sep) {
        return false
      }
      return true
    },
    {
      message: 'No. SEP wajib diisi jika penjamin BPJS',
      path: ['no_sep'],
    },
  )
  .refine(
    (data) => {
      // If laka lantas flagged, data must be provided
      if (data.is_laka_lantas && !data.laka_lantas_data) {
        return false
      }
      return true
    },
    {
      message: 'Detail kecelakaan lalu lintas wajib diisi',
      path: ['laka_lantas_data'],
    },
  )

export type CreateVisitInput = z.infer<typeof createVisitSchema>

export const updateVisitStatusSchema = z.object({
  status: z.enum(
    ['menunggu', 'diperiksa', 'selesai', 'batal', 'rawat_inap', 'pulang'],
    { errorMap: () => ({ message: 'Status tidak valid' }) },
  ),
  catatan: z.string().optional(),
})

export type UpdateVisitStatusInput = z.infer<typeof updateVisitStatusSchema>

export const listVisitsSchema = z.object({
  tanggal: z.string().optional(),
  status: z.string().optional(),
  tipe: z.string().optional(),
  room_id: z.string().uuid().optional(),
  doctor_id: z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListVisitsInput = z.infer<typeof listVisitsSchema>

export const cancelVisitSchema = z.object({
  alasan: z.string().min(3, 'Alasan pembatalan minimal 3 karakter'),
})

export type CancelVisitInput = z.infer<typeof cancelVisitSchema>
