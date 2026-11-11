// ============================================
// SIMRS SaaS — Shared Type Definitions
// Dipakai oleh frontend (apps/web) dan backend (apps/server)
// ============================================

// --- Enums ---

export const ROLES = [
  'superadmin',
  'admin',
  'dokter',
  'perawat',
  'apoteker',
  'kasir',
  'pendaftaran',
  'rekam_medis',
  'manajemen',
  'lab',
  'radiologi',
] as const

export type Role = (typeof ROLES)[number]

export const GENDER = ['L', 'P'] as const
export type Gender = (typeof GENDER)[number]

export const VISIT_TYPE = ['rawat_jalan', 'igd', 'rawat_inap'] as const
export type VisitType = (typeof VISIT_TYPE)[number]

export const VISIT_STATUS = [
  'menunggu',
  'diperiksa',
  'selesai',
  'batal',
  'rawat_inap',
  'pulang',
] as const
export type VisitStatus = (typeof VISIT_STATUS)[number]

export const PAYER_TYPE = ['umum', 'bpjs', 'asuransi', 'perusahaan'] as const
export type PayerType = (typeof PAYER_TYPE)[number]

export const ROOM_TYPE = [
  'poli',
  'igd',
  'rawat_inap',
  'lab',
  'radiologi',
  'farmasi',
  'operasi',
] as const
export type RoomType = (typeof ROOM_TYPE)[number]

export const BED_STATUS = ['tersedia', 'terisi', 'maintenance'] as const
export type BedStatus = (typeof BED_STATUS)[number]

export const QUEUE_STATUS = ['menunggu', 'dipanggil', 'dilayani', 'selesai', 'batal'] as const
export type QueueStatus = (typeof QUEUE_STATUS)[number]

export const PAYMENT_METHOD = ['tunai', 'debit', 'kredit', 'transfer', 'bpjs', 'asuransi'] as const
export type PaymentMethod = (typeof PAYMENT_METHOD)[number]

export const MEDICAL_RECORD_STATUS = ['draft', 'final'] as const
export type MedicalRecordStatus = (typeof MEDICAL_RECORD_STATUS)[number]

export const PRESCRIPTION_STATUS = ['draft', 'dikirim', 'diproses', 'selesai', 'batal'] as const
export type PrescriptionStatus = (typeof PRESCRIPTION_STATUS)[number]

// --- Permissions ---

export const PERMISSIONS = [
  // Pasien
  'patient:create',
  'patient:read',
  'patient:update',
  'patient:delete',
  // Pendaftaran
  'registration:create',
  'registration:read',
  'registration:update',
  'registration:cancel',
  'queue:manage',
  'doctor-schedule:read',
  // Rekam Medis
  'medical-record:create',
  'medical-record:read',
  'medical-record:update',
  'medical-record:finalize',
  'assessment:create',
  'assessment:read',
  // Farmasi
  'pharmacy:read',
  'pharmacy:manage',
  'prescription:read',
  'prescription:create',
  'stock:read',
  'stock:manage',
  // Kasir & Billing
  'billing:read',
  'billing:manage',
  'payment:create',
  'payment:read',
  // Laboratorium
  'lab-order:read',
  'lab-result:create',
  'lab-result:read',
  // Radiologi
  'radiology-order:read',
  'radiology-result:create',
  'radiology-result:read',
  // Dashboard & Laporan
  'dashboard:read',
  'report:read',
  'statistics:read',
  // Admin
  'user:create',
  'user:read',
  'user:update',
  'user:delete',
  'tenant:manage',
  'settings:manage',
  'audit-log:read',
  'admin:manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type RolePermissions = Record<Role, readonly Permission[]>

export interface MenuItem {
  label: string
  href: string
  icon: string
  roles: readonly Role[]
  children?: MenuItem[]
}

// --- Base Interfaces ---

export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface AuditableEntity extends BaseEntity {
  created_by: string | null
  updated_by: string | null
  deleted_at: string | null
}

// --- Domain Types ---

export interface User extends BaseEntity {
  email: string
  name: string
  role: Role
  is_active: boolean
  phone: string | null
  last_login_at: string | null
}

export interface Patient extends AuditableEntity {
  no_rekam_medis: string
  nik: string
  nama: string
  tempat_lahir: string
  tanggal_lahir: string
  jenis_kelamin: Gender
  golongan_darah: string | null
  alamat: string
  rt: string | null
  rw: string | null
  kelurahan: string | null
  kecamatan: string | null
  kabupaten: string | null
  provinsi: string | null
  kode_pos: string | null
  no_telepon: string | null
  email: string | null
  pekerjaan: string | null
  pendidikan: string | null
  status_pernikahan: string | null
  nama_keluarga: string | null
  no_telepon_keluarga: string | null
  hubungan_keluarga: string | null
  no_bpjs: string | null
  kelas_bpjs: number | null
  foto_url: string | null
  is_active: boolean
}

export interface Doctor extends BaseEntity {
  user_id: string
  spesialisasi: string | null
  no_sip: string | null
  no_str: string | null
  jadwal_praktek: Record<string, unknown> | null
  tarif_konsultasi: number
  is_available: boolean
}

export interface Room extends BaseEntity {
  kode: string
  nama: string
  tipe: RoomType
  lantai: number | null
  kapasitas: number
  tarif_per_hari: number
  is_active: boolean
}

export interface LakaLantasData {
  penjamin_laka: '0' | '1' | '2' | '3' | '4'
  tgl_kejadian: string
  keterangan: string
  no_lp_polisi?: string
  lokasi_propinsi?: string
  lokasi_kabupaten?: string
  lokasi_kecamatan?: string
  no_sep_suplesi?: string
}

export interface Visit extends AuditableEntity {
  patient_id: string
  visit_number: string
  tipe: VisitType
  tanggal: string
  room_id: string
  doctor_id: string
  bed_id: string | null
  status: VisitStatus
  keluhan_utama: string | null
  cara_masuk: string | null
  no_rujukan: string | null
  penjamin: PayerType
  no_sep: string | null
  catatan: string | null
  is_laka_lantas: boolean
  laka_lantas_data: LakaLantasData | null
}

// --- API Types ---

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: PaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginationQuery {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
}

// --- Vital Signs ---

export interface VitalSigns {
  tekanan_darah_sistolik: number | null
  tekanan_darah_diastolik: number | null
  nadi: number | null
  suhu: number | null
  respirasi: number | null
  spo2: number | null
  tinggi_badan: number | null
  berat_badan: number | null
  bmi: number | null
}

// --- Medical Record Domain Types ---

export const DIAGNOSIS_TYPE = ['utama', 'sekunder'] as const
export type DiagnosisType = (typeof DIAGNOSIS_TYPE)[number]

export const TEMPLATE_CATEGORY = [
  'soap', 'subjective', 'objective', 'assessment', 'plan',
] as const
export type TemplateCategory = (typeof TEMPLATE_CATEGORY)[number]

export interface MedicalRecord extends BaseEntity {
  visit_id: string
  patient_id: string
  doctor_id: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  vital_signs: VitalSigns
  alergi: string[]
  riwayat_penyakit: string | null
  catatan_tambahan: string | null
  status: MedicalRecordStatus
  created_by: string | null
  updated_by: string | null
}

export interface Diagnosis extends BaseEntity {
  medical_record_id: string
  icd10_code: string
  icd10_name: string
  tipe: DiagnosisType
  catatan: string | null
}

export interface Procedure extends BaseEntity {
  medical_record_id: string
  kode_tindakan: string | null
  nama_tindakan: string
  catatan: string | null
  tarif: number
  qty: number
  total: number
}

export interface Prescription extends BaseEntity {
  medical_record_id: string
  visit_id: string
  status: PrescriptionStatus
  catatan_dokter: string | null
}

export interface PrescriptionItem extends BaseEntity {
  prescription_id: string
  drug_id: string | null
  nama_obat: string
  dosis: string | null
  satuan: string | null
  frekuensi: string | null
  durasi_hari: number | null
  jumlah: number
  aturan_pakai: string | null
  catatan: string | null
}

export interface ICD10Code {
  id: string
  code: string
  name_en: string
  name_id: string
  category: string | null
  is_active: boolean
}

export interface ICD9CMCode {
  id: string
  code: string
  name_en: string
  name_id: string
  category: string | null
  is_active: boolean
}

export interface MedicalTemplate extends BaseEntity {
  name: string
  category: TemplateCategory
  content: Record<string, unknown>
  doctor_id: string | null
  is_active: boolean
}

// --- Laboratory Types ---

export const LAB_ORDER_STATUS = [
  'dikirim', 'sampel_diterima', 'diproses', 'selesai', 'batal',
] as const
export type LabOrderStatus = (typeof LAB_ORDER_STATUS)[number]

export const LAB_PRIORITY = ['normal', 'cito'] as const
export type LabPriority = (typeof LAB_PRIORITY)[number]

export const SPECIMEN_TYPE = [
  'darah', 'urine', 'feses', 'sputum', 'swab', 'cairan_tubuh', 'jaringan', 'lainnya',
] as const
export type SpecimenType = (typeof SPECIMEN_TYPE)[number]

export interface LabOrder extends BaseEntity {
  visit_id: string
  patient_id: string
  doctor_id: string
  medical_record_id: string | null
  nomor_order: string
  prioritas: LabPriority
  status: LabOrderStatus
  catatan_klinis: string | null
  tanggal_order: string
  tanggal_sampel: string | null
  tanggal_selesai: string | null
  petugas_lab_id: string | null
  created_by: string | null
  updated_by: string | null
}

export interface LabOrderItem extends BaseEntity {
  lab_order_id: string
  parameter_id: string
  parameter_kode: string
  parameter_nama: string
  kategori: string
  satuan: string | null
  nilai_normal: string | null
  specimen: SpecimenType
  hasil: string | null
  keterangan: string | null
  flag: string | null
  tarif: number
}

export interface LabParameter {
  id: string
  kode: string
  nama: string
  kategori: string
  satuan: string | null
  nilai_normal_l: string | null
  nilai_normal_p: string | null
  specimen: SpecimenType
  metode: string | null
  is_active: boolean
}

// --- Radiology Types ---

export const RADIOLOGY_ORDER_STATUS = [
  'dikirim', 'dijadwalkan', 'diproses', 'selesai', 'batal',
] as const
export type RadiologyOrderStatus = (typeof RADIOLOGY_ORDER_STATUS)[number]

export const RADIOLOGY_MODALITY = [
  'xray', 'usg', 'ct_scan', 'mri', 'mammografi', 'panoramik', 'fluoroskopi', 'lainnya',
] as const
export type RadiologyModality = (typeof RADIOLOGY_MODALITY)[number]

export interface RadiologyOrder extends BaseEntity {
  visit_id: string
  patient_id: string
  doctor_id: string
  medical_record_id: string | null
  nomor_order: string
  examination_id: string
  examination_kode: string
  examination_nama: string
  modalitas: RadiologyModality
  prioritas: LabPriority
  status: RadiologyOrderStatus
  catatan_klinis: string | null
  diagnosa_klinis: string | null
  tanggal_order: string
  tanggal_jadwal: string | null
  tanggal_selesai: string | null
  radiografer_id: string | null
  radiolog_id: string | null
  hasil_bacaan: string | null
  kesan: string | null
  tarif: number
  created_by: string | null
  updated_by: string | null
}

export interface RadiologyExamination {
  id: string
  kode: string
  nama: string
  modalitas: RadiologyModality
  kategori: string
  deskripsi: string | null
  persiapan: string | null
  tarif_default: number
  is_active: boolean
}

// --- Nutrition Types ---
export type NutritionOrderStatus = 'aktif' | 'selesai'
export type WaktuMakan = 'pagi' | 'siang' | 'sore' | 'snack_pagi' | 'snack_sore'

export interface NutritionOrder extends BaseEntity {
  visit_id: string
  patient_id: string
  diet_type: string
  kalori_target: number
  protein_target: number | null
  karbohidrat_target: number | null
  lemak_target: number | null
  catatan_diet: string | null
  alergi_makanan: string[]
  pantangan: string[]
  status: NutritionOrderStatus
  patient_nama?: string
  no_rekam_medis?: string
  visit_number?: string
  logs?: NutritionLog[]
}

export interface NutritionLog {
  id: string
  nutrition_order_id: string
  tanggal: string
  waktu_makan: WaktuMakan
  menu: string
  porsi_disajikan: number
  porsi_dimakan: number
  catatan: string | null
  created_by: string
  created_at: string
}

// --- Inventory/Transfer Types ---
export type ItemTransferStatus = 'pending' | 'approved' | 'completed' | 'rejected'

export interface ItemTransfer extends BaseEntity {
  nomor_mutasi: string
  drug_id: string
  drug_nama: string
  from_location: string
  to_location: string
  jumlah: number
  satuan: string
  status: ItemTransferStatus
  catatan: string | null
  requested_by: string
  approved_by: string | null
  approved_at: string | null
  completed_at: string | null
}

// --- OTC Sales Types ---
export type MetodeBayar = 'tunai' | 'qris' | 'debit' | 'kredit'

export interface OtcSale {
  id: string
  receipt_number: string
  nama_pembeli: string
  subtotal: number
  diskon: number
  diskon_persen: number
  grand_total: number
  metode_bayar: MetodeBayar
  catatan: string | null
  created_by: string
  created_at: string
  items?: OtcSaleItem[]
}

export interface OtcSaleItem {
  id: string
  otc_sale_id: string
  drug_id: string
  drug_nama: string
  jumlah: number
  harga_satuan: number
  total: number
}

// --- Surgery Types ---
export type SurgeryStatus = 'dijadwalkan' | 'persiapan' | 'berjalan' | 'selesai' | 'batal'
export type JenisOperasi = 'elektif' | 'cito' | 'emergency'
export type JenisAnestesi = 'general' | 'regional' | 'lokal' | 'sedasi'

export interface Surgery extends BaseEntity {
  nomor_operasi: string
  visit_id: string
  patient_id: string
  doctor_id: string
  tanggal_operasi: string
  jam_mulai: string
  jam_mulai_aktual: string | null
  jam_selesai: string | null
  estimasi_durasi_menit: number
  ruang_operasi: string
  jenis_operasi: JenisOperasi
  jenis_anestesi: JenisAnestesi
  diagnosis_pre_op: string
  diagnosis_post_op: string | null
  tindakan_rencana: string
  tindakan_aktual: string | null
  icd9cm_code: string | null
  laporan_operasi: string | null
  komplikasi: string | null
  anestesiolog_id: string | null
  perawat_instrumen: string | null
  perawat_sirkuler: string | null
  perdarahan_ml: number | null
  status: SurgeryStatus
  catatan: string | null
  patient_nama?: string
  no_rekam_medis?: string
  visit_number?: string
}

// --- CPPT Types ---
export const CPPT_PROFESI = [
  'Dokter', 'Perawat', 'Apoteker', 'Analis Lab', 'Radiografer',
  'Rekam Medis', 'Admin', 'Fisioterapis', 'Terapis Wicara', 'Terapis Okupasi',
] as const
export type CpptProfesi = (typeof CPPT_PROFESI)[number]

export interface CpptEntry extends BaseEntity {
  visit_id: string
  patient_id: string
  user_id: string
  profesi: string
  subjective: string | null
  objective: string | null
  assessment: string | null
  planning: string | null
  instruksi: string | null
  evaluasi: string | null
  tanggal_waktu: string
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  user_nama?: string
  verified_by_nama?: string
  visit_number?: string
}

// ═══════════════════════════════════════
// MCU (Medical Check Up)
// ═══════════════════════════════════════
export type McuExamCategory =
  | 'fisik_umum' | 'mata' | 'tht' | 'gigi' | 'lab'
  | 'radiologi' | 'ekg' | 'spirometri' | 'audiometri' | 'psikologi'

export type McuStatus = 'registered' | 'in_progress' | 'waiting_review' | 'completed' | 'cancelled'
export type McuConclusionType = 'fit' | 'fit_with_notes' | 'temporarily_unfit' | 'unfit'

export interface McuPackage extends BaseEntity {
  nama: string
  kode: string
  deskripsi: string | null
  harga: number
  is_active: boolean
  items?: McuPackageItem[]
}

export interface McuPackageItem {
  id: string
  package_id: string
  kategori: McuExamCategory
  nama: string
  deskripsi: string | null
  is_required: boolean
  sort_order: number
}

export interface McuRegistration extends BaseEntity {
  patient_id: string
  package_id: string
  doctor_id: string | null
  status: McuStatus
  tanggal: string
  tujuan: string | null
  perusahaan: string | null
  conclusion: McuConclusionType | null
  conclusion_notes: string | null
  concluded_at: string | null
  concluded_by: string | null
  certificate_number: string
  patient_nama?: string
  no_rekam_medis?: string
  package_nama?: string
  examinations?: McuExamination[]
  progress?: { total: number; completed: number; percentage: number }
}

export interface McuExamination extends BaseEntity {
  registration_id: string
  package_item_id: string | null
  kategori: McuExamCategory
  nama: string
  hasil: string | null
  nilai: string | null
  satuan: string | null
  nilai_normal: string | null
  is_abnormal: boolean
  catatan: string | null
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
}

// --- Rehabilitation Types ---
export const REHAB_THERAPY_TYPES = [
  'fisioterapi', 'terapi_wicara', 'terapi_okupasi', 'terapi_psikologi',
  'terapi_respirasi', 'rehabilitasi_jantung', 'rehabilitasi_neurologi', 'lainnya',
] as const
export type RehabTherapyType = (typeof REHAB_THERAPY_TYPES)[number]

export const REHAB_THERAPY_LABELS: Record<RehabTherapyType, string> = {
  fisioterapi: 'Fisioterapi',
  terapi_wicara: 'Terapi Wicara',
  terapi_okupasi: 'Terapi Okupasi',
  terapi_psikologi: 'Terapi Psikologi',
  terapi_respirasi: 'Terapi Respirasi',
  rehabilitasi_jantung: 'Rehabilitasi Jantung',
  rehabilitasi_neurologi: 'Rehabilitasi Neurologi',
  lainnya: 'Lainnya',
}

export const REHAB_ORDER_STATUSES = [
  'dikirim', 'dijadwalkan', 'berlangsung', 'selesai', 'batal',
] as const
export type RehabOrderStatus = (typeof REHAB_ORDER_STATUSES)[number]

export type PractitionerStatus = 'aktif' | 'nonaktif' | 'kontrak_habis'

export interface ExternalPractitioner extends BaseEntity {
  nama: string
  profesi: string
  spesialisasi: string | null
  no_sip: string | null
  no_str: string | null
  instansi_asal: string | null
  telepon: string | null
  email: string | null
  alamat: string | null
  fee_share_persen: number
  fee_share_rs_persen: number
  kontrak_mulai: string | null
  kontrak_selesai: string | null
  status: PractitionerStatus
  catatan: string | null
}

export interface RehabilitationOrder extends BaseEntity {
  visit_id: string
  patient_id: string
  ordering_doctor_id: string
  practitioner_id: string | null
  therapy_type: RehabTherapyType
  status: RehabOrderStatus
  diagnosa_klinis: string
  indikasi: string | null
  target_terapi: string | null
  jumlah_sesi: number
  sesi_selesai: number
  catatan_dokter: string | null
  catatan_terapis: string | null
  tarif_per_sesi: number
  started_at: string | null
  completed_at: string | null
  // joined fields
  patient_nama?: string
  no_rekam_medis?: string
  doctor_nama?: string
  practitioner_nama?: string
}

export interface RehabilitationSession extends BaseEntity {
  order_id: string
  sesi_ke: number
  tanggal: string
  waktu_mulai: string | null
  waktu_selesai: string | null
  practitioner_id: string | null
  tindakan: string | null
  hasil: string | null
  catatan_progress: string | null
  skala_nyeri_sebelum: number | null
  skala_nyeri_sesudah: number | null
  rom_sebelum: string | null
  rom_sesudah: string | null
  status: string
  performed_by: string | null
}

export interface PractitionerFeeTransaction {
  id: string
  practitioner_id: string
  order_id: string
  session_id: string | null
  visit_id: string | null
  deskripsi: string
  tarif_sesi: number
  jumlah_practitioner: number
  jumlah_rs: number
  fee_share_persen: number
  fee_share_rs_persen: number
  created_at: string
  // joined
  practitioner_nama?: string
  therapy_type?: string
}
