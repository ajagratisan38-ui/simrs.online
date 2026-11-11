import { apiClient } from './client'

// --- Types ---

export interface BpjsPeserta {
  noKartu: string
  nik: string
  nama: string
  pisa: string
  sex: string
  tglLahir: string
  tglTAT: string
  tglTMT: string
  kdProviderPst: { kdProvider: string; nmProvider: string }
  kdProviderGigi: { kdProvider: string; nmProvider: string }
  jnsKelas: { kode: string; nama: string }
  jnsPeserta: { kode: string; nama: string }
  golDarah: { kode: string; nama: string }
  noHP: string
  noKTP: string
  aktif: boolean
  ketAktif: string
  asuransi: { kdAsuransi: string; nmAsuransi: string; noAsuransi: string; cob: boolean }
  tunggakan: number
}

export interface BpjsRujukan {
  noKunjungan: string
  tglKunjungan: string
  provPerujuk: { kode: string; nama: string }
  diagnosa: { kode: string; nama: string }
  keluhan: string
  pelayanan: { kode: string; nama: string }
  tglBerlakuRujukan: string
}

export interface BpjsSepData {
  noSep: string
  tglSep: string
  jnsPelayanan: string
  kelasRawat: string
  noMR: string
  rujukan: { tglRujukan: string; noRujukan: string; ppkRujukan: string }
  peserta: { noKartu: string; nama: string }
  diagnosa: { kode: string; nama: string }
  poli: { tujuan: string; eksekutif: string }
  catatan: string
}

export interface LakaLantasInput {
  penjamin: string
  tglKejadian?: string
  keterangan?: string
  noSEPSuplesi?: string
  kdPropinsi?: string
  kdKabupaten?: string
  kdKecamatan?: string
}

export interface CreateSepInput {
  noKartu: string
  tglSep: string
  ppkPelayanan: string
  jnsPelayanan: '1' | '2'
  klsRawatHak: string
  noMR: string
  diagAwal: string
  poliTujuan: string
  noTelp: string
  user: string
  catatan?: string
  jaminanLakaLantas?: LakaLantasInput
}

export interface SepQuota {
  limit: number
  used: number
  remaining: number
  isUnlimited: boolean
}

export interface SepQuotaCheck {
  allowed: boolean
  quota: SepQuota
  message: string | null
}

// --- API Calls ---

export async function getSepQuota() {
  return apiClient<{ success: boolean; data: SepQuota }>('/bpjs/sep-quota')
}

export async function checkSepQuota(isIGD = false) {
  const qs = isIGD ? '?igd=true' : ''
  return apiClient<{ success: boolean; data: SepQuotaCheck }>(
    `/bpjs/sep-quota/check${qs}`,
  )
}

export async function getPeserta(noBpjs: string) {
  return apiClient<{ success: boolean; data: BpjsPeserta }>(
    `/bpjs/peserta/${noBpjs}`,
  )
}

export async function getPesertaByNik(nik: string) {
  return apiClient<{ success: boolean; data: BpjsPeserta }>(
    `/bpjs/peserta/nik/${nik}`,
  )
}

export async function getRujukan(noKartu: string) {
  return apiClient<{ success: boolean; data: BpjsRujukan[] }>(
    `/bpjs/rujukan/${noKartu}`,
  )
}

export async function createSep(data: CreateSepInput) {
  return apiClient<{ success: boolean; data: BpjsSepData }>(
    '/bpjs/sep',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export async function getSep(noSep: string) {
  return apiClient<{ success: boolean; data: BpjsSepData }>(
    `/bpjs/sep/${noSep}`,
  )
}

export async function deleteSep(noSep: string, user: string) {
  return apiClient<{ success: boolean }>(
    `/bpjs/sep/${noSep}`,
    { method: 'DELETE', body: JSON.stringify({ user }) },
  )
}

export async function searchPoli(keyword: string) {
  return apiClient<{ success: boolean; data: { kode: string; nama: string }[] }>(
    `/bpjs/referensi/poli?q=${encodeURIComponent(keyword)}`,
  )
}

export async function searchDiagnosa(keyword: string) {
  return apiClient<{ success: boolean; data: { kode: string; nama: string }[] }>(
    `/bpjs/referensi/diagnosa?q=${encodeURIComponent(keyword)}`,
  )
}

// --- Referensi Lanjutan ---

export async function searchProsedur(keyword: string) {
  return apiClient<{ success: boolean; data: { kode: string; nama: string }[] }>(
    `/bpjs/referensi/prosedur?q=${encodeURIComponent(keyword)}`,
  )
}

export async function searchFaskes(keyword: string, jenis = 2) {
  return apiClient<{ success: boolean; data: { kode: string; nama: string; jenis: number }[] }>(
    `/bpjs/referensi/faskes?q=${encodeURIComponent(keyword)}&jenis=${jenis}`,
  )
}

export async function searchDokterBpjs(keyword: string) {
  return apiClient<{ success: boolean; data: { kode: string; nama: string }[] }>(
    `/bpjs/referensi/dokter?q=${encodeURIComponent(keyword)}`,
  )
}

export async function getSpesialistik() {
  return apiClient<{ success: boolean; data: { kode: string; nama: string }[] }>(
    '/bpjs/referensi/spesialistik',
  )
}

// --- Monitoring ---

export interface KunjunganBulanan {
  totalSEP: number
  totalRujukan: number
  totalRanap: number
  totalRajal: number
}

export async function getKunjunganBulanan(tahun: string, bulan: string) {
  return apiClient<{ success: boolean; data: KunjunganBulanan }>(
    `/bpjs/monitoring/kunjungan/${tahun}/${bulan}`,
  )
}

// --- PCare ---

export interface PcareKunjunganRow {
  noKunjungan: string
  tglDaftar: string
  noKartu?: string
  nmPeserta?: string
  kdPoli?: string
  nmPoli?: string
  kdDokter?: string
  nmDokter?: string
  kdDiag1?: string
  nmDiag1?: string
  terpiKirim?: boolean
}

export interface PcareObatRow {
  kdObat: string
  nmObat: string
  signa1?: string
  signa2?: string
  jmlObat?: string
}

export async function pcareCreatePendaftaran(data: Record<string, unknown>) {
  return apiClient<{ success: boolean; data: { noUrut: string; message: string } }>(
    '/bpjs/pcare/pendaftaran',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export async function pcareDeletePendaftaran(noUrut: string, tglDaftar: string) {
  return apiClient<{ success: boolean }>(
    `/bpjs/pcare/pendaftaran/${noUrut}/tgl/${tglDaftar}`,
    { method: 'DELETE' },
  )
}

export async function pcareCreateKunjungan(data: Record<string, unknown>) {
  return apiClient<{ success: boolean; data: { noKunjungan: string; message: string } }>(
    '/bpjs/pcare/kunjungan',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export async function pcareGetKunjungan(tglDaftar: string, offset = 0, limit = 20) {
  return apiClient<{ success: boolean; data: { list: PcareKunjunganRow[]; count: number } }>(
    `/bpjs/pcare/kunjungan/tanggal/${tglDaftar}?offset=${offset}&limit=${limit}`,
  )
}

export async function pcareGetRiwayatKunjungan(noKartu: string) {
  return apiClient<{ success: boolean; data: PcareKunjunganRow[] }>(
    `/bpjs/pcare/kunjungan/riwayat/${noKartu}`,
  )
}

export async function pcareSearchObat(keyword: string) {
  return apiClient<{ success: boolean; data: PcareObatRow[] }>(
    `/bpjs/pcare/obat?q=${encodeURIComponent(keyword)}`,
  )
}

// --- e-Klaim / INACBG ---

export interface EklaimGroupingResult {
  cbgCode: string
  cbgDesc: string
  tarif: number
  tarifGdg: number
  tarifRS: number
  topUp: number
}

export interface EklaimClaimData {
  noSep: string
  status: string
  statusLabel: string
  cbgCode: string
  cbgDesc: string
  tarif: number
  diagnosa?: { kode: string; nama: string }[]
  prosedur?: { kode: string; nama: string }[]
}

export interface EklaimClaimListItem {
  noSep: string
  noRM: string
  namaPasien: string
  tglMasuk: string
  tglPulang: string
  cbgCode: string
  tarif: number
  status: string
  statusLabel: string
}

export async function eklaimGrouping(data: Record<string, unknown>) {
  return apiClient<{ success: boolean; data: EklaimGroupingResult }>(
    '/bpjs/eklaim/grouping',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export async function eklaimGetClaim(noSep: string) {
  return apiClient<{ success: boolean; data: EklaimClaimData }>(
    `/bpjs/eklaim/claim/${noSep}`,
  )
}

export async function eklaimListClaims(params: {
  tglMasuk: string; tglPulang: string; jenisPelayanan?: string; status?: string
}) {
  const sp = new URLSearchParams({
    tglMasuk: params.tglMasuk,
    tglPulang: params.tglPulang,
  })
  if (params.jenisPelayanan) sp.set('jenisPelayanan', params.jenisPelayanan)
  if (params.status) sp.set('status', params.status)
  return apiClient<{ success: boolean; data: { list: EklaimClaimListItem[]; count: number } }>(
    `/bpjs/eklaim/claims?${sp.toString()}`,
  )
}

export async function eklaimGetClaimStatus(noSep: string) {
  return apiClient<{ success: boolean; data: EklaimClaimData }>(
    `/bpjs/eklaim/status/${noSep}`,
  )
}

export async function eklaimDeleteClaim(noSep: string) {
  return apiClient<{ success: boolean }>(`/bpjs/eklaim/claim/${noSep}`, { method: 'DELETE' })
}

// --- Aplicare ---

export interface AplicareBedRow {
  kodekelas: string
  namakelas: string
  kapasitas: number
  tersedia: number
  tersediaPria: number
  tersediaWanita: number
}

export async function aplicareGetBedAvailability(ppkCode: string) {
  return apiClient<{ success: boolean; data: AplicareBedRow[] }>(
    `/bpjs/aplicare/bed/${ppkCode}`,
  )
}

// --- Antrol (Antrean Online BPJS) ---

export interface AntrolPoliRef {
  kodepoli: string
  namapoli: string
  jnspoli?: string
}

export interface AntrolDokterRef {
  kodedokter: string
  namadokter: string
}

export interface AntrolJadwalDokter {
  kodedokter: string
  namadokter: string
  kodepoli: string
  namapoli: string
  hari: string
  jampraktek: string
  kapasitasperjam: number
  libur: boolean
}

export interface AntrolTaskItem {
  kodebooking: string
  nomorkartu: string
  nik: string
  nohp: string
  namapasien: string
  kodepoli: string
  namapoli: string
  kodedokter: string
  namadokter: string
  tanggalperiksa: string
  jampraktek: string
  jeniskunjungan: number
  nomorreferensi: string
  nomorantrean: string
  angkaantrean: number
  estimasidilayani: number
  siession: number
  taskid: number
  taskname: string
  waktu: number
}

export interface AntrolAddInput {
  nomorkartu: string
  nik: string
  nohp: string
  kodepoli: string
  namapoli: string
  paession: number
  tanggalperiksa: string
  kodedokter: string
  namadokter: string
  jampraktek: string
  jeniskunjungan: number
  nomorreferensi: string
  nomorantrean?: string
  angkaantrean?: number
  estimasidilayani?: number
  siession: number
}

export interface AntrolAddResult {
  nomorantrean: string
  angkaantrean: number
  kodebooking: string
  estimasidilayani: number
}

export interface AntrolUpdateInput {
  kodebooking: string
  taskid: number
  waktu: number
}

export interface AntrolBatalInput {
  kodebooking: string
  keterangan: string
}

export interface AntrolDashboard {
  tanggal?: string
  bulan?: string
  tahun?: string
  totalAntrean: number
  totalCheckin: number
  totalDilayani: number
  totalSelesai: number
  totalBatal: number
  perPoli: Array<{
    kodepoli: string
    namapoli: string
    totalAntrean: number
    totalCheckin: number
    totalDilayani: number
    totalSelesai: number
  }>
}

export async function antrolRefPoli() {
  return apiClient<{ success: boolean; data: AntrolPoliRef[] }>(
    '/bpjs/antrol/ref/poli',
  )
}

export async function antrolRefDokter() {
  return apiClient<{ success: boolean; data: AntrolDokterRef[] }>(
    '/bpjs/antrol/ref/dokter',
  )
}

export async function antrolGetJadwalDokter(kodePoli: string, tanggal: string) {
  return apiClient<{ success: boolean; data: AntrolJadwalDokter[] }>(
    `/bpjs/antrol/jadwal/${kodePoli}/${tanggal}`,
  )
}

export async function antrolTambahAntrean(data: AntrolAddInput) {
  return apiClient<{ success: boolean; data: AntrolAddResult }>(
    '/bpjs/antrol/antrean',
    { method: 'POST', body: JSON.stringify(data) },
  )
}

export async function antrolUpdateAntrean(data: AntrolUpdateInput) {
  return apiClient<{ success: boolean }>(
    '/bpjs/antrol/antrean',
    { method: 'PUT', body: JSON.stringify(data) },
  )
}

export async function antrolBatalAntrean(data: AntrolBatalInput) {
  return apiClient<{ success: boolean }>(
    '/bpjs/antrol/batal',
    { method: 'PUT', body: JSON.stringify(data) },
  )
}

export async function antrolGetListTask(kodePoli: string, tanggal: string) {
  return apiClient<{ success: boolean; data: AntrolTaskItem[] }>(
    `/bpjs/antrol/tasks/${kodePoli}/${tanggal}`,
  )
}

export async function antrolSyncTasks(kodePoli: string, tanggal: string) {
  return apiClient<{ success: boolean; data: { synced: number }; message: string }>(
    `/bpjs/antrol/sync/${kodePoli}/${tanggal}`,
    { method: 'POST' },
  )
}

export async function antrolGetDashboard(params: {
  mode?: 'tanggal' | 'bulan'
  tanggal?: string
  bulan?: string
  tahun?: string
  waktu?: string
}) {
  const sp = new URLSearchParams()
  if (params.mode) sp.set('mode', params.mode)
  if (params.tanggal) sp.set('tanggal', params.tanggal)
  if (params.bulan) sp.set('bulan', params.bulan)
  if (params.tahun) sp.set('tahun', params.tahun)
  if (params.waktu) sp.set('waktu', params.waktu)
  return apiClient<{ success: boolean; data: AntrolDashboard }>(
    `/bpjs/antrol/dashboard?${sp.toString()}`,
  )
}
