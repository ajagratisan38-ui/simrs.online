import type { Knex } from 'knex'

interface CreatePackageDTO {
  nama: string
  kode: string
  deskripsi?: string
  harga: number
  items: {
    kategori: string
    nama: string
    deskripsi?: string
    is_required?: boolean
    sort_order?: number
  }[]
}

interface RegisterMcuDTO {
  patient_id: string
  package_id: string
  tanggal?: string
  tujuan?: string
  perusahaan?: string
  doctor_id?: string
}

interface InputExamResultDTO {
  hasil?: string
  nilai?: string
  satuan?: string
  nilai_normal?: string
  is_abnormal?: boolean
  catatan?: string
}

interface ConclusionDTO {
  conclusion: 'fit' | 'fit_with_notes' | 'temporarily_unfit' | 'unfit'
  conclusion_notes?: string
}

export class McuService {
  constructor(private db: Knex) {}

  // ═══════════════════════════════════════
  // PACKAGES
  // ═══════════════════════════════════════

  async listPackages(schema: string) {
    const packages = await this.db
      .withSchema(schema)
      .select('*')
      .from('mcu_packages')
      .orderBy('created_at', 'asc')

    for (const pkg of packages) {
      pkg.items = await this.db
        .withSchema(schema)
        .select('*')
        .from('mcu_package_items')
        .where({ package_id: pkg.id })
        .orderBy('sort_order', 'asc')
    }

    return packages
  }

  async getPackage(schema: string, packageId: string) {
    const pkg = await this.db
      .withSchema(schema)
      .select('*')
      .from('mcu_packages')
      .where({ id: packageId })
      .first()

    if (!pkg) return null

    pkg.items = await this.db
      .withSchema(schema)
      .select('*')
      .from('mcu_package_items')
      .where({ package_id: pkg.id })
      .orderBy('sort_order', 'asc')

    return pkg
  }

  async createPackage(schema: string, data: CreatePackageDTO) {
    return this.db.transaction(async (trx) => {
      const [pkg] = await trx
        .withSchema(schema)
        .insert({
          nama: data.nama,
          kode: data.kode.toUpperCase(),
          deskripsi: data.deskripsi || null,
          harga: data.harga,
        })
        .into('mcu_packages')
        .returning('*')

      if (data.items?.length) {
        const items = data.items.map((item, idx) => ({
          package_id: pkg.id,
          kategori: item.kategori,
          nama: item.nama,
          deskripsi: item.deskripsi || null,
          is_required: item.is_required !== false,
          sort_order: item.sort_order ?? idx,
        }))

        await trx.withSchema(schema).insert(items).into('mcu_package_items')
      }

      return this.getPackage(schema, pkg.id)
    })
  }

  async updatePackage(schema: string, packageId: string, data: Partial<CreatePackageDTO>) {
    return this.db.transaction(async (trx) => {
      const updates: Record<string, unknown> = { updated_at: trx.fn.now() }
      if (data.nama) updates.nama = data.nama
      if (data.kode) updates.kode = data.kode.toUpperCase()
      if (data.deskripsi !== undefined) updates.deskripsi = data.deskripsi
      if (data.harga !== undefined) updates.harga = data.harga

      await trx
        .withSchema(schema)
        .table('mcu_packages')
        .where({ id: packageId })
        .update(updates)

      if (data.items) {
        await trx
          .withSchema(schema)
          .table('mcu_package_items')
          .where({ package_id: packageId })
          .delete()

        if (data.items.length) {
          const items = data.items.map((item, idx) => ({
            package_id: packageId,
            kategori: item.kategori,
            nama: item.nama,
            deskripsi: item.deskripsi || null,
            is_required: item.is_required !== false,
            sort_order: item.sort_order ?? idx,
          }))

          await trx.withSchema(schema).insert(items).into('mcu_package_items')
        }
      }

      return this.getPackage(schema, packageId)
    })
  }

  async togglePackage(schema: string, packageId: string) {
    const pkg = await this.db
      .withSchema(schema)
      .select('is_active')
      .from('mcu_packages')
      .where({ id: packageId })
      .first()

    if (!pkg) return null

    await this.db
      .withSchema(schema)
      .table('mcu_packages')
      .where({ id: packageId })
      .update({ is_active: !pkg.is_active, updated_at: this.db.fn.now() })

    return { is_active: !pkg.is_active }
  }

  async deletePackage(schema: string, packageId: string) {
    const used = await this.db
      .withSchema(schema)
      .select('id')
      .from('mcu_registrations')
      .where({ package_id: packageId })
      .first()

    if (used) {
      throw new Error('Paket MCU sudah digunakan, tidak bisa dihapus')
    }

    return this.db
      .withSchema(schema)
      .table('mcu_packages')
      .where({ id: packageId })
      .delete()
  }

  // ═══════════════════════════════════════
  // REGISTRATIONS
  // ═══════════════════════════════════════

  async register(schema: string, data: RegisterMcuDTO, userId: string) {
    return this.db.transaction(async (trx) => {
      const pkg = await this.getPackage(schema, data.package_id)
      if (!pkg) throw new Error('Paket MCU tidak ditemukan')

      const certNum = await this.generateCertificateNumber(schema, trx)

      const [reg] = await trx
        .withSchema(schema)
        .insert({
          patient_id: data.patient_id,
          package_id: data.package_id,
          doctor_id: data.doctor_id || null,
          tanggal: data.tanggal || new Date().toISOString().slice(0, 10),
          tujuan: data.tujuan || null,
          perusahaan: data.perusahaan || null,
          certificate_number: certNum,
          created_by: userId,
        })
        .into('mcu_registrations')
        .returning('*')

      if (pkg.items?.length) {
        const exams = pkg.items.map((item: Record<string, unknown>) => ({
          registration_id: reg.id,
          package_item_id: item.id,
          kategori: item.kategori,
          nama: item.nama,
        }))

        await trx.withSchema(schema).insert(exams).into('mcu_examinations')
      }

      return this.getRegistration(schema, reg.id)
    })
  }

  private async generateCertificateNumber(schema: string, trx: Knex) {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')

    const count = await trx
      .withSchema(schema)
      .count('id as total')
      .from('mcu_registrations')
      .whereRaw("to_char(created_at, 'YYYY-MM') = ?", [`${year}-${month}`])
      .first()

    const seq = String(Number(count?.total || 0) + 1).padStart(4, '0')
    return `MCU/${year}/${month}/${seq}`
  }

  async listRegistrations(
    schema: string,
    filters: {
      status?: string
      tanggal_from?: string
      tanggal_to?: string
      search?: string
      page?: number
      limit?: number
    },
  ) {
    const page = filters.page || 1
    const limit = Math.min(filters.limit || 20, 100)
    const offset = (page - 1) * limit

    let query = this.db
      .withSchema(schema)
      .select(
        'r.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.nik as patient_nik',
        'p.tanggal_lahir as patient_dob',
        'p.jenis_kelamin as patient_gender',
        'pkg.nama as package_nama',
        'pkg.kode as package_kode',
      )
      .from('mcu_registrations as r')
      .join('patients as p', 'p.id', 'r.patient_id')
      .join('mcu_packages as pkg', 'pkg.id', 'r.package_id')

    if (filters.status) {
      query = query.where('r.status', filters.status)
    }
    if (filters.tanggal_from) {
      query = query.where('r.tanggal', '>=', filters.tanggal_from)
    }
    if (filters.tanggal_to) {
      query = query.where('r.tanggal', '<=', filters.tanggal_to)
    }
    if (filters.search) {
      const s = `%${filters.search}%`
      query = query.where((qb) => {
        qb.whereILike('p.nama', s)
          .orWhereILike('p.no_rekam_medis', s)
          .orWhereILike('r.certificate_number', s)
      })
    }

    const countQuery = query.clone().clearSelect().clearOrder().count('r.id as total').first()
    const total = Number((await countQuery)?.total || 0)

    const rows = await query
      .orderBy('r.tanggal', 'desc')
      .orderBy('r.created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getRegistration(schema: string, regId: string) {
    const reg = await this.db
      .withSchema(schema)
      .select(
        'r.*',
        'p.nama as patient_nama',
        'p.no_rekam_medis',
        'p.nik as patient_nik',
        'p.tanggal_lahir as patient_dob',
        'p.jenis_kelamin as patient_gender',
        'p.alamat as patient_alamat',
        'p.no_telepon as patient_phone',
        'p.golongan_darah as patient_blood_type',
        'pkg.nama as package_nama',
        'pkg.kode as package_kode',
        'pkg.harga as package_harga',
      )
      .from('mcu_registrations as r')
      .join('patients as p', 'p.id', 'r.patient_id')
      .join('mcu_packages as pkg', 'pkg.id', 'r.package_id')
      .where('r.id', regId)
      .first()

    if (!reg) return null

    if (reg.doctor_id) {
      const doc = await this.db
        .withSchema(schema)
        .select('d.id', 'u.name as nama', 'd.sip', 'd.spesialisasi')
        .from('doctors as d')
        .join('users as u', 'u.id', 'd.user_id')
        .where('d.id', reg.doctor_id)
        .first()
      reg.doctor = doc || null
    }

    reg.examinations = await this.db
      .withSchema(schema)
      .select('e.*', 'u.name as completed_by_name')
      .from('mcu_examinations as e')
      .leftJoin('users as u', 'u.id', 'e.completed_by')
      .where('e.registration_id', regId)
      .orderBy('e.kategori', 'asc')
      .orderBy('e.created_at', 'asc')

    const totalExams = reg.examinations.length
    const completedExams = reg.examinations.filter((e: Record<string, unknown>) => e.is_completed).length
    reg.progress = { total: totalExams, completed: completedExams, percentage: totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0 }

    return reg
  }

  async startMcu(schema: string, regId: string) {
    await this.db
      .withSchema(schema)
      .table('mcu_registrations')
      .where({ id: regId, status: 'registered' })
      .update({ status: 'in_progress', updated_at: this.db.fn.now() })

    return this.getRegistration(schema, regId)
  }

  async inputExamResult(
    schema: string,
    examId: string,
    data: InputExamResultDTO,
    userId: string,
  ) {
    await this.db
      .withSchema(schema)
      .table('mcu_examinations')
      .where({ id: examId })
      .update({
        hasil: data.hasil || null,
        nilai: data.nilai || null,
        satuan: data.satuan || null,
        nilai_normal: data.nilai_normal || null,
        is_abnormal: data.is_abnormal || false,
        catatan: data.catatan || null,
        is_completed: true,
        completed_at: this.db.fn.now(),
        completed_by: userId,
        updated_at: this.db.fn.now(),
      })

    const exam = await this.db
      .withSchema(schema)
      .select('registration_id')
      .from('mcu_examinations')
      .where({ id: examId })
      .first()

    if (exam) {
      const allExams = await this.db
        .withSchema(schema)
        .select('is_completed')
        .from('mcu_examinations')
        .where({ registration_id: exam.registration_id })

      const allDone = allExams.every((e) => e.is_completed)
      if (allDone) {
        await this.db
          .withSchema(schema)
          .table('mcu_registrations')
          .where({ id: exam.registration_id })
          .update({ status: 'waiting_review', updated_at: this.db.fn.now() })
      } else {
        await this.db
          .withSchema(schema)
          .table('mcu_registrations')
          .where({ id: exam.registration_id, status: 'registered' })
          .update({ status: 'in_progress', updated_at: this.db.fn.now() })
      }
    }

    return this.db
      .withSchema(schema)
      .select('*')
      .from('mcu_examinations')
      .where({ id: examId })
      .first()
  }

  async conclude(
    schema: string,
    regId: string,
    data: ConclusionDTO,
    userId: string,
  ) {
    await this.db
      .withSchema(schema)
      .table('mcu_registrations')
      .where({ id: regId })
      .whereIn('status', ['in_progress', 'waiting_review'])
      .update({
        conclusion: data.conclusion,
        conclusion_notes: data.conclusion_notes || null,
        concluded_at: this.db.fn.now(),
        concluded_by: userId,
        status: 'completed',
        updated_at: this.db.fn.now(),
      })

    return this.getRegistration(schema, regId)
  }

  async cancelMcu(schema: string, regId: string) {
    await this.db
      .withSchema(schema)
      .table('mcu_registrations')
      .where({ id: regId })
      .whereNot('status', 'completed')
      .update({ status: 'cancelled', updated_at: this.db.fn.now() })

    return this.getRegistration(schema, regId)
  }

  async getStats(schema: string) {
    const today = new Date().toISOString().slice(0, 10)

    const [
      totalToday,
      statusCounts,
      conclusionCounts,
      packageCounts,
    ] = await Promise.all([
      this.db
        .withSchema(schema)
        .count('id as total')
        .from('mcu_registrations')
        .where('tanggal', today)
        .first(),

      this.db
        .withSchema(schema)
        .select('status')
        .count('id as count')
        .from('mcu_registrations')
        .groupBy('status'),

      this.db
        .withSchema(schema)
        .select('conclusion')
        .count('id as count')
        .from('mcu_registrations')
        .whereNotNull('conclusion')
        .groupBy('conclusion'),

      this.db
        .withSchema(schema)
        .select('pkg.nama as package_nama')
        .count('r.id as count')
        .from('mcu_registrations as r')
        .join('mcu_packages as pkg', 'pkg.id', 'r.package_id')
        .groupBy('pkg.nama')
        .orderBy('count', 'desc')
        .limit(5),
    ])

    const statusMap: Record<string, number> = {}
    for (const row of statusCounts) {
      statusMap[row.status] = Number(row.count)
    }

    const conclusionMap: Record<string, number> = {}
    for (const row of conclusionCounts) {
      conclusionMap[row.conclusion] = Number(row.count)
    }

    return {
      today: Number(totalToday?.total || 0),
      byStatus: statusMap,
      byConclusion: conclusionMap,
      topPackages: packageCounts.map((r) => ({
        package: r.package_nama,
        count: Number(r.count),
      })),
    }
  }

  async getCertificateData(schema: string, regId: string) {
    const reg = await this.getRegistration(schema, regId)
    if (!reg || reg.status !== 'completed') return null

    const tenant = await this.db
      .select('name', 'address', 'phone', 'email')
      .from('tenants')
      .whereRaw("slug = replace(?, 'tenant_', '')", [schema])
      .first()

    return { registration: reg, tenant }
  }
}
