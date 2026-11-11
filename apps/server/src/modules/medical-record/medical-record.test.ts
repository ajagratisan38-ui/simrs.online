import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  searchIcd10Schema,
  patientHistorySchema,
  createTemplateSchema,
  listTemplatesSchema,
} from './medical-record.validator'

describe('Medical Record Validators', () => {
  // ====================================
  // createMedicalRecordSchema
  // ====================================
  describe('createMedicalRecordSchema', () => {
    it('accepts minimal SOAP data', () => {
      const data = {
        subjective: 'Pasien mengeluh demam 3 hari',
        objective: 'Suhu 38.5°C, tensi 120/80',
        assessment: 'Suspect dengue fever',
        plan: 'Cek darah lengkap, observasi',
      }

      const result = createMedicalRecordSchema.parse(data)
      expect(result.subjective).toBe(data.subjective)
      expect(result.assessment).toBe(data.assessment)
    })

    it('accepts full SOAP with vital signs, diagnoses, procedures, prescription', () => {
      const data = {
        subjective: 'Demam 3 hari, mual muntah',
        objective: 'KU: sakit sedang, CM',
        assessment: 'Dengue Hemorrhagic Fever',
        plan: 'Rawat inap, IVFD RL',
        vital_signs: {
          tekanan_darah_sistolik: 120,
          tekanan_darah_diastolik: 80,
          nadi: 88,
          suhu: 38.5,
          respirasi: 20,
          spo2: 98,
          tinggi_badan: 170,
          berat_badan: 65,
          bmi: 22.5,
        },
        alergi: ['Amoxicillin', 'Sulfa'],
        riwayat_penyakit: 'Hipertensi 5 tahun',
        catatan_tambahan: 'Pasien tampak lemah',
        diagnoses: [
          {
            icd10_code: 'A91',
            icd10_name: 'Dengue haemorrhagic fever',
            tipe: 'utama' as const,
          },
          {
            icd10_code: 'E86',
            icd10_name: 'Volume depletion',
            tipe: 'sekunder' as const,
            catatan: 'Dehidrasi sedang',
          },
        ],
        procedures: [
          {
            kode_tindakan: 'PEM-001',
            nama_tindakan: 'Pemeriksaan darah lengkap',
            tarif: 150000,
            qty: 1,
            total: 150000,
          },
        ],
        prescription: {
          catatan_dokter: 'Berikan setelah makan',
          items: [
            {
              nama_obat: 'Paracetamol 500mg',
              dosis: '500mg',
              satuan: 'tablet',
              frekuensi: '3x sehari',
              durasi_hari: 5,
              jumlah: 15,
              aturan_pakai: '3 x 1 tablet setelah makan',
            },
            {
              nama_obat: 'Domperidone 10mg',
              dosis: '10mg',
              satuan: 'tablet',
              frekuensi: '3x sehari',
              durasi_hari: 3,
              jumlah: 9,
              aturan_pakai: '3 x 1 tablet sebelum makan',
            },
          ],
        },
      }

      const result = createMedicalRecordSchema.parse(data)
      expect(result.diagnoses).toHaveLength(2)
      expect(result.procedures).toHaveLength(1)
      expect(result.prescription?.items).toHaveLength(2)
      expect(result.vital_signs?.suhu).toBe(38.5)
    })

    it('accepts empty body (all optional)', () => {
      const result = createMedicalRecordSchema.parse({})
      expect(result.subjective).toBeUndefined()
      expect(result.diagnoses).toBeUndefined()
    })

    it('rejects invalid vital signs ranges', () => {
      expect(() =>
        createMedicalRecordSchema.parse({
          vital_signs: { tekanan_darah_sistolik: 400 },
        }),
      ).toThrow()

      expect(() =>
        createMedicalRecordSchema.parse({
          vital_signs: { suhu: 50 },
        }),
      ).toThrow()

      expect(() =>
        createMedicalRecordSchema.parse({
          vital_signs: { spo2: 110 },
        }),
      ).toThrow()
    })

    it('rejects diagnosis with short icd10_code', () => {
      expect(() =>
        createMedicalRecordSchema.parse({
          diagnoses: [{ icd10_code: 'A', icd10_name: 'Test' }],
        }),
      ).toThrow()
    })

    it('rejects diagnosis with invalid tipe', () => {
      expect(() =>
        createMedicalRecordSchema.parse({
          diagnoses: [
            {
              icd10_code: 'A91',
              icd10_name: 'DHF',
              tipe: 'invalid',
            },
          ],
        }),
      ).toThrow()
    })

    it('rejects prescription with no items', () => {
      expect(() =>
        createMedicalRecordSchema.parse({
          prescription: { items: [] },
        }),
      ).toThrow()
    })

    it('rejects prescription item with short nama_obat', () => {
      expect(() =>
        createMedicalRecordSchema.parse({
          prescription: {
            items: [{ nama_obat: 'A', jumlah: 1 }],
          },
        }),
      ).toThrow()
    })

    it('rejects procedure with short nama_tindakan', () => {
      expect(() =>
        createMedicalRecordSchema.parse({
          procedures: [{ nama_tindakan: 'X' }],
        }),
      ).toThrow()
    })

    it('accepts procedure with defaults for tarif, qty, total', () => {
      const result = createMedicalRecordSchema.parse({
        procedures: [{ nama_tindakan: 'Injeksi IV' }],
      })
      expect(result.procedures![0].tarif).toBe(0)
      expect(result.procedures![0].qty).toBe(1)
      expect(result.procedures![0].total).toBe(0)
    })
  })

  // ====================================
  // searchIcd10Schema
  // ====================================
  describe('searchIcd10Schema', () => {
    it('accepts valid query', () => {
      const result = searchIcd10Schema.parse({ q: 'demam', limit: '10' })
      expect(result.q).toBe('demam')
      expect(result.limit).toBe(10)
    })

    it('uses default limit', () => {
      const result = searchIcd10Schema.parse({ q: 'diabetes' })
      expect(result.limit).toBe(20)
    })

    it('rejects query < 2 chars', () => {
      expect(() => searchIcd10Schema.parse({ q: 'A' })).toThrow()
    })

    it('rejects limit > 100', () => {
      expect(() =>
        searchIcd10Schema.parse({ q: 'demam', limit: '200' }),
      ).toThrow()
    })
  })

  // ====================================
  // patientHistorySchema
  // ====================================
  describe('patientHistorySchema', () => {
    it('accepts page and limit', () => {
      const result = patientHistorySchema.parse({ page: '2', limit: '10' })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
    })

    it('uses defaults', () => {
      const result = patientHistorySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('rejects page < 1', () => {
      expect(() =>
        patientHistorySchema.parse({ page: '0' }),
      ).toThrow()
    })
  })

  // ====================================
  // createTemplateSchema
  // ====================================
  describe('createTemplateSchema', () => {
    it('accepts valid template', () => {
      const data = {
        name: 'Template SOAP Umum',
        category: 'soap',
        content: {
          subjective: 'Keluhan utama:',
          objective: 'KU: ',
          assessment: '',
          plan: '',
        },
      }

      const result = createTemplateSchema.parse(data)
      expect(result.name).toBe(data.name)
      expect(result.category).toBe('soap')
      expect(result.is_active).toBe(true)
    })

    it('rejects invalid category', () => {
      expect(() =>
        createTemplateSchema.parse({
          name: 'Test',
          category: 'invalid',
          content: {},
        }),
      ).toThrow()
    })

    it('rejects short name', () => {
      expect(() =>
        createTemplateSchema.parse({
          name: 'X',
          category: 'soap',
          content: {},
        }),
      ).toThrow()
    })
  })

  // ====================================
  // listTemplatesSchema
  // ====================================
  describe('listTemplatesSchema', () => {
    it('accepts optional category filter', () => {
      const result = listTemplatesSchema.parse({ category: 'assessment' })
      expect(result.category).toBe('assessment')
    })

    it('accepts empty (no filter)', () => {
      const result = listTemplatesSchema.parse({})
      expect(result.category).toBeUndefined()
    })

    it('rejects invalid category', () => {
      expect(() =>
        listTemplatesSchema.parse({ category: 'invalid' }),
      ).toThrow()
    })
  })
})
