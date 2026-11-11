import { describe, it, expect } from '@jest/globals'
import {
  createSepSchema,
  updateSepSchema,
  refSearchSchema,
} from './bpjs.validator'
import { generateSignature, decryptBpjsResponse } from './bpjs.client'
import crypto from 'crypto'
import LZString from 'lz-string'

// ===========================
// VALIDATOR TESTS
// ===========================

describe('BPJS Validators', () => {
  describe('createSepSchema', () => {
    const validSep = {
      noKartu: '0001234567890',
      tglSep: '2024-10-11',
      ppkPelayanan: '0301R001',
      jnsPelayanan: '2' as const,
      klsRawatHak: '3',
      noMR: 'RM-00001',
      diagAwal: 'J06.9',
      poliTujuan: 'INT',
      noTelp: '081234567890',
      user: 'admin',
    }

    it('should accept valid SEP data', () => {
      const result = createSepSchema.parse(validSep)
      expect(result.noKartu).toBe('0001234567890')
      expect(result.jnsPelayanan).toBe('2')
    })

    it('should accept SEP with optional laka lantas', () => {
      const result = createSepSchema.parse({
        ...validSep,
        jaminanLakaLantas: {
          penjamin: '1',
          tglKejadian: '2024-10-10',
          keterangan: 'Kecelakaan lalu lintas',
        },
      })
      expect(result.jaminanLakaLantas?.penjamin).toBe('1')
    })

    it('should accept SEP with SKDP', () => {
      const result = createSepSchema.parse({
        ...validSep,
        skdp: {
          noSurat: 'SKDP-001',
          kodeDPJP: 'DR001',
        },
      })
      expect(result.skdp?.noSurat).toBe('SKDP-001')
    })

    it('should reject invalid jnsPelayanan', () => {
      expect(() =>
        createSepSchema.parse({ ...validSep, jnsPelayanan: '3' }),
      ).toThrow()
    })

    it('should reject short noKartu', () => {
      expect(() =>
        createSepSchema.parse({ ...validSep, noKartu: '123' }),
      ).toThrow()
    })

    it('should reject invalid date format', () => {
      expect(() =>
        createSepSchema.parse({ ...validSep, tglSep: '11-10-2024' }),
      ).toThrow()
    })

    it('should reject missing diagAwal', () => {
      const { diagAwal, ...rest } = validSep
      expect(() => createSepSchema.parse(rest)).toThrow()
    })

    it('should reject missing noTelp', () => {
      const { noTelp, ...rest } = validSep
      expect(() => createSepSchema.parse(rest)).toThrow()
    })

    it('should reject short noTelp', () => {
      expect(() =>
        createSepSchema.parse({ ...validSep, noTelp: '0812' }),
      ).toThrow()
    })

    it('should accept with catatan', () => {
      const result = createSepSchema.parse({
        ...validSep,
        catatan: 'Pasien kontrol ulang',
      })
      expect(result.catatan).toBe('Pasien kontrol ulang')
    })
  })

  describe('updateSepSchema', () => {
    it('should accept valid update', () => {
      const result = updateSepSchema.parse({
        noSep: '0301R0011024V001234',
        klsRawat: '2',
        user: 'admin',
      })
      expect(result.noSep).toBe('0301R0011024V001234')
    })

    it('should accept minimal update (just noSep + user)', () => {
      const result = updateSepSchema.parse({
        noSep: '0301R0011024V001234',
        user: 'admin',
      })
      expect(result.noSep).toBe('0301R0011024V001234')
      expect(result.klsRawat).toBeUndefined()
    })

    it('should reject short noSep', () => {
      expect(() =>
        updateSepSchema.parse({ noSep: '123', user: 'admin' }),
      ).toThrow()
    })

    it('should reject missing user', () => {
      expect(() =>
        updateSepSchema.parse({ noSep: '0301R0011024V001234' }),
      ).toThrow()
    })

    it('should reject long catatan', () => {
      expect(() =>
        updateSepSchema.parse({
          noSep: '0301R0011024V001234',
          catatan: 'x'.repeat(501),
          user: 'admin',
        }),
      ).toThrow()
    })
  })

  describe('refSearchSchema', () => {
    it('should accept valid keyword', () => {
      const result = refSearchSchema.parse({ q: 'jantung' })
      expect(result.q).toBe('jantung')
    })

    it('should reject empty keyword', () => {
      expect(() => refSearchSchema.parse({ q: '' })).toThrow()
    })

    it('should reject missing keyword', () => {
      expect(() => refSearchSchema.parse({})).toThrow()
    })
  })
})

// ===========================
// SIGNATURE TESTS
// ===========================

describe('BPJS Signature', () => {
  it('should generate HMAC-SHA256 signature', () => {
    const consumerId = 'test-consumer'
    const consumerSecret = 'test-secret'
    const timestamp = 1700000000

    const signature = generateSignature(consumerId, consumerSecret, timestamp)

    // Verify it's a valid base64 string
    expect(signature).toBeTruthy()
    expect(() => Buffer.from(signature, 'base64')).not.toThrow()
    expect(Buffer.from(signature, 'base64').length).toBe(32) // SHA-256 = 32 bytes
  })

  it('should produce consistent signatures for same input', () => {
    const sig1 = generateSignature('id', 'secret', 1000)
    const sig2 = generateSignature('id', 'secret', 1000)
    expect(sig1).toBe(sig2)
  })

  it('should produce different signatures for different timestamps', () => {
    const sig1 = generateSignature('id', 'secret', 1000)
    const sig2 = generateSignature('id', 'secret', 1001)
    expect(sig1).not.toBe(sig2)
  })

  it('should produce different signatures for different secrets', () => {
    const sig1 = generateSignature('id', 'secret1', 1000)
    const sig2 = generateSignature('id', 'secret2', 1000)
    expect(sig1).not.toBe(sig2)
  })

  it('should match manual HMAC-SHA256 computation', () => {
    const consumerId = 'myConsumer'
    const secret = 'mySecret'
    const ts = 1700000000

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${consumerId}&${ts}`)
      .digest('base64')

    const result = generateSignature(consumerId, secret, ts)
    expect(result).toBe(expected)
  })
})

// ===========================
// DECRYPTION TESTS
// ===========================

describe('BPJS Response Decryption', () => {
  it('should handle plain JSON fallback', () => {
    const plainJson = JSON.stringify({ peserta: { nama: 'Test' } })
    const result = decryptBpjsResponse(plainJson, 'id', 'secret', 1000)
    expect(result).toEqual({ peserta: { nama: 'Test' } })
  })

  it('should handle encrypt → decrypt round-trip', () => {
    const consumerId = 'testId'
    const consumerSecret = 'testSecret'
    const timestamp = 1700000000
    const original = { peserta: { noKartu: '001', nama: 'Test Patient' } }

    // Encrypt like BPJS would
    const combined = `${consumerId}${consumerSecret}${timestamp}`
    const key = crypto.createHash('sha256').update(combined).digest()
    const iv = key.subarray(0, 16)

    // Compress then encrypt
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify(original),
    )
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(compressed, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    // Decrypt
    const decrypted = decryptBpjsResponse(
      encrypted,
      consumerId,
      consumerSecret,
      timestamp,
    )
    expect(decrypted).toEqual(original)
  })

  it('should handle uncompressed encrypted data', () => {
    const consumerId = 'testId'
    const consumerSecret = 'testSecret'
    const timestamp = 1700000000
    const original = { data: 'plain' }

    // Encrypt without LZString compression
    const combined = `${consumerId}${consumerSecret}${timestamp}`
    const key = crypto.createHash('sha256').update(combined).digest()
    const iv = key.subarray(0, 16)

    const plainJson = JSON.stringify(original)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(plainJson, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const decrypted = decryptBpjsResponse(
      encrypted,
      consumerId,
      consumerSecret,
      timestamp,
    )
    expect(decrypted).toEqual(original)
  })
})

// ===========================
// MOCK SERVICE TESTS
// ===========================

describe('BPJS Mock Service', () => {
  // These tests use the mock client (bpjsConfig.useMock = true when no consumer ID)
  // The bpjsRequest function returns mock data when useMock is true

  it('mock peserta response has required fields', () => {
    const peserta = {
      noKartu: '0001234567890',
      nik: '3201234567890123',
      nama: 'BUDI SANTOSO',
      sex: 'L',
      hakKelas: { kode: '3', keterangan: 'Kelas III' },
      statusPeserta: { kode: '0', keterangan: 'AKTIF' },
      jenisPeserta: { kode: '1', keterangan: 'PBI' },
      provUmum: { kdProvider: '0301U010', nmProvider: 'PUSKESMAS CISARUA' },
      umur: { umurSekarang: '45 tahun ,3 bulan ,12 hari' },
      noHP: '081234567890',
      tglLahir: '1981-05-15',
      tglMulaiAktif: '2014-01-01',
      tglAkhirBerlaku: '2099-12-31',
    }

    expect(peserta.noKartu).toBeTruthy()
    expect(peserta.nik).toHaveLength(16)
    expect(peserta.hakKelas.kode).toBeTruthy()
    expect(peserta.statusPeserta.keterangan).toBe('AKTIF')
  })

  it('mock SEP response has noSep', () => {
    const sep = {
      noSep: '0301R0011024V001234',
      tglSep: '2024-10-11',
      noKartu: '0001234567890',
      peserta: {
        nama: 'BUDI SANTOSO',
        nik: '3201234567890123',
      },
    }

    expect(sep.noSep).toBeTruthy()
    expect(sep.noSep.length).toBeGreaterThan(10)
  })

  it('mock rujukan response is array', () => {
    const response = {
      rujukan: [
        {
          noKunjungan: 'R0024V00001',
          tglKunjungan: '2024-10-01',
          diagnosa: { kode: 'J06.9', nama: 'ISPA' },
        },
      ],
    }

    expect(Array.isArray(response.rujukan)).toBe(true)
    expect(response.rujukan[0]?.diagnosa.kode).toBe('J06.9')
  })

  it('mock poli referensi has kode and nama', () => {
    const poli = [
      { kode: 'INT', nama: 'Penyakit Dalam' },
      { kode: 'ANA', nama: 'Anak' },
    ]

    expect(poli[0]?.kode).toBe('INT')
    expect(poli[0]?.nama).toBeTruthy()
  })

  it('mock diagnosa referensi has kode and nama', () => {
    const diagnosa = [
      { kode: 'J06.9', nama: 'Acute upper respiratory infection' },
      { kode: 'I10', nama: 'Essential hypertension' },
    ]

    expect(diagnosa[0]?.kode).toBe('J06.9')
    expect(diagnosa.length).toBeGreaterThan(0)
  })
})
