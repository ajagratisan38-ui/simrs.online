'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { getTodayLocal } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft, Heart, Clock, PlayCircle, CheckCircle2, CalendarDays,
  Plus, Trash2, DollarSign, User, FileText, XCircle,
} from 'lucide-react'
import {
  useRehabOrder, useUpdateRehabStatus, useAssignPractitioner,
  useAddRehabSession, useDeleteRehabSession, useOrderFees,
} from '@/hooks/use-rehabilitation'
import { usePractitionerDropdown } from '@/hooks/use-rehabilitation'
import { REHAB_THERAPY_LABELS } from '@simrs/shared-types'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  color: string
}> = {
  dikirim: { label: 'Dikirim', variant: 'outline', color: 'text-gray-600' },
  dijadwalkan: { label: 'Dijadwalkan', variant: 'secondary', color: 'text-blue-600' },
  berlangsung: { label: 'Berlangsung', variant: 'default', color: 'text-emerald-600' },
  selesai: { label: 'Selesai', variant: 'default', color: 'text-green-600' },
  batal: { label: 'Batal', variant: 'destructive', color: 'text-red-600' },
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function RehabDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const { data: order, isLoading } = useRehabOrder(orderId)
  const { data: fees } = useOrderFees(orderId)
  const { data: practitioners } = usePractitionerDropdown()

  const updateStatus = useUpdateRehabStatus()
  const assignPract = useAssignPractitioner()
  const addSession = useAddRehabSession()
  const deleteSession = useDeleteRehabSession()

  // Session form state
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessTanggal, setSessTanggal] = useState(getTodayLocal())
  const [sessWaktuMulai, setSessWaktuMulai] = useState('')
  const [sessWaktuSelesai, setSessWaktuSelesai] = useState('')
  const [sessTindakan, setSessTindakan] = useState('')
  const [sessHasil, setSessHasil] = useState('')
  const [sessCatatan, setSessCatatan] = useState('')
  const [sessNyeriBefore, setSessNyeriBefore] = useState<number | ''>('')
  const [sessNyeriAfter, setSessNyeriAfter] = useState<number | ''>('')
  const [sessRomBefore, setSessRomBefore] = useState('')
  const [sessRomAfter, setSessRomAfter] = useState('')
  const [sessPractId, setSessPractId] = useState('')

  // Assign form
  const [assignPractId, setAssignPractId] = useState('')

  // Cancel form
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Order tidak ditemukan
      </div>
    )
  }

  const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.dikirim
  const therapyLabel = REHAB_THERAPY_LABELS[order.therapy_type as keyof typeof REHAB_THERAPY_LABELS] || order.therapy_type
  const progress = Number(order.jumlah_sesi) > 0
    ? Math.round((Number(order.sesi_selesai) / Number(order.jumlah_sesi)) * 100)
    : 0
  const canAddSession = ['dijadwalkan', 'berlangsung'].includes(order.status)
    && Number(order.sesi_selesai) < Number(order.jumlah_sesi)
  const sessions = order.sessions || []

  const handleAddSession = async () => {
    await addSession.mutateAsync({
      orderId,
      tanggal: sessTanggal,
      waktu_mulai: sessWaktuMulai || undefined,
      waktu_selesai: sessWaktuSelesai || undefined,
      practitioner_id: sessPractId || undefined,
      tindakan: sessTindakan || undefined,
      hasil: sessHasil || undefined,
      catatan_progress: sessCatatan || undefined,
      skala_nyeri_sebelum: sessNyeriBefore !== '' ? Number(sessNyeriBefore) : undefined,
      skala_nyeri_sesudah: sessNyeriAfter !== '' ? Number(sessNyeriAfter) : undefined,
      rom_sebelum: sessRomBefore || undefined,
      rom_sesudah: sessRomAfter || undefined,
    })
    setShowSessionForm(false)
    setSessTindakan('')
    setSessHasil('')
    setSessCatatan('')
    setSessNyeriBefore('')
    setSessNyeriAfter('')
    setSessRomBefore('')
    setSessRomAfter('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/rehabilitasi">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-teal-600" />
            {therapyLabel}
          </h1>
          <p className="text-muted-foreground">
            {order.patient_nama} — {order.no_rekam_medis}
          </p>
        </div>
        <Badge variant={sc.variant} className="text-base px-3 py-1">{sc.label}</Badge>
      </div>

      {/* Info + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informasi Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Pasien</span>
                <p className="font-medium">{order.patient_nama}</p>
              </div>
              <div>
                <span className="text-muted-foreground">No. RM</span>
                <p className="font-mono">{order.no_rekam_medis}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Dokter Pengirim</span>
                <p className="font-medium">{order.doctor_nama}</p>
                {order.doctor_spesialisasi && (
                  <p className="text-xs text-muted-foreground">{order.doctor_spesialisasi}</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Terapis</span>
                {order.practitioner_nama ? (
                  <p className="font-medium">
                    {order.practitioner_nama}
                    {order.practitioner_profesi && (
                      <span className="text-xs text-muted-foreground ml-1">({order.practitioner_profesi})</span>
                    )}
                  </p>
                ) : (
                  <p className="text-amber-600 italic">Belum ditugaskan</p>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Diagnosa Klinis</span>
                <p>{order.diagnosa_klinis}</p>
              </div>
              {order.indikasi && (
                <div>
                  <span className="text-muted-foreground">Indikasi</span>
                  <p>{order.indikasi}</p>
                </div>
              )}
              {order.target_terapi && (
                <div>
                  <span className="text-muted-foreground">Target Terapi</span>
                  <p>{order.target_terapi}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Tarif per Sesi</span>
                <p className="font-mono font-medium">{formatRupiah(Number(order.tarif_per_sesi))}</p>
              </div>
              {order.catatan_dokter && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Catatan Dokter</span>
                  <p className="bg-muted/50 rounded p-2 mt-1">{order.catatan_dokter}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress + Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress & Aksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Ring */}
            <div className="text-center">
              <div className="relative w-28 h-28 mx-auto">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none" stroke="#0d9488" strokeWidth="10"
                    strokeDasharray={`${progress * 3.14} 314`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{progress}%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {order.sesi_selesai} / {order.jumlah_sesi} sesi
              </p>
            </div>

            {/* Assign Practitioner */}
            {!order.practitioner_id && order.status !== 'selesai' && order.status !== 'batal' && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium">Tugaskan Terapis</p>
                <Select
                  className="w-full"
                  value={assignPractId}
                  onChange={(e) => setAssignPractId(e.target.value)}
                >
                  <option value="">Pilih terapis...</option>
                  {practitioners?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} — {p.profesi}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!assignPractId || assignPract.isPending}
                  onClick={() => assignPract.mutate({ orderId, practitionerId: assignPractId })}
                >
                  <User className="h-4 w-4 mr-1" />
                  Tugaskan
                </Button>
              </div>
            )}

            {/* Status Transitions */}
            <div className="space-y-2 border-t pt-3">
              {order.status === 'dikirim' && (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: orderId, status: 'dijadwalkan' })}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Jadwalkan
                </Button>
              )}
              {order.status === 'dijadwalkan' && (
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: orderId, status: 'berlangsung' })}
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Mulai Terapi
                </Button>
              )}
              {order.status === 'berlangsung' && (
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: orderId, status: 'selesai' })}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Selesaikan
                </Button>
              )}
              {['dikirim', 'dijadwalkan', 'berlangsung'].includes(order.status) && (
                <>
                  {!showCancelForm ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-red-600"
                      onClick={() => setShowCancelForm(true)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Batalkan
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Alasan pembatalan..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          disabled={!cancelReason || updateStatus.isPending}
                          onClick={() => {
                            updateStatus.mutate({ id: orderId, status: 'batal', cancelled_reason: cancelReason })
                            setShowCancelForm(false)
                          }}
                        >
                          Konfirmasi Batal
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowCancelForm(false)}
                        >
                          Kembali
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Riwayat Sesi Terapi
          </CardTitle>
          {canAddSession && (
            <Button size="sm" onClick={() => setShowSessionForm(!showSessionForm)}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Sesi
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Add Session Form */}
          {showSessionForm && (
            <div className="border rounded-lg p-4 mb-4 bg-muted/30 space-y-3">
              <p className="font-medium text-sm">Sesi #{Number(order.sesi_selesai) + 1}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Tanggal *</label>
                  <Input type="date" value={sessTanggal} onChange={(e) => setSessTanggal(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Waktu Mulai</label>
                  <Input type="time" value={sessWaktuMulai} onChange={(e) => setSessWaktuMulai(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Waktu Selesai</label>
                  <Input type="time" value={sessWaktuSelesai} onChange={(e) => setSessWaktuSelesai(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Terapis</label>
                  <Select className="w-full" value={sessPractId} onChange={(e) => setSessPractId(e.target.value)}>
                    <option value="">Default</option>
                    {practitioners?.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tindakan / Jenis Terapi</label>
                <Input
                  placeholder="Contoh: Ultrasound therapy + stretching pasif"
                  value={sessTindakan}
                  onChange={(e) => setSessTindakan(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Hasil</label>
                <Input
                  placeholder="Evaluasi hasil sesi terapi"
                  value={sessHasil}
                  onChange={(e) => setSessHasil(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Catatan Progress</label>
                <Input
                  placeholder="Perkembangan pasien"
                  value={sessCatatan}
                  onChange={(e) => setSessCatatan(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Nyeri Sebelum (0-10)</label>
                  <Input
                    type="number" min={0} max={10}
                    value={sessNyeriBefore}
                    onChange={(e) => setSessNyeriBefore(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Nyeri Sesudah (0-10)</label>
                  <Input
                    type="number" min={0} max={10}
                    value={sessNyeriAfter}
                    onChange={(e) => setSessNyeriAfter(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ROM Sebelum</label>
                  <Input
                    placeholder="Contoh: Fleksi 30°"
                    value={sessRomBefore}
                    onChange={(e) => setSessRomBefore(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ROM Sesudah</label>
                  <Input
                    placeholder="Contoh: Fleksi 60°"
                    value={sessRomAfter}
                    onChange={(e) => setSessRomAfter(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  disabled={!sessTanggal || addSession.isPending}
                  onClick={handleAddSession}
                >
                  {addSession.isPending ? 'Menyimpan...' : 'Simpan Sesi'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSessionForm(false)}>
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* Sessions list */}
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Belum ada sesi terapi dicatat
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const nyeriBefore = sess.skala_nyeri_sebelum !== null ? Number(sess.skala_nyeri_sebelum) : null
                const nyeriAfter = sess.skala_nyeri_sesudah !== null ? Number(sess.skala_nyeri_sesudah) : null
                const nyeriImproved = nyeriBefore !== null && nyeriAfter !== null && nyeriAfter < nyeriBefore
                return (
                  <div key={sess.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                          {sess.sesi_ke}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            Sesi #{sess.sesi_ke} — {new Date(sess.tanggal as string).toLocaleDateString('id-ID', {
                              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sess.waktu_mulai && sess.waktu_selesai
                              ? `${sess.waktu_mulai} - ${sess.waktu_selesai}`
                              : sess.waktu_mulai || ''}
                            {sess.practitioner_nama && ` • ${sess.practitioner_nama}`}
                          </p>
                        </div>
                      </div>
                      {canAddSession && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            if (confirm('Hapus sesi ini?')) {
                              deleteSession.mutate(sess.id as string)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Session details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pl-11">
                      {sess.tindakan && (
                        <div>
                          <span className="text-muted-foreground text-xs">Tindakan</span>
                          <p>{sess.tindakan}</p>
                        </div>
                      )}
                      {sess.hasil && (
                        <div>
                          <span className="text-muted-foreground text-xs">Hasil</span>
                          <p>{sess.hasil}</p>
                        </div>
                      )}
                      {sess.catatan_progress && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground text-xs">Catatan Progress</span>
                          <p>{sess.catatan_progress}</p>
                        </div>
                      )}
                    </div>

                    {/* Pain & ROM indicators */}
                    {(nyeriBefore !== null || sess.rom_sebelum) && (
                      <div className="flex flex-wrap gap-3 pl-11">
                        {nyeriBefore !== null && nyeriAfter !== null && (
                          <div className={`text-xs px-2 py-1 rounded ${nyeriImproved ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            Nyeri: {nyeriBefore} → {nyeriAfter}
                            {nyeriImproved && ' ↓'}
                          </div>
                        )}
                        {sess.rom_sebelum && sess.rom_sesudah && (
                          <div className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
                            ROM: {sess.rom_sebelum} → {sess.rom_sesudah}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Transactions */}
      {fees && fees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Rincian Jasa ({fees.length} transaksi)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Tenaga Luar</TableHead>
                    <TableHead className="text-right">Tarif Sesi</TableHead>
                    <TableHead className="text-center">Split</TableHead>
                    <TableHead className="text-right">Jasa Tenaga Luar</TableHead>
                    <TableHead className="text-right">Jasa RS</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm">{f.deskripsi}</TableCell>
                      <TableCell className="text-sm">{f.practitioner_nama || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatRupiah(Number(f.tarif_sesi))}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {f.fee_share_persen}% / {f.fee_share_rs_persen}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-orange-600">
                        {formatRupiah(Number(f.jumlah_practitioner))}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-teal-600">
                        {formatRupiah(Number(f.jumlah_rs))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(f.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
