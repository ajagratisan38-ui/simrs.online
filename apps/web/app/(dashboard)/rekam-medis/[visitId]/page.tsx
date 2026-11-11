'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Calendar,
  AlertTriangle,
  FileText,
  Stethoscope,
  Lock,
  Printer,
  LogOut,
  Loader2,
  CheckCircle,
  ScrollText,
  ClipboardList,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SOAPForm } from '@/components/forms/soap-form'
import {
  useMedicalRecordByVisit,
  useCreateMedicalRecord,
  useUpdateMedicalRecord,
  useFinalizeMedicalRecord,
  usePatientHistory,
} from '@/hooks/use-medical-record'
import { useVisit } from '@/hooks/use-registration'
import { useDischargePatient } from '@/hooks/use-inpatient'
import { useSatusehatStatus } from '@/hooks/use-satusehat'
import { SatusehatStatusBadge } from '@/components/bpjs/satusehat-status-badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MedicalRecordInput } from '@/lib/api/medical-records'
import { SaveIndicator } from '@/components/ui/save-indicator'
import { useAutoSave } from '@/hooks/use-auto-save'

export default function ExaminationPage() {
  const params = useParams<{ visitId: string }>()
  const router = useRouter()
  const visitId = params.visitId

  const { data: visitRes, isLoading: visitLoading } = useVisit(visitId)
  const visit = visitRes?.data

  const {
    data: mrRes,
    isLoading: mrLoading,
  } = useMedicalRecordByVisit(visitId)
  const medicalRecord = mrRes?.data

  const createMR = useCreateMedicalRecord()
  const updateMR = useUpdateMedicalRecord()
  const finalizeMR = useFinalizeMedicalRecord()
  const dischargeMut = useDischargePatient()

  // Patient history (sidebar)
  const patientId = visit?.patient_id || medicalRecord?.patient_id || ''
  const { data: historyRes } = usePatientHistory(patientId)
  const history = historyRes?.data ?? []

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const { saveState, markSaving, markSaved, markOffline, markError } = useAutoSave()

  // SATUSEHAT sync status
  const { data: satusehatRes } = useSatusehatStatus(visitId)
  const satusehatStatus = satusehatRes?.data

  const isFinalized = medicalRecord?.status === 'final'
  const hasExistingRecord = !!medicalRecord
  const isRawatInap = visit?.tipe === 'rawat_inap'
  const canDischarge = isFinalized && isRawatInap
    && visit?.status !== 'pulang' && visit?.status !== 'selesai'

  const handleDischarge = useCallback(async () => {
    if (!confirm(
      'Pulangkan pasien (sembuh) dari rawat inap?\n\n'
      + '• Status kunjungan → Pulang\n'
      + '• Bed akan dikosongkan otomatis\n'
      + '• Tagihan otomatis dibuat untuk kasir\n\n'
      + 'Untuk cara keluar lain (pulang paksa, rujuk, meninggal), '
      + 'gunakan halaman Rawat Inap.',
    )) return
    try {
      const result = await dischargeMut.mutateAsync({
        visitId,
        cara_keluar: 'sembuh',
      })
      const parts = [`${result.patientName} berhasil dipulangkan`]
      if (result.bedReleased) parts.push('bed dikosongkan')
      if (result.billGenerated) parts.push('tagihan dibuat untuk kasir')
      toast.success(parts.join(' · '))
      router.push('/rawat-inap')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memulangkan pasien')
    }
  }, [dischargeMut, visitId, router])

  // Build initial data from existing record
  const initialData: MedicalRecordInput | undefined = medicalRecord
    ? {
        subjective: medicalRecord.subjective || undefined,
        objective: medicalRecord.objective || undefined,
        assessment: medicalRecord.assessment || undefined,
        plan: medicalRecord.plan || undefined,
        vital_signs: medicalRecord.vital_signs || undefined,
        alergi: medicalRecord.alergi || undefined,
        riwayat_penyakit: medicalRecord.riwayat_penyakit || undefined,
        catatan_tambahan: medicalRecord.catatan_tambahan || undefined,
        diagnoses: medicalRecord.diagnoses?.map((dx) => ({
          icd10_code: dx.icd10_code,
          icd10_name: dx.icd10_name,
          tipe: dx.tipe,
          catatan: dx.catatan || undefined,
        })),
        procedures: medicalRecord.procedures?.map((p) => ({
          kode_tindakan: p.kode_tindakan || undefined,
          nama_tindakan: p.nama_tindakan,
          catatan: p.catatan || undefined,
          tarif: p.tarif,
          qty: p.qty,
          total: p.total,
        })),
        prescription:
          (medicalRecord.prescriptions?.[0]?.items?.length ?? 0) > 0
            ? {
                catatan_dokter:
                  medicalRecord.prescriptions?.[0]?.catatan_dokter || undefined,
                items: (medicalRecord.prescriptions?.[0]?.items ?? []).map((item) => ({
                  drug_id: item.drug_id,
                  nama_obat: item.nama_obat,
                  dosis: item.dosis || undefined,
                  satuan: item.satuan || undefined,
                  frekuensi: item.frekuensi || undefined,
                  durasi_hari: item.durasi_hari || undefined,
                  jumlah: item.jumlah,
                  aturan_pakai: item.aturan_pakai || undefined,
                  catatan: item.catatan || undefined,
                })),
              }
            : undefined,
      }
    : undefined

  // --- Save handler (draft) ---
  const handleSave = useCallback(
    async (data: MedicalRecordInput) => {
      if (isFinalized) return
      setIsSaving(true)
      markSaving()
      try {
        if (hasExistingRecord && medicalRecord) {
          await updateMR.mutateAsync({ id: medicalRecord.id, data })
        } else {
          await createMR.mutateAsync({ visitId, data })
        }
        setLastSavedAt(new Date())
        if (navigator.onLine) {
          markSaved()
        } else {
          markOffline()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal menyimpan'
        markError(message)
      } finally {
        setIsSaving(false)
      }
    },
    [
      isFinalized, hasExistingRecord, medicalRecord,
      visitId, createMR, updateMR,
      markSaving, markSaved, markOffline, markError,
    ],
  )

  // --- Finalize handler ---
  const handleFinalize = useCallback(
    async (data: MedicalRecordInput) => {
      try {
        // Save first
        let mrId = medicalRecord?.id
        if (hasExistingRecord && mrId) {
          await updateMR.mutateAsync({ id: mrId, data })
        } else {
          const res = await createMR.mutateAsync({ visitId, data })
          mrId = res.data?.id
        }

        if (!mrId) {
          toast.error('Gagal mendapatkan ID rekam medis')
          return
        }

        // Then finalize
        await finalizeMR.mutateAsync(mrId)
        toast.success('Rekam medis berhasil difinalisasi')
        router.push('/rekam-medis')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Gagal finalisasi'
        toast.error(message)
      }
    },
    [
      hasExistingRecord, medicalRecord, visitId,
      createMR, updateMR, finalizeMR, router,
    ],
  )

  // --- Compute patient age ---
  const patientAge = computeAge(
    medicalRecord?.tanggal_lahir || visit?.tanggal_lahir,
  )

  const isLoading = visitLoading || mrLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-3">
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
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

  const patientNama = medicalRecord?.patient_nama || visit.patient_nama || 'Pasien'
  const noRM = medicalRecord?.no_rekam_medis || visit.no_rekam_medis || '-'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rekam-medis">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">
            {patientNama}
          </h1>
          <p className="text-sm text-muted-foreground">
            {noRM} · {visit.visit_number}
          </p>
        </div>
        <SaveIndicator state={saveState} />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/rekam-medis/${visitId}/cppt`}>
            <ScrollText className="h-4 w-4 mr-1" />
            CPPT
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/rekam-medis/${visitId}/pengkajian`}>
            <ClipboardList className="h-4 w-4 mr-1" />
            Pengkajian
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/rekam-medis/${visitId}/edukasi`}>
            <GraduationCap className="h-4 w-4 mr-1" />
            Edukasi
          </Link>
        </Button>
        {satusehatStatus && satusehatStatus.syncStatus !== 'not_required' && (
          <SatusehatStatusBadge
            status={satusehatStatus.syncStatus}
            encounterId={satusehatStatus.satusehatEncounterId}
          />
        )}
        {isFinalized && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rekam-medis/${visitId}/resume`}>
              <Printer className="h-4 w-4 mr-1" />
              Resume Medis
            </Link>
          </Button>
        )}
        {canDischarge && (
          <Button
            variant="default" size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDischarge}
            disabled={dischargeMut.isPending}
          >
            {dischargeMut.isPending
              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              : <LogOut className="h-4 w-4 mr-1" />}
            Pulangkan Pasien
          </Button>
        )}
        {isFinalized && (
          <Badge variant="success" className="gap-1">
            <Lock className="h-3 w-3" />
            Final
          </Badge>
        )}
        {visit?.status === 'pulang' && (
          <Badge variant="outline" className="gap-1 border-green-300 text-green-700 bg-green-50">
            <CheckCircle className="h-3 w-3" />
            Sudah Pulang
          </Badge>
        )}
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Sidebar: patient info */}
        <div className="lg:col-span-3 space-y-4">
          {/* Patient card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Info Pasien
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label="Nama" value={patientNama} />
              <InfoRow label="No. RM" value={noRM} />
              <InfoRow
                label="Umur"
                value={patientAge || '-'}
              />
              <InfoRow
                label="Jenis Kelamin"
                value={
                  (medicalRecord?.jenis_kelamin || visit.jenis_kelamin) === 'L'
                    ? 'Laki-laki'
                    : 'Perempuan'
                }
              />
              <InfoRow
                label="Poli"
                value={medicalRecord?.room_nama || visit.room_nama || '-'}
              />
              <InfoRow
                label="Penjamin"
                value={
                  (
                    medicalRecord?.penjamin || visit.penjamin || 'umum'
                  ).toUpperCase()
                }
              />
              {visit.keluhan_utama && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Keluhan Utama
                  </p>
                  <p className="text-sm">{visit.keluhan_utama}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Laka Lantas alert */}
          {visit.is_laka_lantas && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">
                    Kecelakaan Lalu Lintas
                  </span>
                </div>
                {visit.laka_lantas_data && (
                  <div className="space-y-1 text-xs">
                    {visit.laka_lantas_data.tgl_kejadian && (
                      <p><span className="text-muted-foreground">Tgl Kejadian:</span> {visit.laka_lantas_data.tgl_kejadian}</p>
                    )}
                    {visit.laka_lantas_data.keterangan && (
                      <p><span className="text-muted-foreground">Kronologi:</span> {visit.laka_lantas_data.keterangan}</p>
                    )}
                    {visit.laka_lantas_data.penjamin_laka && (
                      <p>
                        <span className="text-muted-foreground">Penjamin:</span>{' '}
                        {visit.laka_lantas_data.penjamin_laka === '1' ? 'Jasa Raharja'
                          : visit.laka_lantas_data.penjamin_laka === '2' ? 'BPJS Ketenagakerjaan'
                          : visit.laka_lantas_data.penjamin_laka === '3' ? 'TASPEN'
                          : visit.laka_lantas_data.penjamin_laka === '4' ? 'ASABRI'
                          : 'Tidak Ada'}
                      </p>
                    )}
                    {visit.laka_lantas_data.no_lp_polisi && (
                      <p><span className="text-muted-foreground">No. LP:</span> {visit.laka_lantas_data.no_lp_polisi}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Allergy alert */}
          {medicalRecord?.alergi && medicalRecord.alergi.length > 0 && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-red-600">
                    ALERGI
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {medicalRecord.alergi.map((a, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Brief history */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Riwayat Kunjungan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Belum ada riwayat
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.slice(0, 10).map((rec) => (
                    <div
                      key={rec.id}
                      className="border rounded p-2 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {formatDate(rec.visit_tanggal)}
                        </span>
                        <Badge
                          variant={
                            rec.status === 'final' ? 'success' : 'secondary'
                          }
                          className="text-[9px]"
                        >
                          {rec.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {rec.room_nama} — {rec.doctor_nama}
                      </p>
                      {rec.diagnoses && rec.diagnoses.length > 0 && (
                        <p className="text-muted-foreground truncate">
                          Dx:{' '}
                          {rec.diagnoses
                            .map(
                              (dx) => `${dx.icd10_code} ${dx.icd10_name}`,
                            )
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main content: SOAP form */}
        <div className="lg:col-span-7">
          {isFinalized && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-md text-sm text-teal-800">
              <Lock className="h-4 w-4 shrink-0" />
              Rekam medis ini sudah difinalisasi dan tidak bisa diedit.
            </div>
          )}

          <SOAPForm
            key={medicalRecord?.id || 'new'}
            initialData={initialData}
            onSave={handleSave}
            onFinalize={handleFinalize}
            isSaving={isSaving}
            isFinalizing={finalizeMR.isPending}
            lastSavedAt={lastSavedAt}
            disabled={isFinalized}
          />
        </div>
      </div>
    </div>
  )
}

// --- Helpers ---

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function computeAge(dateStr?: string | null): string | null {
  if (!dateStr) return null
  const birth = new Date(dateStr)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    years--
  }
  if (years < 1) {
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      now.getMonth() -
      birth.getMonth()
    return `${months} bulan`
  }
  return `${years} tahun`
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
