'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Clock,
  User,
  CheckCircle2,
  Shield,
  Pencil,
  Trash2,
  Loader2,
  Filter,
  Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useCpptByVisit,
  useCreateCppt,
  useUpdateCppt,
  useVerifyCppt,
  useDeleteCppt,
} from '@/hooks/use-cppt'
import { useVisit } from '@/hooks/use-registration'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CpptEntry } from '@/lib/api/cppt'

const PROFESI_COLORS: Record<string, string> = {
  Dokter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Perawat: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Apoteker: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Analis Lab': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Radiografer: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Rekam Medis': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  Admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Fisioterapis: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'Terapis Wicara': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'Terapis Okupasi': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
}

const PROFESI_TIMELINE_COLORS: Record<string, string> = {
  Dokter: 'border-blue-400 bg-blue-400',
  Perawat: 'border-green-400 bg-green-400',
  Apoteker: 'border-purple-400 bg-purple-400',
  'Analis Lab': 'border-amber-400 bg-amber-400',
  Radiografer: 'border-orange-400 bg-orange-400',
  Fisioterapis: 'border-teal-400 bg-teal-400',
  'Terapis Wicara': 'border-cyan-400 bg-cyan-400',
  'Terapis Okupasi': 'border-indigo-400 bg-indigo-400',
}

const FILTER_OPTIONS = [
  { value: '', label: 'Semua Profesi' },
  { value: 'Dokter', label: 'Dokter' },
  { value: 'Perawat', label: 'Perawat' },
  { value: 'Apoteker', label: 'Apoteker' },
  { value: 'Analis Lab', label: 'Analis Lab' },
  { value: 'Radiografer', label: 'Radiografer' },
  { value: 'Fisioterapis', label: 'Fisioterapis' },
  { value: 'Terapis Wicara', label: 'Terapis Wicara' },
  { value: 'Terapis Okupasi', label: 'Terapis Okupasi' },
]

interface FormState {
  subjective: string
  objective: string
  assessment: string
  planning: string
  instruksi: string
  evaluasi: string
}

const INITIAL_FORM: FormState = {
  subjective: '',
  objective: '',
  assessment: '',
  planning: '',
  instruksi: '',
  evaluasi: '',
}

export default function CpptPage() {
  const params = useParams<{ visitId: string }>()
  const visitId = params.visitId
  const { user } = useAuthStore()

  const [page, setPage] = useState(1)
  const [filterProfesi, setFilterProfesi] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CpptEntry | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  const { data: visitRes, isLoading: visitLoading } = useVisit(visitId)
  const visit = visitRes?.data

  const { data: cpptRes, isLoading: cpptLoading, isFetching } = useCpptByVisit(
    visitId,
    { page, limit: 50, profesi: filterProfesi || undefined },
  )
  const entries = cpptRes?.data ?? []
  const meta = cpptRes?.meta

  const createMut = useCreateCppt()
  const updateMut = useUpdateCppt()
  const verifyMut = useVerifyCppt()
  const deleteMut = useDeleteCppt()

  const openCreate = () => {
    setEditingEntry(null)
    setForm(INITIAL_FORM)
    setShowDialog(true)
  }

  const openEdit = (entry: CpptEntry) => {
    setEditingEntry(entry)
    setForm({
      subjective: entry.subjective || '',
      objective: entry.objective || '',
      assessment: entry.assessment || '',
      planning: entry.planning || '',
      instruksi: entry.instruksi || '',
      evaluasi: entry.evaluasi || '',
    })
    setShowDialog(true)
  }

  const handleSubmit = useCallback(async () => {
    const hasContent = form.subjective.trim() || form.objective.trim()
      || form.assessment.trim() || form.planning.trim()
      || form.instruksi.trim() || form.evaluasi.trim()

    if (!hasContent) {
      toast.error('Minimal satu field SOAP-IE harus diisi')
      return
    }

    try {
      if (editingEntry) {
        await updateMut.mutateAsync({
          id: editingEntry.id,
          data: {
            subjective: form.subjective.trim() || undefined,
            objective: form.objective.trim() || undefined,
            assessment: form.assessment.trim() || undefined,
            planning: form.planning.trim() || undefined,
            instruksi: form.instruksi.trim() || undefined,
            evaluasi: form.evaluasi.trim() || undefined,
          },
        })
        toast.success('Entry CPPT berhasil diperbarui')
      } else {
        await createMut.mutateAsync({
          visit_id: visitId,
          subjective: form.subjective.trim() || undefined,
          objective: form.objective.trim() || undefined,
          assessment: form.assessment.trim() || undefined,
          planning: form.planning.trim() || undefined,
          instruksi: form.instruksi.trim() || undefined,
          evaluasi: form.evaluasi.trim() || undefined,
        })
        toast.success('Entry CPPT berhasil ditambahkan')
      }
      setShowDialog(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal menyimpan CPPT',
      )
    }
  }, [form, editingEntry, visitId, createMut, updateMut])

  const handleVerify = useCallback(async (id: string) => {
    try {
      await verifyMut.mutateAsync(id)
      toast.success('Entry CPPT berhasil diverifikasi')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal memverifikasi',
      )
    }
  }, [verifyMut])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Hapus entry CPPT ini?')) return
    try {
      await deleteMut.mutateAsync(id)
      toast.success('Entry CPPT berhasil dihapus')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal menghapus',
      )
    }
  }, [deleteMut])

  const isSaving = createMut.isPending || updateMut.isPending
  const isLoading = visitLoading || cpptLoading

  const patientNama = visit?.patient_nama || 'Pasien'
  const noRM = visit?.no_rekam_medis || '-'
  const visitNumber = visit?.visit_number || '-'

  const canWrite = user?.role && ['admin', 'dokter', 'perawat', 'apoteker'].includes(user.role)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
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
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            CPPT — Catatan Perkembangan Pasien Terpadu
          </h1>
          <p className="text-sm text-muted-foreground">
            {patientNama} · {noRM} · {visitNumber}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Catatan
          </Button>
        )}
      </div>

      {/* Info & Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={filterProfesi === opt.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => { setFilterProfesi(opt.value); setPage(1) }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        {meta && (
          <span className="text-sm text-muted-foreground">
            {meta.total} catatan
            {isFetching && !cpptLoading && (
              <Loader2 className="inline h-3 w-3 animate-spin ml-1" />
            )}
          </span>
        )}
      </div>

      {/* Timeline */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada catatan perkembangan</p>
            {canWrite && (
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Tambah Catatan Pertama
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {entries.map((entry) => (
              <CpptTimelineItem
                key={entry.id}
                entry={entry}
                currentUserId={user?.id}
                onEdit={openEdit}
                onVerify={handleVerify}
                onDelete={handleDelete}
                isVerifying={verifyMut.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {meta.page} dari {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Catatan CPPT' : 'Tambah Catatan CPPT'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SoapField
              label="S — Subjective"
              hint="Keluhan pasien, apa yang dirasakan"
              value={form.subjective}
              onChange={(v) => setForm({ ...form, subjective: v })}
            />
            <SoapField
              label="O — Objective"
              hint="Hasil pemeriksaan fisik, tanda vital, hasil lab"
              value={form.objective}
              onChange={(v) => setForm({ ...form, objective: v })}
            />
            <SoapField
              label="A — Assessment"
              hint="Penilaian/analisis kondisi pasien"
              value={form.assessment}
              onChange={(v) => setForm({ ...form, assessment: v })}
            />
            <SoapField
              label="P — Planning"
              hint="Rencana tindakan, terapi, pemeriksaan lanjutan"
              value={form.planning}
              onChange={(v) => setForm({ ...form, planning: v })}
            />
            <SoapField
              label="I — Instruksi"
              hint="Instruksi untuk profesi lain / pasien"
              value={form.instruksi}
              onChange={(v) => setForm({ ...form, instruksi: v })}
            />
            <SoapField
              label="E — Evaluasi"
              hint="Evaluasi respons pasien terhadap tindakan"
              value={form.evaluasi}
              onChange={(v) => setForm({ ...form, evaluasi: v })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingEntry ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Sub Components ---

function SoapField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <Label className="text-sm font-semibold">{label}</Label>
      <p className="text-xs text-muted-foreground mb-1">{hint}</p>
      <textarea
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-2',
          'text-sm min-h-[72px] resize-y',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  )
}

function CpptTimelineItem({
  entry,
  currentUserId,
  onEdit,
  onVerify,
  onDelete,
  isVerifying,
}: {
  entry: CpptEntry
  currentUserId?: string
  onEdit: (entry: CpptEntry) => void
  onVerify: (id: string) => void
  onDelete: (id: string) => void
  isVerifying: boolean
}) {
  const profesiColor = PROFESI_COLORS[entry.profesi] || 'bg-gray-100 text-gray-800'
  const dotColor = PROFESI_TIMELINE_COLORS[entry.profesi] || 'border-gray-400 bg-gray-400'
  const isOwner = currentUserId === entry.user_id
  const canEdit = isOwner && !entry.is_verified
  const canVerify = !entry.is_verified

  const dateStr = new Date(entry.tanggal_waktu).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = new Date(entry.tanggal_waktu).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const sections = [
    { key: 'S', label: 'Subjective', content: entry.subjective },
    { key: 'O', label: 'Objective', content: entry.objective },
    { key: 'A', label: 'Assessment', content: entry.assessment },
    { key: 'P', label: 'Planning', content: entry.planning },
    { key: 'I', label: 'Instruksi', content: entry.instruksi },
    { key: 'E', label: 'Evaluasi', content: entry.evaluasi },
  ].filter((s) => s.content)

  return (
    <div className="relative pl-14">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-[18px] top-4 h-3.5 w-3.5 rounded-full border-2',
          dotColor,
        )}
      />

      <Card className={cn(
        'transition-colors',
        entry.is_verified && 'border-green-200 dark:border-green-800',
      )}>
        {/* Entry header */}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-xs font-medium', profesiColor)}>
                {entry.profesi}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">{entry.user_nama}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{dateStr} · {timeStr}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {entry.is_verified && (
                <Badge variant="success" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  Terverifikasi
                </Badge>
              )}
              {canVerify && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Verifikasi"
                  onClick={() => onVerify(entry.id)}
                  disabled={isVerifying}
                  className="h-7 w-7"
                >
                  <Shield className="h-3.5 w-3.5 text-green-600" />
                </Button>
              )}
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    onClick={() => onEdit(entry)}
                    className="h-7 w-7"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Hapus"
                    onClick={() => onDelete(entry.id)}
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {/* SOAP-IE sections */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {sections.map((s) => (
              <div key={s.key} className="text-sm">
                <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  {s.key} — {s.label}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap">{s.content}</p>
              </div>
            ))}
          </div>

          {/* Verification info */}
          {entry.is_verified && entry.verified_by_nama && (
            <div className="mt-3 pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Diverifikasi oleh {entry.verified_by_nama}
              {entry.verified_at && (
                <> · {new Date(entry.verified_at).toLocaleString('id-ID', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}</>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
