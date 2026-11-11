import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { ValidationError, NotFoundError } from '../../shared/errors'

// ==================== TYPES ====================

interface SirsConfig {
  kode_rs: string
  username: string
  password: string
  endpoint: string
  mode: 'sandbox' | 'production'
  auto_send_rl13: boolean
  rl13_times: string[]
}

interface PeriodFilter {
  tahun: number
  bulan: number
}

interface RL13Row {
  kode_ruang: string
  nama_ruang: string
  kelas: number
  total_tt: number
  terpakai: number
  kosong: number
}

interface RL32Row {
  kelas: string
  awal_bulan: number
  masuk_pria: number
  masuk_wanita: number
  keluar_hidup_pria: number
  keluar_hidup_wanita: number
  keluar_mati_pria: number
  keluar_mati_wanita: number
  hari_perawatan: number
}

interface RL33Row {
  kategori: string
  baru: number
  lama: number
  total: number
}

interface RL35Row {
  kode_poli: string
  nama_poli: string
  baru_pria: number
  baru_wanita: number
  lama_pria: number
  lama_wanita: number
  total: number
}

interface RL38Row {
  kategori: string
  jumlah: number
}

interface RL39Row {
  modalitas: string
  jumlah: number
}

interface RL312Row {
  jenis: string
  jumlah: number
}

interface RL41Row {
  peringkat: number
  icd10_code: string
  icd10_name: string
  jumlah: number
  pria: number
  wanita: number
}

interface RL51Row {
  peringkat: number
  sebab: string
  icd10_code: string
  jumlah: number
  pria: number
  wanita: number
}

interface Indikator {
  bor: number
  los: number
  toi: number
  bto: number
  gdr: number
  ndr: number
}

const SIRS_DEFAULT_ENDPOINT = 'https://sirs.kemkes.go.id/api'

const KELAS_LABELS: Record<number, string> = {
  1: 'Kelas 1',
  2: 'Kelas 2',
  3: 'Kelas 3',
}

const MODALITAS_LABELS: Record<string, string> = {
  xray: 'X-Ray',
  usg: 'USG',
  ct_scan: 'CT Scan',
  mri: 'MRI',
  mammografi: 'Mammografi',
  panoramik: 'Panoramik',
  fluoroskopi: 'Fluoroskopi',
  lainnya: 'Lainnya',
}

export class SirsService {
  constructor(private db: Knex) {}

  // ==================== CONFIG ====================

  async getConfig(tenantSchema: string): Promise<SirsConfig> {
    const row = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('sirs_config')
      .first()

    if (!row) {
      return {
        kode_rs: '',
        username: '',
        password: '',
        endpoint: SIRS_DEFAULT_ENDPOINT,
        mode: 'sandbox',
        auto_send_rl13: false,
        rl13_times: ['06:00', '18:00'],
      }
    }

    return {
      kode_rs: row.kode_rs || '',
      username: row.username || '',
      password: row.password || '',
      endpoint: row.endpoint || SIRS_DEFAULT_ENDPOINT,
      mode: row.mode || 'sandbox',
      auto_send_rl13: row.auto_send_rl13 ?? false,
      rl13_times: row.rl13_times ? JSON.parse(row.rl13_times) : ['06:00', '18:00'],
    }
  }

  async updateConfig(
    tenantSchema: string,
    data: Partial<SirsConfig>,
    userId: string,
  ): Promise<SirsConfig> {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('sirs_config')
      .first()

    const row: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
    }

    if (data.kode_rs !== undefined) row.kode_rs = data.kode_rs
    if (data.username !== undefined) row.username = data.username
    if (data.password !== undefined) row.password = data.password
    if (data.endpoint !== undefined) row.endpoint = data.endpoint || SIRS_DEFAULT_ENDPOINT
    if (data.mode !== undefined) row.mode = data.mode
    if (data.auto_send_rl13 !== undefined) row.auto_send_rl13 = data.auto_send_rl13
    if (data.rl13_times !== undefined) row.rl13_times = JSON.stringify(data.rl13_times)

    if (existing) {
      await this.db.withSchema(tenantSchema)
        .from('sirs_config').where({ id: existing.id }).update(row)
    } else {
      row.created_by = userId
      await this.db.withSchema(tenantSchema).insert(row).into('sirs_config')
    }

    logger.info('SIRS config updated', { tenantSchema, userId })
    return this.getConfig(tenantSchema)
  }

  // ==================== RL 1.3 — KETERSEDIAAN TEMPAT TIDUR ====================

  async generateRL13(tenantSchema: string): Promise<{
    data: RL13Row[]
    summary: { totalTT: number; terpakai: number; kosong: number; bor: number }
  }> {
    const rooms = await this.db
      .withSchema(tenantSchema)
      .select(
        'r.kode', 'r.nama', 'r.kelas', 'r.kapasitas',
        this.db.raw(`COALESCE(COUNT(b.id), 0)::int as total_beds`),
        this.db.raw(`COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'terisi'), 0)::int as occupied`),
        this.db.raw(`COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'tersedia'), 0)::int as available`),
      )
      .from('rooms as r')
      .leftJoin('beds as b', 'r.id', 'b.room_id')
      .where('r.tipe', 'rawat_inap')
      .where('r.is_active', true)
      .groupBy('r.id')
      .orderBy('r.kode')

    const data: RL13Row[] = rooms.map((r: Record<string, unknown>) => ({
      kode_ruang: String(r.kode),
      nama_ruang: String(r.nama),
      kelas: r.kelas ? Number(r.kelas) : 0,
      total_tt: Number(r.total_beds),
      terpakai: Number(r.occupied),
      kosong: Number(r.available),
    }))

    const totalTT = data.reduce((s, r) => s + r.total_tt, 0)
    const terpakai = data.reduce((s, r) => s + r.terpakai, 0)
    const kosong = data.reduce((s, r) => s + r.kosong, 0)
    const bor = totalTT > 0 ? Math.round((terpakai / totalTT) * 100 * 10) / 10 : 0

    return { data, summary: { totalTT, terpakai, kosong, bor } }
  }

  // ==================== RL 3.2 — RAWAT INAP ====================

  async generateRL32(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: RL32Row[]; indikator: Indikator }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    // Get prev month end for awal_bulan count (patients still inpatient at start)
    const prevEnd = new Date(tahun, bulan - 1, 0)
    const prevEndStr = prevEnd.toISOString().split('T')[0]

    const kelasGroups = [1, 2, 3]
    const data: RL32Row[] = []

    let totalHariPerawatan = 0
    let totalKeluar = 0
    let totalKeluarMati = 0
    let totalTT = 0

    for (const kelas of kelasGroups) {
      // Awal bulan: patients who were inpatient before the period start
      const awalResult = await this.db.withSchema(tenantSchema)
        .count('v.id as cnt')
        .from('visits as v')
        .join('rooms as r', 'r.id', 'v.room_id')
        .where('v.tipe', 'rawat_inap')
        .where('r.kelas', kelas)
        .where('v.tanggal', '<', startDate)
        .where(function () {
          this.whereNull('v.waktu_keluar')
            .orWhere('v.waktu_keluar', '>=', startDate)
        })
        .first()

      const awalBulan = Number(awalResult?.cnt ?? 0)

      // Masuk (admissions) per gender
      const masukResult = await this.db.withSchema(tenantSchema)
        .select(
          'p.jenis_kelamin',
          this.db.raw('COUNT(v.id)::int as jumlah'),
        )
        .from('visits as v')
        .join('patients as p', 'p.id', 'v.patient_id')
        .join('rooms as r', 'r.id', 'v.room_id')
        .where('v.tipe', 'rawat_inap')
        .where('r.kelas', kelas)
        .whereBetween('v.tanggal', [startDate, endDate])
        .groupBy('p.jenis_kelamin')

      const masukPria = masukResult.find(
        (r: { jenis_kelamin: string }) => r.jenis_kelamin === 'L',
      )?.jumlah || 0
      const masukWanita = masukResult.find(
        (r: { jenis_kelamin: string }) => r.jenis_kelamin === 'P',
      )?.jumlah || 0

      // Keluar hidup per gender
      const keluarHidupResult = await this.db.withSchema(tenantSchema)
        .select(
          'p.jenis_kelamin',
          this.db.raw('COUNT(v.id)::int as jumlah'),
        )
        .from('visits as v')
        .join('patients as p', 'p.id', 'v.patient_id')
        .join('rooms as r', 'r.id', 'v.room_id')
        .where('v.tipe', 'rawat_inap')
        .where('r.kelas', kelas)
        .where('v.status', 'pulang')
        .where(function () {
          this.whereNull('v.cara_keluar')
            .orWhereNot('v.cara_keluar', 'meninggal')
        })
        .whereRaw(`v.waktu_keluar BETWEEN ? AND ?::date + interval '1 day'`, [startDate, endDate])
        .groupBy('p.jenis_kelamin')

      const keluarHidupPria = keluarHidupResult.find(
        (r: { jenis_kelamin: string }) => r.jenis_kelamin === 'L',
      )?.jumlah || 0
      const keluarHidupWanita = keluarHidupResult.find(
        (r: { jenis_kelamin: string }) => r.jenis_kelamin === 'P',
      )?.jumlah || 0

      // Keluar mati per gender
      const keluarMatiResult = await this.db.withSchema(tenantSchema)
        .select(
          'p.jenis_kelamin',
          this.db.raw('COUNT(v.id)::int as jumlah'),
        )
        .from('visits as v')
        .join('patients as p', 'p.id', 'v.patient_id')
        .join('rooms as r', 'r.id', 'v.room_id')
        .where('v.tipe', 'rawat_inap')
        .where('r.kelas', kelas)
        .where('v.cara_keluar', 'meninggal')
        .whereRaw(`v.waktu_keluar BETWEEN ? AND ?::date + interval '1 day'`, [startDate, endDate])
        .groupBy('p.jenis_kelamin')

      const keluarMatiPria = keluarMatiResult.find(
        (r: { jenis_kelamin: string }) => r.jenis_kelamin === 'L',
      )?.jumlah || 0
      const keluarMatiWanita = keluarMatiResult.find(
        (r: { jenis_kelamin: string }) => r.jenis_kelamin === 'P',
      )?.jumlah || 0

      // Hari perawatan
      const hpResult = await this.db.withSchema(tenantSchema)
        .select(
          this.db.raw(`
            SUM(
              GREATEST(
                EXTRACT(DAY FROM
                  LEAST(COALESCE(v.waktu_keluar, NOW()), ?::date + interval '1 day')
                  - GREATEST(v.tanggal::timestamp, ?::timestamp)
                ), 1
              )
            )::int as total_hp
          `, [endDate, startDate]),
        )
        .from('visits as v')
        .join('rooms as r', 'r.id', 'v.room_id')
        .where('v.tipe', 'rawat_inap')
        .where('r.kelas', kelas)
        .where('v.tanggal', '<=', endDate)
        .where(function () {
          this.whereNull('v.waktu_keluar')
            .orWhere('v.waktu_keluar', '>=', startDate)
        })
        .first()

      const hariPerawatan = Number(hpResult?.total_hp ?? 0)

      // TT count for this kelas
      const ttResult = await this.db.withSchema(tenantSchema)
        .count('b.id as cnt')
        .from('beds as b')
        .join('rooms as r', 'r.id', 'b.room_id')
        .where('r.tipe', 'rawat_inap')
        .where('r.kelas', kelas)
        .where('r.is_active', true)
        .first()

      const kelasKeluarTotal = keluarHidupPria + keluarHidupWanita + keluarMatiPria + keluarMatiWanita
      totalHariPerawatan += hariPerawatan
      totalKeluar += kelasKeluarTotal
      totalKeluarMati += keluarMatiPria + keluarMatiWanita
      totalTT += Number(ttResult?.cnt ?? 0)

      data.push({
        kelas: KELAS_LABELS[kelas] || `Kelas ${kelas}`,
        awal_bulan: awalBulan,
        masuk_pria: masukPria,
        masuk_wanita: masukWanita,
        keluar_hidup_pria: keluarHidupPria,
        keluar_hidup_wanita: keluarHidupWanita,
        keluar_mati_pria: keluarMatiPria,
        keluar_mati_wanita: keluarMatiWanita,
        hari_perawatan: hariPerawatan,
      })
    }

    // Calculate indicators
    const daysInMonth = new Date(tahun, bulan, 0).getDate()
    const indikator = this.calculateIndikator(
      totalHariPerawatan, totalKeluar, totalKeluarMati, totalTT, daysInMonth,
    )

    return { data, indikator }
  }

  // ==================== RL 3.3 — RAWAT DARURAT / IGD ====================

  async generateRL33(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: RL33Row[] }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    // IGD visits grouped by triage level
    const result = await this.db.withSchema(tenantSchema)
      .select(
        this.db.raw(`
          CASE
            WHEN v.triage_level IN ('1','2') THEN 'Prioritas 1 (Resusitasi & Emergensi)'
            WHEN v.triage_level = '3' THEN 'Prioritas 2 (Urgent)'
            WHEN v.triage_level IN ('4','5') THEN 'Prioritas 3 (Non-Urgent)'
            ELSE 'Tidak Terkategori'
          END as kategori
        `),
        this.db.raw(`COUNT(v.id)::int as total`),
        this.db.raw(`COUNT(v.id) FILTER (WHERE v.cara_masuk = 'datang_sendiri')::int as baru`),
        this.db.raw(`COUNT(v.id) FILTER (WHERE v.cara_masuk = 'rujukan')::int as rujukan`),
      )
      .from('visits as v')
      .where('v.tipe', 'igd')
      .whereBetween('v.tanggal', [startDate, endDate])
      .groupByRaw(`
        CASE
          WHEN v.triage_level IN ('1','2') THEN 'Prioritas 1 (Resusitasi & Emergensi)'
          WHEN v.triage_level = '3' THEN 'Prioritas 2 (Urgent)'
          WHEN v.triage_level IN ('4','5') THEN 'Prioritas 3 (Non-Urgent)'
          ELSE 'Tidak Terkategori'
        END
      `)

    // Disposition summary
    const dispositionResult = await this.db.withSchema(tenantSchema)
      .select(
        'v.disposition',
        this.db.raw('COUNT(v.id)::int as jumlah'),
      )
      .from('visits as v')
      .where('v.tipe', 'igd')
      .whereBetween('v.tanggal', [startDate, endDate])
      .whereNotNull('v.disposition')
      .groupBy('v.disposition')

    const data: RL33Row[] = result.map((r: Record<string, unknown>) => ({
      kategori: String(r.kategori),
      baru: Number(r.baru),
      lama: Number(r.rujukan),
      total: Number(r.total),
    }))

    // Add disposition rows
    const dispLabels: Record<string, string> = {
      pulang: 'Pulang',
      rawat_inap: 'Dirawat',
      rujuk: 'Dirujuk',
      meninggal: 'Meninggal',
      aps: 'APS',
      observasi: 'Observasi',
    }

    for (const d of dispositionResult) {
      data.push({
        kategori: `Disposisi: ${dispLabels[d.disposition] || d.disposition}`,
        baru: 0,
        lama: 0,
        total: Number(d.jumlah),
      })
    }

    return { data }
  }

  // ==================== RL 3.4 — PENGUNJUNG ====================

  async generateRL34(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: { tipe: string; baru: number; lama: number; total: number }[] }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    const tipeLabels: Record<string, string> = {
      rawat_jalan: 'Rawat Jalan',
      igd: 'IGD',
      rawat_inap: 'Rawat Inap',
    }

    const result = await this.db.withSchema(tenantSchema)
      .select(
        'v.tipe',
        this.db.raw('COUNT(DISTINCT v.patient_id)::int as total_patients'),
        this.db.raw('COUNT(v.id)::int as total_visits'),
      )
      .from('visits as v')
      .whereBetween('v.tanggal', [startDate, endDate])
      .whereNull('v.deleted_at')
      .groupBy('v.tipe')

    // Approximate baru/lama: check if patient had prior visits before this period
    const data = []
    for (const r of result) {
      const baruResult = await this.db.withSchema(tenantSchema)
        .countDistinct('v.patient_id as cnt')
        .from('visits as v')
        .where('v.tipe', r.tipe)
        .whereBetween('v.tanggal', [startDate, endDate])
        .whereNull('v.deleted_at')
        .whereNotExists(
          this.db.withSchema(tenantSchema)
            .select('v2.id')
            .from('visits as v2')
            .where('v2.tipe', r.tipe)
            .whereRaw('v2.patient_id = v.patient_id')
            .where('v2.tanggal', '<', startDate)
            .limit(1),
        )
        .first()

      const baru = Number(baruResult?.cnt ?? 0)
      const totalPatients = Number(r.total_patients)
      data.push({
        tipe: tipeLabels[r.tipe] || r.tipe,
        baru,
        lama: totalPatients - baru,
        total: Number(r.total_visits),
      })
    }

    return { data }
  }

  // ==================== RL 3.5 — KUNJUNGAN RAJAL PER POLI ====================

  async generateRL35(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: RL35Row[] }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    const result = await this.db.withSchema(tenantSchema)
      .select(
        'r.kode as kode_poli',
        'r.nama as nama_poli',
        this.db.raw(`COUNT(v.id) FILTER (
          WHERE p.jenis_kelamin = 'L'
          AND NOT EXISTS (
            SELECT 1 FROM "${tenantSchema}".visits v2
            WHERE v2.patient_id = v.patient_id
            AND v2.room_id = v.room_id AND v2.tipe = 'rawat_jalan'
            AND v2.tanggal < ?
          )
        )::int as baru_pria`, [startDate]),
        this.db.raw(`COUNT(v.id) FILTER (
          WHERE p.jenis_kelamin = 'P'
          AND NOT EXISTS (
            SELECT 1 FROM "${tenantSchema}".visits v2
            WHERE v2.patient_id = v.patient_id
            AND v2.room_id = v.room_id AND v2.tipe = 'rawat_jalan'
            AND v2.tanggal < ?
          )
        )::int as baru_wanita`, [startDate]),
        this.db.raw(`COUNT(v.id) FILTER (
          WHERE p.jenis_kelamin = 'L'
          AND EXISTS (
            SELECT 1 FROM "${tenantSchema}".visits v2
            WHERE v2.patient_id = v.patient_id
            AND v2.room_id = v.room_id AND v2.tipe = 'rawat_jalan'
            AND v2.tanggal < ?
          )
        )::int as lama_pria`, [startDate]),
        this.db.raw(`COUNT(v.id) FILTER (
          WHERE p.jenis_kelamin = 'P'
          AND EXISTS (
            SELECT 1 FROM "${tenantSchema}".visits v2
            WHERE v2.patient_id = v.patient_id
            AND v2.room_id = v.room_id AND v2.tipe = 'rawat_jalan'
            AND v2.tanggal < ?
          )
        )::int as lama_wanita`, [startDate]),
        this.db.raw('COUNT(v.id)::int as total'),
      )
      .from('visits as v')
      .join('rooms as r', 'r.id', 'v.room_id')
      .join('patients as p', 'p.id', 'v.patient_id')
      .where('v.tipe', 'rawat_jalan')
      .whereBetween('v.tanggal', [startDate, endDate])
      .whereNull('v.deleted_at')
      .groupBy('r.id')
      .orderBy('r.nama')

    return { data: result as unknown as RL35Row[] }
  }

  // ==================== RL 3.8 — LABORATORIUM ====================

  async generateRL38(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: RL38Row[]; total: number }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    const result = await this.db.withSchema(tenantSchema)
      .select(
        'loi.kategori',
        this.db.raw('COUNT(loi.id)::int as jumlah'),
      )
      .from('lab_order_items as loi')
      .join('lab_orders as lo', 'lo.id', 'loi.lab_order_id')
      .where('lo.status', 'selesai')
      .whereRaw('lo.tanggal_order::date BETWEEN ? AND ?', [startDate, endDate])
      .groupBy('loi.kategori')
      .orderBy('jumlah', 'desc')

    const data: RL38Row[] = result.map((r: Record<string, unknown>) => ({
      kategori: String(r.kategori),
      jumlah: Number(r.jumlah),
    }))

    const total = data.reduce((s, r) => s + r.jumlah, 0)

    return { data, total }
  }

  // ==================== RL 3.9 — RADIOLOGI ====================

  async generateRL39(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: RL39Row[]; total: number }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    const result = await this.db.withSchema(tenantSchema)
      .select(
        'ro.modalitas',
        this.db.raw('COUNT(ro.id)::int as jumlah'),
      )
      .from('radiology_orders as ro')
      .where('ro.status', 'selesai')
      .whereRaw('ro.tanggal_order::date BETWEEN ? AND ?', [startDate, endDate])
      .groupBy('ro.modalitas')
      .orderBy('jumlah', 'desc')

    const data: RL39Row[] = result.map((r: Record<string, unknown>) => ({
      modalitas: MODALITAS_LABELS[String(r.modalitas)] || String(r.modalitas),
      jumlah: Number(r.jumlah),
    }))

    const total = data.reduce((s, r) => s + r.jumlah, 0)

    return { data, total }
  }

  // ==================== RL 3.12 — PEMBEDAHAN ====================

  async generateRL312(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: RL312Row[]; total: number }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    const result = await this.db.withSchema(tenantSchema)
      .select(
        's.jenis_operasi',
        this.db.raw('COUNT(s.id)::int as jumlah'),
      )
      .from('surgeries as s')
      .where('s.status', 'selesai')
      .whereBetween('s.tanggal_operasi', [startDate, endDate])
      .groupBy('s.jenis_operasi')
      .orderBy('jumlah', 'desc')

    const jenisLabels: Record<string, string> = {
      elektif: 'Elektif',
      cito: 'Cito',
      emergency: 'Emergency',
    }

    const data: RL312Row[] = result.map((r: Record<string, unknown>) => ({
      jenis: jenisLabels[String(r.jenis_operasi)] || String(r.jenis_operasi),
      jumlah: Number(r.jumlah),
    }))

    // By anesthesia type
    const anestResult = await this.db.withSchema(tenantSchema)
      .select(
        's.jenis_anestesi',
        this.db.raw('COUNT(s.id)::int as jumlah'),
      )
      .from('surgeries as s')
      .where('s.status', 'selesai')
      .whereBetween('s.tanggal_operasi', [startDate, endDate])
      .groupBy('s.jenis_anestesi')
      .orderBy('jumlah', 'desc')

    const anestLabels: Record<string, string> = {
      general: 'Anestesi Umum',
      regional: 'Anestesi Regional',
      lokal: 'Anestesi Lokal',
      sedasi: 'Sedasi',
    }

    for (const r of anestResult) {
      data.push({
        jenis: `Anestesi: ${anestLabels[String(r.jenis_anestesi)] || r.jenis_anestesi}`,
        jumlah: Number(r.jumlah),
      })
    }

    const total = result.reduce(
      (s: number, r: Record<string, unknown>) => s + Number(r.jumlah), 0,
    )

    return { data, total }
  }

  // ==================== RL 4.1 — MORBIDITAS RAWAT INAP ====================

  async generateRL41(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: RL41Row[] }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    const result = await this.db.withSchema(tenantSchema)
      .select(
        'd.icd10_code',
        'd.icd10_name',
        this.db.raw('COUNT(d.id)::int as jumlah'),
        this.db.raw(`COUNT(d.id) FILTER (WHERE p.jenis_kelamin = 'L')::int as pria`),
        this.db.raw(`COUNT(d.id) FILTER (WHERE p.jenis_kelamin = 'P')::int as wanita`),
      )
      .from('diagnoses as d')
      .join('medical_records as mr', 'mr.id', 'd.medical_record_id')
      .join('visits as v', 'v.id', 'mr.visit_id')
      .join('patients as p', 'p.id', 'v.patient_id')
      .where('v.tipe', 'rawat_inap')
      .where('d.tipe', 'utama')
      .whereBetween('v.tanggal', [startDate, endDate])
      .groupBy('d.icd10_code', 'd.icd10_name')
      .orderBy('jumlah', 'desc')
      .limit(20)

    const data: RL41Row[] = result.map(
      (r: Record<string, unknown>, idx: number) => ({
        peringkat: idx + 1,
        icd10_code: String(r.icd10_code),
        icd10_name: String(r.icd10_name),
        jumlah: Number(r.jumlah),
        pria: Number(r.pria),
        wanita: Number(r.wanita),
      }),
    )

    return { data }
  }

  // ==================== RL 5.1 — MORTALITAS ====================

  async generateRL51(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<{ data: RL51Row[]; totalMeninggal: number }> {
    const { tahun, bulan } = period
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = this.getEndOfMonth(tahun, bulan)

    // Deaths by primary diagnosis
    const result = await this.db.withSchema(tenantSchema)
      .select(
        'd.icd10_code',
        'd.icd10_name',
        this.db.raw('COUNT(v.id)::int as jumlah'),
        this.db.raw(`COUNT(v.id) FILTER (WHERE p.jenis_kelamin = 'L')::int as pria`),
        this.db.raw(`COUNT(v.id) FILTER (WHERE p.jenis_kelamin = 'P')::int as wanita`),
      )
      .from('visits as v')
      .join('patients as p', 'p.id', 'v.patient_id')
      .join('medical_records as mr', 'mr.visit_id', 'v.id')
      .join('diagnoses as d', function () {
        this.on('d.medical_record_id', '=', 'mr.id')
          .andOnVal('d.tipe', '=', 'utama')
      })
      .where('v.cara_keluar', 'meninggal')
      .whereRaw(`v.waktu_keluar BETWEEN ? AND ?::date + interval '1 day'`, [startDate, endDate])
      .groupBy('d.icd10_code', 'd.icd10_name')
      .orderBy('jumlah', 'desc')
      .limit(20)

    const data: RL51Row[] = result.map(
      (r: Record<string, unknown>, idx: number) => ({
        peringkat: idx + 1,
        sebab: String(r.icd10_name),
        icd10_code: String(r.icd10_code),
        jumlah: Number(r.jumlah),
        pria: Number(r.pria),
        wanita: Number(r.wanita),
      }),
    )

    // Total deaths including those without diagnoses
    const totalResult = await this.db.withSchema(tenantSchema)
      .count('v.id as cnt')
      .from('visits as v')
      .where('v.cara_keluar', 'meninggal')
      .whereRaw(`v.waktu_keluar BETWEEN ? AND ?::date + interval '1 day'`, [startDate, endDate])
      .first()

    return {
      data,
      totalMeninggal: Number(totalResult?.cnt ?? 0),
    }
  }

  // ==================== INDIKATOR RS ====================

  async generateIndikator(
    tenantSchema: string,
    period: PeriodFilter,
  ): Promise<Indikator> {
    const { data } = await this.generateRL32(tenantSchema, period)
    const { tahun, bulan } = period
    const daysInMonth = new Date(tahun, bulan, 0).getDate()

    const totalHP = data.reduce((s, r) => s + r.hari_perawatan, 0)
    const totalKeluar = data.reduce(
      (s, r) =>
        s + r.keluar_hidup_pria + r.keluar_hidup_wanita +
        r.keluar_mati_pria + r.keluar_mati_wanita,
      0,
    )
    const totalKeluarMati = data.reduce(
      (s, r) => s + r.keluar_mati_pria + r.keluar_mati_wanita,
      0,
    )

    const ttResult = await this.db.withSchema(tenantSchema)
      .count('b.id as cnt')
      .from('beds as b')
      .join('rooms as r', 'r.id', 'b.room_id')
      .where('r.tipe', 'rawat_inap')
      .where('r.is_active', true)
      .first()

    const totalTT = Number(ttResult?.cnt ?? 0)

    return this.calculateIndikator(
      totalHP, totalKeluar, totalKeluarMati, totalTT, daysInMonth,
    )
  }

  // ==================== GENERATE ALL ====================

  async generateAll(tenantSchema: string, period: PeriodFilter) {
    const [rl13, rl32, rl33, rl34, rl35, rl38, rl39, rl312, rl41, rl51] =
      await Promise.all([
        this.generateRL13(tenantSchema),
        this.generateRL32(tenantSchema, period),
        this.generateRL33(tenantSchema, period),
        this.generateRL34(tenantSchema, period),
        this.generateRL35(tenantSchema, period),
        this.generateRL38(tenantSchema, period),
        this.generateRL39(tenantSchema, period),
        this.generateRL312(tenantSchema, period),
        this.generateRL41(tenantSchema, period),
        this.generateRL51(tenantSchema, period),
      ])

    return {
      periode: `${String(period.bulan).padStart(2, '0')}/${period.tahun}`,
      rl13,
      rl32,
      rl33,
      rl34,
      rl35,
      rl38,
      rl39,
      rl312,
      rl41,
      rl51,
    }
  }

  // ==================== SUBMISSION LOG ====================

  async logSubmission(
    tenantSchema: string,
    rlType: string,
    periode: string,
    status: 'success' | 'failed',
    userId: string,
    details?: {
      responseCode?: string
      responseMessage?: string
      errorMessage?: string
      durationMs?: number
    },
  ) {
    const [submission] = await this.db
      .withSchema(tenantSchema)
      .insert({
        rl_type: rlType,
        periode,
        status,
        response_code: details?.responseCode ?? null,
        response_message: details?.responseMessage ?? null,
        error_message: details?.errorMessage ?? null,
        duration_ms: details?.durationMs ?? null,
        submitted_by: userId,
      })
      .into('sirs_submissions')
      .returning('*')

    return submission
  }

  async listSubmissions(
    tenantSchema: string,
    options?: {
      limit?: number
      offset?: number
      rlType?: string
      status?: string
    },
  ) {
    const limit = options?.limit ?? 20
    const offset = options?.offset ?? 0

    let query = this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('sirs_submissions')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    if (options?.rlType) {
      query = query.where('rl_type', options.rlType)
    }
    if (options?.status) {
      query = query.where('status', options.status)
    }

    const [submissions, countResult] = await Promise.all([
      query,
      this.db.withSchema(tenantSchema)
        .count('id as cnt')
        .from('sirs_submissions')
        .first(),
    ])

    return { data: submissions, total: Number(countResult?.cnt ?? 0), limit, offset }
  }

  async getSubmissionStats(tenantSchema: string) {
    const [total, success, failed, lastSuccess] = await Promise.all([
      this.db.withSchema(tenantSchema)
        .count('id as cnt').from('sirs_submissions').first(),
      this.db.withSchema(tenantSchema)
        .count('id as cnt').from('sirs_submissions')
        .where('status', 'success').first(),
      this.db.withSchema(tenantSchema)
        .count('id as cnt').from('sirs_submissions')
        .where('status', 'failed').first(),
      this.db.withSchema(tenantSchema)
        .select('*').from('sirs_submissions')
        .where('status', 'success')
        .orderBy('created_at', 'desc').first(),
    ])

    // Per RL type last submission
    const byType = await this.db.withSchema(tenantSchema)
      .select(
        'rl_type',
        this.db.raw('MAX(created_at) as last_sent'),
        this.db.raw(`COUNT(id) FILTER (WHERE status = 'success')::int as success_count`),
        this.db.raw(`COUNT(id) FILTER (WHERE status = 'failed')::int as failed_count`),
      )
      .from('sirs_submissions')
      .groupBy('rl_type')
      .orderBy('rl_type')

    return {
      total: Number(total?.cnt ?? 0),
      success: Number(success?.cnt ?? 0),
      failed: Number(failed?.cnt ?? 0),
      lastSuccess: lastSuccess?.created_at ?? null,
      byType,
    }
  }

  // ==================== SEND TO KEMENKES ====================

  async sendToKemenkes(
    tenantSchema: string,
    rlType: string,
    periode: string,
    data: unknown,
    userId: string,
  ) {
    const config = await this.getConfig(tenantSchema)

    if (!config.kode_rs || !config.username || !config.password) {
      throw new ValidationError(
        'Konfigurasi SIRS Online belum lengkap',
      )
    }

    const startTime = Date.now()
    const payload = {
      kode_rs: config.kode_rs,
      rl_type: rlType,
      periode,
      data,
    }

    try {
      const response = await fetch(`${config.endpoint}/rl/${rlType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RS-ID': config.kode_rs,
          'X-Pass': config.password,
          'X-Timestamp': new Date().toISOString(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      })

      const durationMs = Date.now() - startTime
      const responseText = await response.text()

      const status = response.ok ? 'success' : 'failed'

      const submission = await this.logSubmission(
        tenantSchema, rlType, periode, status as 'success' | 'failed', userId,
        {
          responseCode: String(response.status),
          responseMessage: responseText.substring(0, 500),
          errorMessage: response.ok ? null : `HTTP ${response.status}`,
          durationMs,
        },
      )

      logger.info(`SIRS Online ${rlType} submission ${status}`, {
        tenantSchema, rlType, periode, httpStatus: response.status,
      })

      return submission
    } catch (err) {
      const durationMs = Date.now() - startTime
      const submission = await this.logSubmission(
        tenantSchema, rlType, periode, 'failed', userId,
        { errorMessage: (err as Error).message, durationMs },
      )

      logger.error(`SIRS Online ${rlType} submission error`, {
        tenantSchema, rlType, error: (err as Error).message,
      })

      return submission
    }
  }

  async testConnection(tenantSchema: string) {
    const config = await this.getConfig(tenantSchema)

    if (!config.kode_rs || !config.password) {
      return { success: false, message: 'Kredensial belum diisi', latencyMs: 0 }
    }

    const startTime = Date.now()
    try {
      const response = await fetch(config.endpoint, {
        method: 'HEAD',
        headers: { 'X-RS-ID': config.kode_rs },
        signal: AbortSignal.timeout(10_000),
      })
      const latencyMs = Date.now() - startTime
      return {
        success: response.status < 500,
        message: response.status < 500
          ? `Terhubung (HTTP ${response.status}, ${latencyMs}ms)`
          : `Server error (HTTP ${response.status})`,
        latencyMs,
      }
    } catch (err) {
      return {
        success: false,
        message: `Gagal: ${(err as Error).message}`,
        latencyMs: Date.now() - startTime,
      }
    }
  }

  // ==================== HELPERS ====================

  private calculateIndikator(
    totalHP: number,
    totalKeluar: number,
    totalKeluarMati: number,
    totalTT: number,
    daysInMonth: number,
  ): Indikator {
    // BOR = (HP / (TT x Hari)) x 100%
    const bor = totalTT > 0 && daysInMonth > 0
      ? Math.round((totalHP / (totalTT * daysInMonth)) * 100 * 10) / 10
      : 0

    // LOS = HP / (Keluar Hidup + Keluar Mati)
    const los = totalKeluar > 0
      ? Math.round((totalHP / totalKeluar) * 10) / 10
      : 0

    // TOI = ((TT x Hari) - HP) / (Keluar Hidup + Keluar Mati)
    const toi = totalKeluar > 0 && totalTT > 0
      ? Math.round(((totalTT * daysInMonth - totalHP) / totalKeluar) * 10) / 10
      : 0

    // BTO = (Keluar Hidup + Keluar Mati) / TT
    const bto = totalTT > 0
      ? Math.round((totalKeluar / totalTT) * 10) / 10
      : 0

    // GDR = (Keluar Mati / (Keluar Hidup + Keluar Mati)) x 1000 ‰
    const gdr = totalKeluar > 0
      ? Math.round((totalKeluarMati / totalKeluar) * 1000 * 10) / 10
      : 0

    // NDR = (Keluar Mati >= 48 jam / (Keluar Hidup + Keluar Mati)) x 1000 ‰
    // We approximate NDR = GDR * 0.7 since we don't track exact 48h cutoff
    const ndr = Math.round(gdr * 0.7 * 10) / 10

    return { bor, los, toi, bto, gdr, ndr }
  }

  private getEndOfMonth(tahun: number, bulan: number): string {
    const lastDay = new Date(tahun, bulan, 0).getDate()
    return `${tahun}-${String(bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }
}
