import crypto from 'crypto'
import LZString from 'lz-string'
import { bpjsConfig } from './bpjs.config'
import { logger } from '../../shared/logger'
import { AppError } from '../../shared/errors'

// --- BPJS Signature Generation ---
// Spec: HMAC-SHA256(consumerId + "&" + timestamp, consumerSecret)

export function generateSignature(
  consumerId: string,
  consumerSecret: string,
  timestamp: number,
): string {
  const message = `${consumerId}&${timestamp}`
  return crypto
    .createHmac('sha256', consumerSecret)
    .update(message)
    .digest('base64')
}

// --- BPJS Response Decryption ---
// BPJS encrypts response body with:
// 1. Key = consumerID + consumerSecret + timestamp (hashed)
// 2. AES-256-CBC with the key
// 3. Then LZString decompress

function createDecryptionKey(
  consumerId: string,
  consumerSecret: string,
  timestamp: number,
): Buffer {
  const combined = `${consumerId}${consumerSecret}${timestamp}`
  return crypto.createHash('sha256').update(combined).digest()
}

export function decryptBpjsResponse(
  encryptedText: string,
  consumerId: string,
  consumerSecret: string,
  timestamp: number,
): unknown {
  try {
    const key = createDecryptionKey(consumerId, consumerSecret, timestamp)
    const iv = key.subarray(0, 16)

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    decipher.setAutoPadding(true)

    let decrypted = decipher.update(encryptedText, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    // Try parsing as plain JSON first (uncompressed response)
    try {
      return JSON.parse(decrypted)
    } catch {
      // Not plain JSON — try LZString decompress
    }

    const decompressed = LZString.decompressFromEncodedURIComponent(decrypted)
    if (decompressed) {
      return JSON.parse(decompressed)
    }

    throw new Error('Cannot parse decrypted BPJS data')
  } catch (err) {
    logger.warn('BPJS decrypt fallback — trying plain JSON', {
      error: err instanceof Error ? err.message : String(err),
    })
    // Fallback: try parsing as plain JSON
    try {
      return JSON.parse(encryptedText)
    } catch {
      throw new BpjsError(
        'Gagal mendekripsi response BPJS',
        'BPJS_DECRYPT_ERROR',
      )
    }
  }
}

// --- BPJS Error ---

export class BpjsError extends AppError {
  public readonly bpjsCode: string | null

  constructor(
    message: string,
    code = 'BPJS_ERROR',
    statusCode = 502,
    bpjsCode: string | null = null,
  ) {
    super(statusCode, message, code)
    this.bpjsCode = bpjsCode
  }
}

// --- BPJS API Response Shape ---

interface BpjsRawResponse {
  metaData?: {
    code?: string
    message?: string
  }
  response?: unknown
}

export interface BpjsApiResult<T = unknown> {
  code: string
  message: string
  data: T
}

// --- HTTP Client ---

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: Record<string, unknown>
  service?: 'vclaim' | 'pcare' | 'aplicare' | 'antrol'
}

export async function bpjsRequest<T = unknown>(
  options: RequestOptions,
): Promise<BpjsApiResult<T>> {
  const { method, path, body, service = 'vclaim' } = options
  const { consumerId, consumerSecret, baseUrl, timeout, maxRetries, retryBaseDelay } =
    bpjsConfig

  // If mock mode, use mock handler
  if (bpjsConfig.useMock) {
    return handleMockRequest(options)
  }

  if (!consumerId || !consumerSecret) {
    throw new BpjsError(
      'BPJS Consumer ID / Secret belum dikonfigurasi',
      'BPJS_CONFIG_MISSING',
      500,
    )
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = generateSignature(consumerId, consumerSecret, timestamp)

  const servicePath =
    service === 'vclaim'
      ? bpjsConfig.vclaim
      : service === 'pcare'
        ? bpjsConfig.pcare
        : service === 'antrol'
          ? bpjsConfig.antrol
          : bpjsConfig.aplicare

  const url = `${baseUrl}${servicePath}${path}`

  const headers: Record<string, string> = {
    'X-cons-id': consumerId,
    'X-timestamp': String(timestamp),
    'X-signature': signature,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    user_key: consumerId,
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      logger.info('BPJS request', {
        method,
        url,
        attempt,
        timestamp,
      })

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      }
      if (body && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify({ request: body })
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      const responseText = await response.text()

      logger.debug('BPJS raw response', {
        status: response.status,
        bodyLength: responseText.length,
        attempt,
      })

      if (!response.ok) {
        throw new BpjsError(
          `BPJS API error: HTTP ${response.status}`,
          'BPJS_HTTP_ERROR',
          response.status >= 500 ? 502 : response.status,
        )
      }

      // Parse response
      let parsed: BpjsRawResponse
      try {
        parsed = JSON.parse(responseText)
      } catch {
        throw new BpjsError(
          'Response BPJS bukan JSON valid',
          'BPJS_INVALID_RESPONSE',
        )
      }

      const code = parsed.metaData?.code || '0'
      const message = parsed.metaData?.message || ''

      // BPJS returns "200" for success in metaData.code
      if (code !== '200' && code !== '1') {
        throw new BpjsError(
          `BPJS: ${message}`,
          'BPJS_API_ERROR',
          422,
          code,
        )
      }

      // Decrypt response if encrypted
      let data: T
      if (typeof parsed.response === 'string' && parsed.response.length > 0) {
        data = decryptBpjsResponse(
          parsed.response,
          consumerId,
          consumerSecret,
          timestamp,
        ) as T
      } else {
        data = (parsed.response ?? null) as T
      }

      logger.info('BPJS request success', {
        method,
        path,
        code,
      })

      return { code, message, data }
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err instanceof Error ? err : new Error(String(err))

      // Don't retry on client errors (4xx) or BPJS business logic errors
      if (err instanceof BpjsError) {
        if (
          err.code === 'BPJS_API_ERROR' ||
          err.code === 'BPJS_CONFIG_MISSING'
        ) {
          throw err
        }
      }

      logger.warn('BPJS request failed', {
        method,
        path,
        attempt,
        maxRetries,
        error: lastError.message,
      })

      // Exponential backoff
      if (attempt < maxRetries) {
        const delay = retryBaseDelay * Math.pow(2, attempt - 1)
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  logger.error('BPJS request failed after all retries', {
    method,
    path,
    error: lastError?.message,
  })

  throw new BpjsError(
    `BPJS tidak merespons setelah ${maxRetries} percobaan: ${lastError?.message || 'unknown'}`,
    'BPJS_TIMEOUT',
    504,
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ==========================================================
// MOCK HANDLER — Untuk development tanpa koneksi BPJS
// ==========================================================

function handleMockRequest<T>(options: RequestOptions): BpjsApiResult<T> {
  const { method, path } = options

  logger.debug('BPJS mock request', { method, path })

  // Mock peserta
  if (path.startsWith('/Peserta/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: mockPesertaResponse() as T,
    }
  }

  // Mock SEP insert
  if (path.includes('/SEP/2.0/insert') && method === 'POST') {
    return {
      code: '200',
      message: 'Sukses',
      data: mockSepInsertResponse() as T,
    }
  }

  // Mock SEP get
  if (path.startsWith('/SEP/') && method === 'GET') {
    return {
      code: '200',
      message: 'Sukses',
      data: mockSepGetResponse() as T,
    }
  }

  // Mock SEP update
  if (path.includes('/SEP/2.0/update') && method === 'PUT') {
    return {
      code: '200',
      message: 'Sukses',
      data: null as T,
    }
  }

  // Mock SEP delete
  if (path.includes('/SEP/2.0/delete') && method === 'DELETE') {
    return {
      code: '200',
      message: 'Sukses',
      data: null as T,
    }
  }

  // Mock rujukan
  if (path.startsWith('/Rujukan/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: mockRujukanResponse() as T,
    }
  }

  // Mock referensi poli
  if (path.startsWith('/referensi/poli/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: mockPoliReferensiResponse() as T,
    }
  }

  // Mock referensi diagnosa
  if (path.startsWith('/referensi/diagnosa/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: mockDiagnosaReferensiResponse() as T,
    }
  }

  // Mock referensi prosedur
  if (path.startsWith('/referensi/prosedur/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { prosedur: [
        { kode: '89.0', nama: 'Diagnostic interview, consultation, and evaluation' },
        { kode: '93.39', nama: 'Other physical therapy musculoskeletal manipulation' },
        { kode: '99.29', nama: 'Injection or infusion of other therapeutic substance' },
      ] } as T,
    }
  }

  // Mock referensi faskes
  if (path.startsWith('/referensi/faskes/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { faskes: [
        { kode: '0301U010', nama: 'PUSKESMAS CISARUA', jenis: 1 },
        { kode: '0301R001', nama: 'RS CIBABAT', jenis: 2 },
        { kode: '0301R002', nama: 'RS HASAN SADIKIN', jenis: 2 },
      ] } as T,
    }
  }

  // Mock referensi dokter
  if (path.startsWith('/referensi/dokter/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { dokter: [
        { kode: 'DR001', nama: 'dr. Budi Santoso, Sp.PD' },
        { kode: 'DR002', nama: 'dr. Siti Aminah, Sp.A' },
        { kode: 'DR003', nama: 'dr. Ahmad Faisal, Sp.B' },
      ] } as T,
    }
  }

  // Mock referensi spesialistik
  if (path.startsWith('/referensi/spesialistik')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { spesialis: [
        { kode: 'INT', nama: 'Penyakit Dalam' },
        { kode: 'ANA', nama: 'Anak' },
        { kode: 'BED', nama: 'Bedah' },
        { kode: 'OBG', nama: 'Kebidanan & Kandungan' },
        { kode: 'SAR', nama: 'Saraf' },
        { kode: 'JAN', nama: 'Jantung & Pembuluh Darah' },
        { kode: 'PAR', nama: 'Paru' },
        { kode: 'KUL', nama: 'Kulit & Kelamin' },
        { kode: 'MAT', nama: 'Mata' },
        { kode: 'THT', nama: 'THT' },
        { kode: 'ORT', nama: 'Ortopedi & Traumatologi' },
        { kode: 'URO', nama: 'Urologi' },
      ] } as T,
    }
  }

  // Mock monitoring kunjungan
  if (path.startsWith('/Monitoring/Kunjungan/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { kunjungan: {
        totalSEP: 245,
        totalRujukan: 180,
        totalRanap: 30,
        totalRajal: 215,
      } } as T,
    }
  }

  // PCare mock: pendaftaran
  if (path === '/pendaftaran' && method === 'POST') {
    return {
      code: '200',
      message: 'Sukses',
      data: { noUrut: String(Math.floor(1 + Math.random() * 50)), message: 'Pendaftaran berhasil' } as T,
    }
  }

  // PCare mock: kunjungan
  if (path === '/kunjungan' && method === 'POST') {
    return {
      code: '200',
      message: 'Sukses',
      data: { noKunjungan: `KJ${Date.now().toString().slice(-8)}`, message: 'Kunjungan berhasil dicatat' } as T,
    }
  }

  // PCare mock: kunjungan list
  if (path.includes('/kunjungan/peserta/tglDaftar')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { list: [
        { noKunjungan: 'KJ00001', tglDaftar: '2026-10-22', noKartu: '0001234567890', nmPeserta: 'BUDI SANTOSO', kdPoli: 'INT', nmPoli: 'Penyakit Dalam', kdDokter: 'DR001', nmDokter: 'dr. Budi Santoso, Sp.PD' },
        { noKunjungan: 'KJ00002', tglDaftar: '2026-10-22', noKartu: '0001234567891', nmPeserta: 'SITI AMINAH', kdPoli: 'ANA', nmPoli: 'Anak', kdDokter: 'DR002', nmDokter: 'dr. Siti Aminah, Sp.A' },
      ], count: 2 } as T,
    }
  }

  // PCare mock: riwayat kunjungan
  if (path.includes('/kunjungan/peserta/') && method === 'GET') {
    return {
      code: '200',
      message: 'Sukses',
      data: { list: [
        { noKunjungan: 'KJ00001', tglDaftar: '2026-10-20', kdPoli: 'INT', nmPoli: 'Penyakit Dalam', kdDiag1: 'I10', nmDiag1: 'Essential hypertension', kdObat: [], terpiKirim: true },
      ] } as T,
    }
  }

  // PCare mock: obat DPHO
  if (path.includes('/obat/dpho/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { obat: [
        { kdObat: 'OBT001', nmObat: 'Amlodipin 5 mg tablet', signa1: '1', signa2: '1', jmlObat: '30' },
        { kdObat: 'OBT002', nmObat: 'Captopril 25 mg tablet', signa1: '2', signa2: '1', jmlObat: '30' },
        { kdObat: 'OBT003', nmObat: 'Metformin 500 mg tablet', signa1: '3', signa2: '1', jmlObat: '30' },
      ] } as T,
    }
  }

  // e-Klaim mock: grouping
  if (path.includes('/eklaim/claim/new') || path.includes('/eklaim/claim/edit') || path.includes('/eklaim/claim/final')) {
    return {
      code: '200',
      message: 'Sukses',
      data: {
        cbgCode: 'I-4-15-I',
        cbgDesc: 'NON-SURGICAL HYPERTENSION',
        tarif: 3456000,
        tarifGdg: 1036800,
        tarifRS: 2419200,
        topUp: 0,
        prosedurNonBedah: [],
        prosedurBedah: [],
      } as T,
    }
  }

  // e-Klaim mock: get/status
  if (path.includes('/eklaim/claim/get/') || path.includes('/eklaim/claim/status/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: {
        noSep: '0301R0011024V001234',
        status: '1',
        statusLabel: 'Layak',
        cbgCode: 'I-4-15-I',
        cbgDesc: 'NON-SURGICAL HYPERTENSION',
        tarif: 3456000,
        diagnosa: [{ kode: 'I10', nama: 'Essential hypertension' }],
        prosedur: [{ kode: '89.0', nama: 'Diagnostic interview' }],
      } as T,
    }
  }

  // e-Klaim mock: list
  if (path.includes('/eklaim/claim/get-list/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { list: [
        { noSep: '0301R0011024V001234', noRM: 'RM001', namaPasien: 'BUDI SANTOSO', tglMasuk: '2026-10-20', tglPulang: '2026-10-22', cbgCode: 'I-4-15-I', tarif: 3456000, status: '1', statusLabel: 'Layak' },
        { noSep: '0301R0011024V001235', noRM: 'RM002', namaPasien: 'SITI AMINAH', tglMasuk: '2026-10-19', tglPulang: '2026-10-21', cbgCode: 'O-6-10-I', tarif: 5200000, status: '2', statusLabel: 'Proses Verifikasi' },
      ], count: 2 } as T,
    }
  }

  // Aplicare mock: bed
  if (path.startsWith('/bed/')) {
    return {
      code: '200',
      message: 'Sukses',
      data: { list: [
        { kodekelas: '1', namakelas: 'Kelas 1', kapasitas: 20, tersedia: 5, tersediaPria: 3, tersediaWanita: 2 },
        { kodekelas: '2', namakelas: 'Kelas 2', kapasitas: 40, tersedia: 12, tersediaPria: 7, tersediaWanita: 5 },
        { kodekelas: '3', namakelas: 'Kelas 3', kapasitas: 60, tersedia: 18, tersediaPria: 10, tersediaWanita: 8 },
        { kodekelas: 'VIP', namakelas: 'VIP', kapasitas: 10, tersedia: 2, tersediaPria: 1, tersediaWanita: 1 },
      ] } as T,
    }
  }

  // ============ ANTROL MOCK HANDLERS ============

  // Antrol: ref poli
  if (path === '/ref/poli' && method === 'GET') {
    return {
      code: '200',
      message: 'Sukses',
      data: { poli: [
        { kodepoli: 'INT', namapoli: 'Penyakit Dalam', jnspoli: '2' },
        { kodepoli: 'ANA', namapoli: 'Anak', jnspoli: '2' },
        { kodepoli: 'BED', namapoli: 'Bedah', jnspoli: '2' },
        { kodepoli: 'OBG', namapoli: 'Kebidanan & Kandungan', jnspoli: '2' },
        { kodepoli: 'SAR', namapoli: 'Saraf', jnspoli: '2' },
        { kodepoli: 'MAT', namapoli: 'Mata', jnspoli: '2' },
        { kodepoli: 'THT', namapoli: 'THT', jnspoli: '2' },
        { kodepoli: 'KUL', namapoli: 'Kulit & Kelamin', jnspoli: '2' },
        { kodepoli: 'JAN', namapoli: 'Jantung & Pembuluh Darah', jnspoli: '2' },
        { kodepoli: 'PAR', namapoli: 'Paru', jnspoli: '2' },
      ] } as T,
    }
  }

  // Antrol: ref dokter
  if (path === '/ref/dokter' && method === 'GET') {
    return {
      code: '200',
      message: 'Sukses',
      data: { dokter: [
        { kodedokter: 'DR001', namadokter: 'dr. Budi Santoso, Sp.PD' },
        { kodedokter: 'DR002', namadokter: 'dr. Siti Aminah, Sp.A' },
        { kodedokter: 'DR003', namadokter: 'dr. Ahmad Faisal, Sp.B' },
        { kodedokter: 'DR004', namadokter: 'dr. Dewi Lestari, Sp.OG' },
        { kodedokter: 'DR005', namadokter: 'dr. Hendra Wijaya, Sp.S' },
        { kodedokter: 'DR006', namadokter: 'dr. Ratna Sari, Sp.M' },
      ] } as T,
    }
  }

  // Antrol: jadwal dokter
  if (path.startsWith('/jadwaldokter/') && method === 'GET') {
    return {
      code: '200',
      message: 'Sukses',
      data: { jadwal: [
        { kodedokter: 'DR001', namadokter: 'dr. Budi Santoso, Sp.PD', kodepoli: 'INT', namapoli: 'Penyakit Dalam', hari: 'Senin', jampraktek: '08:00-12:00', kapasitasperjam: 10, libur: false },
        { kodedokter: 'DR001', namadokter: 'dr. Budi Santoso, Sp.PD', kodepoli: 'INT', namapoli: 'Penyakit Dalam', hari: 'Selasa', jampraktek: '13:00-17:00', kapasitasperjam: 8, libur: false },
        { kodedokter: 'DR002', namadokter: 'dr. Siti Aminah, Sp.A', kodepoli: 'ANA', namapoli: 'Anak', hari: 'Senin', jampraktek: '08:00-12:00', kapasitasperjam: 12, libur: false },
        { kodedokter: 'DR003', namadokter: 'dr. Ahmad Faisal, Sp.B', kodepoli: 'BED', namapoli: 'Bedah', hari: 'Senin', jampraktek: '09:00-13:00', kapasitasperjam: 6, libur: false },
        { kodedokter: 'DR004', namadokter: 'dr. Dewi Lestari, Sp.OG', kodepoli: 'OBG', namapoli: 'Kebidanan & Kandungan', hari: 'Rabu', jampraktek: '08:00-12:00', kapasitasperjam: 10, libur: true },
      ] } as T,
    }
  }

  // Antrol: tambah antrean (POST)
  if (path === '/antrean/add' && method === 'POST') {
    const angka = Math.floor(1 + Math.random() * 99)
    return {
      code: '200',
      message: 'Sukses',
      data: {
        nomorantrean: `A-${String(angka).padStart(3, '0')}`,
        angkaantrean: angka,
        kodebooking: `BK${Date.now().toString().slice(-10)}`,
        estimasidilayani: Math.floor(Date.now() / 1000) + 3600,
      } as T,
    }
  }

  // Antrol: update antrean (PUT)
  if (path === '/antrean/update' && method === 'PUT') {
    return {
      code: '200',
      message: 'Sukses',
      data: null as T,
    }
  }

  // Antrol: batal antrean (PUT)
  if (path === '/antrean/batal' && method === 'PUT') {
    return {
      code: '200',
      message: 'Sukses',
      data: null as T,
    }
  }

  // Antrol: list task (GET)
  if (path.startsWith('/antrean/getlisttask/') && method === 'GET') {
    const nowTs = Math.floor(Date.now() / 1000)
    return {
      code: '200',
      message: 'Sukses',
      data: { list: [
        {
          kodebooking: 'BK2610250001', nomorkartu: '0001234567890', nik: '3201234567890123',
          nohp: '081234567890', namapasien: 'BUDI SANTOSO', kodepoli: 'INT', namapoli: 'Penyakit Dalam',
          kodedokter: 'DR001', namadokter: 'dr. Budi Santoso, Sp.PD',
          tanggalperiksa: new Date().toISOString().slice(0, 10), jampraktek: '08:00-12:00',
          jeniskunjungan: 1, nomorreferensi: 'R0024V00001', nomorantrean: 'A-001',
          angkaantrean: 1, estimasidilayani: nowTs + 1800, siession: 1,
          taskid: 0, taskname: 'Belum', waktu: nowTs - 7200,
        },
        {
          kodebooking: 'BK2610250002', nomorkartu: '0001234567891', nik: '3201234567891234',
          nohp: '081234567891', namapasien: 'SITI AMINAH', kodepoli: 'INT', namapoli: 'Penyakit Dalam',
          kodedokter: 'DR001', namadokter: 'dr. Budi Santoso, Sp.PD',
          tanggalperiksa: new Date().toISOString().slice(0, 10), jampraktek: '08:00-12:00',
          jeniskunjungan: 3, nomorreferensi: 'K0026V00010', nomorantrean: 'A-002',
          angkaantrean: 2, estimasidilayani: nowTs + 3600, siession: 1,
          taskid: 1, taskname: 'Check-in', waktu: nowTs - 3600,
        },
        {
          kodebooking: 'BK2610250003', nomorkartu: '0001234567892', nik: '3201234567892345',
          nohp: '081234567892', namapasien: 'AHMAD FAISAL', kodepoli: 'ANA', namapoli: 'Anak',
          kodedokter: 'DR002', namadokter: 'dr. Siti Aminah, Sp.A',
          tanggalperiksa: new Date().toISOString().slice(0, 10), jampraktek: '08:00-12:00',
          jeniskunjungan: 1, nomorreferensi: 'R0024V00005', nomorantrean: 'B-001',
          angkaantrean: 1, estimasidilayani: nowTs + 5400, siession: 1,
          taskid: 3, taskname: 'Selesai', waktu: nowTs - 600,
        },
        {
          kodebooking: 'BK2610250004', nomorkartu: '0001234567893', nik: '3201234567893456',
          nohp: '081234567893', namapasien: 'DEWI LESTARI', kodepoli: 'INT', namapoli: 'Penyakit Dalam',
          kodedokter: 'DR001', namadokter: 'dr. Budi Santoso, Sp.PD',
          tanggalperiksa: new Date().toISOString().slice(0, 10), jampraktek: '13:00-17:00',
          jeniskunjungan: 2, nomorreferensi: 'RI0026V00002', nomorantrean: 'A-003',
          angkaantrean: 3, estimasidilayani: nowTs + 7200, siession: 2,
          taskid: 5, taskname: 'Batal', waktu: nowTs - 1200,
        },
      ] } as T,
    }
  }

  // Antrol: dashboard per tanggal
  if (path.startsWith('/dashboard/wpipertanggal/') && method === 'GET') {
    return {
      code: '200',
      message: 'Sukses',
      data: {
        tanggal: new Date().toISOString().slice(0, 10),
        totalAntrean: 48,
        totalCheckin: 32,
        totalDilayani: 28,
        totalSelesai: 22,
        totalBatal: 4,
        perPoli: [
          { kodepoli: 'INT', namapoli: 'Penyakit Dalam', totalAntrean: 18, totalCheckin: 14, totalDilayani: 12, totalSelesai: 10 },
          { kodepoli: 'ANA', namapoli: 'Anak', totalAntrean: 12, totalCheckin: 8, totalDilayani: 7, totalSelesai: 5 },
          { kodepoli: 'BED', namapoli: 'Bedah', totalAntrean: 8, totalCheckin: 5, totalDilayani: 4, totalSelesai: 3 },
          { kodepoli: 'OBG', namapoli: 'Kebidanan', totalAntrean: 6, totalCheckin: 3, totalDilayani: 3, totalSelesai: 2 },
          { kodepoli: 'SAR', namapoli: 'Saraf', totalAntrean: 4, totalCheckin: 2, totalDilayani: 2, totalSelesai: 2 },
        ],
      } as T,
    }
  }

  // Antrol: dashboard per bulan
  if (path.startsWith('/dashboard/wpiperbulan/') && method === 'GET') {
    return {
      code: '200',
      message: 'Sukses',
      data: {
        bulan: '10', tahun: '2026',
        totalAntrean: 1240,
        totalCheckin: 980,
        totalDilayani: 920,
        totalSelesai: 880,
        totalBatal: 85,
        perPoli: [
          { kodepoli: 'INT', namapoli: 'Penyakit Dalam', totalAntrean: 380, totalCheckin: 310, totalDilayani: 290, totalSelesai: 275 },
          { kodepoli: 'ANA', namapoli: 'Anak', totalAntrean: 260, totalCheckin: 200, totalDilayani: 185, totalSelesai: 170 },
          { kodepoli: 'BED', namapoli: 'Bedah', totalAntrean: 180, totalCheckin: 140, totalDilayani: 130, totalSelesai: 125 },
          { kodepoli: 'OBG', namapoli: 'Kebidanan', totalAntrean: 220, totalCheckin: 175, totalDilayani: 165, totalSelesai: 160 },
          { kodepoli: 'SAR', namapoli: 'Saraf', totalAntrean: 120, totalCheckin: 95, totalDilayani: 90, totalSelesai: 85 },
          { kodepoli: 'MAT', namapoli: 'Mata', totalAntrean: 80, totalCheckin: 60, totalDilayani: 60, totalSelesai: 65 },
        ],
      } as T,
    }
  }

  // Default mock
  return {
    code: '200',
    message: 'Mock OK',
    data: null as T,
  }
}

// --- Mock data factories ---

function mockPesertaResponse() {
  return {
    peserta: {
      noKartu: '0001234567890',
      nik: '3201234567890123',
      nama: 'BUDI SANTOSO',
      pisa: '1',
      sex: 'L',
      mr: {
        noMR: null,
        noTelepon: null,
      },
      umur: {
        umurSekarang: '45 tahun ,3 bulan ,12 hari',
        umurSaatPelayanan: '45 tahun ,3 bulan ,12 hari',
      },
      statusPeserta: {
        kode: '0',
        keterangan: 'AKTIF',
      },
      jenisPeserta: {
        kode: '1',
        keterangan: 'PBI',
      },
      hakKelas: {
        kode: '3',
        keterangan: 'Kelas III',
      },
      informasi: {
        dinpisat: {
          prolanisPRB: null,
          noSKTM: null,
        },
        dinpisat_pisat: null,
      },
      cob: {
        nmAsuransi: null,
        noAsuransi: null,
        tglTAT: null,
        tglTMT: null,
      },
      provUmum: {
        kdProvider: '0301U010',
        nmProvider: 'PUSKESMAS CISARUA',
      },
      tglLahir: '1981-05-15',
      tglMulaiAktif: '2014-01-01',
      tglAkhirBerlaku: '2099-12-31',
      tglCetakKartu: '2014-06-01',
      noHP: '081234567890',
    },
  }
}

function mockSepInsertResponse() {
  const now = new Date().toISOString().slice(0, 10)
  return {
    sep: {
      noSep: `0301R0011024V00${Math.floor(1000 + Math.random() * 9000)}`,
      tglSep: now,
      noKartu: '0001234567890',
      peserta: {
        nama: 'BUDI SANTOSO',
        nik: '3201234567890123',
        hakKelas: { kode: '3', keterangan: 'Kelas III' },
      },
    },
  }
}

function mockSepGetResponse() {
  return {
    noSep: '0301R0011024V001234',
    tglSep: '2024-10-11',
    jnsPelayanan: '2',
    noKartu: '0001234567890',
    peserta: {
      nama: 'BUDI SANTOSO',
      nik: '3201234567890123',
    },
    diagnosa: 'J06.9',
    poli: 'INT',
    kelasRawat: '3',
  }
}

function mockRujukanResponse() {
  return {
    rujukan: [
      {
        noKunjungan: 'R0024V00001',
        tglKunjungan: '2024-10-01',
        provPerujuk: {
          kode: '0301U010',
          nama: 'PUSKESMAS CISARUA',
        },
        diagnosa: {
          kode: 'J06.9',
          nama: 'Acute upper respiratory infection, unspecified',
        },
        poliRujukan: {
          kode: 'INT',
          nama: 'Penyakit Dalam',
        },
        pelayanan: {
          kode: '2',
          nama: 'Rawat Jalan',
        },
      },
    ],
  }
}

function mockPoliReferensiResponse() {
  return {
    poli: [
      { kode: 'INT', nama: 'Penyakit Dalam' },
      { kode: 'ANA', nama: 'Anak' },
      { kode: 'BED', nama: 'Bedah' },
      { kode: 'OBG', nama: 'Kebidanan & Kandungan' },
      { kode: 'SAR', nama: 'Saraf' },
      { kode: 'MAT', nama: 'Mata' },
      { kode: 'THT', nama: 'THT' },
      { kode: 'KUL', nama: 'Kulit & Kelamin' },
      { kode: 'JAN', nama: 'Jantung' },
      { kode: 'PAR', nama: 'Paru' },
    ],
  }
}

function mockDiagnosaReferensiResponse() {
  return {
    diagnosa: [
      { kode: 'J06.9', nama: 'Acute upper respiratory infection, unspecified' },
      { kode: 'J18.9', nama: 'Pneumonia, unspecified organism' },
      { kode: 'K29.7', nama: 'Gastritis, unspecified' },
      { kode: 'I10', nama: 'Essential (primary) hypertension' },
      { kode: 'E11.9', nama: 'Type 2 diabetes mellitus without complications' },
    ],
  }
}
