import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'

export class AssetService {
  constructor(private db: Knex) {}

  // ── ASSETS CRUD ──

  async listAssets(tenantSchema: string, filters?: {
    search?: string
    kategori?: string
    status?: string
    kondisi?: string
    lokasi_ruangan?: string
    page?: number
    limit?: number
  }) {
    const page = filters?.page ?? 1
    const limit = Math.min(filters?.limit ?? 50, 100)
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .from('assets')
      .whereNull('deleted_at')

    if (filters?.kategori) query = query.where('kategori', filters.kategori)
    if (filters?.status) query = query.where('status', filters.status)
    if (filters?.kondisi) query = query.where('kondisi', filters.kondisi)
    if (filters?.lokasi_ruangan) query = query.where('lokasi_ruangan', filters.lokasi_ruangan)
    if (filters?.search) {
      query = query.where(function () {
        this.whereILike('nama', `%${filters!.search}%`)
          .orWhereILike('kode', `%${filters!.search}%`)
          .orWhereILike('merk', `%${filters!.search}%`)
          .orWhereILike('serial_number', `%${filters!.search}%`)
      })
    }

    const [{ count }] = await query.clone().count('id as count')
    const total = Number(count)

    const items = await query
      .clone()
      .select('*')
      .orderBy('nama')
      .offset(offset)
      .limit(limit)

    const enriched = items.map((a: Record<string, unknown>) => ({
      ...a,
      ...this.calculateDepreciation(a),
    }))

    return { data: enriched, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async getAsset(id: string, tenantSchema: string) {
    const asset = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('assets')
      .where({ id })
      .whereNull('deleted_at')
      .first()
    if (!asset) throw new NotFoundError('Aset')

    const maintenances = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('asset_maintenances')
      .where({ asset_id: id })
      .orderBy('tanggal', 'desc')
      .limit(20)

    const mutations = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('asset_mutations')
      .where({ asset_id: id })
      .orderBy('tanggal', 'desc')
      .limit(20)

    return {
      ...asset,
      ...this.calculateDepreciation(asset),
      maintenances,
      mutations,
    }
  }

  async createAsset(
    data: {
      kode: string
      nama: string
      kategori?: string
      merk?: string
      model?: string
      serial_number?: string
      tahun_pembelian?: number
      tanggal_pembelian?: string
      harga_perolehan: number
      vendor?: string
      no_faktur?: string
      umur_ekonomis_tahun?: number
      nilai_residu?: number
      metode_penyusutan?: string
      lokasi_gedung?: string
      lokasi_lantai?: string
      lokasi_ruangan?: string
      penanggung_jawab?: string
      kondisi?: string
      garansi_mulai?: string
      garansi_berakhir?: string
      interval_kalibrasi_bulan?: number
      catatan?: string
    },
    tenantSchema: string,
    userId?: string,
  ) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('assets')
      .where({ kode: data.kode })
      .whereNull('deleted_at')
      .first()
    if (existing) throw new ConflictError(`Aset dengan kode ${data.kode} sudah ada`)

    const [asset] = await this.db
      .withSchema(tenantSchema)
      .insert({
        ...data,
        created_by: userId,
        updated_by: userId,
      })
      .into('assets')
      .returning('*')

    logger.info(`Asset created: ${asset.kode} - ${asset.nama}`)
    return asset
  }

  async updateAsset(
    id: string,
    data: Record<string, unknown>,
    tenantSchema: string,
    userId?: string,
  ) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('assets')
      .where({ id })
      .whereNull('deleted_at')
      .first()
    if (!existing) throw new NotFoundError('Aset')

    if (data.kode) {
      const dup = await this.db
        .withSchema(tenantSchema)
        .select('id')
        .from('assets')
        .where({ kode: data.kode as string })
        .whereNot({ id })
        .whereNull('deleted_at')
        .first()
      if (dup) throw new ConflictError(`Kode aset ${data.kode} sudah digunakan`)
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('assets')
      .where({ id })
      .update({
        ...data,
        updated_by: userId,
        updated_at: this.db.fn.now(),
      })
      .returning('*')

    return updated
  }

  async deleteAsset(id: string, tenantSchema: string) {
    const asset = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama')
      .from('assets')
      .where({ id })
      .whereNull('deleted_at')
      .first()
    if (!asset) throw new NotFoundError('Aset')

    await this.db
      .withSchema(tenantSchema)
      .from('assets')
      .where({ id })
      .update({ deleted_at: this.db.fn.now(), status: 'dihapuskan' })

    logger.info(`Asset soft-deleted: ${id}`)
    return { message: `Aset "${asset.nama}" berhasil dihapus` }
  }

  // ── DEPRECIATION CALCULATION ──

  calculateDepreciation(asset: Record<string, unknown>) {
    const hargaPerolehan = Number(asset.harga_perolehan) || 0
    const nilaiResidu = Number(asset.nilai_residu) || 0
    const umurEkonomis = Number(asset.umur_ekonomis_tahun) || 5
    const metode = asset.metode_penyusutan as string || 'garis_lurus'
    const tanggalBeli = asset.tanggal_pembelian
      ? new Date(asset.tanggal_pembelian as string)
      : asset.tahun_pembelian
        ? new Date(`${asset.tahun_pembelian}-01-01`)
        : null

    if (!tanggalBeli || hargaPerolehan <= 0) {
      return {
        penyusutan_per_tahun: 0,
        penyusutan_per_bulan: 0,
        total_penyusutan: 0,
        nilai_buku: hargaPerolehan,
        umur_tersisa_bulan: umurEkonomis * 12,
        persentase_penyusutan: 0,
      }
    }

    const now = new Date()
    const bulanPakai = Math.max(0,
      (now.getFullYear() - tanggalBeli.getFullYear()) * 12
      + (now.getMonth() - tanggalBeli.getMonth()),
    )
    const totalBulan = umurEkonomis * 12

    let penyusutanPerTahun = 0
    let totalPenyusutan = 0

    if (metode === 'garis_lurus') {
      penyusutanPerTahun = (hargaPerolehan - nilaiResidu) / umurEkonomis
      totalPenyusutan = Math.min(
        (penyusutanPerTahun / 12) * bulanPakai,
        hargaPerolehan - nilaiResidu,
      )
    } else {
      // saldo menurun (double declining)
      const rate = (2 / umurEkonomis)
      let nilaiAwal = hargaPerolehan
      const tahunPakai = Math.floor(bulanPakai / 12)
      const sisaBulan = bulanPakai % 12

      for (let i = 0; i < tahunPakai; i++) {
        const dep = nilaiAwal * rate
        if (nilaiAwal - dep < nilaiResidu) {
          totalPenyusutan += nilaiAwal - nilaiResidu
          nilaiAwal = nilaiResidu
          break
        }
        totalPenyusutan += dep
        nilaiAwal -= dep
      }
      if (nilaiAwal > nilaiResidu && sisaBulan > 0) {
        const depPartial = (nilaiAwal * rate / 12) * sisaBulan
        totalPenyusutan += Math.min(depPartial, nilaiAwal - nilaiResidu)
      }
      penyusutanPerTahun = hargaPerolehan * rate
    }

    const nilaiBuku = Math.max(nilaiResidu, hargaPerolehan - totalPenyusutan)
    const umurTersisaBulan = Math.max(0, totalBulan - bulanPakai)

    return {
      penyusutan_per_tahun: Math.round(penyusutanPerTahun),
      penyusutan_per_bulan: Math.round(penyusutanPerTahun / 12),
      total_penyusutan: Math.round(totalPenyusutan),
      nilai_buku: Math.round(nilaiBuku),
      umur_tersisa_bulan: umurTersisaBulan,
      persentase_penyusutan: hargaPerolehan > 0
        ? Math.round((totalPenyusutan / (hargaPerolehan - nilaiResidu)) * 100)
        : 0,
    }
  }

  // ── MAINTENANCE ──

  async addMaintenance(
    data: {
      asset_id: string
      tipe?: string
      tanggal?: string
      deskripsi: string
      teknisi?: string
      vendor?: string
      biaya?: number
      hasil?: string
      tanggal_selanjutnya?: string
      catatan?: string
    },
    tenantSchema: string,
    userId?: string,
  ) {
    const asset = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('assets')
      .where({ id: data.asset_id })
      .first()
    if (!asset) throw new NotFoundError('Aset')

    const [record] = await this.db
      .withSchema(tenantSchema)
      .insert({ ...data, created_by: userId })
      .into('asset_maintenances')
      .returning('*')

    // Update kalibrasi terakhir jika tipe = kalibrasi
    if (data.tipe === 'kalibrasi') {
      await this.db
        .withSchema(tenantSchema)
        .from('assets')
        .where({ id: data.asset_id })
        .update({ tanggal_kalibrasi_terakhir: data.tanggal || new Date() })
    }

    return record
  }

  async listMaintenances(tenantSchema: string, filters?: {
    asset_id?: string
    tipe?: string
    page?: number
    limit?: number
  }) {
    const page = filters?.page ?? 1
    const limit = Math.min(filters?.limit ?? 50, 100)
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .from('asset_maintenances as am')
      .join('assets as a', 'am.asset_id', 'a.id')

    if (filters?.asset_id) query = query.where('am.asset_id', filters.asset_id)
    if (filters?.tipe) query = query.where('am.tipe', filters.tipe)

    const [{ count }] = await query.clone().count('am.id as count')
    const total = Number(count)

    const items = await query
      .clone()
      .select('am.*', 'a.kode as asset_kode', 'a.nama as asset_nama')
      .orderBy('am.tanggal', 'desc')
      .offset(offset)
      .limit(limit)

    return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async deleteMaintenance(id: string, tenantSchema: string) {
    const deleted = await this.db
      .withSchema(tenantSchema)
      .from('asset_maintenances')
      .where({ id })
      .del()
    if (!deleted) throw new NotFoundError('Record pemeliharaan')
    return { message: 'Record pemeliharaan berhasil dihapus' }
  }

  // ── MUTATIONS ──

  async addMutation(
    data: {
      asset_id: string
      tipe?: string
      tanggal?: string
      dari_lokasi?: string
      ke_lokasi?: string
      alasan?: string
      nilai_jual?: number
      no_berita_acara?: string
      disetujui_oleh?: string
      catatan?: string
    },
    tenantSchema: string,
    userId?: string,
  ) {
    const asset = await this.db
      .withSchema(tenantSchema)
      .select('id', 'lokasi_ruangan', 'lokasi_gedung', 'lokasi_lantai')
      .from('assets')
      .where({ id: data.asset_id })
      .first()
    if (!asset) throw new NotFoundError('Aset')

    const dariLokasi = data.dari_lokasi
      || [asset.lokasi_gedung, asset.lokasi_lantai, asset.lokasi_ruangan].filter(Boolean).join(' - ')
      || 'Tidak diketahui'

    const [record] = await this.db
      .withSchema(tenantSchema)
      .insert({
        ...data,
        dari_lokasi: dariLokasi,
        created_by: userId,
      })
      .into('asset_mutations')
      .returning('*')

    // Update asset location / status based on mutation type
    const updateData: Record<string, unknown> = { updated_at: this.db.fn.now() }
    if (data.tipe === 'pindah' && data.ke_lokasi) {
      updateData.lokasi_ruangan = data.ke_lokasi
    } else if (data.tipe === 'penghapusan') {
      updateData.status = 'dihapuskan'
    } else if (data.tipe === 'penjualan') {
      updateData.status = 'dijual'
    } else if (data.tipe === 'hibah') {
      updateData.status = 'dihapuskan'
    }

    await this.db
      .withSchema(tenantSchema)
      .from('assets')
      .where({ id: data.asset_id })
      .update(updateData)

    return record
  }

  async listMutations(tenantSchema: string, filters?: {
    asset_id?: string
    tipe?: string
    page?: number
    limit?: number
  }) {
    const page = filters?.page ?? 1
    const limit = Math.min(filters?.limit ?? 50, 100)
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(tenantSchema)
      .from('asset_mutations as am')
      .join('assets as a', 'am.asset_id', 'a.id')

    if (filters?.asset_id) query = query.where('am.asset_id', filters.asset_id)
    if (filters?.tipe) query = query.where('am.tipe', filters.tipe)

    const [{ count }] = await query.clone().count('am.id as count')
    const total = Number(count)

    const items = await query
      .clone()
      .select('am.*', 'a.kode as asset_kode', 'a.nama as asset_nama')
      .orderBy('am.tanggal', 'desc')
      .offset(offset)
      .limit(limit)

    return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  // ── STATS & REPORTS ──

  async getStats(tenantSchema: string) {
    const assets = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('assets')
      .whereNull('deleted_at')

    const totalAset = assets.length
    const totalNilaiPerolehan = assets.reduce(
      (s: number, a: Record<string, unknown>) => s + Number(a.harga_perolehan), 0,
    )
    let totalNilaiBuku = 0
    const byKategori: Record<string, { count: number; nilai: number }> = {}
    const byStatus: Record<string, number> = {}
    const byKondisi: Record<string, number> = {}
    const byLokasi: Record<string, number> = {}
    const perluKalibrasi: unknown[] = []
    const garansiAkanHabis: unknown[] = []

    const now = new Date()
    const tigaBulanLagi = new Date()
    tigaBulanLagi.setMonth(tigaBulanLagi.getMonth() + 3)

    for (const a of assets) {
      const dep = this.calculateDepreciation(a)
      totalNilaiBuku += dep.nilai_buku

      const kat = a.kategori || 'lainnya'
      if (!byKategori[kat]) byKategori[kat] = { count: 0, nilai: 0 }
      byKategori[kat].count++
      byKategori[kat].nilai += Number(a.harga_perolehan)

      byStatus[a.status] = (byStatus[a.status] || 0) + 1
      byKondisi[a.kondisi] = (byKondisi[a.kondisi] || 0) + 1

      const lok = a.lokasi_ruangan || 'Belum ditentukan'
      byLokasi[lok] = (byLokasi[lok] || 0) + 1

      // Cek kalibrasi
      if (a.interval_kalibrasi_bulan && a.tanggal_kalibrasi_terakhir) {
        const lastCal = new Date(a.tanggal_kalibrasi_terakhir)
        const nextCal = new Date(lastCal)
        nextCal.setMonth(nextCal.getMonth() + a.interval_kalibrasi_bulan)
        if (nextCal <= tigaBulanLagi) {
          perluKalibrasi.push({
            id: a.id, kode: a.kode, nama: a.nama,
            tanggal_kalibrasi_terakhir: a.tanggal_kalibrasi_terakhir,
            jadwal_selanjutnya: nextCal.toISOString().split('T')[0],
          })
        }
      }

      // Cek garansi
      if (a.garansi_berakhir) {
        const garansiEnd = new Date(a.garansi_berakhir)
        if (garansiEnd >= now && garansiEnd <= tigaBulanLagi) {
          garansiAkanHabis.push({
            id: a.id, kode: a.kode, nama: a.nama,
            garansi_berakhir: a.garansi_berakhir,
          })
        }
      }
    }

    // Total biaya pemeliharaan
    const [{ total: totalBiayaMaintenance }] = await this.db
      .withSchema(tenantSchema)
      .from('asset_maintenances')
      .sum('biaya as total')

    return {
      total_aset: totalAset,
      total_nilai_perolehan: Math.round(totalNilaiPerolehan),
      total_nilai_buku: Math.round(totalNilaiBuku),
      total_penyusutan: Math.round(totalNilaiPerolehan - totalNilaiBuku),
      total_biaya_pemeliharaan: Number(totalBiayaMaintenance) || 0,
      by_kategori: byKategori,
      by_status: byStatus,
      by_kondisi: byKondisi,
      by_lokasi: byLokasi,
      alerts: {
        perlu_kalibrasi: perluKalibrasi,
        garansi_akan_habis: garansiAkanHabis,
      },
    }
  }

  async getDepreciationReport(tenantSchema: string, tahun?: number) {
    const targetYear = tahun || new Date().getFullYear()

    const assets = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('assets')
      .whereNull('deleted_at')
      .where('status', 'aktif')
      .orderBy('kategori')
      .orderBy('nama')

    const rows = assets.map((a: Record<string, unknown>) => {
      const dep = this.calculateDepreciation(a)
      return {
        id: a.id,
        kode: a.kode,
        nama: a.nama,
        kategori: a.kategori,
        harga_perolehan: Number(a.harga_perolehan),
        umur_ekonomis_tahun: a.umur_ekonomis_tahun,
        metode_penyusutan: a.metode_penyusutan,
        ...dep,
      }
    })

    const totalPerolehan = rows.reduce((s, r) => s + r.harga_perolehan, 0)
    const totalBuku = rows.reduce((s, r) => s + r.nilai_buku, 0)
    const totalDepTahun = rows.reduce((s, r) => s + r.penyusutan_per_tahun, 0)

    return {
      tahun: targetYear,
      data: rows,
      summary: {
        total_aset: rows.length,
        total_harga_perolehan: totalPerolehan,
        total_nilai_buku: totalBuku,
        total_penyusutan_tahun_ini: totalDepTahun,
        total_akumulasi_penyusutan: totalPerolehan - totalBuku,
      },
    }
  }

  async getLocations(tenantSchema: string) {
    const locations = await this.db
      .withSchema(tenantSchema)
      .select('lokasi_ruangan')
      .from('assets')
      .whereNull('deleted_at')
      .whereNotNull('lokasi_ruangan')
      .groupBy('lokasi_ruangan')
      .orderBy('lokasi_ruangan')

    return locations.map((l: Record<string, unknown>) => l.lokasi_ruangan).filter(Boolean)
  }

  async generateKode(tenantSchema: string, kategori: string) {
    const prefix = ({
      medis: 'MED', non_medis: 'NMD', kendaraan: 'KDR', bangunan: 'BGN',
      it: 'IT', furniture: 'FRN', elektronik: 'ELK', lainnya: 'LNY',
    } as Record<string, string>)[kategori] || 'AST'

    const year = new Date().getFullYear()
    const [{ count }] = await this.db
      .withSchema(tenantSchema)
      .from('assets')
      .whereILike('kode', `${prefix}-${year}-%`)
      .count('id as count')

    const seq = String(Number(count) + 1).padStart(4, '0')
    return `${prefix}-${year}-${seq}`
  }
}
