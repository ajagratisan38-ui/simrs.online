import type { Knex } from 'knex'
import { bpjsRequest, BpjsError } from './bpjs.client'
import { VCLAIM_ENDPOINTS, PCARE_ENDPOINTS, EKLAIM_ENDPOINTS, APLICARE_ENDPOINTS, ANTROL_ENDPOINTS } from './bpjs.config'
import { logger } from '../../shared/logger'

// --- Types ---

export interface BpjsPeserta {
  noKartu: string
  nik: string
  nama: string
  tglLahir: string
  sex: string
  hakKelas: { kode: string; keterangan: string }
  statusPeserta: { kode: string; keterangan: string }
  jenisPeserta: { kode: string; keterangan: string }
  provUmum: { kdProvider: string; nmProvider: string }
  umur: { umurSekarang: string }
  noHP: string | null
  tglMulaiAktif: string
  tglAkhirBerlaku: string
}

export interface BpjsSep {
  noSep: string
  tglSep: string
  noKartu: string
  peserta: {
    nama: string
    nik: string
    hakKelas?: { kode: string; keterangan: string }
  }
  diagnosa?: string
  poli?: string
  kelasRawat?: string
}

export interface CreateSepInput {
  noKartu: string
  tglSep: string
  ppkPelayanan: string
  jnsPelayanan: '1' | '2' // 1 = rawat inap, 2 = rawat jalan
  klsRawatHak: string
  klsRawatNaik?: string
  pembiayaan?: string
  penanggungJawab?: string
  noMR: string
  asalRujukan?: string
  tglRujukan?: string
  noRujukan?: string
  ppkRujukan?: string
  catatan?: string
  diagAwal: string
  poliTujuan: string
  poliEksekutif?: string
  cob?: { penjamin: string }
  katarak?: { ketKatarak: string }
  jaminanLakaLantas?: {
    penjamin: string
    tglKejadian?: string
    keterangan?: string
    noSEPSuplesi?: string
    kdPropinsi?: string
    kdKabupaten?: string
    kdKecamatan?: string
  }
  skdp?: {
    noSurat: string
    kodeDPJP: string
  }
  noTelp: string
  user: string
}

export interface UpdateSepInput {
  noSep: string
  klsRawat?: string
  noMR?: string
  catatan?: string
  diagAwal?: string
  poliTujuan?: string
  noTelp?: string
  user: string
}

export interface BpjsRujukan {
  noKunjungan: string
  tglKunjungan: string
  provPerujuk: { kode: string; nama: string }
  diagnosa: { kode: string; nama: string }
  poliRujukan: { kode: string; nama: string }
  pelayanan: { kode: string; nama: string }
}

export interface BpjsPoliRef {
  kode: string
  nama: string
}

export interface BpjsDiagnosaRef {
  kode: string
  nama: string
}

// --- Service ---

export class BpjsService {
  private db: Knex

  constructor(db: Knex) {
    this.db = db
    // Suppress unused for now — db will be used for audit log table
    void this.db
  }

  // =====================
  // SEP QUOTA (BATAS SEP HARIAN)
  // =====================

  async getSepQuota(tenantSchema: string): Promise<{
    limit: number
    used: number
    remaining: number
    isUnlimited: boolean
  }> {
    const tenantSlug = tenantSchema.replace('tenant_', '')
    const tenant = await this.db('tenants')
      .where('slug', tenantSlug)
      .select('settings')
      .first()

    const settings = typeof tenant?.settings === 'string'
      ? JSON.parse(tenant.settings)
      : tenant?.settings || {}

    const limit = Number(settings.bpjs_sep_limit) || 0

    if (limit <= 0) {
      return { limit: 0, used: 0, remaining: 0, isUnlimited: true }
    }

    const today = new Date().toISOString().split('T')[0]
    const result = await this.db
      .withSchema(tenantSchema)
      .count('id as count')
      .from('visits')
      .where('penjamin', 'bpjs')
      .whereNotNull('no_sep')
      .where('tanggal', today)
      .whereNotIn('status', ['batal'])
      .whereNull('deleted_at')
      .first()

    const used = Number((result as Record<string, unknown>)?.count ?? 0)
    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      isUnlimited: false,
    }
  }

  async checkSepQuota(
    tenantSchema: string,
    isIGD = false,
  ): Promise<{
    allowed: boolean
    quota: { limit: number; used: number; remaining: number; isUnlimited: boolean }
    message: string | null
  }> {
    const quota = await this.getSepQuota(tenantSchema)

    if (quota.isUnlimited) {
      return { allowed: true, quota, message: null }
    }

    if (isIGD) {
      return {
        allowed: true,
        quota,
        message: quota.remaining <= 0
          ? `Kuota SEP harian tercapai (${quota.used}/${quota.limit}), tetapi diizinkan karena kasus IGD.`
          : null,
      }
    }

    if (quota.remaining <= 0) {
      return {
        allowed: false,
        quota,
        message: `Kuota SEP harian tercapai (${quota.used}/${quota.limit}). `
          + 'Pendaftaran BPJS non-darurat tidak bisa dilakukan hari ini. '
          + 'Kasus IGD tetap dapat didaftarkan.',
      }
    }

    if (quota.remaining <= 5) {
      return {
        allowed: true,
        quota,
        message: `Perhatian: Sisa kuota SEP hari ini tinggal ${quota.remaining} dari ${quota.limit}.`,
      }
    }

    return { allowed: true, quota, message: null }
  }

  // =====================
  // PESERTA
  // =====================

  async getPeserta(noBpjs: string, tenantSchema: string): Promise<BpjsPeserta> {
    const result = await bpjsRequest<{ peserta: BpjsPeserta }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.peserta(noBpjs),
    })

    const peserta = result.data?.peserta
    if (!peserta) {
      throw new BpjsError('Data peserta tidak ditemukan', 'BPJS_PESERTA_NOT_FOUND', 404)
    }

    // Log lookup for audit
    this.logBpjsActivity(tenantSchema, 'peserta_lookup', {
      noKartu: noBpjs,
      nama: peserta.nama,
    })

    return peserta
  }

  async getPesertaByNik(nik: string, tenantSchema: string): Promise<BpjsPeserta> {
    const result = await bpjsRequest<{ peserta: BpjsPeserta }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.pesertaByNik(nik),
    })

    const peserta = result.data?.peserta
    if (!peserta) {
      throw new BpjsError('Data peserta tidak ditemukan', 'BPJS_PESERTA_NOT_FOUND', 404)
    }

    this.logBpjsActivity(tenantSchema, 'peserta_lookup_nik', {
      nik,
      nama: peserta.nama,
    })

    return peserta
  }

  // =====================
  // SEP (Surat Eligibilitas Peserta)
  // =====================

  async createSEP(
    data: CreateSepInput,
    tenantSchema: string,
    isIGD = false,
  ): Promise<BpjsSep> {
    // Check daily quota before creating SEP
    const quotaCheck = await this.checkSepQuota(tenantSchema, isIGD)
    if (!quotaCheck.allowed) {
      throw new BpjsError(
        quotaCheck.message || 'Kuota SEP harian tercapai',
        'BPJS_SEP_QUOTA_EXCEEDED',
        429,
      )
    }

    const result = await bpjsRequest<{ sep: BpjsSep }>({
      method: 'POST',
      path: VCLAIM_ENDPOINTS.sepInsert,
      body: {
        t_sep: {
          noKartu: data.noKartu,
          tglSep: data.tglSep,
          ppkPelayanan: data.ppkPelayanan,
          jnsPelayanan: data.jnsPelayanan,
          klsRawat: {
            klsRawatHak: data.klsRawatHak,
            klsRawatNaik: data.klsRawatNaik || '',
            pembiayaan: data.pembiayaan || '',
            penanggungJawab: data.penanggungJawab || '',
          },
          noMR: data.noMR,
          rujukan: {
            asalRujukan: data.asalRujukan || '1',
            tglRujukan: data.tglRujukan || data.tglSep,
            noRujukan: data.noRujukan || '',
            ppkRujukan: data.ppkRujukan || '',
          },
          catatan: data.catatan || '',
          diagAwal: data.diagAwal,
          poli: {
            tujuan: data.poliTujuan,
            eksekutif: data.poliEksekutif || '0',
          },
          cob: {
            cob: data.cob?.penjamin || '0',
          },
          katarak: {
            katarak: data.katarak?.ketKatarak || '0',
          },
          jaminan: {
            lakaLantas: data.jaminanLakaLantas?.penjamin || '0',
            penjamin: {
              tglKejadian: data.jaminanLakaLantas?.tglKejadian || '',
              keterangan: data.jaminanLakaLantas?.keterangan || '',
              suplesi: {
                suplesi: '0',
                noSepSuplesi: data.jaminanLakaLantas?.noSEPSuplesi || '',
                lokasiLaka: {
                  kdPropinsi: data.jaminanLakaLantas?.kdPropinsi || '',
                  kdKabupaten: data.jaminanLakaLantas?.kdKabupaten || '',
                  kdKecamatan: data.jaminanLakaLantas?.kdKecamatan || '',
                },
              },
            },
          },
          skdp: {
            noSurat: data.skdp?.noSurat || '',
            kodeDPJP: data.skdp?.kodeDPJP || '',
          },
          noTelp: data.noTelp,
          user: data.user,
        },
      },
    })

    const sep = result.data?.sep
    if (!sep) {
      throw new BpjsError('Gagal membuat SEP', 'BPJS_SEP_CREATE_FAILED')
    }

    this.logBpjsActivity(tenantSchema, 'sep_create', {
      noSep: sep.noSep,
      noKartu: data.noKartu,
    })

    return sep
  }

  async updateSEP(
    data: UpdateSepInput,
    tenantSchema: string,
  ): Promise<void> {
    await bpjsRequest({
      method: 'PUT',
      path: VCLAIM_ENDPOINTS.sepUpdate,
      body: {
        t_sep: {
          noSep: data.noSep,
          klsRawat: data.klsRawat,
          noMR: data.noMR,
          catatan: data.catatan,
          diagAwal: data.diagAwal,
          poli: { tujuan: data.poliTujuan },
          noTelp: data.noTelp,
          user: data.user,
        },
      },
    })

    this.logBpjsActivity(tenantSchema, 'sep_update', { noSep: data.noSep })
  }

  async deleteSEP(
    noSep: string,
    user: string,
    tenantSchema: string,
  ): Promise<void> {
    await bpjsRequest({
      method: 'DELETE',
      path: VCLAIM_ENDPOINTS.sepDelete(noSep),
      body: {
        t_sep: {
          noSep,
          user,
        },
      },
    })

    this.logBpjsActivity(tenantSchema, 'sep_delete', { noSep })
  }

  async getSEP(noSep: string, tenantSchema: string): Promise<BpjsSep> {
    const result = await bpjsRequest<BpjsSep>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.sepGet(noSep),
    })

    if (!result.data) {
      throw new BpjsError('SEP tidak ditemukan', 'BPJS_SEP_NOT_FOUND', 404)
    }

    this.logBpjsActivity(tenantSchema, 'sep_get', { noSep })

    return result.data
  }

  // =====================
  // RUJUKAN
  // =====================

  async getRujukan(
    noKartu: string,
    tenantSchema: string,
  ): Promise<BpjsRujukan[]> {
    const result = await bpjsRequest<{ rujukan: BpjsRujukan[] }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.rujukanByKartu(noKartu),
    })

    this.logBpjsActivity(tenantSchema, 'rujukan_lookup', { noKartu })

    return result.data?.rujukan ?? []
  }

  // =====================
  // REFERENSI
  // =====================

  async getPoliReferensi(
    keyword: string,
    _tenantSchema: string,
  ): Promise<BpjsPoliRef[]> {
    if (!keyword || keyword.length < 2) return []

    const result = await bpjsRequest<{ poli: BpjsPoliRef[] }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.refPoli(keyword),
    })

    return result.data?.poli ?? []
  }

  async getDiagnosaReferensi(
    keyword: string,
    _tenantSchema: string,
  ): Promise<BpjsDiagnosaRef[]> {
    if (!keyword || keyword.length < 3) return []

    const result = await bpjsRequest<{ diagnosa: BpjsDiagnosaRef[] }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.refDiagnosa(keyword),
    })

    return result.data?.diagnosa ?? []
  }

  // =====================
  // FINGERPRINT (stub)
  // =====================

  async checkFingerprint(
    noKartu: string,
    _tenantSchema: string,
  ): Promise<{ valid: boolean; message: string }> {
    // Biometric verification depends on hardware (fingerprint device)
    // This is a stub — actual implementation requires vendor SDK
    logger.info('Fingerprint check stub', { noKartu })
    return {
      valid: true,
      message: 'Verifikasi biometrik berhasil (mode simulasi)',
    }
  }

  // =====================
  // REFERENSI LANJUTAN
  // =====================

  async getProsedurReferensi(keyword: string, _tenantSchema: string) {
    if (!keyword || keyword.length < 2) return []
    const result = await bpjsRequest<{ prosedur: { kode: string; nama: string }[] }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.refProsedur(keyword),
    })
    return result.data?.prosedur ?? []
  }

  async getFaskesReferensi(keyword: string, jenis: number, _tenantSchema: string) {
    if (!keyword || keyword.length < 2) return []
    const result = await bpjsRequest<{ faskes: { kode: string; nama: string; jenis: number }[] }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.refFaskes(keyword, jenis),
    })
    return result.data?.faskes ?? []
  }

  async getDokterReferensi(keyword: string, _tenantSchema: string) {
    if (!keyword || keyword.length < 2) return []
    const result = await bpjsRequest<{ dokter: { kode: string; nama: string }[] }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.refDokter(keyword),
    })
    return result.data?.dokter ?? []
  }

  async getSpesialistikReferensi(_tenantSchema: string) {
    const result = await bpjsRequest<{ spesialis: { kode: string; nama: string }[] }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.refSpesialistik(),
    })
    return result.data?.spesialis ?? []
  }

  // =====================
  // MONITORING
  // =====================

  async getKunjunganBulanan(tahun: string, bulan: string, tenantSchema: string) {
    const result = await bpjsRequest<{ kunjungan: Record<string, unknown> }>({
      method: 'GET',
      path: VCLAIM_ENDPOINTS.kunjunganBulanan(tahun, bulan),
    })
    this.logBpjsActivity(tenantSchema, 'monitoring_kunjungan', { tahun, bulan })
    return result.data?.kunjungan ?? null
  }

  // =====================
  // PCARE
  // =====================

  async pcareCreatePendaftaran(data: PcareCreatePendaftaranInput, tenantSchema: string) {
    const result = await bpjsRequest<{ noUrut: string; message: string }>({
      method: 'POST',
      path: PCARE_ENDPOINTS.pendaftaranInsert,
      body: {
        noKartu: data.noKartu,
        tglDaftar: data.tglDaftar,
        kdPoli: data.kdPoli,
        keluhan: data.keluhan,
        kunjSakit: data.kunjSakit,
        sistole: data.sistole,
        diastole: data.diastole,
        beratBadan: data.beratBadan,
        tinggiBadan: data.tinggiBadan,
        respRate: data.respRate,
        heartRate: data.heartRate,
        lingkarPerut: data.lingkarPerut || 0,
        rujukBalik: data.rujukBalik || '0',
        kdTkp: data.kdTkp || '10',
      },
      service: 'pcare',
    })
    this.logBpjsActivity(tenantSchema, 'pcare_pendaftaran', { noKartu: data.noKartu })
    return result.data
  }

  async pcareCreateKunjungan(data: PcareCreateKunjunganInput, tenantSchema: string) {
    const result = await bpjsRequest<{ noKunjungan: string; message: string }>({
      method: 'POST',
      path: PCARE_ENDPOINTS.kunjunganInsert,
      body: {
        noKunjungan: data.noKunjungan || null,
        noKartu: data.noKartu,
        tglDaftar: data.tglDaftar,
        kdPoli: data.kdPoli,
        kdSadar: data.kdSadar || '01',
        keluhan: data.keluhan,
        kdDiag1: data.kdDiag1,
        kdDiag2: data.kdDiag2 || null,
        kdDiag3: data.kdDiag3 || null,
        terapiObat: data.terapiObat || null,
        terapiNonObat: data.terapiNonObat || null,
        bmhp: data.bmhp || null,
        supilemen: data.supilemen || null,
        kdStatusPulang: data.kdStatusPulang || '3',
        tglPulang: data.tglPulang || data.tglDaftar,
        kdDokter: data.kdDokter,
        kdTACC: data.kdTACC || '-1',
        alasanTACC: data.alasanTACC || null,
        anamnpisat: data.anamnpisat || null,
        alergiMakan: data.alergiMakan || null,
        alergiUdara: data.alergiUdara || null,
        alergiObat: data.alergiObat || null,
        kdPrognpisat: data.kdPrognpisat || null,
      },
      service: 'pcare',
    })
    this.logBpjsActivity(tenantSchema, 'pcare_kunjungan', { noKartu: data.noKartu })
    return result.data
  }

  async pcareDeletePendaftaran(noUrut: string, tglDaftar: string, tenantSchema: string) {
    await bpjsRequest({
      method: 'DELETE',
      path: PCARE_ENDPOINTS.pendaftaranDelete(noUrut, tglDaftar),
      service: 'pcare',
    })
    this.logBpjsActivity(tenantSchema, 'pcare_pendaftaran_delete', { noUrut, tglDaftar })
  }

  async pcareGetKunjunganByTanggal(tglDaftar: string, offset: number, limit: number, tenantSchema: string) {
    const result = await bpjsRequest<{
      list: PcareKunjunganRow[]
      count: number
    }>({
      method: 'GET',
      path: PCARE_ENDPOINTS.kunjunganByTanggal(tglDaftar, offset, limit),
      service: 'pcare',
    })
    this.logBpjsActivity(tenantSchema, 'pcare_kunjungan_list', { tglDaftar })
    return result.data
  }

  async pcareGetRiwayatKunjungan(noKartu: string, tenantSchema: string) {
    const result = await bpjsRequest<{ list: PcareKunjunganRow[] }>({
      method: 'GET',
      path: PCARE_ENDPOINTS.riwayatKunjungan(noKartu),
      service: 'pcare',
    })
    this.logBpjsActivity(tenantSchema, 'pcare_riwayat_kunjungan', { noKartu })
    return result.data?.list ?? []
  }

  async pcareSearchObatDPHO(keyword: string) {
    if (!keyword || keyword.length < 2) return []
    const result = await bpjsRequest<{ obat: PcareObatRow[] }>({
      method: 'GET',
      path: PCARE_ENDPOINTS.obatDpho(keyword),
      service: 'pcare',
    })
    return result.data?.obat ?? []
  }

  // =====================
  // E-KLAIM / INACBG
  // =====================

  async eklaimGroupingStage1(data: EklaimGroupingInput, tenantSchema: string) {
    const result = await bpjsRequest<EklaimGroupingResult>({
      method: 'POST',
      path: EKLAIM_ENDPOINTS.groupingStage1,
      body: {
        nomor_sep: data.noSep,
        nomor_kartu: data.noKartu,
        tgl_masuk: data.tglMasuk,
        tgl_pulang: data.tglPulang,
        jenis_rawat: data.jenisRawat,
        kelas_rawat: data.kelasRawat,
        adl_sub_acute: data.adlSubAcute || 0,
        adl_chronic: data.adlChronic || 0,
        icu_indikator: data.icuIndikator || '0',
        icu_los: data.icuLos || 0,
        ventilator_hour: data.ventilatorHour || 0,
        upgrade_class_ind: data.upgradeClassInd || '0',
        upgrade_class_class: data.upgradeClassClass || '',
        upgrade_class_los: data.upgradeClassLos || 0,
        birth_weight: data.birthWeight || 0,
        diagnosa: data.diagnosa,
        procedure: data.procedure || [],
      },
    })
    this.logBpjsActivity(tenantSchema, 'eklaim_grouping', { noSep: data.noSep })
    return result.data
  }

  async eklaimGetClaimData(noSep: string, tenantSchema: string) {
    const result = await bpjsRequest<EklaimClaimData>({
      method: 'GET',
      path: EKLAIM_ENDPOINTS.getClaimData(noSep),
    })
    this.logBpjsActivity(tenantSchema, 'eklaim_get_claim', { noSep })
    return result.data
  }

  async eklaimListClaims(
    params: { tglMasuk: string; tglPulang: string; jenisPelayanan: string; status: string },
    tenantSchema: string,
  ) {
    const result = await bpjsRequest<{
      list: EklaimClaimListItem[]
      count: number
    }>({
      method: 'GET',
      path: EKLAIM_ENDPOINTS.listClaimData(params.tglMasuk, params.tglPulang, params.jenisPelayanan, params.status),
    })
    this.logBpjsActivity(tenantSchema, 'eklaim_list_claims', params)
    return result.data
  }

  async eklaimGetClaimStatus(noSep: string, tenantSchema: string) {
    const result = await bpjsRequest<EklaimClaimData>({
      method: 'GET',
      path: EKLAIM_ENDPOINTS.statusKlaim(noSep),
    })
    this.logBpjsActivity(tenantSchema, 'eklaim_status', { noSep })
    return result.data
  }

  async eklaimDeleteClaim(noSep: string, tenantSchema: string) {
    await bpjsRequest({
      method: 'DELETE',
      path: EKLAIM_ENDPOINTS.deleteClaimData(noSep),
    })
    this.logBpjsActivity(tenantSchema, 'eklaim_delete', { noSep })
  }

  // =====================
  // APLICARE
  // =====================

  async aplicareGetBedAvailability(ppkCode: string, tenantSchema: string) {
    const result = await bpjsRequest<{
      list: AplicareBedRow[]
    }>({
      method: 'GET',
      path: APLICARE_ENDPOINTS.bedAvailability(ppkCode),
      service: 'aplicare',
    })
    this.logBpjsActivity(tenantSchema, 'aplicare_bed', { ppkCode })
    return result.data?.list ?? []
  }

  // =====================
  // ANTROL (ANTREAN ONLINE)
  // =====================

  async antrolRefPoli(_tenantSchema: string) {
    const result = await bpjsRequest<{
      poli: AntrolPoliRef[]
    }>({
      method: 'GET',
      path: ANTROL_ENDPOINTS.refPoli,
      service: 'antrol',
    })
    return result.data?.poli ?? []
  }

  async antrolRefDokter(_tenantSchema: string) {
    const result = await bpjsRequest<{
      dokter: AntrolDokterRef[]
    }>({
      method: 'GET',
      path: ANTROL_ENDPOINTS.refDokter,
      service: 'antrol',
    })
    return result.data?.dokter ?? []
  }

  async antrolGetJadwalDokter(kodePoli: string, tanggal: string, _tenantSchema: string) {
    const result = await bpjsRequest<{
      jadwal: AntrolJadwalDokter[]
    }>({
      method: 'GET',
      path: ANTROL_ENDPOINTS.refJadwalDokter(kodePoli, tanggal),
      service: 'antrol',
    })
    return result.data?.jadwal ?? []
  }

  async antrolTambahAntrean(data: AntrolAddInput, tenantSchema: string) {
    const result = await bpjsRequest<AntrolAddResult>({
      method: 'POST',
      path: ANTROL_ENDPOINTS.tambahAntrean,
      body: data as unknown as Record<string, unknown>,
      service: 'antrol',
    })

    // Store locally
    try {
      await this.db.withSchema(tenantSchema)
        .insert({
          kodebooking: result.data.kodebooking,
          nomorkartu: data.nomorkartu,
          nik: data.nik,
          nohp: data.nohp,
          kodepoli: data.kodepoli,
          namapoli: data.namapoli,
          kodedokter: data.kodedokter,
          namadokter: data.namadokter,
          tanggalperiksa: data.tanggalperiksa,
          jampraktek: data.jampraktek,
          jeniskunjungan: data.jeniskunjungan,
          nomorreferensi: data.nomorreferensi,
          nomorantrean: result.data.nomorantrean || data.nomorantrean,
          angkaantrean: result.data.angkaantrean || data.angkaantrean,
          estimasidilayani: result.data.estimasidilayani || data.estimasidilayani,
          status: 'menunggu',
          taskid: 0,
          source: 'rs',
        })
        .into('antrol_bookings')
    } catch (err) {
      logger.warn('Failed to store antrol booking locally', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    this.logBpjsActivity(tenantSchema, 'antrol_tambah', {
      kodebooking: result.data.kodebooking,
      nomorkartu: data.nomorkartu,
    })

    return result.data
  }

  async antrolUpdateAntrean(data: AntrolUpdateInput, tenantSchema: string) {
    await bpjsRequest({
      method: 'PUT',
      path: ANTROL_ENDPOINTS.updateAntrean,
      body: data as unknown as Record<string, unknown>,
      service: 'antrol',
    })

    // Update local status
    const statusMap: Record<number, string> = {
      1: 'checkin', 2: 'dilayani', 3: 'selesai', 4: 'selesai', 5: 'batal', 99: 'batal',
    }
    const newStatus = statusMap[data.taskid] || 'menunggu'

    try {
      await this.db.withSchema(tenantSchema)
        .table('antrol_bookings')
        .where('kodebooking', data.kodebooking)
        .update({
          status: newStatus,
          taskid: data.taskid,
          updated_at: this.db.fn.now(),
        })
    } catch (err) {
      logger.warn('Failed to update local antrol status', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    this.logBpjsActivity(tenantSchema, 'antrol_update', {
      kodebooking: data.kodebooking,
      taskid: data.taskid,
    })
  }

  async antrolBatalAntrean(data: AntrolBatalInput, tenantSchema: string) {
    await bpjsRequest({
      method: 'PUT',
      path: ANTROL_ENDPOINTS.batalAntrean,
      body: data as unknown as Record<string, unknown>,
      service: 'antrol',
    })

    try {
      await this.db.withSchema(tenantSchema)
        .table('antrol_bookings')
        .where('kodebooking', data.kodebooking)
        .update({
          status: 'batal',
          taskid: 99,
          keterangan_batal: data.keterangan,
          updated_at: this.db.fn.now(),
        })
    } catch (err) {
      logger.warn('Failed to update local antrol cancel', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    this.logBpjsActivity(tenantSchema, 'antrol_batal', {
      kodebooking: data.kodebooking,
    })
  }

  async antrolGetListTask(kodePoli: string, tanggal: string, tenantSchema: string) {
    const result = await bpjsRequest<{
      list: AntrolTaskItem[]
    }>({
      method: 'GET',
      path: ANTROL_ENDPOINTS.listTaskId(kodePoli, tanggal),
      service: 'antrol',
    })

    this.logBpjsActivity(tenantSchema, 'antrol_list_task', { kodePoli, tanggal })

    return result.data?.list ?? []
  }

  async antrolDashboardPerTanggal(tanggal: string, waktu: string, tenantSchema: string) {
    const result = await bpjsRequest<AntrolDashboard>({
      method: 'GET',
      path: ANTROL_ENDPOINTS.dashboardPerTanggal(tanggal, waktu),
      service: 'antrol',
    })

    this.logBpjsActivity(tenantSchema, 'antrol_dashboard_tanggal', { tanggal })

    return result.data
  }

  async antrolDashboardPerBulan(bulan: string, tahun: string, waktu: string, tenantSchema: string) {
    const result = await bpjsRequest<AntrolDashboard>({
      method: 'GET',
      path: ANTROL_ENDPOINTS.dashboardPerBulan(bulan, tahun, waktu),
      service: 'antrol',
    })

    this.logBpjsActivity(tenantSchema, 'antrol_dashboard_bulan', { bulan, tahun })

    return result.data
  }

  // --- Antrol local sync & management ---

  async antrolSyncTasks(kodePoli: string, tanggal: string, tenantSchema: string) {
    const tasks = await this.antrolGetListTask(kodePoli, tanggal, tenantSchema)

    for (const task of tasks) {
      const statusMap: Record<number, string> = {
        0: 'menunggu', 1: 'checkin', 2: 'dilayani', 3: 'selesai', 5: 'batal',
      }
      const status = statusMap[task.taskid] ?? 'menunggu'

      // Attempt to match patient by nomorkartu
      let patientId: string | null = null
      try {
        const patient = await this.db.withSchema(tenantSchema)
          .select('id')
          .from('patients')
          .where('no_bpjs', task.nomorkartu)
          .orWhere('nik', task.nik)
          .first()
        if (patient) patientId = patient.id
      } catch {
        // patients table might not have no_bpjs column in all schemas
      }

      // Upsert into local table
      try {
        const existing = await this.db.withSchema(tenantSchema)
          .select('id')
          .from('antrol_bookings')
          .where('kodebooking', task.kodebooking)
          .first()

        if (existing) {
          await this.db.withSchema(tenantSchema)
            .table('antrol_bookings')
            .where('kodebooking', task.kodebooking)
            .update({
              status,
              taskid: task.taskid,
              nomorantrean: task.nomorantrean,
              angkaantrean: task.angkaantrean,
              estimasidilayani: task.estimasidilayani,
              patient_id: patientId,
              updated_at: this.db.fn.now(),
            })
        } else {
          await this.db.withSchema(tenantSchema)
            .insert({
              kodebooking: task.kodebooking,
              nomorkartu: task.nomorkartu,
              nik: task.nik,
              nohp: task.nohp,
              kodepoli: task.kodepoli,
              namapoli: task.namapoli,
              kodedokter: task.kodedokter,
              namadokter: task.namadokter,
              tanggalperiksa: task.tanggalperiksa,
              jampraktek: task.jampraktek,
              jeniskunjungan: task.jeniskunjungan,
              nomorreferensi: task.nomorreferensi,
              nomorantrean: task.nomorantrean,
              angkaantrean: task.angkaantrean,
              estimasidilayani: task.estimasidilayani,
              status,
              taskid: task.taskid,
              source: 'mobile_jkn',
              patient_id: patientId,
            })
            .into('antrol_bookings')
        }
      } catch (err) {
        logger.warn('Failed to upsert antrol task locally', {
          kodebooking: task.kodebooking,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return { synced: tasks.length }
  }

  async antrolGetLocalBookings(
    filters: { tanggal?: string; kodePoli?: string; status?: string; page?: number; limit?: number },
    tenantSchema: string,
  ) {
    const page = filters.page || 1
    const limit = Math.min(filters.limit || 50, 100)
    const offset = (page - 1) * limit

    let query = this.db.withSchema(tenantSchema)
      .select('*')
      .from('antrol_bookings')

    let countQuery = this.db.withSchema(tenantSchema)
      .count('id as count')
      .from('antrol_bookings')

    if (filters.tanggal) {
      query = query.where('tanggalperiksa', filters.tanggal)
      countQuery = countQuery.where('tanggalperiksa', filters.tanggal)
    }
    if (filters.kodePoli) {
      query = query.where('kodepoli', filters.kodePoli)
      countQuery = countQuery.where('kodepoli', filters.kodePoli)
    }
    if (filters.status) {
      query = query.where('status', filters.status)
      countQuery = countQuery.where('status', filters.status)
    }

    const [rows, countResult] = await Promise.all([
      query.orderBy('angkaantrean', 'asc').offset(offset).limit(limit),
      countQuery.first(),
    ])

    const total = Number((countResult as Record<string, unknown>)?.count ?? 0)

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async antrolUpdateLocalStatus(kodebooking: string, taskid: number, tenantSchema: string) {
    const statusMap: Record<number, string> = {
      1: 'checkin', 2: 'dilayani', 3: 'selesai', 4: 'selesai', 5: 'batal', 99: 'batal',
    }
    const newStatus = statusMap[taskid] || 'menunggu'

    // Update BPJS first
    await this.antrolUpdateAntrean({
      kodebooking,
      taskid,
      waktu: Math.floor(Date.now() / 1000),
    }, tenantSchema)

    return { kodebooking, status: newStatus, taskid }
  }

  async antrolLinkVisit(kodebooking: string, visitId: string, tenantSchema: string) {
    await this.db.withSchema(tenantSchema)
      .table('antrol_bookings')
      .where('kodebooking', kodebooking)
      .update({
        visit_id: visitId,
        updated_at: this.db.fn.now(),
      })

    this.logBpjsActivity(tenantSchema, 'antrol_link_visit', { kodebooking, visitId })
  }

  // =====================
  // AUDIT LOGGING
  // =====================

  private logBpjsActivity(
    tenantSchema: string,
    action: string,
    details: Record<string, unknown>,
  ) {
    logger.info('BPJS activity', {
      tenant: tenantSchema,
      action,
      ...details,
    })
  }
}

// ═══ Additional Types ═══

export interface PcareCreatePendaftaranInput {
  noKartu: string
  tglDaftar: string
  kdPoli: string
  keluhan: string
  kunjSakit: boolean
  sistole: number
  diastole: number
  beratBadan: number
  tinggiBadan: number
  respRate: number
  heartRate: number
  lingkarPerut?: number
  rujukBalik?: string
  kdTkp?: string
}

export interface PcareCreateKunjunganInput {
  noKunjungan?: string
  noKartu: string
  tglDaftar: string
  kdPoli: string
  kdSadar?: string
  keluhan: string
  kdDiag1: string
  kdDiag2?: string
  kdDiag3?: string
  terapiObat?: string
  terapiNonObat?: string
  bmhp?: string
  supilemen?: string
  kdStatusPulang?: string
  tglPulang?: string
  kdDokter: string
  kdTACC?: string
  alasanTACC?: string
  anamnpisat?: string
  alergiMakan?: string
  alergiUdara?: string
  alergiObat?: string
  kdPrognpisat?: string
}

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

export interface EklaimGroupingInput {
  noSep: string
  noKartu: string
  tglMasuk: string
  tglPulang: string
  jenisRawat: '1' | '2'
  kelasRawat: string
  adlSubAcute?: number
  adlChronic?: number
  icuIndikator?: string
  icuLos?: number
  ventilatorHour?: number
  upgradeClassInd?: string
  upgradeClassClass?: string
  upgradeClassLos?: number
  birthWeight?: number
  diagnosa: string[]
  procedure?: string[]
}

export interface EklaimGroupingResult {
  cbgCode: string
  cbgDesc: string
  tarif: number
  tarifGdg: number
  tarifRS: number
  topUp: number
  prosedurNonBedah?: { kode: string; nama: string }[]
  prosedurBedah?: { kode: string; nama: string }[]
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

export interface AplicareBedRow {
  kodekelas: string
  namakelas: string
  kapasitas: number
  tersedia: number
  tersediaPria: number
  tersediaWanita: number
}

// ═══ Antrol (Antrean Online) Types ═══

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
  nomorantrean: string
  angkaantrean: number
  estimasidilayani: number
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
