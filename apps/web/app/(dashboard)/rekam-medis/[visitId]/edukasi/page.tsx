'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Printer,
  GraduationCap,
  Loader2,
  ShieldCheck,
  X,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { DateInput } from '@/components/ui/date-input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { useVisit } from '@/hooks/use-registration'
import {
  useEducationByVisit,
  useEducationStatsByVisit,
  useEducationTopics,
  useCreateEducationRecord,
  useUpdateEducationRecord,
  useDeleteEducationRecord,
  useVerifyEducationRecord,
} from '@/hooks/use-education'
import { toast } from 'sonner'
import type {
  EducationRecord,
  EducationTopic,
  CreateEducationRecordInput,
  UpdateEducationRecordInput,
} from '@/lib/api/education'

// --- Constants ---

const KATEGORI_OPTIONS = [
  { value: 'diagnosis', label: 'Diagnosis', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'terapi', label: 'Terapi', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'obat', label: 'Obat', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  { value: 'diet', label: 'Diet', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'nyeri', label: 'Nyeri', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'rehabilitasi', label: 'Rehabilitasi', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'luka', label: 'Luka', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  { value: 'tanda_bahaya', label: 'Tanda Bahaya', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' },
  { value: 'discharge', label: 'Discharge', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  { value: 'lain', label: 'Lain-lain', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
]

const METODE_OPTIONS = [
  { value: 'lisan', label: 'Lisan' },
  { value: 'demonstrasi', label: 'Demonstrasi' },
  { value: 'leaflet', label: 'Leaflet / Brosur' },
  { value: 'video', label: 'Video' },
  { value: 'gambar', label: 'Gambar / Poster' },
  { value: 'audio', label: 'Audio' },
]

const BAHASA_OPTIONS = ['Indonesia', 'Jawa', 'Sunda', 'Madura', 'Inggris', 'Lain']

function getKategoriStyle(kategori: string) {
  return KATEGORI_OPTIONS.find((k) => k.value === kategori)?.color
    || 'bg-gray-100 text-gray-800'
}

function getKategoriLabel(kategori: string) {
  return KATEGORI_OPTIONS.find((k) => k.value === kategori)?.label || kategori
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =====================================================
// MAIN PAGE
// =====================================================

export default function EducationPage() {
  const params = useParams<{ visitId: string }>()
  const visitId = params.visitId

  const { data: visitRes, isLoading: visitLoading } = useVisit(visitId)
  const visit = visitRes?.data

  const { data: recordsRes, isLoading: recordsLoading } = useEducationByVisit(visitId)
  const records = recordsRes?.data ?? []

  const { data: statsRes } = useEducationStatsByVisit(visitId)
  const stats = statsRes?.data

  const [formOpen, setFormOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<EducationRecord | null>(null)
  const [verifyDialogId, setVerifyDialogId] = useState<string | null>(null)
  const [printId, setPrintId] = useState<string | null>(null)

  const handleAdd = useCallback(() => {
    setEditRecord(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((record: EducationRecord) => {
    setEditRecord(record)
    setFormOpen(true)
  }, [])

  const deleteMut = useDeleteEducationRecord()
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Hapus catatan edukasi ini?')) return
    try {
      await deleteMut.mutateAsync(id)
      toast.success('Catatan edukasi dihapus')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus')
    }
  }, [deleteMut])

  const isLoading = visitLoading || recordsLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Kunjungan tidak ditemukan</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/rekam-medis">Kembali</Link>
        </Button>
      </div>
    )
  }

  const patientNama = visit.patient_nama || 'Pasien'
  const noRM = visit.no_rekam_medis || '-'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/rekam-medis/${visitId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Edukasi Pasien
          </h1>
          <p className="text-sm text-muted-foreground">
            {patientNama} &middot; {noRM} &middot; {visit.visit_number}
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Tambah Edukasi
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPrintId('all')}
        >
          <Printer className="h-4 w-4 mr-1" />
          Cetak Formulir
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Topik Diberikan"
          value={stats?.totalTopics ?? records.length}
          icon={<GraduationCap className="h-4 w-4" />}
        />
        <StatCard
          label="Terverifikasi"
          value={stats?.verifiedCount ?? 0}
          icon={<CheckCircle className="h-4 w-4 text-green-600" />}
          variant={stats?.allVerified ? 'success' : undefined}
        />
        <StatCard
          label="Perlu Re-edukasi"
          value={stats?.reeducationNeeded ?? 0}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          variant={
            (stats?.reeducationNeeded ?? 0) > 0 ? 'warning' : undefined
          }
        />
        <StatCard
          label="Status"
          value={
            stats?.allVerified && (stats?.totalTopics ?? 0) > 0
              ? 'Lengkap'
              : 'Belum Lengkap'
          }
          icon={
            stats?.allVerified && (stats?.totalTopics ?? 0) > 0
              ? <ShieldCheck className="h-4 w-4 text-green-600" />
              : <AlertTriangle className="h-4 w-4 text-amber-600" />
          }
        />
      </div>

      {/* Records */}
      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-1 font-medium">
              Belum ada catatan edukasi
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Dokumentasikan edukasi yang diberikan kepada pasien/keluarga
            </p>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Tambah Edukasi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <EducationRecordCard
              key={record.id}
              record={record}
              onEdit={() => handleEdit(record)}
              onDelete={() => handleDelete(record.id)}
              onVerify={() => setVerifyDialogId(record.id)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <EducationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        visitId={visitId}
        editRecord={editRecord}
      />

      {/* Verify Dialog */}
      {verifyDialogId && (
        <VerifyDialog
          recordId={verifyDialogId}
          onClose={() => setVerifyDialogId(null)}
          record={records.find((r) => r.id === verifyDialogId)}
        />
      )}

      {/* Print Dialog */}
      {printId && (
        <PrintDialog
          records={records}
          visit={visit}
          patientNama={patientNama}
          noRM={noRM}
          onClose={() => setPrintId(null)}
        />
      )}
    </div>
  )
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  icon,
  variant,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  variant?: 'success' | 'warning'
}) {
  return (
    <Card
      className={
        variant === 'success'
          ? 'border-green-200 bg-green-50 dark:bg-green-950/30'
          : variant === 'warning'
            ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/30'
            : ''
      }
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

// =====================================================
// RECORD CARD
// =====================================================

function EducationRecordCard({
  record,
  onEdit,
  onDelete,
  onVerify,
}: {
  record: EducationRecord
  onEdit: () => void
  onDelete: () => void
  onVerify: () => void
}) {
  const topikNama = record.topic_nama || record.topik_manual || '-'
  const isVerified = record.verified_by_patient

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{topikNama}</span>
              <Badge className={`text-[10px] ${getKategoriStyle(record.kategori)}`}>
                {getKategoriLabel(record.kategori)}
              </Badge>
            </div>

            {/* Metode badges */}
            <div className="flex items-center gap-1 flex-wrap">
              {record.metode.map((m) => (
                <Badge key={m} variant="outline" className="text-[10px]">
                  {METODE_OPTIONS.find((o) => o.value === m)?.label || m}
                </Badge>
              ))}
            </div>

            {/* Evaluasi */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Evaluasi:</span>
              <EvaluasiBadge value={record.evaluasi_pemahaman} />
              {record.perlu_reedukasi && !record.reedukasi_ref && (
                <Badge variant="destructive" className="text-[10px]">
                  Perlu Re-edukasi
                </Badge>
              )}
            </div>

            {/* Sasaran */}
            <div className="text-xs text-muted-foreground">
              Sasaran:{' '}
              {record.sasaran === 'pasien'
                ? 'Pasien'
                : record.sasaran === 'keluarga'
                  ? `Keluarga (${record.nama_sasaran || '-'}${record.hubungan_sasaran ? ` — ${record.hubungan_sasaran}` : ''})`
                  : `Pasien & Keluarga (${record.nama_sasaran || '-'})`}
            </div>

            {/* Educator + time */}
            <div className="text-xs text-muted-foreground">
              Edukator: {record.educator_nama} &middot;{' '}
              {formatDateTime(record.tanggal)}
            </div>

            {/* Verification status */}
            <div className="flex items-center gap-1">
              {isVerified ? (
                <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  Terverifikasi
                  {record.verified_at && (
                    <span className="text-muted-foreground ml-1">
                      ({formatDateTime(record.verified_at)})
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  Belum diverifikasi
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {!isVerified && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={onVerify}
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Verifikasi
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onEdit}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </>
            )}
            {record.status === 'draft' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-700"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================================
// EVALUASI BADGE
// =====================================================

function EvaluasiBadge({ value }: { value: string }) {
  if (value === 'baik') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">
        Baik
      </Badge>
    )
  }
  if (value === 'cukup') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-[10px]">
        Cukup
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px]">
      Kurang
    </Badge>
  )
}

// =====================================================
// FORM DIALOG
// =====================================================

function EducationFormDialog({
  open,
  onOpenChange,
  visitId,
  editRecord,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  visitId: string
  editRecord: EducationRecord | null
}) {
  const { data: topicsRes } = useEducationTopics({ is_active: true })
  const topics = topicsRes?.data ?? []

  const createMut = useCreateEducationRecord()
  const updateMut = useUpdateEducationRecord()

  const [topicId, setTopicId] = useState('')
  const [topikManual, setTopikManual] = useState('')
  const [kategori, setKategori] = useState('')
  const [materi, setMateri] = useState('')
  const [metode, setMetode] = useState<string[]>([])
  const [bahasa, setBahasa] = useState('Indonesia')
  const [sasaran, setSasaran] = useState('pasien')
  const [namaSasaran, setNamaSasaran] = useState('')
  const [hubunganSasaran, setHubunganSasaran] = useState('')
  const [evaluasi, setEvaluasi] = useState('baik')
  const [evaluasiCatatan, setEvaluasiCatatan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [reedukTanggal, setReedukTanggal] = useState('')
  const [topicSearch, setTopicSearch] = useState('')

  // Reset form on open/change
  useEffect(() => {
    if (open) {
      if (editRecord) {
        setTopicId(editRecord.topic_id || '')
        setTopikManual(editRecord.topik_manual || '')
        setKategori(editRecord.kategori)
        setMateri(editRecord.materi_diberikan)
        setMetode(editRecord.metode)
        setBahasa(editRecord.bahasa)
        setSasaran(editRecord.sasaran)
        setNamaSasaran(editRecord.nama_sasaran || '')
        setHubunganSasaran(editRecord.hubungan_sasaran || '')
        setEvaluasi(editRecord.evaluasi_pemahaman)
        setEvaluasiCatatan(editRecord.evaluasi_catatan || '')
        setCatatan(editRecord.catatan || '')
        setReedukTanggal(editRecord.reedukasi_tanggal || '')
        setTopicSearch('')
      } else {
        setTopicId('')
        setTopikManual('')
        setKategori('')
        setMateri('')
        setMetode([])
        setBahasa('Indonesia')
        setSasaran('pasien')
        setNamaSasaran('')
        setHubunganSasaran('')
        setEvaluasi('baik')
        setEvaluasiCatatan('')
        setCatatan('')
        setReedukTanggal('')
        setTopicSearch('')
      }
    }
  }, [open, editRecord])

  const handleTopicSelect = (topic: EducationTopic) => {
    setTopicId(topic.id)
    setTopikManual('')
    setKategori(topic.kategori)
    if (topic.materi) setMateri(topic.materi)
    setTopicSearch(topic.nama)
  }

  const handleMetodeToggle = (value: string) => {
    setMetode((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value],
    )
  }

  const filteredTopics = topics.filter((t) =>
    !topicSearch
      || t.nama.toLowerCase().includes(topicSearch.toLowerCase())
      || t.kode.toLowerCase().includes(topicSearch.toLowerCase()),
  )

  const handleSubmit = async () => {
    if (!kategori) {
      toast.error('Kategori wajib diisi')
      return
    }
    if (!materi) {
      toast.error('Materi wajib diisi')
      return
    }
    if (metode.length === 0) {
      toast.error('Pilih minimal satu metode edukasi')
      return
    }

    try {
      if (editRecord) {
        const data: UpdateEducationRecordInput = {
          topic_id: topicId || null,
          topik_manual: !topicId ? topikManual : null,
          kategori,
          materi_diberikan: materi,
          metode,
          bahasa,
          sasaran,
          nama_sasaran: namaSasaran || null,
          hubungan_sasaran: hubunganSasaran || null,
          evaluasi_pemahaman: evaluasi,
          evaluasi_catatan: evaluasiCatatan || null,
          catatan: catatan || null,
        }
        await updateMut.mutateAsync({ id: editRecord.id, data })
        toast.success('Catatan edukasi diperbarui')
      } else {
        const data: CreateEducationRecordInput = {
          visit_id: visitId,
          topic_id: topicId || undefined,
          topik_manual: !topicId ? topikManual : undefined,
          kategori,
          materi_diberikan: materi,
          metode,
          bahasa,
          sasaran,
          nama_sasaran: namaSasaran || undefined,
          hubungan_sasaran: hubunganSasaran || undefined,
          evaluasi_pemahaman: evaluasi,
          evaluasi_catatan: evaluasiCatatan || undefined,
          catatan: catatan || undefined,
        }
        await createMut.mutateAsync(data)
        toast.success('Catatan edukasi berhasil disimpan')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editRecord ? 'Edit Catatan Edukasi' : 'Tambah Edukasi Pasien'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. Topik */}
          <div className="space-y-2">
            <Label className="font-semibold">Topik Edukasi</Label>
            <Input
              placeholder="Cari topik dari master data..."
              value={topicSearch}
              onChange={(e) => {
                setTopicSearch(e.target.value)
                if (topicId) {
                  setTopicId('')
                }
              }}
            />
            {topicSearch && !topicId && filteredTopics.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredTopics.slice(0, 10).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center justify-between"
                    onClick={() => handleTopicSelect(t)}
                  >
                    <span>
                      <span className="font-medium">{t.nama}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        [{t.kode}]
                      </span>
                    </span>
                    <Badge
                      className={`text-[9px] ${getKategoriStyle(t.kategori)}`}
                    >
                      {getKategoriLabel(t.kategori)}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
            {!topicId && (
              <Input
                placeholder="Atau ketik topik bebas..."
                value={topikManual}
                onChange={(e) => setTopikManual(e.target.value)}
              />
            )}
          </div>

          {/* 2. Kategori */}
          <div className="space-y-1">
            <Label className="font-semibold">Kategori</Label>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {KATEGORI_OPTIONS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Materi */}
          <div className="space-y-1">
            <Label className="font-semibold">Materi yang Diberikan</Label>
            <Textarea
              rows={4}
              placeholder="Detail materi edukasi yang diberikan kepada pasien/keluarga..."
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
            />
          </div>

          {/* 4. Metode */}
          <div className="space-y-2">
            <Label className="font-semibold">Metode Edukasi</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {METODE_OPTIONS.map((m) => (
                <label
                  key={m.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={metode.includes(m.value)}
                    onCheckedChange={() => handleMetodeToggle(m.value)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {/* 5. Sasaran */}
          <div className="space-y-2">
            <Label className="font-semibold">Sasaran Edukasi</Label>
            <div className="flex gap-4">
              {[
                { value: 'pasien', label: 'Pasien' },
                { value: 'keluarga', label: 'Keluarga' },
                { value: 'pasien_keluarga', label: 'Pasien & Keluarga' },
              ].map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="sasaran"
                    value={s.value}
                    checked={sasaran === s.value}
                    onChange={() => setSasaran(s.value)}
                    className="accent-primary"
                  />
                  {s.label}
                </label>
              ))}
            </div>
            {(sasaran === 'keluarga' || sasaran === 'pasien_keluarga') && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-xs">Nama Sasaran</Label>
                  <Input
                    value={namaSasaran}
                    onChange={(e) => setNamaSasaran(e.target.value)}
                    placeholder="Nama keluarga"
                  />
                </div>
                <div>
                  <Label className="text-xs">Hubungan</Label>
                  <Input
                    value={hubunganSasaran}
                    onChange={(e) => setHubunganSasaran(e.target.value)}
                    placeholder="Contoh: Istri, Anak, Orang tua"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. Bahasa */}
          <div className="space-y-1">
            <Label className="font-semibold">Bahasa Edukasi</Label>
            <Select value={bahasa} onValueChange={setBahasa}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAHASA_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 7. Evaluasi Pemahaman */}
          <div className="space-y-2">
            <Label className="font-semibold">Evaluasi Pemahaman</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="evaluasi"
                  value="baik"
                  checked={evaluasi === 'baik'}
                  onChange={() => setEvaluasi('baik')}
                  className="accent-green-600"
                />
                <span className="text-green-700 dark:text-green-400 font-medium">
                  Baik
                </span>
                <span className="text-[10px] text-muted-foreground">
                  (mampu menjelaskan ulang)
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="evaluasi"
                  value="cukup"
                  checked={evaluasi === 'cukup'}
                  onChange={() => setEvaluasi('cukup')}
                  className="accent-yellow-600"
                />
                <span className="text-yellow-700 dark:text-yellow-400 font-medium">
                  Cukup
                </span>
                <span className="text-[10px] text-muted-foreground">
                  (memahami sebagian)
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="evaluasi"
                  value="kurang"
                  checked={evaluasi === 'kurang'}
                  onChange={() => setEvaluasi('kurang')}
                  className="accent-red-600"
                />
                <span className="text-red-700 dark:text-red-400 font-medium">
                  Kurang
                </span>
                <span className="text-[10px] text-muted-foreground">
                  (perlu re-edukasi)
                </span>
              </label>
            </div>

            {evaluasi === 'kurang' && (
              <div className="mt-2 p-3 border border-red-200 bg-red-50 dark:bg-red-950/30 rounded-md">
                <Label className="text-xs text-red-700 dark:text-red-400">
                  Tanggal Re-edukasi
                </Label>
                <DateInput
                  value={reedukTanggal}
                  onChange={(v) => setReedukTanggal(v)}
                  className="mt-1 w-48"
                />
              </div>
            )}
          </div>

          {/* 8. Catatan evaluasi */}
          <div className="space-y-1">
            <Label>Catatan Evaluasi</Label>
            <Textarea
              rows={2}
              placeholder="Catatan tambahan tentang pemahaman pasien..."
              value={evaluasiCatatan}
              onChange={(e) => setEvaluasiCatatan(e.target.value)}
            />
          </div>

          {/* Catatan umum */}
          <div className="space-y-1">
            <Label>Catatan</Label>
            <Textarea
              rows={2}
              placeholder="Catatan lain..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {editRecord ? 'Simpan Perubahan' : 'Simpan Edukasi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// VERIFY DIALOG (Signature Pad)
// =====================================================

function VerifyDialog({
  recordId,
  onClose,
  record,
}: {
  recordId: string
  onClose: () => void
  record?: EducationRecord
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const verifyMut = useVerifyEducationRecord()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasSignature(true)
  }

  const handleEnd = () => {
    setIsDrawing(false)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleVerify = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) {
      toast.error('Tanda tangan diperlukan')
      return
    }

    const signatureData = canvas.toDataURL('image/png')
    try {
      await verifyMut.mutateAsync({ id: recordId, signatureData })
      toast.success('Catatan edukasi berhasil diverifikasi')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memverifikasi')
    }
  }

  const topikNama = record?.topic_nama || record?.topik_manual || '-'

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Verifikasi Edukasi Pasien</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Topik:</span>{' '}
                <span className="font-medium">{topikNama}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Kategori:</span>{' '}
                {getKategoriLabel(record?.kategori || '')}
              </p>
              <p>
                <span className="text-muted-foreground">Edukator:</span>{' '}
                {record?.educator_nama}
              </p>
            </CardContent>
          </Card>

          {/* Pernyataan */}
          <p className="text-sm font-medium text-center px-4">
            &ldquo;Saya telah menerima edukasi dan memahami materi yang
            diberikan&rdquo;
          </p>

          {/* Signature pad */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Tanda tangan pasien/keluarga di bawah ini:
            </Label>
            <div className="relative border rounded-md bg-white dark:bg-gray-950">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair touch-none"
                style={{ height: 160 }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 h-7 text-xs"
                onClick={handleClear}
              >
                <Undo2 className="h-3 w-3 mr-1" />
                Hapus
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleVerify}
            disabled={!hasSignature || verifyMut.isPending}
          >
            {verifyMut.isPending && (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            )}
            <ShieldCheck className="h-4 w-4 mr-1" />
            Verifikasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// PRINT DIALOG (A4)
// =====================================================

function PrintDialog({
  records,
  visit,
  patientNama,
  noRM,
  onClose,
}: {
  records: EducationRecord[]
  visit: Record<string, unknown>
  patientNama: string
  noRM: string
  onClose: () => void
}) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rows = records
      .map(
        (r, i) => `
      <tr>
        <td style="text-align:center;padding:6px;border:1px solid #333">${i + 1}</td>
        <td style="padding:6px;border:1px solid #333">${formatDateTime(r.tanggal)}</td>
        <td style="padding:6px;border:1px solid #333">
          <strong>${r.topic_nama || r.topik_manual || '-'}</strong><br/>
          <small>${r.materi_diberikan.substring(0, 120)}${r.materi_diberikan.length > 120 ? '...' : ''}</small>
        </td>
        <td style="padding:6px;border:1px solid #333">${r.metode.map((m) => METODE_OPTIONS.find((o) => o.value === m)?.label || m).join(', ')}</td>
        <td style="padding:6px;border:1px solid #333">${r.sasaran === 'pasien' ? 'Pasien' : r.sasaran === 'keluarga' ? `Keluarga (${r.nama_sasaran || '-'})` : `Pasien & Keluarga`}</td>
        <td style="text-align:center;padding:6px;border:1px solid #333">${r.evaluasi_pemahaman === 'baik' ? 'Baik' : r.evaluasi_pemahaman === 'cukup' ? 'Cukup' : 'Kurang'}</td>
        <td style="padding:6px;border:1px solid #333">${r.educator_nama || '-'}</td>
        <td style="text-align:center;padding:6px;border:1px solid #333;width:80px">${r.verified_by_patient ? '(tertandatangani)' : ''}</td>
      </tr>`,
      )
      .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Formulir Edukasi Pasien</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #f0f0f0; padding: 6px; border: 1px solid #333; font-size: 10pt; text-align: center; }
          td { font-size: 9pt; vertical-align: top; }
          .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .header h2 { margin: 4px 0; font-size: 14pt; }
          .patient-info { margin-bottom: 12px; }
          .patient-info td { border: none; padding: 2px 8px; font-size: 10pt; }
          .footer { margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>FORMULIR EDUKASI PASIEN TERINTEGRASI</h2>
          <p style="font-size:10pt;margin:0">Dokumentasi Pemberian Edukasi kepada Pasien / Keluarga</p>
        </div>

        <table class="patient-info">
          <tr>
            <td><strong>Nama Pasien</strong></td>
            <td>: ${patientNama}</td>
            <td><strong>No. RM</strong></td>
            <td>: ${noRM}</td>
          </tr>
          <tr>
            <td><strong>No. Kunjungan</strong></td>
            <td>: ${(visit as Record<string, string>).visit_number || '-'}</td>
            <td><strong>Tanggal</strong></td>
            <td>: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th style="width:30px">No</th>
              <th style="width:90px">Tanggal/Jam</th>
              <th>Topik / Materi</th>
              <th style="width:80px">Metode</th>
              <th style="width:80px">Sasaran</th>
              <th style="width:50px">Evaluasi</th>
              <th style="width:80px">Edukator</th>
              <th style="width:80px">TTD Pasien</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" style="text-align:center;padding:20px;border:1px solid #333">Belum ada catatan edukasi</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <table style="width:100%;border:none;margin-top:30px">
            <tr>
              <td style="border:none;text-align:center;width:50%">
                <p>Penanggung Jawab Edukasi</p>
                <br/><br/><br/>
                <p>( ________________________ )</p>
              </td>
              <td style="border:none;text-align:center;width:50%">
                <p>Pasien / Keluarga</p>
                <br/><br/><br/>
                <p>( ________________________ )</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cetak Formulir Edukasi</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cetak formulir edukasi pasien terintegrasi dalam format A4. Berisi{' '}
          {records.length} catatan edukasi.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
