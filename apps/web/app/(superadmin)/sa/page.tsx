'use client'

import { usePlatformDomain } from '@/hooks/use-platform-domain'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Building2,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  Users,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import {
  usePlatformStats,
  useTenantsList,
  useExpiringTenants,
  useMonitoringData,
} from '@/hooks/use-tenants-admin'
import { useRegistrationStats, useRegistrations } from '@/hooks/use-registration'

function formatRupiah(amount: number | string): string {
  const num = Math.round(Number(amount) || 0)
  return `Rp ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Menunggu', variant: 'secondary' },
    payment_pending: { label: 'Menunggu Bayar', variant: 'outline' },
    under_review: { label: 'Dalam Review', variant: 'default' },
    approved: { label: 'Disetujui', variant: 'default' },
    provisioning: { label: 'Provisioning', variant: 'default' },
    active: { label: 'Aktif', variant: 'default' },
    rejected: { label: 'Ditolak', variant: 'destructive' },
  }
  const c = config[status] || { label: status, variant: 'secondary' as const }
  return <Badge variant={c.variant}>{c.label}</Badge>
}

export default function SADashboardPage() {
  const domain = usePlatformDomain()
  const { data: platformStats, isLoading: statsLoading } = usePlatformStats()
  const { data: regStats } = useRegistrationStats()
  const { data: recentRegs } = useRegistrations({ limit: 5 })
  const { data: expiringTenants } = useExpiringTenants()
  const { data: allTenants } = useTenantsList()
  const { data: monitoring } = useMonitoringData()

  const pendingCount = (regStats?.pending || 0) + (regStats?.paymentPending || 0) + (regStats?.underReview || 0)
  const activeTenants = allTenants?.filter((t) => t.is_active).length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard Platform
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview platform SIMRS — kelola semua tenant dari sini
        </p>
      </div>

      {/* Alert: Pending Registrations */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {pendingCount} pendaftaran RS menunggu tindakan
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {regStats?.pending || 0} pending, {regStats?.paymentPending || 0} menunggu bayar, {regStats?.underReview || 0} dalam review
            </p>
          </div>
          <Link href="/sa/registrations">
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
              Lihat <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '...' : activeTenants}</p>
                <p className="text-xs text-muted-foreground">RS Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : formatRupiah(platformStats?.mrr || 0)}
                </p>
                <p className="text-xs text-muted-foreground">MRR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <ClipboardCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendaftaran Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/40">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringTenants?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Akan Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Tenant Growth + Revenue Trend */}
      {monitoring && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pertumbuhan Tenant (6 Bulan)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monitoring.tenantGrowth.map((g) => {
                  const max = Math.max(...monitoring.tenantGrowth.map((x) => x.count), 1)
                  return (
                    <div key={g.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 text-right">{g.month}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max((g.count / max) * 100, 10)}%` }}
                        >
                          <span className="text-[10px] text-white font-medium">{g.count}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Revenue Trend (6 Bulan)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monitoring.revenueTrend.map((r) => {
                  const max = Math.max(...monitoring.revenueTrend.map((x) => x.amount), 1)
                  return (
                    <div key={r.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 text-right">{r.month}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max((r.amount / max) * 100, 10)}%` }}
                        >
                          <span className="text-[10px] text-white font-medium">
                            {formatRupiah(r.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two-column: Recent Registrations + Expiring Tenants */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pendaftaran Terbaru</CardTitle>
              <Link href="/sa/registrations">
                <Button variant="ghost" size="sm" className="text-xs">
                  Lihat Semua <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!recentRegs?.data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada pendaftaran
              </p>
            ) : (
              <div className="space-y-3">
                {recentRegs.data.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{reg.nama_rs}</p>
                      <p className="text-xs text-muted-foreground">
                        {reg.requested_slug}.{domain} — {reg.admin_email}
                      </p>
                    </div>
                    <StatusBadge status={reg.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Tenants */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tenant Mendekati Expired</CardTitle>
              <Link href="/sa/tenants">
                <Button variant="ghost" size="sm" className="text-xs">
                  Kelola <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!expiringTenants?.length ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Semua tenant aman — tidak ada yang akan expired
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiringTenants.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-red-600">
                        Expired: {new Date(t.subscription_expires_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-[10px]">
                      {Math.ceil(
                        (new Date(t.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                      )} hari
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats: Plan Distribution */}
      {platformStats?.planDistribution && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribusi Paket</CardTitle>
            <CardDescription>Jumlah tenant per paket langganan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(platformStats.planDistribution as { plan: string; count: number }[]).map(
                (item) => (
                  <div
                    key={item.plan}
                    className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <p className="text-2xl font-bold text-indigo-600">{item.count}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{item.plan}</p>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
