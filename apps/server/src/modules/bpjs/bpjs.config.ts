import { env } from '../../config/env'

// --- BPJS Environment ---
// Sandbox: https://apijkn-dev.bpjs-kesehatan.go.id
// Production: https://apijkn.bpjs-kesehatan.go.id

const BPJS_SANDBOX_URL = 'https://apijkn-dev.bpjs-kesehatan.go.id'
const BPJS_PRODUCTION_URL = 'https://apijkn.bpjs-kesehatan.go.id'

export const bpjsConfig = {
  consumerId: env.bpjs.consumerId,
  consumerSecret: env.bpjs.consumerSecret,
  baseUrl: env.bpjs.baseUrl || (env.isProd ? BPJS_PRODUCTION_URL : BPJS_SANDBOX_URL),

  // API path prefixes
  vclaim: '/VClaim/rest',
  pcare: '/pcare/rest',
  aplicare: '/aplicare/rest',
  antrol: '/Antrean/rest',

  // Timeout & retry
  timeout: 30_000,
  maxRetries: 3,
  retryBaseDelay: 1000,

  // Feature flags
  useMock: !env.bpjs.consumerId || env.bpjs.consumerId === 'mock',
} as const

// --- VClaim endpoints ---
export const VCLAIM_ENDPOINTS = {
  // Peserta
  peserta: (noBpjs: string) => `/Peserta/${noBpjs}`,
  pesertaByNik: (nik: string) => `/Peserta/nik/${nik}`,

  // SEP
  sepInsert: '/SEP/2.0/insert',
  sepUpdate: '/SEP/2.0/update',
  sepDelete: (noSep: string) => `/SEP/2.0/delete/${noSep}`,
  sepGet: (noSep: string) => `/SEP/${noSep}`,

  // Rujukan
  rujukanByKartu: (noKartu: string) => `/Rujukan/Peserta/${noKartu}`,
  rujukanByNomor: (noRujukan: string) => `/Rujukan/${noRujukan}`,

  // Referensi
  refPoli: (keyword: string) => `/referensi/poli/${encodeURIComponent(keyword)}`,
  refDiagnosa: (keyword: string) => `/referensi/diagnosa/${encodeURIComponent(keyword)}`,
  refProsedur: (keyword: string) => `/referensi/prosedur/${encodeURIComponent(keyword)}`,
  refFaskes: (keyword: string, jenis: number) =>
    `/referensi/faskes/${encodeURIComponent(keyword)}/${jenis}`,
  refDokter: (keyword: string) => `/referensi/dokter/${encodeURIComponent(keyword)}`,
  refSpesialistik: () => '/referensi/spesialistik',

  // Monitoring
  kunjunganBulanan: (tahun: string, bulan: string) =>
    `/Monitoring/Kunjungan/${tahun}/${bulan}`,
} as const

// --- PCare endpoints ---
export const PCARE_ENDPOINTS = {
  // Pendaftaran
  pendaftaranInsert: '/pendaftaran',
  pendaftaranUpdate: '/pendaftaran',
  pendaftaranDelete: (noUrut: string, tglDaftar: string) =>
    `/pendaftaran/peserta/${noUrut}/tglDaftar/${tglDaftar}`,

  // Kunjungan
  kunjunganInsert: '/kunjungan',
  kunjunganUpdate: '/kunjungan',
  kunjunganDelete: (noKunjungan: string) => `/kunjungan/${noKunjungan}`,
  kunjunganByTanggal: (tglDaftar: string, offset: number, limit: number) =>
    `/kunjungan/peserta/tglDaftar/${tglDaftar}/offset/${offset}/limit/${limit}`,

  // Riwayat kunjungan peserta
  riwayatKunjungan: (noKartu: string) => `/kunjungan/peserta/${noKartu}`,

  // Obat DPHO
  obatDpho: (keyword: string) => `/obat/dpho/jenisObat/all/cari/${encodeURIComponent(keyword)}`,

  // Diagnosa
  diagnosaPcare: (keyword: string) => `/diagnosa/${encodeURIComponent(keyword)}`,

  // Tindakan
  tindakanPcare: (keyword: string, tglDaftar: string) =>
    `/tindakan/kdTkp/10/tglPelayanan/${tglDaftar}/cari/${encodeURIComponent(keyword)}`,

  // Provider
  providerByJenis: (jenis: string) => `/provider/jenis/${jenis}`,

  // Kelompok peserta
  kesadaran: () => '/kesadaran',
} as const

// --- e-Klaim / INACBG endpoints ---
export const EKLAIM_ENDPOINTS = {
  // Grouper
  groupingStage1: '/api/eklaim/claim/new',
  groupingStage2: '/api/eklaim/claim/edit',
  groupingFinal: '/api/eklaim/claim/final',

  // Klaim
  getClaimData: (noSep: string) => `/api/eklaim/claim/get/${noSep}`,
  deleteClaimData: (noSep: string) => `/api/eklaim/claim/delete/${noSep}`,
  listClaimData: (tglMasuk: string, tglPulang: string, jenisPelayanan: string, status: string) =>
    `/api/eklaim/claim/get-list/tglMasuk/${tglMasuk}/tglPulang/${tglPulang}/jnsPelayanan/${jenisPelayanan}/status/${status}`,

  // Re-grouping
  reGrouping: '/api/eklaim/claim/reGrouping',

  // Status klaim
  statusKlaim: (noSep: string) => `/api/eklaim/claim/status/${noSep}`,
} as const

// --- Aplicare endpoints ---
export const APLICARE_ENDPOINTS = {
  // Ketersediaan tempat tidur
  bedAvailability: (ppkCode: string) => `/bed/read/${ppkCode}`,
  bedUpdate: '/bed/update',
} as const

// --- Antrol (Antrean Online) endpoints ---
export const ANTROL_ENDPOINTS = {
  // Referensi
  refPoli: '/ref/poli',
  refDokter: '/ref/dokter',
  refJadwalDokter: (kodePoli: string, tanggal: string) =>
    `/jadwaldokter/kodepoli/${kodePoli}/tanggal/${tanggal}`,

  // Antrean — RS push schedule & manage
  tambahAntrean: '/antrean/add',
  updateAntrean: '/antrean/update',
  batalAntrean: '/antrean/batal',

  // Task list (antrian dari Mobile JKN yang perlu diproses RS)
  listTaskId: (kodePoli: string, tanggal: string) =>
    `/antrean/getlisttask/kodepoli/${kodePoli}/tanggal/${tanggal}`,

  // Dashboard antrean
  dashboardPerTanggal: (tanggal: string, waktu: string) =>
    `/dashboard/wpipertanggal/${tanggal}/${waktu}`,
  dashboardPerBulan: (bulan: string, tahun: string, waktu: string) =>
    `/dashboard/wpiperbulan/${bulan}/${tahun}/${waktu}`,
} as const
