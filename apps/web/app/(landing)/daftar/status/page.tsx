'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { usePlatformDomain } from '@/hooks/use-platform-domain'
import { getRegistrationConfig } from '@/lib/api/registration'
import {
  Activity,
  Search,
  CheckCircle,
  Clock,
  CreditCard,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Copy,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Settings,
} from 'lucide-react'

interface StatusData {
  id: string
  nama_rs: string
  status: string
  requested_slug: string
  plan_code: string
  admin_email: string
  payment_proof_url: boolean
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  provisioned_at: string | null
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
}

const STATUS_CONFIG: Record<string, {
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}> = {
  pending: {
    label: 'Menunggu Review',
    description: 'Pendaftaran Anda sedang menunggu peninjauan oleh tim kami.',
    icon: Clock,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  payment_pending: {
    label: 'Menunggu Pembayaran',
    description: 'Silakan lakukan pembayaran untuk melanjutkan proses pendaftaran.',
    icon: CreditCard,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  under_review: {
    label: 'Sedang Ditinjau',
    description: 'Pembayaran diterima. Tim kami sedang meninjau pendaftaran Anda.',
    icon: ShieldCheck,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  approved: {
    label: 'Disetujui',
    description: 'Pendaftaran disetujui. RS Anda sedang dalam proses aktivasi.',
    icon: CheckCircle,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  provisioning: {
    label: 'Sedang Diaktifkan',
    description: 'RS Anda sedang diaktifkan. Proses ini memakan waktu beberapa saat.',
    icon: Settings,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  active: {
    label: 'Aktif',
    description: 'RS Anda sudah aktif! Silakan login untuk mulai menggunakan sistem.',
    icon: CheckCircle,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  rejected: {
    label: 'Ditolak',
    description: 'Pendaftaran tidak disetujui.',
    icon: XCircle,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
}

const TIMELINE_STEPS = [
  { status: 'pending', label: 'Pendaftaran' },
  { status: 'payment_pending', label: 'Pembayaran' },
  { status: 'under_review', label: 'Verifikasi' },
  { status: 'approved', label: 'Disetujui' },
  { status: 'active', label: 'Aktif' },
]

function StatusContent() {
  const domain = usePlatformDomain()
  const searchParams = useSearchParams()
  const initialId = searchParams.get('id') || ''

  const [registrationId, setRegistrationId] = useState(initialId)
  const [inputId, setInputId] = useState(initialId)
  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('SIMRS')

  useEffect(() => {
    getRegistrationConfig()
      .then((cfg) => { if (cfg.platform_name) setBrandName(cfg.platform_name) })
      .catch(() => {})
  }, [])

  const fetchStatus = async (id: string) => {
    if (!id.trim()) return
    setLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await fetch(`${getApiUrl()}/register/status/${id.trim()}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setRegistrationId(id.trim())
      } else {
        setError(json.error?.message || 'Registrasi tidak ditemukan')
      }
    } catch {
      setError('Gagal memuat status. Periksa koneksi internet Anda.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialId) fetchStatus(initialId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const config = data ? STATUS_CONFIG[data.status] : null
  const StatusIcon = config?.icon || Clock

  // Determine timeline position
  const statusOrder = ['pending', 'payment_pending', 'under_review', 'approved', 'active']
  const currentIdx = data ? statusOrder.indexOf(data.status) : -1

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">{brandName}</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900">
            Login
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Beranda
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cek Status Pendaftaran</h1>
          <p className="text-sm text-slate-500 mt-1">
            Masukkan ID registrasi untuk melihat status pendaftaran RS Anda
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchStatus(inputId)}
                placeholder="Masukkan ID registrasi (UUID)"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={() => fetchStatus(inputId)}
              disabled={loading || !inputId.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Cek
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Result */}
        {data && config && (
          <div className="space-y-4">
            {/* Status card */}
            <div className={`rounded-xl border p-6 ${config.bgColor} ${config.borderColor}`}>
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <StatusIcon className={`h-6 w-6 ${config.color}`} />
                </div>
                <div className="flex-1">
                  <h2 className={`text-lg font-bold ${config.color}`}>{config.label}</h2>
                  <p className="text-sm text-slate-600 mt-1">{config.description}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {data.status !== 'rejected' && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Progress</h3>
                <div className="flex items-center justify-between">
                  {TIMELINE_STEPS.map((step, i) => {
                    const isDone = currentIdx >= i
                    const isCurrent = currentIdx === i
                    return (
                      <div key={step.status} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                            isDone
                              ? isCurrent
                                ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                                : 'bg-teal-100 text-teal-700'
                              : 'bg-slate-200 text-slate-400'
                          }`}>
                            {isDone && !isCurrent ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span className={`text-[10px] mt-1.5 whitespace-nowrap ${
                            isCurrent ? 'text-teal-700 font-semibold' : 'text-slate-400'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-2 mb-5 ${
                            currentIdx > i ? 'bg-teal-400' : 'bg-slate-200'
                          }`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Detail Registrasi</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Nama RS</dt>
                  <dd className="text-sm font-medium text-slate-900">{data.nama_rs}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Subdomain</dt>
                  <dd className="text-sm font-medium text-slate-900">{data.requested_slug}.{domain}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Paket</dt>
                  <dd className="text-sm font-medium text-slate-900 capitalize">{data.plan_code}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Didaftarkan</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {new Date(data.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </dd>
                </div>
                {data.reviewed_at && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-slate-500">Ditinjau</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {new Date(data.reviewed_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </dd>
                  </div>
                )}
                {data.provisioned_at && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-slate-500">Diaktifkan</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {new Date(data.provisioned_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Rejection reason */}
            {data.status === 'rejected' && data.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-medium text-red-800 mb-1">Alasan Penolakan:</p>
                <p className="text-sm text-red-600">{data.rejection_reason}</p>
                <Link
                  href="/daftar"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-red-700 hover:text-red-900 font-medium"
                >
                  Daftar Ulang <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Login info for active tenants */}
            {data.status === 'active' && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-teal-800">Informasi Login</p>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <span className="text-teal-600">Kode RS:</span>
                  <span className="font-mono font-medium text-teal-900">{data.requested_slug}</span>
                  <span className="text-teal-600">Email:</span>
                  <span className="font-medium text-teal-900">{data.admin_email}</span>
                  <span className="text-teal-600">Password:</span>
                  <span className="text-teal-900">Password yang Anda daftarkan</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {data.status === 'payment_pending' && (
                <Link
                  href={`/daftar/pembayaran/${data.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                >
                  <CreditCard className="h-4 w-4" /> Upload Bukti Bayar
                </Link>
              )}
              {data.status === 'active' && (
                <Link
                  href={`/login?rs=${data.requested_slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4" /> Login Sekarang
                </Link>
              )}
              <button
                onClick={() => fetchStatus(registrationId)}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>

            {/* Copy ID */}
            <div className="text-center pt-2">
              <button
                onClick={() => navigator.clipboard.writeText(data.id)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                <Copy className="h-3 w-3" /> Salin ID: {data.id}
              </button>
            </div>
          </div>
        )}

        {/* No data yet */}
        {!data && !error && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Masukkan ID registrasi yang Anda dapatkan saat mendaftar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    }>
      <StatusContent />
    </Suspense>
  )
}
