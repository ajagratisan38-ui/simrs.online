'use client'

import { useState } from 'react'
import {
  useTarifList, useTarifStats, useCreateTarif,
  useUpdateTarif, useDeleteTarif, useToggleTarif,
} from '@/hooks/use-tarif'
import type { KomponenTarif, CreateTarifInput, UpdateTarifInput } from '@/lib/api/tarif'
import {
  Calculator, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Search, Filter, Stethoscope, Syringe, ClipboardList, HeartPulse,
} from 'lucide-react'

const KATEGORI_OPTIONS = [
  { value: 'visite', label: 'Visite Dokter', icon: Stethoscope, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'tindakan', label: 'Tindakan', icon: Syringe, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'administrasi', label: 'Administrasi', icon: ClipboardList, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  { value: 'keperawatan', label: 'Keperawatan', icon: HeartPulse, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
]

const KELAS_COLUMNS = [
  { key: 'tarif_kelas_3', label: 'Kelas 3' },
  { key: 'tarif_kelas_2', label: 'Kelas 2' },
  { key: 'tarif_kelas_1', label: 'Kelas 1' },
  { key: 'tarif_vip', label: 'VIP' },
  { key: 'tarif_igd', label: 'IGD' },
  { key: 'tarif_poli', label: 'Poli' },
] as const

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function KategoriBadge({ kategori }: { kategori: string }) {
  const opt = KATEGORI_OPTIONS.find((k) => k.value === kategori)
  if (!opt) return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{kategori}</span>
  const Icon = opt.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${opt.color}`}>
      <Icon className="w-3 h-3" />
      {opt.label}
    </span>
  )
}

export default function AdminTarifPage() {
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editItem, setEditItem] = useState<KomponenTarif | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: items, isLoading } = useTarifList({
    kategori: filterKategori || undefined,
    search: search || undefined,
  })
  const { data: stats } = useTarifStats()
  const createMut = useCreateTarif()
  const updateMut = useUpdateTarif()
  const deleteMut = useDeleteTarif()
  const toggleMut = useToggleTarif()

  const [form, setForm] = useState<CreateTarifInput & { is_active?: boolean }>({
    kode: '', nama: '', kategori: 'visite',
    tarif_kelas_3: 0, tarif_kelas_2: 0, tarif_kelas_1: 0,
    tarif_vip: 0, tarif_igd: 0, tarif_poli: 0,
  })

  const openCreate = () => {
    setEditItem(null)
    setForm({
      kode: '', nama: '', kategori: 'visite',
      tarif_kelas_3: 0, tarif_kelas_2: 0, tarif_kelas_1: 0,
      tarif_vip: 0, tarif_igd: 0, tarif_poli: 0,
    })
    setShowDialog(true)
  }

  const openEdit = (item: KomponenTarif) => {
    setEditItem(item)
    setForm({
      kode: item.kode,
      nama: item.nama,
      kategori: item.kategori,
      tarif_kelas_3: Number(item.tarif_kelas_3),
      tarif_kelas_2: Number(item.tarif_kelas_2),
      tarif_kelas_1: Number(item.tarif_kelas_1),
      tarif_vip: Number(item.tarif_vip),
      tarif_igd: Number(item.tarif_igd),
      tarif_poli: Number(item.tarif_poli),
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (editItem) {
      const updateData: UpdateTarifInput = {
        nama: form.nama,
        kategori: form.kategori,
        tarif_kelas_3: form.tarif_kelas_3,
        tarif_kelas_2: form.tarif_kelas_2,
        tarif_kelas_1: form.tarif_kelas_1,
        tarif_vip: form.tarif_vip,
        tarif_igd: form.tarif_igd,
        tarif_poli: form.tarif_poli,
      }
      await updateMut.mutateAsync({ id: editItem.id, data: updateData })
    } else {
      await createMut.mutateAsync(form)
    }
    setShowDialog(false)
  }

  const handleDelete = async (id: string) => {
    await deleteMut.mutateAsync(id)
    setDeleteConfirm(null)
  }

  // Group items by kategori
  const grouped = (items || []).reduce<Record<string, KomponenTarif[]>>((acc, item) => {
    const k = item.kategori
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-7 h-7 text-primary" />
            Tarif Berjenjang
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola tarif visite, tindakan, administrasi, dan keperawatan per kelas kamar
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah Tarif
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Total Komponen</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Aktif</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Nonaktif</p>
            <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Kategori</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {stats.byKategori.map((k) => (
                <span key={k.kategori} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {k.kategori}: {k.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kode atau nama tarif..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-900 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
          >
            <option value="">Semua Kategori</option>
            {KATEGORI_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data tarif...</div>
      ) : !items?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          Belum ada komponen tarif. Klik &quot;Tambah Tarif&quot; untuk memulai.
        </div>
      ) : (
        Object.entries(grouped).map(([kategori, groupItems]) => (
          <div key={kategori} className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-800/50">
              <KategoriBadge kategori={kategori} />
              <span className="ml-2 text-sm text-muted-foreground">
                ({groupItems.length} item)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="text-left px-4 py-2.5 font-medium w-28">Kode</th>
                    <th className="text-left px-4 py-2.5 font-medium">Nama</th>
                    {KELAS_COLUMNS.map((col) => (
                      <th key={col.key} className="text-right px-4 py-2.5 font-medium whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                    <th className="text-center px-4 py-2.5 font-medium w-20">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {groupItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 ${
                        !item.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">{item.kode}</td>
                      <td className="px-4 py-2.5">{item.nama}</td>
                      {KELAS_COLUMNS.map((col) => (
                        <td key={col.key} className="px-4 py-2.5 text-right font-mono text-xs">
                          {formatRp(Number(item[col.key as keyof KomponenTarif]))}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => toggleMut.mutate(item.id)}
                          title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {item.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400 mx-auto" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">
                {editItem ? 'Edit Komponen Tarif' : 'Tambah Komponen Tarif'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kode *</label>
                  <input
                    type="text"
                    value={form.kode}
                    onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                    disabled={!!editItem}
                    placeholder="VIS-UMUM"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 disabled:opacity-50 font-mono focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kategori *</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  >
                    {KATEGORI_OPTIONS.map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nama Komponen *</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Visite Dokter Umum"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>

              {/* Tarif per kelas */}
              <div>
                <p className="text-sm font-medium mb-3">Tarif per Kelas</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {KELAS_COLUMNS.map((col) => (
                    <div key={col.key} className="space-y-1">
                      <label className="block text-xs text-muted-foreground">{col.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={form[col.key as keyof typeof form] as number || 0}
                          onChange={(e) => setForm({
                            ...form,
                            [col.key]: Number(e.target.value) || 0,
                          })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 font-mono text-right focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">💡 Cara Kerja Tarif Berjenjang:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Rawat Inap: tarif ditentukan oleh kelas kamar pasien (3/2/1/VIP)</li>
                  <li>IGD: menggunakan kolom Tarif IGD</li>
                  <li>Rawat Jalan: menggunakan kolom Tarif Poli</li>
                  <li>Kode visite: VIS-UMUM, VIS-SPESIALIS, VIS-SUBSPESIALIS, VIS-GIGI</li>
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.kode || !form.nama || createMut.isPending || updateMut.isPending}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-sm shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-lg mb-2">Hapus Komponen Tarif?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Data tarif yang dihapus tidak bisa dikembalikan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
