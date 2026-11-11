import {
  createDrugSchema,
  updateDrugSchema,
  listDrugsSchema,
  searchDrugSchema,
  addStockSchema,
  adjustStockSchema,
  dispenseSchema,
  expiringSchema,
} from './pharmacy.validator'

describe('Pharmacy Validators', () => {
  // ====================================
  // createDrugSchema
  // ====================================
  describe('createDrugSchema', () => {
    it('accepts valid drug data', () => {
      const data = {
        kode: 'OBT-001',
        nama: 'Paracetamol 500mg',
        nama_generik: 'Paracetamol',
        kategori: 'obat',
        satuan_kecil: 'tablet',
        satuan_besar: 'box',
        konversi: 100,
        harga_beli: 500,
        harga_jual: 750,
        margin_persen: 50,
        stok_minimum: 100,
      }

      const result = createDrugSchema.parse(data)
      expect(result.kode).toBe('OBT-001')
      expect(result.harga_jual).toBe(750)
    })

    it('uses defaults for optional fields', () => {
      const result = createDrugSchema.parse({
        kode: 'OBT-002',
        nama: 'Amoxicillin 500mg',
      })
      expect(result.kategori).toBe('obat')
      expect(result.satuan_kecil).toBe('tablet')
      expect(result.konversi).toBe(1)
      expect(result.stok_minimum).toBe(10)
    })

    it('rejects short kode', () => {
      expect(() =>
        createDrugSchema.parse({ kode: 'A', nama: 'Test' }),
      ).toThrow()
    })

    it('rejects invalid kategori', () => {
      expect(() =>
        createDrugSchema.parse({
          kode: 'OBT-003',
          nama: 'Test',
          kategori: 'invalid',
        }),
      ).toThrow()
    })

    it('rejects negative harga', () => {
      expect(() =>
        createDrugSchema.parse({
          kode: 'OBT-004',
          nama: 'Test',
          harga_beli: -100,
        }),
      ).toThrow()
    })
  })

  // ====================================
  // listDrugsSchema
  // ====================================
  describe('listDrugsSchema', () => {
    it('accepts search and category filter', () => {
      const result = listDrugsSchema.parse({
        search: 'paracetamol',
        kategori: 'obat',
        page: '2',
        limit: '10',
      })
      expect(result.search).toBe('paracetamol')
      expect(result.kategori).toBe('obat')
      expect(result.page).toBe(2)
    })

    it('uses defaults', () => {
      const result = listDrugsSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })
  })

  // ====================================
  // searchDrugSchema
  // ====================================
  describe('searchDrugSchema', () => {
    it('accepts valid search', () => {
      const result = searchDrugSchema.parse({ q: 'para', limit: '5' })
      expect(result.q).toBe('para')
      expect(result.limit).toBe(5)
    })

    it('rejects empty query', () => {
      expect(() => searchDrugSchema.parse({ q: '' })).toThrow()
    })
  })

  // ====================================
  // addStockSchema
  // ====================================
  describe('addStockSchema', () => {
    it('accepts valid stock data', () => {
      const result = addStockSchema.parse({
        batch_number: 'BATCH-2026-001',
        tanggal_kadaluarsa: '2028-12-31',
        jumlah: 500,
        harga_beli_per_unit: 450,
        supplier: 'PT Pharma Indonesia',
      })
      expect(result.jumlah).toBe(500)
      expect(result.batch_number).toBe('BATCH-2026-001')
    })

    it('rejects jumlah < 1', () => {
      expect(() => addStockSchema.parse({ jumlah: 0 })).toThrow()
    })

    it('accepts minimal data (just quantity)', () => {
      const result = addStockSchema.parse({ jumlah: 10 })
      expect(result.jumlah).toBe(10)
      expect(result.harga_beli_per_unit).toBe(0)
    })
  })

  // ====================================
  // adjustStockSchema
  // ====================================
  describe('adjustStockSchema', () => {
    it('accepts positive adjustment', () => {
      const result = adjustStockSchema.parse({
        batch_id: '550e8400-e29b-41d4-a716-446655440000',
        jumlah: 5,
        alasan: 'Koreksi stok opname',
      })
      expect(result.jumlah).toBe(5)
    })

    it('accepts negative adjustment', () => {
      const result = adjustStockSchema.parse({
        batch_id: '550e8400-e29b-41d4-a716-446655440000',
        jumlah: -3,
        alasan: 'Obat rusak',
      })
      expect(result.jumlah).toBe(-3)
    })

    it('rejects short alasan', () => {
      expect(() =>
        adjustStockSchema.parse({
          batch_id: '550e8400-e29b-41d4-a716-446655440000',
          jumlah: 1,
          alasan: 'AB',
        }),
      ).toThrow()
    })

    it('rejects invalid UUID', () => {
      expect(() =>
        adjustStockSchema.parse({
          batch_id: 'not-uuid',
          jumlah: 1,
          alasan: 'Test reason',
        }),
      ).toThrow()
    })
  })

  // ====================================
  // dispenseSchema
  // ====================================
  describe('dispenseSchema', () => {
    it('accepts valid dispensing data', () => {
      const result = dispenseSchema.parse({
        items: [
          {
            drug_id: '550e8400-e29b-41d4-a716-446655440000',
            jumlah_diminta: 15,
            jumlah_diberikan: 15,
          },
          {
            drug_id: '550e8400-e29b-41d4-a716-446655440001',
            jumlah_diminta: 9,
            jumlah_diberikan: 9,
            catatan: 'Ganti merk generik',
          },
        ],
        catatan_apoteker: 'Semua tersedia',
      })
      expect(result.items).toHaveLength(2)
    })

    it('rejects empty items', () => {
      expect(() => dispenseSchema.parse({ items: [] })).toThrow()
    })

    it('rejects item with jumlah_diminta < 1', () => {
      expect(() =>
        dispenseSchema.parse({
          items: [
            {
              drug_id: '550e8400-e29b-41d4-a716-446655440000',
              jumlah_diminta: 0,
              jumlah_diberikan: 0,
            },
          ],
        }),
      ).toThrow()
    })

    it('accepts partial dispensing (jumlah_diberikan < jumlah_diminta)', () => {
      const result = dispenseSchema.parse({
        items: [
          {
            drug_id: '550e8400-e29b-41d4-a716-446655440000',
            jumlah_diminta: 15,
            jumlah_diberikan: 10,
            catatan: 'Stok hanya 10',
          },
        ],
      })
      expect(result.items[0].jumlah_diberikan).toBe(10)
    })

    it('accepts zero dispensing (not available)', () => {
      const result = dispenseSchema.parse({
        items: [
          {
            drug_id: '550e8400-e29b-41d4-a716-446655440000',
            jumlah_diminta: 15,
            jumlah_diberikan: 0,
          },
        ],
      })
      expect(result.items[0].jumlah_diberikan).toBe(0)
    })
  })

  // ====================================
  // expiringSchema
  // ====================================
  describe('expiringSchema', () => {
    it('accepts days parameter', () => {
      const result = expiringSchema.parse({ days: '30' })
      expect(result.days).toBe(30)
    })

    it('uses default 90 days', () => {
      const result = expiringSchema.parse({})
      expect(result.days).toBe(90)
    })

    it('rejects days > 365', () => {
      expect(() => expiringSchema.parse({ days: '400' })).toThrow()
    })

    it('rejects days < 1', () => {
      expect(() => expiringSchema.parse({ days: '0' })).toThrow()
    })
  })
})
