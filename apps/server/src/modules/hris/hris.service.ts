import type { Knex } from 'knex'
import bcrypt from 'bcryptjs'
import { logger } from '../../shared/logger'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors'

// ─── Types ───────────────────────────────────────────────

interface EmployeeFilters {
  search?: string
  departemen?: string
  jabatan?: string
  status_kepegawaian?: string
  is_active?: boolean
  page?: number
  limit?: number
}

interface ScheduleFilters {
  tanggalMulai: string
  tanggalSelesai: string
  departemen?: string
  employee_id?: string
}

interface AttendanceFilters {
  tanggal?: string
  tanggalMulai?: string
  tanggalSelesai?: string
  employee_id?: string
  departemen?: string
  status?: string
  page?: number
  limit?: number
}

interface LeaveFilters {
  employee_id?: string
  status?: string
  jenis?: string
  page?: number
  limit?: number
}

// ─── Service ─────────────────────────────────────────────

export class HrisService {
  constructor(private db: Knex) {}

  // ═══════════════════════════════════════════════════════
  // EMPLOYEES
  // ═══════════════════════════════════════════════════════

  async listEmployees(filters: EmployeeFilters, tenantSchema: string) {
    const page = filters.page || 1
    const limit = Math.min(filters.limit || 20, 100)
    const offset = (page - 1) * limit

    let query = this.db.withSchema(tenantSchema)
      .select('*')
      .from('employees')
      .whereNull('deleted_at')

    if (filters.search) {
      const s = `%${filters.search}%`
      query = query.where((qb) => {
        qb.whereILike('nama', s)
          .orWhereILike('nip', s)
          .orWhereILike('nik', s)
      })
    }
    if (filters.departemen) query = query.where('departemen', filters.departemen)
    if (filters.jabatan) query = query.where('jabatan', filters.jabatan)
    if (filters.status_kepegawaian) query = query.where('status_kepegawaian', filters.status_kepegawaian)
    if (filters.is_active !== undefined) query = query.where('is_active', filters.is_active)

    const countQuery = query.clone().clearSelect().count('* as total').first()
    const total = Number((await countQuery)?.total || 0)

    const data = await query
      .orderBy('nama', 'asc')
      .limit(limit)
      .offset(offset)

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async getEmployee(id: string, tenantSchema: string) {
    const emp = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('employees')
      .where({ id })
      .whereNull('deleted_at')
      .first()

    if (!emp) throw new NotFoundError('Pegawai')
    return emp
  }

  async createEmployee(data: Record<string, unknown>, tenantSchema: string) {
    // Auto-generate NIP
    const year = new Date().getFullYear()
    const lastEmp = await this.db.withSchema(tenantSchema)
      .select('nip')
      .from('employees')
      .whereRaw("nip LIKE ?", [`RS-${year}-%`])
      .orderBy('nip', 'desc')
      .first()

    let seq = 1
    if (lastEmp) {
      const parts = (lastEmp as { nip: string }).nip.split('-')
      seq = parseInt(parts[2], 10) + 1
    }
    const nip = `RS-${year}-${String(seq).padStart(5, '0')}`

    // Check duplicate NIK if provided
    if (data.nik) {
      const existing = await this.db.withSchema(tenantSchema)
        .select('id')
        .from('employees')
        .where({ nik: data.nik as string })
        .whereNull('deleted_at')
        .first()
      if (existing) throw new ConflictError('Pegawai dengan NIK ini sudah terdaftar')
    }

    const [employee] = await this.db.withSchema(tenantSchema)
      .insert({ ...data, nip })
      .into('employees')
      .returning('*')

    logger.info('Employee created', { nip, tenantSchema })
    return employee
  }

  async updateEmployee(id: string, data: Record<string, unknown>, tenantSchema: string) {
    const existing = await this.getEmployee(id, tenantSchema)

    // Check NIK duplication if changed
    if (data.nik && data.nik !== (existing as Record<string, unknown>).nik) {
      const dup = await this.db.withSchema(tenantSchema)
        .select('id')
        .from('employees')
        .where({ nik: data.nik as string })
        .whereNot({ id })
        .whereNull('deleted_at')
        .first()
      if (dup) throw new ConflictError('NIK sudah digunakan pegawai lain')
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .update(data)
      .from('employees')
      .where({ id })
      .returning('*')

    return updated
  }

  async deleteEmployee(id: string, tenantSchema: string) {
    await this.getEmployee(id, tenantSchema)
    await this.db.withSchema(tenantSchema)
      .update({ deleted_at: new Date(), is_active: false })
      .from('employees')
      .where({ id })
  }

  // ── User ↔ Employee Linking ────────────────────────────

  async getUnlinkedUsers(tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('id', 'name', 'email', 'role')
      .from('users')
      .whereNull('deleted_at')
      .where('is_active', true)
      .whereNotIn('id',
        this.db.withSchema(tenantSchema)
          .select('user_id')
          .from('employees')
          .whereNotNull('user_id')
          .whereNull('deleted_at'),
      )
      .orderBy('name', 'asc')
  }

  async createUserForEmployee(
    employeeId: string,
    password: string,
    role: string,
    tenantSchema: string,
  ) {
    const emp = await this.getEmployee(employeeId, tenantSchema) as Record<string, unknown>

    if (!emp.email) throw new ValidationError('Email pegawai harus diisi untuk membuat akun')
    if (emp.user_id) throw new ConflictError('Pegawai sudah memiliki akun login')

    const existing = await this.db.withSchema(tenantSchema)
      .select('id').from('users')
      .where({ email: emp.email as string })
      .whereNull('deleted_at').first()
    if (existing) throw new ConflictError('Email sudah terdaftar sebagai akun lain')

    const passwordHash = await bcrypt.hash(password, 12)

    const [user] = await this.db.withSchema(tenantSchema)
      .insert({
        name: emp.nama as string,
        email: emp.email as string,
        password_hash: passwordHash,
        role,
        is_active: true,
      })
      .into('users')
      .returning(['id', 'name', 'email', 'role'])

    await this.db.withSchema(tenantSchema)
      .from('employees').where({ id: employeeId })
      .update({ user_id: user.id })

    logger.info('User account created for employee', { employeeId, userId: user.id })
    return user
  }

  async linkUserToEmployee(employeeId: string, userId: string, tenantSchema: string) {
    await this.getEmployee(employeeId, tenantSchema)

    const user = await this.db.withSchema(tenantSchema)
      .select('id').from('users').where({ id: userId }).whereNull('deleted_at').first()
    if (!user) throw new NotFoundError('User')

    const linked = await this.db.withSchema(tenantSchema)
      .select('id', 'nama').from('employees')
      .where({ user_id: userId }).whereNull('deleted_at').first() as { id: string; nama: string } | undefined
    if (linked) throw new ConflictError(`User sudah terhubung dengan pegawai ${linked.nama}`)

    await this.db.withSchema(tenantSchema)
      .from('employees').where({ id: employeeId })
      .update({ user_id: userId })

    return this.getEmployee(employeeId, tenantSchema)
  }

  async unlinkUserFromEmployee(employeeId: string, tenantSchema: string) {
    await this.getEmployee(employeeId, tenantSchema)

    await this.db.withSchema(tenantSchema)
      .from('employees').where({ id: employeeId })
      .update({ user_id: null })

    return this.getEmployee(employeeId, tenantSchema)
  }

  async getEmployeeStats(tenantSchema: string) {
    const base = this.db.withSchema(tenantSchema).from('employees').whereNull('deleted_at')

    const total = Number((await base.clone().count('* as cnt').first())?.cnt || 0)
    const active = Number(
      (await base.clone().where('is_active', true).count('* as cnt').first())?.cnt || 0,
    )

    const byStatus = await base.clone()
      .select('status_kepegawaian')
      .count('* as jumlah')
      .groupBy('status_kepegawaian')

    const byDepartemen = await base.clone()
      .select('departemen')
      .count('* as jumlah')
      .where('is_active', true)
      .groupBy('departemen')
      .orderByRaw('count(*) DESC')
      .limit(10)

    return { total, active, byStatus, byDepartemen }
  }

  // ═══════════════════════════════════════════════════════
  // DEPARTMENTS
  // ═══════════════════════════════════════════════════════

  async listDepartments(tenantSchema: string) {
    const depts = await this.db.withSchema(tenantSchema)
      .select('departments.*')
      .from('departments')
      .where('departments.is_active', true)
      .orderBy('departments.nama', 'asc')

    // Count employees per dept
    const counts = await this.db.withSchema(tenantSchema)
      .select('departemen')
      .count('* as jumlah')
      .from('employees')
      .whereNull('deleted_at')
      .where('is_active', true)
      .groupBy('departemen')

    const countMap = new Map<string, number>()
    for (const c of counts) {
      countMap.set((c as Record<string, unknown>).departemen as string, Number((c as Record<string, unknown>).jumlah))
    }

    return depts.map((d: Record<string, unknown>) => ({
      ...d,
      jumlah_pegawai: countMap.get(d.nama as string) || 0,
    }))
  }

  async createDepartment(data: Record<string, unknown>, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('departments')
      .where({ kode: data.kode as string })
      .first()
    if (existing) throw new ConflictError('Kode departemen sudah digunakan')

    const [dept] = await this.db.withSchema(tenantSchema)
      .insert(data)
      .into('departments')
      .returning('*')
    return dept
  }

  async updateDepartment(id: string, data: Record<string, unknown>, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('departments')
      .where({ id })
      .first()
    if (!existing) throw new NotFoundError('Departemen')

    if (data.kode) {
      const dup = await this.db.withSchema(tenantSchema)
        .select('id')
        .from('departments')
        .where({ kode: data.kode as string })
        .whereNot({ id })
        .first()
      if (dup) throw new ConflictError('Kode departemen sudah digunakan')
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .update(data)
      .from('departments')
      .where({ id })
      .returning('*')
    return updated
  }

  async deleteDepartment(id: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('departments')
      .where({ id })
      .first()
    if (!existing) throw new NotFoundError('Departemen')

    await this.db.withSchema(tenantSchema)
      .update({ is_active: false })
      .from('departments')
      .where({ id })
  }

  // ═══════════════════════════════════════════════════════
  // SHIFT TEMPLATES
  // ═══════════════════════════════════════════════════════

  async listShiftTemplates(tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('*')
      .from('shift_templates')
      .where('is_active', true)
      .orderByRaw("CASE WHEN kode = 'OFF' THEN 1 ELSE 0 END, jam_mulai ASC")
  }

  async createShiftTemplate(data: Record<string, unknown>, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('shift_templates')
      .where({ kode: data.kode as string })
      .first()
    if (existing) throw new ConflictError('Kode shift sudah digunakan')

    const [shift] = await this.db.withSchema(tenantSchema)
      .insert(data)
      .into('shift_templates')
      .returning('*')
    return shift
  }

  async updateShiftTemplate(id: string, data: Record<string, unknown>, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('shift_templates')
      .where({ id })
      .first()
    if (!existing) throw new NotFoundError('Shift template')

    const [updated] = await this.db.withSchema(tenantSchema)
      .update(data)
      .from('shift_templates')
      .where({ id })
      .returning('*')
    return updated
  }

  async deleteShiftTemplate(id: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('shift_templates')
      .where({ id })
      .first()
    if (!existing) throw new NotFoundError('Shift template')

    await this.db.withSchema(tenantSchema)
      .update({ is_active: false })
      .from('shift_templates')
      .where({ id })
  }

  // ═══════════════════════════════════════════════════════
  // SHIFT SCHEDULING
  // ═══════════════════════════════════════════════════════

  async getShiftSchedule(filters: ScheduleFilters, tenantSchema: string) {
    let empQuery = this.db.withSchema(tenantSchema)
      .select('id', 'nama', 'jabatan', 'departemen')
      .from('employees')
      .whereNull('deleted_at')
      .where('is_active', true)
      .orderBy('nama', 'asc')

    if (filters.departemen) empQuery = empQuery.where('departemen', filters.departemen)
    if (filters.employee_id) empQuery = empQuery.where('id', filters.employee_id)

    const employees = await empQuery

    const assignments = await this.db.withSchema(tenantSchema)
      .select(
        'shift_assignments.*',
        'shift_templates.nama as shift_nama',
        'shift_templates.kode as shift_kode',
        'shift_templates.warna as shift_warna',
      )
      .from('shift_assignments')
      .join('shift_templates', 'shift_assignments.shift_id', 'shift_templates.id')
      .whereBetween('shift_assignments.tanggal', [filters.tanggalMulai, filters.tanggalSelesai])
      .whereIn(
        'shift_assignments.employee_id',
        employees.map((e: Record<string, unknown>) => e.id as string),
      )

    // Build map: employee_id → { date → assignment }
    const assignMap = new Map<string, Map<string, unknown>>()
    for (const a of assignments as Record<string, unknown>[]) {
      const empId = a.employee_id as string
      if (!assignMap.has(empId)) assignMap.set(empId, new Map())
      const dateStr = typeof a.tanggal === 'string'
        ? a.tanggal
        : new Date(a.tanggal as string).toISOString().split('T')[0]
      assignMap.get(empId)!.set(dateStr, a)
    }

    return {
      employees,
      assignments: Object.fromEntries(
        Array.from(assignMap.entries()).map(([empId, dateMap]) => [
          empId,
          Object.fromEntries(dateMap),
        ]),
      ),
    }
  }

  async assignShift(
    data: { employee_id: string; shift_id: string; tanggal: string; catatan?: string },
    userId: string | undefined,
    tenantSchema: string,
  ) {
    // Upsert: if already assigned for that day, replace
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('shift_assignments')
      .where({ employee_id: data.employee_id, tanggal: data.tanggal })
      .first()

    if (existing) {
      const [updated] = await this.db.withSchema(tenantSchema)
        .update({
          shift_id: data.shift_id,
          catatan: data.catatan || null,
          assigned_by: userId || null,
        })
        .from('shift_assignments')
        .where({ id: (existing as Record<string, unknown>).id })
        .returning('*')
      return updated
    }

    const [created] = await this.db.withSchema(tenantSchema)
      .insert({
        employee_id: data.employee_id,
        shift_id: data.shift_id,
        tanggal: data.tanggal,
        catatan: data.catatan || null,
        assigned_by: userId || null,
      })
      .into('shift_assignments')
      .returning('*')
    return created
  }

  async removeShiftAssignment(id: string, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('shift_assignments')
      .where({ id })
      .first()
    if (!existing) throw new NotFoundError('Jadwal dinas')

    await this.db.withSchema(tenantSchema)
      .delete()
      .from('shift_assignments')
      .where({ id })
  }

  async bulkAssignShifts(
    data: { employee_ids: string[]; shift_id: string; tanggal_mulai: string; tanggal_selesai: string },
    userId: string | undefined,
    tenantSchema: string,
  ) {
    const start = new Date(data.tanggal_mulai)
    const end = new Date(data.tanggal_selesai)
    let count = 0

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      for (const empId of data.employee_ids) {
        await this.assignShift(
          { employee_id: empId, shift_id: data.shift_id, tanggal: dateStr },
          userId,
          tenantSchema,
        )
        count++
      }
    }
    return { assigned: count }
  }

  // ═══════════════════════════════════════════════════════
  // ATTENDANCE
  // ═══════════════════════════════════════════════════════

  async listAttendance(filters: AttendanceFilters, tenantSchema: string) {
    const page = filters.page || 1
    const limit = Math.min(filters.limit || 20, 100)
    const offset = (page - 1) * limit

    let query = this.db.withSchema(tenantSchema)
      .select(
        'attendance_records.*',
        'employees.nama as employee_nama',
        'employees.nip as employee_nip',
        'employees.departemen as employee_departemen',
        'shift_templates.nama as shift_nama',
        'shift_templates.kode as shift_kode',
      )
      .from('attendance_records')
      .join('employees', 'attendance_records.employee_id', 'employees.id')
      .leftJoin('shift_templates', 'attendance_records.shift_id', 'shift_templates.id')

    if (filters.tanggal) {
      query = query.where('attendance_records.tanggal', filters.tanggal)
    } else if (filters.tanggalMulai && filters.tanggalSelesai) {
      query = query.whereBetween('attendance_records.tanggal', [filters.tanggalMulai, filters.tanggalSelesai])
    }
    if (filters.employee_id) query = query.where('attendance_records.employee_id', filters.employee_id)
    if (filters.departemen) query = query.where('employees.departemen', filters.departemen)
    if (filters.status) query = query.where('attendance_records.status', filters.status)

    const countQuery = query.clone().clearSelect().clearOrder().count('attendance_records.id as total').first()
    const total = Number((await countQuery)?.total || 0)

    const data = await query
      .orderBy('employees.nama', 'asc')
      .limit(limit)
      .offset(offset)

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async recordAttendance(
    data: {
      employee_id: string
      tanggal: string
      jam_masuk?: string
      jam_keluar?: string
      status?: string
      keterangan?: string
      shift_id?: string
    },
    tenantSchema: string,
  ) {
    const status = data.status || 'hadir'

    // Get shift for lateness calc
    let terlambatMenit = 0
    let lemburMenit = 0
    let shiftId = data.shift_id

    if (!shiftId) {
      // Try to find assigned shift for this date
      const assigned = await this.db.withSchema(tenantSchema)
        .select('shift_id')
        .from('shift_assignments')
        .where({ employee_id: data.employee_id, tanggal: data.tanggal })
        .first()
      if (assigned) shiftId = (assigned as Record<string, unknown>).shift_id as string
    }

    if (shiftId && data.jam_masuk && status === 'hadir') {
      const shift = await this.db.withSchema(tenantSchema)
        .select('jam_mulai', 'jam_selesai')
        .from('shift_templates')
        .where({ id: shiftId })
        .first()

      if (shift) {
        const shiftStart = (shift as Record<string, unknown>).jam_mulai as string
        const shiftEnd = (shift as Record<string, unknown>).jam_selesai as string
        const clockIn = new Date(data.jam_masuk)
        const clockInTime = `${String(clockIn.getHours()).padStart(2, '0')}:${String(clockIn.getMinutes()).padStart(2, '0')}`

        // Lateness
        if (clockInTime > shiftStart) {
          const [sh, sm] = shiftStart.split(':').map(Number)
          const [ch, cm] = clockInTime.split(':').map(Number)
          terlambatMenit = Math.max(0, (ch * 60 + cm) - (sh * 60 + sm))
        }

        // Overtime
        if (data.jam_keluar) {
          const clockOut = new Date(data.jam_keluar)
          const clockOutTime = `${String(clockOut.getHours()).padStart(2, '0')}:${String(clockOut.getMinutes()).padStart(2, '0')}`

          let endMinutes: number
          let outMinutes: number
          const [eh, em] = shiftEnd.split(':').map(Number)
          const [oh, om] = clockOutTime.split(':').map(Number)
          endMinutes = eh * 60 + em
          outMinutes = oh * 60 + om

          // Handle overnight shifts
          if (endMinutes < (Number(shiftStart.split(':')[0]) * 60)) {
            endMinutes += 24 * 60
          }
          if (outMinutes < endMinutes - 12 * 60) {
            outMinutes += 24 * 60
          }

          if (outMinutes > endMinutes + 30) {
            lemburMenit = outMinutes - endMinutes
          }
        }
      }
    }

    // Upsert
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('attendance_records')
      .where({ employee_id: data.employee_id, tanggal: data.tanggal })
      .first()

    const record = {
      employee_id: data.employee_id,
      tanggal: data.tanggal,
      jam_masuk: data.jam_masuk || null,
      jam_keluar: data.jam_keluar || null,
      status,
      keterangan: data.keterangan || null,
      shift_id: shiftId || null,
      terlambat_menit: terlambatMenit,
      lembur_menit: lemburMenit,
    }

    if (existing) {
      const [updated] = await this.db.withSchema(tenantSchema)
        .update(record)
        .from('attendance_records')
        .where({ id: (existing as Record<string, unknown>).id })
        .returning('*')
      return updated
    }

    const [created] = await this.db.withSchema(tenantSchema)
      .insert(record)
      .into('attendance_records')
      .returning('*')
    return created
  }

  async updateAttendance(id: string, data: Record<string, unknown>, tenantSchema: string) {
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('attendance_records')
      .where({ id })
      .first()
    if (!existing) throw new NotFoundError('Data absensi')

    const [updated] = await this.db.withSchema(tenantSchema)
      .update(data)
      .from('attendance_records')
      .where({ id })
      .returning('*')
    return updated
  }

  async getAttendanceSummary(bulan: number, tahun: number, tenantSchema: string) {
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = new Date(tahun, bulan, 0).toISOString().split('T')[0]

    const employees = await this.db.withSchema(tenantSchema)
      .select('id', 'nama', 'nip', 'departemen')
      .from('employees')
      .whereNull('deleted_at')
      .where('is_active', true)
      .orderBy('nama', 'asc')

    const attendance = await this.db.withSchema(tenantSchema)
      .select('employee_id', 'status')
      .count('* as jumlah')
      .from('attendance_records')
      .whereBetween('tanggal', [startDate, endDate])
      .groupBy('employee_id', 'status')

    const lateOT = await this.db.withSchema(tenantSchema)
      .select('employee_id')
      .sum('terlambat_menit as total_terlambat')
      .sum('lembur_menit as total_lembur')
      .from('attendance_records')
      .whereBetween('tanggal', [startDate, endDate])
      .groupBy('employee_id')

    // Build summary per employee
    const attMap = new Map<string, Record<string, number>>()
    for (const a of attendance as Record<string, unknown>[]) {
      const empId = a.employee_id as string
      if (!attMap.has(empId)) attMap.set(empId, {})
      attMap.get(empId)![a.status as string] = Number(a.jumlah)
    }

    const lateMap = new Map<string, { terlambat: number; lembur: number }>()
    for (const l of lateOT as Record<string, unknown>[]) {
      lateMap.set(l.employee_id as string, {
        terlambat: Number(l.total_terlambat || 0),
        lembur: Number(l.total_lembur || 0),
      })
    }

    return employees.map((e: Record<string, unknown>) => {
      const empId = e.id as string
      const statusCounts = attMap.get(empId) || {}
      const lt = lateMap.get(empId) || { terlambat: 0, lembur: 0 }
      return {
        id: empId,
        nama: e.nama,
        nip: e.nip,
        departemen: e.departemen,
        hadir: statusCounts.hadir || 0,
        izin: statusCounts.izin || 0,
        sakit: statusCounts.sakit || 0,
        cuti: statusCounts.cuti || 0,
        alpha: statusCounts.alpha || 0,
        libur: statusCounts.libur || 0,
        dinas_luar: statusCounts.dinas_luar || 0,
        total_terlambat_menit: lt.terlambat,
        total_lembur_menit: lt.lembur,
      }
    })
  }

  async bulkRecordAttendance(
    data: { employee_ids: string[]; tanggal: string; status: string; keterangan?: string },
    tenantSchema: string,
  ) {
    let count = 0
    for (const empId of data.employee_ids) {
      await this.recordAttendance(
        {
          employee_id: empId,
          tanggal: data.tanggal,
          status: data.status,
          keterangan: data.keterangan,
          jam_masuk: data.status === 'hadir' ? new Date().toISOString() : undefined,
        },
        tenantSchema,
      )
      count++
    }
    return { recorded: count }
  }

  // ═══════════════════════════════════════════════════════
  // LEAVE REQUESTS
  // ═══════════════════════════════════════════════════════

  async listLeaveRequests(filters: LeaveFilters, tenantSchema: string) {
    const page = filters.page || 1
    const limit = Math.min(filters.limit || 20, 100)
    const offset = (page - 1) * limit

    let query = this.db.withSchema(tenantSchema)
      .select(
        'leave_requests.*',
        'employees.nama as employee_nama',
        'employees.nip as employee_nip',
        'employees.departemen as employee_departemen',
      )
      .from('leave_requests')
      .join('employees', 'leave_requests.employee_id', 'employees.id')

    if (filters.employee_id) query = query.where('leave_requests.employee_id', filters.employee_id)
    if (filters.status) query = query.where('leave_requests.status', filters.status)
    if (filters.jenis) query = query.where('leave_requests.jenis', filters.jenis)

    const countQuery = query.clone().clearSelect().clearOrder().count('leave_requests.id as total').first()
    const total = Number((await countQuery)?.total || 0)

    const data = await query
      .orderBy('leave_requests.created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async createLeaveRequest(data: Record<string, unknown>, tenantSchema: string) {
    const empId = data.employee_id as string
    const start = data.tanggal_mulai as string
    const end = data.tanggal_selesai as string

    // Check overlapping leave
    const overlap = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('leave_requests')
      .where('employee_id', empId)
      .whereIn('status', ['pending', 'approved'])
      .where(function () {
        this.where('tanggal_mulai', '<=', end)
          .andWhere('tanggal_selesai', '>=', start)
      })
      .first()
    if (overlap) throw new ConflictError('Terdapat pengajuan cuti/izin yang tumpang tindih')

    // Check cuti_tahunan balance if type is cuti_tahunan
    if (data.jenis === 'cuti_tahunan') {
      const tahun = new Date(start).getFullYear()
      const balance = await this.getLeaveBalance(empId, tahun, tenantSchema)
      const days = Number(data.jumlah_hari)
      if (days > balance.sisa) {
        throw new ValidationError(`Sisa cuti tahunan tidak mencukupi (sisa: ${balance.sisa} hari)`)
      }
    }

    const [leave] = await this.db.withSchema(tenantSchema)
      .insert(data)
      .into('leave_requests')
      .returning('*')
    return leave
  }

  async approveLeave(id: string, userId: string, tenantSchema: string) {
    const leave = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('leave_requests')
      .where({ id })
      .first() as Record<string, unknown> | undefined

    if (!leave) throw new NotFoundError('Pengajuan cuti')
    if (leave.status !== 'pending') throw new ValidationError('Hanya pengajuan pending yang bisa disetujui')

    const [updated] = await this.db.withSchema(tenantSchema)
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date(),
      })
      .from('leave_requests')
      .where({ id })
      .returning('*')

    // Auto-create attendance records for the leave period
    const statusMap: Record<string, string> = {
      cuti_tahunan: 'cuti',
      cuti_sakit: 'sakit',
      cuti_melahirkan: 'cuti',
      cuti_besar: 'cuti',
      izin_khusus: 'izin',
    }
    const attStatus = statusMap[leave.jenis as string] || 'izin'
    const start = new Date(leave.tanggal_mulai as string)
    const end = new Date(leave.tanggal_selesai as string)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const day = d.getDay()
      // Skip weekends (Sat=6, Sun=0) for attendance records
      if (day === 0 || day === 6) continue

      await this.recordAttendance(
        {
          employee_id: leave.employee_id as string,
          tanggal: dateStr,
          status: attStatus,
          keterangan: `${leave.jenis}: ${leave.alasan}`,
        },
        tenantSchema,
      )
    }

    logger.info('Leave approved', { leaveId: id, userId })
    return updated
  }

  async rejectLeave(id: string, reason: string, userId: string, tenantSchema: string) {
    const leave = await this.db.withSchema(tenantSchema)
      .select('status')
      .from('leave_requests')
      .where({ id })
      .first() as Record<string, unknown> | undefined

    if (!leave) throw new NotFoundError('Pengajuan cuti')
    if (leave.status !== 'pending') throw new ValidationError('Hanya pengajuan pending yang bisa ditolak')

    const [updated] = await this.db.withSchema(tenantSchema)
      .update({
        status: 'rejected',
        approved_by: userId,
        approved_at: new Date(),
        rejected_reason: reason,
      })
      .from('leave_requests')
      .where({ id })
      .returning('*')
    return updated
  }

  async cancelLeave(id: string, tenantSchema: string) {
    const leave = await this.db.withSchema(tenantSchema)
      .select('status')
      .from('leave_requests')
      .where({ id })
      .first() as Record<string, unknown> | undefined

    if (!leave) throw new NotFoundError('Pengajuan cuti')
    if (!['pending', 'approved'].includes(leave.status as string)) {
      throw new ValidationError('Pengajuan ini tidak bisa dibatalkan')
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .update({ status: 'cancelled' })
      .from('leave_requests')
      .where({ id })
      .returning('*')
    return updated
  }

  async getLeaveBalance(employeeId: string, tahun: number, tenantSchema: string) {
    const JATAH_TAHUNAN = 12

    const used = await this.db.withSchema(tenantSchema)
      .sum('jumlah_hari as total')
      .from('leave_requests')
      .where({
        employee_id: employeeId,
        jenis: 'cuti_tahunan',
        status: 'approved',
      })
      .whereRaw("EXTRACT(YEAR FROM tanggal_mulai) = ?", [tahun])
      .first()

    const terpakai = Number((used as Record<string, unknown>)?.total || 0)
    return {
      jatah_tahunan: JATAH_TAHUNAN,
      terpakai,
      sisa: JATAH_TAHUNAN - terpakai,
    }
  }

  // ═══════════════════════════════════════════════════════
  // PAYROLL
  // ═══════════════════════════════════════════════════════

  async listPayrollPeriods(tenantSchema: string) {
    return this.db.withSchema(tenantSchema)
      .select('*')
      .from('payroll_periods')
      .orderByRaw('tahun DESC, bulan DESC')
  }

  async getPayrollPeriod(id: string, tenantSchema: string) {
    const period = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('payroll_periods')
      .where({ id })
      .first()

    if (!period) throw new NotFoundError('Periode penggajian')

    const items = await this.db.withSchema(tenantSchema)
      .select(
        'payroll_items.*',
        'employees.nama as employee_nama',
        'employees.nip as employee_nip',
        'employees.jabatan as employee_jabatan',
        'employees.departemen as employee_departemen',
      )
      .from('payroll_items')
      .join('employees', 'payroll_items.employee_id', 'employees.id')
      .where('payroll_items.payroll_period_id', id)
      .orderBy('employees.nama', 'asc')

    return { ...period, items }
  }

  async createPayrollPeriod(bulan: number, tahun: number, tenantSchema: string) {
    // Check duplicate
    const existing = await this.db.withSchema(tenantSchema)
      .select('id')
      .from('payroll_periods')
      .where({ bulan, tahun })
      .first()
    if (existing) throw new ConflictError(`Periode ${bulan}/${tahun} sudah ada`)

    // Get active employees
    const employees = await this.db.withSchema(tenantSchema)
      .select('id', 'gaji_pokok', 'tunjangan_tetap', 'tunjangan_fungsional')
      .from('employees')
      .whereNull('deleted_at')
      .where('is_active', true)

    const [period] = await this.db.withSchema(tenantSchema)
      .insert({
        bulan,
        tahun,
        status: 'draft',
        jumlah_pegawai: employees.length,
      })
      .into('payroll_periods')
      .returning('*')

    // Generate payroll items
    const items = employees.map((e: Record<string, unknown>) => ({
      payroll_period_id: (period as Record<string, unknown>).id,
      employee_id: e.id,
      gaji_pokok: e.gaji_pokok || 0,
      tunjangan_tetap: e.tunjangan_tetap || 0,
      tunjangan_fungsional: e.tunjangan_fungsional || 0,
    }))

    if (items.length > 0) {
      await this.db.withSchema(tenantSchema).insert(items).into('payroll_items')
    }

    logger.info('Payroll period created', { bulan, tahun, employees: items.length })
    return period
  }

  async processPayroll(periodId: string, userId: string, tenantSchema: string) {
    const period = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('payroll_periods')
      .where({ id: periodId })
      .first() as Record<string, unknown> | undefined

    if (!period) throw new NotFoundError('Periode penggajian')
    if (period.status === 'finalized' || period.status === 'paid') {
      throw new ValidationError('Periode ini sudah difinalisasi')
    }

    const bulan = period.bulan as number
    const tahun = period.tahun as number
    const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
    const endDate = new Date(tahun, bulan, 0).toISOString().split('T')[0]

    // Attendance summary for the month
    const attSummary = await this.getAttendanceSummary(bulan, tahun, tenantSchema)
    const attMap = new Map<string, Record<string, number>>()
    for (const a of attSummary) {
      attMap.set(a.id, a as unknown as Record<string, number>)
    }

    // Get payroll items
    const items = await this.db.withSchema(tenantSchema)
      .select('payroll_items.*', 'employees.user_id')
      .from('payroll_items')
      .join('employees', 'payroll_items.employee_id', 'employees.id')
      .where('payroll_items.payroll_period_id', periodId)

    let totalGajiPokok = 0
    let totalTunjangan = 0
    let totalPotongan = 0
    let totalBersih = 0

    for (const item of items as Record<string, unknown>[]) {
      const empId = item.employee_id as string
      const att = attMap.get(empId)
      const gajiPokok = Number(item.gaji_pokok || 0)
      const tunjanganTetap = Number(item.tunjangan_tetap || 0)
      const tunjanganFungsional = Number(item.tunjangan_fungsional || 0)

      // Attendance-based
      const hariHadir = att?.hadir || 0
      const hariSakit = att?.sakit || 0
      const hariIzin = att?.izin || 0
      const hariAlpha = att?.alpha || 0
      const totalLemburMenit = att?.total_lembur_menit || 0
      const jamLembur = Math.round((totalLemburMenit / 60) * 10) / 10

      // Working days in the month (approximate: exclude weekends)
      let hariKerja = 0
      for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
        const day = d.getDay()
        if (day !== 0 && day !== 6) hariKerja++
      }

      // Tunjangan kehadiran: Rp 50.000/hari hadir
      const tunjanganKehadiran = hariHadir * 50000

      // Tunjangan lembur: (gajiPokok / 173) * multiplier
      // First 1h = 1.5x, subsequent = 2x
      let tunjanganLembur = 0
      if (jamLembur > 0) {
        const ratePerHour = gajiPokok / 173
        const firstHour = Math.min(jamLembur, 1) * ratePerHour * 1.5
        const restHours = Math.max(jamLembur - 1, 0) * ratePerHour * 2
        tunjanganLembur = Math.round(firstHour + restHours)
      }

      // Jasa medis for doctors
      let jasaMedis = 0
      if (item.user_id) {
        // Check if user is a doctor
        const doctor = await this.db.withSchema(tenantSchema)
          .select('id')
          .from('doctors')
          .where({ user_id: item.user_id as string })
          .first()

        if (doctor) {
          const feeSum = await this.db.withSchema(tenantSchema)
            .sum('jumlah_dokter as total')
            .from('doctor_fee_transactions')
            .where('doctor_id', (doctor as Record<string, unknown>).id)
            .whereRaw(`created_at >= ? AND created_at < ?`, [
              `${startDate}T00:00:00`,
              new Date(tahun, bulan, 1).toISOString(),
            ])
            .first()
          jasaMedis = Number((feeSum as Record<string, unknown>)?.total || 0)
        }
      }

      const tunjanganLain = Number(item.tunjangan_lain || 0)
      const totalPendapatan = gajiPokok + tunjanganTetap + tunjanganFungsional
        + tunjanganKehadiran + tunjanganLembur + tunjanganLain + jasaMedis

      // Deductions
      const bpjsKesehatan = Math.round(gajiPokok * 0.01)
      const bpjsTK = Math.round(gajiPokok * 0.02)

      // PPH21 simplified
      const ptkpMonthly = 4500000
      const taxable = Math.max(0, totalPendapatan - bpjsKesehatan - bpjsTK - ptkpMonthly)
      let pph21 = 0
      if (taxable > 0) {
        // Monthly brackets (annual / 12)
        const bracket1 = 60000000 / 12  // 5M/month
        const bracket2 = 250000000 / 12 // ~20.8M
        const bracket3 = 500000000 / 12 // ~41.7M

        if (taxable <= bracket1) {
          pph21 = taxable * 0.05
        } else if (taxable <= bracket2) {
          pph21 = bracket1 * 0.05 + (taxable - bracket1) * 0.15
        } else if (taxable <= bracket3) {
          pph21 = bracket1 * 0.05 + (bracket2 - bracket1) * 0.15 + (taxable - bracket2) * 0.25
        } else {
          pph21 = bracket1 * 0.05 + (bracket2 - bracket1) * 0.15
            + (bracket3 - bracket2) * 0.25 + (taxable - bracket3) * 0.30
        }
        pph21 = Math.round(pph21)
      }

      const potonganLain = Number(item.potongan_lain || 0)
      const totalPotonganItem = bpjsKesehatan + bpjsTK + pph21 + potonganLain
      const gajiBersih = totalPendapatan - totalPotonganItem

      await this.db.withSchema(tenantSchema)
        .update({
          tunjangan_kehadiran: tunjanganKehadiran,
          tunjangan_lembur: tunjanganLembur,
          jasa_medis: jasaMedis,
          total_pendapatan: totalPendapatan,
          potongan_bpjs_kesehatan: bpjsKesehatan,
          potongan_bpjs_tk: bpjsTK,
          potongan_pph21: pph21,
          total_potongan: totalPotonganItem,
          gaji_bersih: gajiBersih,
          hari_kerja: hariKerja,
          hari_hadir: hariHadir,
          hari_sakit: hariSakit,
          hari_izin: hariIzin,
          hari_alpha: hariAlpha,
          jam_lembur: jamLembur,
        })
        .from('payroll_items')
        .where({ id: item.id })

      totalGajiPokok += gajiPokok
      totalTunjangan += tunjanganTetap + tunjanganFungsional + tunjanganKehadiran + tunjanganLembur + tunjanganLain + jasaMedis
      totalPotongan += totalPotonganItem
      totalBersih += gajiBersih
    }

    // Update period
    const [updated] = await this.db.withSchema(tenantSchema)
      .update({
        status: 'processing',
        tanggal_proses: new Date(),
        processed_by: userId,
        total_gaji_pokok: totalGajiPokok,
        total_tunjangan: totalTunjangan,
        total_potongan: totalPotongan,
        total_bersih: totalBersih,
      })
      .from('payroll_periods')
      .where({ id: periodId })
      .returning('*')

    logger.info('Payroll processed', { periodId, totalBersih })
    return updated
  }

  async finalizePayroll(periodId: string, userId: string, tenantSchema: string) {
    const period = await this.db.withSchema(tenantSchema)
      .select('status')
      .from('payroll_periods')
      .where({ id: periodId })
      .first() as Record<string, unknown> | undefined

    if (!period) throw new NotFoundError('Periode penggajian')
    if (period.status === 'finalized' || period.status === 'paid') {
      throw new ValidationError('Periode sudah difinalisasi')
    }
    if (period.status === 'draft') {
      throw new ValidationError('Proses penggajian terlebih dahulu sebelum finalisasi')
    }

    const [updated] = await this.db.withSchema(tenantSchema)
      .update({
        status: 'finalized',
        finalized_by: userId,
      })
      .from('payroll_periods')
      .where({ id: periodId })
      .returning('*')

    logger.info('Payroll finalized', { periodId, userId })
    return updated
  }

  async updatePayrollItem(itemId: string, data: Record<string, unknown>, tenantSchema: string) {
    // Check if period is finalized
    const item = await this.db.withSchema(tenantSchema)
      .select('payroll_items.id', 'payroll_periods.status')
      .from('payroll_items')
      .join('payroll_periods', 'payroll_items.payroll_period_id', 'payroll_periods.id')
      .where('payroll_items.id', itemId)
      .first() as Record<string, unknown> | undefined

    if (!item) throw new NotFoundError('Item penggajian')
    if (item.status === 'finalized' || item.status === 'paid') {
      throw new ValidationError('Tidak bisa mengubah item dari periode yang sudah difinalisasi')
    }

    // Recalculate totals
    const current = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('payroll_items')
      .where({ id: itemId })
      .first() as Record<string, unknown>

    const merged = { ...current, ...data }
    const totalPendapatan = Number(merged.gaji_pokok || 0)
      + Number(merged.tunjangan_tetap || 0)
      + Number(merged.tunjangan_fungsional || 0)
      + Number(merged.tunjangan_kehadiran || 0)
      + Number(merged.tunjangan_lembur || 0)
      + Number(merged.tunjangan_lain || 0)
      + Number(merged.jasa_medis || 0)

    const totalPotonganItem = Number(merged.potongan_bpjs_kesehatan || 0)
      + Number(merged.potongan_bpjs_tk || 0)
      + Number(merged.potongan_pph21 || 0)
      + Number(merged.potongan_lain || 0)

    const gajiBersih = totalPendapatan - totalPotonganItem

    const [updated] = await this.db.withSchema(tenantSchema)
      .update({
        ...data,
        total_pendapatan: totalPendapatan,
        total_potongan: totalPotonganItem,
        gaji_bersih: gajiBersih,
      })
      .from('payroll_items')
      .where({ id: itemId })
      .returning('*')

    return updated
  }

  async getPayrollSummary(periodId: string, tenantSchema: string) {
    const period = await this.db.withSchema(tenantSchema)
      .select('*')
      .from('payroll_periods')
      .where({ id: periodId })
      .first()
    if (!period) throw new NotFoundError('Periode penggajian')

    const agg = await this.db.withSchema(tenantSchema)
      .sum('gaji_pokok as total_gaji_pokok')
      .sum('tunjangan_tetap as total_tunjangan_tetap')
      .sum('tunjangan_fungsional as total_tunjangan_fungsional')
      .sum('tunjangan_kehadiran as total_tunjangan_kehadiran')
      .sum('tunjangan_lembur as total_tunjangan_lembur')
      .sum('tunjangan_lain as total_tunjangan_lain')
      .sum('jasa_medis as total_jasa_medis')
      .sum('total_pendapatan as total_pendapatan')
      .sum('potongan_bpjs_kesehatan as total_bpjs_kesehatan')
      .sum('potongan_bpjs_tk as total_bpjs_tk')
      .sum('potongan_pph21 as total_pph21')
      .sum('potongan_lain as total_potongan_lain')
      .sum('total_potongan as total_potongan')
      .sum('gaji_bersih as total_gaji_bersih')
      .from('payroll_items')
      .where('payroll_period_id', periodId)
      .first()

    return { period, summary: agg }
  }

  async getSlipGaji(itemId: string, tenantSchema: string) {
    const item = await this.db.withSchema(tenantSchema)
      .select(
        'payroll_items.*',
        'employees.nama',
        'employees.nip',
        'employees.jabatan',
        'employees.departemen',
        'employees.nomor_rekening',
        'employees.nama_bank',
        'payroll_periods.bulan',
        'payroll_periods.tahun',
      )
      .from('payroll_items')
      .join('employees', 'payroll_items.employee_id', 'employees.id')
      .join('payroll_periods', 'payroll_items.payroll_period_id', 'payroll_periods.id')
      .where('payroll_items.id', itemId)
      .first()

    if (!item) throw new NotFoundError('Slip gaji')
    return item
  }

  // ═══════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════

  async getHrisDashboard(tenantSchema: string) {
    const today = new Date().toISOString().split('T')[0]

    // Employee counts
    const stats = await this.getEmployeeStats(tenantSchema)

    // Today's attendance
    const todayAtt = await this.db.withSchema(tenantSchema)
      .select('status')
      .count('* as jumlah')
      .from('attendance_records')
      .where('tanggal', today)
      .groupBy('status')

    const attToday: Record<string, number> = {}
    for (const a of todayAtt as Record<string, unknown>[]) {
      attToday[a.status as string] = Number(a.jumlah)
    }

    // Pending leave count
    const pendingLeave = Number(
      (await this.db.withSchema(tenantSchema)
        .count('* as cnt')
        .from('leave_requests')
        .where('status', 'pending')
        .first()
      )?.cnt || 0,
    )

    // Latest payroll
    const latestPayroll = await this.db.withSchema(tenantSchema)
      .select('id', 'bulan', 'tahun', 'status', 'total_bersih', 'jumlah_pegawai')
      .from('payroll_periods')
      .orderByRaw('tahun DESC, bulan DESC')
      .first()

    return {
      total_pegawai: stats.total,
      pegawai_aktif: stats.active,
      by_status: stats.byStatus,
      by_departemen: stats.byDepartemen,
      kehadiran_hari_ini: attToday,
      cuti_pending: pendingLeave,
      latest_payroll: latestPayroll || null,
    }
  }
}
