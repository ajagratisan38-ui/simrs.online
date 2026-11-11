'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  Save,
  BarChart3,
  Search,
  ChevronDown,
  Check,
  Loader2,
  UserX,
  AlertTriangle,
  X,
  RefreshCw,
  Stethoscope,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Select } from '@/components/ui/select'
import {
  type DoctorStatus,
  DOCTOR_STATUS_LABELS,
  DOCTOR_STATUS_COLORS,
} from '@/lib/api/doctors'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useDoctorDetail,
  useUpdateDoctor,
  useDeactivateDoctor,
  useReactivateDoctor,
  useUpsertSchedule,
  useDeleteSchedule,
  useToggleSchedule,
  useCreateFee,
  useUpdateFee,
  useDeleteFee,
  useDoctorEarnings,
} from '@/hooks/use-doctors'
import { useRooms } from '@/hooks/use-queues'

// ─── Dialog Overlay Component ──────────────────────────────────────────────────

function DialogOverlay({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        'relative bg-background rounded-xl shadow-2xl border w-full mx-4',
        maxWidth,
        'max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200',
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Poli Picker Component ─────────────────────────────────────────────────────

function PoliPicker({
  rooms,
  value,
  onChange,
}: {
  rooms: { id: string; nama: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = search
    ? rooms.filter((r) => r.nama.toLowerCase().includes(search.toLowerCase()))
    : rooms
  const selectedName = rooms.find((r) => r.id === value)?.nama || ''

  return (
    <div ref={ref} className="relative">
      <label className="text-xs text-muted-foreground mb-1 block">
        Poliklinik / Ruangan
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          !value && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{selectedName || '-- Pilih Poli --'}</span>
        <ChevronDown className={cn(
          'h-4 w-4 shrink-0 transition-transform',
          open && 'rotate-180',
        )} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full rounded-md border bg-background shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari poli..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Tidak ditemukan
              </div>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { onChange(r.id); setOpen(false); setSearch('') }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm',
                    'hover:bg-muted transition-colors',
                    value === r.id && 'bg-primary/10 text-primary font-medium',
                  )}
                >
                  {value === r.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                  <span className={value !== r.id ? 'pl-5' : ''}>{r.nama}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Edit Profile Dialog ───────────────────────────────────────────────────────

function EditProfileDialog({
  open,
  onClose,
  doctor,
  onSave,
  isPending,
}: {
  open: boolean
  onClose: () => void
  doctor: { spesialisasi?: string; no_sip?: string; no_str?: string; tarif_konsultasi?: number }
  onSave: (data: { spesialisasi?: string; no_sip?: string; no_str?: string; tarif_konsultasi?: number }) => void
  isPending: boolean
}) {
  const [spesialisasi, setSpesialisasi] = useState('')
  const [sip, setSip] = useState('')
  const [str, setStr] = useState('')
  const [tarif, setTarif] = useState('')

  useEffect(() => {
    if (open) {
      setSpesialisasi(doctor.spesialisasi || '')
      setSip(doctor.no_sip || '')
      setStr(doctor.no_str || '')
      setTarif(String(doctor.tarif_konsultasi ?? 0))
    }
  }, [open, doctor])

  return (
    <DialogOverlay open={open} onClose={onClose} title="Edit Profil Dokter">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Spesialisasi</label>
            <Input
              value={spesialisasi}
              onChange={(e) => setSpesialisasi(e.target.value)}
              placeholder="Contoh: Penyakit Dalam, Anak, Bedah"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Bidang keahlian dokter
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tarif Konsultasi (Rp)</label>
            <Input
              type="number"
              value={tarif}
              onChange={(e) => setTarif(e.target.value)}
              placeholder="150000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tarif dasar konsultasi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">No. SIP</label>
            <Input
              value={sip}
              onChange={(e) => setSip(e.target.value)}
              placeholder="Nomor Surat Izin Praktik"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">No. STR</label>
            <Input
              value={str}
              onChange={(e) => setStr(e.target.value)}
              placeholder="Nomor Surat Tanda Registrasi"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            onClick={() => onSave({
              spesialisasi: spesialisasi || undefined,
              no_sip: sip || undefined,
              no_str: str || undefined,
              tarif_konsultasi: Number(tarif) || 0,
            })}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            <Save className="h-4 w-4 mr-1.5" />
            Simpan
          </Button>
        </div>
      </div>
    </DialogOverlay>
  )
}

// ─── Status Change Dialog ──────────────────────────────────────────────────────

function StatusChangeDialog({
  open,
  onClose,
  currentStatus,
  onSave,
  isPending,
}: {
  open: boolean
  onClose: () => void
  currentStatus: DoctorStatus
  onSave: (status: DoctorStatus, note: string) => void
  isPending: boolean
}) {
  const [selected, setSelected] = useState<DoctorStatus>('aktif')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setSelected(currentStatus)
      setNote('')
    }
  }, [open, currentStatus])

  const isDeactivating = ['pindah', 'resign', 'pensiun'].includes(selected)
  const placeholders: Record<string, string> = {
    aktif: 'Opsional',
    cuti_panjang: 'Contoh: Cuti melahirkan 3 bulan',
    pindah: 'Contoh: Pindah ke RS Harapan Bunda per 1 Des 2026',
    resign: 'Contoh: Mengundurkan diri per 15 Nov 2026',
    pensiun: 'Contoh: Pensiun per 1 Jan 2027',
  }

  return (
    <DialogOverlay open={open} onClose={onClose} title="Ubah Status Kepegawaian">
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium mb-2 block">Pilih Status</label>
          <div className="grid grid-cols-1 gap-1.5">
            {(Object.entries(DOCTOR_STATUS_LABELS) as [DoctorStatus, string][]).map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelected(value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all text-left',
                    selected === value
                      ? 'border-primary bg-primary/5 font-medium ring-1 ring-primary/20'
                      : 'border-muted hover:bg-muted/50',
                  )}
                >
                  <span className={cn(
                    'h-3 w-3 rounded-full shrink-0',
                    value === 'aktif' && 'bg-green-500',
                    value === 'cuti_panjang' && 'bg-amber-500',
                    value === 'pindah' && 'bg-blue-500',
                    value === 'resign' && 'bg-red-500',
                    value === 'pensiun' && 'bg-gray-500',
                  )} />
                  <span className="flex-1">{label}</span>
                  {selected === value && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ),
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Keterangan
            {isDeactivating && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={placeholders[selected] || 'Opsional'}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={500}
          />
        </div>

        {isDeactivating && (
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3.5">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
              Dokter dengan status ini <b>tidak akan muncul</b> di pendaftaran,
              kiosk, dan daftar dokter tersedia.
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            variant={isDeactivating ? 'destructive' : 'default'}
            onClick={() => onSave(selected, note)}
            disabled={isPending || (isDeactivating && !note.trim())}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Simpan Status
          </Button>
        </div>
      </div>
    </DialogOverlay>
  )
}

// ─── Nonaktifkan Dialog ────────────────────────────────────────────────────────

function DeactivateDialog({
  open,
  onClose,
  doctorName,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  doctorName: string
  onConfirm: (reason: string) => void
  isPending: boolean
}) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <DialogOverlay open={open} onClose={onClose} title="Nonaktifkan Dokter">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4">
          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Menonaktifkan {doctorName}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              Tindakan ini akan:
            </p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
              <li>Menonaktifkan akun user dokter (tidak bisa login)</li>
              <li>Menonaktifkan semua jadwal praktik</li>
              <li>Menghilangkan dokter dari pendaftaran dan kiosk</li>
              <li>Data rekam medis dan riwayat <b>tetap tersimpan</b></li>
            </ul>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Alasan nonaktifkan <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Resign per 1 November 2026, Pindah ke RS lain"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={500}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Ya, Nonaktifkan
          </Button>
        </div>
      </div>
    </DialogOverlay>
  )
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const HARI_OPTIONS = [
  { value: 'senin', label: 'Senin' },
  { value: 'selasa', label: 'Selasa' },
  { value: 'rabu', label: 'Rabu' },
  { value: 'kamis', label: 'Kamis' },
  { value: 'jumat', label: 'Jumat' },
  { value: 'sabtu', label: 'Sabtu' },
  { value: 'minggu', label: 'Minggu' },
]

const HARI_LABELS: Record<string, string> = Object.fromEntries(
  HARI_OPTIONS.map((h) => [h.value, h.label]),
)

const KATEGORI_FEE = [
  'konsultasi',
  'tindakan',
  'operasi',
  'visite',
  'jaga',
  'lain-lain',
]

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function DoctorDetailPage() {
  const { doctorId } = useParams<{ doctorId: string }>()
  const { data: res, isLoading } = useDoctorDetail(doctorId)
  const { data: roomsRes } = useRooms()
  const rooms = roomsRes?.data ?? []
  const doctor = res?.data

  const updateMut = useUpdateDoctor()
  const deactivateMut = useDeactivateDoctor()
  const reactivateMut = useReactivateDoctor()
  const upsertSchedMut = useUpsertSchedule()
  const deleteSchedMut = useDeleteSchedule()
  const toggleSchedMut = useToggleSchedule()
  const createFeeMut = useCreateFee()
  const updateFeeMut = useUpdateFee()
  const deleteFeeMut = useDeleteFee()

  // Dialog states
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showStatusChange, setShowStatusChange] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)

  // Schedule form
  const [showSchedForm, setShowSchedForm] = useState(false)
  const [schedRoom, setSchedRoom] = useState('')
  const [schedHari, setSchedHari] = useState('senin')
  const [schedMulai, setSchedMulai] = useState('08:00')
  const [schedSelesai, setSchedSelesai] = useState('14:00')
  const [schedKuota, setSchedKuota] = useState('30')

  // Fee form
  const [showFeeForm, setShowFeeForm] = useState(false)
  const [feeKode, setFeeKode] = useState('')
  const [feeNama, setFeeNama] = useState('')
  const [feeKategori, setFeeKategori] = useState('konsultasi')
  const [feeTarif, setFeeTarif] = useState('')
  const [feePersen, setFeePersen] = useState('80')

  // Tab + earnings
  const [activeTab, setActiveTab] = useState<'jadwal' | 'tarif' | 'jasa'>('jadwal')
  const [earningsStart, setEarningsStart] = useState('')
  const [earningsEnd, setEarningsEnd] = useState('')
  const { data: earningsRes } = useDoctorEarnings(
    doctorId,
    activeTab === 'jasa'
      ? { start: earningsStart || undefined, end: earningsEnd || undefined }
      : undefined,
  )
  const earnings = earningsRes?.data

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n)

  // Handlers
  const handleSaveProfile = useCallback(
    async (data: { spesialisasi?: string; no_sip?: string; no_str?: string; tarif_konsultasi?: number }) => {
      try {
        await updateMut.mutateAsync({ id: doctorId, data })
        toast.success('Data dokter berhasil diperbarui')
        setShowEditProfile(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal menyimpan data')
      }
    },
    [doctorId, updateMut],
  )

  const handleStatusChange = useCallback(
    async (status: DoctorStatus, note: string) => {
      try {
        await updateMut.mutateAsync({
          id: doctorId,
          data: { status, status_note: note || undefined },
        })
        toast.success(`Status dokter diubah → ${DOCTOR_STATUS_LABELS[status]}`)
        setShowStatusChange(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal mengubah status')
      }
    },
    [doctorId, updateMut],
  )

  const handleDeactivate = useCallback(
    async (reason: string) => {
      try {
        await deactivateMut.mutateAsync({ id: doctorId, reason })
        toast.success('Dokter berhasil dinonaktifkan')
        setShowDeactivate(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal menonaktifkan dokter')
      }
    },
    [doctorId, deactivateMut],
  )

  const handleReactivate = useCallback(async () => {
    if (!confirm(
      `Aktifkan kembali dokter ${doctor?.nama}?\n\nAkun user akan diaktifkan dan dokter akan muncul kembali di pendaftaran.`,
    )) return
    try {
      await reactivateMut.mutateAsync(doctorId)
      toast.success('Dokter berhasil diaktifkan kembali')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengaktifkan dokter')
    }
  }, [doctorId, doctor?.nama, reactivateMut])

  const handleToggleAvailability = useCallback(() => {
    if (!doctor) return
    const next = !doctor.is_available
    const label = next ? 'Tersedia' : 'Cuti / Tidak Tersedia'
    if (!confirm(
      `Ubah status dokter ${doctor.nama} menjadi "${label}"?\n\n${
        !next
          ? 'Dokter tidak akan muncul di pendaftaran dan kiosk selama status ini aktif.'
          : 'Dokter akan kembali muncul di pendaftaran dan kiosk.'
      }`,
    )) return
    updateMut.mutate(
      { id: doctorId, data: { is_available: next } },
      {
        onSuccess: () => toast.success(`Status dokter diubah → ${label}`),
        onError: (err) => toast.error(
          err instanceof Error ? err.message : 'Gagal mengubah status',
        ),
      },
    )
  }, [doctor, doctorId, updateMut])

  const handleSaveSchedule = async () => {
    if (!schedRoom) return toast.error('Pilih poli/ruangan')
    try {
      await upsertSchedMut.mutateAsync({
        doctorId,
        data: {
          room_id: schedRoom,
          hari: schedHari,
          jam_mulai: schedMulai,
          jam_selesai: schedSelesai,
          kuota: Number(schedKuota) || 30,
        },
      })
      toast.success('Jadwal berhasil disimpan')
      setShowSchedForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal simpan jadwal')
    }
  }

  const handleSaveFee = async () => {
    if (!feeKode || !feeNama || !feeTarif)
      return toast.error('Lengkapi semua field')
    try {
      await createFeeMut.mutateAsync({
        doctorId,
        data: {
          kode: feeKode,
          nama_layanan: feeNama,
          kategori: feeKategori,
          tarif: Number(feeTarif),
          persentase_dokter: Number(feePersen),
          persentase_rs: 100 - Number(feePersen),
        },
      })
      toast.success('Tarif layanan berhasil ditambah')
      setShowFeeForm(false)
      setFeeKode('')
      setFeeNama('')
      setFeeTarif('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal tambah tarif')
    }
  }

  // ─── Loading & empty ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Dokter tidak ditemukan
      </div>
    )
  }

  const statusColor = DOCTOR_STATUS_COLORS[doctor.status] || 'gray'
  const isDeactivated = !!doctor.deleted_at

  return (
    <div className="space-y-6">
      {/* ─── Dialogs ───────────────────────────────────────────────────── */}
      <EditProfileDialog
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        doctor={doctor}
        onSave={handleSaveProfile}
        isPending={updateMut.isPending}
      />
      <StatusChangeDialog
        open={showStatusChange}
        onClose={() => setShowStatusChange(false)}
        currentStatus={doctor.status || 'aktif'}
        onSave={handleStatusChange}
        isPending={updateMut.isPending}
      />
      <DeactivateDialog
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        doctorName={doctor.nama}
        onConfirm={handleDeactivate}
        isPending={deactivateMut.isPending}
      />

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div>
        <Link href="/admin/dokter">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali
          </Button>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar */}
            <div className={cn(
              'h-14 w-14 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0',
              isDeactivated ? 'bg-red-400' : doctor.is_available ? 'bg-teal-500' : 'bg-gray-400',
            )}>
              {doctor.nama.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{doctor.nama}</h1>
              <p className="text-sm text-muted-foreground">
                {doctor.spesialisasi || 'Umum'}
                {doctor.no_sip && ` • SIP: ${doctor.no_sip}`}
                {doctor.no_str && ` • STR: ${doctor.no_str}`}
              </p>
            </div>
          </div>

          {/* Availability Toggle */}
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-2 font-medium border-2 transition-colors shrink-0',
              doctor.is_available
                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:bg-green-900/20 dark:text-green-400'
                : 'border-red-300 bg-red-50 text-red-700 hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:bg-red-900/20 dark:text-red-400',
            )}
            disabled={updateMut.isPending || isDeactivated}
            onClick={handleToggleAvailability}
          >
            {updateMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : doctor.is_available ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            {doctor.is_available ? 'Tersedia' : 'Cuti / Tidak Tersedia'}
          </Button>
        </div>
      </div>

      {/* ─── Status & Deactivated Banners ──────────────────────────────── */}
      {isDeactivated && (
        <div className="flex items-center gap-3 rounded-lg border-2 border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3">
          <UserX className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-700 dark:text-red-400">
              Dokter Dinonaktifkan
            </div>
            <div className="text-xs text-red-600 dark:text-red-400/80">
              Sejak {new Date(doctor.deleted_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              {doctor.status_note && ` — ${doctor.status_note}`}
            </div>
            <div className="text-xs text-red-600/70 dark:text-red-400/60 mt-0.5">
              Akun user dinonaktifkan, semua jadwal dimatikan, tidak muncul di pendaftaran.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
            onClick={handleReactivate}
            disabled={reactivateMut.isPending}
          >
            {reactivateMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Aktifkan Kembali
          </Button>
        </div>
      )}

      {doctor.status && doctor.status !== 'aktif' && !isDeactivated && (
        <div className={cn(
          'flex items-center gap-3 rounded-lg border px-4 py-3',
          doctor.status === 'cuti_panjang' && 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20',
          doctor.status === 'pindah' && 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20',
          doctor.status === 'resign' && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20',
          doctor.status === 'pensiun' && 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/20',
        )}>
          <UserX className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              Status: {DOCTOR_STATUS_LABELS[doctor.status]}
            </div>
            {doctor.status_note && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {doctor.status_note}
              </div>
            )}
            {doctor.status_changed_at && (
              <div className="text-xs text-muted-foreground">
                Sejak {new Date(doctor.status_changed_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Profile Card ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 flex-1">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Spesialisasi</div>
                <div className="text-sm font-medium">{doctor.spesialisasi || 'Umum'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">No. SIP</div>
                <div className="text-sm font-medium font-mono">{doctor.no_sip || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">No. STR</div>
                <div className="text-sm font-medium font-mono">{doctor.no_str || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Tarif Konsultasi</div>
                <div className="text-sm font-bold text-teal-600">
                  {formatRupiah(Number(doctor.tarif_konsultasi))}
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-1 shrink-0 ml-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowEditProfile(true)}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setShowStatusChange(true)}
              >
                <Shield className="h-3.5 w-3.5" />
                Status
              </Button>
              {!isDeactivated && (
                <>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowDeactivate(true)}
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Tarif Konsultasi</div>
            <div className="text-xl font-bold text-teal-600">
              {formatRupiah(Number(doctor.tarif_konsultasi))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Jadwal Aktif</div>
            <div className="text-xl font-bold">
              {doctor.schedules.filter((s) => s.is_active).length} hari
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Tarif Layanan</div>
            <div className="text-xl font-bold">
              {doctor.fees.filter((f) => f.is_active).length} item
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b">
        {[
          { key: 'jadwal' as const, label: 'Jadwal Praktik', icon: Calendar },
          { key: 'tarif' as const, label: 'Tarif Layanan', icon: DollarSign },
          { key: 'jasa' as const, label: 'Jasa Medis', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
              'border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── JADWAL TAB ────────────────────────────────────────────────── */}
      {activeTab === 'jadwal' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowSchedForm(!showSchedForm)}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Jadwal
            </Button>
          </div>

          {showSchedForm && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <PoliPicker
                  rooms={rooms}
                  value={schedRoom}
                  onChange={setSchedRoom}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Hari</label>
                    <Select
                      value={schedHari}
                      onChange={(e) => setSchedHari(e.target.value)}
                    >
                      {HARI_OPTIONS.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Jam Mulai
                    </label>
                    <Input
                      type="time"
                      value={schedMulai}
                      onChange={(e) => setSchedMulai(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Jam Selesai
                    </label>
                    <Input
                      type="time"
                      value={schedSelesai}
                      onChange={(e) => setSchedSelesai(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Kuota</label>
                    <Input
                      type="number"
                      value={schedKuota}
                      onChange={(e) => setSchedKuota(e.target.value)}
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveSchedule}
                    disabled={upsertSchedMut.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Simpan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSchedForm(false)}
                  >
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {doctor.schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada jadwal praktik
            </div>
          ) : (
            <div className="space-y-2">
              {doctor.schedules.map((sched) => (
                <div
                  key={sched.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg border',
                    !sched.is_active && 'opacity-50',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 font-medium text-sm">
                      {HARI_LABELS[sched.hari] || sched.hari}
                    </div>
                    <Badge variant="outline">
                      {sched.jam_mulai.slice(0, 5)} - {sched.jam_selesai.slice(0, 5)}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {sched.room_nama}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Kuota: {sched.kuota}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleSchedMut.mutate(
                          { id: sched.id, isActive: !sched.is_active },
                          { onSuccess: () => toast.success('Status jadwal diubah') },
                        )
                      }
                    >
                      {sched.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteSchedMut.mutate(sched.id, {
                          onSuccess: () => toast.success('Jadwal dihapus'),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TARIF TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'tarif' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowFeeForm(!showFeeForm)}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Tarif
            </Button>
          </div>

          {showFeeForm && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Input
                    value={feeKode}
                    onChange={(e) => setFeeKode(e.target.value)}
                    placeholder="Kode (misal: KSL-001)"
                  />
                  <Input
                    value={feeNama}
                    onChange={(e) => setFeeNama(e.target.value)}
                    placeholder="Nama Layanan"
                  />
                  <Select
                    value={feeKategori}
                    onChange={(e) => setFeeKategori(e.target.value)}
                  >
                    {KATEGORI_FEE.map((k) => (
                      <option key={k} value={k}>
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    value={feeTarif}
                    onChange={(e) => setFeeTarif(e.target.value)}
                    placeholder="Tarif (Rp)"
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={feePersen}
                      onChange={(e) => setFeePersen(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      % dokter
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveFee}
                    disabled={createFeeMut.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Simpan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFeeForm(false)}
                  >
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {doctor.fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada tarif layanan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Kode</th>
                    <th className="py-2 pr-4">Nama Layanan</th>
                    <th className="py-2 pr-4">Kategori</th>
                    <th className="py-2 pr-4 text-right">Tarif</th>
                    <th className="py-2 pr-4 text-center">% Dokter</th>
                    <th className="py-2 pr-4 text-center">% RS</th>
                    <th className="py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {doctor.fees.map((fee) => (
                    <tr
                      key={fee.id}
                      className={cn('border-b', !fee.is_active && 'opacity-50')}
                    >
                      <td className="py-2.5 pr-4 font-mono text-xs">{fee.kode}</td>
                      <td className="py-2.5 pr-4">{fee.nama_layanan}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {fee.kategori}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium">
                        {formatRupiah(Number(fee.tarif))}
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        {fee.persentase_dokter}%
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        {fee.persentase_rs}%
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateFeeMut.mutate(
                                {
                                  feeId: fee.id,
                                  data: { is_active: !fee.is_active },
                                },
                                {
                                  onSuccess: () =>
                                    toast.success('Status tarif diubah'),
                                },
                              )
                            }
                          >
                            {fee.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              deleteFeeMut.mutate(fee.id, {
                                onSuccess: () => toast.success('Tarif dihapus'),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── JASA MEDIS TAB ────────────────────────────────────────────── */}
      {activeTab === 'jasa' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Dari:</label>
              <DateInput
                value={earningsStart}
                onChange={(val) => setEarningsStart(val)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Sampai:</label>
              <DateInput
                value={earningsEnd}
                onChange={(val) => setEarningsEnd(val)}
                className="w-40"
              />
            </div>
          </div>

          {earnings?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Total Transaksi</div>
                  <div className="text-lg font-bold">
                    {earnings.summary.total_transaksi}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Total Tarif</div>
                  <div className="text-lg font-bold">
                    {formatRupiah(earnings.summary.total_tarif)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Jasa Dokter</div>
                  <div className="text-lg font-bold text-teal-600">
                    {formatRupiah(earnings.summary.total_jasa_dokter)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Jasa RS</div>
                  <div className="text-lg font-bold">
                    {formatRupiah(earnings.summary.total_jasa_rs)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {earnings?.transactions && earnings.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Tanggal</th>
                    <th className="py-2 pr-4">No. Kunjungan</th>
                    <th className="py-2 pr-4">Pasien</th>
                    <th className="py-2 pr-4">Deskripsi</th>
                    <th className="py-2 pr-4 text-right">Tarif</th>
                    <th className="py-2 pr-4 text-right">Jasa Dokter</th>
                    <th className="py-2 text-right">Jasa RS</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b">
                      <td className="py-2 pr-4 text-xs">
                        {tx.tanggal
                          ? new Date(tx.tanggal).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {tx.visit_number}
                      </td>
                      <td className="py-2 pr-4">{tx.patient_nama}</td>
                      <td className="py-2 pr-4">{tx.deskripsi}</td>
                      <td className="py-2 pr-4 text-right">
                        {formatRupiah(Number(tx.tarif))}
                      </td>
                      <td className="py-2 pr-4 text-right text-teal-600">
                        {formatRupiah(Number(tx.jumlah_dokter))}
                      </td>
                      <td className="py-2 text-right">
                        {formatRupiah(Number(tx.jumlah_rs))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data jasa medis
              {(earningsStart || earningsEnd) && ' untuk periode ini'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
