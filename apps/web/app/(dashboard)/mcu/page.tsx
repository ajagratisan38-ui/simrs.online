'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardCheck, Plus, Search, Package, Users, CheckCircle, Clock,
  AlertTriangle, XCircle, Eye, Trash2, ToggleLeft, ToggleRight, ChevronDown, Pencil,
} from 'lucide-react'
import {
  useMcuStats, useMcuPackages, useMcuRegistrations,
  useCreateMcuPackage, useUpdateMcuPackage, useToggleMcuPackage, useDeleteMcuPackage,
  useRegisterMcu, useCancelMcu,
} from '@/hooks/use-mcu'
import { usePatients } from '@/hooks/use-patients'

const EXAM_CATEGORIES = [
  { value: 'fisik_umum', label: 'Fisik Umum' },
  { value: 'mata', label: 'Mata' },
  { value: 'tht', label: 'THT' },
  { value: 'gigi', label: 'Gigi' },
  { value: 'lab', label: 'Laboratorium' },
  { value: 'radiologi', label: 'Radiologi' },
  { value: 'ekg', label: 'EKG' },
  { value: 'spirometri', label: 'Spirometri' },
  { value: 'audiometri', label: 'Audiometri' },
  { value: 'psikologi', label: 'Psikologi' },
]

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  registered: { label: 'Terdaftar', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: Clock },
  in_progress: { label: 'Dalam Proses', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', icon: Clock },
  waiting_review: { label: 'Menunggu Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', icon: AlertTriangle },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: XCircle },
}

const CONCLUSION_LABELS: Record<string, { label: string; color: string }> = {
  fit: { label: 'Fit / Sehat', color: 'text-green-600' },
  fit_with_notes: { label: 'Fit dengan Catatan', color: 'text-yellow-600' },
  temporarily_unfit: { label: 'Tidak Fit Sementara', color: 'text-orange-600' },
  unfit: { label: 'Tidak Fit', color: 'text-red-600' },
}

export default function McuPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registrations' | 'packages'>('dashboard')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [showPackageDialog, setShowPackageDialog] = useState(false)

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: ClipboardCheck },
    { key: 'registrations', label: 'Pendaftaran MCU', icon: Users },
    { key: 'packages', label: 'Paket MCU', icon: Package },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-teal-600" />
            Medical Check Up
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Kelola pemeriksaan kesehatan berkala
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPackageDialog(true)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Package className="h-4 w-4" /> Tambah Paket
          </button>
          <button
            onClick={() => setShowRegisterDialog(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Daftarkan MCU
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'registrations' && (
        <RegistrationsTab
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          search={search}
          setSearch={setSearch}
        />
      )}
      {activeTab === 'packages' && <PackagesTab />}

      {showRegisterDialog && (
        <RegisterDialog onClose={() => setShowRegisterDialog(false)} />
      )}
      {showPackageDialog && (
        <PackageDialog onClose={() => setShowPackageDialog(false)} />
      )}
    </div>
  )
}

function DashboardTab() {
  const { data: stats, isLoading } = useMcuStats()

  if (isLoading) return <div className="text-center py-12 text-gray-500">Memuat statistik...</div>

  const statCards = [
    { label: 'MCU Hari Ini', value: stats?.today || 0, icon: ClipboardCheck, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
    { label: 'Terdaftar', value: stats?.byStatus?.registered || 0, icon: Clock, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
    { label: 'Dalam Proses', value: stats?.byStatus?.in_progress || 0, icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30' },
    { label: 'Menunggu Review', value: stats?.byStatus?.waiting_review || 0, icon: AlertTriangle, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30' },
    { label: 'Selesai', value: stats?.byStatus?.completed || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Conclusion breakdown */}
      {stats && Object.keys(stats.byConclusion).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Distribusi Kesimpulan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byConclusion).map(([key, value]) => {
              const meta = CONCLUSION_LABELS[key]
              return (
                <div key={key} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className={`text-2xl font-bold ${meta?.color || 'text-gray-600'}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-1">{meta?.label || key}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top packages */}
      {stats && stats.topPackages.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Paket Populer</h3>
          <div className="space-y-3">
            {stats.topPackages.map((pkg, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{pkg.package}</span>
                <span className="text-sm font-semibold text-teal-600">{pkg.count} kali</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RegistrationsTab({
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
}: {
  statusFilter: string
  setStatusFilter: (v: string) => void
  search: string
  setSearch: (v: string) => void
}) {
  const router = useRouter()
  const params: Record<string, string> = {}
  if (statusFilter) params.status = statusFilter
  if (search) params.search = search

  const { data, isLoading } = useMcuRegistrations(params)
  const cancelMcu = useCancelMcu()

  const rows = data?.data || []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pasien, No. RM, No. Sertifikat..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada pendaftaran MCU</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Pasien</th>
                <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Paket</th>
                <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Tanggal</th>
                <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">No. Sertifikat</th>
                <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {rows.map((row) => {
                const statusMeta = STATUS_LABELS[row.status] || STATUS_LABELS.registered
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => router.push(`/mcu/${row.id}`)}
                  >
                    <td className="p-3">
                      <div className="font-medium text-gray-900 dark:text-white">{row.patient_nama}</div>
                      <div className="text-xs text-gray-500">{row.no_rekam_medis}</div>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded text-xs font-medium">
                        {row.package_kode}
                      </span>{' '}
                      {row.package_nama}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {new Date(row.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusMeta.color}`}>
                        <statusMeta.icon className="h-3 w-3" />
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 text-xs font-mono">{row.certificate_number}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/mcu/${row.id}`)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 rounded"
                          title="Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {row.status !== 'completed' && row.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              if (confirm('Batalkan MCU ini?')) cancelMcu.mutate(row.id)
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                            title="Batalkan"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="text-center text-sm text-gray-500">
          Halaman {data.meta.page} dari {data.meta.totalPages} ({data.meta.total} data)
        </div>
      )}
    </div>
  )
}

function PackagesTab() {
  const { data: packages, isLoading } = useMcuPackages()
  const togglePkg = useToggleMcuPackage()
  const deletePkg = useDeleteMcuPackage()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [editPkg, setEditPkg] = useState<Record<string, unknown> | null>(null)

  const getErrMsg = (err: unknown): string => {
    const e = err as Record<string, unknown>
    const resp = e?.response as Record<string, unknown> | undefined
    const data = resp?.data as Record<string, unknown> | undefined
    const errObj = data?.error as Record<string, string> | undefined
    return errObj?.message || (e?.message as string) || 'Terjadi kesalahan'
  }

  const handleToggle = (pkgId: string, pkgNama: string, isActive: boolean) => {
    setFeedback(null)
    const label = isActive ? 'dinonaktifkan' : 'diaktifkan'
    togglePkg.mutate(pkgId, {
      onSuccess: () => {
        setFeedback({ type: 'success', msg: 'Paket ' + pkgNama + ' ' + label })
        setTimeout(() => setFeedback(null), 3000)
      },
      onError: (err) => {
        setFeedback({ type: 'error', msg: getErrMsg(err) })
        setTimeout(() => setFeedback(null), 5000)
      },
    })
  }

  const handleDelete = (pkgId: string, pkgNama: string) => {
    if (!confirm('Hapus paket ' + pkgNama + '?')) return
    setFeedback(null)
    deletePkg.mutate(pkgId, {
      onSuccess: () => {
        setFeedback({ type: 'success', msg: 'Paket ' + pkgNama + ' dihapus' })
        setTimeout(() => setFeedback(null), 3000)
      },
      onError: (err) => {
        setFeedback({ type: 'error', msg: getErrMsg(err) })
        setTimeout(() => setFeedback(null), 5000)
      },
    })
  }

  if (isLoading) return <div className="text-center py-12 text-gray-500">Memuat paket...</div>

  if (!packages || packages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>Belum ada paket MCU. Klik &quot;Tambah Paket&quot; untuk memulai.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {feedback.msg}
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 transition-opacity ${
              !pkg.is_active ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{pkg.nama}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    pkg.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                  }`}>
                    {pkg.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-500">{pkg.kode}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditPkg(pkg)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggle(pkg.id, pkg.nama, pkg.is_active)}
                  disabled={togglePkg.isPending}
                  className="p-1.5 text-gray-400 hover:text-teal-600 rounded disabled:opacity-50"
                  title={pkg.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {togglePkg.isPending ? (
                    <Clock className="h-5 w-5 animate-spin" />
                  ) : pkg.is_active ? (
                    <ToggleRight className="h-5 w-5 text-teal-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(pkg.id, pkg.nama)}
                  disabled={deletePkg.isPending}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                  title="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

          {pkg.deskripsi && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{pkg.deskripsi}</p>
          )}

          <p className="text-lg font-bold text-teal-600 mb-3">
            {formatRupiah(pkg.harga)}
          </p>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              {pkg.items?.length || 0} Pemeriksaan:
            </p>
            {pkg.items?.map((item) => {
              const cat = EXAM_CATEGORIES.find((c) => c.value === item.kategori)
              return (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 font-medium">
                    {cat?.label || item.kategori}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{item.nama}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      </div>

      {editPkg && (
        <PackageDialog
          onClose={() => setEditPkg(null)}
          editData={editPkg as Record<string, unknown>}
        />
      )}
    </div>
  )
}

function RegisterDialog({ onClose }: { onClose: () => void }) {
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [tujuan, setTujuan] = useState('')
  const [perusahaan, setPerusahaan] = useState('')

  const { data: packagesData } = useMcuPackages()
  const { data: patientsData } = usePatients({
    search: patientSearch,
    page: 1,
    limit: 10,
  })
  const registerMcu = useRegisterMcu()

  const packages = packagesData || []
  const patients = patientsData?.data || []

  const handleSubmit = () => {
    if (!selectedPatient || !selectedPackage) return
    registerMcu.mutate(
      {
        patient_id: selectedPatient,
        package_id: selectedPackage,
        tujuan: tujuan || undefined,
        perusahaan: perusahaan || undefined,
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 bg-background rounded-2xl shadow-2xl border w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 bg-muted/30">
          <h2 className="text-base font-semibold">
            Daftarkan Medical Check Up
          </h2>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">

        <div className="space-y-4">
          {/* Patient search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pasien *
            </label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Cari nama / No. RM..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
            />
            {patientSearch && patients.length > 0 && !selectedPatient && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg mt-1 max-h-40 overflow-y-auto">
                {patients.map((p: Record<string, string>) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatient(p.id)
                      setPatientSearch(`${p.nama} (${p.no_rekam_medis})`)
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-0"
                  >
                    <span className="font-medium">{p.nama}</span>
                    <span className="text-gray-500 ml-2">{p.no_rekam_medis}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <button
                onClick={() => { setSelectedPatient(''); setPatientSearch('') }}
                className="text-xs text-teal-600 mt-1"
              >
                Ganti pasien
              </button>
            )}
          </div>

          {/* Package */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Paket MCU *
            </label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
            >
              <option value="">Pilih Paket</option>
              {packages
                .filter((p) => p.is_active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama} — {formatRupiah(p.harga)}
                  </option>
                ))}
            </select>
          </div>

          {/* Tujuan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tujuan MCU
            </label>
            <input
              type="text"
              value={tujuan}
              onChange={(e) => setTujuan(e.target.value)}
              placeholder="Contoh: Pre-employment, Berkala, Penerbangan..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
            />
          </div>

          {/* Perusahaan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Perusahaan (opsional)
            </label>
            <input
              type="text"
              value={perusahaan}
              onChange={(e) => setPerusahaan(e.target.value)}
              placeholder="Nama perusahaan pengirim"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        </div>
        <div className="px-5 py-4 bg-muted/30 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-accent">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPatient || !selectedPackage || registerMcu.isPending}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {registerMcu.isPending ? 'Mendaftar...' : 'Daftarkan'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PackageDialog({ onClose, editData }: { onClose: () => void; editData?: Record<string, unknown> }) {
  const isEdit = !!editData
  const [nama, setNama] = useState(editData?.nama as string || '')
  const [kode, setKode] = useState(editData?.kode as string || '')
  const [deskripsi, setDeskripsi] = useState(editData?.deskripsi as string || '')
  const [harga, setHarga] = useState(editData?.harga != null ? String(Math.round(Number(editData.harga) || 0)) : '')
  const existingItems = (editData?.items as { kategori: string; nama: string }[] | undefined) || []
  const [items, setItems] = useState<{ kategori: string; nama: string }[]>(
    existingItems.map((i) => ({ kategori: i.kategori, nama: i.nama }))
  )
  const [newKategori, setNewKategori] = useState('fisik_umum')
  const [newNama, setNewNama] = useState('')

  const createPkg = useCreateMcuPackage()
  const updatePkg = useUpdateMcuPackage()
  const isPending = createPkg.isPending || updatePkg.isPending

  const addItem = () => {
    if (!newNama.trim()) return
    setItems([...items, { kategori: newKategori, nama: newNama.trim() }])
    setNewNama('')
  }

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const handleSubmit = () => {
    if (!nama || !kode || !harga || items.length === 0) return
    if (isEdit) {
      updatePkg.mutate(
        { id: editData.id as string, data: { nama, kode, deskripsi, harga: Number(harga), items } },
        { onSuccess: () => onClose() },
      )
    } else {
      createPkg.mutate(
        { nama, kode, deskripsi, harga: Number(harga), items },
        { onSuccess: () => onClose() },
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 bg-background rounded-2xl shadow-2xl border w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 bg-muted/30">
          <h2 className="text-base font-semibold">
            {isEdit ? 'Edit Paket MCU' : 'Tambah Paket MCU'}
          </h2>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nama Paket *</label>
              <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Paket Basic" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kode *</label>
              <input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="MCU-B" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Deskripsi</label>
            <input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi paket..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Harga (Rp) *</label>
            <input type="number" value={harga} onChange={(e) => setHarga(e.target.value)} placeholder="500000" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
          </div>

          {/* Add items */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              Pemeriksaan ({items.length} item)
            </label>
            <div className="flex gap-2">
              <select
                value={newKategori}
                onChange={(e) => setNewKategori(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700"
              >
                {EXAM_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                placeholder="Nama pemeriksaan"
                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700"
              />
              <button onClick={addItem} className="px-3 py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700">
                +
              </button>
            </div>

            {items.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {items.map((item, i) => {
                  const cat = EXAM_CATEGORIES.find((c) => c.value === item.kategori)
                  return (
                    <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-2 py-1.5 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded font-medium">{cat?.label}</span>
                        <span>{item.nama}</span>
                      </div>
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        </div>
        <div className="px-5 py-4 bg-muted/30 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-accent">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!nama || !kode || !harga || items.length === 0 || isPending}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {isPending ? 'Menyimpan...' : isEdit ? 'Update Paket' : 'Simpan Paket'}
          </button>
        </div>
      </div>
    </div>
  )
}
