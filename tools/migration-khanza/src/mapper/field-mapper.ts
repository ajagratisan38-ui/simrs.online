import { v4 as uuidv4 } from 'uuid'
import { logger } from '../logger'

// --- Utility functions ---

function trimStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function cleanNik(val: unknown): string {
  const raw = trimStr(val).replace(/\D/g, '')
  if (raw.length === 0) return ''
  return raw.padStart(16, '0').slice(0, 16)
}

function cleanDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '' || val === '0000-00-00') return null
  const str = String(val)
  const d = new Date(str)
  if (isNaN(d.getTime())) return null
  if (d.getFullYear() < 1900 || d.getFullYear() > 2100) return null
  return d.toISOString().slice(0, 10)
}

function cleanDateTime(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null
  const str = String(val)
  if (str.startsWith('0000')) return null
  const d = new Date(str)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

function cleanPhone(val: unknown): string {
  let raw = trimStr(val).replace(/[\s\-().]/g, '')
  if (raw.length === 0) return ''
  if (raw.startsWith('+62')) raw = '0' + raw.slice(3)
  if (raw.startsWith('62') && raw.length > 10) raw = '0' + raw.slice(2)
  if (!raw.startsWith('0') && raw.length >= 9) raw = '0' + raw
  return raw
}

function cleanGender(val: unknown): 'L' | 'P' {
  const raw = trimStr(val).toUpperCase()
  if (raw === 'P' || raw === 'PEREMPUAN' || raw === 'W' || raw === 'WANITA' || raw === 'F') {
    return 'P'
  }
  return 'L'
}

function cleanMoney(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  const n = Number(val)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

function toInt(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  const n = parseInt(String(val), 10)
  return isNaN(n) ? 0 : n
}

// --- ID cache for cross-table references ---
export class IdMapping {
  private maps = new Map<string, Map<string, string>>()

  set(table: string, sourceKey: string, uuid: string): void {
    if (!this.maps.has(table)) this.maps.set(table, new Map())
    this.maps.get(table)!.set(sourceKey, uuid)
  }

  get(table: string, sourceKey: string): string | undefined {
    return this.maps.get(table)?.get(sourceKey)
  }

  getOrCreate(table: string, sourceKey: string): string {
    const existing = this.get(table, sourceKey)
    if (existing) return existing
    const id = uuidv4()
    this.set(table, sourceKey, id)
    return id
  }

  size(table: string): number {
    return this.maps.get(table)?.size ?? 0
  }
}

// --- Mapper interface ---
export interface MappedRow {
  data: Record<string, unknown>
  warnings: string[]
}

export type RowMapper = (
  row: Record<string, unknown>,
  ids: IdMapping,
) => MappedRow | null

// --- PASIEN → patients ---
export const mapPasien: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const sourceKey = trimStr(row.no_rkm_medis)
  if (!sourceKey) {
    warnings.push('no_rkm_medis kosong, skip')
    return null
  }

  const id = ids.getOrCreate('patients', sourceKey)
  const nik = cleanNik(row.no_ktp)
  if (nik.length !== 16 || nik === '0000000000000000') {
    warnings.push(`NIK invalid: "${trimStr(row.no_ktp)}" → "${nik}"`)
  }

  const tglLahir = cleanDate(row.tgl_lahir)
  if (!tglLahir) {
    warnings.push(`Tanggal lahir invalid: "${String(row.tgl_lahir)}"`)
  }

  const data: Record<string, unknown> = {
    id,
    no_rekam_medis: sourceKey,
    nik: nik || `TEMP-${sourceKey}`,
    nama: trimStr(row.nm_pasien) || 'TANPA NAMA',
    tempat_lahir: trimStr(row.tmp_lahir) || '-',
    tanggal_lahir: tglLahir || '1900-01-01',
    jenis_kelamin: cleanGender(row.jk),
    golongan_darah: trimStr(row.gol_darah) || null,
    alamat: trimStr(row.alamat) || '-',
    rt: trimStr(row.rt) || null,
    rw: trimStr(row.rw) || null,
    kelurahan: trimStr(row.kelurahan) || null,
    kecamatan: trimStr(row.kecamatan) || null,
    kabupaten: trimStr(row.kabupaten) || null,
    provinsi: trimStr(row.propinsi) || null,
    kode_pos: trimStr(row.kd_pos) || null,
    no_telepon: cleanPhone(row.no_tlp),
    email: trimStr(row.email) || null,
    pekerjaan: trimStr(row.pekerjaan) || null,
    pendidikan: trimStr(row.pnd) || null,
    status_pernikahan: trimStr(row.stts_nikah) || null,
    nama_keluarga: trimStr(row.namakeluarga) || null,
    no_telepon_keluarga: cleanPhone(row.no_tlp_keluarga),
    hubungan_keluarga: trimStr(row.keluarga) || null,
    no_bpjs: trimStr(row.no_peserta) || null,
    kelas_bpjs: row.kelas ? toInt(row.kelas) : null,
    is_active: true,
    created_at: cleanDateTime(row.tgl_daftar) || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- DOKTER → users + doctors ---
export const mapDokter: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const kd = trimStr(row.kd_dokter)
  if (!kd) return null

  const userId = ids.getOrCreate('users', `doctor-${kd}`)
  const doctorId = ids.getOrCreate('doctors', kd)

  const data: Record<string, unknown> = {
    _type: 'doctor_bundle',
    user: {
      id: userId,
      email: `dr-${kd}@khanza-import.local`,
      password_hash: '$2b$12$placeholder.migration.hash',
      name: trimStr(row.nm_dokter) || `Dokter ${kd}`,
      role: 'dokter',
      is_active: trimStr(row.status) === '1',
      phone: cleanPhone(row.no_telp),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    doctor: {
      id: doctorId,
      user_id: userId,
      spesialisasi: trimStr(row.spesialis) || null,
      no_sip: trimStr(row.no_sip) || null,
      no_str: null,
      tarif_konsultasi: cleanMoney(row.tarif),
      is_available: trimStr(row.status) === '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }

  return { data, warnings }
}

// --- POLIKLINIK → rooms ---
export const mapPoliklinik: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const kd = trimStr(row.kd_poli)
  if (!kd) return null

  const id = ids.getOrCreate('rooms', `poli-${kd}`)

  const data: Record<string, unknown> = {
    id,
    kode: kd,
    nama: trimStr(row.nm_poli) || `Poli ${kd}`,
    tipe: 'poli',
    lantai: null,
    kapasitas: 1,
    tarif_per_hari: 0,
    is_active: trimStr(row.status) === '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- BANGSAL → rooms (rawat_inap) ---
export const mapBangsal: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const kd = trimStr(row.kd_bangsal)
  if (!kd) return null

  const id = ids.getOrCreate('rooms', `bangsal-${kd}`)

  const data: Record<string, unknown> = {
    id,
    kode: kd,
    nama: trimStr(row.nm_bangsal) || `Bangsal ${kd}`,
    tipe: 'rawat_inap',
    lantai: null,
    kapasitas: toInt(row.kapasitas) || 10,
    tarif_per_hari: cleanMoney(row.trf_kamar),
    is_active: trimStr(row.status) === '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- DATABARANG → drugs ---
export const mapDatabarang: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const kode = trimStr(row.kode_brng)
  if (!kode) return null

  const id = ids.getOrCreate('drugs', kode)

  const kategoriRaw = trimStr(row.kode_kategori).toLowerCase()
  let kategori = 'obat'
  if (kategoriRaw.includes('alkes')) kategori = 'alkes'
  else if (kategoriRaw.includes('bhp') || kategoriRaw.includes('bmhp')) kategori = 'bmhp'

  const data: Record<string, unknown> = {
    id,
    kode,
    nama: trimStr(row.nama_brng) || `Barang ${kode}`,
    nama_generik: trimStr(row.nama_generik) || null,
    kategori,
    satuan_kecil: trimStr(row.kode_sat) || 'tablet',
    satuan_besar: trimStr(row.kode_satbsr) || null,
    konversi: toInt(row.letak) || 1,
    harga_beli: cleanMoney(row.h_beli),
    harga_jual: cleanMoney(row.ralan),
    margin_persen: 0,
    stok_minimum: toInt(row.stokminimal) || 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- GUDANGBARANG → drug_stocks ---
export const mapGudangbarang: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const kode = trimStr(row.kode_brng)
  if (!kode) return null

  const drugId = ids.get('drugs', kode)
  if (!drugId) {
    warnings.push(`Drug not found for kode: ${kode}`)
    return null
  }

  const id = uuidv4()
  const data: Record<string, unknown> = {
    id,
    drug_id: drugId,
    batch_number: trimStr(row.no_batch) || null,
    tanggal_kadaluarsa: cleanDate(row.kadaluarsa),
    stok_awal: toInt(row.stok),
    stok_sisa: toInt(row.stok),
    harga_beli_per_unit: cleanMoney(row.h_beli),
    supplier: trimStr(row.nama_suplier) || null,
    tanggal_masuk: cleanDate(row.tanggal) || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- REG_PERIKSA → visits ---
export const mapRegPeriksa: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const noRm = trimStr(row.no_rkm_medis)
  const patientId = ids.get('patients', noRm)
  if (!patientId) {
    warnings.push(`Patient not found for no_rkm_medis: ${noRm}`)
    return null
  }

  const kdPoli = trimStr(row.kd_poli)
  const roomId = ids.get('rooms', `poli-${kdPoli}`)
  const kdDokter = trimStr(row.kd_dokter)
  const doctorId = ids.get('doctors', kdDokter)

  const visitId = ids.getOrCreate('visits', noRawat)

  const stts = trimStr(row.stts).toLowerCase()
  let status = 'selesai'
  if (stts === 'belum') status = 'menunggu'
  else if (stts === 'sudah') status = 'selesai'
  else if (stts === 'batal') status = 'batal'
  else if (stts === 'dirujuk') status = 'selesai'

  const tglReg = cleanDate(row.tgl_registrasi)
  const jamReg = trimStr(row.jam_reg)
  let createdAt = tglReg ? `${tglReg}T${jamReg || '08:00:00'}` : new Date().toISOString()
  if (isNaN(new Date(createdAt).getTime())) {
    createdAt = new Date().toISOString()
  }

  const penjamin = trimStr(row.kd_pj).toLowerCase()
  let penjaminType = 'umum'
  if (penjamin.includes('bpjs') || penjamin === 'bpj') penjaminType = 'bpjs'
  else if (penjamin.includes('asur')) penjaminType = 'asuransi'
  else if (penjamin.includes('perus')) penjaminType = 'perusahaan'

  const data: Record<string, unknown> = {
    id: visitId,
    patient_id: patientId,
    visit_number: `KJ-IMPORT-${noRawat.replace(/\//g, '-')}`,
    tipe: 'rawat_jalan',
    status,
    tanggal: tglReg || new Date().toISOString().slice(0, 10),
    room_id: roomId || null,
    doctor_id: doctorId || null,
    penjamin: penjaminType,
    no_rujukan: trimStr(row.no_rujukan) || null,
    no_sep: trimStr(row.no_sep) || null,
    cara_masuk: 'datang_sendiri',
    catatan: trimStr(row.almt_pj) || null,
    created_at: createdAt,
    updated_at: createdAt,
  }

  return { data, warnings }
}

// --- RAWAT_JL_DR → medical_records (partial) ---
export const mapRawatJlDr: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const visitId = ids.get('visits', noRawat)
  if (!visitId) {
    warnings.push(`Visit not found for no_rawat: ${noRawat}`)
    return null
  }

  const noRm = trimStr(row.no_rkm_medis)
  const patientId = ids.get('patients', noRm)

  const kdDokter = trimStr(row.kd_dokter)
  const doctorId = ids.get('doctors', kdDokter)

  const mrKey = `${noRawat}::${kdDokter}`
  const mrId = ids.getOrCreate('medical_records', mrKey)

  const tglPeriksa = cleanDate(row.tgl_perawatan)
  const jamPeriksa = trimStr(row.jam_rawat)
  let created = tglPeriksa ? `${tglPeriksa}T${jamPeriksa || '08:00:00'}` : new Date().toISOString()
  if (isNaN(new Date(created).getTime())) created = new Date().toISOString()

  const data: Record<string, unknown> = {
    id: mrId,
    visit_id: visitId,
    patient_id: patientId || null,
    doctor_id: doctorId || null,
    subjective: null,
    objective: null,
    assessment: null,
    plan: null,
    vital_signs: {},
    status: 'final',
    created_at: created,
    updated_at: created,
  }

  return { data, warnings }
}

// --- DIAGNOSA_PASIEN → diagnoses ---
export const mapDiagnosaPasien: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const visitId = ids.get('visits', noRawat)
  if (!visitId) return null

  const kdDokter = trimStr(row.kd_dokter)
  const mrKey = `${noRawat}::${kdDokter}`
  let mrId = ids.get('medical_records', mrKey)

  if (!mrId) {
    const genericKey = `${noRawat}::generic`
    mrId = ids.getOrCreate('medical_records', genericKey)
  }

  const id = uuidv4()
  const icdCode = trimStr(row.kd_penyakit)
  const prioritas = trimStr(row.prioritas)

  const data: Record<string, unknown> = {
    id,
    medical_record_id: mrId,
    icd10_code: icdCode,
    icd10_name: trimStr(row.nm_penyakit) || icdCode,
    tipe: prioritas === '1' ? 'utama' : 'sekunder',
    catatan: null,
    created_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- BILLING + DETAIL_NOTA_JALAN → bills + bill_items ---
export const mapBilling: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const visitId = ids.get('visits', noRawat)
  if (!visitId) return null

  const noRm = trimStr(row.no_rkm_medis)
  const patientId = ids.get('patients', noRm)
  if (!patientId) return null

  const billId = ids.getOrCreate('bills', noRawat)

  const data: Record<string, unknown> = {
    id: billId,
    visit_id: visitId,
    patient_id: patientId,
    total_amount: cleanMoney(row.totalbiaya),
    discount_amount: 0,
    final_amount: cleanMoney(row.totalbiaya),
    penjamin: 'umum',
    status: trimStr(row.status) === 'Sudah' ? 'dibayar' : 'draft',
    catatan: null,
    created_at: cleanDateTime(row.tgl_billing) || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return { data, warnings }
}

export const mapDetailNotaJalan: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const billId = ids.get('bills', noRawat)
  if (!billId) return null

  const id = uuidv4()

  const namaItem = trimStr(row.nama_bayar) || 'Item'
  let kategori = 'admin'
  const lower = namaItem.toLowerCase()
  if (lower.includes('obat') || lower.includes('resep')) kategori = 'obat'
  else if (lower.includes('konsul') || lower.includes('visite')) kategori = 'konsultasi'
  else if (lower.includes('tindakan') || lower.includes('operasi')) kategori = 'tindakan'
  else if (lower.includes('kamar') || lower.includes('bangsal')) kategori = 'kamar'
  else if (lower.includes('lab')) kategori = 'lab'
  else if (lower.includes('radio') || lower.includes('rontgen')) kategori = 'radiologi'

  const data: Record<string, unknown> = {
    id,
    bill_id: billId,
    kategori,
    deskripsi: namaItem,
    qty: 1,
    harga_satuan: cleanMoney(row.besar_bayar),
    subtotal: cleanMoney(row.besar_bayar),
    discount: 0,
    total: cleanMoney(row.besar_bayar),
    referensi_id: null,
    referensi_tipe: null,
    created_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- PETUGAS → users (staff/perawat) ---
export const mapPetugas: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const nip = trimStr(row.nip)
  if (!nip) return null

  const existingUser = ids.get('users', `staff-${nip}`)
  if (existingUser) return null

  const userId = ids.getOrCreate('users', `staff-${nip}`)

  const jabatan = trimStr(row.jnj_jabatan).toLowerCase()
  let role = 'perawat'
  if (jabatan.includes('apoteker') || jabatan.includes('farmasi')) role = 'apoteker'
  else if (jabatan.includes('admin')) role = 'admin'
  else if (jabatan.includes('kasir') || jabatan.includes('keuangan')) role = 'kasir'
  else if (jabatan.includes('rekam') || jabatan.includes('medis')) role = 'rekam_medis'
  else if (jabatan.includes('lab')) role = 'lab'
  else if (jabatan.includes('radio')) role = 'radiologi'
  else if (jabatan.includes('pendaftaran') || jabatan.includes('loket')) role = 'pendaftaran'

  const data: Record<string, unknown> = {
    _type: 'staff_bundle',
    user: {
      id: userId,
      email: `staff-${nip}@khanza-import.local`,
      password_hash: '$2b$12$placeholder.migration.hash',
      name: trimStr(row.nama) || `Staff ${nip}`,
      role,
      is_active: trimStr(row.stts_aktif) === 'AKTIF',
      phone: cleanPhone(row.no_telp),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }

  return { data, warnings }
}

// --- KAMAR → beds ---
export const mapKamar: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const kdKamar = trimStr(row.kd_kamar)
  if (!kdKamar) return null

  const kdBangsal = trimStr(row.kd_bangsal)
  const roomId = ids.get('rooms', `bangsal-${kdBangsal}`)
  if (!roomId) {
    warnings.push(`Bangsal not found for kd_bangsal: ${kdBangsal}`)
    return null
  }

  const bedId = ids.getOrCreate('beds', kdKamar)

  const statusRaw = trimStr(row.statusdata).toUpperCase()
  let status = 'tersedia'
  if (statusRaw === 'ISI' || statusRaw === 'TERISI') status = 'terisi'
  else if (statusRaw === 'RUSAK') status = 'perbaikan'

  const data: Record<string, unknown> = {
    id: bedId,
    room_id: roomId,
    nomor: kdKamar,
    status,
    current_patient_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- RAWAT_INAP_DR → medical_records (rawat inap doctor) ---
export const mapRawatInapDr: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const visitId = ids.get('visits', noRawat)
  if (!visitId) {
    warnings.push(`Visit not found for no_rawat: ${noRawat}`)
    return null
  }

  const noRm = trimStr(row.no_rkm_medis)
  const patientId = ids.get('patients', noRm)

  const kdDokter = trimStr(row.kd_dokter)
  const doctorId = ids.get('doctors', kdDokter)

  const mrKey = `${noRawat}::${kdDokter}`
  const existingMr = ids.get('medical_records', mrKey)
  if (existingMr) return null

  const mrId = ids.getOrCreate('medical_records', mrKey)

  const tglPeriksa = cleanDate(row.tgl_perawatan)
  const jamPeriksa = trimStr(row.jam_rawat)
  let created = tglPeriksa ? `${tglPeriksa}T${jamPeriksa || '08:00:00'}` : new Date().toISOString()
  if (isNaN(new Date(created).getTime())) created = new Date().toISOString()

  const data: Record<string, unknown> = {
    id: mrId,
    visit_id: visitId,
    patient_id: patientId || null,
    doctor_id: doctorId || null,
    subjective: null,
    objective: null,
    assessment: null,
    plan: null,
    vital_signs: {},
    status: 'final',
    created_at: created,
    updated_at: created,
  }

  return { data, warnings }
}

// --- PEMERIKSAAN_RALAN → medical_records (enrichment: SOAP + vital signs) ---
export const mapPemeriksaanRalan: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const visitId = ids.get('visits', noRawat)
  if (!visitId) return null

  const patientId = ids.get('patients', trimStr(row.no_rkm_medis))

  const kdDokter = trimStr(row.kd_dokter || '')
  let mrId: string | undefined
  if (kdDokter) {
    mrId = ids.get('medical_records', `${noRawat}::${kdDokter}`)
  }
  if (!mrId) {
    mrId = ids.get('medical_records', `${noRawat}::generic`)
  }

  const vitalSigns: Record<string, unknown> = {}
  if (row.suhu_tubuh) vitalSigns.suhu = trimStr(row.suhu_tubuh)
  if (row.tensi) vitalSigns.tensi = trimStr(row.tensi)
  if (row.nadi) vitalSigns.nadi = trimStr(row.nadi)
  if (row.respirasi) vitalSigns.respirasi = trimStr(row.respirasi)
  if (row.tinggi) vitalSigns.tinggi = trimStr(row.tinggi)
  if (row.berat) vitalSigns.berat = trimStr(row.berat)
  if (row.spo2) vitalSigns.spo2 = trimStr(row.spo2)
  if (row.gcs) vitalSigns.gcs = trimStr(row.gcs)
  if (row.kesadaran) vitalSigns.kesadaran = trimStr(row.kesadaran)

  if (mrId) {
    const data: Record<string, unknown> = {
      _type: 'enrich_mr',
      _target_id: mrId,
      subjective: trimStr(row.keluhan) || null,
      objective: trimStr(row.pemeriksaan) || null,
      assessment: trimStr(row.penilaian) || null,
      plan: trimStr(row.rtl) || null,
      vital_signs: JSON.stringify(vitalSigns),
      alergi: row.alergi ? JSON.stringify([trimStr(row.alergi)]) : null,
      catatan_tambahan: trimStr(row.instruksi) || null,
    }
    return { data, warnings }
  }

  const tglPeriksa = cleanDate(row.tgl_perawatan)
  const jamPeriksa = trimStr(row.jam_rawat)
  let created = tglPeriksa ? `${tglPeriksa}T${jamPeriksa || '08:00:00'}` : new Date().toISOString()
  if (isNaN(new Date(created).getTime())) created = new Date().toISOString()

  const newMrId = ids.getOrCreate('medical_records', `${noRawat}::generic`)

  const data: Record<string, unknown> = {
    id: newMrId,
    visit_id: visitId,
    patient_id: patientId || null,
    doctor_id: null,
    subjective: trimStr(row.keluhan) || null,
    objective: trimStr(row.pemeriksaan) || null,
    assessment: trimStr(row.penilaian) || null,
    plan: trimStr(row.rtl) || null,
    vital_signs: JSON.stringify(vitalSigns),
    alergi: row.alergi ? JSON.stringify([trimStr(row.alergi)]) : null,
    catatan_tambahan: trimStr(row.instruksi) || null,
    status: 'final',
    created_at: created,
    updated_at: created,
  }

  return { data, warnings }
}

// --- CATATAN_PERAWATAN → medical_records enrichment ---
export const mapCatatanPerawatan: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const visitId = ids.get('visits', noRawat)
  if (!visitId) return null

  const kdDokter = trimStr(row.kd_dokter || '')
  let mrId: string | undefined
  if (kdDokter) {
    mrId = ids.get('medical_records', `${noRawat}::${kdDokter}`)
  }
  if (!mrId) {
    mrId = ids.get('medical_records', `${noRawat}::generic`)
  }

  const catatan = trimStr(row.catatan)
  if (!catatan) return null

  if (mrId) {
    const data: Record<string, unknown> = {
      _type: 'enrich_mr',
      _target_id: mrId,
      catatan_tambahan: catatan,
    }
    return { data, warnings }
  }

  return null
}

// --- RESEP_OBAT → prescriptions ---
export const mapResepObat: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noResep = trimStr(row.no_resep)
  if (!noResep) return null

  const noRawat = trimStr(row.no_rawat)
  const visitId = ids.get('visits', noRawat)
  if (!visitId) {
    warnings.push(`Visit not found for no_rawat: ${noRawat}`)
    return null
  }

  const kdDokter = trimStr(row.kd_dokter)
  const mrKey = `${noRawat}::${kdDokter}`
  let mrId = ids.get('medical_records', mrKey)
  if (!mrId) {
    mrId = ids.get('medical_records', `${noRawat}::generic`)
  }
  if (!mrId) {
    mrId = ids.getOrCreate('medical_records', `${noRawat}::generic`)
  }

  const prescriptionId = ids.getOrCreate('prescriptions', noResep)

  const tglResep = cleanDate(row.tgl_peresepan)
  const jamResep = trimStr(row.jam_peresepan || row.jam)
  let created = tglResep ? `${tglResep}T${jamResep || '08:00:00'}` : new Date().toISOString()
  if (isNaN(new Date(created).getTime())) created = new Date().toISOString()

  const statusRaw = trimStr(row.status).toLowerCase()
  let status = 'dikirim'
  if (statusRaw === 'sudah') status = 'selesai'
  else if (statusRaw === 'batal') status = 'batal'

  const data: Record<string, unknown> = {
    id: prescriptionId,
    medical_record_id: mrId,
    visit_id: visitId,
    status,
    catatan_dokter: null,
    created_at: created,
    updated_at: created,
  }

  return { data, warnings }
}

// --- DETAIL_PEMBERIAN_OBAT → prescription_items ---
export const mapDetailPemberianObat: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noResep = trimStr(row.no_resep)
  if (!noResep) return null

  const prescriptionId = ids.get('prescriptions', noResep)
  if (!prescriptionId) {
    warnings.push(`Prescription not found for no_resep: ${noResep}`)
    return null
  }

  const kodeBarang = trimStr(row.kode_brng)
  const drugId = ids.get('drugs', kodeBarang)

  const id = uuidv4()
  const namaObat = trimStr(row.nama_brng) || kodeBarang || 'Obat'

  const data: Record<string, unknown> = {
    id,
    prescription_id: prescriptionId,
    drug_id: drugId || null,
    nama_obat: namaObat,
    dosis: trimStr(row.dosis) || null,
    satuan: trimStr(row.satuan) || null,
    frekuensi: trimStr(row.aturan_pakai) || null,
    durasi_hari: null,
    jumlah: toInt(row.jml) || toInt(row.jumlah) || 1,
    aturan_pakai: trimStr(row.aturan_pakai) || null,
    catatan: null,
    created_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- OPERASI → surgeries ---
export const mapOperasi: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const visitId = ids.get('visits', noRawat)
  if (!visitId) {
    warnings.push(`Visit not found for no_rawat: ${noRawat}`)
    return null
  }

  const noRm = trimStr(row.no_rkm_medis)
  const patientId = ids.get('patients', noRm)
  if (!patientId) return null

  const operator1Kd = trimStr(row.operator1)
  const doctorId = ids.get('doctors', operator1Kd)
  if (!doctorId) {
    warnings.push(`Operator1 doctor not found: ${operator1Kd}`)
    return null
  }

  const tglOp = cleanDate(row.tgl_operasi)
  if (!tglOp) return null

  const anestesiKd = trimStr(row.dokter_anestesi)
  const anestesiId = ids.get('doctors', anestesiKd) || null

  const id = uuidv4()
  const nomorOp = `OP-IMPORT-${noRawat.replace(/\//g, '-')}-${id.slice(0, 4)}`

  const statusRaw = trimStr(row.status).toLowerCase()
  let status = 'selesai'
  if (statusRaw === 'batal') status = 'batal'
  else if (statusRaw === 'menunggu' || statusRaw === 'belum') status = 'dijadwalkan'

  const jenisAnestesi = trimStr(row.jenis_anasthesi || row.jns_anasthesi).toLowerCase()
  let anestesiType = 'general'
  if (jenisAnestesi.includes('lokal') || jenisAnestesi.includes('local')) anestesiType = 'lokal'
  else if (jenisAnestesi.includes('regional') || jenisAnestesi.includes('spinal')) anestesiType = 'regional'
  else if (jenisAnestesi.includes('sedasi')) anestesiType = 'sedasi'

  const data: Record<string, unknown> = {
    id,
    nomor_operasi: nomorOp,
    visit_id: visitId,
    patient_id: patientId,
    doctor_id: doctorId,
    tanggal_operasi: tglOp,
    jam_mulai: trimStr(row.jam_mulai) || '08:00:00',
    jam_selesai: null,
    estimasi_durasi_menit: 60,
    ruang_operasi: trimStr(row.kd_kamar) || 'OK-1',
    jenis_operasi: 'elektif',
    jenis_anestesi: anestesiType,
    diagnosis_pre_op: trimStr(row.diagnosa_preop) || trimStr(row.keterangan) || '-',
    diagnosis_post_op: trimStr(row.diagnosa_postop) || null,
    tindakan_rencana: trimStr(row.kode_paket) || trimStr(row.keterangan) || '-',
    tindakan_aktual: null,
    icd9cm_code: null,
    laporan_operasi: null,
    komplikasi: null,
    anestesiolog_id: anestesiId,
    perawat_instrumen: trimStr(row.omloop) || null,
    perawat_sirkuler: null,
    perdarahan_ml: null,
    status,
    catatan: trimStr(row.keterangan) || null,
    created_by: doctorId,
    updated_by: doctorId,
    created_at: `${tglOp}T08:00:00`,
    updated_at: `${tglOp}T08:00:00`,
  }

  return { data, warnings }
}

// --- DETAIL_NOTA_INAP → bill_items (rawat inap billing items) ---
export const mapDetailNotaInap: RowMapper = (row, ids) => {
  const warnings: string[] = []
  const noRawat = trimStr(row.no_rawat)
  if (!noRawat) return null

  const billId = ids.get('bills', noRawat)
  if (!billId) return null

  const id = uuidv4()

  const namaItem = trimStr(row.nama_bayar) || 'Item Ranap'
  let kategori = 'admin'
  const lower = namaItem.toLowerCase()
  if (lower.includes('obat') || lower.includes('resep')) kategori = 'obat'
  else if (lower.includes('konsul') || lower.includes('visite')) kategori = 'konsultasi'
  else if (lower.includes('tindakan') || lower.includes('operasi')) kategori = 'tindakan'
  else if (lower.includes('kamar') || lower.includes('bangsal') || lower.includes('akomodasi')) kategori = 'kamar'
  else if (lower.includes('lab')) kategori = 'lab'
  else if (lower.includes('radio') || lower.includes('rontgen')) kategori = 'radiologi'

  const data: Record<string, unknown> = {
    id,
    bill_id: billId,
    kategori,
    deskripsi: namaItem,
    qty: 1,
    harga_satuan: cleanMoney(row.besar_bayar),
    subtotal: cleanMoney(row.besar_bayar),
    discount: 0,
    total: cleanMoney(row.besar_bayar),
    referensi_id: null,
    referensi_tipe: null,
    created_at: new Date().toISOString(),
  }

  return { data, warnings }
}

// --- Mapper registry ---
export interface TableMapping {
  sourceTable: string
  targetTable: string
  mapper: RowMapper
  priority: number
  isBundled?: boolean
  isEnrichment?: boolean
  enrichTable?: string
}

export function getMappings(): TableMapping[] {
  return [
    // Priority 1 — Master Data
    { sourceTable: 'pasien', targetTable: 'patients', mapper: mapPasien, priority: 1 },
    { sourceTable: 'dokter', targetTable: 'doctors', mapper: mapDokter, priority: 1, isBundled: true },
    { sourceTable: 'petugas', targetTable: 'users', mapper: mapPetugas, priority: 1, isBundled: true },
    { sourceTable: 'poliklinik', targetTable: 'rooms', mapper: mapPoliklinik, priority: 1 },
    { sourceTable: 'bangsal', targetTable: 'rooms', mapper: mapBangsal, priority: 1 },
    { sourceTable: 'kamar', targetTable: 'beds', mapper: mapKamar, priority: 1 },
    // Priority 2 — Data Obat
    { sourceTable: 'databarang', targetTable: 'drugs', mapper: mapDatabarang, priority: 2 },
    // Priority 3 — Stok Obat
    { sourceTable: 'gudangbarang', targetTable: 'drug_stocks', mapper: mapGudangbarang, priority: 3 },
    // Priority 4 — Kunjungan
    { sourceTable: 'reg_periksa', targetTable: 'visits', mapper: mapRegPeriksa, priority: 4 },
    // Priority 5 — Rekam Medis
    { sourceTable: 'rawat_jl_dr', targetTable: 'medical_records', mapper: mapRawatJlDr, priority: 5 },
    { sourceTable: 'rawat_inap_dr', targetTable: 'medical_records', mapper: mapRawatInapDr, priority: 5 },
    // Priority 5.5 — Enrichment (SOAP + Vital Signs)
    { sourceTable: 'pemeriksaan_ralan', targetTable: 'medical_records', mapper: mapPemeriksaanRalan, priority: 55, isEnrichment: true, enrichTable: 'medical_records' },
    { sourceTable: 'catatan_perawatan', targetTable: 'medical_records', mapper: mapCatatanPerawatan, priority: 55, isEnrichment: true, enrichTable: 'medical_records' },
    // Priority 6 — Diagnosa
    { sourceTable: 'diagnosa_pasien', targetTable: 'diagnoses', mapper: mapDiagnosaPasien, priority: 6 },
    // Priority 6.5 — Resep
    { sourceTable: 'resep_obat', targetTable: 'prescriptions', mapper: mapResepObat, priority: 65 },
    { sourceTable: 'detail_pemberian_obat', targetTable: 'prescription_items', mapper: mapDetailPemberianObat, priority: 66 },
    // Priority 7 — Billing & Operasi
    { sourceTable: 'billing', targetTable: 'bills', mapper: mapBilling, priority: 7 },
    { sourceTable: 'operasi', targetTable: 'surgeries', mapper: mapOperasi, priority: 7 },
    // Priority 8 — Detail Billing
    { sourceTable: 'detail_nota_jalan', targetTable: 'bill_items', mapper: mapDetailNotaJalan, priority: 8 },
    { sourceTable: 'detail_nota_inap', targetTable: 'bill_items', mapper: mapDetailNotaInap, priority: 8 },
  ]
}
