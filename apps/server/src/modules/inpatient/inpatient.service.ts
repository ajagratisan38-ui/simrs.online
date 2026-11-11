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
      .select('id', 'patient_id', 'tipe', 'status', 'tanggal')
      .from('visits').where({ id: visitId }).first()

    if (!visit) throw new NotFoundError('Visit')
    if (visit.patient_id !== patientId) {
      throw new ValidationError('Patient ID tidak sesuai dengan visit')
    }

    const room = await this.db.withSchema(tenantSchema)
      .select('id', 'nama', 'tarif_per_hari', 'kelas')
      .from('rooms').where({ id: bed.room_id }).first()

    await this.db.transaction(async (trx) => {
      await trx.withSchema(tenantSchema)
        .update({ status: 'terisi', current_patient_id: patientId, updated_at: new Date() })
        .from('beds').where({ id: bedId })

      await trx.withSchema(tenantSchema)
        .update({ bed_id: bedId, status: 'rawat_inap', updated_by: userId, updated_at: new Date() })
        .from('visits').where({ id: visitId })

      // Record initial bed assignment in transfer history
      await trx.withSchema(tenantSchema)
        .insert({
          visit_id: visitId,
          to_bed_id: bedId,
          to_room_id: bed.room_id,
          to_room_nama: room?.nama || '',
          to_room_tarif: room?.tarif_per_hari || 0,
          to_room_kelas: room?.kelas || null,
          transferred_at: visit.tanggal || new Date(),
          transferred_by: userId,
          catatan: 'Admisi awal',
        })
        .into('bed_transfers')
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
    catatan?: string,
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

    // Get room info for both beds
    const fromRoom = await this.db.withSchema(tenantSchema)
      .select('id', 'nama', 'tarif_per_hari', 'kelas')
      .from('rooms').where({ id: fromBed.room_id }).first()
    const toRoom = await this.db.withSchema(tenantSchema)
      .select('id', 'nama', 'tarif_per_hari', 'kelas')
      .from('rooms').where({ id: toBed.room_id }).first()

    // Find the active visit for this bed
    const activeVisit = await this.db.withSchema(tenantSchema)
      .select('id').from('visits')
      .where({ bed_id: fromBedId, patient_id: patientId })
      .whereIn('status', ['rawat_inap', 'diperiksa'])
      .first()

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

      // Record transfer in bed_transfers history
      if (activeVisit) {
        await trx.withSchema(tenantSchema)
          .insert({
            visit_id: activeVisit.id,
            from_bed_id: fromBedId,
            from_room_id: fromBed.room_id,
            from_room_nama: fromRoom?.nama || '',
            from_room_tarif: fromRoom?.tarif_per_hari || 0,
            from_room_kelas: fromRoom?.kelas || null,
            to_bed_id: toBedId,
            to_room_id: toBed.room_id,
            to_room_nama: toRoom?.nama || '',
            to_room_tarif: toRoom?.tarif_per_hari || 0,
            to_room_kelas: toRoom?.kelas || null,
            transferred_at: new Date(),
            transferred_by: userId,
            catatan: catatan || null,
          })
          .into('bed_transfers')
      }
    })

    logger.info('Bed transferred', {
      fromBedId, toBedId, patientId,
      fromRoom: fromRoom?.nama, toRoom: toRoom?.nama,
    })
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
    if (!['rawat_inap', 'diperiksa', 'selesai', 'menunggu', 'dipanggil', 'dilayani'].includes(visit.status as string)) {
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
        let billItems: BillItem[] = []
        try {
          billItems = await this.collectBillItems(
            trx, visitId, visit, tenantSchema,
          )
        } catch (err) {
          logger.warn('Failed to collect bill items during discharge, skipping bill generation', {
            visitId, error: (err as Error).message,
          })
        }

        if (billItems.length > 0) {
          const totalAmount = billItems.reduce((s, i) => s + i.total, 0)
          const [bill] = await trx.withSchema(tenantSchema)
            .insert({
              visit_id: visitId,
              patient_id: visit.patient_id,
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

  /**
   * Resolve tarif based on room class.
   * For rawat_inap: use the patient's room kelas (3, 2, 1, or VIP=0)
   * For IGD: use tarif_igd
   * For rawat_jalan: use tarif_poli
   */
  private resolveKompTarif(
    komponen: Record<string, unknown>,
    visitTipe: string,
    roomKelas: number | null,
  ): number {
    if (visitTipe === 'igd') return Number(komponen.tarif_igd) || 0
    if (visitTipe !== 'rawat_inap') return Number(komponen.tarif_poli) || 0

    switch (roomKelas) {
      case 3: return Number(komponen.tarif_kelas_3) || 0
      case 2: return Number(komponen.tarif_kelas_2) || 0
      case 1: return Number(komponen.tarif_kelas_1) || 0
      case 0: return Number(komponen.tarif_vip) || 0
      default: return Number(komponen.tarif_kelas_3) || 0
    }
  }

  private async collectBillItems(
    trx: Knex.Transaction,
    visitId: string,
    visit: Record<string, unknown>,
    tenantSchema: string,
  ) {
    const items: BillItem[] = []

    // Determine room kelas for class-based pricing
    let roomKelas: number | null = null
    if (visit.bed_id) {
      const roomInfo = await trx.withSchema(tenantSchema)
        .select('r.kelas')
        .from('beds as b')
        .join('rooms as r', 'r.id', 'b.room_id')
        .where('b.id', visit.bed_id as string)
        .first()
      roomKelas = roomInfo?.kelas ? Number(roomInfo.kelas) : null
    }

    const visitTipe = visit.tipe as string

    // 1. Konsultasi/Visite dokter — class-based pricing
    const doctor = await trx.withSchema(tenantSchema)
      .select('d.tarif_konsultasi', 'd.spesialisasi', 'u.name as doctor_nama')
      .from('doctors as d')
      .join('users as u', 'u.id', 'd.user_id')
      .where('d.id', visit.doctor_id as string)
      .first()

    if (doctor) {
      // Try class-based tariff from komponen_tarif
      const spesialisasi = (doctor.spesialisasi as string || '').toLowerCase()
      let visiteKode = 'VIS-UMUM'
      if (spesialisasi.includes('sub')) visiteKode = 'VIS-SUBSPESIALIS'
      else if (spesialisasi.includes('gigi')) visiteKode = 'VIS-GIGI'
      else if (spesialisasi && spesialisasi !== 'umum') visiteKode = 'VIS-SPESIALIS'

      const kompVisite = await trx.withSchema(tenantSchema)
        .select('*').from('komponen_tarif')
        .where({ kode: visiteKode, is_active: true }).first()

      let tarif = 0
      let deskripsi = `Visite ${doctor.doctor_nama}`

      if (kompVisite) {
        tarif = this.resolveKompTarif(kompVisite, visitTipe, roomKelas)
        const kelasLabel = roomKelas !== null
          ? (roomKelas === 0 ? 'VIP' : `Kelas ${roomKelas}`)
          : (visitTipe === 'igd' ? 'IGD' : 'Poli')
        deskripsi = `Visite ${doctor.doctor_nama} (${kelasLabel})`
      } else {
        // Fallback to flat tarif_konsultasi
        tarif = Number(doctor.tarif_konsultasi) || 0
      }

      if (tarif > 0) {
        items.push({
          kategori: 'konsultasi',
          deskripsi,
          qty: 1,
          harga_satuan: tarif,
          total: tarif,
        })
      }
    }

    // 2. Tindakan — class-based pricing with fallback
    const procedures = await trx.withSchema(tenantSchema)
      .select('pr.*')
      .from('procedures as pr')
      .join('medical_records as mr', 'mr.id', 'pr.medical_record_id')
      .where('mr.visit_id', visitId)

    for (const proc of procedures) {
      let tarif = Number(proc.tarif)

      // Try class-based tariff lookup by kode_tindakan
      if (proc.kode_tindakan) {
        const kompTindakan = await trx.withSchema(tenantSchema)
          .select('*').from('komponen_tarif')
          .where({ kode: proc.kode_tindakan, is_active: true }).first()

        if (kompTindakan) {
          const resolvedTarif = this.resolveKompTarif(kompTindakan, visitTipe, roomKelas)
          if (resolvedTarif > 0) tarif = resolvedTarif
        }
      }

      const qty = Number(proc.qty)
      const total = tarif * qty
      items.push({
        kategori: 'tindakan',
        deskripsi: proc.nama_tindakan,
        qty,
        harga_satuan: tarif,
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

    // 4. Kamar rawat inap — hitung per segmen (per bed/room yang ditempati)
    if (visit.tipe === 'rawat_inap' && visit.bed_id) {
      const transfers = await trx.withSchema(tenantSchema)
        .select('*')
        .from('bed_transfers')
        .where({ visit_id: visitId })
        .orderBy('transferred_at', 'asc')

      const now = new Date()
      const admissionDate = visit.tanggal ? new Date(visit.tanggal as string) : new Date(visit.created_at as string)

      if (transfers.length > 0) {
        // Has transfer history — calculate per segment
        for (let i = 0; i < transfers.length; i++) {
          const transfer = transfers[i]
          const segmentStart = i === 0
            ? admissionDate
            : new Date(transfer.transferred_at as string)
          const segmentEnd = i < transfers.length - 1
            ? new Date(transfers[i + 1].transferred_at as string)
            : now

          const roomNama = transfer.to_room_nama as string || 'Ruangan'
          const tarif = Number(transfer.to_room_tarif) || 0
          const kelas = transfer.to_room_kelas ? ` Kelas ${transfer.to_room_kelas}` : ''

          if (tarif <= 0) continue

          const diffMs = segmentEnd.getTime() - segmentStart.getTime()
          const days = Math.max(1, isNaN(diffMs) ? 1 : Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
          const total = tarif * days

          items.push({
            kategori: 'kamar',
            deskripsi: `${roomNama}${kelas} (${days} hari)`,
            qty: days,
            harga_satuan: tarif,
            total,
          })
        }
      } else {
        // No transfer history (legacy) — fallback to single bed calculation
        const bed = await trx.withSchema(tenantSchema)
          .select('b.room_id', 'r.nama as room_nama', 'r.tarif_per_hari', 'r.kelas')
          .from('beds as b')
          .join('rooms as r', 'r.id', 'b.room_id')
          .where('b.id', visit.bed_id as string)
          .first()

        if (bed && Number(bed.tarif_per_hari) > 0) {
          const diffMs = now.getTime() - admissionDate.getTime()
          const days = Math.max(1, isNaN(diffMs) ? 1 : Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
          const tarif = Number(bed.tarif_per_hari)
          const kelas = bed.kelas ? ` Kelas ${bed.kelas}` : ''
          const total = tarif * days
          items.push({
            kategori: 'kamar',
            deskripsi: `${bed.room_nama}${kelas} (${days} hari)`,
            qty: days,
            harga_satuan: tarif,
            total,
          })
        }
      }
    }

    // 5. Jasa Perawatan Harian (rawat inap only, class-based)
    if (visitTipe === 'rawat_inap') {
      const kompPerawatan = await trx.withSchema(tenantSchema)
        .select('*').from('komponen_tarif')
        .where({ kode: 'PRW-HARIAN', is_active: true }).first()

      if (kompPerawatan) {
        const tarifPerawatan = this.resolveKompTarif(kompPerawatan, visitTipe, roomKelas)
        if (tarifPerawatan > 0) {
          const admDate = visit.tanggal
            ? new Date(visit.tanggal as string)
            : new Date(visit.created_at as string)
          const diffMs = new Date().getTime() - admDate.getTime()
          const days = Math.max(1, isNaN(diffMs) ? 1 : Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
          const totalPerawatan = tarifPerawatan * days
          const kelasLabel = roomKelas !== null
            ? (roomKelas === 0 ? 'VIP' : `Kelas ${roomKelas}`)
            : ''
          items.push({
            kategori: 'keperawatan',
            deskripsi: `Jasa Perawatan Harian${kelasLabel ? ` (${kelasLabel})` : ''} (${days} hari)`,
            qty: days,
            harga_satuan: tarifPerawatan,
            total: totalPerawatan,
          })
        }
      }
    }

    // 6. Biaya Administrasi (class-based)
    const kompAdmin = await trx.withSchema(tenantSchema)
      .select('*').from('komponen_tarif')
      .where({ kode: 'ADM-MASUK', is_active: true }).first()

    if (kompAdmin) {
      const tarifAdmin = this.resolveKompTarif(kompAdmin, visitTipe, roomKelas)
      if (tarifAdmin > 0) {
        items.push({
          kategori: 'administrasi',
          deskripsi: 'Biaya Administrasi',
          qty: 1,
          harga_satuan: tarifAdmin,
          total: tarifAdmin,
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

  // ==================== BED TRANSFER HISTORY ====================

  async getBedTransferHistory(visitId: string, tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('*')
      .from('bed_transfers')
      .where({ visit_id: visitId })
      .orderBy('transferred_at', 'asc')
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
