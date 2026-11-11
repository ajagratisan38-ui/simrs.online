import { z } from 'zod'

// --- Vital Signs ---
const vitalSignsSchema = z.object({
  tekanan_darah_sistolik: z.number().int().min(50).max(300).nullable().optional(),
  tekanan_darah_diastolik: z.number().int().min(20).max(200).nullable().optional(),
  nadi: z.number().int().min(20).max(250).nullable().optional(),
  suhu: z.number().min(30).max(45).nullable().optional(),
  respirasi: z.number().int().min(5).max(60).nullable().optional(),
  spo2: z.number().int().min(50).max(100).nullable().optional(),
  tinggi_badan: z.number().min(20).max(300).nullable().optional(),
  berat_badan: z.number().min(0.5).max(500).nullable().optional(),
  bmi: z.number().min(5).max(100).nullable().optional(),
}).optional()

// --- Diagnosis item ---
const diagnosisItemSchema = z.object({
  icd10_code: z.string().min(3, 'Kode ICD-10 minimal 3 karakter').max(10),
  icd10_name: z.string().min(2, 'Nama diagnosis minimal 2 karakter'),
  tipe: z.enum(['utama', 'sekunder']).default('utama'),
  catatan: z.string().optional(),
})

// --- Procedure item ---
const procedureItemSchema = z.object({
  kode_tindakan: z.string().max(20).optional(),
  nama_tindakan: z.string().min(2, 'Nama tindakan minimal 2 karakter').max(200),
  catatan: z.string().optional(),
  tarif: z.number().min(0).default(0),
  qty: z.number().int().min(1).default(1),
  total: z.number().min(0).default(0),
})

// --- Prescription item ---
const prescriptionItemSchema = z.object({
  drug_id: z.string().uuid().nullable().optional(),
  nama_obat: z.string().min(2, 'Nama obat minimal 2 karakter').max(200),
  dosis: z.string().max(50).optional(),
  satuan: z.string().max(30).optional(),
  frekuensi: z.string().max(50).optional(),
  durasi_hari: z.number().int().min(1).max(365).optional(),
  jumlah: z.number().int().min(1).default(1),
  aturan_pakai: z.string().optional(),
  catatan: z.string().optional(),
})

// --- Prescription wrapper ---
const prescriptionSchema = z.object({
  catatan_dokter: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'Minimal 1 item resep'),
}).optional()

// --- Main create/update schema ---
export const createMedicalRecordSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  vital_signs: vitalSignsSchema,
  alergi: z.array(z.string()).optional(),
  riwayat_penyakit: z.string().optional(),
  catatan_tambahan: z.string().optional(),
  diagnoses: z.array(diagnosisItemSchema).optional(),
  procedures: z.array(procedureItemSchema).optional(),
  prescription: prescriptionSchema,
})

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>

export const updateMedicalRecordSchema = createMedicalRecordSchema

export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>

// --- Search ICD-10 ---
export const searchIcd10Schema = z.object({
  q: z.string().min(2, 'Kata kunci minimal 2 karakter'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SearchIcd10Input = z.infer<typeof searchIcd10Schema>

// --- Search ICD-9-CM ---
export const searchIcd9cmSchema = z.object({
  q: z.string().min(2, 'Kata kunci minimal 2 karakter'),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SearchIcd9cmInput = z.infer<typeof searchIcd9cmSchema>

// --- Patient history ---
export const patientHistorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PatientHistoryInput = z.infer<typeof patientHistorySchema>

// --- Template ---
const templateCategories = [
  'soap', 'subjective', 'objective', 'assessment', 'plan',
  'umum', 'penyakit_dalam', 'anak', 'bedah', 'obgyn',
  'saraf', 'mata', 'tht', 'kulit', 'gigi', 'igd',
] as const

export const createTemplateSchema = z.object({
  name: z.string().min(2, 'Nama template minimal 2 karakter').max(200),
  category: z.enum(templateCategories, {
    errorMap: () => ({ message: 'Kategori template tidak valid' }),
  }),
  content: z.record(z.unknown()),
  is_active: z.boolean().default(true),
})

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

export const listTemplatesSchema = z.object({
  category: z.enum(templateCategories).optional(),
})

export type ListTemplatesInput = z.infer<typeof listTemplatesSchema>
