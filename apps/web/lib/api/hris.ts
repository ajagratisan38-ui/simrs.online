import { apiClient } from './client'

// ─── Types ───────────────────────────────────────────────

export interface Employee {
  id: string
  user_id: string | null
  nip: string
  nik: string | null
  nama: string
  tempat_lahir: string | null
  tanggal_lahir: string | null
  jenis_kelamin: string | null
  agama: string | null
  alamat: string | null
  no_telepon: string | null
  email: string | null
  foto_url: string | null
  jabatan: string
  departemen: string | null
  status_kepegawaian: string
  tanggal_masuk: string
  tanggal_keluar: string | null
  alasan_keluar: string | null
  no_sip: string | null
  no_str: string | null
  pendidikan_terakhir: string | null
  jurusan: string | null
  universitas: string | null
  gaji_pokok: number
  tunjangan_tetap: number
  tunjangan_fungsional: number
  nomor_rekening: string | null
  nama_bank: string | null
  nama_pemilik_rekening: string | null
  no_bpjs_kesehatan: string | null
  no_bpjs_ketenagakerjaan: string | null
  npwp: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Department {
  id: string
  kode: string
  nama: string
  kepala_departemen_id: string | null
  deskripsi: string | null
  is_active: boolean
  created_at: string
  jumlah_pegawai?: number
}

export interface ShiftTemplate {
  id: string
  nama: string
  kode: string
  jam_mulai: string
  jam_selesai: string
  durasi_jam: number
  warna: string
  is_active: boolean
  created_at: string
}

export interface ShiftAssignment {
  id: string
  employee_id: string
  shift_id: string
  tanggal: string
  catatan: string | null
  assigned_by: string | null
  shift_nama?: string
  shift_kode?: string
  shift_warna?: string
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  tanggal: string
  jam_masuk: string | null
  jam_keluar: string | null
  status: string
  keterangan: string | null
  shift_id: string | null
  terlambat_menit: number
  lembur_menit: number
  employee_nama?: string
  employee_nip?: string
  employee_departemen?: string
  shift_nama?: string
  shift_kode?: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  jenis: string
  tanggal_mulai: string
  tanggal_selesai: string
  jumlah_hari: number
  alasan: string
  status: string
  approved_by: string | null
  approved_at: string | null
  rejected_reason: string | null
  created_at: string
  employee_nama?: string
  employee_nip?: string
  employee_departemen?: string
}

export interface LeaveBalance {
  jatah_tahunan: number
  terpakai: number
  sisa: number
}

export interface PayrollPeriod {
  id: string
  bulan: number
  tahun: number
  status: string
  tanggal_proses: string | null
  tanggal_bayar: string | null
  total_gaji_pokok: number
  total_tunjangan: number
  total_potongan: number
  total_bersih: number
  jumlah_pegawai: number
  items?: PayrollItem[]
}

export interface PayrollItem {
  id: string
  payroll_period_id: string
  employee_id: string
  gaji_pokok: number
  tunjangan_tetap: number
  tunjangan_fungsional: number
  tunjangan_kehadiran: number
  tunjangan_lembur: number
  tunjangan_lain: number
  jasa_medis: number
  total_pendapatan: number
  potongan_bpjs_kesehatan: number
  potongan_bpjs_tk: number
  potongan_pph21: number
  potongan_lain: number
  total_potongan: number
  gaji_bersih: number
  hari_kerja: number
  hari_hadir: number
  hari_sakit: number
  hari_izin: number
  hari_alpha: number
  jam_lembur: number
  catatan: string | null
  employee_nama?: string
  employee_nip?: string
  employee_jabatan?: string
  employee_departemen?: string
  nama?: string
  nip?: string
  jabatan?: string
  departemen?: string
  bulan?: number
  tahun?: number
  nomor_rekening?: string
  nama_bank?: string
}

export interface EmployeeStats {
  total: number
  active: number
  byStatus: { status_kepegawaian: string; jumlah: number }[]
  byDepartemen: { departemen: string; jumlah: number }[]
}

export interface AttendanceSummary {
  id: string
  nama: string
  nip: string
  departemen: string
  hadir: number
  izin: number
  sakit: number
  cuti: number
  alpha: number
  libur: number
  dinas_luar: number
  total_terlambat_menit: number
  total_lembur_menit: number
}

export interface HrisDashboard {
  total_pegawai: number
  pegawai_aktif: number
  by_status: { status_kepegawaian: string; jumlah: number }[]
  by_departemen: { departemen: string; jumlah: number }[]
  kehadiran_hari_ini: Record<string, number>
  cuti_pending: number
  latest_payroll: {
    id: string
    bulan: number
    tahun: number
    status: string
    total_bersih: number
    jumlah_pegawai: number
  } | null
}

export interface ShiftScheduleData {
  employees: { id: string; nama: string; jabatan: string; departemen: string }[]
  assignments: Record<string, Record<string, ShiftAssignment>>
}

interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface SuccessResponse<T> {
  success: boolean
  data: T
}

// ─── API Functions ───────────────────────────────────────

// Dashboard
export async function getHrisDashboard() {
  const res = await apiClient<SuccessResponse<HrisDashboard>>('/hris/dashboard')
  return res.data
}

// Employees
export async function listEmployees(params: Record<string, string | number> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') query.set(k, String(v))
  })
  return apiClient<PaginatedResponse<Employee>>(`/hris/employees?${query}`)
}

export async function getEmployee(id: string) {
  const res = await apiClient<SuccessResponse<Employee>>(`/hris/employees/${id}`)
  return res.data
}

export async function createEmployee(data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<Employee>>('/hris/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateEmployee(id: string, data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<Employee>>(`/hris/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function deleteEmployee(id: string) {
  return apiClient(`/hris/employees/${id}`, { method: 'DELETE' })
}

export async function getEmployeeStats() {
  const res = await apiClient<SuccessResponse<EmployeeStats>>('/hris/employees/stats')
  return res.data
}

// User ↔ Employee Linking
export interface UnlinkedUser {
  id: string
  name: string
  email: string
  role: string
}

export async function getUnlinkedUsers() {
  const res = await apiClient<SuccessResponse<UnlinkedUser[]>>('/hris/users/unlinked')
  return res.data
}

export async function createUserForEmployee(employeeId: string, data: { password: string; role: string }) {
  const res = await apiClient<SuccessResponse<UnlinkedUser>>(`/hris/employees/${employeeId}/create-account`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function linkUserToEmployee(employeeId: string, userId: string) {
  const res = await apiClient<SuccessResponse<Employee>>(`/hris/employees/${employeeId}/link-user`, {
    method: 'PUT',
    body: JSON.stringify({ user_id: userId }),
  })
  return res.data
}

export async function unlinkUserFromEmployee(employeeId: string) {
  const res = await apiClient<SuccessResponse<Employee>>(`/hris/employees/${employeeId}/unlink-user`, {
    method: 'DELETE',
  })
  return res.data
}

// Departments
export async function listDepartments() {
  const res = await apiClient<SuccessResponse<Department[]>>('/hris/departments')
  return res.data
}

export async function createDepartment(data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<Department>>('/hris/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateDepartment(id: string, data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<Department>>(`/hris/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function deleteDepartment(id: string) {
  return apiClient(`/hris/departments/${id}`, { method: 'DELETE' })
}

// Shift Templates
export async function listShiftTemplates() {
  const res = await apiClient<SuccessResponse<ShiftTemplate[]>>('/hris/shifts')
  return res.data
}

export async function createShiftTemplate(data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<ShiftTemplate>>('/hris/shifts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateShiftTemplate(id: string, data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<ShiftTemplate>>(`/hris/shifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function deleteShiftTemplate(id: string) {
  return apiClient(`/hris/shifts/${id}`, { method: 'DELETE' })
}

// Shift Schedule
export async function getShiftSchedule(params: Record<string, string>) {
  const query = new URLSearchParams(params)
  const res = await apiClient<SuccessResponse<ShiftScheduleData>>(`/hris/schedule?${query}`)
  return res.data
}

export async function assignShift(data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<ShiftAssignment>>('/hris/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function bulkAssignShifts(data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<{ assigned: number }>>('/hris/schedule/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function removeShiftAssignment(id: string) {
  return apiClient(`/hris/schedule/${id}`, { method: 'DELETE' })
}

// Attendance
export async function listAttendance(params: Record<string, string | number> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') query.set(k, String(v))
  })
  return apiClient<PaginatedResponse<AttendanceRecord>>(`/hris/attendance?${query}`)
}

export async function getAttendanceSummary(bulan: number, tahun: number) {
  const res = await apiClient<SuccessResponse<AttendanceSummary[]>>(
    `/hris/attendance/summary?bulan=${bulan}&tahun=${tahun}`,
  )
  return res.data
}

export async function recordAttendance(data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<AttendanceRecord>>('/hris/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function bulkRecordAttendance(data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<{ recorded: number }>>('/hris/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updateAttendance(id: string, data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<AttendanceRecord>>(`/hris/attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.data
}

// Leave
export async function listLeaveRequests(params: Record<string, string | number> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') query.set(k, String(v))
  })
  return apiClient<PaginatedResponse<LeaveRequest>>(`/hris/leave?${query}`)
}

export async function getLeaveBalance(employeeId: string, tahun?: number) {
  const q = tahun ? `?tahun=${tahun}` : ''
  const res = await apiClient<SuccessResponse<LeaveBalance>>(`/hris/leave/balance/${employeeId}${q}`)
  return res.data
}

export async function createLeaveRequest(data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<LeaveRequest>>('/hris/leave', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function approveLeave(id: string) {
  const res = await apiClient<SuccessResponse<LeaveRequest>>(`/hris/leave/${id}/approve`, {
    method: 'PUT',
  })
  return res.data
}

export async function rejectLeave(id: string, reason: string) {
  const res = await apiClient<SuccessResponse<LeaveRequest>>(`/hris/leave/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  })
  return res.data
}

export async function cancelLeave(id: string) {
  const res = await apiClient<SuccessResponse<LeaveRequest>>(`/hris/leave/${id}/cancel`, {
    method: 'PUT',
  })
  return res.data
}

// Payroll
export async function listPayrollPeriods() {
  const res = await apiClient<SuccessResponse<PayrollPeriod[]>>('/hris/payroll')
  return res.data
}

export async function getPayrollPeriod(id: string) {
  const res = await apiClient<SuccessResponse<PayrollPeriod>>(`/hris/payroll/${id}`)
  return res.data
}

export async function createPayrollPeriod(bulan: number, tahun: number) {
  const res = await apiClient<SuccessResponse<PayrollPeriod>>('/hris/payroll', {
    method: 'POST',
    body: JSON.stringify({ bulan, tahun }),
  })
  return res.data
}

export async function processPayroll(id: string) {
  const res = await apiClient<SuccessResponse<PayrollPeriod>>(`/hris/payroll/${id}/process`, {
    method: 'PUT',
  })
  return res.data
}

export async function finalizePayroll(id: string) {
  const res = await apiClient<SuccessResponse<PayrollPeriod>>(`/hris/payroll/${id}/finalize`, {
    method: 'PUT',
  })
  return res.data
}

export async function updatePayrollItem(itemId: string, data: Record<string, unknown>) {
  const res = await apiClient<SuccessResponse<PayrollItem>>(`/hris/payroll/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function getPayrollSummary(id: string) {
  const res = await apiClient<SuccessResponse<{ period: PayrollPeriod; summary: Record<string, number> }>>(
    `/hris/payroll/${id}/summary`,
  )
  return res.data
}

export async function getSlipGaji(itemId: string) {
  const res = await apiClient<SuccessResponse<PayrollItem>>(`/hris/payroll/slip/${itemId}`)
  return res.data
}
