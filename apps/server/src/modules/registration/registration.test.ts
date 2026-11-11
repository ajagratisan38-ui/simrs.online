import {
  createVisitSchema,
  updateVisitStatusSchema,
  listVisitsSchema,
  cancelVisitSchema,
} from './registration.validator'

describe('Registration Validators', () => {
  describe('createVisitSchema', () => {
    const validVisit = {
      patient_id: '550e8400-e29b-41d4-a716-446655440000',
      tipe: 'rawat_jalan' as const,
      room_id: '550e8400-e29b-41d4-a716-446655440001',
      doctor_id: '550e8400-e29b-41d4-a716-446655440002',
      keluhan_utama: 'Demam dan batuk',
      cara_masuk: 'datang_sendiri' as const,
      penjamin: 'umum' as const,
    }

    it('should accept valid visit data', () => {
      const result = createVisitSchema.safeParse(validVisit)
      expect(result.success).toBe(true)
    })

    it('should reject invalid patient_id', () => {
      const result = createVisitSchema.safeParse({
        ...validVisit,
        patient_id: 'not-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid tipe', () => {
      const result = createVisitSchema.safeParse({
        ...validVisit,
        tipe: 'invalid',
      })
      expect(result.success).toBe(false)
    })

    it('should require no_sep when penjamin is bpjs', () => {
      const result = createVisitSchema.safeParse({
        ...validVisit,
        penjamin: 'bpjs',
      })
      expect(result.success).toBe(false)
    })

    it('should accept bpjs penjamin with no_sep', () => {
      const result = createVisitSchema.safeParse({
        ...validVisit,
        penjamin: 'bpjs',
        no_sep: '0089012345678',
      })
      expect(result.success).toBe(true)
    })

    it('should default cara_masuk to datang_sendiri', () => {
      const data = { ...validVisit }
      delete (data as Record<string, unknown>).cara_masuk
      const result = createVisitSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.cara_masuk).toBe('datang_sendiri')
      }
    })

    it('should accept rujukan cara_masuk with no_rujukan', () => {
      const result = createVisitSchema.safeParse({
        ...validVisit,
        cara_masuk: 'rujukan',
        no_rujukan: 'RUJ-2026-001',
      })
      expect(result.success).toBe(true)
    })

    it('should accept rawat_inap tipe with bed_id', () => {
      const result = createVisitSchema.safeParse({
        ...validVisit,
        tipe: 'rawat_inap',
        bed_id: '550e8400-e29b-41d4-a716-446655440003',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateVisitStatusSchema', () => {
    it('should accept valid status', () => {
      const statuses = ['menunggu', 'diperiksa', 'selesai', 'batal', 'rawat_inap', 'pulang']
      for (const status of statuses) {
        const result = updateVisitStatusSchema.safeParse({ status })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid status', () => {
      const result = updateVisitStatusSchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should accept optional catatan', () => {
      const result = updateVisitStatusSchema.safeParse({
        status: 'selesai',
        catatan: 'Selesai berobat',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('listVisitsSchema', () => {
    it('should parse with defaults', () => {
      const result = listVisitsSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should accept all filter params', () => {
      const result = listVisitsSchema.safeParse({
        tanggal: '2026-10-11',
        status: 'menunggu',
        tipe: 'rawat_jalan',
        room_id: '550e8400-e29b-41d4-a716-446655440000',
        doctor_id: '550e8400-e29b-41d4-a716-446655440001',
        page: '2',
        limit: '50',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(50)
      }
    })
  })

  describe('cancelVisitSchema', () => {
    it('should accept valid alasan', () => {
      const result = cancelVisitSchema.safeParse({
        alasan: 'Pasien membatalkan kunjungan',
      })
      expect(result.success).toBe(true)
    })

    it('should reject short alasan', () => {
      const result = cancelVisitSchema.safeParse({ alasan: 'ab' })
      expect(result.success).toBe(false)
    })
  })
})
