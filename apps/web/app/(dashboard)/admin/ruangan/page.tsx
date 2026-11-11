'use client'

import { useState } from 'react'
import {
  Building2, Plus, Search, Power, PowerOff,
  Trash2, Pencil, Loader2, X, Save,
  Stethoscope, Siren, BedDouble, FlaskConical,
  ScanLine, Pill, Scissors, AlertTriangle,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useAllRooms,
  useRoomStats,
  useToggleRoom,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
} from '@/hooks/use-inpatient'
import {
  type RoomType,
  type InpatientRoom,
  ROOM_TYPE_LABELS,
} from '@/lib/api/inpatient'

const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'poli', label: 'Poliklinik' },
  { value: 'igd', label: 'IGD' },
  { value: 'rawat_inap', label: 'Rawat Inap' },
  { value: 'lab', label: 'Laboratorium' },
  { value: 'radiologi', label: 'Radiologi' },
  { value: 'farmasi', label: 'Farmasi' },
  { value: 'operasi', label: 'Kamar Operasi' },
]

const TIPE_ICONS: Record<RoomType, React.ReactNode> = {
  poli: <Stethoscope className="h-4 w-4" />,
  igd: <Siren className="h-4 w-4" />,
  rawat_inap: <BedDouble className="h-4 w-4" />,
  lab: <FlaskConical className="h-4 w-4" />,
  radiologi: <ScanLine className="h-4 w-4" />,
  farmasi: <Pill className="h-4 w-4" />,
  operasi: <Scissors className="h-4 w-4" />,
}

const TIPE_COLORS: Record<RoomType, string> = {
  poli: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  igd: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  rawat_inap: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  lab: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  radiologi: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
  farmasi: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  operasi: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30',
}

function formatRupiah(n: number | string) {
  const num = Math.round(Number(n) || 0)
  return `Rp ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

// ==================== ROOM FORM MODAL ====================

function RoomFormModal({
  room,
  onClose,
  onSave,
  saving,
}: {
  room?: InpatientRoom | null
  onClose: () => void
  onSave: (data: {
    kode: string; nama: string; tipe: RoomType; lantai: number | null
    kapasitas: number; tarif_per_hari: number; kelas?: string
  }) => void
  saving: boolean
}) {
  const isEdit = !!room
  const [kode, setKode] = useState(room?.kode ?? '')
  const [nama, setNama] = useState(room?.nama ?? '')
  const [tipe, setTipe] = useState<RoomType>(room?.tipe ?? 'poli')
  const [lantai, setLantai] = useState(String(room?.lantai ?? ''))
  const [kapasitas, setKapasitas] = useState(String(room?.kapasitas ?? 1))
  const [tarif, setTarif] = useState(String(room?.tarif_per_hari ?? 0))
  const [kelas, setKelas] = useState(String(room?.kelas ?? ''))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!kode.trim() || !nama.trim()) {
      toast.error('Kode dan nama ruangan wajib diisi')
      return
    }
    onSave({
      kode: kode.trim(),
      nama: nama.trim(),
      tipe,
      lantai: lantai ? Number(lantai) : null,
      kapasitas: Math.max(1, Number(kapasitas) || 1),
      tarif_per_hari: Number(tarif) || 0,
      kelas: kelas || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b bg-muted/30">
          <h3 className="text-base font-semibold flex items-center gap-2">
            {isEdit
              ? <Pencil className="h-5 w-5 text-primary" />
              : <Plus className="h-5 w-5 text-primary" />}
            {isEdit ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipe */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Tipe Ruangan *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ROOM_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipe(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-xs transition-all',
                    tipe === opt.value
                      ? 'border-primary bg-primary/5 font-semibold'
                      : 'border-muted hover:border-primary/30',
                    isEdit && 'opacity-60 pointer-events-none',
                  )}
                >
                  <span className={cn(
                    'h-7 w-7 rounded-md flex items-center justify-center',
                    TIPE_COLORS[opt.value],
                  )}>
                    {TIPE_ICONS[opt.value]}
                  </span>
                  <span className="truncate w-full text-center">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Kode Ruangan *
              </label>
              <Input
                value={kode}
                onChange={(e) => setKode(e.target.value.toUpperCase())}
                placeholder="POLI-01"
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Nama Ruangan *
              </label>
              <Input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Poli Umum"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Lantai
              </label>
              <Input
                type="number" min="0" max="99"
                value={lantai}
                onChange={(e) => setLantai(e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {tipe === 'rawat_inap' ? 'Kapasitas Bed' : 'Kapasitas'}
              </label>
              <Input
                type="number" min="1" max="200"
                value={kapasitas}
                onChange={(e) => setKapasitas(e.target.value)}
              />
              {tipe === 'rawat_inap' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Beds otomatis dibuat
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Kelas BPJS
              </label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm h-10"
              >
                <option value="">Tidak diset</option>
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Tarif / Hari
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Rp
              </span>
              <Input
                type="number" min="0"
                value={tarif}
                onChange={(e) => setTarif(e.target.value)}
                className="pl-9"
                placeholder="200000"
              />
            </div>
            {Number(tarif) > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {formatRupiah(tarif)} per hari
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-1" />
              {isEdit ? 'Simpan' : 'Buat Ruangan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== ROOM CARD ====================

function RoomCard({
  room,
  onEdit,
  onToggle,
  onDelete,
  toggling,
  deleting,
}: {
  room: InpatientRoom
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  toggling: boolean
  deleting: boolean
}) {
  const tipe = room.tipe as RoomType
  const hasBeds = room.total_beds > 0
  const occupancy = room.total_beds > 0
    ? Math.round((room.occupied_beds / room.total_beds) * 100)
    : 0

  return (
    <div className={cn(
      'rounded-xl border-2 p-4 transition-all relative',
      room.is_active
        ? 'border-border bg-card hover:shadow-md'
        : 'border-dashed border-muted-foreground/20 bg-muted/30 opacity-70',
    )}>
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        {room.is_active ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aktif
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 text-[10px]">
            <XCircle className="h-3 w-3 mr-1" />
            Nonaktif
          </Badge>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
          TIPE_COLORS[tipe] || 'text-slate-600 bg-slate-100',
        )}>
          {TIPE_ICONS[tipe] || <Building2 className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <h3 className="text-sm font-semibold truncate">{room.nama}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[10px] font-mono">
              {room.kode}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {ROOM_TYPE_LABELS[tipe] || tipe}
            </span>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
        {room.lantai !== null && <span>Lt. {room.lantai}</span>}
        {Number(room.tarif_per_hari) > 0 && (
          <span>{formatRupiah(room.tarif_per_hari)}/hari</span>
        )}
        {room.kelas && (
          <span>Kelas {room.kelas}</span>
        )}
        <span>Kapasitas: {room.kapasitas}</span>
      </div>

      {/* Bed bar (only for rawat_inap with beds) */}
      {tipe === 'rawat_inap' && hasBeds && (
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Bed: {room.occupied_beds}/{room.total_beds} terisi</span>
            {room.maintenance_beds > 0 && (
              <span className="text-amber-600">{room.maintenance_beds} maint.</span>
            )}
            <span className={cn(
              'font-semibold',
              occupancy >= 90 ? 'text-red-600'
                : occupancy >= 70 ? 'text-amber-600'
                  : 'text-emerald-600',
            )}>
              {occupancy}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                occupancy >= 90 ? 'bg-red-500'
                  : occupancy >= 70 ? 'bg-amber-500'
                    : 'bg-emerald-500',
              )}
              style={{ width: `${occupancy}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline" size="sm"
          className="h-8 text-xs flex-1"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3 mr-1" /> Edit
        </Button>
        <Button
          variant="outline" size="sm"
          className={cn(
            'h-8 text-xs flex-1',
            room.is_active
              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
          )}
          onClick={onToggle}
          disabled={toggling}
        >
          {toggling ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : room.is_active ? (
            <PowerOff className="h-3 w-3 mr-1" />
          ) : (
            <Power className="h-3 w-3 mr-1" />
          )}
          {room.is_active ? 'Nonaktifkan' : 'Aktifkan'}
        </Button>
        <Button
          variant="outline" size="sm"
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
          onClick={onDelete}
          disabled={deleting || room.occupied_beds > 0}
          title={room.occupied_beds > 0 ? 'Ada bed terisi' : 'Hapus'}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function ManajemenRuanganPage() {
  const [filterTipe, setFilterTipe] = useState<RoomType | ''>('')
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(true)
  const [formModal, setFormModal] = useState<{
    open: boolean; room: InpatientRoom | null
  }>({ open: false, room: null })

  const { data: rooms, isLoading } = useAllRooms({
    tipe: filterTipe || undefined,
    includeInactive: showInactive,
  })
  const { data: stats } = useRoomStats()

  const toggleMut = useToggleRoom()
  const createMut = useCreateRoom()
  const updateMut = useUpdateRoom()
  const deleteMut = useDeleteRoom()

  const filtered = (rooms ?? []).filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return r.nama.toLowerCase().includes(q)
      || r.kode.toLowerCase().includes(q)
  })

  const handleSave = async (data: {
    kode: string; nama: string; tipe: RoomType; lantai: number | null
    kapasitas: number; tarif_per_hari: number; kelas?: string
  }) => {
    try {
      if (formModal.room) {
        await updateMut.mutateAsync({
          roomId: formModal.room.id,
          kode: data.kode,
          nama: data.nama,
          lantai: data.lantai,
          kapasitas: data.kapasitas,
          tarif_per_hari: data.tarif_per_hari,
          kelas: data.kelas,
        })
        toast.success(`Ruangan ${data.nama} diperbarui`)
      } else {
        await createMut.mutateAsync(data)
        toast.success(`Ruangan ${data.nama} berhasil dibuat`)
      }
      setFormModal({ open: false, room: null })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  const handleToggle = async (room: InpatientRoom) => {
    const action = room.is_active ? 'menonaktifkan' : 'mengaktifkan'
    if (room.is_active && room.occupied_beds > 0) {
      toast.error(`Tidak bisa nonaktifkan — ada ${room.occupied_beds} bed terisi`)
      return
    }
    if (!confirm(`Yakin ingin ${action} ruangan "${room.nama}"?`)) return
    try {
      const result = await toggleMut.mutateAsync(room.id)
      toast.success(
        `${room.nama} ${result.is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Gagal ${action}`)
    }
  }

  const handleDelete = async (room: InpatientRoom) => {
    if (room.occupied_beds > 0) {
      toast.error('Tidak bisa hapus — ada bed terisi pasien')
      return
    }
    if (!confirm(
      `Hapus ruangan "${room.nama}" (${room.kode})?\n\nSemua bed di dalamnya juga akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
    )) return
    try {
      await deleteMut.mutateAsync(room.id)
      toast.success(`Ruangan ${room.nama} dihapus`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Manajemen Ruangan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola semua ruangan, poli, lab, dan unit RS — aktifkan atau nonaktifkan sesuai kebutuhan
          </p>
        </div>
        <Button onClick={() => setFormModal({ open: true, room: null })}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Ruangan
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="text-lg font-bold">{stats.totalRooms}</div>
              <div className="text-xs text-muted-foreground">Total Ruangan</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-emerald-600">{stats.totalAktif}</div>
              <div className="text-xs text-muted-foreground">Aktif</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-lg font-bold text-red-600">{stats.totalNonaktif}</div>
              <div className="text-xs text-muted-foreground">Nonaktif</div>
            </CardContent>
          </Card>

          {/* Per tipe breakdown */}
          {stats.perTipe.slice(0, 2).map((item) => (
            <Card key={item.tipe}>
              <CardContent className="p-4">
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center mb-2',
                  TIPE_COLORS[item.tipe as RoomType] || 'bg-slate-100 text-slate-600',
                )}>
                  {TIPE_ICONS[item.tipe as RoomType] || <Building2 className="h-4 w-4" />}
                </div>
                <div className="text-lg font-bold">{item.aktif}/{item.total}</div>
                <div className="text-xs text-muted-foreground">
                  {ROOM_TYPE_LABELS[item.tipe as RoomType] || item.tipe}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Per-tipe summary pills */}
      {stats && stats.perTipe.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.perTipe.map((item) => {
            const t = item.tipe as RoomType
            return (
              <button
                key={t}
                onClick={() => setFilterTipe(filterTipe === t ? '' : t)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                  filterTipe === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted hover:border-primary/30',
                )}
              >
                <span className={cn(
                  'h-5 w-5 rounded flex items-center justify-center',
                  TIPE_COLORS[t],
                )}>
                  {TIPE_ICONS[t]}
                </span>
                {ROOM_TYPE_LABELS[t]}
                <Badge variant="secondary" className="text-[10px] px-1.5 ml-0.5">
                  {item.aktif}/{item.total}
                </Badge>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau kode ruangan..."
            className="pl-9"
          />
        </div>

        <select
          value={filterTipe}
          onChange={(e) => setFilterTipe(e.target.value as RoomType | '')}
          className="rounded-lg border bg-background px-3 py-2 text-sm h-10"
        >
          <option value="">Semua Tipe</option>
          {ROOM_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-muted-foreground/30"
          />
          <span className="text-muted-foreground">Tampilkan nonaktif</span>
        </label>

        {(filterTipe || search) && (
          <Button
            variant="ghost" size="sm"
            onClick={() => { setFilterTipe(''); setSearch('') }}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" /> Reset Filter
          </Button>
        )}
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 h-40 animate-pulse bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium mb-1">
              {search || filterTipe ? 'Tidak ada ruangan ditemukan' : 'Belum ada ruangan'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {search || filterTipe
                ? 'Coba ubah filter pencarian'
                : 'Mulai dengan menambahkan ruangan pertama'}
            </p>
            {!search && !filterTipe && (
              <Button
                size="sm"
                onClick={() => setFormModal({ open: true, room: null })}
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah Ruangan
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} ruangan
              {filterTipe && ` · ${ROOM_TYPE_LABELS[filterTipe]}`}
              {search && ` · "${search}"`}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onEdit={() => setFormModal({ open: true, room })}
                onToggle={() => handleToggle(room)}
                onDelete={() => handleDelete(room)}
                toggling={toggleMut.isPending}
                deleting={deleteMut.isPending}
              />
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      {formModal.open && (
        <RoomFormModal
          room={formModal.room}
          onClose={() => setFormModal({ open: false, room: null })}
          onSave={handleSave}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  )
}
