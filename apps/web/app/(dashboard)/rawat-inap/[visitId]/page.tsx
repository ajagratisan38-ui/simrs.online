'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Activity, ArrowLeft, BedDouble, Clipboard, ClipboardList,
  FileText, Heart, Loader2, Plus, Thermometer, Trash2,
  AlertTriangle, CheckCircle2, Circle, Clock, Droplets,
  Eye, Wind, Scale, Stethoscope, X, ChevronDown, ChevronRight,
  PlayCircle, Ban, XCircle, Pencil, Lock, Unlock, Send,
  Timer, Pill, Syringe, FlaskConical, Radio, MessageSquare,
  UserCheck, Gauge, Brain, ShieldCheck,   CalendarCheck,
} from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import {
  useClinicalSummary,
  useVitalsByVisit,
  useVitalsTrend,
  useRecordVitals,
  useDeleteVital,
  useOrders,
  useCreateOrder,
  useUpdateOrderStatus,
  useExecuteOrder,
  useDeleteOrder,
  useNursingNotes,
  useCreateNursingNote,
  useUpdateNursingNote,
  useFinalizeNursingNote,
  useDeleteNursingNote,
  useDischargePlan,
  useUpdateDischargePlan,
} from '@/hooks/use-inpatient-clinical'

import type {
  VitalSign, VitalAlertLevel, MedicalOrder, OrderCategory,
  OrderPriority, OrderStatus, NursingNote, NursingShift,
  DischargePlan,
} from '@/lib/api/inpatient-clinical'

// ==================== HELPERS ====================

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateTime(d: string | null) {
  if (!d) return '-'
  return `${formatDate(d)} ${formatTime(d)}`
}

function daysSince(d: string | null) {
  if (!d) return 0
  return Math.max(1, Math.ceil((Date.now() - new Date(d).getTime()) / 86400000))
}

function alertBadge(level: VitalAlertLevel | null | undefined) {
  if (!level || level === 'normal') return null
  return (
    <Badge className={cn(
      'text-[10px]',
      level === 'critical'
        ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50'
        : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50',
    )}>
      {level === 'critical' ? 'KRITIS' : 'PERINGATAN'}
    </Badge>
  )
}

const KATEGORI_ICONS: Record<OrderCategory, React.ReactNode> = {
  obat: <Pill className="h-3.5 w-3.5" />,
  infus: <Droplets className="h-3.5 w-3.5" />,
  diet: <Scale className="h-3.5 w-3.5" />,
  tindakan: <Syringe className="h-3.5 w-3.5" />,
  lab: <FlaskConical className="h-3.5 w-3.5" />,
  radiologi: <Radio className="h-3.5 w-3.5" />,
  konsultasi: <MessageSquare className="h-3.5 w-3.5" />,
  monitoring: <Activity className="h-3.5 w-3.5" />,
  mobilisasi: <UserCheck className="h-3.5 w-3.5" />,
  lainnya: <Clipboard className="h-3.5 w-3.5" />,
}

const KATEGORI_LABELS: Record<OrderCategory, string> = {
  obat: 'Obat', infus: 'Infus', diet: 'Diet', tindakan: 'Tindakan',
  lab: 'Lab', radiologi: 'Radiologi', konsultasi: 'Konsultasi',
  monitoring: 'Monitoring', mobilisasi: 'Mobilisasi', lainnya: 'Lainnya',
}

const SHIFT_LABELS: Record<NursingShift, string> = {
  pagi: 'Pagi (07:00-14:00)', siang: 'Siang (14:00-21:00)', malam: 'Malam (21:00-07:00)',
}

const SHIFT_COLORS: Record<NursingShift, string> = {
  pagi: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50',
  siang: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50',
  malam: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50',
}

// ==================== VITAL SIGNS TAB ====================

function VitalSignsTab({ visitId, patientId }: { visitId: string; patientId: string }) {
  const { data: vitals, isLoading } = useVitalsByVisit(visitId)
  const { data: trend } = useVitalsTrend(visitId)
  const recordMut = useRecordVitals()
  const deleteMut = useDeleteVital()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    tekanan_darah_sistolik: '', tekanan_darah_diastolik: '',
    nadi: '', suhu: '', respirasi: '', spo2: '',
    nyeri_score: '0', kesadaran: 'composmentis',
    gcs_eye: '', gcs_verbal: '', gcs_motorik: '',
    intake_cairan: '', output_cairan: '',
    berat_badan: '', catatan: '',
  })

  const resetForm = () => {
    setForm({
      tekanan_darah_sistolik: '', tekanan_darah_diastolik: '',
      nadi: '', suhu: '', respirasi: '', spo2: '',
      nyeri_score: '0', kesadaran: 'composmentis',
      gcs_eye: '', gcs_verbal: '', gcs_motorik: '',
      intake_cairan: '', output_cairan: '',
      berat_badan: '', catatan: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await recordMut.mutateAsync({
        visit_id: visitId,
        patient_id: patientId,
        tekanan_darah_sistolik: form.tekanan_darah_sistolik ? Number(form.tekanan_darah_sistolik) : undefined,
        tekanan_darah_diastolik: form.tekanan_darah_diastolik ? Number(form.tekanan_darah_diastolik) : undefined,
        nadi: form.nadi ? Number(form.nadi) : undefined,
        suhu: form.suhu ? Number(form.suhu) : undefined,
        respirasi: form.respirasi ? Number(form.respirasi) : undefined,
        spo2: form.spo2 ? Number(form.spo2) : undefined,
        nyeri_score: Number(form.nyeri_score),
        kesadaran: form.kesadaran,
        gcs_eye: form.gcs_eye ? Number(form.gcs_eye) : undefined,
        gcs_verbal: form.gcs_verbal ? Number(form.gcs_verbal) : undefined,
        gcs_motorik: form.gcs_motorik ? Number(form.gcs_motorik) : undefined,
        intake_cairan: form.intake_cairan ? Number(form.intake_cairan) : undefined,
        output_cairan: form.output_cairan ? Number(form.output_cairan) : undefined,
        berat_badan: form.berat_badan ? Number(form.berat_badan) : undefined,
        catatan: form.catatan || undefined,
      })
      toast.success('Vital signs berhasil dicatat')
      resetForm()
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mencatat vital signs')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data vital signs ini?')) return
    try {
      await deleteMut.mutateAsync(id)
      toast.success('Data vital signs dihapus')
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  const latestVital = vitals?.[0]

  return (
    <div className="space-y-4">
      {/* Latest vital summary cards */}
      {latestVital && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { label: 'TD', value: latestVital.tekanan_darah_sistolik && latestVital.tekanan_darah_diastolik ? `${latestVital.tekanan_darah_sistolik}/${latestVital.tekanan_darah_diastolik}` : '-', unit: 'mmHg', icon: <Heart className="h-3.5 w-3.5" /> },
            { label: 'Nadi', value: latestVital.nadi ?? '-', unit: 'x/min', icon: <Activity className="h-3.5 w-3.5" /> },
            { label: 'Suhu', value: latestVital.suhu ?? '-', unit: '°C', icon: <Thermometer className="h-3.5 w-3.5" /> },
            { label: 'RR', value: latestVital.respirasi ?? '-', unit: 'x/min', icon: <Wind className="h-3.5 w-3.5" /> },
            { label: 'SpO2', value: latestVital.spo2 ?? '-', unit: '%', icon: <Droplets className="h-3.5 w-3.5" /> },
            { label: 'Nyeri', value: latestVital.nyeri_score, unit: '/10', icon: <Gauge className="h-3.5 w-3.5" /> },
            { label: 'GCS', value: latestVital.gcs_eye != null ? `${latestVital.gcs_eye}+${latestVital.gcs_verbal}+${latestVital.gcs_motorik}` : '-', unit: '', icon: <Brain className="h-3.5 w-3.5" /> },
          ].map((item) => (
            <Card key={item.label} className={cn(
              'border',
              latestVital.alert_level === 'critical' ? 'border-red-200 dark:border-red-800' :
              latestVital.alert_level === 'warning' ? 'border-amber-200 dark:border-amber-800' : '',
            )}>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
                <div className="text-sm font-bold">{item.value}</div>
                <div className="text-[10px] text-muted-foreground">{item.unit}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add vital button + alert badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Riwayat Vital Signs</h3>
          {latestVital && alertBadge(latestVital.alert_level)}
          {latestVital && (
            <span className="text-[10px] text-muted-foreground">
              Terakhir: {formatDateTime(latestVital.recorded_at)}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? 'Batal' : 'Catat Vital'}
        </Button>
      </div>

      {/* Vital form */}
      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">TD Sistolik</label>
                  <Input type="number" placeholder="120" value={form.tekanan_darah_sistolik}
                    onChange={(e) => setForm({ ...form, tekanan_darah_sistolik: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">TD Diastolik</label>
                  <Input type="number" placeholder="80" value={form.tekanan_darah_diastolik}
                    onChange={(e) => setForm({ ...form, tekanan_darah_diastolik: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nadi (x/min)</label>
                  <Input type="number" placeholder="80" value={form.nadi}
                    onChange={(e) => setForm({ ...form, nadi: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Suhu (°C)</label>
                  <Input type="number" step="0.1" placeholder="36.5" value={form.suhu}
                    onChange={(e) => setForm({ ...form, suhu: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Respirasi (x/min)</label>
                  <Input type="number" placeholder="20" value={form.respirasi}
                    onChange={(e) => setForm({ ...form, respirasi: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">SpO2 (%)</label>
                  <Input type="number" placeholder="98" value={form.spo2}
                    onChange={(e) => setForm({ ...form, spo2: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Nyeri (0-10): <strong>{form.nyeri_score}</strong>
                  </label>
                  <input type="range" min="0" max="10" value={form.nyeri_score}
                    onChange={(e) => setForm({ ...form, nyeri_score: e.target.value })}
                    className="w-full accent-primary" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Kesadaran</label>
                  <select value={form.kesadaran}
                    onChange={(e) => setForm({ ...form, kesadaran: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm h-10">
                    <option value="composmentis">Composmentis</option>
                    <option value="apatis">Apatis</option>
                    <option value="somnolen">Somnolen</option>
                    <option value="sopor">Sopor</option>
                    <option value="koma">Koma</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">GCS Eye</label>
                  <Input type="number" min="1" max="4" placeholder="4" value={form.gcs_eye}
                    onChange={(e) => setForm({ ...form, gcs_eye: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">GCS Verbal</label>
                  <Input type="number" min="1" max="5" placeholder="5" value={form.gcs_verbal}
                    onChange={(e) => setForm({ ...form, gcs_verbal: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">GCS Motorik</label>
                  <Input type="number" min="1" max="6" placeholder="6" value={form.gcs_motorik}
                    onChange={(e) => setForm({ ...form, gcs_motorik: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Intake (mL)</label>
                  <Input type="number" placeholder="1500" value={form.intake_cairan}
                    onChange={(e) => setForm({ ...form, intake_cairan: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Output (mL)</label>
                  <Input type="number" placeholder="1200" value={form.output_cairan}
                    onChange={(e) => setForm({ ...form, output_cairan: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">BB (kg)</label>
                  <Input type="number" step="0.1" placeholder="65" value={form.berat_badan}
                    onChange={(e) => setForm({ ...form, berat_badan: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
                <textarea value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
                  placeholder="Catatan tambahan..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false) }}>
                  Batal
                </Button>
                <Button type="submit" disabled={recordMut.isPending}>
                  {recordMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Simpan Vital Signs
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Vital trend mini (simple text-based) */}
      {trend && trend.length > 1 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Tren 24 Jam Terakhir ({trend.length} pengukuran)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 px-2 font-medium text-muted-foreground">Waktu</th>
                    <th className="text-center py-1 px-2 font-medium text-muted-foreground">TD</th>
                    <th className="text-center py-1 px-2 font-medium text-muted-foreground">Nadi</th>
                    <th className="text-center py-1 px-2 font-medium text-muted-foreground">Suhu</th>
                    <th className="text-center py-1 px-2 font-medium text-muted-foreground">RR</th>
                    <th className="text-center py-1 px-2 font-medium text-muted-foreground">SpO2</th>
                    <th className="text-center py-1 px-2 font-medium text-muted-foreground">Nyeri</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((t, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 px-2 whitespace-nowrap">{formatTime(t.recorded_at)}</td>
                      <td className="py-1 px-2 text-center">{t.tekanan_darah_sistolik && t.tekanan_darah_diastolik ? `${t.tekanan_darah_sistolik}/${t.tekanan_darah_diastolik}` : '-'}</td>
                      <td className="py-1 px-2 text-center">{t.nadi ?? '-'}</td>
                      <td className="py-1 px-2 text-center">{t.suhu ?? '-'}</td>
                      <td className="py-1 px-2 text-center">{t.respirasi ?? '-'}</td>
                      <td className="py-1 px-2 text-center">{t.spo2 ?? '-'}</td>
                      <td className="py-1 px-2 text-center">{t.nyeri_score ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vital history */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !vitals || vitals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada data vital signs</p>
            <p className="text-xs text-muted-foreground mt-1">
              Klik &quot;Catat Vital&quot; untuk mulai mencatat tanda vital pasien
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {vitals.map((v) => (
            <Card key={v.id} className={cn(
              v.alert_level === 'critical' ? 'border-red-200 dark:border-red-800' :
              v.alert_level === 'warning' ? 'border-amber-200 dark:border-amber-800' : '',
            )}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{formatDateTime(v.recorded_at)}</span>
                    {alertBadge(v.alert_level)}
                    <span className="text-[10px] text-muted-foreground">oleh {v.recorded_by_name}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(v.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {v.tekanan_darah_sistolik && <span>TD: <strong>{v.tekanan_darah_sistolik}/{v.tekanan_darah_diastolik}</strong> mmHg</span>}
                  {v.nadi && <span>Nadi: <strong>{v.nadi}</strong> x/min</span>}
                  {v.suhu && <span>Suhu: <strong>{v.suhu}</strong> °C</span>}
                  {v.respirasi && <span>RR: <strong>{v.respirasi}</strong> x/min</span>}
                  {v.spo2 && <span>SpO2: <strong>{v.spo2}</strong>%</span>}
                  <span>Nyeri: <strong>{v.nyeri_score}</strong>/10</span>
                  <span>Kesadaran: <strong>{v.kesadaran}</strong></span>
                  {v.gcs_eye != null && <span>GCS: <strong>E{v.gcs_eye}V{v.gcs_verbal}M{v.gcs_motorik}</strong></span>}
                  {v.intake_cairan != null && <span>Intake: <strong>{v.intake_cairan}</strong> mL</span>}
                  {v.output_cairan != null && <span>Output: <strong>{v.output_cairan}</strong> mL</span>}
                  {v.berat_badan && <span>BB: <strong>{v.berat_badan}</strong> kg</span>}
                </div>
                {v.catatan && <p className="text-xs text-muted-foreground mt-1">{v.catatan}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== MEDICAL ORDERS TAB ====================

function MedicalOrdersTab({ visitId, patientId }: { visitId: string; patientId: string }) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined)
  const { data: orders, isLoading } = useOrders(visitId, statusFilter)
  const createMut = useCreateOrder()
  const updateStatusMut = useUpdateOrderStatus()
  const executeMut = useExecuteOrder()
  const deleteMut = useDeleteOrder()
  const [showForm, setShowForm] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [executeNote, setExecuteNote] = useState('')
  const [discontinueId, setDiscontinueId] = useState<string | null>(null)
  const [discontinueReason, setDiscontinueReason] = useState('')

  const [form, setForm] = useState({
    kategori: 'obat' as OrderCategory,
    prioritas: 'rutin' as OrderPriority,
    instruksi: '',
    dosis: '', frekuensi: '', rute: '', durasi: '', catatan: '',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.instruksi.trim()) { toast.error('Instruksi wajib diisi'); return }
    try {
      await createMut.mutateAsync({
        visit_id: visitId, patient_id: patientId,
        kategori: form.kategori, prioritas: form.prioritas,
        instruksi: form.instruksi.trim(),
        dosis: form.dosis.trim() || undefined,
        frekuensi: form.frekuensi.trim() || undefined,
        rute: form.rute.trim() || undefined,
        durasi: form.durasi.trim() || undefined,
        catatan: form.catatan.trim() || undefined,
      })
      toast.success('Instruksi medis berhasil dibuat')
      setForm({ kategori: 'obat', prioritas: 'rutin', instruksi: '', dosis: '', frekuensi: '', rute: '', durasi: '', catatan: '' })
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat instruksi')
    }
  }

  const handleExecute = async (orderId: string) => {
    try {
      await executeMut.mutateAsync({ orderId, catatan: executeNote.trim() || undefined })
      toast.success('Eksekusi instruksi berhasil dicatat')
      setExecuteNote('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mencatat eksekusi')
    }
  }

  const handleDiscontinue = async () => {
    if (!discontinueId || !discontinueReason.trim()) return
    try {
      await updateStatusMut.mutateAsync({
        orderId: discontinueId, status: 'discontinued', reason: discontinueReason.trim(),
      })
      toast.success('Instruksi dihentikan')
      setDiscontinueId(null)
      setDiscontinueReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghentikan instruksi')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Instruksi Medis Dokter</h3>
          <Badge variant="secondary" className="text-[10px]">{orders?.length ?? 0} instruksi</Badge>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? 'Batal' : 'Buat Instruksi'}
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap">
        {([undefined, 'active', 'completed', 'discontinued', 'cancelled'] as const).map((s) => (
          <button key={s ?? 'all'} onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted',
            )}>
            {s === undefined ? 'Semua' : s === 'active' ? 'Aktif' : s === 'completed' ? 'Selesai' : s === 'discontinued' ? 'Dihentikan' : 'Dibatalkan'}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori</label>
                  <select value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value as OrderCategory })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm h-10">
                    {Object.entries(KATEGORI_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioritas</label>
                  <select value={form.prioritas}
                    onChange={(e) => setForm({ ...form, prioritas: e.target.value as OrderPriority })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm h-10">
                    <option value="rutin">Rutin</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT (Segera)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Instruksi *</label>
                <textarea value={form.instruksi}
                  onChange={(e) => setForm({ ...form, instruksi: e.target.value })}
                  placeholder="Contoh: Paracetamol 500mg tablet oral, Infus RL 20 tpm, Diet lunak rendah garam..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Dosis</label>
                  <Input placeholder="500mg" value={form.dosis}
                    onChange={(e) => setForm({ ...form, dosis: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Frekuensi</label>
                  <Input placeholder="3x1" value={form.frekuensi}
                    onChange={(e) => setForm({ ...form, frekuensi: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Rute</label>
                  <Input placeholder="Oral / IV / IM" value={form.rute}
                    onChange={(e) => setForm({ ...form, rute: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Durasi</label>
                  <Input placeholder="5 hari" value={form.durasi}
                    onChange={(e) => setForm({ ...form, durasi: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
                <Input placeholder="Berikan sesudah makan" value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Buat Instruksi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !orders || orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada instruksi medis</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const isExpanded = expandedOrder === order.id
            return (
              <Card key={order.id} className={cn(
                order.prioritas === 'stat' ? 'border-red-200 dark:border-red-800' :
                order.prioritas === 'urgent' ? 'border-amber-200 dark:border-amber-800' : '',
              )}>
                <CardContent className="p-0">
                  <button className="w-full p-3 text-left" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          order.status === 'active' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50' :
                          order.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50' :
                          'bg-muted text-muted-foreground',
                        )}>
                          {KATEGORI_ICONS[order.kategori]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold truncate">{order.instruksi}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <Badge variant="outline" className="text-[10px]">{KATEGORI_LABELS[order.kategori]}</Badge>
                            <Badge className={cn('text-[10px]',
                              order.prioritas === 'stat' ? 'bg-red-100 text-red-700' :
                              order.prioritas === 'urgent' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700',
                            )}>{order.prioritas.toUpperCase()}</Badge>
                            <Badge className={cn('text-[10px]',
                              order.status === 'active' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'discontinued' ? 'bg-red-100 text-red-700' :
                              'bg-muted text-muted-foreground',
                            )}>
                              {order.status === 'active' ? 'Aktif' : order.status === 'completed' ? 'Selesai' :
                               order.status === 'discontinued' ? 'Dihentikan' : 'Dibatalkan'}
                            </Badge>
                            {order.dosis && <span className="text-muted-foreground">Dosis: {order.dosis}</span>}
                            {order.frekuensi && <span className="text-muted-foreground">Frekuensi: {order.frekuensi}</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Dr. {order.ordered_by_name} · {formatDateTime(order.created_at)}
                            {order.executions && order.executions.length > 0 && (
                              <span className="ml-2 text-blue-600">· {order.executions.length}x dieksekusi</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-3 pb-3 pt-2 space-y-3">
                      {/* Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {order.dosis && <div><span className="text-muted-foreground">Dosis:</span> <strong>{order.dosis}</strong></div>}
                        {order.frekuensi && <div><span className="text-muted-foreground">Frekuensi:</span> <strong>{order.frekuensi}</strong></div>}
                        {order.rute && <div><span className="text-muted-foreground">Rute:</span> <strong>{order.rute}</strong></div>}
                        {order.durasi && <div><span className="text-muted-foreground">Durasi:</span> <strong>{order.durasi}</strong></div>}
                      </div>
                      {order.catatan && <p className="text-xs text-muted-foreground">{order.catatan}</p>}
                      {order.discontinued_reason && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2 text-xs text-red-700 dark:text-red-400">
                          Alasan dihentikan: {order.discontinued_reason}
                        </div>
                      )}

                      {/* Execution history */}
                      {order.executions && order.executions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Riwayat Eksekusi:</p>
                          <div className="space-y-1">
                            {order.executions.map((ex) => (
                              <div key={ex.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                <span>{formatDateTime(ex.executed_at)}</span>
                                <span>oleh {ex.executed_by_name}</span>
                                {ex.catatan && <span className="italic">— {ex.catatan}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions for active orders */}
                      {order.status === 'active' && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          <div className="flex gap-1 flex-1 min-w-[200px]">
                            <Input placeholder="Catatan eksekusi (opsional)" value={executeNote}
                              onChange={(e) => setExecuteNote(e.target.value)}
                              className="h-8 text-xs flex-1" />
                            <Button size="sm" className="h-8 text-xs" onClick={() => handleExecute(order.id)}
                              disabled={executeMut.isPending}>
                              <PlayCircle className="h-3.5 w-3.5 mr-1" /> Eksekusi
                            </Button>
                          </div>
                          <Button size="sm" variant="outline" className="h-8 text-xs"
                            onClick={() => updateStatusMut.mutateAsync({ orderId: order.id, status: 'completed' })
                              .then(() => toast.success('Instruksi selesai'))
                              .catch(() => toast.error('Gagal'))}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Selesai
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => setDiscontinueId(order.id)}>
                            <Ban className="h-3.5 w-3.5 mr-1" /> Hentikan
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-red-400 hover:text-red-600"
                            onClick={async () => {
                              if (!confirm('Hapus instruksi ini?')) return
                              try { await deleteMut.mutateAsync(order.id); toast.success('Instruksi dihapus') }
                              catch { toast.error('Gagal menghapus') }
                            }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Discontinue dialog */}
      {discontinueId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) { setDiscontinueId(null); setDiscontinueReason('') } }}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl shadow-2xl border overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-500" /> Hentikan Instruksi
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Alasan Penghentian *</label>
                <textarea value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                  placeholder="Contoh: Efek samping, alergi, perubahan terapi..." autoFocus />
              </div>
            </div>
            <div className="border-t bg-muted/30 px-5 py-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDiscontinueId(null); setDiscontinueReason('') }}>Batal</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!discontinueReason.trim() || updateStatusMut.isPending}
                onClick={handleDiscontinue}>
                {updateStatusMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Hentikan Instruksi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== NURSING NOTES TAB ====================

function NursingNotesTab({ visitId, patientId }: { visitId: string; patientId: string }) {
  const { data: notes, isLoading } = useNursingNotes(visitId)
  const createMut = useCreateNursingNote()
  const finalizeMut = useFinalizeNursingNote()
  const deleteMut = useDeleteNursingNote()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    shift: 'pagi' as NursingShift,
    situation: '', background: '', assessment: '', recommendation: '',
    intake_cairan: '', output_cairan: '', catatan_tambahan: '',
    tindakan: [{ waktu: '', tindakan: '', hasil: '' }],
  })

  const addTindakan = () => setForm({
    ...form, tindakan: [...form.tindakan, { waktu: '', tindakan: '', hasil: '' }],
  })

  const removeTindakan = (i: number) => setForm({
    ...form, tindakan: form.tindakan.filter((_, idx) => idx !== i),
  })

  const updateTindakan = (i: number, field: 'waktu' | 'tindakan' | 'hasil', val: string) => {
    const updated = form.tindakan.map((t, idx) =>
      idx === i ? { waktu: t.waktu, tindakan: t.tindakan, hasil: t.hasil, [field]: val } : t
    )
    setForm({ ...form, tindakan: updated })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMut.mutateAsync({
        visit_id: visitId, patient_id: patientId,
        shift: form.shift,
        situation: form.situation.trim() || undefined,
        background: form.background.trim() || undefined,
        assessment: form.assessment.trim() || undefined,
        recommendation: form.recommendation.trim() || undefined,
        tindakan_keperawatan: form.tindakan
          .filter((t) => t.waktu.trim() && t.tindakan.trim())
          .map((t) => ({ waktu: t.waktu, tindakan: t.tindakan, hasil: t.hasil || undefined })),
        intake_cairan: form.intake_cairan ? Number(form.intake_cairan) : undefined,
        output_cairan: form.output_cairan ? Number(form.output_cairan) : undefined,
        catatan_tambahan: form.catatan_tambahan.trim() || undefined,
      })
      toast.success('Catatan keperawatan berhasil dibuat')
      setForm({ shift: 'pagi', situation: '', background: '', assessment: '', recommendation: '',
        intake_cairan: '', output_cairan: '', catatan_tambahan: '',
        tindakan: [{ waktu: '', tindakan: '', hasil: '' }] })
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat catatan')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Catatan Keperawatan (SBAR)</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showForm ? 'Batal' : 'Buat Catatan'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Shift</label>
                <div className="flex gap-2">
                  {(['pagi', 'siang', 'malam'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, shift: s })}
                      className={cn(
                        'px-3 py-2 text-xs font-medium rounded-lg border transition-colors flex-1',
                        form.shift === s
                          ? SHIFT_COLORS[s] + ' border-current'
                          : 'hover:bg-muted',
                      )}>
                      {SHIFT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    <strong>S</strong>ituation — Kondisi saat ini
                  </label>
                  <textarea value={form.situation}
                    onChange={(e) => setForm({ ...form, situation: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
                    placeholder="Pasien mengeluh nyeri dada..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    <strong>B</strong>ackground — Riwayat
                  </label>
                  <textarea value={form.background}
                    onChange={(e) => setForm({ ...form, background: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
                    placeholder="Riwayat penyakit jantung..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    <strong>A</strong>ssessment — Penilaian
                  </label>
                  <textarea value={form.assessment}
                    onChange={(e) => setForm({ ...form, assessment: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
                    placeholder="TD meningkat, kemungkinan..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    <strong>R</strong>ecommendation — Rekomendasi
                  </label>
                  <textarea value={form.recommendation}
                    onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
                    placeholder="Konsultasi ke dokter jantung..." />
                </div>
              </div>

              {/* Tindakan keperawatan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">Tindakan Keperawatan</label>
                  <button type="button" onClick={addTindakan} className="text-xs text-primary hover:underline">
                    + Tambah
                  </button>
                </div>
                <div className="space-y-2">
                  {form.tindakan.map((t, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <Input placeholder="08:00" value={t.waktu}
                        onChange={(e) => updateTindakan(i, 'waktu', e.target.value)}
                        className="w-20 h-8 text-xs" />
                      <Input placeholder="Tindakan yang dilakukan" value={t.tindakan}
                        onChange={(e) => updateTindakan(i, 'tindakan', e.target.value)}
                        className="flex-1 h-8 text-xs" />
                      <Input placeholder="Hasil (opsional)" value={t.hasil}
                        onChange={(e) => updateTindakan(i, 'hasil', e.target.value)}
                        className="w-32 h-8 text-xs" />
                      {form.tindakan.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400"
                          onClick={() => removeTindakan(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Intake (mL)</label>
                  <Input type="number" placeholder="1500" value={form.intake_cairan}
                    onChange={(e) => setForm({ ...form, intake_cairan: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Output (mL)</label>
                  <Input type="number" placeholder="1200" value={form.output_cairan}
                    onChange={(e) => setForm({ ...form, output_cairan: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
                  <Input placeholder="Catatan tambahan" value={form.catatan_tambahan}
                    onChange={(e) => setForm({ ...form, catatan_tambahan: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Simpan Catatan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : !notes || notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada catatan keperawatan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id} className={cn(note.is_finalized && 'bg-muted/30')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-[10px]', SHIFT_COLORS[note.shift])}>
                      {note.shift.charAt(0).toUpperCase() + note.shift.slice(1)}
                    </Badge>
                    <span className="text-xs font-medium">{formatDate(note.tanggal)}</span>
                    <span className="text-[10px] text-muted-foreground">oleh {note.nurse_name}</span>
                    {note.is_finalized && (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
                        <Lock className="h-2.5 w-2.5 mr-0.5" /> Final
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!note.is_finalized && (
                      <>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600"
                          onClick={async () => {
                            try { await finalizeMut.mutateAsync(note.id); toast.success('Catatan difinalisasi') }
                            catch { toast.error('Gagal finalisasi') }
                          }}>
                          <Lock className="h-3 w-3 mr-0.5" /> Finalize
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400"
                          onClick={async () => {
                            if (!confirm('Hapus catatan ini?')) return
                            try { await deleteMut.mutateAsync(note.id); toast.success('Catatan dihapus') }
                            catch { toast.error('Gagal menghapus') }
                          }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* SBAR sections */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {note.situation && (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2">
                      <span className="font-bold text-blue-700 dark:text-blue-400">S — </span>
                      {note.situation}
                    </div>
                  )}
                  {note.background && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2">
                      <span className="font-bold text-amber-700 dark:text-amber-400">B — </span>
                      {note.background}
                    </div>
                  )}
                  {note.assessment && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">A — </span>
                      {note.assessment}
                    </div>
                  )}
                  {note.recommendation && (
                    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-2">
                      <span className="font-bold text-purple-700 dark:text-purple-400">R — </span>
                      {note.recommendation}
                    </div>
                  )}
                </div>

                {/* Tindakan */}
                {note.tindakan_keperawatan && note.tindakan_keperawatan.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Tindakan:</p>
                    <div className="space-y-0.5">
                      {note.tindakan_keperawatan.map((t, i) => (
                        <div key={i} className="flex gap-2 text-[10px]">
                          <span className="text-muted-foreground font-mono w-12 shrink-0">{t.waktu}</span>
                          <span>{t.tindakan}</span>
                          {t.hasil && <span className="text-emerald-600">→ {t.hasil}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fluid balance */}
                {(note.intake_cairan != null || note.output_cairan != null) && (
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {note.intake_cairan != null && <span>Intake: <strong>{note.intake_cairan}</strong> mL</span>}
                    {note.output_cairan != null && <span>Output: <strong>{note.output_cairan}</strong> mL</span>}
                    {note.intake_cairan != null && note.output_cairan != null && (
                      <span>Balance: <strong className={cn(
                        note.intake_cairan - note.output_cairan > 0 ? 'text-blue-600' : 'text-amber-600',
                      )}>
                        {note.intake_cairan - note.output_cairan > 0 ? '+' : ''}{note.intake_cairan - note.output_cairan} mL
                      </strong></span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== DISCHARGE PLANNING TAB ====================

function DischargePlanningTab({ visitId, patientId }: { visitId: string; patientId: string }) {
  const { data: plan, isLoading } = useDischargePlan(visitId, patientId)
  const updateMut = useUpdateDischargePlan()
  const [obatPulang, setObatPulang] = useState<{ nama: string; dosis: string; frekuensi: string; durasi: string }[]>([])
  const [jadwalKontrol, setJadwalKontrol] = useState({ tanggal: '', poli: '', dokter: '' })
  const [edukasiCatatan, setEdukasiCatatan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (plan && !initialized) {
      setObatPulang(plan.obat_pulang || [])
      setJadwalKontrol({
        tanggal: plan.jadwal_kontrol_tanggal || '',
        poli: plan.jadwal_kontrol_poli || '',
        dokter: plan.jadwal_kontrol_dokter || '',
      })
      setEdukasiCatatan(plan.edukasi_catatan || '')
      setCatatan(plan.catatan || '')
      setInitialized(true)
    }
  }, [plan, initialized])

  const CHECKLIST_ITEMS: { key: keyof DischargePlan; label: string; icon: React.ReactNode }[] = [
    { key: 'klinis_stabil', label: 'Klinis stabil (vital signs normal)', icon: <Heart className="h-4 w-4" /> },
    { key: 'luka_kering', label: 'Luka operasi kering (jika ada)', icon: <ShieldCheck className="h-4 w-4" /> },
    { key: 'intake_oral_baik', label: 'Intake oral baik / toleransi makan', icon: <Scale className="h-4 w-4" /> },
    { key: 'mobilisasi_mandiri', label: 'Mobilisasi mandiri / dengan bantuan minimal', icon: <UserCheck className="h-4 w-4" /> },
    { key: 'obat_pulang_siap', label: 'Obat pulang sudah disiapkan', icon: <Pill className="h-4 w-4" /> },
    { key: 'edukasi_diberikan', label: 'Edukasi pasien & keluarga diberikan', icon: <FileText className="h-4 w-4" /> },
    { key: 'jadwal_kontrol_set', label: 'Jadwal kontrol sudah ditentukan', icon: <CalendarCheck className="h-4 w-4" /> },
    { key: 'resume_final', label: 'Resume medis sudah final', icon: <Clipboard className="h-4 w-4" /> },
    { key: 'billing_selesai', label: 'Billing selesai / administrasi clear', icon: <FileText className="h-4 w-4" /> },
    { key: 'surat_sakit', label: 'Surat keterangan sakit (jika perlu)', icon: <FileText className="h-4 w-4" /> },
  ]

  const handleToggle = async (key: string, value: boolean) => {
    if (!plan) return
    try {
      await updateMut.mutateAsync({ planId: plan.id, [key]: value })
    } catch {
      toast.error('Gagal update')
    }
  }

  const handleSaveDetails = async () => {
    if (!plan) return
    try {
      await updateMut.mutateAsync({
        planId: plan.id,
        obat_pulang: obatPulang.filter((o) => o.nama.trim()),
        jadwal_kontrol_tanggal: jadwalKontrol.tanggal || undefined,
        jadwal_kontrol_poli: jadwalKontrol.poli || undefined,
        jadwal_kontrol_dokter: jadwalKontrol.dokter || undefined,
        edukasi_catatan: edukasiCatatan || undefined,
        catatan: catatan || undefined,
      })
      toast.success('Detail perencanaan pulang disimpan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  if (isLoading) {
    return <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
    </div>
  }

  if (!plan) return null

  const checkedCount = CHECKLIST_ITEMS.filter((item) => plan[item.key] as boolean).length
  const totalCount = CHECKLIST_ITEMS.length
  const pct = Math.round((checkedCount / totalCount) * 100)

  return (
    <div className="space-y-4">
      {/* Readiness overview */}
      <Card className={cn(
        'border-2',
        plan.readiness === 'ready' ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' :
        plan.readiness === 'partial' ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' :
        'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Kesiapan Pulang</h3>
              <p className="text-xs text-muted-foreground">{checkedCount}/{totalCount} item terpenuhi</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div className={cn(
                  'h-full rounded-full transition-all',
                  plan.readiness === 'ready' ? 'bg-emerald-500' :
                  plan.readiness === 'partial' ? 'bg-amber-500' : 'bg-red-500',
                )} style={{ width: `${pct}%` }} />
              </div>
              <Badge className={cn('text-xs',
                plan.readiness === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                plan.readiness === 'partial' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700',
              )}>
                {plan.readiness === 'ready' ? 'Siap Pulang' :
                 plan.readiness === 'partial' ? 'Sebagian Siap' : 'Belum Siap'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Checklist Kesiapan Pulang</h3>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = plan[item.key] as boolean
              return (
                <label key={item.key} className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  checked
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : 'hover:bg-muted/50',
                )}>
                  <input type="checkbox" checked={checked}
                    onChange={(e) => handleToggle(item.key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className={cn('text-muted-foreground', checked && 'text-emerald-600')}>{item.icon}</span>
                  <span className={cn('text-sm', checked ? 'text-emerald-700 dark:text-emerald-400' : '')}>{item.label}</span>
                </label>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Obat pulang */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Obat Pulang</h3>
            <button className="text-xs text-primary hover:underline" type="button"
              onClick={() => setObatPulang([...obatPulang, { nama: '', dosis: '', frekuensi: '', durasi: '' }])}>
              + Tambah Obat
            </button>
          </div>
          {obatPulang.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada obat pulang</p>
          ) : (
            <div className="space-y-2">
              {obatPulang.map((obat, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input placeholder="Nama obat" value={obat.nama}
                    onChange={(e) => {
                      setObatPulang(obatPulang.map((o, idx) =>
                        idx === i ? { nama: e.target.value, dosis: o.dosis, frekuensi: o.frekuensi, durasi: o.durasi } : o))
                    }} className="flex-1 h-8 text-xs" />
                  <Input placeholder="Dosis" value={obat.dosis}
                    onChange={(e) => {
                      setObatPulang(obatPulang.map((o, idx) =>
                        idx === i ? { nama: o.nama, dosis: e.target.value, frekuensi: o.frekuensi, durasi: o.durasi } : o))
                    }} className="w-24 h-8 text-xs" />
                  <Input placeholder="Frekuensi" value={obat.frekuensi}
                    onChange={(e) => {
                      setObatPulang(obatPulang.map((o, idx) =>
                        idx === i ? { nama: o.nama, dosis: o.dosis, frekuensi: e.target.value, durasi: o.durasi } : o))
                    }} className="w-24 h-8 text-xs" />
                  <Input placeholder="Durasi" value={obat.durasi}
                    onChange={(e) => {
                      setObatPulang(obatPulang.map((o, idx) =>
                        idx === i ? { nama: o.nama, dosis: o.dosis, frekuensi: o.frekuensi, durasi: e.target.value } : o))
                    }} className="w-24 h-8 text-xs" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400"
                    onClick={() => setObatPulang(obatPulang.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jadwal kontrol + edukasi */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Jadwal Kontrol & Edukasi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tanggal Kontrol</label>
              <DateInput value={jadwalKontrol.tanggal}
                onChange={(val) => setJadwalKontrol({ ...jadwalKontrol, tanggal: val })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Poli</label>
              <Input placeholder="Poli Penyakit Dalam" value={jadwalKontrol.poli}
                onChange={(e) => setJadwalKontrol({ ...jadwalKontrol, poli: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Dokter</label>
              <Input placeholder="dr. Ahmad" value={jadwalKontrol.dokter}
                onChange={(e) => setJadwalKontrol({ ...jadwalKontrol, dokter: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan Edukasi</label>
            <textarea value={edukasiCatatan}
              onChange={(e) => setEdukasiCatatan(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
              placeholder="Edukasi yang diberikan: minum obat teratur, kontrol tepat waktu..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan Umum</label>
            <textarea value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
              placeholder="Catatan tambahan perencanaan pulang..." />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveDetails} disabled={updateMut.isPending}>
              {updateMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Simpan Detail
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== MAIN PAGE ====================

type Tab = 'vitals' | 'orders' | 'nursing' | 'discharge'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'vitals', label: 'Vital Signs', icon: <Heart className="h-4 w-4" /> },
  { id: 'orders', label: 'Instruksi Medis', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'nursing', label: 'Catatan Keperawatan', icon: <FileText className="h-4 w-4" /> },
  { id: 'discharge', label: 'Perencanaan Pulang', icon: <CalendarCheck className="h-4 w-4" /> },
]

export default function InpatientClinicalPage() {
  const params = useParams()
  const router = useRouter()
  const visitId = params.visitId as string
  const [activeTab, setActiveTab] = useState<Tab>('vitals')

  const { data: summary, isLoading } = useClinicalSummary(visitId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    )
  }

  const visit = summary?.visit as Record<string, string> | undefined
  const patientId = (visit?.patient_id ?? '') as string

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.push('/rawat-inap')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Rawat Inap
          </button>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Monitoring Klinis
          </h1>
        </div>
      </div>

      {/* Patient info card */}
      {visit && (
        <Card className="border-2 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold">{visit.patient_nama}</h2>
                  <Badge variant="outline" className="text-xs">{visit.no_rekam_medis}</Badge>
                  {summary?.latestVitals && alertBadge(summary.latestVitals.alert_level)}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Hari Rawat: <strong className="text-foreground">{summary?.hariRawat ?? '-'}</strong></span>
                  <span>Ruang: <strong className="text-foreground">{visit.room_nama || '-'}</strong></span>
                  <span>Bed: <strong className="text-foreground">{visit.bed_nomor || '-'}</strong></span>
                  <span>Dokter: <strong className="text-foreground">Dr. {visit.doctor_nama || '-'}</strong></span>
                  <span>Masuk: <strong className="text-foreground">{formatDate(visit.admission_date || visit.tanggal || null)}</strong></span>
                </div>
              </div>
              <div className="flex gap-3 text-center">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 px-3 py-2">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{summary?.activeOrdersCount ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">Instruksi Aktif</div>
                </div>
                <div className={cn('rounded-lg px-3 py-2',
                  summary?.dischargePlan?.readiness === 'ready' ? 'bg-emerald-50 dark:bg-emerald-950/20' :
                  summary?.dischargePlan?.readiness === 'partial' ? 'bg-amber-50 dark:bg-amber-950/20' :
                  'bg-red-50 dark:bg-red-950/20',
                )}>
                  <div className={cn('text-lg font-bold',
                    summary?.dischargePlan?.readiness === 'ready' ? 'text-emerald-700' :
                    summary?.dischargePlan?.readiness === 'partial' ? 'text-amber-700' :
                    'text-red-700',
                  )}>
                    {summary?.dischargePlan?.readiness === 'ready' ? '✓' :
                     summary?.dischargePlan?.readiness === 'partial' ? '◐' : '✗'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {summary?.dischargePlan?.readiness === 'ready' ? 'Siap Pulang' :
                     summary?.dischargePlan?.readiness === 'partial' ? 'Sebagian' : 'Belum Siap'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'vitals' && patientId && <VitalSignsTab visitId={visitId} patientId={patientId} />}
      {activeTab === 'orders' && patientId && <MedicalOrdersTab visitId={visitId} patientId={patientId} />}
      {activeTab === 'nursing' && patientId && <NursingNotesTab visitId={visitId} patientId={patientId} />}
      {activeTab === 'discharge' && patientId && <DischargePlanningTab visitId={visitId} patientId={patientId} />}
    </div>
  )
}
