'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  FileCheck,
  Stethoscope,
  Pill,
  ChevronDown,
  ChevronRight,
  Wallet,
  Printer,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PermissionGate } from '@/components/ui/permission-gate'
import { usePatient, useDeletePatient } from '@/hooks/use-patients'
import { usePatientHistory } from '@/hooks/use-medical-record'
import { usePatientBills } from '@/hooks/use-billing'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || '—'}</dd>
    </div>
  )
}

// ============================================
// Rekam Medis Tab Component
// ============================================
function RekamMedisTab({ patientId }: { patientId: string }) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data, isLoading } = usePatientHistory(patientId, page)

  const records = data?.data ?? []
  const meta = data?.meta

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Belum ada riwayat rekam medis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {records.map((rec) => {
        const isExpanded = expandedId === rec.id
        const vs = rec.vital_signs || {}
        const hasVitals = vs && Object.keys(vs).some(
          (k) => vs[k as keyof typeof vs] != null,
        )

        return (
          <Card key={rec.id} className="overflow-hidden">
            {/* Header row — always visible */}
            <button
              type="button"
              className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : rec.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">
                      {formatDate(rec.visit_tanggal)}
                    </span>
                    <Badge
                      variant={rec.status === 'final' ? 'success' : 'secondary'}
                      className="text-[10px]"
                    >
                      {rec.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {rec.visit_tipe === 'rawat_jalan'
                        ? 'Rawat Jalan'
                        : rec.visit_tipe === 'igd'
                          ? 'IGD'
                          : 'Rawat Inap'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Stethoscope className="h-3 w-3 inline mr-1" />
                    {rec.doctor_nama}
                    {rec.doctor_spesialisasi && ` (${rec.doctor_spesialisasi})`}
                    {' — '}
                    {rec.room_nama}
                  </p>
                  {/* Diagnoses preview */}
                  {rec.diagnoses && rec.diagnoses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rec.diagnoses.map((dx, j) => (
                        <span
                          key={j}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded border',
                            dx.tipe === 'utama'
                              ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-300'
                              : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-700',
                          )}
                        >
                          {dx.icd10_code} {dx.icd10_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {rec.status === 'final' && (
                    <Link
                      href={`/rekam-medis/${rec.visit_id}/resume`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t px-4 pb-4 space-y-4">
                {/* Vital Signs */}
                {hasVitals && (
                  <div className="pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Tanda Vital
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                      {vs.tekanan_darah_sistolik != null && (
                        <VitalChip
                          label="TD"
                          value={`${vs.tekanan_darah_sistolik}/${vs.tekanan_darah_diastolik ?? '?'}`}
                          unit="mmHg"
                        />
                      )}
                      {vs.nadi != null && (
                        <VitalChip label="Nadi" value={String(vs.nadi)} unit="x/mnt" />
                      )}
                      {vs.suhu != null && (
                        <VitalChip label="Suhu" value={String(vs.suhu)} unit="°C" />
                      )}
                      {vs.respirasi != null && (
                        <VitalChip label="RR" value={String(vs.respirasi)} unit="x/mnt" />
                      )}
                      {vs.spo2 != null && (
                        <VitalChip label="SpO2" value={String(vs.spo2)} unit="%" />
                      )}
                    </div>
                  </div>
                )}

                {/* SOAP */}
                {(rec.subjective || rec.objective || rec.assessment || rec.plan) && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      SOAP
                    </p>
                    <div className="space-y-2 text-sm">
                      {rec.subjective && (
                        <div>
                          <span className="font-medium text-xs text-primary">S: </span>
                          <span className="text-muted-foreground">{rec.subjective}</span>
                        </div>
                      )}
                      {rec.objective && (
                        <div>
                          <span className="font-medium text-xs text-primary">O: </span>
                          <span className="text-muted-foreground">{rec.objective}</span>
                        </div>
                      )}
                      {rec.assessment && (
                        <div>
                          <span className="font-medium text-xs text-primary">A: </span>
                          <span className="text-muted-foreground">{rec.assessment}</span>
                        </div>
                      )}
                      {rec.plan && (
                        <div>
                          <span className="font-medium text-xs text-primary">P: </span>
                          <span className="text-muted-foreground">{rec.plan}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Alergi */}
                {rec.alergi && rec.alergi.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Alergi
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {rec.alergi.map((a, i) => (
                        <Badge key={i} variant="destructive" className="text-[10px]">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link to full record */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/rekam-medis/${rec.visit_id}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Lihat Detail
                    </Button>
                  </Link>
                  {rec.status === 'final' && (
                    <Link href={`/rekam-medis/${rec.visit_id}/resume`}>
                      <Button variant="outline" size="sm">
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        Resume Medis
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </Card>
        )
      })}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Hal {meta.page} dari {meta.totalPages} ({meta.total} rekam medis)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function VitalChip({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="bg-muted/50 rounded px-2 py-1">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground"> {unit}</span>
    </div>
  )
}

// ============================================
// Billing Tab Component
// ============================================
function BillingTab({ patientId }: { patientId: string }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePatientBills(patientId, page)

  const bills = data?.data ?? []
  const meta = data?.meta

  const totalPaid = bills
    .filter((b) => b.status === 'dibayar')
    .reduce((sum, b) => sum + b.final_amount, 0)
  const totalOutstanding = bills
    .filter((b) => ['draft', 'final'].includes(b.status))
    .reduce((sum, b) => sum + b.sisa_bayar, 0)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Belum ada riwayat tagihan</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Tagihan</p>
            <p className="text-lg font-bold">{meta?.total ?? bills.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sudah Dibayar</p>
            <p className="text-lg font-bold text-green-600">
              {formatRupiah(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sisa Tunggakan</p>
            <p
              className={cn(
                'text-lg font-bold',
                totalOutstanding > 0 ? 'text-red-600' : 'text-green-600',
              )}
            >
              {formatRupiah(totalOutstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bills table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium">Tanggal</th>
                  <th className="text-left px-4 py-2.5 font-medium">No. Kunjungan</th>
                  <th className="text-left px-4 py-2.5 font-medium">Poli</th>
                  <th className="text-left px-4 py-2.5 font-medium">Dokter</th>
                  <th className="text-left px-4 py-2.5 font-medium">Penjamin</th>
                  <th className="text-left px-4 py-2.5 font-medium">Rincian</th>
                  <th className="text-right px-4 py-2.5 font-medium">Total</th>
                  <th className="text-right px-4 py-2.5 font-medium">Dibayar</th>
                  <th className="text-center px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDate(bill.tanggal)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {bill.visit_number}
                    </td>
                    <td className="px-4 py-2.5">{bill.room_nama}</td>
                    <td className="px-4 py-2.5 text-xs">{bill.doctor_nama}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {bill.penjamin}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {bill.items_summary?.map((it, j) => (
                          <span
                            key={j}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted"
                          >
                            {it.kategori} ({it.count})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium">
                      {formatRupiah(bill.final_amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {formatRupiah(bill.total_paid)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <BillStatusBadge status={bill.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/kasir/${bill.visit_id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Hal {meta.page} dari {meta.totalPages} ({meta.total} tagihan)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function BillStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
    dibayar: { variant: 'success', label: 'Lunas' },
    final: { variant: 'warning', label: 'Belum Bayar' },
    draft: { variant: 'secondary', label: 'Draft' },
    batal: { variant: 'destructive', label: 'Batal' },
  }
  const c = config[status] || { variant: 'secondary' as const, label: status }
  return <Badge variant={c.variant} className="text-[10px]">{c.label}</Badge>
}

// ============================================
// Main Page
// ============================================
export default function DetailPasienPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('profil')
  const { data, isLoading, isError } = usePatient(id)
  const deleteMutation = useDeletePatient()

  const patient = data?.data

  function handleDelete() {
    if (!patient) return
    if (!confirm(`Hapus pasien "${patient.nama}"?`)) return
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Pasien berhasil dihapus')
        router.push('/pasien')
      },
      onError: (err) => toast.error(err.message),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pasien tidak ditemukan</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/pasien">← Kembali ke daftar pasien</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pasien"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{patient.nama}</h1>
            <p className="text-sm text-muted-foreground font-mono">
              {patient.no_rekam_medis}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/pasien/${id}/general-consent`}>
              <FileCheck className="h-4 w-4 mr-2" />
              General Consent
            </Link>
          </Button>
          <PermissionGate permission="patient:update">
            <Button variant="outline" asChild>
              <Link href={`/pasien/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </PermissionGate>
          <PermissionGate permission="patient:delete">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="kunjungan">Riwayat Kunjungan</TabsTrigger>
          <TabsTrigger value="rekam-medis">Rekam Medis</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Tab: Profil */}
        <TabsContent value="profil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Identitas</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoItem label="No. Rekam Medis" value={patient.no_rekam_medis} />
                <InfoItem label="NIK" value={patient.nik} />
                <InfoItem label="Nama" value={patient.nama} />
                <InfoItem label="Tempat Lahir" value={patient.tempat_lahir} />
                <InfoItem
                  label="Tanggal Lahir"
                  value={new Date(patient.tanggal_lahir).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
                <div>
                  <dt className="text-xs text-muted-foreground">Jenis Kelamin</dt>
                  <dd className="mt-0.5">
                    <Badge variant={patient.jenis_kelamin === 'L' ? 'default' : 'secondary'}>
                      {patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </Badge>
                  </dd>
                </div>
                <InfoItem label="Golongan Darah" value={patient.golongan_darah} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alamat & Kontak</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <InfoItem label="Alamat" value={patient.alamat} />
                </div>
                <InfoItem label="RT/RW" value={
                  patient.rt || patient.rw
                    ? `${patient.rt || '-'}/${patient.rw || '-'}`
                    : null
                } />
                <InfoItem label="Kelurahan" value={patient.kelurahan} />
                <InfoItem label="Kecamatan" value={patient.kecamatan} />
                <InfoItem label="Kabupaten/Kota" value={patient.kabupaten} />
                <InfoItem label="Provinsi" value={patient.provinsi} />
                <InfoItem label="Kode Pos" value={patient.kode_pos} />
                <InfoItem label="No. Telepon" value={patient.no_telepon} />
                <InfoItem label="Email" value={patient.email} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Tambahan</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoItem label="Pekerjaan" value={patient.pekerjaan} />
                <InfoItem label="Pendidikan" value={patient.pendidikan} />
                <InfoItem label="Status Pernikahan" value={patient.status_pernikahan} />
                <InfoItem label="Nama Keluarga" value={patient.nama_keluarga} />
                <InfoItem label="Hub. Keluarga" value={patient.hubungan_keluarga} />
                <InfoItem label="Telp. Keluarga" value={patient.no_telepon_keluarga} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data BPJS</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem label="No. BPJS" value={patient.no_bpjs} />
                <InfoItem
                  label="Kelas BPJS"
                  value={patient.kelas_bpjs ? `Kelas ${patient.kelas_bpjs}` : null}
                />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Riwayat Kunjungan */}
        <TabsContent value="kunjungan">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat Kunjungan</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.visits && (patient.visits as unknown[]).length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium">Tanggal</th>
                        <th className="text-left px-4 py-2 font-medium">Tipe</th>
                        <th className="text-left px-4 py-2 font-medium">Status</th>
                        <th className="text-left px-4 py-2 font-medium">Keluhan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(patient.visits as Array<Record<string, unknown>>).map((v, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-2">{String(v.tanggal ?? '')}</td>
                          <td className="px-4 py-2">{String(v.tipe ?? '')}</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline">{String(v.status ?? '')}</Badge>
                          </td>
                          <td className="px-4 py-2">{String(v.keluhan_utama ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada riwayat kunjungan
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Rekam Medis */}
        <TabsContent value="rekam-medis">
          <RekamMedisTab patientId={id} />
        </TabsContent>

        {/* Tab: Billing */}
        <TabsContent value="billing">
          <BillingTab patientId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// Helpers
// ============================================
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRupiah(n: number | string): string {
  const num = Math.round(Number(n) || 0)
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${formatted}`
}
