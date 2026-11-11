'use client'

import { useEffect, useState } from 'react'
import {
  BedDouble, Building2, Users, Activity, Wrench,
  ArrowRightLeft, LogOut, Loader2,
  ChevronRight, AlertTriangle, CheckCircle2,
  Plus, X, Settings,
  UserPlus, Search,
  HeartPulse, Ambulance, Skull, HelpCircle, ShieldAlert, Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useInpatientSummary,
  useInpatientRooms,
  useBedsByRoom,
  useDischargePatient,
  useToggleBedMaintenance,
  useTransferBed,
  useAssignBed,
  useAddBed,
  useRemoveBed,
} from '@/hooks/use-inpatient'
import { usePermissions } from '@/hooks/use-permissions'
import { listVisits, type VisitData } from '@/lib/api/registration'
import type { InpatientBed, InpatientRoom, CaraKeluar } from '@/lib/api/inpatient'

function formatRupiah(n: number | string) {
  const num = Math.round(Number(n) || 0)
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${formatted}`
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function daysSince(d: string | null) {
  if (!d) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000))
}

// ==================== ADMISI MODAL ====================

function AdmisiModal({
  bed,
  onClose,
}: {
  bed: InpatientBed
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [allVisits, setAllVisits] = useState<VisitData[]>([])
  const [loading, setLoading] = useState(true)
  const assignMut = useAssignBed()

  useEffect(() => {
    const fetchVisits = async () => {
      setLoading(true)
      try {
        const today = new Date().toISOString().split('T')[0]
        const [resDiperiksa, resMenunggu, resRawatInap] = await Promise.all([
          listVisits({ tanggal: today, status: 'diperiksa', limit: 50 }),
          listVisits({ tanggal: today, status: 'menunggu', limit: 50 }),
          listVisits({ tanggal: today, status: 'rawat_inap', limit: 50 }),
        ])
        const riWithoutBed = (resRawatInap.data ?? []).filter(
          (v) => !v.bed_id,
        )
        setAllVisits([
          ...riWithoutBed,
          ...(resDiperiksa.data ?? []),
          ...(resMenunggu.data ?? []),
        ])
      } catch {
        toast.error('Gagal memuat data kunjungan')
      } finally {
        setLoading(false)
      }
    }
    fetchVisits()
  }, [])

  const filtered = search.trim()
    ? allVisits.filter((v) => {
      const q = search.toLowerCase()
      return (
        v.patient_nama?.toLowerCase().includes(q)
        || v.no_rekam_medis?.toLowerCase().includes(q)
        || v.visit_number?.toLowerCase().includes(q)
      )
    })
    : allVisits

  const handleAssign = async (visit: VisitData) => {
    try {
      await assignMut.mutateAsync({
        bedId: bed.id,
        patientId: visit.patient_id,
        visitId: visit.id,
      })
      toast.success(
        `${visit.patient_nama} berhasil diadmisi ke bed ${bed.nomor}`,
      )
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal admisi pasien')
    }
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
            <UserPlus className="h-5 w-5 text-primary" />
            Admisi Pasien ke Bed
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pilih pasien untuk diadmisi ke{' '}
            <strong>{bed.nomor}</strong> — {bed.room_nama}
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Search filter */}
          {allVisits.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter nama / no RM / no visit..."
                className="pl-9"
                autoFocus
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Memuat daftar pasien...
              </p>
            </div>
          )}

          {/* Empty */}
          {!loading && allVisits.length === 0 && (
            <div className="text-center py-6">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-400" />
              <p className="text-sm text-muted-foreground">
                Tidak ada pasien yang bisa diadmisi hari ini
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Pasien harus sudah terdaftar (status: menunggu, diperiksa, atau disposisi rawat inap)
              </p>
            </div>
          )}

          {/* No filter match */}
          {!loading && allVisits.length > 0 && filtered.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Tidak ditemukan pasien dengan kata kunci &quot;{search}&quot;
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="max-h-72 overflow-y-auto space-y-2 -mx-1 px-1">
              {filtered.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate">
                        {v.patient_nama}
                      </p>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {v.visit_number}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] shrink-0',
                          v.status === 'rawat_inap'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50'
                            : v.status === 'diperiksa'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50',
                        )}
                      >
                        {v.status === 'rawat_inap'
                          ? 'Perlu Bed'
                          : v.status === 'diperiksa'
                            ? 'Diperiksa'
                            : 'Menunggu'}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{v.no_rekam_medis}</span>
                      <span>{v.room_nama}</span>
                      <span>Dr. {v.doctor_nama}</span>
                    </div>
                    {v.keluhan_utama && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Keluhan: {v.keluhan_utama}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="ml-2 shrink-0"
                    onClick={() => handleAssign(v)}
                    disabled={assignMut.isPending}
                  >
                    {assignMut.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><UserPlus className="h-3.5 w-3.5 mr-1" /> Admisi</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {allVisits.length} pasien tersedia
            {search.trim() ? ` · ${filtered.length} cocok filter` : ''}
          </p>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </div>
  )
}

// ==================== DISCHARGE MODAL ====================

const CARA_KELUAR_OPTIONS: {
  value: CaraKeluar
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  description: string
}[] = [
  {
    value: 'sembuh',
    label: 'Sembuh',
    icon: <HeartPulse className="h-5 w-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800',
    description: 'Pulang atas izin dokter, kondisi membaik',
  },
  {
    value: 'pulang_paksa',
    label: 'Pulang Paksa (APS)',
    icon: <ShieldAlert className="h-5 w-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200 hover:border-amber-400 dark:bg-amber-950/30 dark:border-amber-800',
    description: 'Atas Permintaan Sendiri, melawan saran dokter',
  },
  {
    value: 'rujuk',
    label: 'Dirujuk ke RS Lain',
    icon: <Ambulance className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200 hover:border-blue-400 dark:bg-blue-950/30 dark:border-blue-800',
    description: 'Dipindahkan ke rumah sakit lain',
  },
  {
    value: 'meninggal',
    label: 'Meninggal Dunia',
    icon: <Skull className="h-5 w-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 hover:border-red-400 dark:bg-red-950/30 dark:border-red-800',
    description: 'Pasien meninggal dunia selama perawatan',
  },
  {
    value: 'lainnya',
    label: 'Lainnya',
    icon: <HelpCircle className="h-5 w-5" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 border-slate-200 hover:border-slate-400 dark:bg-slate-950/30 dark:border-slate-800',
    description: 'Kabur, hilang kontak, atau alasan lain',
  },
]

function DischargeModal({
  bed,
  onClose,
  onConfirm,
  loading,
}: {
  bed: InpatientBed
  onClose: () => void
  onConfirm: (data: {
    cara_keluar: CaraKeluar
    catatan?: string
    rujuk_ke?: string
    sebab_meninggal?: string
  }) => void
  loading: boolean
}) {
  const [step, setStep] = useState<'select' | 'detail'>('select')
  const [caraKeluar, setCaraKeluar] = useState<CaraKeluar | null>(null)
  const [catatan, setCatatan] = useState('')
  const [rujukKe, setRujukKe] = useState('')
  const [sebabMeninggal, setSebabMeninggal] = useState('')
  const [confirmMeninggal, setConfirmMeninggal] = useState(false)

  const selectedOption = CARA_KELUAR_OPTIONS.find((o) => o.value === caraKeluar)

  const canSubmit = (): boolean => {
    if (!caraKeluar) return false
    if (caraKeluar === 'rujuk' && !rujukKe.trim()) return false
    if (caraKeluar === 'meninggal' && (!sebabMeninggal.trim() || !confirmMeninggal)) return false
    if (caraKeluar === 'pulang_paksa' && !catatan.trim()) return false
    if (caraKeluar === 'lainnya' && !catatan.trim()) return false
    return true
  }

  const handleSelect = (value: CaraKeluar) => {
    setCaraKeluar(value)
    setStep('detail')
  }

  const handleSubmit = () => {
    if (!canSubmit() || !caraKeluar) return
    onConfirm({
      cara_keluar: caraKeluar,
      catatan: catatan.trim() || undefined,
      rujuk_ke: rujukKe.trim() || undefined,
      sebab_meninggal: sebabMeninggal.trim() || undefined,
    })
  }

  const los = daysSince(bed.admission_date)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b bg-muted/30">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" />
            Pulangkan Pasien
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-sm text-foreground">
              {bed.patient_name}
            </span>
            <Badge variant="outline" className="text-[10px]">{bed.patient_no_rm}</Badge>
            <Badge variant="secondary" className="text-[10px]">
              Bed {bed.nomor} · {los} hari
            </Badge>
          </div>
        </div>

        <div className="p-5">
          {/* Step 1: Select cara keluar */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Pilih cara keluar pasien:
              </p>
              {CARA_KELUAR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border-2 p-3 transition-all text-left',
                    opt.bgColor,
                  )}
                >
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                    opt.color,
                    opt.value === 'meninggal' ? 'bg-red-100 dark:bg-red-900/50' :
                    opt.value === 'pulang_paksa' ? 'bg-amber-100 dark:bg-amber-900/50' :
                    opt.value === 'rujuk' ? 'bg-blue-100 dark:bg-blue-900/50' :
                    opt.value === 'sembuh' ? 'bg-emerald-100 dark:bg-emerald-900/50' :
                    'bg-slate-100 dark:bg-slate-900/50',
                  )}>
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold', opt.color)}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {opt.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Detail form */}
          {step === 'detail' && caraKeluar && (
            <div className="space-y-4">
              {/* Selected type badge */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setStep('select'); setConfirmMeninggal(false) }}
                  className="text-xs text-primary hover:underline"
                >
                  ← Ubah
                </button>
                <Badge className={cn('text-xs', selectedOption?.color)}>
                  {selectedOption?.icon}
                  <span className="ml-1">{selectedOption?.label}</span>
                </Badge>
              </div>

              {/* Conditional fields */}
              {caraKeluar === 'rujuk' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Nama Rumah Sakit Tujuan *
                  </label>
                  <Input
                    value={rujukKe}
                    onChange={(e) => setRujukKe(e.target.value)}
                    placeholder="Contoh: RSUD Dr. Soetomo, RS Harapan Kita"
                    autoFocus
                  />
                </div>
              )}

              {caraKeluar === 'meninggal' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Penyebab Kematian *
                    </label>
                    <textarea
                      value={sebabMeninggal}
                      onChange={(e) => setSebabMeninggal(e.target.value)}
                      placeholder="Tuliskan penyebab kematian pasien..."
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                      autoFocus
                    />
                  </div>
                  <div className="rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmMeninggal}
                        onChange={(e) => setConfirmMeninggal(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs text-red-700 dark:text-red-400">
                        Saya konfirmasi bahwa pasien <strong>{bed.patient_name}</strong> telah
                        meninggal dunia. Data pasien akan ditandai sebagai almarhum dan tidak
                        bisa didaftarkan kembali.
                      </span>
                    </label>
                  </div>
                </>
              )}

              {caraKeluar === 'pulang_paksa' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Alasan Pulang Paksa (APS) *
                  </label>
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Tuliskan alasan pasien pulang atas permintaan sendiri..."
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                    autoFocus
                  />
                  <p className="text-[10px] text-amber-600 mt-1">
                    Pastikan pasien / keluarga telah menandatangani surat pernyataan APS
                  </p>
                </div>
              )}

              {caraKeluar === 'lainnya' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Keterangan *
                  </label>
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Pasien kabur, hilang kontak, dll..."
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                    autoFocus
                  />
                </div>
              )}

              {/* Catatan umum (optional for sembuh/rujuk/meninggal) */}
              {(caraKeluar === 'sembuh' || caraKeluar === 'rujuk' || caraKeluar === 'meninggal') && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Catatan Tambahan (opsional)
                  </label>
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Catatan tambahan tentang kepulangan pasien..."
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
                  />
                </div>
              )}

              {/* Summary info */}
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p>Yang akan dilakukan saat pulangkan:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Status kunjungan → <strong>Pulang</strong></li>
                  <li>Bed <strong>{bed.nomor}</strong> → dikosongkan</li>
                  <li>Tagihan otomatis dibuat untuk kasir</li>
                  {caraKeluar === 'meninggal' && (
                    <li className="text-red-600 dark:text-red-400">
                      Pasien ditandai sebagai <strong>almarhum</strong>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          {step === 'detail' && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit() || loading}
              className={cn(
                caraKeluar === 'meninggal'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : caraKeluar === 'pulang_paksa'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : '',
              )}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <LogOut className="h-4 w-4 mr-1" />
              {caraKeluar === 'meninggal' ? 'Konfirmasi Meninggal' :
               caraKeluar === 'pulang_paksa' ? 'Proses Pulang Paksa' :
               caraKeluar === 'rujuk' ? 'Proses Rujukan' :
               'Pulangkan Pasien'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== BED CARD ====================

function BedCard({
  bed,
  onDischarge,
  onMaintenance,
  onTransfer,
  onAdmit,
  discharging,
}: {
  bed: InpatientBed
  onDischarge: (bed: InpatientBed) => void
  onMaintenance: (id: string) => void
  onTransfer: (bed: InpatientBed) => void
  onAdmit: (bed: InpatientBed) => void
  discharging: boolean
}) {
  const los = daysSince(bed.admission_date)

  return (
    <div className={cn(
      'rounded-xl border-2 p-3 transition-all relative',
      bed.status === 'tersedia' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20',
      bed.status === 'terisi' && 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20',
      bed.status === 'maintenance' && 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20',
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BedDouble className={cn(
            'h-4 w-4',
            bed.status === 'tersedia' && 'text-emerald-600',
            bed.status === 'terisi' && 'text-blue-600',
            bed.status === 'maintenance' && 'text-amber-600',
          )} />
          <span className="text-sm font-bold">{bed.nomor}</span>
        </div>
        <Badge variant="outline" className={cn(
          'text-[10px]',
          bed.status === 'tersedia' && 'border-emerald-300 text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50',
          bed.status === 'terisi' && 'border-blue-300 text-blue-700 bg-blue-100 dark:bg-blue-900/50',
          bed.status === 'maintenance' && 'border-amber-300 text-amber-700 bg-amber-100 dark:bg-amber-900/50',
        )}>
          {bed.status === 'tersedia' ? 'Kosong' : bed.status === 'terisi' ? 'Terisi' : 'Maintenance'}
        </Badge>
      </div>

      {bed.status === 'terisi' && bed.patient_name && (
        <div className="space-y-1 mb-2">
          <p className="text-sm font-semibold truncate">{bed.patient_name}</p>
          <p className="text-xs text-muted-foreground">{bed.patient_no_rm}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Masuk: {formatDate(bed.admission_date)}</span>
            <Badge variant="secondary" className="text-[10px]">{los} hari</Badge>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 mt-2">
        {bed.status === 'terisi' && bed.visit_id && (
          <a href={`/rawat-inap/${bed.visit_id}`}>
            <Button variant="default" size="sm" className="h-7 text-[11px] w-full">
              <Stethoscope className="h-3 w-3 mr-1" /> Monitoring Klinis
            </Button>
          </a>
        )}
        {bed.status === 'terisi' && (
          <div className="flex gap-1">
            <Button
              variant="outline" size="sm"
              className="h-7 text-[11px] flex-1 text-blue-600 hover:bg-blue-50"
              onClick={() => onTransfer(bed)}
            >
              <ArrowRightLeft className="h-3 w-3 mr-1" /> Pindah
            </Button>
            <Button
              variant="outline" size="sm"
              className="h-7 text-[11px] flex-1 text-red-600 hover:bg-red-50"
              onClick={() => onDischarge(bed)}
              disabled={discharging}
            >
              <LogOut className="h-3 w-3 mr-1" /> Pulangkan
            </Button>
          </div>
        )}
        {bed.status === 'tersedia' && (
          <div className="flex gap-1 w-full">
            <Button
              variant="default" size="sm"
              className="h-7 text-[11px] flex-1"
              onClick={() => onAdmit(bed)}
            >
              <UserPlus className="h-3 w-3 mr-1" /> Admisi
            </Button>
            <Button
              variant="outline" size="sm"
              className="h-7 text-[11px] text-amber-600 hover:bg-amber-50 px-2"
              onClick={() => onMaintenance(bed.id)}
              title="Set Maintenance"
            >
              <Wrench className="h-3 w-3" />
            </Button>
          </div>
        )}
        {bed.status === 'maintenance' && (
          <Button
            variant="outline" size="sm"
            className="h-7 text-[11px] flex-1 text-emerald-600 hover:bg-emerald-50"
            onClick={() => onMaintenance(bed.id)}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Aktifkan
          </Button>
        )}
      </div>
    </div>
  )
}

// ==================== ROOM PANEL (Monitor) ====================

function RoomPanel({
  room,
  isSelected,
  onClick,
}: {
  room: InpatientRoom
  isSelected: boolean
  onClick: () => void
}) {
  const pct = room.total_beds > 0
    ? Math.round((room.occupied_beds / room.total_beds) * 100)
    : 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
          : 'hover:border-primary/30',
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold truncate flex-1 mr-2">{room.nama}</h3>
        <ChevronRight className={cn(
          'h-4 w-4 text-muted-foreground transition-transform',
          isSelected && 'rotate-90 text-primary',
        )} />
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {formatRupiah(room.tarif_per_hari)}/hari • Lt. {room.lantai ?? '-'}
        {room.kelas ? ` • Kelas ${room.kelas}` : ''}
      </p>

      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{room.occupied_beds}/{room.total_beds} terisi</span>
        <span className={cn(
          'font-semibold',
          pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600',
        )}>
          {pct}%
        </span>
      </div>
    </button>
  )
}

// ==================== TRANSFER MODAL ====================

function TransferModal({
  bed,
  rooms,
  onClose,
  onTransfer,
  transferring,
}: {
  bed: InpatientBed
  rooms: InpatientRoom[]
  onClose: () => void
  onTransfer: (fromBedId: string, toBedId: string) => void
  transferring: boolean
}) {
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const { data: beds } = useBedsByRoom(selectedRoom || null)
  const availableBeds = beds?.filter((b) => b.status === 'tersedia') ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md mx-4 bg-background rounded-2xl shadow-2xl border overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/30">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Pindah Bed
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pindahkan <strong>{bed.patient_name}</strong> dari <strong>{bed.nomor}</strong>
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Ruangan Tujuan
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Pilih ruangan...</option>
              {rooms.filter((r) => r.available_beds > 0).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama} ({r.available_beds} bed tersedia)
                </option>
              ))}
            </select>
          </div>

          {selectedRoom && availableBeds.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Bed Tujuan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {availableBeds.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onTransfer(bed.id, b.id)}
                    disabled={transferring}
                    className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 transition-all dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                  >
                    <BedDouble className="h-4 w-4 mx-auto mb-1" />
                    {b.nomor}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedRoom && availableBeds.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tidak ada bed tersedia di ruangan ini
            </p>
          )}
        </div>

        <div className="border-t bg-muted/30 px-5 py-3 flex justify-end">
          <Button variant="outline" onClick={onClose}>Batal</Button>
        </div>
      </div>
    </div>
  )
}


// ==================== BED MANAGE CARD (per room) ====================

function BedManageCard({
  room,
  onAddBed,
}: {
  room: InpatientRoom
  onAddBed: (room: InpatientRoom) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { data: beds, isLoading: bedsLoading } = useBedsByRoom(expanded ? room.id : null)
  const removeBedMut = useRemoveBed()

  const handleRemoveBed = async (bedId: string, nomor: string) => {
    if (!confirm(`Hapus bed ${nomor}? Tindakan ini tidak bisa dibatalkan.`)) return
    try {
      await removeBedMut.mutateAsync(bedId)
      toast.success(`Bed ${nomor} dihapus`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus bed')
    }
  }

  const pct = room.total_beds > 0
    ? Math.round((room.occupied_beds / room.total_beds) * 100)
    : 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                  {room.kode}
                </Badge>
                <h3 className="text-sm font-semibold truncate">{room.nama}</h3>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Lantai {room.lantai ?? '-'}</span>
                <span>{formatRupiah(room.tarif_per_hari)}/hari</span>
                {room.kelas && (
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    Kelas {room.kelas}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline" size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={() => onAddBed(room)}
            >
              <Plus className="h-3 w-3 mr-1" /> Bed
            </Button>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {room.occupied_beds}/{room.total_beds}
            </span>
          </div>
        </div>

        <div className="border-t">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5" />
              {room.total_beds} bed
              {room.occupied_beds > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {room.occupied_beds} terisi
                </Badge>
              )}
              {room.maintenance_beds > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1 text-amber-600">
                  {room.maintenance_beds} maint.
                </Badge>
              )}
            </span>
            <ChevronRight className={cn(
              'h-3.5 w-3.5 transition-transform',
              expanded && 'rotate-90',
            )} />
          </button>

          {expanded && (
            <div className="px-4 pb-4 border-t bg-muted/20">
              {bedsLoading ? (
                <div className="py-4 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : !beds || beds.length === 0 ? (
                <p className="py-4 text-xs text-muted-foreground text-center">
                  Belum ada bed
                </p>
              ) : (
                <div className="space-y-1 mt-2">
                  {beds.map((bed) => (
                    <div
                      key={bed.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-xs',
                        bed.status === 'tersedia' && 'bg-emerald-50 dark:bg-emerald-950/20',
                        bed.status === 'terisi' && 'bg-blue-50 dark:bg-blue-950/20',
                        bed.status === 'maintenance' && 'bg-amber-50 dark:bg-amber-950/20',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          bed.status === 'tersedia' && 'bg-emerald-500',
                          bed.status === 'terisi' && 'bg-blue-500',
                          bed.status === 'maintenance' && 'bg-amber-500',
                        )} />
                        <span className="font-medium">{bed.nomor}</span>
                        {bed.status === 'terisi' && bed.patient_name && (
                          <span className="text-muted-foreground">
                            — {bed.patient_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {bed.status === 'tersedia'
                            ? 'Kosong'
                            : bed.status === 'terisi'
                              ? 'Terisi'
                              : 'Maint.'}
                        </Badge>
                        {bed.status !== 'terisi' && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                            onClick={() => handleRemoveBed(bed.id, bed.nomor)}
                            disabled={removeBedMut.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== ADD BED MODAL ====================

function AddBedModal({
  room,
  onClose,
}: {
  room: InpatientRoom
  onClose: () => void
}) {
  const [nomor, setNomor] = useState('')
  const addMut = useAddBed()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomor.trim()) {
      toast.error('Nomor bed wajib diisi')
      return
    }
    try {
      await addMut.mutateAsync({ roomId: room.id, nomor: nomor.trim() })
      toast.success(`Bed ${nomor.trim()} ditambahkan ke ${room.nama}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambah bed')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b bg-muted/30">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Tambah Bed ke {room.nama}
          </h3>
        </div>
        <form onSubmit={handleAdd} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Nomor / Label Bed
            </label>
            <Input
              value={nomor}
              onChange={(e) => setNomor(e.target.value)}
              placeholder={`${room.kode}-07`}
              className="font-mono"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Contoh: {room.kode}-07, A1, Bed Extra, dll
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={addMut.isPending}>
              {addMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tambah Bed
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== TAB: MONITOR BED ====================

function MonitorTab() {
  const { data: summary, isLoading: summaryLoading } = useInpatientSummary()
  const { data: rooms, isLoading: roomsLoading } = useInpatientRooms()
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const { data: beds, isLoading: bedsLoading } = useBedsByRoom(selectedRoom)
  const [transferBedState, setTransferBedState] = useState<InpatientBed | null>(null)
  const [admitBed, setAdmitBed] = useState<InpatientBed | null>(null)
  const [dischargeBed, setDischargeBed] = useState<InpatientBed | null>(null)
  const [searchBed, setSearchBed] = useState('')

  const dischargeMut = useDischargePatient()
  const maintenanceMut = useToggleBedMaintenance()
  const transferMut = useTransferBed()

  const handleDischargeClick = (bed: InpatientBed) => {
    if (!bed.visit_id) {
      toast.error('Data kunjungan tidak ditemukan untuk bed ini')
      return
    }
    setDischargeBed(bed)
  }

  const handleDischargeConfirm = async (data: {
    cara_keluar: CaraKeluar
    catatan?: string
    rujuk_ke?: string
    sebab_meninggal?: string
  }) => {
    if (!dischargeBed?.visit_id) return
    try {
      const result = await dischargeMut.mutateAsync({
        visitId: dischargeBed.visit_id,
        ...data,
      })
      const parts = [`${result.patientName} — ${result.caraKeluarLabel}`]
      if (result.bedReleased) parts.push('bed dikosongkan')
      if (result.billGenerated) parts.push('tagihan dibuat')
      if (result.patientMarkedDeceased) parts.push('pasien ditandai almarhum')
      if (result.rujukKe) parts.push(`dirujuk ke ${result.rujukKe}`)
      toast.success(parts.join(' · '))
      setDischargeBed(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memulangkan pasien')
    }
  }

  const handleMaintenance = async (bedId: string) => {
    try {
      await maintenanceMut.mutateAsync(bedId)
      toast.success('Status bed diperbarui')
    } catch {
      toast.error('Gagal mengubah status bed')
    }
  }

  const handleTransfer = async (fromBedId: string, toBedId: string) => {
    try {
      await transferMut.mutateAsync({ fromBedId, toBedId })
      toast.success('Pasien berhasil dipindah')
      setTransferBedState(null)
    } catch {
      toast.error('Gagal memindah pasien')
    }
  }

  const selectedRoomData = rooms?.find((r) => r.id === selectedRoom)
  const filteredBeds = beds?.filter((b) =>
    !searchBed || b.nomor.toLowerCase().includes(searchBed.toLowerCase())
      || b.patient_name?.toLowerCase().includes(searchBed.toLowerCase())
      || b.patient_no_rm?.toLowerCase().includes(searchBed.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent>
            </Card>
          ))
        ) : (
          <>
            {([
              { icon: Building2, label: 'Ruangan', val: summary?.totalRooms ?? 0, clr: 'text-primary', bg: 'bg-primary/10' },
              { icon: BedDouble, label: 'Total Bed', val: summary?.totalBeds ?? 0, clr: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-900/30' },
              { icon: Users, label: 'Terisi', val: summary?.occupied ?? 0, clr: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { icon: CheckCircle2, label: 'Tersedia', val: summary?.available ?? 0, clr: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
              { icon: Wrench, label: 'Maintenance', val: summary?.maintenance ?? 0, clr: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
              { icon: Activity, label: 'BOR', val: `${summary?.bor ?? 0}%`, clr: (summary?.bor ?? 0) >= 85 ? 'text-red-600' : 'text-emerald-600', bg: (summary?.bor ?? 0) >= 85 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30' },
            ] as const).map(({ icon: I, label, val, clr, bg }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', bg)}>
                    <I className={cn('h-4 w-4', clr)} />
                  </div>
                  <div className="text-lg font-bold">{val}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Flow info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20 px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
          3 Jalur Admisi Rawat Inap:
        </p>
        <div className="text-[11px] text-blue-700 dark:text-blue-400 space-y-1">
          <p>
            <strong>1. Dari Poli:</strong> Pendaftaran (Rawat Jalan) → Dokter periksa
            → Buka halaman ini → Klik &quot;Admisi&quot; pada bed kosong → Pilih pasien → Bed terisi
          </p>
          <p>
            <strong>2. Dari IGD:</strong> Pendaftaran (IGD) → Halaman IGD → Set triage
            → Dokter periksa → Disposisi &quot;Rawat Inap&quot; → Buka halaman ini
            → Pasien muncul dengan badge &quot;Perlu Bed&quot; → Klik &quot;Admisi&quot;
          </p>
          <p>
            <strong>3. Rujukan langsung:</strong> Pendaftaran → Tipe &quot;Rawat Inap&quot;
            → Pilih ruangan & bed → Submit → Langsung masuk rawat inap
          </p>
        </div>
      </div>

      {/* Main content — 2 column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Daftar Ruangan
          </h2>
          {roomsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : !rooms || rooms.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                Belum ada ruang rawat inap
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <RoomPanel
                  key={room.id}
                  room={room}
                  isSelected={selectedRoom === room.id}
                  onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedRoomData
                ? `Bed — ${selectedRoomData.nama}`
                : 'Pilih ruangan untuk melihat bed'}
            </h2>
            {selectedRoom && (
              <Input
                value={searchBed}
                onChange={(e) => setSearchBed(e.target.value)}
                placeholder="Cari bed / pasien..."
                className="w-48 h-8 text-xs"
              />
            )}
          </div>

          {!selectedRoom ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BedDouble className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Pilih ruangan di sebelah kiri untuk melihat daftar bed
                </p>
              </CardContent>
            </Card>
          ) : bedsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : !filteredBeds || filteredBeds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Tidak ada bed ditemukan
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Tersedia
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Terisi
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Maintenance
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredBeds.map((bed) => (
                  <BedCard
                    key={bed.id}
                    bed={bed}
                    onDischarge={handleDischargeClick}
                    onMaintenance={handleMaintenance}
                    onTransfer={(b) => setTransferBedState(b)}
                    onAdmit={(b) => setAdmitBed(b)}
                    discharging={dischargeMut.isPending}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {transferBedState && rooms && (
        <TransferModal
          bed={transferBedState}
          rooms={rooms}
          onClose={() => setTransferBedState(null)}
          onTransfer={handleTransfer}
          transferring={transferMut.isPending}
        />
      )}

      {/* Admisi Modal */}
      {admitBed && (
        <AdmisiModal
          bed={admitBed}
          onClose={() => setAdmitBed(null)}
        />
      )}

      {/* Discharge Modal */}
      {dischargeBed && (
        <DischargeModal
          bed={dischargeBed}
          onClose={() => setDischargeBed(null)}
          onConfirm={handleDischargeConfirm}
          loading={dischargeMut.isPending}
        />
      )}
    </div>
  )
}

// ==================== TAB: KELOLA BED ====================

function KelolaBedTab() {
  const { data: rooms, isLoading } = useInpatientRooms()
  const [addBedRoom, setAddBedRoom] = useState<InpatientRoom | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Kelola Bed per Ruangan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tambah atau hapus bed di setiap ruangan rawat inap
          </p>
        </div>
        <a
          href="/admin/ruangan"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Settings className="h-3.5 w-3.5" />
          Kelola Ruangan & Poli →
        </a>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !rooms || rooms.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium mb-1">Belum ada ruangan rawat inap</p>
            <p className="text-xs text-muted-foreground mb-4">
              Buat ruangan terlebih dahulu di halaman Manajemen Ruangan
            </p>
            <a href="/admin/ruangan">
              <Button size="sm">
                <Settings className="h-4 w-4 mr-1" /> Buka Manajemen Ruangan
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <BedManageCard
              key={room.id}
              room={room}
              onAddBed={setAddBedRoom}
            />
          ))}
        </div>
      )}

      {addBedRoom && (
        <AddBedModal
          room={addBedRoom}
          onClose={() => setAddBedRoom(null)}
        />
      )}
    </div>
  )
}

// ==================== MAIN PAGE ====================

export default function RawatInapPage() {
  const [tab, setTab] = useState<'monitor' | 'kelola'>('monitor')
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('settings:manage')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BedDouble className="h-6 w-6 text-primary" />
            Rawat Inap
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manajemen kamar, bed, dan pasien rawat inap
          </p>
        </div>
      </div>

      {canManage && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setTab('monitor')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              tab === 'monitor'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Activity className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Monitor Bed
          </button>
          <button
            onClick={() => setTab('kelola')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              tab === 'kelola'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Settings className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Kelola Bed
          </button>
        </div>
      )}

      {tab === 'monitor' ? <MonitorTab /> : <KelolaBedTab />}
    </div>
  )
}
