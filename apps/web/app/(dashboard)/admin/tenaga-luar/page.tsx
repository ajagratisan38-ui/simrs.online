'use client'

import { useState } from 'react'
import {
  Briefcase, Search, Plus, Pencil, Trash2, Users, Building2,
  DollarSign, TrendingUp, Phone, Mail, FileText, Power,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { DateInput, formatTanggal } from '@/components/ui/date-input'
import { toast } from 'sonner'
import {
  usePractitionerList, usePractitionerStats,
  useCreatePractitioner, useUpdatePractitioner, useDeletePractitioner,
  useFeeSummary, usePractitionerEarnings,
} from '@/hooks/use-rehabilitation'

const PROFESI_OPTIONS = [
  'Fisioterapis', 'Terapis Wicara', 'Terapis Okupasi', 'Psikolog Klinis',
  'Terapis Respirasi', 'Ahli Rehabilitasi Jantung', 'Ahli Rehabilitasi Neurologi', 'Lainnya',
]

const STATUS_COLORS: Record<string, string> = {
  aktif: 'bg-green-100 text-green-700',
  nonaktif: 'bg-gray-100 text-gray-700',
  kontrak_habis: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  kontrak_habis: 'Kontrak Habis',
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function TenagaLuarPage() {
  const [tab, setTab] = useState<'list' | 'fees'>('list')
  const [search, setSearch] = useState('')
  const [profesiFilter, setProfesiFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [fNama, setFNama] = useState('')
  const [fProfesi, setFProfesi] = useState('Fisioterapis')
  const [fSpesialisasi, setFSpesialisasi] = useState('')
  const [fNoSip, setFNoSip] = useState('')
  const [fNoStr, setFNoStr] = useState('')
  const [fInstansi, setFInstansi] = useState('')
  const [fTelepon, setFTelepon] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fAlamat, setFAlamat] = useState('')
  const [fFeePersen, setFFeePersen] = useState('70')
  const [fFeeRsPersen, setFFeeRsPersen] = useState('30')
  const [fKontrakMulai, setFKontrakMulai] = useState('')
  const [fKontrakSelesai, setFKontrakSelesai] = useState('')
  const [fCatatan, setFCatatan] = useState('')

  // Earnings detail
  const [selectedPractId, setSelectedPractId] = useState('')

  const { data: listRes, isLoading } = usePractitionerList({
    page, limit: 20,
    profesi: profesiFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
  })
  const practitioners = listRes?.data ?? []
  const meta = listRes?.meta

  const { data: stats } = usePractitionerStats()
  const { data: feeSummary } = useFeeSummary()
  const { data: earningsData } = usePractitionerEarnings(selectedPractId)

  const createMut = useCreatePractitioner()
  const updateMut = useUpdatePractitioner()
  const deleteMut = useDeletePractitioner()

  const resetForm = () => {
    setEditId(null)
    setFNama('')
    setFProfesi('Fisioterapis')
    setFSpesialisasi('')
    setFNoSip('')
    setFNoStr('')
    setFInstansi('')
    setFTelepon('')
    setFEmail('')
    setFAlamat('')
    setFFeePersen('70')
    setFFeeRsPersen('30')
    setFKontrakMulai('')
    setFKontrakSelesai('')
    setFCatatan('')
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (p: Record<string, unknown>) => {
    setEditId(p.id as string)
    setFNama(p.nama as string || '')
    setFProfesi(p.profesi as string || 'Fisioterapis')
    setFSpesialisasi(p.spesialisasi as string || '')
    setFNoSip(p.no_sip as string || '')
    setFNoStr(p.no_str as string || '')
    setFInstansi(p.instansi_asal as string || '')
    setFTelepon(p.telepon as string || '')
    setFEmail(p.email as string || '')
    setFAlamat(p.alamat as string || '')
    setFFeePersen(String(p.fee_share_persen ?? 70))
    setFFeeRsPersen(String(p.fee_share_rs_persen ?? 30))
    setFKontrakMulai(p.kontrak_mulai ? (p.kontrak_mulai as string).split('T')[0] : '')
    setFKontrakSelesai(p.kontrak_selesai ? (p.kontrak_selesai as string).split('T')[0] : '')
    setFCatatan(p.catatan as string || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    const payload = {
      nama: fNama,
      profesi: fProfesi,
      spesialisasi: fSpesialisasi || undefined,
      no_sip: fNoSip || undefined,
      no_str: fNoStr || undefined,
      instansi_asal: fInstansi || undefined,
      telepon: fTelepon || undefined,
      email: fEmail || undefined,
      alamat: fAlamat || undefined,
      fee_share_persen: Number(fFeePersen),
      fee_share_rs_persen: Number(fFeeRsPersen),
      kontrak_mulai: fKontrakMulai || undefined,
      kontrak_selesai: fKontrakSelesai || undefined,
      catatan: fCatatan || undefined,
    }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, ...payload })
        toast.success('Tenaga luar berhasil diperbarui')
      } else {
        await createMut.mutateAsync(payload)
        toast.success('Tenaga luar berhasil ditambahkan')
      }
      setShowForm(false)
      resetForm()
    } catch (err) {
      toast.error((err as Error).message || 'Gagal menyimpan')
    }
  }

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus tenaga luar "${nama}"? Ini hanya bisa dilakukan jika belum ada order.`)) return
    try {
      await deleteMut.mutateAsync(id)
      toast.success('Tenaga luar dihapus')
    } catch (err) {
      toast.error((err as Error).message || 'Gagal menghapus')
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif'
    try {
      await updateMut.mutateAsync({ id, status: newStatus })
      toast.success(`Status diubah ke ${STATUS_LABELS[newStatus]}`)
    } catch (err) {
      toast.error((err as Error).message || 'Gagal mengubah status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenaga Kesehatan Luar</h1>
          <p className="text-muted-foreground">
            Kelola tenaga luar (fisioterapis, terapis wicara, dll) yang bekerja sama dengan RS
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Tenaga Luar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktif</p>
                <p className="text-xl font-bold">{stats?.aktif ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nonaktif</p>
                <p className="text-xl font-bold">{stats?.nonaktif ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kontrak Habis</p>
                <p className="text-xl font-bold">{stats?.kontrak_habis ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { id: 'list' as const, label: 'Daftar Tenaga Luar', icon: Users },
          { id: 'fees' as const, label: 'Laporan Jasa', icon: DollarSign },
        ].map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Create/Edit Dialog */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm() } }}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-2xl mx-4 bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-muted/30">
              <h2 className="text-base font-semibold">
                {editId ? 'Edit Tenaga Luar' : 'Tambah Tenaga Luar Baru'}
              </h2>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Identitas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nama *</label>
                  <input
                    type="text"
                    value={fNama}
                    onChange={(e) => setFNama(e.target.value)}
                    placeholder="Nama lengkap"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Profesi *</label>
                  <select
                    value={fProfesi}
                    onChange={(e) => setFProfesi(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  >
                    {PROFESI_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Spesialisasi</label>
                <input
                  type="text"
                  value={fSpesialisasi}
                  onChange={(e) => setFSpesialisasi(e.target.value)}
                  placeholder="Sub-spesialisasi (opsional)"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>

              {/* Surat & Instansi */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">No. SIP</label>
                  <input
                    type="text"
                    value={fNoSip}
                    onChange={(e) => setFNoSip(e.target.value)}
                    placeholder="Nomor SIP"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">No. STR</label>
                  <input
                    type="text"
                    value={fNoStr}
                    onChange={(e) => setFNoStr(e.target.value)}
                    placeholder="Nomor STR"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Instansi Asal</label>
                  <input
                    type="text"
                    value={fInstansi}
                    onChange={(e) => setFInstansi(e.target.value)}
                    placeholder="RS / Klinik asal"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Kontak */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Telepon</label>
                  <input
                    type="text"
                    value={fTelepon}
                    onChange={(e) => setFTelepon(e.target.value)}
                    placeholder="08..."
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email"
                    value={fEmail}
                    onChange={(e) => setFEmail(e.target.value)}
                    placeholder="email@..."
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Alamat</label>
                  <input
                    type="text"
                    value={fAlamat}
                    onChange={(e) => setFAlamat(e.target.value)}
                    placeholder="Alamat"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Fee Split & Kontrak */}
              <div>
                <p className="text-sm font-medium mb-3">Pembagian Jasa (Fee Split) & Kontrak</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">% Tenaga Luar</label>
                    <input
                      type="number" min={0} max={100}
                      value={fFeePersen}
                      onChange={(e) => {
                        setFFeePersen(e.target.value)
                        setFFeeRsPersen(String(100 - Number(e.target.value)))
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono text-right focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">% RS</label>
                    <input
                      type="number" min={0} max={100}
                      value={fFeeRsPersen}
                      onChange={(e) => {
                        setFFeeRsPersen(e.target.value)
                        setFFeePersen(String(100 - Number(e.target.value)))
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono text-right focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Kontrak Mulai</label>
                    <DateInput value={fKontrakMulai} onChange={setFKontrakMulai} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Kontrak Selesai</label>
                    <DateInput value={fKontrakSelesai} onChange={setFKontrakSelesai} />
                  </div>
                </div>
                {Number(fFeePersen) + Number(fFeeRsPersen) !== 100 && (
                  <p className="text-red-500 text-xs mt-2">⚠ Total persentase harus 100%</p>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Catatan</label>
                <input
                  type="text"
                  value={fCatatan}
                  onChange={(e) => setFCatatan(e.target.value)}
                  placeholder="Catatan tambahan (opsional)"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 bg-muted/30 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); resetForm() }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-accent"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!fNama || !fProfesi || Number(fFeePersen) + Number(fFeeRsPersen) !== 100 || createMut.isPending || updateMut.isPending}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : editId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Tab */}
      {tab === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Daftar Tenaga Luar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, instansi, spesialisasi..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-10"
                />
              </div>
              <Select
                className="w-[180px]"
                value={profesiFilter || 'all'}
                onChange={(e) => { setProfesiFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
              >
                <option value="all">Semua Profesi</option>
                {PROFESI_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
              <Select
                className="w-[150px]"
                value={statusFilter || 'all'}
                onChange={(e) => { setStatusFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1) }}
              >
                <option value="all">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
                <option value="kontrak_habis">Kontrak Habis</option>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : practitioners.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Belum ada tenaga luar terdaftar</p>
                <Button className="mt-3" size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Sekarang
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {practitioners.map((p) => (
                  <div
                    key={p.id}
                    className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{p.nama}</p>
                        <Badge variant="outline" className="text-xs shrink-0">{p.profesi}</Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || ''}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {p.spesialisasi && <span>{p.spesialisasi}</span>}
                        {p.instansi_asal && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />{p.instansi_asal}
                          </span>
                        )}
                        {p.telepon && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{p.telepon}
                          </span>
                        )}
                        {p.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />{p.email}
                          </span>
                        )}
                        {p.no_sip && <span>SIP: {p.no_sip}</span>}
                      </div>
                      {/* Contract & Fee info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1">
                        <span className="text-muted-foreground">
                          Fee: <span className="font-medium text-orange-600">{p.fee_share_persen}%</span>
                          {' / '}
                          <span className="font-medium text-teal-600">{p.fee_share_rs_persen}% RS</span>
                        </span>
                        {p.kontrak_mulai && (
                          <span className="text-muted-foreground">
                            Kontrak: {formatTanggal(p.kontrak_mulai)}
                            {p.kontrak_selesai && ` — ${formatTanggal(p.kontrak_selesai)}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        title={p.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                        onClick={() => handleToggleStatus(p.id, p.status)}
                      >
                        <Power className={`h-4 w-4 ${p.status === 'aktif' ? 'text-green-600' : 'text-gray-400'}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p as unknown as Record<string, unknown>)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(p.id, p.nama)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => { setSelectedPractId(p.id); setTab('fees') }}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Jasa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {practitioners.length} dari {meta.total}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Sebelumnya
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fees Tab */}
      {tab === 'fees' && (
        <div className="space-y-6">
          {/* Grand totals */}
          {feeSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">Total Sesi</p>
                  <p className="text-xl font-bold">{feeSummary.grandTotal.jumlah_sesi}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">Total Tarif</p>
                  <p className="text-lg font-bold">{formatRupiah(feeSummary.grandTotal.total_tarif)}</p>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">Bayar ke Tenaga Luar</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatRupiah(feeSummary.grandTotal.total_practitioner)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-teal-200">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground">Pendapatan RS</p>
                  <p className="text-lg font-bold text-teal-600">
                    {formatRupiah(feeSummary.grandTotal.total_rs)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Per-practitioner summary table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Ringkasan Jasa per Tenaga Luar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!feeSummary || feeSummary.practitioners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada data jasa
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Profesi</TableHead>
                        <TableHead>Instansi</TableHead>
                        <TableHead className="text-center">Sesi</TableHead>
                        <TableHead className="text-right">Total Tarif</TableHead>
                        <TableHead className="text-center">Split</TableHead>
                        <TableHead className="text-right">Jasa Tenaga Luar</TableHead>
                        <TableHead className="text-right">Jasa RS</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeSummary.practitioners.map((p) => (
                        <TableRow
                          key={p.id}
                          className={selectedPractId === p.id ? 'bg-teal-50' : ''}
                        >
                          <TableCell className="font-medium">{p.nama}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.profesi}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.instansi_asal || '-'}</TableCell>
                          <TableCell className="text-center font-mono">{Number(p.jumlah_sesi)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatRupiah(Number(p.total_tarif || 0))}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {p.fee_share_persen}% / {p.fee_share_rs_persen}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-orange-600 font-medium">
                            {formatRupiah(Number(p.total_practitioner || 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-teal-600 font-medium">
                            {formatRupiah(Number(p.total_rs || 0))}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setSelectedPractId(selectedPractId === p.id ? '' : p.id)}
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3}>TOTAL</TableCell>
                        <TableCell className="text-center">{feeSummary.grandTotal.jumlah_sesi}</TableCell>
                        <TableCell className="text-right">{formatRupiah(feeSummary.grandTotal.total_tarif)}</TableCell>
                        <TableCell />
                        <TableCell className="text-right text-orange-600">
                          {formatRupiah(feeSummary.grandTotal.total_practitioner)}
                        </TableCell>
                        <TableCell className="text-right text-teal-600">
                          {formatRupiah(feeSummary.grandTotal.total_rs)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected practitioner detail */}
          {selectedPractId && earningsData && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Detail Transaksi Jasa
                  <Badge variant="outline">{earningsData.totals.jumlah_sesi} sesi</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <p className="text-xs text-muted-foreground">Total Tarif</p>
                    <p className="font-bold">{formatRupiah(earningsData.totals.total_tarif)}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <p className="text-xs text-muted-foreground">Jasa Tenaga Luar</p>
                    <p className="font-bold text-orange-600">{formatRupiah(earningsData.totals.total_practitioner)}</p>
                  </div>
                  <div className="text-center p-3 bg-teal-50 rounded">
                    <p className="text-xs text-muted-foreground">Jasa RS</p>
                    <p className="font-bold text-teal-600">{formatRupiah(earningsData.totals.total_rs)}</p>
                  </div>
                </div>
                {earningsData.transactions.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead className="text-right">Tarif</TableHead>
                          <TableHead className="text-right">Tenaga Luar</TableHead>
                          <TableHead className="text-right">RS</TableHead>
                          <TableHead>Tanggal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {earningsData.transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm">{tx.deskripsi}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatRupiah(Number(tx.tarif_sesi))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-orange-600">
                              {formatRupiah(Number(tx.jumlah_practitioner))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-teal-600">
                              {formatRupiah(Number(tx.jumlah_rs))}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
