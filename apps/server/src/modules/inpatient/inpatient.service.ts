import { Knex } from 'knex'
import { NotFoundError, ValidationError, ConflictError } from '../../shared/errors'
import { logger } from '../../shared/logger'

interface BillItem {
  kategori: string
  deskripsi: string
  qty: number
  harga_satuan: number
  total: number
  referensi_id?: string
  referensi_tipe?: string
}

export type RoomType = 'poli' | 'igd' | 'rawat_inap' | 'lab' | 'radiologi' | 'farmasi' | 'operasi'

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  poli: 'Poliklinik',
  igd: 'IGD',
  rawat_inap: 'Rawat Inap',
  lab: 'Laboratorium',
  radiologi: 'Radiologi',
  farmasi: 'Farmasi',
  operasi: 'Kamar Operasi',
}

export interface RoomWithBeds {
  id: string
  kode: string
  nama: string
  tipe: RoomType
  lantai: number | null
  kapasitas: number
  tarif_per_hari: number
  kelas: number | null
  is_active: boolean
  total_beds: number
  occupied_beds: number
  available_beds: number
  maintenance_beds: number
}

export interface BedDetail {
  id: string
  room_id: string
  nomor: string
  status: 'tersedia' | 'terisi' | 'maintenance'
  current_patient_id: string | null
  patient_name: string | null
  patient_no_rm: string | null
  visit_id: string | null
  admission_date: string | null
  room_nama: string
  room_kode: string
  tarif_per_hari: number
}

export class InpatientService {
  constructor(private db: Knex) {}

  async listRooms(tenantSchema: string, onlyInpatient = true): Promise<RoomWithBeds[]> {
    const query = this.db
      .withSchema(tenantSchema)
      .select(
        'r.id', 'r.kode', 'r.nama', 'r.tipe', 'r.lantai',
        'r.kapasitas', 'r.tarif_per_hari', 'r.kelas', 'r.is_active',
        this.db.raw(`COALESCE(COUNT(b.id), 0)::int as total_beds`),
        this.db.raw(`COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'terisi'), 0)::int as occupied_beds`),
        this.db.raw(`COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'tersedia'), 0)::int as available_beds`),
        this.db.raw(`COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'maintenance'), 0)::int as maintenance_beds`),
      )
      .from('rooms as r')
      .leftJoin('beds as b', 'r.id', 'b.room_id')
      .groupBy('r.id')
      .orderBy('r.nama')

    if (onlyInpatient) {
      query.where('r.tipe', 'rawat_inap')
    }

    return query as unknown as RoomWithBeds[]
  }

  async listAllRooms(
    tenantSchema: string,
    filters?: { tipe?: RoomType; includeInactive?: boolean },
  ): Promise<RoomWithBeds[]> {
    const query = this.db
      .withSchema(tenantSchema)
      .select(
        'r.id', 'r.kode', 'r.nama', 'r.tipe', 'r.lantai',
        'r.kapasitas', 'r.tarif_per_hari', 'r.kelas', 'r.is_active',
        this.db.raw(`COALESCE(COUNT(b.id), 0)::int as total_beds`),
        this.db.raw(
          `COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'terisi'), 0)::int as occupied_beds`,
        ),
        this.db.raw(
          `COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'tersedia'), 0)::int as available_beds`,
        ),
        this.db.raw(
          `COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'maintenance'), 0)::int as maintenance_beds`,
        ),
      )
      .from('rooms as r')
      .leftJoin('beds as b', 'r.id', 'b.room_id')
      .groupBy('r.id')
      .orderBy(['r.tipe', 'r.nama'])

    if (filters?.tipe) {
      query.where('r.tipe', filters.tipe)
    }
    if (!filters?.includeInactive) {
      query.where('r.is_active', true)
    }

    return query as unknown as RoomWithBeds[]
  }

  async toggleRoom(roomId: string, tenantSchema: string) {
    const room = await this.db.withSchema(tenantSchema)
      .select('id', 'kode', 'nama', 'tipe', 'is_active')
      .from('rooms').where({ id: roomId }).first()

    if (!room) throw new NotFoundError('Ruangan')

    if (room.is_active) {
      const occupiedBeds = await this.db.withSchema(tenantSchema)
        .count('id as cnt').from('beds')
        .where({ room_id: roomId, status: 'terisi' }).first()
      const cnt = Number(occupiedBeds?.cnt ?? 0)
      if (cnt > 0) {
        throw new ValidationError(
          `Tidak bisa menonaktifkan ruangan — masih ada ${cnt} bed terisi pasien`,
        )
      }
    }

    const newActive = !room.is_active
    await this.db.withSchema(tenantSchema)
      .update({ is_active: newActive, updated_at: new Date() })
      .from('rooms').where({ id: roomId })

    logger.info('Room toggled', { roomId, kode: room.kode, is_active: newActive })
    return { id: roomId, kode: room.kode, nama: room.nama, tipe: room.tipe, is_active: newActive }
  }

  async getRoomStats(tenantSchema: string) {
    const rows = await this.db.withSchema(tenantSchema)
      .select(
        'tipe',
        this.db.raw(`COUNT(*)::int as total`),
        this.db.raw(`COUNT(*) FILTER (WHERE is_active = true)::int as aktif`),
        this.db.raw(`COUNT(*) FILTER (WHERE is_active = false)::int as nonaktif`),
      )
      .from('rooms')
      .groupBy('tipe')
      .orderBy('tipe')

    const summary = {
      totalRooms: 0,
      totalAktif: 0,
      totalNonaktif: 0,
      perTipe: [] as { tipe: string; total: number; aktif: number; nonaktif: number }[],
    }

    for (const row of rows) {
      const total = Number(row.total)
      const aktif = Number(row.aktif)
      const nonaktif = Number(row.nonaktif)
      summary.totalRooms += total
      summary.totalAktif += aktif
      summary.totalNonaktif += nonaktif
      summary.perTipe.push({ tipe: row.tipe as string, total, aktif, nonaktif })
    }

    return summary
  }

  async getBedsByRoom(roomId: string, tenantSchema: string): Promise<BedDetail[]> {
    return this.db
      .withSchema(tenantSchema)
      .select(
        'b.id', 'b.room_id', 'b.nomor', 'b.status',
        'b.current_patient_id',
        'p.nama as patient_name',
        'p.no_rekam_medis as patient_no_rm',
        'v.id as visit_id',
        'v.created_at as admission_date',
        'r.nama as room_nama',
        'r.kode as room_kode',
        'r.tarif_per_hari',
      )
      .from('beds as b')
      .join('rooms as r', 'r.id', 'b.room_id')
      .leftJoin('patients as p', 'p.id', 'b.current_patient_id')
      .leftJoin('visits as v', function () {
        this.on('v.patient_id', '=', 'b.current_patient_id')
          .andOn('v.bed_id', '=', 'b.id')
          .andOnVal('v.tipe', '=', 'rawat_inap')
          .andOnIn('v.status', ['rawat_inap', 'diperiksa'])
      })
      .where('b.room_id', roomId)
      .orderBy('b.nomor') as unknown as BedDetail[]
  }

  async getAllBeds(tenantSchema: string): Promise<BedDetail[]> {
    return this.db
      .withSchema(tenantSchema)
      .select(
        'b.id', 'b.room_id', 'b.nomor', 'b.status',
        'b.current_patient_id',
        'p.nama as patient_name',
        'p.no_rekam_medis as patient_no_rm',
        'v.id as visit_id',
        'v.created_at as admission_date',
        'r.nama as room_nama',
        'r.kode as room_kode',
        'r.tarif_per_hari',
      )
      .from('beds as b')
      .join('rooms as r', 'r.id', 'b.room_id')
      .leftJoin('patients as p', 'p.id', 'b.current_patient_id')
      .leftJoin('visits as v', function () {
        this.on('v.patient_id', '=', 'b.current_patient_id')
          .andOn('v.bed_id', '=', 'b.id')
          .andOnVal('v.tipe', '=', 'rawat_inap')
          .andOnIn('v.status', ['rawat_inap', 'diperiksa'])
      })
      .where('r.tipe', 'rawat_inap')
      .orderBy(['r.nama', 'b.nomor']) as unknown as BedDetail[]
  }

  async assignBed(
    bedId: string,
    patientId: string,
    visitId: string,
    tenantSchema: string,
    userId: string,
  ) {
    const bed = await this.db.withSchema(tenantSchema)
      .select('*').from('beds').where({ id: bedId }).first()

    if (!bed) throw new NotFoundError('Bed')
    if (bed.status !== 'tersedia') {
      throw new ValidationError('Bed tidak tersedia')
    }

    const visit = await this.db.withSchema(tenantSchema)
      .select('id', 'patient_id', 'tipe', 'status')
      .from('visits').where({ id: visitId }).first()

    if (!visit) throw new NotFoundError('Visit')
    if (visit.patient_id !== patientId) {
      throw new ValidationError('Patient ID tidak sesuai dengan visit')
    }

    await this.db.transaction(async (trx) => {
      await trx.withSchema(tenantSchema)
        .update({ status: 'terisi', current_patient_id: patientId, updated_at: new Date() })
        .from('beds').where({ id: bedId })

      await trx.withSchema(tenantSchema)
        .update({ bed_id: bedId, status: 'rawat_inap', updated_by: userId, updated_at: new Date() })
        .from('visits').where({ id: visitId })
    })

    logger.info('Bed assigned', { bedId, patientId, visitId })
    return this.getBedsByRoom(bed.room_id, tenantSchema)
  }

  async releaseBed(bedId: string, tenantSchema: string, userId: string) {
    const bed = await this.db.withSchema(tenantSchema)
      .select('*').from('beds').where({ id: bedId }).first()

    if (!bed) throw new NotFoundError('Bed')
    if (bed.status !== 'terisi') {
      throw new ValidationError('Bed tidak dalam status terisi')
    }

    await this.db.transaction(async (trx) => {
      const activeVisit = await trx.withSchema(tenantSchema)
        .select('id').from('visits')
        .where({ bed_id: bedId, patient_id: bed.current_patient_id })
        .whereIn('status', ['rawat_inap', 'diperiksa'])
        .first()

      if (activeVisit) {
        await trx.withSchema(tenantSchema)
          .update({ status: 'selesai', updated_by: userId, updated_at: new Date() })
          .from('visits').where({ id: activeVisit.id })
      }

      await trx.withSchema(tenantSchema)
        .update({ status: 'tersedia', current_patient_id: null, updated_at: new Date() })
        .from('beds').where({ id: bedId })
    })

    logger.info('Bed released', { bedId })
    return { success: true }
  }

  async transferBed(
    fromBedId: string,
    toBedId: string,
    tenantSchema: string,
    userId: string,
  ) {
    const fromBed = await this.db.withSchema(tenantSchema)
      .select('*').from('beds').where({ id: fromBedId }).first()
    const toBed = await this.db.withSchema(tenantSchema)
      .select('*').from('beds').where({ id: toBedId }).first()

    if (!fromBed) throw new NotFoundError('Bed asal')
    if (!toBed) throw new NotFoundError('Bed tujuan')
    if (fromBed.status !== 'terisi') throw new ValidationError('Bed asal tidak terisi')
    if (toBed.status !== 'tersedia') throw new ValidationError('Bed tujuan tidak tersedia')

    const patientId = fromBed.current_patient_id

    await this.db.transaction(async (trx) => {
      await trx.withSchema(tenantSchema)
        .update({ status: 'tersedia', current_patient_id: null, updated_at: new Date() })
        .from('beds').where({ id: fromBedId })

      await trx.withSchema(tenantSchema)
        .update({ status: 'terisi', current_patient_id: patientId, updated_at: new Date() })
        .from('beds').where({ id: toBedId })

      await trx.withSchema(tenantSchema)
        .update({ bed_id: toBedId, updated_by: userId, updated_at: new Date() })
        .from('visits')
        .where({ bed_id: fromBedId, patient_id: patientId })
        .whereIn('status', ['rawat_inap', 'diperiksa'])
    })

    logger.info('Bed transferred', { fromBedId, toBedId, patientId })
    return { success: true }
  }

  async setBedMaintenance(bedId: string, tenantSchema: string) {
    const bed = await this.db.withSchema(tenantSchema)
      .select('*').from('beds').where({ id: bedId }).first()

    if (!bed) throw new NotFoundError('Bed')
    if (bed.status === 'terisi') {
      throw new ValidationError('Tidak bisa maintenance bed yang terisi pasien')
    }

    const newStatus = bed.status === 'maintenance' ? 'tersedia' : 'maintenance'
    await this.db.withSchema(tenantSchema)
      .update({ status: newStatus, updated_at: new Date() })
      .from('beds').where({ id: bedId })

    return { status: newStatus }
  }

  async getInpatientSummary(tenantSchema: string) {
    const rooms = await this.listRooms(tenantSchema)
    const totalBeds = rooms.reduce((s, r) => s + r.total_beds, 0)
    const occupied = rooms.reduce((s, r) => s + r.occupied_beds, 0)
    const available = rooms.reduce((s, r) => s + r.available_beds, 0)
    const maintenance = rooms.reduce((s, r) => s + r.maintenance_beds, 0)
    const bor = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0

    return { totalBeds, occupied, available, maintenance, bor, totalRooms: rooms.length }
  }

  // ==================== DISCHARGE (PULANG) ====================

  async discharge(
    visitId: string,
    tenantSchema: string,
    userId: string,
    options?: {
      cara_keluar?: 'sembuh' | 'pulang_paksa' | 'rujuk' | 'meninggal' | 'lainnya'
      catatan?: string
      rujuk_ke?: string
      sebab_meninggal?: string
    },
  ) {
    const caraKeluar = options?.cara_keluar || 'sembuh'
    const catatan = options?.catatan
    const rujukKe = options?.rujuk_ke
    const sebabMeninggal = options?.sebab_meninggal

    // Validate conditional required fields
    if (caraKeluar === 'rujuk' && !rujukKe?.trim()) {
      throw new ValidationError('Nama RS tujuan rujukan wajib diisi')
    }
    if (caraKeluar === 'meninggal' && !sebabMeninggal?.trim()) {
      throw new ValidationError('Penyebab kematian wajib diisi')
    }
    if (caraKeluar === 'pulang_paksa' && !catatan?.trim()) {
      throw new ValidationError('Alasan pulang paksa (APS) wajib diisi')
    }
    if (caraKeluar === 'lainnya' && !catatan?.trim()) {
      throw new ValidationError('Keterangan cara keluar wajib diisi')
    }

    const visit = await this.db.withSchema(tenantSchema)
      .select('v.*', 'p.nama as patient_nama', 'p.no_rekam_medis')
      .from('visits as v')
      .join('patients as p', 'p.id', 'v.patient_id')
      .where('v.id', visitId)
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    if (visit.status === 'pulang') {
      throw new ValidationError('Pasien sudah dalam status pulang')
    }
    if (!['rawat_inap', 'diperiksa', 'selesai'].includes(visit.status)) {
      throw new ValidationError(
        `Status kunjungan "${visit.status}" tidak bisa dipulangkan`,
      )
    }

    return this.db.transaction(async (trx) => {
      const now = new Date()

      // 1. Update visit status + discharge info
      const visitUpdate: Record<string, unknown> = {
        status: 'pulang',
        cara_keluar: caraKeluar,
        waktu_keluar: now,
        catatan: catatan || visit.catatan,
        updated_by: userId,
        updated_at: now,
      }
      if (caraKeluar === 'rujuk') {
        visitUpdate.rujuk_ke = rujukKe!.trim()
      }
      if (caraKeluar === 'meninggal') {
        visitUpdate.sebab_meninggal = sebabMeninggal!.trim()
      }

      await trx.withSchema(tenantSchema)
        .from('visits')
        .where({ id: visitId })
        .update(visitUpdate)

      // 2. Release bed if assigned
      let bedReleased = false
      if (visit.bed_id) {
        await trx.withSchema(tenantSchema)
          .from('beds')
          .where({ id: visit.bed_id })
          .update({
            status: 'tersedia',
            current_patient_id: null,
            updated_at: now,
          })
        bedReleased = true
      }

      // 3. Mark patient as deceased if meninggal
      let patientMarkedDeceased = false
      if (caraKeluar === 'meninggal') {
        await trx.withSchema(tenantSchema)
          .from('patients')
          .where({ id: visit.patient_id })
          .update({
            is_deceased: true,
            deceased_at: now,
            updated_at: now,
            updated_by: userId,
          })
        patientMarkedDeceased = true
      }

      // 4. Finalize queue if exists
      await trx.withSchema(tenantSchema)
        .from('queues')
        .where({ visit_id: visitId })
        .whereNot({ status: 'selesai' })
        .update({ status: 'selesai', finished_at: now })

      // 5. Auto-generate bill if not exists
      let billGenerated = false
      const existingBill = await trx.withSchema(tenantSchema)
        .select('id').from('bills')
        .where({ visit_id: visitId }).first()

      if (!existingBill) {
        const billItems = await this.collectBillItems(
          trx, visitId, visit, tenantSchema,
        )

        if (billItems.length > 0) {
          const totalAmount = billItems.reduce((s, i) => s + i.total, 0)
          const billNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`

          const [bill] = await trx.withSchema(tenantSchema)
            .insert({
              visit_id: visitId,
              patient_id: visit.patient_id,
              bill_number: billNumber,
              total_amount: totalAmount,
              discount_amount: 0,
              final_amount: totalAmount,
              status: 'draft',
              penjamin: visit.penjamin || 'umum',
              created_by: userId,
            })
            .into('bills')
            .returning('*')

          for (const item of billItems) {
            await trx.withSchema(tenantSchema)
              .insert({
                bill_id: bill.id,
                ...item,
              })
              .into('bill_items')
          }

          billGenerated = true
        }
      }

      const CARA_KELUAR_LABELS: Record<string, string> = {
        sembuh: 'Sembuh',
        pulang_paksa: 'Pulang Paksa (APS)',
        rujuk: 'Dirujuk',
        meninggal: 'Meninggal',
        lainnya: 'Lainnya',
      }

      logger.info('Patient discharged', {
        visitId,
        patientName: visit.patient_nama,
        caraKeluar,
        bedReleased,
        billGenerated,
        patientMarkedDeceased,
        tenant: tenantSchema,
      })

      return {
        visitId,
        patientName: visit.patient_nama,
        noRM: visit.no_rekam_medis,
        status: 'pulang',
        caraKeluar,
        caraKeluarLabel: CARA_KELUAR_LABELS[caraKeluar] || caraKeluar,
        bedReleased,
        billGenerated,
        patientMarkedDeceased,
        rujukKe: rujukKe || null,
      }
    })
  }

  private async collectBillItems(
    trx: Knex.Transaction,
    visitId: string,
    visit: Record<string, unknown>,
    tenantSchema: string,
  ) {
    const items: BillItem[] = []

    // 1. Konsultasi dokter
    const doctor = await trx.withSchema(tenantSchema)
      .select('d.tarif_konsultasi', 'u.name as doctor_nama')
      .from('doctors as d')
      .join('users as u', 'u.id', 'd.user_id')
      .where('d.id', visit.doctor_id as string)
      .first()

    if (doctor && Number(doctor.tarif_konsultasi) > 0) {
      const tarif = Number(doctor.tarif_konsultasi)
      items.push({
        kategori: 'konsultasi',
        deskripsi: `Konsultasi ${doctor.doctor_nama}`,
        qty: 1,
        harga_satuan: tarif,
        total: tarif,
      })
    }

    // 2. Tindakan
    const procedures = await trx.withSchema(tenantSchema)
      .select('pr.*')
      .from('procedures as pr')
      .join('medical_records as mr', 'mr.id', 'pr.medical_record_id')
      .where('mr.visit_id', visitId)

    for (const proc of procedures) {
      const total = Number(proc.tarif) * Number(proc.qty)
      items.push({
        kategori: 'tindakan',
        deskripsi: proc.nama_tindakan,
        qty: Number(proc.qty),
        harga_satuan: Number(proc.tarif),
        total,
        referensi_id: proc.id,
        referensi_tipe: 'procedure',
      })
    }

    // 3. Obat
    const dispensingItems = await trx.withSchema(tenantSchema)
      .select(
        'di.id as di_id', 'di.jumlah_diberikan', 'di.drug_id',
        'dr.nama as drug_nama', 'dr.harga_jual',
      )
      .from('dispensing_items as di')
      .join('dispensing as dp', 'dp.id', 'di.dispensing_id')
      .join('drugs as dr', 'dr.id', 'di.drug_id')
      .where('dp.visit_id', visitId)
      .andWhere('di.jumlah_diberikan', '>', 0)

    for (const di of dispensingItems) {
      const qty = Number(di.jumlah_diberikan)
      const harga = Number(di.harga_jual)
      const total = harga * qty
      items.push({
        kategori: 'obat',
        deskripsi: di.drug_nama,
        qty,
        harga_satuan: harga,
        total,
        referensi_id: di.di_id,
        referensi_tipe: 'dispensing_item',
      })
    }

    // 4. Kamar rawat inap
    if (visit.tipe === 'rawat_inap' && visit.bed_id) {
      const bed = await trx.withSchema(tenantSchema)
        .select('b.room_id', 'r.nama as room_nama', 'r.tarif_per_hari')
        .from('beds as b')
        .join('rooms as r', 'r.id', 'b.room_id')
        .where('b.id', visit.bed_id as string)
        .first()

      if (bed && Number(bed.tarif_per_hari) > 0) {
        const checkIn = new Date(visit.tanggal as string)
        const now = new Date()
        const diffMs = now.getTime() - checkIn.getTime()
        const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
        const tarif = Number(bed.tarif_per_hari)
        const total = tarif * days
        items.push({
          kategori: 'kamar',
          deskripsi: `${bed.room_nama} (${days} hari)`,
          qty: days,
          harga_satuan: tarif,
          total,
        })
      }
    }

    return items
  }

  // ==================== ROOM CRUD ====================

  async createRoom(
    data: {
      kode: string
      nama: string
      tipe?: RoomType
      lantai?: number | null
      kapasitas: number
      tarif_per_hari: number
      kelas?: string
    },
    tenantSchema: string,
  ) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('rooms').where({ kode: data.kode }).first()
    if (existing) throw new ConflictError(`Ruangan dengan kode ${data.kode} sudah ada`)

    const tipe = data.tipe || 'rawat_inap'
    const validTypes: RoomType[] = [
      'poli', 'igd', 'rawat_inap', 'lab', 'radiologi', 'farmasi', 'operasi',
    ]
    if (!validTypes.includes(tipe)) {
      throw new ValidationError(`Tipe ruangan tidak valid: ${tipe}`)
    }

    const insertData: Record<string, unknown> = {
      kode: data.kode,
      nama: data.nama,
      tipe,
      lantai: data.lantai ?? null,
      kapasitas: data.kapasitas,
      tarif_per_hari: data.tarif_per_hari,
      is_active: true,
    }
    if (data.kelas) {
      const k = Number(data.kelas)
      if ([1, 2, 3].includes(k)) insertData.kelas = k
    }

    const [room] = await this.db.withSchema(tenantSchema)
      .insert(insertData)
      .into('rooms')
      .returning('*')

    if (tipe === 'rawat_inap' && data.kapasitas > 0) {
      await this.syncBeds(room.id, data.kapasitas, data.kode, tenantSchema)
    }

    logger.info('Room created', { roomId: room.id, kode: data.kode, tipe })
    return room
  }

  async updateRoom(
    roomId: string,
    data: {
      kode?: string
      nama?: string
      lantai?: number | null
      kapasitas?: number
      tarif_per_hari?: number
      is_active?: boolean
      kelas?: string
    },
    tenantSchema: string,
  ) {
    const room = await this.db.withSchema(tenantSchema)
      .select('*').from('rooms').where({ id: roomId }).first()
    if (!room) throw new NotFoundError('Ruangan')

    if (data.kode && data.kode !== room.kode) {
      const dup = await this.db.withSchema(tenantSchema)
        .select('id').from('rooms').where({ kode: data.kode }).whereNot({ id: roomId }).first()
      if (dup) throw new ConflictError(`Kode ruangan ${data.kode} sudah dipakai`)
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (data.kode !== undefined) updateData.kode = data.kode
    if (data.nama !== undefined) updateData.nama = data.nama
    if (data.lantai !== undefined) updateData.lantai = data.lantai
    if (data.tarif_per_hari !== undefined) updateData.tarif_per_hari = data.tarif_per_hari
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.kapasitas !== undefined) updateData.kapasitas = data.kapasitas
    if (data.kelas !== undefined) {
      const k = Number(data.kelas)
      updateData.kelas = [1, 2, 3].includes(k) ? k : null
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .update(updateData).from('rooms').where({ id: roomId }).returning('*')

    if (data.kapasitas !== undefined && data.kapasitas !== room.kapasitas) {
      const kode = data.kode ?? room.kode
      await this.syncBeds(roomId, data.kapasitas, kode, tenantSchema)
    }

    logger.info('Room updated', { roomId })
    return updated
  }

  async deleteRoom(roomId: string, tenantSchema: string) {
    const room = await this.db.withSchema(tenantSchema)
      .select('*').from('rooms').where({ id: roomId }).first()
    if (!room) throw new NotFoundError('Ruangan')

    const occupiedBeds = await this.db.withSchema(tenantSchema)
      .count('id as cnt').from('beds')
      .where({ room_id: roomId, status: 'terisi' }).first()

    const cnt = Number(occupiedBeds?.cnt ?? 0)
    if (cnt > 0) {
      throw new ValidationError(
        `Tidak bisa hapus ruangan — masih ada ${cnt} bed terisi pasien`,
      )
    }

    await this.db.withSchema(tenantSchema)
      .delete().from('beds').where({ room_id: roomId })
    await this.db.withSchema(tenantSchema)
      .delete().from('rooms').where({ id: roomId })

    logger.info('Room deleted', { roomId, kode: room.kode })
    return { success: true }
  }

  async getRoom(roomId: string, tenantSchema: string) {
    const room = await this.db.withSchema(tenantSchema)
      .select('*').from('rooms').where({ id: roomId }).first()
    if (!room) throw new NotFoundError('Ruangan')
    return room
  }

  // ==================== BED CRUD ====================

  async addBed(roomId: string, nomor: string, tenantSchema: string) {
    const room = await this.db.withSchema(tenantSchema)
      .select('*').from('rooms').where({ id: roomId }).first()
    if (!room) throw new NotFoundError('Ruangan')

    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('beds')
      .where({ room_id: roomId, nomor }).first()
    if (existing) throw new ConflictError(`Bed ${nomor} sudah ada di ruangan ini`)

    const [bed] = await this.db.withSchema(tenantSchema)
      .insert({ room_id: roomId, nomor, status: 'tersedia' })
      .into('beds').returning('*')

    await this.db.withSchema(tenantSchema)
      .update({ kapasitas: this.db.raw('kapasitas + 1'), updated_at: new Date() })
      .from('rooms').where({ id: roomId })

    logger.info('Bed added', { bedId: bed.id, roomId, nomor })
    return bed
  }

  async removeBed(bedId: string, tenantSchema: string) {
    const bed = await this.db.withSchema(tenantSchema)
      .select('*').from('beds').where({ id: bedId }).first()
    if (!bed) throw new NotFoundError('Bed')
    if (bed.status === 'terisi') {
      throw new ValidationError('Tidak bisa hapus bed yang sedang terisi pasien')
    }

    await this.db.withSchema(tenantSchema)
      .delete().from('beds').where({ id: bedId })

    await this.db.withSchema(tenantSchema)
      .update({
        kapasitas: this.db.raw('GREATEST(kapasitas - 1, 0)'),
        updated_at: new Date(),
      })
      .from('rooms').where({ id: bed.room_id })

    logger.info('Bed removed', { bedId, roomId: bed.room_id })
    return { success: true }
  }

  async renameBed(bedId: string, nomor: string, tenantSchema: string) {
    const bed = await this.db.withSchema(tenantSchema)
      .select('*').from('beds').where({ id: bedId }).first()
    if (!bed) throw new NotFoundError('Bed')

    const dup = await this.db.withSchema(tenantSchema)
      .select('id').from('beds')
      .where({ room_id: bed.room_id, nomor }).whereNot({ id: bedId }).first()
    if (dup) throw new ConflictError(`Nomor bed ${nomor} sudah ada di ruangan ini`)

    const [updated] = await this.db.withSchema(tenantSchema)
      .update({ nomor, updated_at: new Date() })
      .from('beds').where({ id: bedId }).returning('*')

    return updated
  }

  // ==================== VALIDASI KELAS BPJS ====================

  async validateKelas(
    roomId: string,
    hakKelas: number,
    tenantSchema: string,
  ): Promise<{
    valid: boolean
    roomKelas: number | null
    hakKelas: number
    selisih: 'sesuai' | 'naik_kelas' | 'turun_kelas'
    kelasNama: { room: string; hak: string }
    pesanWarning: string | null
  }> {
    const room = await this.db.withSchema(tenantSchema)
      .select('id', 'kelas', 'nama', 'tarif_per_hari')
      .from('rooms')
      .where({ id: roomId })
      .first()

    if (!room) throw new NotFoundError('Ruangan')

    const kelasLabels: Record<number, string> = {
      1: 'Kelas 1',
      2: 'Kelas 2',
      3: 'Kelas 3',
    }

    const roomKelas = room.kelas ? Number(room.kelas) : null
    const hakKelasNum = Number(hakKelas)

    // If room has no kelas set, skip validation
    if (roomKelas === null) {
      return {
        valid: true,
        roomKelas: null,
        hakKelas: hakKelasNum,
        selisih: 'sesuai',
        kelasNama: {
          room: 'Belum diset',
          hak: kelasLabels[hakKelasNum] || `Kelas ${hakKelasNum}`,
        },
        pesanWarning: null,
      }
    }

    // Kelas 1 is highest, kelas 3 is lowest
    // roomKelas < hakKelas means room is higher class (naik kelas)
    // roomKelas > hakKelas means room is lower class (turun kelas)
    let selisih: 'sesuai' | 'naik_kelas' | 'turun_kelas' = 'sesuai'
    let pesanWarning: string | null = null

    if (roomKelas < hakKelasNum) {
      selisih = 'naik_kelas'
      pesanWarning =
        `Pasien hak ${kelasLabels[hakKelasNum]} memilih ruangan ${kelasLabels[roomKelas]} (${room.nama}). ` +
        'Selisih biaya naik kelas akan dibebankan ke pasien. ' +
        'Pastikan pasien menyetujui upgrade kelas.'
    } else if (roomKelas > hakKelasNum) {
      selisih = 'turun_kelas'
      pesanWarning =
        `Pasien hak ${kelasLabels[hakKelasNum]} memilih ruangan ${kelasLabels[roomKelas]} (${room.nama}). ` +
        'Turun kelas hanya diperbolehkan jika atas permintaan pasien sendiri.'
    }

    return {
      valid: true,
      roomKelas,
      hakKelas: hakKelasNum,
      selisih,
      kelasNama: {
        room: kelasLabels[roomKelas] || `Kelas ${roomKelas}`,
        hak: kelasLabels[hakKelasNum] || `Kelas ${hakKelasNum}`,
      },
      pesanWarning,
    }
  }

  // ==================== HELPERS ====================

  private async syncBeds(
    roomId: string,
    targetCount: number,
    roomKode: string,
    tenantSchema: string,
  ) {
    const currentBeds = await this.db.withSchema(tenantSchema)
      .select('id', 'nomor', 'status').from('beds')
      .where({ room_id: roomId }).orderBy('nomor')

    const currentCount = currentBeds.length

    if (targetCount > currentCount) {
      const newBeds = []
      for (let i = currentCount + 1; i <= targetCount; i++) {
        newBeds.push({
          room_id: roomId,
          nomor: `${roomKode}-${String(i).padStart(2, '0')}`,
          status: 'tersedia',
        })
      }
      if (newBeds.length > 0) {
        await this.db.withSchema(tenantSchema).insert(newBeds).into('beds')
      }
    } else if (targetCount < currentCount) {
      const removable = currentBeds
        .filter((b: { status: string }) => b.status !== 'terisi')
        .slice(targetCount)

      if (currentCount - removable.length > targetCount) {
        throw new ValidationError(
          `Tidak bisa kurangi kapasitas — ada bed terisi yang akan terhapus`,
        )
      }

      const idsToRemove = removable
        .slice(0, currentCount - targetCount)
        .map((b: { id: string }) => b.id)

      if (idsToRemove.length > 0) {
        await this.db.withSchema(tenantSchema)
          .delete().from('beds').whereIn('id', idsToRemove)
      }
    }
  }
}
