'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  User,
  Globe,
  CreditCard,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  XCircle,
  Database,
  Package,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { submitRegistration, checkSlugAvailability, getPublicPlans, getRegistrationConfig } from '@/lib/api/registration'
import type { RegistrationInput, SlugCheckResult, PublicPlan, RegistrationConfig } from '@/lib/api/registration'

type Step = 'plan' | 'rs-info' | 'admin-info' | 'subdomain' | 'migrasi' | 'review' | 'success'

const STEPS: Array<{ id: Step; label: string; icon: React.ElementType }> = [
  { id: 'plan', label: 'Pilih Paket', icon: Package },
  { id: 'rs-info', label: 'Info RS', icon: Building2 },
  { id: 'admin-info', label: 'Admin', icon: User },
  { id: 'subdomain', label: 'Subdomain', icon: Globe },
  { id: 'migrasi', label: 'Migrasi', icon: Database },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

interface DisplayPlan {
  code: string
  name: string
  price: number
  priceLabel: string
  period: string
  features: string[]
  badge: string | null
}

function formatNum(n: number): string {
  if (n < 0 || n >= 999) return 'Unlimited'
  return n.toLocaleString('id-ID')
}

function apiPlanToDisplay(plan: PublicPlan, billingPeriod: 'monthly' | 'yearly' = 'monthly'): DisplayPlan {
  const isTrial = plan.price_monthly === 0
  const yearlyPrice = plan.price_yearly || (plan.price_monthly * 10)
  const isYearly = billingPeriod === 'yearly'
  const displayPrice = isTrial ? 0 : (isYearly ? yearlyPrice : plan.price_monthly)
  return {
    code: plan.code,
    name: plan.name,
    price: displayPrice,
    priceLabel: isTrial ? 'Gratis' : formatRupiah(displayPrice),
    period: isTrial ? `${plan.trial_days} hari` : isYearly ? '/tahun' : '/bulan',
    features: [
      `${formatNum(plan.max_users)} user`,
      `${formatNum(plan.max_patients)} pasien`,
      `${formatNum(plan.max_doctors)} dokter`,
      plan.max_storage_gb >= 1000 ? `${plan.max_storage_gb / 1000} TB` : `${plan.max_storage_gb} GB`,
      plan.allowed_modules.includes('*') ? 'Semua modul' : 'Modul dasar',
    ],
    badge: isTrial ? 'Coba Dulu' : plan.sort_order === 2 ? 'Populer' : null,
  }
}

const RS_TYPES = [
  { value: 'A', label: 'Tipe A — RS Pendidikan' },
  { value: 'B', label: 'Tipe B — RS Rujukan Regional' },
  { value: 'C', label: 'Tipe C — RS Umum Menengah' },
  { value: 'D', label: 'Tipe D — RS Umum Pratama' },
  { value: 'pratama', label: 'Klinik Pratama' },
  { value: 'utama', label: 'Klinik Utama' },
]

interface FormData {
  plan_code: string
  billing_period: 'monthly' | 'yearly'
  nama_rs: string
  tipe_rs: string
  alamat: string
  provinsi: string
  kota: string
  no_telepon: string
  email_rs: string
  website: string
  nomor_izin: string
  admin_nama: string
  admin_jabatan: string
  admin_email: string
  admin_phone: string
  admin_password: string
  admin_password_confirm: string
  requested_slug: string
  migrasi_requested: boolean
  migrasi_source: string
  migrasi_notes: string
}


export default function DaftarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg animate-pulse">Memuat halaman pendaftaran...</div>
      </div>
    }>
      <DaftarPageContent />
    </Suspense>
  )
}

function DaftarPageContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('plan')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultId, setResultId] = useState<string | null>(null)
  const [resultStatus, setResultStatus] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [plans, setPlans] = useState<DisplayPlan[]>([])
  const [rawPlans, setRawPlans] = useState<PublicPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [regConfig, setRegConfig] = useState<RegistrationConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)

  useEffect(() => {
    getRegistrationConfig()
      .then(setRegConfig)
      .catch(() => setRegConfig({ registration_open: true, platform_name: 'SIMRS', platform_tagline: '' }))
      .finally(() => setConfigLoading(false))
  }, [])

  useEffect(() => {
    getPublicPlans()
      .then((apiPlans) => {
        setRawPlans(apiPlans)
        setPlans(apiPlans.map((p) => apiPlanToDisplay(p, 'monthly')))
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false))
  }, [])

  // Slug check
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugResult, setSlugResult] = useState<SlugCheckResult | null>(null)

  const [form, setForm] = useState<FormData>({
    plan_code: searchParams.get('plan') || 'trial',
    billing_period: 'monthly',
    nama_rs: '',
    tipe_rs: '',
    alamat: '',
    provinsi: '',
    kota: '',
    no_telepon: '',
    email_rs: '',
    website: '',
    nomor_izin: '',
    admin_nama: '',
    admin_jabatan: '',
    admin_email: '',
    admin_phone: '',
    admin_password: '',
    admin_password_confirm: '',
    requested_slug: '',
    migrasi_requested: false,
    migrasi_source: '',
    migrasi_notes: '',
  })

  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Auto-generate slug from RS name
  useEffect(() => {
    if (form.nama_rs && !form.requested_slug) {
      const slug = form.nama_rs
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50)
      updateForm('requested_slug', slug)
    }
  }, [form.nama_rs])

  // Check slug availability
  const checkSlug = useCallback(async (slug: string) => {
    if (slug.length < 3) {
      setSlugResult({ available: false, reason: 'Minimal 3 karakter' })
      return
    }
    setSlugChecking(true)
    try {
      const result = await checkSlugAvailability(slug)
      setSlugResult(result)
    } catch {
      setSlugResult(null)
    } finally {
      setSlugChecking(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (form.requested_slug.length >= 3) {
        checkSlug(form.requested_slug)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [form.requested_slug, checkSlug])

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const selectedPlan = plans.find((p) => p.code === form.plan_code) || plans[0] || { code: 'trial', name: 'Trial', price: 0, priceLabel: 'Gratis', period: '30 hari', features: [], badge: null }
  const isTrial = selectedPlan.price === 0

  const canProceed = (): boolean => {
    switch (step) {
      case 'plan':
        return !!form.plan_code
      case 'rs-info':
        return form.nama_rs.length >= 3
      case 'admin-info':
        return (
          form.admin_nama.length >= 2 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email) &&
          form.admin_password.length >= 8 &&
          form.admin_password === form.admin_password_confirm
        )
      case 'subdomain':
        return form.requested_slug.length >= 3 && (slugResult?.available === true)
      case 'migrasi':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }

  const goNext = () => {
    const idx = stepIndex
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1].id)
    }
  }

  const goPrev = () => {
    const idx = stepIndex
    if (idx > 0) {
      setStep(STEPS[idx - 1].id)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const payload: RegistrationInput = {
        nama_rs: form.nama_rs,
        tipe_rs: form.tipe_rs || undefined,
        alamat: form.alamat || undefined,
        provinsi: form.provinsi || undefined,
        kota: form.kota || undefined,
        no_telepon: form.no_telepon || undefined,
        email_rs: form.email_rs || undefined,
        website: form.website || undefined,
        nomor_izin: form.nomor_izin || undefined,
        admin_nama: form.admin_nama,
        admin_jabatan: form.admin_jabatan || undefined,
        admin_email: form.admin_email,
        admin_phone: form.admin_phone || undefined,
        admin_password: form.admin_password,
        plan_code: form.plan_code,
        billing_period: form.billing_period,
        requested_slug: form.requested_slug,
        migrasi_requested: form.migrasi_requested,
        migrasi_source: form.migrasi_source || undefined,
        migrasi_notes: form.migrasi_notes || undefined,
      }

      const res = await submitRegistration(payload)
      setResultId(res.data.id)
      setResultStatus(res.data.status)

      // For paid plans, redirect directly to payment page
      if (res.data.status === 'payment_pending' && res.data.id) {
        window.location.href = `/daftar/pembayaran/${res.data.id}`
        return
      }

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pendaftaran')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">{regConfig?.platform_name || 'SIMRS'}</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
            Sudah punya akun? Login
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Registration Closed */}
        {!configLoading && regConfig && !regConfig.registration_open && step !== 'success' && (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-10 w-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Registrasi Ditutup
            </h1>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              Pendaftaran rumah sakit baru sedang tidak dibuka untuk saat ini.
              Silakan hubungi admin platform untuk informasi lebih lanjut.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
              </Link>
              <Link
                href="/daftar/status"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cek Status Pendaftaran
              </Link>
            </div>
          </div>
        )}

        {/* Loading config */}
        {configLoading && (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Memuat konfigurasi...</p>
          </div>
        )}

        {!configLoading && (regConfig?.registration_open !== false) && step !== 'success' && (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between mb-8">
              {STEPS.map((s, i) => {
                const Icon = s.icon
                const isActive = i === stepIndex
                const isDone = i < stepIndex
                return (
                  <div key={s.id} className="flex items-center gap-1.5 flex-1">
                    <div
                      className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium shrink-0 ${
                        isActive
                          ? 'bg-teal-600 text-white'
                          : isDone
                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                            : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">{s.label}</span>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 ${isDone ? 'bg-teal-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              {STEPS[stepIndex]?.label}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              {step === 'plan' && 'Pilih paket yang sesuai untuk rumah sakit Anda'}
              {step === 'rs-info' && 'Masukkan informasi dasar rumah sakit'}
              {step === 'admin-info' && 'Data administrator yang akan mengelola sistem'}
              {step === 'subdomain' && 'Pilih alamat subdomain untuk RS Anda'}
              {step === 'migrasi' && 'Apakah Anda ingin migrasi data dari sistem lama?'}
              {step === 'review' && 'Periksa kembali semua data sebelum mengirim'}
            </p>
          </>
        )}

        {/* Step Content */}
        {!configLoading && regConfig?.registration_open !== false && (
        <>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          {/* Step 1: Plan */}
          {step === 'plan' && (
            <div className="space-y-4">
              {plansLoading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 animate-pulse">
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2" />
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-3" />
                      <div className="space-y-1.5">
                        {[1, 2, 3].map((j) => <div key={j} className="h-3 bg-slate-100 dark:bg-slate-800 rounded" />)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.code}
                    onClick={() => updateForm('plan_code', plan.code)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${
                      form.plan_code === plan.code
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{plan.name}</span>
                      {plan.badge && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 text-[10px] font-semibold rounded-full">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{plan.priceLabel}</span>
                      <span className="text-xs text-slate-500 ml-1">{plan.period}</span>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <CheckCircle className="h-3 w-3 text-teal-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              )}

              {!isTrial && (
                <div className="space-y-2 pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateForm('billing_period', 'monthly')
                        setPlans(rawPlans.map((p) => apiPlanToDisplay(p, 'monthly')))
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.billing_period === 'monthly'
                          ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      Bayar Bulanan
                    </button>
                    <button
                      onClick={() => {
                        updateForm('billing_period', 'yearly')
                        setPlans(rawPlans.map((p) => apiPlanToDisplay(p, 'yearly')))
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.billing_period === 'yearly'
                          ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      Bayar Tahunan
                    </button>
                  </div>
                  {form.billing_period === 'yearly' && (
                    <p className="text-xs text-teal-600 dark:text-teal-400 text-center">
                      Hemat 2 bulan — bayar 10 bulan untuk 12 bulan pemakaian
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: RS Info */}
          {step === 'rs-info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Rumah Sakit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nama_rs}
                  onChange={(e) => updateForm('nama_rs', e.target.value)}
                  placeholder="RS Harapan Bunda"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Tipe RS
                  </label>
                  <select
                    value={form.tipe_rs}
                    onChange={(e) => updateForm('tipe_rs', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Pilih tipe</option>
                    {RS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nomor Izin Operasional
                  </label>
                  <input
                    type="text"
                    value={form.nomor_izin}
                    onChange={(e) => updateForm('nomor_izin', e.target.value)}
                    placeholder="HK.07.01/II/..."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Alamat
                </label>
                <textarea
                  value={form.alamat}
                  onChange={(e) => updateForm('alamat', e.target.value)}
                  rows={2}
                  placeholder="Jl. Contoh No. 123"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Provinsi</label>
                  <input type="text" value={form.provinsi} onChange={(e) => updateForm('provinsi', e.target.value)}
                    placeholder="DKI Jakarta" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kota/Kabupaten</label>
                  <input type="text" value={form.kota} onChange={(e) => updateForm('kota', e.target.value)}
                    placeholder="Jakarta Selatan" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Telepon RS</label>
                  <input type="tel" value={form.no_telepon} onChange={(e) => updateForm('no_telepon', e.target.value)}
                    placeholder="021-12345678" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email RS</label>
                  <input type="email" value={form.email_rs} onChange={(e) => updateForm('email_rs', e.target.value)}
                    placeholder="info@rskamu.co.id" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Website</label>
                <input type="url" value={form.website} onChange={(e) => updateForm('website', e.target.value)}
                  placeholder="https://rskamu.co.id" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          )}

          {/* Step 3: Admin Info */}
          {step === 'admin-info' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                Admin adalah pengguna pertama yang akan mengelola sistem. Admin bisa menambahkan user lain setelah RS aktif.
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={form.admin_nama} onChange={(e) => updateForm('admin_nama', e.target.value)}
                    placeholder="Dr. Budi Santoso" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Jabatan</label>
                  <input type="text" value={form.admin_jabatan} onChange={(e) => updateForm('admin_jabatan', e.target.value)}
                    placeholder="Direktur / IT Manager" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input type="email" value={form.admin_email} onChange={(e) => updateForm('admin_email', e.target.value)}
                  placeholder="admin@rskamu.co.id" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <p className="text-[10px] text-slate-400 mt-1">Email ini digunakan untuk login dan menerima notifikasi</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">No. HP</label>
                <input type="tel" value={form.admin_phone} onChange={(e) => updateForm('admin_phone', e.target.value)}
                  placeholder="08xxxxxxxxxx" className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.admin_password}
                    onChange={(e) => updateForm('admin_password', e.target.value)}
                    placeholder="Min. 8 karakter"
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Konfirmasi Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.admin_password_confirm}
                  onChange={(e) => updateForm('admin_password_confirm', e.target.value)}
                  placeholder="Ulangi password"
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 ${
                    form.admin_password_confirm && form.admin_password !== form.admin_password_confirm
                      ? 'border-red-400'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {form.admin_password_confirm && form.admin_password !== form.admin_password_confirm && (
                  <p className="text-xs text-red-500 mt-1">Password tidak sama</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Subdomain */}
          {step === 'subdomain' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Subdomain <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-0">
                  <input
                    type="text"
                    value={form.requested_slug}
                    onChange={(e) => updateForm('requested_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="rs-harapan"
                    className="flex-1 px-3 py-2.5 rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-r-lg text-sm text-slate-500">
                    .{regConfig?.primary_domain || 'simrs.id'}
                  </span>
                </div>

                {/* Slug availability indicator */}
                <div className="mt-2">
                  {slugChecking && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> Mengecek ketersediaan...
                    </p>
                  )}
                  {!slugChecking && slugResult && (
                    <p className={`flex items-center gap-1.5 text-xs ${slugResult.available ? 'text-emerald-600' : 'text-red-500'}`}>
                      {slugResult.available ? (
                        <><CheckCircle className="h-3 w-3" /> Subdomain tersedia!</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> {slugResult.reason}</>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Akses RS Anda nanti:</p>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>🏥 Dashboard: <code className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded">{form.requested_slug || 'xxx'}.{regConfig?.primary_domain || 'simrs.id'}</code></p>
                  <p>👤 Portal Pasien: <code className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded">{form.requested_slug || 'xxx'}.{regConfig?.primary_domain || 'simrs.id'}/portal</code></p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Migrasi */}
          {step === 'migrasi' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => updateForm('migrasi_requested', false)}
                  className={`flex-1 p-4 rounded-xl border-2 text-left transition-colors ${
                    !form.migrasi_requested
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900 dark:text-white">Tidak, mulai baru</p>
                  <p className="text-xs text-slate-500 mt-1">Saya akan input data dari awal</p>
                </button>
                <button
                  onClick={() => updateForm('migrasi_requested', true)}
                  className={`flex-1 p-4 rounded-xl border-2 text-left transition-colors ${
                    form.migrasi_requested
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="font-medium text-sm text-slate-900 dark:text-white">Ya, migrasi data</p>
                  <p className="text-xs text-slate-500 mt-1">Saya punya data dari sistem lama</p>
                </button>
              </div>

              {form.migrasi_requested && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Sumber Data
                    </label>
                    <select
                      value={form.migrasi_source}
                      onChange={(e) => updateForm('migrasi_source', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Pilih sumber</option>
                      <option value="khanza">Khanza (SIMRS)</option>
                      <option value="csv">File CSV/Excel</option>
                      <option value="other">Sistem lain</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Catatan Migrasi
                    </label>
                    <textarea
                      value={form.migrasi_notes}
                      onChange={(e) => updateForm('migrasi_notes', e.target.value)}
                      rows={3}
                      placeholder="Jelaskan data apa saja yang ingin dimigrasikan (pasien, obat, dll)..."
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review */}
          {step === 'review' && (
            <div className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <ReviewSection title="Paket">
                  <ReviewItem label="Paket" value={`${selectedPlan.name} — ${selectedPlan.priceLabel}${isTrial ? '' : `/${form.billing_period === 'yearly' ? 'tahun' : 'bulan'}`}`} />
                </ReviewSection>

                <ReviewSection title="Informasi RS">
                  <ReviewItem label="Nama RS" value={form.nama_rs} />
                  {form.tipe_rs && <ReviewItem label="Tipe" value={form.tipe_rs.toUpperCase()} />}
                  {form.kota && <ReviewItem label="Lokasi" value={`${form.kota}${form.provinsi ? `, ${form.provinsi}` : ''}`} />}
                  {form.email_rs && <ReviewItem label="Email RS" value={form.email_rs} />}
                </ReviewSection>

                <ReviewSection title="Administrator">
                  <ReviewItem label="Nama" value={form.admin_nama} />
                  <ReviewItem label="Email" value={form.admin_email} />
                  {form.admin_phone && <ReviewItem label="HP" value={form.admin_phone} />}
                </ReviewSection>

                <ReviewSection title="Subdomain">
                  <ReviewItem label="URL" value={`${form.requested_slug}.${regConfig?.primary_domain || 'simrs.id'}`} />
                </ReviewSection>

                {form.migrasi_requested && (
                  <ReviewSection title="Migrasi">
                    <ReviewItem label="Sumber" value={form.migrasi_source || '-'} />
                    {form.migrasi_notes && <ReviewItem label="Catatan" value={form.migrasi_notes} />}
                  </ReviewSection>
                )}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                {isTrial
                  ? '✅ Paket Trial akan langsung aktif setelah mendaftar. Anda bisa langsung login.'
                  : '⏳ Setelah mendaftar, kami akan memverifikasi pembayaran Anda. RS akan aktif setelah verifikasi selesai.'}
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {resultStatus === 'active'
                    ? 'RS Anda Sudah Aktif!'
                    : resultStatus === 'payment_pending'
                      ? 'Pendaftaran Diterima!'
                      : 'Pendaftaran Terkirim!'}
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  {resultStatus === 'active'
                    ? `RS Anda sudah aktif di ${form.requested_slug}.${regConfig?.primary_domain || 'simrs.id'}. Silakan login menggunakan email dan password yang sudah didaftarkan.`
                    : resultStatus === 'payment_pending'
                      ? 'Silakan lakukan pembayaran untuk mengaktifkan RS Anda. Instruksi pembayaran juga sudah dikirim ke email Anda.'
                      : 'Pendaftaran Anda sedang ditinjau oleh tim kami. Kami akan menghubungi Anda melalui email.'}
                </p>
              </div>

              {resultStatus === 'active' && (
                <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-lg text-left space-y-2">
                  <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">Informasi Login</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <span className="text-teal-600 dark:text-teal-400">Kode RS:</span>
                    <span className="font-mono font-medium text-teal-900 dark:text-teal-200">{form.requested_slug}</span>
                    <span className="text-teal-600 dark:text-teal-400">Email:</span>
                    <span className="font-medium text-teal-900 dark:text-teal-200">{form.admin_email}</span>
                    <span className="text-teal-600 dark:text-teal-400">Password:</span>
                    <span className="text-teal-900 dark:text-teal-200">Password yang Anda daftarkan</span>
                  </div>
                </div>
              )}

              {resultId && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">ID Registrasi (simpan untuk referensi):</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-xs font-mono bg-white dark:bg-slate-700 px-2 py-1 rounded">
                      {resultId}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(resultId)
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                {resultStatus === 'active' && (
                  <Link
                    href={`/login?rs=${form.requested_slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Login Sekarang <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                {resultStatus === 'payment_pending' && resultId && (
                  <Link
                    href={`/daftar/pembayaran/${resultId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Lihat Instruksi Bayar
                  </Link>
                )}
                {resultId && (
                  <Link
                    href={`/daftar/status?id=${resultId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cek Status
                  </Link>
                )}
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Kembali ke Beranda
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {step !== 'success' && (
          <div className="flex items-center justify-between mt-6">
            {stepIndex > 0 ? (
              <button
                onClick={goPrev}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali
              </button>
            ) : (
              <Link
                href="/"
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Beranda
              </Link>
            )}

            {step === 'review' ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-medium rounded-lg transition-colors"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</>
                ) : (
                  <><CheckCircle className="h-4 w-4" /> Kirim Pendaftaran</>
                )}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
              >
                Lanjut <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white text-right">{value}</span>
    </div>
  )
}
