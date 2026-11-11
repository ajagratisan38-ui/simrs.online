import { z } from 'zod'

export const createSepSchema = z.object({
  noKartu: z.string().min(10, 'No kartu BPJS minimal 10 digit'),
  tglSep: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD'),
  ppkPelayanan: z.string().min(1, 'PPK pelayanan wajib diisi'),
  jnsPelayanan: z.enum(['1', '2'], {
    errorMap: () => ({ message: '1 = Rawat Inap, 2 = Rawat Jalan' }),
  }),
  klsRawatHak: z.string().min(1),
  klsRawatNaik: z.string().optional(),
  pembiayaan: z.string().optional(),
  penanggungJawab: z.string().optional(),
  noMR: z.string().min(1, 'No Rekam Medis wajib diisi'),
  asalRujukan: z.string().optional(),
  tglRujukan: z.string().optional(),
  noRujukan: z.string().optional(),
  ppkRujukan: z.string().optional(),
  catatan: z.string().max(500).optional(),
  diagAwal: z.string().min(1, 'Diagnosis awal wajib diisi'),
  poliTujuan: z.string().min(1, 'Poli tujuan wajib diisi'),
  poliEksekutif: z.string().optional(),
  cob: z.object({ penjamin: z.string() }).optional(),
  katarak: z.object({ ketKatarak: z.string() }).optional(),
  jaminanLakaLantas: z
    .object({
      penjamin: z.string(),
      tglKejadian: z.string().optional(),
      keterangan: z.string().optional(),
      noSEPSuplesi: z.string().optional(),
      kdPropinsi: z.string().optional(),
      kdKabupaten: z.string().optional(),
      kdKecamatan: z.string().optional(),
    })
    .optional(),
  skdp: z
    .object({
      noSurat: z.string(),
      kodeDPJP: z.string(),
    })
    .optional(),
  noTelp: z.string().min(8, 'No telepon minimal 8 digit'),
  user: z.string().min(1),
})

export type CreateSepSchemaInput = z.infer<typeof createSepSchema>

export const updateSepSchema = z.object({
  noSep: z.string().min(10, 'No SEP minimal 10 karakter'),
  klsRawat: z.string().optional(),
  noMR: z.string().optional(),
  catatan: z.string().max(500).optional(),
  diagAwal: z.string().optional(),
  poliTujuan: z.string().optional(),
  noTelp: z.string().optional(),
  user: z.string().min(1),
})

export type UpdateSepSchemaInput = z.infer<typeof updateSepSchema>

export const refSearchSchema = z.object({
  q: z.string().min(1, 'Keyword pencarian wajib diisi'),
})

export type RefSearchInput = z.infer<typeof refSearchSchema>

// --- Antrol Validators ---

export const antrolAddSchema = z.object({
  nomorkartu: z.string().min(10, 'No kartu BPJS minimal 10 digit'),
  nik: z.string().min(16, 'NIK harus 16 digit').max(16),
  nohp: z.string().min(8, 'No HP minimal 8 digit'),
  kodepoli: z.string().min(1, 'Kode poli wajib diisi'),
  namapoli: z.string().min(1, 'Nama poli wajib diisi'),
  paession: z.number().min(1).max(2),
  tanggalperiksa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD'),
  kodedokter: z.string().min(1, 'Kode dokter wajib diisi'),
  namadokter: z.string().min(1, 'Nama dokter wajib diisi'),
  jampraktek: z.string().min(1, 'Jam praktek wajib diisi'),
  jeniskunjungan: z.number().min(1).max(4),
  nomorreferensi: z.string().min(1, 'Nomor referensi wajib diisi'),
  nomorantrean: z.string().optional().default(''),
  angkaantrean: z.number().optional().default(0),
  estimasidilayani: z.number().optional().default(0),
  siession: z.number().min(1).max(2),
})

export type AntrolAddSchemaInput = z.infer<typeof antrolAddSchema>

export const antrolUpdateSchema = z.object({
  kodebooking: z.string().min(1, 'Kode booking wajib diisi'),
  taskid: z.number().refine(
    (v) => [1, 2, 3, 4, 5, 99].includes(v),
    'taskid harus salah satu dari: 1=checkin, 2=dilayani, 3=selesai, 4=farmasi, 5=batal, 99=batal',
  ),
  waktu: z.number().min(1, 'Timestamp waktu wajib diisi'),
})

export type AntrolUpdateSchemaInput = z.infer<typeof antrolUpdateSchema>

export const antrolBatalSchema = z.object({
  kodebooking: z.string().min(1, 'Kode booking wajib diisi'),
  keterangan: z.string().min(1, 'Keterangan pembatalan wajib diisi'),
})

export type AntrolBatalSchemaInput = z.infer<typeof antrolBatalSchema>
