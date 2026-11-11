'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Printer,
  FileCheck,
  Plus,
  Check,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { usePatient } from '@/hooks/use-patients'
import {
  usePatientConsents,
  useGeneralConsent,
  useCreateGeneralConsent,
} from '@/hooks/use-general-consent'
import { GeneralConsentPrint } from '@/components/print/general-consent'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { GeneralConsentData } from '@/lib/api/general-consent'

const CONSENT_ITEMS = [
  {
    key: 'persetujuan_rawat' as const,
    label: 'Persetujuan Pelayanan Kesehatan',
    desc: 'Menyetujui untuk menerima pelayanan kesehatan termasuk pemeriksaan fisik, tes diagnostik, dan tindakan medis.',
  },
  {
    key: 'persetujuan_informasi' as const,
    label: 'Persetujuan Informasi Medis',
    desc: 'Bersedia diberikan informasi mengenai diagnosis, rencana tindakan, risiko, dan prognosis.',
  },
  {
    key: 'persetujuan_privasi' as const,
    label: 'Persetujuan Privasi Data',
    desc: 'Memahami bahwa RS menjaga kerahasiaan data medis sesuai UU PDP dan permenkes.',
  },
  {
    key: 'persetujuan_biaya' as const,
    label: 'Persetujuan Biaya',
    desc: 'Memahami dan menyetujui ketentuan biaya pelayanan dan bersedia menanggung biaya.',
  },
  {
    key: 'persetujuan_tata_tertib' as const,
    label: 'Persetujuan Tata Tertib',
    desc: 'Bersedia mematuhi tata tertib dan peraturan rumah sakit.',
  },
  {
    key: 'persetujuan_pelepasan_info' as const,
    label: 'Persetujuan Pelepasan Informasi',
    desc: 'Menyetujui pelepasan informasi medis kepada penjamin/asuransi/pemerintah.',
  },
]

type ConsentKey = (typeof CONSENT_ITEMS)[number]['key']

export default function GeneralConsentPage() {
  const { id: patientId } = useParams<{ id: string }>()
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)

  const { data: patientData, isLoading: patientLoading } = usePatient(patientId)
  const { data: consentsData, isLoading: consentsLoading } = usePatientConsents(patientId)
  const createConsent = useCreateGeneralConsent()

  const patient = patientData?.data
  const consents = consentsData?.data ?? []

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [checks, setChecks] = useState<Record<ConsentKey, boolean>>({
    persetujuan_rawat: true,
    persetujuan_informasi: true,
    persetujuan_privasi: true,
    persetujuan_biaya: true,
    persetujuan_tata_tertib: true,
    persetujuan_pelepasan_info: true,
  })
  const [pjNama, setPjNama] = useState('')
  const [pjHubungan, setPjHubungan] = useState('')
  const [pjTelepon, setPjTelepon] = useState('')
  const [pjAlamat, setPjAlamat] = useState('')
  const [signedBy, setSignedBy] = useState('')
  const [catatan, setCatatan] = useState('')

  // Preview/print state
  const [previewConsent, setPreviewConsent] = useState<GeneralConsentData | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const { data: previewData } = useGeneralConsent(previewId || undefined)

  function toggleCheck(key: ConsentKey) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function selectAll(val: boolean) {
    const next = { ...checks }
    for (const item of CONSENT_ITEMS) {
      next[item.key] = val
    }
    setChecks(next)
  }

  const allChecked = CONSENT_ITEMS.every((item) => checks[item.key])

  async function handleSubmit() {
    if (!patient) return

    try {
      const res = await createConsent.mutateAsync({
        patient_id: patientId,
        ...checks,
        penanggung_jawab_nama: pjNama.trim() || null,
        penanggung_jawab_hubungan: pjHubungan.trim() || null,
        penanggung_jawab_telepon: pjTelepon.trim() || null,
        penanggung_jawab_alamat: pjAlamat.trim() || null,
        signed_by: signedBy.trim() || null,
        catatan: catatan.trim() || null,
      })

      toast.success('General Consent berhasil dibuat')
      setShowForm(false)

      // Auto-open preview for print
      setPreviewId(res.data.id)
      setPreviewConsent(res.data)

      // Reset form
      setPjNama('')
      setPjHubungan('')
      setPjTelepon('')
      setPjAlamat('')
      setSignedBy('')
      setCatatan('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat consent')
    }
  }

  function handlePrint() {
    window.print()
  }

  function openPreview(consent: GeneralConsentData) {
    setPreviewId(consent.id)
    setPreviewConsent(consent)
  }

  // Resolve full consent data (from list or fetched detail)
  const resolvedPreview = previewData?.data || previewConsent

  if (patientLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!patient) {
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/pasien/${patientId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">General Consent</h1>
            <p className="text-sm text-muted-foreground">
              {patient.nama} — {patient.no_rekam_medis}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Consent Baru
        </Button>
      </div>

      {/* Existing Consents List */}
      {consentsLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : consents.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              Belum ada General Consent untuk pasien ini
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Buat General Consent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consents.map((c) => {
            const checkedCount = [
              c.persetujuan_rawat,
              c.persetujuan_informasi,
              c.persetujuan_privasi,
              c.persetujuan_biaya,
              c.persetujuan_tata_tertib,
              c.persetujuan_pelepasan_info,
            ].filter(Boolean).length

            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => openPreview(c)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={checkedCount === 6 ? 'success' : 'warning'}
                          className="text-[10px]"
                        >
                          {checkedCount}/6 Persetujuan
                        </Badge>
                        {c.signed_by && (
                          <Badge variant="outline" className="text-[10px]">
                            Ditandatangani: {c.signed_by}
                          </Badge>
                        )}
                        {c.visit_number && (
                          <Badge variant="secondary" className="text-[10px]">
                            Kunjungan: {c.visit_number}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(c.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {c.penanggung_jawab_nama && (
                          <span>· PJ: {c.penanggung_jawab_nama}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          openPreview(c)
                        }}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Formulir General Consent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Patient Info Summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{patient.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. RM</span>
                <span className="font-mono">{patient.no_rekam_medis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">NIK</span>
                <span>{patient.nik}</span>
              </div>
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Persetujuan Pasien
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => selectAll(!allChecked)}
                >
                  {allChecked ? 'Hapus Semua' : 'Pilih Semua'}
                </Button>
              </div>

              {CONSENT_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer',
                    checks[item.key]
                      ? 'border-primary/30 bg-primary/5'
                      : 'hover:bg-muted/30',
                  )}
                  onClick={() => toggleCheck(item.key)}
                >
                  <Checkbox
                    checked={checks[item.key]}
                    onCheckedChange={() => toggleCheck(item.key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Penanggung Jawab */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold">
                Data Penanggung Jawab{' '}
                <span className="text-muted-foreground font-normal">
                  (opsional)
                </span>
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pj_nama" className="text-xs">
                    Nama Penanggung Jawab
                  </Label>
                  <Input
                    id="pj_nama"
                    value={pjNama}
                    onChange={(e) => setPjNama(e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pj_hubungan" className="text-xs">
                    Hubungan dengan Pasien
                  </Label>
                  <Input
                    id="pj_hubungan"
                    value={pjHubungan}
                    onChange={(e) => setPjHubungan(e.target.value)}
                    placeholder="Suami/Istri/Anak/Orang Tua/dll"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pj_telepon" className="text-xs">
                    No. Telepon PJ
                  </Label>
                  <Input
                    id="pj_telepon"
                    value={pjTelepon}
                    onChange={(e) => setPjTelepon(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signed_by" className="text-xs">
                    Ditandatangani oleh
                  </Label>
                  <Input
                    id="signed_by"
                    value={signedBy}
                    onChange={(e) => setSignedBy(e.target.value)}
                    placeholder="Nama penandatangan"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pj_alamat" className="text-xs">
                  Alamat PJ
                </Label>
                <Textarea
                  id="pj_alamat"
                  value={pjAlamat}
                  onChange={(e) => setPjAlamat(e.target.value)}
                  placeholder="Alamat lengkap penanggung jawab"
                  rows={2}
                />
              </div>
            </div>

            {/* Catatan */}
            <div className="space-y-1.5">
              <Label htmlFor="catatan" className="text-xs">
                Catatan tambahan
              </Label>
              <Textarea
                id="catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan khusus (opsional)"
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={createConsent.isPending}
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createConsent.isPending}
              >
                {createConsent.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Simpan & Cetak
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview/Print Dialog */}
      <Dialog
        open={!!resolvedPreview}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewConsent(null)
            setPreviewId(null)
          }
        }}
        size="lg"
      >
        <DialogClose
          onClose={() => {
            setPreviewConsent(null)
            setPreviewId(null)
          }}
        />
        <DialogHeader>
          <DialogTitle>Preview General Consent</DialogTitle>
        </DialogHeader>
        <DialogContent className="max-h-[65vh] overflow-y-auto">
          {resolvedPreview && (
            <div className="border rounded-lg overflow-hidden">
              <GeneralConsentPrint consent={resolvedPreview} />
            </div>
          )}
        </DialogContent>
        <DialogFooter className="print:hidden">
          <Button
            variant="outline"
            onClick={() => {
              setPreviewConsent(null)
              setPreviewId(null)
            }}
          >
            Tutup
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Hidden print-only container — rendered outside dialog so print CSS can see it */}
      {resolvedPreview && (
        <div className="hidden print:block" id="general-consent-print">
          <GeneralConsentPrint ref={printRef} consent={resolvedPreview} />
        </div>
      )}
    </div>
  )
}
