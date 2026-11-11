import { z } from 'zod'
import { nikSchema, phoneSchema, noBpjsSchema } from './common'

export const createPatientSchema = z.object({
  nik: nikSchema,
  nama: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .transform((val) => val.trim()),
  tempat_lahir: z
    .string()
    .min(2, 'Tempat lahir wajib diisi')
    .transform((val) => val.trim()),
  tanggal_lahir: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Format tanggal tidak valid')
    .refine(
      (val) => new Date(val) <= new Date(),
      'Tanggal lahir tidak boleh di masa depan',
    ),
  jenis_kelamin: z.enum(['L', 'P'], {
    errorMap: () => ({ message: 'Jenis kelamin harus L atau P' }),
  }),
  golongan_darah: z.string().nullable().optional(),
  alamat: z
    .string()
    .min(5, 'Alamat minimal 5 karakter')
    .transform((val) => val.trim()),
  rt: z.string().nullable().optional(),
  rw: z.string().nullable().optional(),
  kelurahan: z.string().nullable().optional(),
  kecamatan: z.string().nullable().optional(),
  kabupaten: z.string().nullable().optional(),
  provinsi: z.string().nullable().optional(),
  kode_pos: z.string().nullable().optional(),
  no_telepon: phoneSchema.nullable().optional(),
  email: z.string().email('Format email tidak valid').nullable().optional(),
  pekerjaan: z.string().nullable().optional(),
  pendidikan: z.string().nullable().optional(),
  status_pernikahan: z.string().nullable().optional(),
  nama_keluarga: z.string().nullable().optional(),
  no_telepon_keluarga: z.string().nullable().optional(),
  hubungan_keluarga: z.string().nullable().optional(),
  no_bpjs: noBpjsSchema.nullable().optional(),
  kelas_bpjs: z.number().int().min(1).max(3).nullable().optional(),
})

export type CreatePatientInput = z.infer<typeof createPatientSchema>

export const updatePatientSchema = createPatientSchema.partial()

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>

export const searchPatientSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SearchPatientInput = z.infer<typeof searchPatientSchema>
