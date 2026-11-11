'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users, UserCircle, Building2, CalendarDays, ClipboardCheck,
  FileText, Wallet, Plus, Search, Trash2, Pencil, Check, X,
  ChevronDown, ChevronRight, Printer, Clock, AlertTriangle,
} from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'
import {
  useHrisDashboard, useEmployees, useCreateEmployee, useUpdateEmployee,
  useDeleteEmployee, useDepartments, useCreateDepartment, useUpdateDepartment,
  useDeleteDepartment, useShiftTemplates, useCreateShiftTemplate,
  useShiftSchedule, useAssignShift, useBulkAssignShifts,
  useAttendance, useAttendanceSummary, useRecordAttendance,
  useBulkRecordAttendance, useUpdateAttendance,
  useLeaveRequests, useLeaveBalance, useCreateLeaveRequest,
  useApproveLeave, useRejectLeave,
  usePayrollPeriods, usePayrollPeriod, useCreatePayrollPeriod,
  useProcessPayroll, useFinalizePayroll, useUpdatePayrollItem,
  useUnlinkedUsers, useCreateUserForEmployee, useLinkUserToEmployee,
  useUnlinkUserFromEmployee,
} from '@/hooks/use-hris'
import type {
  Employee, Department, ShiftTemplate, AttendanceRecord,
  LeaveRequest, PayrollPeriod, PayrollItem, UnlinkedUser,
} from '@/lib/api/hris'

// ─── Helpers ─────────────────────────────────────────────

const BULAN_LABEL = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]


function formatDate(d: string | null | undefined): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function weekStart(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1)
  return d.toISOString().split('T')[0]
}

function weekEnd(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 7)
  return d.toISOString().split('T')[0]
}

function dateRange(start: string, end: string): string[] {
  const result: string[] = []
  const s = new Date(start)
  const e = new Date(end)
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    result.push(d.toISOString().split('T')[0])
  }
  return result
}

const STATUS_COLORS: Record<string, string> = {
  hadir: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  izin: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  sakit: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  cuti: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  alpha: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  libur: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  dinas_luar: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
}

const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

const PAYROLL_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  finalized: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

const LEAVE_LABELS: Record<string, string> = {
  cuti_tahunan: 'Cuti Tahunan',
  cuti_sakit: 'Cuti Sakit',
  cuti_melahirkan: 'Cuti Melahirkan',
  cuti_besar: 'Cuti Besar',
  izin_khusus: 'Izin Khusus',
}

const STATUS_KEP_LABELS: Record<string, string> = {
  tetap: 'Tetap',
  kontrak: 'Kontrak',
  magang: 'Magang',
  honorer: 'Honorer',
}

const ROLE_OPTIONS = [
  { value: 'dokter', label: 'Dokter' },
  { value: 'perawat', label: 'Perawat' },
  { value: 'apoteker', label: 'Apoteker' },
  { value: 'kasir', label: 'Kasir' },
  { value: 'pendaftaran', label: 'Pendaftaran' },
  { value: 'rekam_medis', label: 'Rekam Medis' },
  { value: 'lab', label: 'Laboratorium' },
  { value: 'radiologi', label: 'Radiologi' },
  { value: 'manajemen', label: 'Manajemen' },
  { value: 'admin', label: 'Admin' },
]

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs text-muted-foreground">
      {children} <span className="text-red-500 font-bold">*</span>
    </label>
  )
}

function OptionalLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-muted-foreground">{children}</label>
}

// ─── Tab definitions ─────────────────────────────────────

const TABS = [
  { key: 'dashboard', label: 'Dashboard SDM', icon: Users },
  { key: 'pegawai', label: 'Data Pegawai', icon: UserCircle },
  { key: 'departemen', label: 'Departemen', icon: Building2 },
  { key: 'jadwal', label: 'Jadwal Dinas', icon: CalendarDays },
  { key: 'absensi', label: 'Absensi', icon: ClipboardCheck },
  { key: 'cuti', label: 'Cuti & Izin', icon: FileText },
  { key: 'payroll', label: 'Penggajian', icon: Wallet },
]

// ─── Stat Card ───────────────────────────────────────────

function StatCard({
  label, value, sub, color = 'blue',
}: { label: string; value: string | number; sub?: string; color?: string }) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
  }
  return (
    <div className={`rounded-lg border p-4 ${bg[color] || bg.blue}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════

export default function KepegawaianPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kepegawaian / HRIS</h1>
        <p className="text-muted-foreground">Manajemen sumber daya manusia rumah sakit</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'pegawai' && <PegawaiTab />}
      {activeTab === 'departemen' && <DepartemenTab />}
      {activeTab === 'jadwal' && <JadwalTab />}
      {activeTab === 'absensi' && <AbsensiTab />}
      {activeTab === 'cuti' && <CutiTab />}
      {activeTab === 'payroll' && <PayrollTab />}
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// TAB 1: DASHBOARD SDM
// ═════════════════════════════════════════════════════════

function DashboardTab() {
  const { data, isLoading, error } = useHrisDashboard()

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Memuat dashboard...</div>
  if (error) return (
    <div className="text-center py-8">
      <p className="text-red-500 font-medium">Gagal memuat dashboard</p>
      <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message || 'Terjadi kesalahan'}</p>
    </div>
  )

  const d = data || {
    total_pegawai: 0,
    pegawai_aktif: 0,
    by_status: [],
    by_departemen: [],
    kehadiran_hari_ini: {},
    cuti_pending: 0,
    latest_payroll: null,
  }
  const att = d.kehadiran_hari_ini || {}

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Pegawai" value={d.total_pegawai} color="blue" />
        <StatCard label="Pegawai Aktif" value={d.pegawai_aktif} color="green" />
        <StatCard label="Cuti Pending" value={d.cuti_pending} color="yellow" />
        <StatCard
          label="Kehadiran Hari Ini"
          value={att.hadir || 0}
          sub={`Hadir dari ${d.pegawai_aktif} pegawai`}
          color="green"
        />
      </div>

      {d.total_pegawai === 0 && (
        <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-6 text-center">
          <Users className="h-10 w-10 mx-auto text-blue-400 mb-2" />
          <p className="font-medium">Belum ada data pegawai</p>
          <p className="text-sm text-muted-foreground mt-1">
            Buka tab <strong>Data Pegawai</strong> untuk menambahkan pegawai rumah sakit
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Status Kepegawaian</h3>
          {(d.by_status || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada data</p>
          ) : (
          <div className="space-y-2">
            {(d.by_status || []).map((s) => (
              <div key={s.status_kepegawaian} className="flex justify-between items-center">
                <span className="text-sm">{STATUS_KEP_LABELS[s.status_kepegawaian] || s.status_kepegawaian}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${d.total_pegawai ? (Number(s.jumlah) / d.total_pegawai) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{Number(s.jumlah)}</span>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* By Departemen */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Per Departemen (Top 10)</h3>
          {(d.by_departemen || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada data</p>
          ) : (
          <div className="space-y-2">
            {(d.by_departemen || []).map((dept) => (
              <div key={dept.departemen} className="flex justify-between items-center">
                <span className="text-sm truncate max-w-[60%]">{dept.departemen || 'Belum diisi'}</span>
                <span className="text-sm font-medium">{Number(dept.jumlah)}</span>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Attendance Today */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Kehadiran Hari Ini</h3>
          <div className="grid grid-cols-3 gap-3">
            {['hadir', 'izin', 'sakit', 'alpha', 'cuti', 'libur'].map((s) => (
              <div key={s} className={`rounded-md px-3 py-2 text-center ${STATUS_COLORS[s]}`}>
                <div className="text-lg font-bold">{att[s] || 0}</div>
                <div className="text-xs capitalize">{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Payroll */}
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Penggajian Terakhir</h3>
          {d.latest_payroll ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Periode</span>
                <span className="font-medium">
                  {BULAN_LABEL[d.latest_payroll.bulan]} {d.latest_payroll.tahun}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${PAYROLL_STATUS_COLORS[d.latest_payroll.status]}`}>
                  {d.latest_payroll.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Bersih</span>
                <span className="font-semibold">{formatRupiah(d.latest_payroll.total_bersih)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pegawai</span>
                <span>{d.latest_payroll.jumlah_pegawai}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data penggajian</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// TAB 2: DATA PEGAWAI
// ═════════════════════════════════════════════════════════

function PegawaiTab() {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showAccountDialog, setShowAccountDialog] = useState<string | null>(null)
  const [accountMode, setAccountMode] = useState<'link' | 'create'>('create')
  const [accountForm, setAccountForm] = useState({ password: '', role: 'dokter', user_id: '' })

  const { data: departments } = useDepartments()
  const { data: empData, isLoading } = useEmployees({
    search, departemen: deptFilter, status_kepegawaian: statusFilter, page, limit: 20,
  })
  const createMut = useCreateEmployee()
  const updateMut = useUpdateEmployee()
  const deleteMut = useDeleteEmployee()
  const { data: unlinkedUsers } = useUnlinkedUsers()
  const createAccountMut = useCreateUserForEmployee()
  const linkUserMut = useLinkUserToEmployee()
  const unlinkUserMut = useUnlinkUserFromEmployee()

  const employees = empData?.data || []
  const meta = empData?.meta

  const [form, setForm] = useState<Record<string, unknown>>({})

  function openCreate() {
    setForm({
      jabatan: '', departemen: '', status_kepegawaian: 'tetap',
      tanggal_masuk: todayStr(), gaji_pokok: 0, tunjangan_tetap: 0, tunjangan_fungsional: 0,
    })
    setEditId(null)
    setFormErrors({})
    setShowForm(true)
  }

  function openEdit(e: Employee) {
    setForm({
      ...e,
      tanggal_masuk: e.tanggal_masuk?.split('T')[0] || '',
      tanggal_lahir: e.tanggal_lahir?.split('T')[0] || '',
      gaji_pokok: Number(e.gaji_pokok),
      tunjangan_tetap: Number(e.tunjangan_tetap),
      tunjangan_fungsional: Number(e.tunjangan_fungsional),
    })
    setEditId(e.id)
    setFormErrors({})
    setShowForm(true)
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.nama || (form.nama as string).trim() === '') errors.nama = 'Nama wajib diisi'
    const nik = (form.nik as string) || ''
    if (!nik.trim()) {
      errors.nik = 'NIK wajib diisi'
    } else if (nik.trim().length !== 16) {
      errors.nik = 'NIK harus 16 digit'
    }
    if (!form.jenis_kelamin || (form.jenis_kelamin as string) === '') {
      errors.jenis_kelamin = 'Jenis kelamin wajib dipilih'
    }
    if (!form.tanggal_lahir || (form.tanggal_lahir as string).trim() === '') {
      errors.tanggal_lahir = 'Tanggal lahir wajib diisi'
    }
    if (!form.email || (form.email as string).trim() === '') {
      errors.email = 'Email wajib diisi'
    }
    if (!form.jabatan || (form.jabatan as string).trim() === '') errors.jabatan = 'Jabatan wajib diisi'
    if (!form.departemen || (form.departemen as string) === '') {
      errors.departemen = 'Departemen wajib dipilih'
    }
    if (!form.tanggal_masuk || (form.tanggal_masuk as string).trim() === '') {
      errors.tanggal_masuk = 'Tanggal masuk wajib diisi'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit() {
    if (!validateForm()) return
    const internal = ['id', 'nip', 'created_at', 'updated_at', 'deleted_at', 'is_active']
    const cleaned = Object.fromEntries(
      Object.entries(form).filter(([key, val]) => {
        if (internal.includes(key)) return false
        if (val === '' || val === null || val === undefined) return false
        return true
      }),
    )
    if (editId) {
      await updateMut.mutateAsync({ id: editId, data: cleaned })
    } else {
      await createMut.mutateAsync(cleaned)
    }
    setShowForm(false)
  }

  async function handleCreateAccount() {
    if (!showAccountDialog) return
    if (accountMode === 'create') {
      if (accountForm.password.length < 8) return alert('Password minimal 8 karakter')
      await createAccountMut.mutateAsync({
        employeeId: showAccountDialog,
        data: { password: accountForm.password, role: accountForm.role },
      })
    } else {
      if (!accountForm.user_id) return alert('Pilih user')
      await linkUserMut.mutateAsync({
        employeeId: showAccountDialog, userId: accountForm.user_id,
      })
    }
    setShowAccountDialog(null)
    setAccountForm({ password: '', role: 'dokter', user_id: '' })
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama, NIP, NIK..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2 rounded-md border bg-background text-sm"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1) }}
          className="rounded-md border px-3 py-2 text-sm bg-background"
        >
          <option value="">Semua Departemen</option>
          {(departments || []).map((d: Department) => (
            <option key={d.id} value={d.nama}>{d.nama}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-md border px-3 py-2 text-sm bg-background"
        >
          <option value="">Semua Status</option>
          <option value="tetap">Tetap</option>
          <option value="kontrak">Kontrak</option>
          <option value="honorer">Honorer</option>
          <option value="magang">Magang</option>
        </select>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Pegawai
        </button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">NIP</th>
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Jabatan</th>
              <th className="px-4 py-3 text-left font-medium">Departemen</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Akun Login</th>
              <th className="px-4 py-3 text-center font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada data pegawai</td></tr>
            ) : employees.map((emp: Employee) => (
              <tr key={emp.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{emp.nip}</td>
                <td className="px-4 py-3 font-medium">{emp.nama}</td>
                <td className="px-4 py-3">{emp.jabatan}</td>
                <td className="px-4 py-3">{emp.departemen || '-'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {STATUS_KEP_LABELS[emp.status_kepegawaian] || emp.status_kepegawaian}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {emp.user_id ? (
                    <div className="flex items-center gap-1 justify-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        ✓ Terhubung
                      </span>
                      <button
                        onClick={() => {
                          if (confirm('Putuskan hubungan akun login dari pegawai ini?')) {
                            unlinkUserMut.mutate(emp.id)
                          }
                        }}
                        className="p-1 rounded hover:bg-red-100 text-red-500"
                        title="Putuskan akun"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAccountDialog(emp.id)
                        setAccountMode('create')
                        setAccountForm({ password: '', role: 'dokter', user_id: '' })
                      }}
                      className="text-xs px-2 py-1 rounded border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      + Buat Akun
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => openEdit(emp)}
                      className="p-1.5 rounded hover:bg-muted"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus pegawai ${emp.nama}?`)) deleteMut.mutate(emp.id)
                      }}
                      className="p-1.5 rounded hover:bg-red-100 text-red-600"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {meta.total} pegawai, halaman {meta.page}/{meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded border text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={page === meta.totalPages}
              className="px-3 py-1.5 rounded border text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Employee Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-background rounded-lg border shadow-xl w-full max-w-3xl mx-4 mb-10 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editId ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}
            </h2>

            <div className="space-y-4">
              {/* Data Pribadi */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Data Pribadi</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <RequiredLabel>Nama Lengkap</RequiredLabel>
                    <input
                      value={(form.nama as string) || ''}
                      onChange={(e) => { setForm({ ...form, nama: e.target.value }); setFormErrors({ ...formErrors, nama: '' }) }}
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${formErrors.nama ? 'border-red-500' : ''}`}
                    />
                    {formErrors.nama && <p className="text-xs text-red-500 mt-0.5">{formErrors.nama}</p>}
                  </div>
                  <div>
                    <RequiredLabel>NIK</RequiredLabel>
                    <input
                      value={(form.nik as string) || ''}
                      onChange={(e) => { setForm({ ...form, nik: e.target.value.replace(/\D/g, '') }); setFormErrors({ ...formErrors, nik: '' }) }}
                      maxLength={16}
                      placeholder="16 digit"
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${formErrors.nik ? 'border-red-500' : ''}`}
                    />
                    {formErrors.nik && <p className="text-xs text-red-500 mt-0.5">{formErrors.nik}</p>}
                  </div>
                  <div>
                    <OptionalLabel>Tempat Lahir</OptionalLabel>
                    <input
                      value={(form.tempat_lahir as string) || ''}
                      onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div>
                    <RequiredLabel>Tanggal Lahir</RequiredLabel>
                    <DateInput
                      value={(form.tanggal_lahir as string) || ''}
                      onChange={(v) => { setForm({ ...form, tanggal_lahir: v }); setFormErrors({ ...formErrors, tanggal_lahir: '' }) }}
                    />
                    {formErrors.tanggal_lahir && <p className="text-xs text-red-500 mt-0.5">{formErrors.tanggal_lahir}</p>}
                  </div>
                  <div>
                    <RequiredLabel>Jenis Kelamin</RequiredLabel>
                    <select
                      value={(form.jenis_kelamin as string) || ''}
                      onChange={(e) => { setForm({ ...form, jenis_kelamin: e.target.value }); setFormErrors({ ...formErrors, jenis_kelamin: '' }) }}
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${formErrors.jenis_kelamin ? 'border-red-500' : ''}`}
                    >
                      <option value="">- Pilih -</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                    {formErrors.jenis_kelamin && <p className="text-xs text-red-500 mt-0.5">{formErrors.jenis_kelamin}</p>}
                  </div>
                  <div>
                    <OptionalLabel>No. Telepon</OptionalLabel>
                    <input
                      value={(form.no_telepon as string) || ''}
                      onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div className="col-span-2">
                    <RequiredLabel>Email</RequiredLabel>
                    <input
                      type="email"
                      value={(form.email as string) || ''}
                      onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors({ ...formErrors, email: '' }) }}
                      placeholder="Digunakan untuk akun login"
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${formErrors.email ? 'border-red-500' : ''}`}
                    />
                    {formErrors.email && <p className="text-xs text-red-500 mt-0.5">{formErrors.email}</p>}
                  </div>
                </div>
              </div>

              {/* Pekerjaan */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Pekerjaan</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <RequiredLabel>Jabatan</RequiredLabel>
                    <input
                      value={(form.jabatan as string) || ''}
                      onChange={(e) => { setForm({ ...form, jabatan: e.target.value }); setFormErrors({ ...formErrors, jabatan: '' }) }}
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${formErrors.jabatan ? 'border-red-500' : ''}`}
                    />
                    {formErrors.jabatan && <p className="text-xs text-red-500 mt-0.5">{formErrors.jabatan}</p>}
                  </div>
                  <div>
                    <RequiredLabel>Departemen</RequiredLabel>
                    <select
                      value={(form.departemen as string) || ''}
                      onChange={(e) => { setForm({ ...form, departemen: e.target.value }); setFormErrors({ ...formErrors, departemen: '' }) }}
                      className={`w-full rounded-md border px-3 py-2 text-sm bg-background ${formErrors.departemen ? 'border-red-500' : ''}`}
                    >
                      <option value="">- Pilih Departemen -</option>
                      {(departments || []).map((d: Department) => (
                        <option key={d.id} value={d.nama}>{d.nama}</option>
                      ))}
                    </select>
                    {formErrors.departemen && <p className="text-xs text-red-500 mt-0.5">{formErrors.departemen}</p>}
                  </div>
                  <div>
                    <OptionalLabel>Status Kepegawaian</OptionalLabel>
                    <select
                      value={(form.status_kepegawaian as string) || 'tetap'}
                      onChange={(e) => setForm({ ...form, status_kepegawaian: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    >
                      <option value="tetap">Tetap</option>
                      <option value="kontrak">Kontrak</option>
                      <option value="honorer">Honorer</option>
                      <option value="magang">Magang</option>
                    </select>
                  </div>
                  <div>
                    <RequiredLabel>Tanggal Masuk</RequiredLabel>
                    <DateInput
                      value={(form.tanggal_masuk as string) || ''}
                      onChange={(v) => { setForm({ ...form, tanggal_masuk: v }); setFormErrors({ ...formErrors, tanggal_masuk: '' }) }}
                    />
                    {formErrors.tanggal_masuk && <p className="text-xs text-red-500 mt-0.5">{formErrors.tanggal_masuk}</p>}
                  </div>
                  <div>
                    <OptionalLabel>Pendidikan Terakhir</OptionalLabel>
                    <select
                      value={(form.pendidikan_terakhir as string) || ''}
                      onChange={(e) => setForm({ ...form, pendidikan_terakhir: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    >
                      <option value="">-</option>
                      {['SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3', 'Profesi', 'Spesialis'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <OptionalLabel>No. SIP</OptionalLabel>
                    <input
                      value={(form.no_sip as string) || ''}
                      onChange={(e) => setForm({ ...form, no_sip: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Keuangan */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Keuangan</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <OptionalLabel>Gaji Pokok</OptionalLabel>
                    <input
                      type="number"
                      value={Number(form.gaji_pokok) || 0}
                      onChange={(e) => setForm({ ...form, gaji_pokok: Number(e.target.value) })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div>
                    <OptionalLabel>Tunjangan Tetap</OptionalLabel>
                    <input
                      type="number"
                      value={Number(form.tunjangan_tetap) || 0}
                      onChange={(e) => setForm({ ...form, tunjangan_tetap: Number(e.target.value) })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div>
                    <OptionalLabel>Tunjangan Fungsional</OptionalLabel>
                    <input
                      type="number"
                      value={Number(form.tunjangan_fungsional) || 0}
                      onChange={(e) => setForm({ ...form, tunjangan_fungsional: Number(e.target.value) })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div>
                    <OptionalLabel>Nama Bank</OptionalLabel>
                    <input
                      value={(form.nama_bank as string) || ''}
                      onChange={(e) => setForm({ ...form, nama_bank: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div>
                    <OptionalLabel>No. Rekening</OptionalLabel>
                    <input
                      value={(form.nomor_rekening as string) || ''}
                      onChange={(e) => setForm({ ...form, nomor_rekening: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div>
                    <OptionalLabel>NPWP</OptionalLabel>
                    <input
                      value={(form.npwp as string) || ''}
                      onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* BPJS */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">BPJS</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <OptionalLabel>No. BPJS Kesehatan</OptionalLabel>
                    <input
                      value={(form.no_bpjs_kesehatan as string) || ''}
                      onChange={(e) => setForm({ ...form, no_bpjs_kesehatan: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div>
                    <OptionalLabel>No. BPJS Ketenagakerjaan</OptionalLabel>
                    <input
                      value={(form.no_bpjs_ketenagakerjaan as string) || ''}
                      onChange={(e) => setForm({ ...form, no_bpjs_ketenagakerjaan: e.target.value })}
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-md border text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Dialog */}
      {showAccountDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-lg border shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Hubungkan Akun Login</h2>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAccountMode('create')}
                className={`flex-1 px-3 py-2 rounded-md text-sm border ${
                  accountMode === 'create' ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                Buat Akun Baru
              </button>
              <button
                onClick={() => setAccountMode('link')}
                className={`flex-1 px-3 py-2 rounded-md text-sm border ${
                  accountMode === 'link' ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                Hubungkan yang Ada
              </button>
            </div>

            {accountMode === 'create' ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Nama & email diambil otomatis dari data pegawai. Pastikan email sudah diisi.
                </p>
                <div>
                  <RequiredLabel>Role / Hak Akses</RequiredLabel>
                  <select
                    value={accountForm.role}
                    onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <RequiredLabel>Password</RequiredLabel>
                  <input
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Pilih akun yang sudah ada tapi belum terhubung dengan pegawai manapun.
                </p>
                <div>
                  <RequiredLabel>Pilih Akun</RequiredLabel>
                  <select
                    value={accountForm.user_id}
                    onChange={(e) => setAccountForm({ ...accountForm, user_id: e.target.value })}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  >
                    <option value="">-- Pilih user --</option>
                    {(unlinkedUsers || []).map((u: UnlinkedUser) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) — {u.role}
                      </option>
                    ))}
                  </select>
                  {(unlinkedUsers || []).length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Semua akun sudah terhubung. Buat akun baru.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAccountDialog(null)}
                className="px-4 py-2 rounded-md border text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={createAccountMut.isPending || linkUserMut.isPending}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {createAccountMut.isPending || linkUserMut.isPending
                  ? 'Menyimpan...'
                  : accountMode === 'create' ? 'Buat Akun' : 'Hubungkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// TAB 3: DEPARTEMEN
// ═════════════════════════════════════════════════════════

function DepartemenTab() {
  const { data: departments, isLoading } = useDepartments()
  const createMut = useCreateDepartment()
  const updateMut = useUpdateDepartment()
  const deleteMut = useDeleteDepartment()

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ kode: '', nama: '', deskripsi: '' })

  function openCreate() {
    setForm({ kode: '', nama: '', deskripsi: '' })
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(d: Department) {
    setForm({ kode: d.kode, nama: d.nama, deskripsi: d.deskripsi || '' })
    setEditId(d.id)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (editId) {
      await updateMut.mutateAsync({ id: editId, data: form })
    } else {
      await createMut.mutateAsync(form)
    }
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Daftar Departemen</h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Tambah Departemen
        </button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Kode</th>
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Deskripsi</th>
              <th className="px-4 py-3 text-center font-medium">Jumlah Pegawai</th>
              <th className="px-4 py-3 text-center font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
            ) : (departments || []).map((d: Department) => (
              <tr key={d.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{d.kode}</td>
                <td className="px-4 py-3 font-medium">{d.nama}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.deskripsi || '-'}</td>
                <td className="px-4 py-3 text-center">{d.jumlah_pegawai || 0}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-muted">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus departemen ${d.nama}?`)) deleteMut.mutate(d.id)
                      }}
                      className="p-1.5 rounded hover:bg-red-100 text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-lg border shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">{editId ? 'Edit' : 'Tambah'} Departemen</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Kode *</label>
                <input
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nama *</label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Deskripsi</label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md border text-sm">Batal</button>
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// TAB 4: JADWAL DINAS (SHIFT SCHEDULING)
// ═════════════════════════════════════════════════════════

function JadwalTab() {
  const [startDate, setStartDate] = useState(weekStart())
  const [endDate, setEndDate] = useState(weekEnd())
  const [deptFilter, setDeptFilter] = useState('')

  const { data: departments } = useDepartments()
  const { data: shifts } = useShiftTemplates()
  const { data: schedule, isLoading } = useShiftSchedule({
    tanggal_mulai: startDate,
    tanggal_selesai: endDate,
    departemen: deptFilter,
  })

  const assignMut = useAssignShift()
  const bulkMut = useBulkAssignShifts()

  const dates = useMemo(() => dateRange(startDate, endDate), [startDate, endDate])

  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [bulkShift, setBulkShift] = useState('')

  function handleCellClick(empId: string, date: string) {
    if (!shifts || shifts.length === 0) return
    // Cycle through shifts on click
    const currentAssignment = schedule?.assignments?.[empId]?.[date]
    const currentShiftId = currentAssignment
      ? (currentAssignment as Record<string, unknown>).shift_id as string
      : null
    const shiftList = shifts as ShiftTemplate[]
    const currentIdx = currentShiftId ? shiftList.findIndex((s) => s.id === currentShiftId) : -1
    const nextIdx = (currentIdx + 1) % shiftList.length
    assignMut.mutate({
      employee_id: empId,
      shift_id: shiftList[nextIdx].id,
      tanggal: date,
    })
  }

  async function handleBulkApply() {
    if (!bulkShift || bulkSelected.length === 0) return
    await bulkMut.mutateAsync({
      employee_ids: bulkSelected,
      shift_id: bulkShift,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
    })
    setBulkMode(false)
    setBulkSelected([])
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Dari:</label>
          <DateInput
            value={startDate}
            onChange={(v) => setStartDate(v)}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Sampai:</label>
          <DateInput
            value={endDate}
            onChange={(v) => setEndDate(v)}
            className="w-36"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm bg-background"
        >
          <option value="">Semua Departemen</option>
          {(departments || []).map((d: Department) => (
            <option key={d.id} value={d.nama}>{d.nama}</option>
          ))}
        </select>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className={`px-3 py-2 rounded-md border text-sm ${bulkMode ? 'bg-blue-100 border-blue-300 text-blue-700' : ''}`}
        >
          Bulk Assign
        </button>
      </div>

      {/* Shift Legend */}
      <div className="flex gap-3 flex-wrap">
        {(shifts || []).map((s: ShiftTemplate) => (
          <div key={s.id} className="flex items-center gap-1.5 text-xs">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: s.warna }} />
            <span>{s.kode} - {s.nama} ({s.jam_mulai}-{s.jam_selesai})</span>
          </div>
        ))}
      </div>

      {/* Bulk Controls */}
      {bulkMode && (
        <div className="flex gap-3 items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200">
          <span className="text-sm">{bulkSelected.length} pegawai dipilih</span>
          <select
            value={bulkShift}
            onChange={(e) => setBulkShift(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
          >
            <option value="">Pilih Shift</option>
            {(shifts || []).map((s: ShiftTemplate) => (
              <option key={s.id} value={s.id}>{s.nama}</option>
            ))}
          </select>
          <button
            onClick={handleBulkApply}
            disabled={bulkMut.isPending || !bulkShift || bulkSelected.length === 0}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            {bulkMut.isPending ? 'Menerapkan...' : 'Terapkan'}
          </button>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              {bulkMode && <th className="px-2 py-2 w-8"></th>}
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap min-w-[150px] sticky left-0 bg-muted/50">
                Pegawai
              </th>
              {dates.map((d) => {
                const day = new Date(d)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                return (
                  <th
                    key={d}
                    className={`px-2 py-2 text-center font-medium whitespace-nowrap ${isWeekend ? 'bg-red-50 dark:bg-red-950' : ''}`}
                  >
                    <div>{day.toLocaleDateString('id-ID', { weekday: 'short' })}</div>
                    <div>{day.getDate()}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={dates.length + (bulkMode ? 2 : 1)} className="text-center py-8 text-muted-foreground">
                  Memuat jadwal...
                </td>
              </tr>
            ) : (schedule?.employees || []).map((emp) => (
              <tr key={emp.id} className="hover:bg-muted/20">
                {bulkMode && (
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={bulkSelected.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) setBulkSelected([...bulkSelected, emp.id])
                        else setBulkSelected(bulkSelected.filter((x) => x !== emp.id))
                      }}
                      className="rounded"
                    />
                  </td>
                )}
                <td className="px-3 py-2 sticky left-0 bg-background border-r">
                  <div className="font-medium">{emp.nama}</div>
                  <div className="text-muted-foreground">{emp.departemen}</div>
                </td>
                {dates.map((d) => {
                  const assignment = schedule?.assignments?.[emp.id]?.[d] as Record<string, unknown> | undefined
                  const isWeekend = new Date(d).getDay() === 0 || new Date(d).getDay() === 6
                  return (
                    <td
                      key={d}
                      onClick={() => handleCellClick(emp.id, d)}
                      className={`px-1 py-1.5 text-center cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all w-12 min-w-[48px] max-w-[48px] ${
                        isWeekend ? 'bg-red-50/50 dark:bg-red-950/50' : ''
                      }`}
                    >
                      {assignment ? (
                        <div
                          className="rounded px-1 py-1 text-white font-bold text-center text-[10px] leading-tight truncate"
                          style={{ backgroundColor: assignment.shift_warna as string || '#9CA3AF' }}
                          title={assignment.shift_nama as string}
                        >
                          {assignment.shift_kode as string}
                        </div>
                      ) : (
                        <div className="text-muted-foreground/30">-</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// TAB 5: ABSENSI (ATTENDANCE)
// ═════════════════════════════════════════════════════════

function AbsensiTab() {
  const [date, setDate] = useState(todayStr())
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'daily' | 'summary'>('daily')
  const now = new Date()
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1)
  const [summaryYear, setSummaryYear] = useState(now.getFullYear())

  const { data: departments } = useDepartments()
  const { data: attData, isLoading } = useAttendance({
    tanggal: viewMode === 'daily' ? date : '',
    departemen: deptFilter,
    status: statusFilter,
    page,
    limit: 50,
  })
  const { data: summary, isLoading: summaryLoading } = useAttendanceSummary(
    viewMode === 'summary' ? summaryMonth : 0,
    viewMode === 'summary' ? summaryYear : 0,
  )
  const recordMut = useRecordAttendance()
  const bulkMut = useBulkRecordAttendance()
  const updateMut = useUpdateAttendance()

  const records = attData?.data || []
  const [bulkEmpIds, setBulkEmpIds] = useState<string[]>([])

  async function markBulk(status: string) {
    if (bulkEmpIds.length === 0) return
    await bulkMut.mutateAsync({ employee_ids: bulkEmpIds, tanggal: date, status })
    setBulkEmpIds([])
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('daily')}
          className={`px-3 py-1.5 rounded-md text-sm border ${viewMode === 'daily' ? 'bg-primary text-primary-foreground' : ''}`}
        >
          Harian
        </button>
        <button
          onClick={() => setViewMode('summary')}
          className={`px-3 py-1.5 rounded-md text-sm border ${viewMode === 'summary' ? 'bg-primary text-primary-foreground' : ''}`}
        >
          Rekap Bulanan
        </button>
      </div>

      {viewMode === 'daily' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <DateInput
              value={date}
              onChange={(v) => { setDate(v); setPage(1) }}
              className="w-36"
            />
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1) }}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            >
              <option value="">Semua Departemen</option>
              {(departments || []).map((d: Department) => (
                <option key={d.id} value={d.nama}>{d.nama}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            >
              <option value="">Semua Status</option>
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {bulkEmpIds.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm">{bulkEmpIds.length} dipilih</span>
                <button
                  onClick={() => markBulk('hadir')}
                  className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs"
                >
                  Mark Hadir
                </button>
                <button
                  onClick={() => markBulk('alpha')}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs"
                >
                  Mark Alpha
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-3 w-8">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) setBulkEmpIds(records.map((r: AttendanceRecord) => r.employee_id))
                        else setBulkEmpIds([])
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">Departemen</th>
                  <th className="px-4 py-3 text-left font-medium">Shift</th>
                  <th className="px-4 py-3 text-left font-medium">Jam Masuk</th>
                  <th className="px-4 py-3 text-left font-medium">Jam Keluar</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Terlambat</th>
                  <th className="px-4 py-3 text-center font-medium">Lembur</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr>
                ) : records.map((r: AttendanceRecord) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={bulkEmpIds.includes(r.employee_id)}
                        onChange={(e) => {
                          if (e.target.checked) setBulkEmpIds([...bulkEmpIds, r.employee_id])
                          else setBulkEmpIds(bulkEmpIds.filter((x) => x !== r.employee_id))
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{r.employee_nama}</td>
                    <td className="px-4 py-3">{r.employee_departemen || '-'}</td>
                    <td className="px-4 py-3">{r.shift_kode || '-'}</td>
                    <td className="px-4 py-3">
                      {r.jam_masuk ? new Date(r.jam_masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {r.jam_keluar ? new Date(r.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || ''}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.terlambat_menit > 0 ? (
                        <span className="text-red-600 text-xs">{r.terlambat_menit} mnt</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.lembur_menit > 0 ? (
                        <span className="text-blue-600 text-xs">{r.lembur_menit} mnt</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Summary Controls */}
          <div className="flex gap-3 items-center">
            <select
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(Number(e.target.value))}
              className="rounded-md border px-3 py-2 text-sm bg-background"
            >
              {BULAN_LABEL.slice(1).map((b, i) => (
                <option key={i + 1} value={i + 1}>{b}</option>
              ))}
            </select>
            <input
              type="number"
              value={summaryYear}
              onChange={(e) => setSummaryYear(Number(e.target.value))}
              className="w-20 rounded-md border px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Summary Table */}
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">NIP</th>
                  <th className="px-4 py-3 text-left font-medium">Departemen</th>
                  <th className="px-3 py-3 text-center font-medium">Hadir</th>
                  <th className="px-3 py-3 text-center font-medium">Izin</th>
                  <th className="px-3 py-3 text-center font-medium">Sakit</th>
                  <th className="px-3 py-3 text-center font-medium">Cuti</th>
                  <th className="px-3 py-3 text-center font-medium">Alpha</th>
                  <th className="px-3 py-3 text-center font-medium">Terlambat</th>
                  <th className="px-3 py-3 text-center font-medium">Lembur</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summaryLoading ? (
                  <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
                ) : (summary || []).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.nama}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.nip}</td>
                    <td className="px-4 py-3">{s.departemen || '-'}</td>
                    <td className="px-3 py-3 text-center font-medium text-green-600">{s.hadir}</td>
                    <td className="px-3 py-3 text-center text-blue-600">{s.izin}</td>
                    <td className="px-3 py-3 text-center text-yellow-600">{s.sakit}</td>
                    <td className="px-3 py-3 text-center text-purple-600">{s.cuti}</td>
                    <td className="px-3 py-3 text-center text-red-600">{s.alpha}</td>
                    <td className="px-3 py-3 text-center">
                      {s.total_terlambat_menit > 0 ? `${s.total_terlambat_menit} mnt` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.total_lembur_menit > 0 ? `${Math.round(s.total_lembur_menit / 60 * 10) / 10} jam` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// TAB 6: CUTI & IZIN
// ═════════════════════════════════════════════════════════

function CutiTab() {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [balanceEmpId, setBalanceEmpId] = useState<string | null>(null)

  const { data: leaveData, isLoading } = useLeaveRequests({ status: statusFilter, page, limit: 20 })
  const { data: empData } = useEmployees({ limit: 200, is_active: 'true' as unknown as number })
  const { data: balance } = useLeaveBalance(balanceEmpId || undefined)
  const createMut = useCreateLeaveRequest()
  const approveMut = useApproveLeave()
  const rejectMut = useRejectLeave()

  const leaves = leaveData?.data || []
  const meta = leaveData?.meta
  const employees = empData?.data || []

  const [form, setForm] = useState({
    employee_id: '',
    jenis: 'cuti_tahunan',
    tanggal_mulai: todayStr(),
    tanggal_selesai: todayStr(),
    jumlah_hari: 1,
    alasan: '',
  })

  function calcDays(start: string, end: string) {
    const s = new Date(start)
    const e = new Date(end)
    let days = 0
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      if (day !== 0 && day !== 6) days++
    }
    return days
  }

  async function handleSubmit() {
    const days = calcDays(form.tanggal_mulai, form.tanggal_selesai)
    await createMut.mutateAsync({ ...form, jumlah_hari: days })
    setShowForm(false)
  }

  async function handleReject() {
    if (!rejectId || !rejectReason) return
    await rejectMut.mutateAsync({ id: rejectId, reason: rejectReason })
    setRejectId(null)
    setRejectReason('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-md border px-3 py-2 text-sm bg-background"
        >
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 ml-auto"
        >
          <Plus className="h-4 w-4" /> Ajukan Cuti/Izin
        </button>
      </div>

      {/* Leave Balance Quick Check */}
      <div className="p-3 rounded-lg border bg-muted/30 flex flex-wrap gap-3 items-center">
        <span className="text-sm text-muted-foreground">Cek Saldo Cuti:</span>
        <select
          value={balanceEmpId || ''}
          onChange={(e) => setBalanceEmpId(e.target.value || null)}
          className="rounded-md border px-3 py-1.5 text-sm bg-background max-w-[250px]"
        >
          <option value="">Pilih pegawai...</option>
          {employees.map((e: Employee) => (
            <option key={e.id} value={e.id}>{e.nama} ({e.nip})</option>
          ))}
        </select>
        {balance && (
          <div className="flex items-center gap-4 text-sm">
            <span>Jatah: <strong>{balance.jatah_tahunan}</strong></span>
            <span>Terpakai: <strong>{balance.terpakai}</strong></span>
            <span className={balance.sisa <= 2 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
              Sisa: {balance.sisa}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Pegawai</th>
              <th className="px-4 py-3 text-left font-medium">Jenis</th>
              <th className="px-4 py-3 text-left font-medium">Tanggal</th>
              <th className="px-4 py-3 text-center font-medium">Hari</th>
              <th className="px-4 py-3 text-left font-medium">Alasan</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
            ) : leaves.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada pengajuan</td></tr>
            ) : leaves.map((l: LeaveRequest) => (
              <tr key={l.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{l.employee_nama}</div>
                  <div className="text-xs text-muted-foreground">{l.employee_departemen}</div>
                </td>
                <td className="px-4 py-3">{LEAVE_LABELS[l.jenis] || l.jenis}</td>
                <td className="px-4 py-3 text-xs">
                  {formatDate(l.tanggal_mulai)} - {formatDate(l.tanggal_selesai)}
                </td>
                <td className="px-4 py-3 text-center">{l.jumlah_hari}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{l.alasan}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${LEAVE_STATUS_COLORS[l.status] || ''}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {l.status === 'pending' && (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => approveMut.mutate(l.id)}
                        className="p-1.5 rounded hover:bg-green-100 text-green-600"
                        title="Setujui"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRejectId(l.id)}
                        className="p-1.5 rounded hover:bg-red-100 text-red-600"
                        title="Tolak"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {meta.total} pengajuan, halaman {meta.page}/{meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={page === meta.totalPages} className="px-3 py-1.5 rounded border text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Create Leave Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-lg border shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Ajukan Cuti/Izin</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Pegawai *</label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                >
                  <option value="">Pilih pegawai</option>
                  {employees.map((e: Employee) => (
                    <option key={e.id} value={e.id}>{e.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Jenis *</label>
                <select
                  value={form.jenis}
                  onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                >
                  {Object.entries(LEAVE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Mulai *</label>
                  <DateInput
                    value={form.tanggal_mulai}
                    onChange={(v) => setForm({ ...form, tanggal_mulai: v })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Selesai *</label>
                  <DateInput
                    value={form.tanggal_selesai}
                    onChange={(v) => setForm({ ...form, tanggal_selesai: v })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah hari kerja: <strong>{calcDays(form.tanggal_mulai, form.tanggal_selesai)}</strong>
              </p>
              <div>
                <label className="text-xs text-muted-foreground">Alasan *</label>
                <textarea
                  value={form.alasan}
                  onChange={(e) => setForm({ ...form, alasan: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md border text-sm">Batal</button>
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || !form.employee_id || !form.alasan}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {createMut.isPending ? 'Menyimpan...' : 'Ajukan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-lg border shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Tolak Pengajuan</h2>
            <div>
              <label className="text-xs text-muted-foreground">Alasan penolakan *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setRejectId(null); setRejectReason('') }} className="px-4 py-2 rounded-md border text-sm">Batal</button>
              <button
                onClick={handleReject}
                disabled={rejectMut.isPending || !rejectReason}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium disabled:opacity-50"
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// TAB 7: PENGGAJIAN (PAYROLL)
// ═════════════════════════════════════════════════════════

function PayrollTab() {
  const { data: periods, isLoading } = usePayrollPeriods()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const now = new Date()
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1)
  const [newYear, setNewYear] = useState(now.getFullYear())
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const { data: detail } = usePayrollPeriod(selectedId || undefined)
  const createMut = useCreatePayrollPeriod()
  const processMut = useProcessPayroll()
  const finalizeMut = useFinalizePayroll()
  const updateItemMut = useUpdatePayrollItem()

  const items = detail?.items || []

  async function handleCreate() {
    await createMut.mutateAsync({ bulan: newMonth, tahun: newYear })
    setShowCreate(false)
  }

  return (
    <div className="space-y-4">
      {!selectedId ? (
        <>
          {/* Period List */}
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Periode Penggajian</h3>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Buat Periode
            </button>
          </div>

          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Periode</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Pegawai</th>
                  <th className="px-4 py-3 text-right font-medium">Total Bersih</th>
                  <th className="px-4 py-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
                ) : (periods || []).length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada periode</td></tr>
                ) : (periods || []).map((p: PayrollPeriod) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {BULAN_LABEL[p.bulan]} {p.tahun}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PAYROLL_STATUS_COLORS[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{p.jumlah_pegawai}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatRupiah(p.total_bersih)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedId(p.id)}
                        className="px-3 py-1 rounded border text-xs hover:bg-muted"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Period Detail */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedId(null)}
              className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted"
            >
              &larr; Kembali
            </button>
            <h3 className="font-semibold">
              {detail ? `${BULAN_LABEL[detail.bulan]} ${detail.tahun}` : '...'}
            </h3>
            {detail && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${PAYROLL_STATUS_COLORS[detail.status]}`}>
                {detail.status}
              </span>
            )}
            <div className="ml-auto flex gap-2">
              {detail?.status === 'draft' && (
                <button
                  onClick={() => processMut.mutate(selectedId)}
                  disabled={processMut.isPending}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {processMut.isPending ? 'Memproses...' : 'Proses Gaji'}
                </button>
              )}
              {detail?.status === 'processing' && (
                <button
                  onClick={() => finalizeMut.mutate(selectedId)}
                  disabled={finalizeMut.isPending}
                  className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {finalizeMut.isPending ? 'Memfinalisasi...' : 'Finalisasi'}
                </button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          {detail && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Gaji Pokok" value={formatRupiah(detail.total_gaji_pokok)} color="blue" />
              <StatCard label="Total Tunjangan" value={formatRupiah(detail.total_tunjangan)} color="green" />
              <StatCard label="Total Potongan" value={formatRupiah(detail.total_potongan)} color="red" />
              <StatCard label="Total Bersih" value={formatRupiah(detail.total_bersih)} color="purple" />
            </div>
          )}

          {/* Items Table */}
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-3 w-8"></th>
                  <th className="px-4 py-3 text-left font-medium">Nama</th>
                  <th className="px-4 py-3 text-left font-medium">Jabatan</th>
                  <th className="px-4 py-3 text-right font-medium">Gaji Pokok</th>
                  <th className="px-4 py-3 text-right font-medium">Tunjangan</th>
                  <th className="px-4 py-3 text-right font-medium">Jasa Medis</th>
                  <th className="px-4 py-3 text-right font-medium">Potongan</th>
                  <th className="px-4 py-3 text-right font-medium">Gaji Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item: PayrollItem) => (
                  <>
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          {expandedItem === item.id
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">{item.employee_nama}</td>
                      <td className="px-4 py-3">{item.employee_jabatan || '-'}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(item.gaji_pokok)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatRupiah(
                          Number(item.tunjangan_tetap || 0)
                          + Number(item.tunjangan_fungsional || 0)
                          + Number(item.tunjangan_kehadiran || 0)
                          + Number(item.tunjangan_lembur || 0)
                          + Number(item.tunjangan_lain || 0),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">{formatRupiah(item.jasa_medis)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatRupiah(item.total_potongan)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatRupiah(item.gaji_bersih)}</td>
                    </tr>
                    {expandedItem === item.id && (
                      <tr key={`${item.id}-detail`}>
                        <td colSpan={8} className="px-8 py-4 bg-muted/20">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">Pendapatan</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between"><span>Gaji Pokok</span><span>{formatRupiah(item.gaji_pokok)}</span></div>
                                <div className="flex justify-between"><span>Tunj. Tetap</span><span>{formatRupiah(item.tunjangan_tetap)}</span></div>
                                <div className="flex justify-between"><span>Tunj. Fungsional</span><span>{formatRupiah(item.tunjangan_fungsional)}</span></div>
                                <div className="flex justify-between"><span>Tunj. Kehadiran</span><span>{formatRupiah(item.tunjangan_kehadiran)}</span></div>
                                <div className="flex justify-between"><span>Tunj. Lembur</span><span>{formatRupiah(item.tunjangan_lembur)}</span></div>
                                <div className="flex justify-between"><span>Tunj. Lain</span><span>{formatRupiah(item.tunjangan_lain)}</span></div>
                                <div className="flex justify-between"><span>Jasa Medis</span><span>{formatRupiah(item.jasa_medis)}</span></div>
                                <div className="flex justify-between font-semibold border-t pt-1">
                                  <span>Total</span><span>{formatRupiah(item.total_pendapatan)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">Potongan</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between"><span>BPJS Kesehatan (1%)</span><span>{formatRupiah(item.potongan_bpjs_kesehatan)}</span></div>
                                <div className="flex justify-between"><span>BPJS TK (2%)</span><span>{formatRupiah(item.potongan_bpjs_tk)}</span></div>
                                <div className="flex justify-between"><span>PPH 21</span><span>{formatRupiah(item.potongan_pph21)}</span></div>
                                <div className="flex justify-between"><span>Potongan Lain</span><span>{formatRupiah(item.potongan_lain)}</span></div>
                                <div className="flex justify-between font-semibold border-t pt-1 text-red-600">
                                  <span>Total</span><span>{formatRupiah(item.total_potongan)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">Kehadiran</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between"><span>Hari Kerja</span><span>{item.hari_kerja}</span></div>
                                <div className="flex justify-between"><span>Hadir</span><span className="text-green-600">{item.hari_hadir}</span></div>
                                <div className="flex justify-between"><span>Sakit</span><span>{item.hari_sakit}</span></div>
                                <div className="flex justify-between"><span>Izin</span><span>{item.hari_izin}</span></div>
                                <div className="flex justify-between"><span>Alpha</span><span className="text-red-600">{item.hari_alpha}</span></div>
                                <div className="flex justify-between"><span>Lembur</span><span>{item.jam_lembur} jam</span></div>
                              </div>
                              <div className="mt-3 pt-2 border-t">
                                <div className="flex justify-between text-sm font-bold">
                                  <span>Gaji Bersih</span>
                                  <span className="text-green-700">{formatRupiah(item.gaji_bersih)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Period Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-lg border shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Buat Periode Baru</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Bulan</label>
                <select
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                >
                  {BULAN_LABEL.slice(1).map((b, i) => (
                    <option key={i + 1} value={i + 1}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tahun</label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-md border text-sm">Batal</button>
              <button
                onClick={handleCreate}
                disabled={createMut.isPending}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {createMut.isPending ? 'Membuat...' : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
