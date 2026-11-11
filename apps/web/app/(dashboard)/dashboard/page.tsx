'use client'

import { formatRupiah } from '@/lib/utils'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users, Clock, BedDouble, DollarSign, Loader2,
  ClipboardList, Ambulance, FileText, Pill, Wallet,
  FlaskConical, ScanLine, Scissors, Utensils, BarChart3,
  Settings, TrendingUp, CreditCard, Calculator,
  ArrowRight, BookOpen, Warehouse, BookMarked,
  ClipboardCheck, UserCog, Package,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import {
  useOverview,
  useVisitStats,
  useTopDiagnoses,
  useRevenueReport,
} from '@/hooks/use-dashboard'
import { usePermissions } from '@/hooks/use-permissions'
import { TopDiagnosesTable } from '@/components/dashboard/top-diagnoses-table'
import { VisitTrendChart } from '@/components/dashboard/visit-trend-chart'
import { PayerPieChart } from '@/components/dashboard/payer-pie-chart'
import { RevenueBarChart } from '@/components/dashboard/revenue-bar-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'


interface ModuleCardData {
  href: string
  label: string
  description: string
  icon: LucideIcon
  color: string
  bg: string
}

const ALL_MODULE_CARDS: ModuleCardData[] = [
  {
    href: '/pendaftaran',
    label: 'Pendaftaran',
    description: 'Daftar & antrian pasien',
    icon: ClipboardList,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    href: '/igd',
    label: 'IGD',
    description: 'Unit Gawat Darurat',
    icon: Ambulance,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    href: '/rawat-inap',
    label: 'Rawat Inap',
    description: 'Admisi & discharge',
    icon: BedDouble,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-900/30',
  },
  {
    href: '/pasien',
    label: 'Data Pasien',
    description: 'Kelola data pasien',
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  {
    href: '/rekam-medis',
    label: 'Rekam Medis',
    description: 'SOAP & diagnosa',
    icon: FileText,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  {
    href: '/farmasi',
    label: 'Farmasi',
    description: 'Resep & stok obat',
    icon: Pill,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    href: '/bpjs',
    label: 'BPJS',
    description: 'SEP & VClaim',
    icon: CreditCard,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/30',
  },
  {
    href: '/kasir',
    label: 'Kasir',
    description: 'Billing & pembayaran',
    icon: Wallet,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    href: '/laboratorium',
    label: 'Laboratorium',
    description: 'Permintaan & hasil lab',
    icon: FlaskConical,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  {
    href: '/radiologi',
    label: 'Radiologi',
    description: 'Pemeriksaan radiologi',
    icon: ScanLine,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    href: '/bedah',
    label: 'Bedah',
    description: 'Jadwal operasi',
    icon: Scissors,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
  },
  {
    href: '/gizi',
    label: 'Gizi',
    description: 'Konsultasi nutrisi',
    icon: Utensils,
    color: 'text-lime-600 dark:text-lime-400',
    bg: 'bg-lime-100 dark:bg-lime-900/30',
  },
  {
    href: '/gudang',
    label: 'Gudang',
    description: 'Inventaris & stok umum',
    icon: Warehouse,
    color: 'text-stone-600 dark:text-stone-400',
    bg: 'bg-stone-100 dark:bg-stone-900/30',
  },
  {
    href: '/mcu',
    label: 'MCU',
    description: 'Medical Check Up',
    icon: ClipboardCheck,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
  },
  {
    href: '/keuangan',
    label: 'Keuangan',
    description: 'Akuntansi & jurnal',
    icon: Calculator,
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  {
    href: '/kepegawaian',
    label: 'Kepegawaian',
    description: 'SDM & penggajian',
    icon: UserCog,
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
  },
  {
    href: '/admin/aset',
    label: 'Manajemen Aset',
    description: 'Inventaris & penyusutan',
    icon: Package,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
  },
  {
    href: '/laporan',
    label: 'Laporan',
    description: 'Dashboard & analitik',
    icon: BarChart3,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800/30',
  },
  {
    href: '/admin',
    label: 'Pengaturan',
    description: 'Konfigurasi sistem',
    icon: Settings,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/30',
  },
  {
    href: '/profil/logbook',
    label: 'Logbook',
    description: 'Catatan tindakan dokter',
    icon: BookMarked,
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
  },
  {
    href: '/panduan',
    label: 'Panduan',
    description: 'Dokumentasi & bantuan',
    icon: BookOpen,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-900/30',
  },
]

function ModuleCard({ href, label, description, icon: Icon, color, bg }: ModuleCardData) {
  return (
    <Link href={href} className="group">
      <div className="bg-card rounded-xl p-5 border border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-200 hover:-translate-y-0.5 h-full">
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center mb-3', bg)}>
          <Icon className={cn('h-6 w-6', color)} />
        </div>
        <h3 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">
          {label}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </Link>
  )
}

function QuickStat({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: string
  icon: LucideIcon
  color: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', color)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tracking-tight">{value}</p>
      </div>
    </div>
  )
}

function TenantDashboard() {
  const { user } = useAuthStore()
  const { menuItems } = usePermissions()

  const { data: overviewRes, isLoading: overviewLoading } = useOverview()
  const overview = overviewRes?.data

  const { data: visitStatsRes, isLoading: visitLoading } = useVisitStats()
  const visitStats = visitStatsRes?.data

  const { data: diagnosesRes, isLoading: diagLoading } = useTopDiagnoses()
  const diagnoses = diagnosesRes?.data ?? []

  const { data: revenueRes, isLoading: revLoading } = useRevenueReport()
  const revenue = revenueRes?.data

  const loading = overviewLoading

  const accessibleHrefs = new Set(
    menuItems.flatMap((item) => [item.href, ...(item.children?.map((c) => c.href) ?? [])]),
  )

  const visibleCards = ALL_MODULE_CARDS.filter((card) => accessibleHrefs.has(card.href))


  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Selamat Datang, {user?.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'h-2.5 w-2.5 rounded-full',
              loading ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500',
            )} />
            <span className="text-xs text-muted-foreground">
              {loading ? 'Memuat data...' : 'Sistem aktif'}
            </span>
          </div>
        </div>
      </div>

      {/* Module navigation cards — 20 total */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 lg:gap-4">
        {visibleCards.map((card) => (
          <ModuleCard key={card.href} {...card} />
        ))}
      </div>

      {/* Stats section */}
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Statistik Hari Ini
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickStat
            label="Kunjungan"
            value={loading ? '—' : (overview?.visits.total ?? 0).toLocaleString('id-ID')}
            icon={Users}
            color="bg-teal-600"
            loading={loading}
          />
          <QuickStat
            label="Antrian Aktif"
            value={
              loading
                ? '—'
                : String((overview?.queues.menunggu ?? 0) + (overview?.queues.dilayani ?? 0))
            }
            icon={Clock}
            color="bg-amber-500"
            loading={loading}
          />
          <QuickStat
            label="Okupansi Kamar"
            value={loading ? '—' : `${overview?.bedOccupancy.rate ?? 0}%`}
            icon={BedDouble}
            color="bg-purple-500"
            loading={loading}
          />
          <QuickStat
            label="Pendapatan"
            value={loading ? '—' : formatRupiah(overview?.revenue.total ?? 0)}
            icon={DollarSign}
            color="bg-emerald-500"
            loading={loading}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <VisitTrendChart data={visitStats?.byDate ?? []} loading={visitLoading} />
        <PayerPieChart data={visitStats?.byPenjamin ?? []} loading={visitLoading} />
      </div>

      {/* Tables */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <TopDiagnosesTable data={diagnoses} loading={diagLoading} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Kunjungan per Poli
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (visitStats?.byRoom ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada data</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {(visitStats?.byRoom ?? []).map((r, idx) => (
                  <div
                    key={r.room}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 min-w-0 truncate font-medium">{r.room}</span>
                    <span className="font-bold tabular-nums shrink-0">
                      {r.count.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <RevenueBarChart
        data={revenue?.byDate ?? []}
        loading={revLoading}
        title="Pendapatan 7 Hari Terakhir"
      />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user?.role === 'superadmin') {
      router.replace('/sa')
    }
  }, [user, router])

  if (user?.role === 'superadmin') {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <p className="text-sm text-muted-foreground">Mengalihkan ke Super Admin Panel...</p>
      </div>
    )
  }

  return <TenantDashboard />
}
