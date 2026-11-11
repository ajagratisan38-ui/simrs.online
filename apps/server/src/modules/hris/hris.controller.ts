import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { HrisService } from './hris.service'

// ─── Validators ──────────────────────────────────────────

const createEmployeeSchema = z.object({
  nama: z.string().min(1).max(100),
  nik: z.string().length(16).optional(),
  tempat_lahir: z.string().max(100).optional(),
  tanggal_lahir: z.string().optional(),
  jenis_kelamin: z.enum(['L', 'P']).optional(),
  agama: z.string().max(20).optional(),
  alamat: z.string().optional(),
  no_telepon: z.string().max(20).optional(),
  email: z.string().email().optional(),
  foto_url: z.string().optional(),
  jabatan: z.string().min(1).max(100),
  departemen: z.string().max(100).optional(),
  status_kepegawaian: z.enum(['tetap', 'kontrak', 'magang', 'honorer']).default('tetap'),
  tanggal_masuk: z.string().min(1),
  tanggal_keluar: z.string().optional(),
  alasan_keluar: z.string().optional(),
  no_sip: z.string().max(50).optional(),
  no_str: z.string().max(50).optional(),
  pendidikan_terakhir: z.string().max(50).optional(),
  jurusan: z.string().max(100).optional(),
  universitas: z.string().max(200).optional(),
  gaji_pokok: z.number().min(0).default(0),
  tunjangan_tetap: z.number().min(0).default(0),
  tunjangan_fungsional: z.number().min(0).default(0),
  nomor_rekening: z.string().max(30).optional(),
  nama_bank: z.string().max(50).optional(),
  nama_pemilik_rekening: z.string().max(100).optional(),
  no_bpjs_kesehatan: z.string().max(20).optional(),
  no_bpjs_ketenagakerjaan: z.string().max(20).optional(),
  npwp: z.string().max(30).optional(),
  user_id: z.string().uuid().optional(),
})

const updateEmployeeSchema = createEmployeeSchema.partial()

const createDepartmentSchema = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(1).max(100),
  kepala_departemen_id: z.string().uuid().optional(),
  deskripsi: z.string().optional(),
})

const createShiftSchema = z.object({
  nama: z.string().min(1).max(50),
  kode: z.string().min(1).max(10),
  jam_mulai: z.string().min(1),
  jam_selesai: z.string().min(1),
  durasi_jam: z.number().min(0),
  warna: z.string().max(7).optional(),
})

const assignShiftSchema = z.object({
  employee_id: z.string().uuid(),
  shift_id: z.string().uuid(),
  tanggal: z.string().min(1),
  catatan: z.string().optional(),
})

const bulkAssignSchema = z.object({
  employee_ids: z.array(z.string().uuid()).min(1),
  shift_id: z.string().uuid(),
  tanggal_mulai: z.string().min(1),
  tanggal_selesai: z.string().min(1),
})

const recordAttendanceSchema = z.object({
  employee_id: z.string().uuid(),
  tanggal: z.string().min(1),
  jam_masuk: z.string().optional(),
  jam_keluar: z.string().optional(),
  status: z.enum(['hadir', 'izin', 'sakit', 'cuti', 'alpha', 'libur', 'dinas_luar']).default('hadir'),
  keterangan: z.string().optional(),
  shift_id: z.string().uuid().optional(),
})

const bulkAttendanceSchema = z.object({
  employee_ids: z.array(z.string().uuid()).min(1),
  tanggal: z.string().min(1),
  status: z.enum(['hadir', 'izin', 'sakit', 'cuti', 'alpha', 'libur', 'dinas_luar']),
  keterangan: z.string().optional(),
})

const createLeaveSchema = z.object({
  employee_id: z.string().uuid(),
  jenis: z.enum(['cuti_tahunan', 'cuti_sakit', 'cuti_melahirkan', 'cuti_besar', 'izin_khusus']),
  tanggal_mulai: z.string().min(1),
  tanggal_selesai: z.string().min(1),
  jumlah_hari: z.number().int().min(1),
  alasan: z.string().min(1),
})

const rejectLeaveSchema = z.object({
  reason: z.string().min(1),
})

const updatePayrollItemSchema = z.object({
  tunjangan_lain: z.number().optional(),
  potongan_lain: z.number().optional(),
  jasa_medis: z.number().optional(),
  catatan: z.string().optional(),
})

const updateAttendanceSchema = z.object({
  jam_masuk: z.string().optional(),
  jam_keluar: z.string().optional(),
  status: z.enum(['hadir', 'izin', 'sakit', 'cuti', 'alpha', 'libur', 'dinas_luar']).optional(),
  keterangan: z.string().optional(),
  terlambat_menit: z.number().int().min(0).optional(),
  lembur_menit: z.number().int().min(0).optional(),
})

// ─── Controller ──────────────────────────────────────────

export class HrisController {
  constructor(private service: HrisService) {}

  // ── Employees ──────────────────────────────────────────

  listEmployees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listEmployees(
        {
          search: req.query.search as string,
          departemen: req.query.departemen as string,
          jabatan: req.query.jabatan as string,
          status_kepegawaian: req.query.status_kepegawaian as string,
          is_active: req.query.is_active !== undefined
            ? req.query.is_active === 'true'
            : undefined,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
        },
        req.tenantSchema!,
      )
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  getEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getEmployee(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  createEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createEmployeeSchema.parse(req.body)
      const data = await this.service.createEmployee(input, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateEmployeeSchema.parse(req.body)
      const data = await this.service.updateEmployee(req.params.id, input, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteEmployee(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Pegawai berhasil dihapus' } })
    } catch (error) {
      next(error)
    }
  }

  // ── User ↔ Employee Linking ──────────────────────────

  getUnlinkedUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getUnlinkedUsers(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  createUserForEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password, role } = z.object({
        password: z.string().min(8),
        role: z.string().min(1),
      }).parse(req.body)
      const data = await this.service.createUserForEmployee(
        req.params.id, password, role, req.tenantSchema!,
      )
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  linkUserToEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id } = z.object({ user_id: z.string().uuid() }).parse(req.body)
      const data = await this.service.linkUserToEmployee(
        req.params.id, user_id, req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  unlinkUserFromEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.unlinkUserFromEmployee(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getEmployeeStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getEmployeeStats(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // ── Departments ────────────────────────────────────────

  listDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listDepartments(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createDepartmentSchema.parse(req.body)
      const data = await this.service.createDepartment(input, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createDepartmentSchema.partial().parse(req.body)
      const data = await this.service.updateDepartment(req.params.id, input, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  deleteDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteDepartment(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Departemen berhasil dihapus' } })
    } catch (error) {
      next(error)
    }
  }

  // ── Shift Templates ────────────────────────────────────

  listShiftTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listShiftTemplates(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  createShiftTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createShiftSchema.parse(req.body)
      const data = await this.service.createShiftTemplate(input, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  updateShiftTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createShiftSchema.partial().parse(req.body)
      const data = await this.service.updateShiftTemplate(req.params.id, input, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  deleteShiftTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteShiftTemplate(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Shift template berhasil dihapus' } })
    } catch (error) {
      next(error)
    }
  }

  // ── Shift Scheduling ───────────────────────────────────

  getShiftSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getShiftSchedule(
        {
          tanggalMulai: req.query.tanggal_mulai as string,
          tanggalSelesai: req.query.tanggal_selesai as string,
          departemen: req.query.departemen as string,
          employee_id: req.query.employee_id as string,
        },
        req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  assignShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = assignShiftSchema.parse(req.body)
      const data = await this.service.assignShift(input, req.userId, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  bulkAssignShifts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = bulkAssignSchema.parse(req.body)
      const data = await this.service.bulkAssignShifts(input, req.userId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  removeShiftAssignment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.removeShiftAssignment(req.params.id, req.tenantSchema!)
      res.json({ success: true, data: { message: 'Jadwal dinas dihapus' } })
    } catch (error) {
      next(error)
    }
  }

  // ── Attendance ─────────────────────────────────────────

  listAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listAttendance(
        {
          tanggal: req.query.tanggal as string,
          tanggalMulai: req.query.tanggal_mulai as string,
          tanggalSelesai: req.query.tanggal_selesai as string,
          employee_id: req.query.employee_id as string,
          departemen: req.query.departemen as string,
          status: req.query.status as string,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
        },
        req.tenantSchema!,
      )
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  getAttendanceSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bulan = Number(req.query.bulan)
      const tahun = Number(req.query.tahun)
      const data = await this.service.getAttendanceSummary(bulan, tahun, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  recordAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = recordAttendanceSchema.parse(req.body)
      const data = await this.service.recordAttendance(input, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  bulkRecordAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = bulkAttendanceSchema.parse(req.body)
      const data = await this.service.bulkRecordAttendance(input, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  updateAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateAttendanceSchema.parse(req.body)
      const data = await this.service.updateAttendance(req.params.id, input, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // ── Leave Requests ─────────────────────────────────────

  listLeaveRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listLeaveRequests(
        {
          employee_id: req.query.employee_id as string,
          status: req.query.status as string,
          jenis: req.query.jenis as string,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
        },
        req.tenantSchema!,
      )
      res.json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  getLeaveBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tahun = Number(req.query.tahun) || new Date().getFullYear()
      const data = await this.service.getLeaveBalance(req.params.employeeId, tahun, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  createLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createLeaveSchema.parse(req.body)
      const data = await this.service.createLeaveRequest(input, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  approveLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.approveLeave(req.params.id, req.userId!, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  rejectLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = rejectLeaveSchema.parse(req.body)
      const data = await this.service.rejectLeave(
        req.params.id,
        input.reason,
        req.userId!,
        req.tenantSchema!,
      )
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  cancelLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.cancelLeave(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // ── Payroll ────────────────────────────────────────────

  listPayrollPeriods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.listPayrollPeriods(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getPayrollPeriod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getPayrollPeriod(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  createPayrollPeriod = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bulan, tahun } = z.object({
        bulan: z.number().int().min(1).max(12),
        tahun: z.number().int().min(2020).max(2100),
      }).parse(req.body)
      const data = await this.service.createPayrollPeriod(bulan, tahun, req.tenantSchema!)
      res.status(201).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  processPayroll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.processPayroll(req.params.id, req.userId!, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  finalizePayroll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.finalizePayroll(req.params.id, req.userId!, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  updatePayrollItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updatePayrollItemSchema.parse(req.body)
      const data = await this.service.updatePayrollItem(req.params.itemId, input, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getPayrollSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getPayrollSummary(req.params.id, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  getSlipGaji = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getSlipGaji(req.params.itemId, req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  // ── Dashboard ──────────────────────────────────────────

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getHrisDashboard(req.tenantSchema!)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }
}
