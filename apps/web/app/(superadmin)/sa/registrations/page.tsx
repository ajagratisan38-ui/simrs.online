'use client'

import { formatRupiah } from '@/lib/utils'
import { useState } from 'react'
import { usePlatformDomain } from '@/hooks/use-platform-domain'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ClipboardCheck,
  Search,
  CheckCircle,
  XCircle,
  CreditCard,
  Clock,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  AlertTriangle,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Database,
} from 'lucide-react'
import {
  useRegistrations,
  useRegistrationStats,
  useReviewRegistration,
  useVerifyPayment,
  useRetryProvision,
} from '@/hooks/use-registration'
import { toast } from 'sonner'
import { SERVER_BASE_URL } from '@/lib/api/client'
import type { RegistrationRecord } from '@/lib/api/registration'

type StatusFilter = 'all' | 'pending' | 'payment_pending' | 'under_review' | 'approved' | 'active' | 'rejected'

const STATUS_TABS: Array<{ id: StatusFilter; label: string; icon: React.ElementType }> = [
  { id: 'all', label: 'Semua', icon: ClipboardCheck },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'payment_pending', label: 'Menunggu Bayar', icon: CreditCard },
  { id: 'under_review', label: 'Dalam Review', icon: Eye },
  { id: 'approved', label: 'Disetujui', icon: CheckCircle },
  { id: 'active', label: 'Aktif', icon: CheckCircle },
  { id: 'rejected', label: 'Ditolak', icon: XCircle },
]

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Menunggu Review', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
    payment_pending: { label: 'Menunggu Bayar', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
    under_review: { label: 'Dalam Review', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    approved: { label: 'Disetujui', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    provisioning: { label: 'Provisioning...', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
    active: { label: 'Aktif', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  }
  const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatRupiahOrGratis(amount: number | string): string {
  const num = Math.round(Number(amount) || 0)
  return num === 0 ? 'Gratis' : formatRupiah(num)
}

function RegistrationCard({
  reg,
  onApprove,
  onReject,
  onVerifyPayment,
  onRetryProvision,
}: {
  reg: RegistrationRecord
  onApprove: (id: string, notes?: string) => void
  onReject: (id: string, reason: string) => void
  onVerifyPayment: (id: string) => void
  onRetryProvision: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [approveNotes, setApproveNotes] = useState('')

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold">{reg.nama_rs}</h3>
              <StatusBadge status={reg.status} />
              {reg.tipe_rs && (
                <Badge variant="outline" className="text-[10px]">Tipe {reg.tipe_rs.toUpperCase()}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {reg.requested_slug}.{domain} — {reg.plan_code} ({reg.billing_period})
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Quick info row */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {reg.admin_nama}
          </span>
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" /> {reg.admin_email}
          </span>
          {reg.admin_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {reg.admin_phone}
            </span>
          )}
          {reg.kota && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {reg.kota}{reg.provinsi ? `, ${reg.provinsi}` : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatDate(reg.created_at)}
          </span>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* RS Detail */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Info Rumah Sakit
                </h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Nama</dt>
                    <dd className="font-medium text-right">{reg.nama_rs}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tipe</dt>
                    <dd className="font-medium">{reg.tipe_rs || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Nomor Izin</dt>
                    <dd className="font-medium">{reg.nomor_izin || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email RS</dt>
                    <dd className="font-medium">{reg.email_rs || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Website</dt>
                    <dd className="font-medium">{reg.website || '-'}</dd>
                  </div>
                  {reg.alamat && (
                    <div>
                      <dt className="text-muted-foreground">Alamat</dt>
                      <dd className="text-sm mt-0.5">{reg.alamat}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Info Admin & Pembayaran
                </h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Admin</dt>
                    <dd className="font-medium">{reg.admin_nama}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Jabatan</dt>
                    <dd className="font-medium">{reg.admin_jabatan || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Paket</dt>
                    <dd className="font-medium capitalize">{reg.plan_code} / {reg.billing_period}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Jumlah Bayar</dt>
                    <dd className="font-medium">{formatRupiahOrGratis(reg.payment_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Metode</dt>
                    <dd className="font-medium">{reg.payment_method || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Referensi</dt>
                    <dd className="font-medium">{reg.payment_reference || '-'}</dd>
                  </div>
                  {reg.payment_verified_at && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Terverifikasi</dt>
                      <dd className="font-medium text-emerald-600">{formatDate(reg.payment_verified_at)}</dd>
                    </div>
                  )}
                </dl>

                {/* Payment proof */}
                {reg.payment_proof_url && (
                  <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Bukti Pembayaran
                    </p>
                    {typeof reg.payment_proof_url === 'string' && reg.payment_proof_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <img
                        src={`${SERVER_BASE_URL}${reg.payment_proof_url}`}
                        alt="Bukti pembayaran"
                        className="max-h-40 rounded border object-contain"
                      />
                    ) : (
                      <a
                        href={`${SERVER_BASE_URL}${reg.payment_proof_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Lihat bukti pembayaran ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Migrasi info */}
            {reg.migrasi_requested && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                  <Database className="h-4 w-4" />
                  Meminta Migrasi Data
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Sumber: {reg.migrasi_source || '-'} — {reg.migrasi_notes || 'Tidak ada catatan'}
                </p>
              </div>
            )}

            {/* Rejection reason */}
            {reg.status === 'rejected' && reg.rejection_reason && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Alasan Penolakan:</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{reg.rejection_reason}</p>
              </div>
            )}

            {/* Review info */}
            {reg.reviewed_at && (
              <div className="text-xs text-muted-foreground">
                Ditinjau pada {formatDate(reg.reviewed_at)}
                {reg.provisioned_at && ` — Provisioned: ${formatDate(reg.provisioned_at)}`}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {/* Payment pending → verify payment */}
              {reg.status === 'payment_pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onVerifyPayment(reg.id)}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                  Verifikasi Pembayaran
                </Button>
              )}

              {/* Pending/under_review → approve/reject */}
              {['pending', 'under_review'].includes(reg.status) && (
                <>
                  {!showRejectForm ? (
                    <>
                      <div className="flex-1">
                        <Input
                          placeholder="Catatan approval (opsional)"
                          value={approveNotes}
                          onChange={(e) => setApproveNotes(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onApprove(reg.id, approveNotes || undefined)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowRejectForm(true)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <div className="w-full space-y-2">
                      <Textarea
                        placeholder="Alasan penolakan (wajib)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (!rejectReason.trim()) {
                              toast.error('Alasan penolakan wajib diisi')
                              return
                            }
                            onReject(reg.id, rejectReason)
                            setShowRejectForm(false)
                            setRejectReason('')
                          }}
                        >
                          Konfirmasi Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowRejectForm(false)
                            setRejectReason('')
                          }}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Approved but stuck → retry provision */}
              {reg.status === 'approved' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRetryProvision(reg.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retry Provisioning
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function RegistrationsPage() {
  const domain = usePlatformDomain()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: regStats } = useRegistrationStats()
  const { data: regData, isLoading } = useRegistrations({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search || undefined,
    page,
    limit: 20,
  })

  const reviewMut = useReviewRegistration()
  const verifyMut = useVerifyPayment()
  const provisionMut = useRetryProvision()

  const handleApprove = (id: string, notes?: string) => {
    reviewMut.mutate(
      { id, action: 'approve', notes },
      {
        onSuccess: () => toast.success('Registrasi disetujui — RS sedang di-provision'),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const handleReject = (id: string, reason: string) => {
    reviewMut.mutate(
      { id, action: 'reject', rejection_reason: reason },
      {
        onSuccess: () => toast.success('Registrasi ditolak'),
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const handleVerifyPayment = (id: string) => {
    verifyMut.mutate(id, {
      onSuccess: () => toast.success('Pembayaran terverifikasi — status menjadi under review'),
      onError: (err) => toast.error(err.message),
    })
  }

  const handleRetryProvision = (id: string) => {
    provisionMut.mutate(id, {
      onSuccess: () => toast.success('Provisioning berhasil — RS sudah aktif'),
      onError: (err) => toast.error(err.message),
    })
  }

  const totalPages = Math.ceil((regData?.meta?.total || 0) / 20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pendaftaran RS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola antrian pendaftaran rumah sakit baru ke platform
        </p>
      </div>

      {/* Stats */}
      {regStats && (
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {[
            { label: 'Total', value: regStats.total, color: 'text-slate-600' },
            { label: 'Pending', value: regStats.pending, color: 'text-yellow-600' },
            { label: 'Bayar', value: regStats.paymentPending, color: 'text-orange-600' },
            { label: 'Review', value: regStats.underReview, color: 'text-blue-600' },
            { label: 'Approved', value: regStats.approved, color: 'text-emerald-600' },
            { label: 'Aktif', value: regStats.active, color: 'text-green-600' },
            { label: 'Ditolak', value: regStats.rejected, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-2 bg-white dark:bg-slate-900 rounded-lg border">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama RS, email, slug..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-8 text-xs"
          />
        </div>
      </div>

      {/* Registration list */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
        </div>
      ) : !regData?.data?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {statusFilter === 'all'
                ? 'Belum ada pendaftaran RS'
                : `Tidak ada pendaftaran dengan status "${STATUS_TABS.find((t) => t.id === statusFilter)?.label}"`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {regData.data.map((reg) => (
            <RegistrationCard
              key={reg.id}
              reg={reg}
              onApprove={handleApprove}
              onReject={handleReject}
              onVerifyPayment={handleVerifyPayment}
              onRetryProvision={handleRetryProvision}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Selanjutnya
          </Button>
        </div>
      )}
    </div>
  )
}
