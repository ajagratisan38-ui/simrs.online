'use client'

import { useState } from 'react'
import { Activity, ArrowRight, Loader2, AlertCircle, Shield } from 'lucide-react'
import Link from 'next/link'

export default function PortalLoginPage() {
  const [nik, setNik] = useState('')
  const [tanggalLahir, setTanggalLahir] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (nik.length !== 16) {
      setError('NIK harus 16 digit')
      return
    }
    if (!tanggalLahir) {
      setError('Tanggal lahir wajib diisi')
      return
    }
    if (!tenantSlug || tenantSlug.length < 3) {
      setError('Kode RS wajib diisi minimal 3 karakter')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik,
          tanggal_lahir: tanggalLahir,
          tenant_slug: tenantSlug,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Login gagal. Periksa kembali data Anda.')
        return
      }

      localStorage.setItem('portal-token', data.data.token)
      localStorage.setItem('portal-patient', JSON.stringify(data.data.patient))
      window.location.href = '/portal'
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex flex-col">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">Portal Pasien</span>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-4 pt-8 sm:pt-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Masuk ke Portal</h1>
            <p className="text-sm text-slate-500 mt-2">
              Gunakan NIK dan tanggal lahir Anda untuk melihat riwayat kunjungan, tagihan, dan rekam medis.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="tenantSlug" className="block text-sm font-medium text-slate-700 mb-1">
                Kode Rumah Sakit
              </label>
              <input
                id="tenantSlug"
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="rs-contoh"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Slug RS yang terdaftar (contoh: rs-contoh)
              </p>
            </div>

            <div>
              <label htmlFor="nik" className="block text-sm font-medium text-slate-700 mb-1">
                NIK (Nomor Induk Kependudukan)
              </label>
              <input
                id="nik"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                placeholder="16 digit NIK"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm tracking-wider focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              />
              <p className="text-xs text-slate-400 mt-1">{nik.length}/16 digit</p>
            </div>

            <div>
              <label htmlFor="tglLahir" className="block text-sm font-medium text-slate-700 mb-1">
                Tanggal Lahir
              </label>
              <input
                id="tglLahir"
                type="text"
                inputMode="numeric"
                value={tanggalLahir ? tanggalLahir.split('-').reverse().join('/') : ''}
                placeholder="dd/mm/yyyy"
                maxLength={10}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                  let fmt = digits
                  if (digits.length > 2) fmt = digits.slice(0, 2) + '/' + digits.slice(2)
                  if (digits.length > 4) fmt = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
                  if (digits.length === 8) {
                    const dd = digits.slice(0, 2)
                    const mm = digits.slice(2, 4)
                    const yyyy = digits.slice(4, 8)
                    setTanggalLahir(`${yyyy}-${mm}-${dd}`)
                  } else if (digits.length === 0) {
                    setTanggalLahir('')
                  }
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || nik.length !== 16 || !tanggalLahir || tenantSlug.length < 3}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Masuk <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="h-3.5 w-3.5" />
            <p>Data Anda dilindungi sesuai UU PDP</p>
          </div>

          <div className="mt-3 text-center">
            <Link href="/" className="text-xs text-teal-600 hover:text-teal-700">
              ← Kembali ke halaman utama
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
