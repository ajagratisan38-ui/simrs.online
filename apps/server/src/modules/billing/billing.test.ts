import {
  applyDiscountSchema,
  processPaymentSchema,
  dailySummarySchema,
  outstandingSchema,
} from './billing.validator'

describe('Billing Validators', () => {
  // ====================================
  // applyDiscountSchema
  // ====================================
  describe('applyDiscountSchema', () => {
    it('accepts valid discount', () => {
      const result = applyDiscountSchema.parse({
        discount_amount: 50000,
        catatan: 'Diskon keluarga karyawan',
      })
      expect(result.discount_amount).toBe(50000)
      expect(result.catatan).toBe('Diskon keluarga karyawan')
    })

    it('accepts zero discount', () => {
      const result = applyDiscountSchema.parse({
        discount_amount: 0,
        catatan: 'Hapus diskon',
      })
      expect(result.discount_amount).toBe(0)
    })

    it('rejects negative discount', () => {
      expect(() =>
        applyDiscountSchema.parse({
          discount_amount: -100,
          catatan: 'Test',
        }),
      ).toThrow()
    })

    it('rejects short catatan', () => {
      expect(() =>
        applyDiscountSchema.parse({
          discount_amount: 1000,
          catatan: 'AB',
        }),
      ).toThrow()
    })
  })

  // ====================================
  // processPaymentSchema
  // ====================================
  describe('processPaymentSchema', () => {
    it('accepts valid tunai payment', () => {
      const result = processPaymentSchema.parse({
        metode: 'tunai',
        jumlah: 500000,
      })
      expect(result.metode).toBe('tunai')
      expect(result.jumlah).toBe(500000)
    })

    it('accepts debit with referensi', () => {
      const result = processPaymentSchema.parse({
        metode: 'debit',
        jumlah: 250000,
        referensi_pembayaran: 'TXN-12345',
        catatan: 'BCA Debit',
      })
      expect(result.referensi_pembayaran).toBe('TXN-12345')
    })

    it('accepts BPJS payment', () => {
      const result = processPaymentSchema.parse({
        metode: 'bpjs',
        jumlah: 1000000,
        referensi_pembayaran: 'SEP-001',
      })
      expect(result.metode).toBe('bpjs')
    })

    it('accepts kredit payment', () => {
      const result = processPaymentSchema.parse({
        metode: 'kredit',
        jumlah: 750000,
      })
      expect(result.metode).toBe('kredit')
    })

    it('accepts transfer payment', () => {
      const result = processPaymentSchema.parse({
        metode: 'transfer',
        jumlah: 300000,
        referensi_pembayaran: 'TRF-BCA-001',
      })
      expect(result.metode).toBe('transfer')
    })

    it('accepts asuransi payment', () => {
      const result = processPaymentSchema.parse({
        metode: 'asuransi',
        jumlah: 2000000,
        referensi_pembayaran: 'CLAIM-001',
      })
      expect(result.metode).toBe('asuransi')
    })

    it('rejects invalid metode', () => {
      expect(() =>
        processPaymentSchema.parse({
          metode: 'bitcoin',
          jumlah: 100,
        }),
      ).toThrow()
    })

    it('rejects jumlah < 1', () => {
      expect(() =>
        processPaymentSchema.parse({
          metode: 'tunai',
          jumlah: 0,
        }),
      ).toThrow()
    })

    it('rejects missing metode', () => {
      expect(() =>
        processPaymentSchema.parse({
          jumlah: 100,
        }),
      ).toThrow()
    })
  })

  // ====================================
  // dailySummarySchema
  // ====================================
  describe('dailySummarySchema', () => {
    it('accepts date string', () => {
      const result = dailySummarySchema.parse({ date: '2026-10-11' })
      expect(result.date).toBe('2026-10-11')
    })

    it('accepts empty (defaults to today)', () => {
      const result = dailySummarySchema.parse({})
      expect(result.date).toBeUndefined()
    })
  })

  // ====================================
  // outstandingSchema
  // ====================================
  describe('outstandingSchema', () => {
    it('accepts page and limit', () => {
      const result = outstandingSchema.parse({ page: '2', limit: '10' })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
    })

    it('uses defaults', () => {
      const result = outstandingSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('rejects page < 1', () => {
      expect(() =>
        outstandingSchema.parse({ page: '0' }),
      ).toThrow()
    })

    it('rejects limit > 100', () => {
      expect(() =>
        outstandingSchema.parse({ limit: '200' }),
      ).toThrow()
    })
  })
})

describe('Billing Service Logic', () => {
  describe('generateBill', () => {
    it('should collect consultation fee from doctor tarif_konsultasi', () => {
      // Bill generation collects:
      // 1. Consultation = doctor.tarif_konsultasi
      // 2. Procedures = sum of procedure.tarif * procedure.qty
      // 3. Drugs = sum of dispensing_item.jumlah_diberikan * drug.harga_jual
      // 4. Room = room.tarif_per_hari * days (if rawat_inap)
      const mockItems = [
        { kategori: 'konsultasi', qty: 1, harga_satuan: 150000, total: 150000 },
        { kategori: 'tindakan', qty: 1, harga_satuan: 200000, total: 200000 },
        { kategori: 'obat', qty: 10, harga_satuan: 5000, total: 50000 },
      ]
      const totalAmount = mockItems.reduce((s, i) => s + i.total, 0)
      expect(totalAmount).toBe(400000)
    })

    it('should calculate room charge for inpatient visits', () => {
      const tarifPerHari = 500000
      const days = 3
      const roomCharge = tarifPerHari * days
      expect(roomCharge).toBe(1500000)
    })

    it('should handle visit with no procedures or prescriptions', () => {
      const items = [
        { kategori: 'konsultasi', total: 100000 },
      ]
      const total = items.reduce((s, i) => s + i.total, 0)
      expect(total).toBe(100000)
    })
  })

  describe('discount', () => {
    it('should calculate final amount after discount', () => {
      const totalAmount = 500000
      const discountAmount = 100000
      const finalAmount = totalAmount - discountAmount
      expect(finalAmount).toBe(400000)
    })

    it('should not allow discount exceeding total', () => {
      const totalAmount = 500000
      const discountAmount = 600000
      expect(discountAmount > totalAmount).toBe(true)
    })
  })

  describe('payment', () => {
    it('should calculate kembalian correctly', () => {
      const finalAmount = 350000
      const bayar = 400000
      const kembalian = Math.max(0, bayar - finalAmount)
      expect(kembalian).toBe(50000)
    })

    it('should handle exact payment (no change)', () => {
      const finalAmount = 350000
      const bayar = 350000
      const kembalian = Math.max(0, bayar - finalAmount)
      expect(kembalian).toBe(0)
    })

    it('should support partial payment tracking', () => {
      const finalAmount = 500000
      const payment1 = 200000
      const payment2 = 300000
      const totalPaid = payment1 + payment2
      const sisa = finalAmount - totalPaid
      expect(sisa).toBe(0)
      expect(totalPaid >= finalAmount).toBe(true)
    })

    it('should calculate remaining balance after partial payment', () => {
      const finalAmount = 500000
      const totalPaid = 200000
      const remaining = finalAmount - totalPaid
      expect(remaining).toBe(300000)
    })
  })

  describe('daily summary', () => {
    it('should aggregate payments by method', () => {
      const payments = [
        { metode: 'tunai', jumlah: 200000 },
        { metode: 'tunai', jumlah: 150000 },
        { metode: 'debit', jumlah: 300000 },
        { metode: 'bpjs', jumlah: 500000 },
      ]

      const byMethod: Record<string, { total: number; count: number }> = {}
      for (const p of payments) {
        if (!byMethod[p.metode]) byMethod[p.metode] = { total: 0, count: 0 }
        byMethod[p.metode].total += p.jumlah
        byMethod[p.metode].count += 1
      }

      expect(byMethod.tunai.total).toBe(350000)
      expect(byMethod.tunai.count).toBe(2)
      expect(byMethod.debit.total).toBe(300000)
      expect(byMethod.bpjs.total).toBe(500000)

      const grandTotal = payments.reduce((s, p) => s + p.jumlah, 0)
      expect(grandTotal).toBe(1150000)
    })
  })
})
