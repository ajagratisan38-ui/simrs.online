import {
  createPatientSchema,
  updatePatientSchema,
  searchPatientSchema,
  duplicateCheckSchema,
  mergePatientSchema,
} from './patient.validator'

// ==========================================
// Validator Tests
// ==========================================

describe('Patient Validators', () => {
  const validPatient = {
    nik: '3201234567890001',
    nama: 'Ahmad Fajar',
    tempat_lahir: 'Jakarta',
    tanggal_lahir: '1990-05-15',
    jenis_kelamin: 'L' as const,
    alamat: 'Jl. Merdeka No. 10, RT 01/02',
    no_telepon: '081234567890',
    no_bpjs: '0001234567890',
  }

  describe('createPatientSchema', () => {
    it('should accept valid patient data', () => {
      const result = createPatientSchema.safeParse(validPatient)
      expect(result.success).toBe(true)
    })

    it('should reject NIK that is not 16 digits', () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        nik: '12345',
      })
      expect(result.success).toBe(false)
    })

    it('should reject NIK with non-digit characters', () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        nik: '32012345678900AB',
      })
      expect(result.success).toBe(false)
    })

    it('should reject nama shorter than 2 chars', () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        nama: 'A',
      })
      expect(result.success).toBe(false)
    })

    it('should reject future tanggal_lahir', () => {
      const future = new Date()
      future.setFullYear(future.getFullYear() + 1)
      const result = createPatientSchema.safeParse({
        ...validPatient,
        tanggal_lahir: future.toISOString().split('T')[0],
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid jenis_kelamin', () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        jenis_kelamin: 'X',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid Indonesian phone numbers', () => {
      const formats = ['081234567890', '6281234567890', '+6281234567890']
      for (const no_telepon of formats) {
        const result = createPatientSchema.safeParse({
          ...validPatient,
          no_telepon,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid phone numbers', () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        no_telepon: '12345',
      })
      expect(result.success).toBe(false)
    })

    it('should reject BPJS number that is not 13 digits', () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        no_bpjs: '12345',
      })
      expect(result.success).toBe(false)
    })

    it('should accept patient without optional fields', () => {
      const result = createPatientSchema.safeParse({
        nik: '3201234567890001',
        nama: 'Ahmad',
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '1990-01-01',
        jenis_kelamin: 'L',
        alamat: 'Jl. Test No. 1',
      })
      expect(result.success).toBe(true)
    })

    it('should trim nama and alamat', () => {
      const result = createPatientSchema.safeParse({
        ...validPatient,
        nama: '  Ahmad Fajar  ',
        alamat: '  Jl. Test  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nama).toBe('Ahmad Fajar')
        expect(result.data.alamat).toBe('Jl. Test')
      }
    })
  })

  describe('updatePatientSchema', () => {
    it('should accept partial data', () => {
      const result = updatePatientSchema.safeParse({ nama: 'Budi Update' })
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = updatePatientSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should still validate fields when provided', () => {
      const result = updatePatientSchema.safeParse({ nik: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('searchPatientSchema', () => {
    it('should parse with defaults', () => {
      const result = searchPatientSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
        expect(result.data.status).toBe('active')
        expect(result.data.sort).toBe('nama')
        expect(result.data.order).toBe('asc')
      }
    })

    it('should coerce string page/limit to numbers', () => {
      const result = searchPatientSchema.safeParse({
        page: '3',
        limit: '50',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.limit).toBe(50)
      }
    })

    it('should reject limit over 100', () => {
      const result = searchPatientSchema.safeParse({ limit: '200' })
      expect(result.success).toBe(false)
    })
  })

  describe('duplicateCheckSchema', () => {
    it('should accept valid NIK', () => {
      const result = duplicateCheckSchema.safeParse({ nik: '3201234567890001' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid NIK', () => {
      const result = duplicateCheckSchema.safeParse({ nik: '123' })
      expect(result.success).toBe(false)
    })
  })

  describe('mergePatientSchema', () => {
    it('should accept valid UUIDs', () => {
      const result = mergePatientSchema.safeParse({
        primaryId: '550e8400-e29b-41d4-a716-446655440000',
        duplicateId: '550e8400-e29b-41d4-a716-446655440001',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUIDs', () => {
      const result = mergePatientSchema.safeParse({
        primaryId: 'not-a-uuid',
        duplicateId: 'also-not',
      })
      expect(result.success).toBe(false)
    })
  })
})
