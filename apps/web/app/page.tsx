'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { getPublicPlans, getRegistrationConfig, type PublicPlan } from '@/lib/api/registration'
import {
  Activity,
  Shield,
  Wifi,
  Building2,
  Users,
  FileText,
  Pill,
  Wallet,
  FlaskConical,
  ScanLine,
  BarChart3,
  Cloud,
  ArrowRight,
  CheckCircle,
  Heart,
  Zap,
  Globe,
  Lock,
  Smartphone,
  Stethoscope,
  ClipboardList,
  Database,
  Server,
  Scissors,
  Utensils,
  Calculator,
  Menu,
  X,
} from 'lucide-react'

const FEATURES = [
  { icon: Users, title: 'Manajemen Pasien', desc: 'Registrasi, riwayat medis, deteksi duplikasi NIK, merge pasien, soft delete' },
  { icon: ClipboardList, title: 'Pendaftaran & Antrian', desc: 'Rawat jalan, IGD, rawat inap, kiosk mandiri 8-step, display antrian TV, call bell' },
  { icon: FileText, title: 'Rekam Medis Elektronik', desc: 'SOAP, ICD-10/9-CM, CPPT multi-profesi, pengkajian keperawatan auto-scoring, resume PDF' },
  { icon: Pill, title: 'Farmasi & CDSS', desc: 'FIFO dispensing, alert expired, 65 interaksi obat, high-alert, LASA, PO & stock opname' },
  { icon: Wallet, title: 'Kasir & Billing', desc: 'Multi-penjamin, asuransi, laporan harian, receipt print, jurnal akuntansi otomatis' },
  { icon: FlaskConical, title: 'Laboratorium', desc: '46 parameter, 7 kategori, LOINC mapping, full workflow order → hasil → cetak' },
  { icon: ScanLine, title: 'Radiologi', desc: '34 jenis pemeriksaan, 6 modalitas (X-Ray/USG/CT/MRI/Mammo/Pano)' },
  { icon: Cloud, title: 'SATUSEHAT & BPJS', desc: '13 FHIR R4 resources, VClaim, PCare, e-Klaim, Aplicare, Antrol Mobile JKN' },
  { icon: Scissors, title: 'Bedah & Operasi', desc: 'Jadwal OK, tim bedah 8 peran, anestesi, instrumen steril, perioperatif 3 fase' },
  { icon: Utensils, title: 'Gizi & Nutrisi', desc: 'Kalkulator Harris-Benedict, meal plan, 24 bahan makanan, ADIME, food cost & waste' },
  { icon: Calculator, title: 'Akuntansi & Keuangan', desc: 'Jurnal umum, buku besar, neraca saldo, neraca, laba rugi, arus kas — 55 COA standar RS' },
  { icon: Stethoscope, title: 'HRIS & Kepegawaian', desc: 'Data pegawai, jadwal dinas kalender, absensi, cuti 12 hari/thn, payroll PPH21 progresif' },
  { icon: Shield, title: 'Security & TTE', desc: 'MFA TOTP, TTE 4 provider (BSrE/VIDA/Privy), audit trail, AES-256-GCM, rate limiting' },
  { icon: BarChart3, title: 'Dashboard & Laporan', desc: '7 jenis laporan, export Excel multi-sheet, PDF A4, CSV — recharts real-time' },
  { icon: Wifi, title: 'Offline-First & PWA', desc: 'IndexedDB 7 tabel, service worker, push notification, installable dari browser' },
  { icon: Building2, title: 'Multi-Tenant', desc: 'Schema-per-tenant, self-registration, auto-provisioning, onboarding wizard, portal pasien' },
  { icon: Smartphone, title: 'Portal Pasien', desc: 'Login NIK+tanggal lahir, lihat riwayat kunjungan, tagihan, rekam medis — UU PDP compliant' },
  { icon: Database, title: 'Migrasi Khanza', desc: 'Wizard 4-step migrasi dari Khanza MySQL → PostgreSQL, 20 mapper, verifikasi otomatis' },
  { icon: Heart, title: 'Rawat Inap & Discharge', desc: 'Admisi, bed management, transfer, BOR/LOS, discharge 5 tipe, general consent, edukasi pasien' },
  { icon: Lock, title: 'Gudang & Inventaris', desc: 'Gudang umum 7 kategori, stock opname, mutasi barang, purchase order 5-status lifecycle' },
]

function formatNum(n: number): string {
  if (n < 0 || n >= 999) return 'Unlimited'
  return n.toLocaleString('id-ID')
}

function formatStorage(gb: number): string {
  if (gb >= 1000) return `${gb / 1000} TB storage`
  return `${gb} GB storage`
}

function planToDisplay(plan: PublicPlan) {
  const isTrial = plan.price_monthly === 0
  const priceM = plan.price_monthly / 1_000_000
  const features = [
    `${formatNum(plan.max_users)} user`,
    `${formatNum(plan.max_patients)} pasien`,
    `${formatNum(plan.max_doctors)} dokter`,
    formatStorage(plan.max_storage_gb),
    plan.allowed_modules.includes('*') ? 'Semua modul' : 'Modul dasar',
  ]
  if (isTrial) features.push('Tanpa kartu kredit')

  return {
    name: plan.name,
    code: plan.code,
    price: isTrial ? 'Gratis' : priceM % 1 === 0 ? String(priceM) : priceM.toFixed(1).replace('.', ','),
    unit: isTrial ? undefined : 'juta',
    period: isTrial ? `${plan.trial_days} hari` : '/bulan',
    desc: plan.description || plan.name,
    features,
    cta: isTrial ? 'Coba Gratis' : `Pilih ${plan.name}`,
    highlight: plan.sort_order === 2,
  }
}

const STEPS_HOW = [
  { num: '01', title: 'Daftar & Pilih Paket', desc: 'Isi form pendaftaran, pilih paket Trial gratis atau berbayar. Akun Trial langsung aktif.' },
  { num: '02', title: 'Setup Awal', desc: 'Login ke dashboard, atur profil RS, tambahkan dokter, poli, dan tarif layanan.' },
  { num: '03', title: 'Migrasi Data', desc: 'Punya data di Khanza? Gunakan wizard migrasi otomatis. Atau import via CSV.' },
  { num: '04', title: 'Mulai Operasional', desc: 'Daftarkan pasien, buat kunjungan, tulis rekam medis, dispense obat, terima pembayaran.' },
]

const STATS = [
  { value: '50+', label: 'Modul Terintegrasi' },
  { value: '400+', label: 'API Endpoints' },
  { value: '90+', label: 'Halaman UI' },
  { value: '13', label: 'FHIR Resources' },
]

function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  return <span>{target}{suffix}</span>
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [apiPlans, setApiPlans] = useState<PublicPlan[]>([])
  const [brandName, setBrandName] = useState('SIMRS')
  const [contactEmail, setContactEmail] = useState('admin@simrs.id')
  const [contactPhone, setContactPhone] = useState('')

  useEffect(() => {
    getPublicPlans()
      .then(setApiPlans)
      .catch(() => {})
    getRegistrationConfig()
      .then((cfg) => {
        if (cfg.platform_name) setBrandName(cfg.platform_name)
        if (cfg.contact_email) setContactEmail(cfg.contact_email)
        if (cfg.contact_phone) setContactPhone(cfg.contact_phone)
      })
      .catch(() => {})
  }, [])

  const displayPlans = useMemo(() => apiPlans.map(planToDisplay), [apiPlans])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">{brandName}</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#fitur" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Fitur</a>
            <a href="#cara-kerja" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Cara Kerja</a>
            <a href="#harga" className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Harga</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Login
            </Link>
            <Link href="/daftar" className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40 transition-all">
              Daftar RS Baru
            </Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-500">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-3">
            <a href="#fitur" onClick={() => setMobileMenuOpen(false)} className="block text-sm py-2 text-slate-600">Fitur</a>
            <a href="#cara-kerja" onClick={() => setMobileMenuOpen(false)} className="block text-sm py-2 text-slate-600">Cara Kerja</a>
            <a href="#harga" onClick={() => setMobileMenuOpen(false)} className="block text-sm py-2 text-slate-600">Harga</a>
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1 text-center py-2.5 border border-slate-200 rounded-lg text-sm font-medium">Login</Link>
              <Link href="/daftar" className="flex-1 text-center py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold">Daftar</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-teal-100/40 dark:bg-teal-900/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded-full text-xs font-semibold mb-8">
            <Zap className="h-3.5 w-3.5" />
            Penerus alami bagi 500+ RS pengguna Khanza
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold leading-[1.1] tracking-tight">
            Kelola Rumah Sakit
            <br />
            <span className="bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
              Lebih Modern
            </span>
            {' '}dan{' '}
            <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
              Efisien
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Platform terintegrasi dengan 50+ modul — dari pendaftaran, rekam medis, farmasi,
            hingga akuntansi & kepegawaian. Offline-first, SATUSEHAT 13 FHIR resources, BPJS 5 layanan.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/daftar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-600/25 hover:shadow-teal-600/40 transition-all text-base"
            >
              Coba Gratis 30 Hari <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all text-base"
            >
              Login Dashboard
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Enkripsi End-to-End</span>
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Server di Indonesia</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> UU PDP Compliant</span>
            <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5" /> 99.9% Uptime</span>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="py-10 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-extrabold text-teal-600">
                  <AnimatedCounter target={s.value} />
                </p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="fitur" className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-widest mb-2">Fitur Lengkap</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              Semua yang RS Butuhkan
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto">
              50+ modul terintegrasi — pendaftaran, rekam medis, farmasi, laboratorium, radiologi, akuntansi, dan kepegawaian
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="group p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 bg-white dark:bg-slate-900/50 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 flex items-center justify-center mb-4 transition-colors">
                    <Icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              + Terminologi LOINC & KFA, Logbook Dokter, Import CSV, Backup & Recovery, Dark Mode, dan banyak lagi
            </p>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="cara-kerja" className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-widest mb-2">Cara Kerja</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              4 Langkah Menuju RS Digital
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {STEPS_HOW.map((s) => (
              <div key={s.num} className="flex gap-4 p-6 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-600/20">
                  <span className="text-white font-extrabold text-sm">{s.num}</span>
                </div>
                <div>
                  <h3 className="font-bold mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="harga" className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-teal-600 uppercase tracking-widest mb-2">Harga</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              Transparan, Tanpa Biaya Tersembunyi
            </h2>
            <p className="mt-4 text-slate-500">
              Diskon 2 bulan untuk pembayaran tahunan
            </p>
          </div>

          {displayPlans.length === 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 animate-pulse">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3" />
                  <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-28 mb-5" />
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid sm:grid-cols-2 ${displayPlans.length >= 4 ? 'lg:grid-cols-4' : displayPlans.length === 3 ? 'lg:grid-cols-3' : ''} gap-5`}>
              {displayPlans.map((plan) => (
                <div
                  key={plan.code}
                  className={`rounded-2xl p-6 flex flex-col relative transition-all duration-200 ${
                    plan.highlight
                      ? 'border-2 border-teal-500 bg-white dark:bg-slate-900 shadow-xl shadow-teal-500/10 scale-[1.02]'
                      : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-lg">
                      Paling Populer
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.desc}</p>
                  </div>

                  <div className="mb-5">
                    {plan.unit ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-slate-400">Rp</span>
                        <span className="text-4xl font-extrabold">{plan.price}</span>
                        <span className="text-sm text-slate-400">{plan.unit}{plan.period}</span>
                      </div>
                    ) : (
                      <span className="text-4xl font-extrabold text-teal-600">{plan.price}</span>
                    )}
                    {!plan.unit && <span className="text-sm text-slate-400 ml-1">{plan.period}</span>}
                  </div>

                  <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle className="h-4 w-4 text-teal-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/daftar?plan=${plan.code}`}
                    className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                      plan.highlight
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/25'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ INTEGRATIONS ═══ */}
      <section className="py-16 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900/40 border-y border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Terintegrasi Dengan</p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {[
              { name: 'SATUSEHAT', sub: '13 FHIR R4 Resources' },
              { name: 'BPJS Kesehatan', sub: 'VClaim, PCare, e-Klaim, Aplicare, Antrol' },
              { name: 'ICD-10 & ICD-9-CM', sub: 'Diagnosis & Prosedur' },
              { name: 'LOINC', sub: '90+ Kode Lab' },
              { name: 'KFA', sub: '101 Kode Farmasi' },
              { name: 'BSrE / VIDA / Privy', sub: 'TTE Tersertifikasi' },
            ].map((i) => (
              <div key={i.name} className="text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{i.name}</p>
                <p className="text-[10px] text-slate-400">{i.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 px-8 sm:px-14 py-14 text-center text-white overflow-hidden">
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold">
                Siap Modernisasi RS Anda?
              </h2>
              <p className="mt-4 text-teal-100 text-lg max-w-lg mx-auto leading-relaxed">
                Mulai dengan trial gratis 30 hari. Tanpa kartu kredit.
                50+ modul siap pakai, migrasi dari Khanza otomatis.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/daftar"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-all shadow-lg text-base"
                >
                  Daftar Sekarang <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={`mailto:${contactEmail}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-all text-base"
                >
                  Hubungi Sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-4 sm:px-6 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-10">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-extrabold">{brandName}</span>
              </div>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Platform SIMRS modern berbasis cloud dengan 50+ modul terintegrasi.
                Offline-first, multi-tenant, SATUSEHAT & BPJS ready.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Produk</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#fitur" className="hover:text-slate-900 dark:hover:text-white transition-colors">Fitur</a></li>
                <li><a href="#harga" className="hover:text-slate-900 dark:hover:text-white transition-colors">Harga</a></li>
                <li><Link href="/daftar" className="hover:text-slate-900 dark:hover:text-white transition-colors">Daftar</Link></li>
                <li><Link href="/daftar/status" className="hover:text-slate-900 dark:hover:text-white transition-colors">Cek Status</Link></li>
                <li><Link href="/portal/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Portal Pasien</Link></li>
                <li><Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Kontak</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href={`mailto:${contactEmail}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">{contactEmail}</a></li>
                {contactPhone && (
                  <li><a href={`tel:${contactPhone}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">{contactPhone}</a></li>
                )}
                <li className="text-xs">Jakarta, Indonesia</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} {brandName}. Untuk rumah sakit Indonesia.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Heart className="h-3 w-3 text-red-400" />
              Untuk rumah sakit Indonesia
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
