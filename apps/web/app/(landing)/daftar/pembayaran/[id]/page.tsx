'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getRegistrationConfig } from '@/lib/api/registration'
import {
  Activity,
  Upload,
  CheckCircle,
  Clock,
  CreditCard,
  Copy,
  Loader2,
  AlertTriangle,
  FileImage,
  ArrowLeft,
  ExternalLink,
  Building2,
} from 'lucide-react'

interface PaymentInfo {
  status: string
  needsPayment: boolean
  nama_rs?: string
  plan_code?: string
  billing_period?: string
  payment_amount?: number
  payment_proof_uploaded?: boolean
  bank?: {
    name: string
    accountNumber: string
    accountName: string
  }
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
}

function formatRupiah(amount: number): string {
  if (amount === 0) return 'Gratis'
  return `Rp ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export default function PaymentPage() {
  const params = useParams()
  const registrationId = params.id as string

  const [info, setInfo] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('SIMRS')

  useEffect(() => {
    getRegistrationConfig()
      .then((cfg) => { if (cfg.platform_name) setBrandName(cfg.platform_name) })
      .catch(() => {})
  }, [])

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/register/payment-info/${registrationId}`)
      const json = await res.json()
      if (json.success) {
        setInfo(json.data)
      } else {
        setError('Registrasi tidak ditemukan')
      }
    } catch {
      setError('Gagal memuat info pembayaran')
    } finally {
      setLoading(false)
    }
  }, [registrationId])

  useEffect(() => {
    fetchInfo()
  }, [fetchInfo])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5 MB')
      return
    }

    setSelectedFile(file)
    setError(null)

    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch(`${getApiUrl()}/register/upload-proof/${registrationId}`, {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (json.success) {
        setUploaded(true)
        setInfo((prev) => prev ? { ...prev, payment_proof_uploaded: true } : prev)
      } else {
        setError(json.error?.message || 'Gagal mengunggah bukti pembayaran')
      }
    } catch {
      setError('Gagal mengunggah bukti pembayaran')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-red-600">{error}</p>
          <Link href="/" className="text-teal-600 hover:underline text-sm">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  if (!info?.needsPayment) {
    return (
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">{brandName}</span>
            </Link>
          </div>
        </nav>
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Tidak Perlu Pembayaran</h1>
          <p className="text-sm text-slate-500">
            Registrasi ini tidak memerlukan pembayaran atau sudah diproses.
          </p>
          <Link
            href={`/daftar/status?id=${registrationId}`}
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 text-sm"
          >
            Cek Status Registrasi <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

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
          <Link
            href={`/daftar/status?id=${registrationId}`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Cek Status
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Link href="/daftar" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Pendaftaran
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instruksi Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-1">
            Selesaikan pembayaran untuk mengaktifkan <strong>{info.nama_rs}</strong>
          </p>
        </div>

        {/* RS & Plan Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{info.nama_rs}</p>
              <p className="text-xs text-slate-500 capitalize">
                Paket {info.plan_code} — {info.billing_period === 'yearly' ? 'Tahunan' : 'Bulanan'}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-xs text-blue-600 mb-1">Total Pembayaran</p>
            <p className="text-3xl font-bold text-blue-800">
              {formatRupiah(Number(info.payment_amount || 0))}
            </p>
          </div>
        </div>

        {/* Bank Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-teal-600" />
            Transfer ke Rekening
          </h2>

          {info.bank?.accountNumber ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Bank</p>
                  <p className="font-semibold text-slate-900">{info.bank.name}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Nomor Rekening</p>
                  <p className="font-mono font-bold text-lg text-slate-900">
                    {info.bank.accountNumber}
                  </p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(info.bank!.accountNumber)}
                  className="p-2 rounded-md hover:bg-slate-200 text-slate-400"
                  title="Salin nomor rekening"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Atas Nama</p>
                  <p className="font-semibold text-slate-900">{info.bank.accountName}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-lg text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 inline mr-1.5" />
              Info rekening belum dikonfigurasi. Hubungi admin platform.
            </div>
          )}
        </div>

        {/* Upload Payment Proof */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-teal-600" />
            Upload Bukti Pembayaran
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Setelah transfer, upload foto/screenshot bukti pembayaran agar kami bisa memverifikasi lebih cepat.
          </p>

          {uploaded || info.payment_proof_uploaded ? (
            <div className="p-4 bg-emerald-50 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-800">Bukti Pembayaran Sudah Diunggah</p>
              <p className="text-xs text-emerald-600 mt-1">
                Tim kami akan memverifikasi dalam 1×24 jam kerja. Anda akan menerima notifikasi email.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File selector */}
              <label className="block">
                <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  selectedFile
                    ? 'border-teal-400 bg-teal-50/50'
                    : 'border-slate-300 hover:border-teal-400 hover:bg-teal-50/20'
                }`}>
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-40 mx-auto rounded-lg object-contain"
                      />
                      <p className="text-xs text-teal-700 font-medium">{selectedFile?.name}</p>
                    </div>
                  ) : selectedFile ? (
                    <div className="space-y-2">
                      <FileImage className="h-10 w-10 text-teal-500 mx-auto" />
                      <p className="text-sm text-teal-700 font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-slate-400">
                        {(selectedFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-sm text-slate-500">
                        Klik untuk pilih file atau drag & drop
                      </p>
                      <p className="text-xs text-slate-400">
                        JPG, PNG, WebP, atau PDF (maks. 5 MB)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="sr-only"
                />
              </label>

              {error && (
                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Mengunggah...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Upload Bukti Bayar</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Deadline Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Batas Waktu Pembayaran</p>
            <p className="text-xs text-amber-600 mt-1">
              Pembayaran harus dilakukan dalam 3×24 jam sejak pendaftaran.
              Registrasi yang belum dibayar akan otomatis dibatalkan.
            </p>
          </div>
        </div>

        {/* ID Reference */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            ID Registrasi: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{registrationId}</code>
          </p>
        </div>
      </div>
    </div>
  )
}
