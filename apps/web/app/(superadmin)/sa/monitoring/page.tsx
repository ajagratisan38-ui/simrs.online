'use client'

import { usePlatformDomain } from '@/hooks/use-platform-domain'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Monitor,
  Database,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Loader2,
  TrendingUp,
  Building2,
} from 'lucide-react'
import { useMonitoringData } from '@/hooks/use-tenants-admin'

function formatDate(d: string | null): string {
  if (!d) return 'Belum pernah'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatRupiah(n: number): string {
  return `Rp ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export default function MonitoringPage() {
  const domain = usePlatformDomain()
  const { data, isLoading } = useMonitoringData()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!data) return null

  const abandonedTenants = data.tenantHealth.filter((t) => t.abandoned)
  const activeTenants = data.tenantHealth.filter((t) => t.is_active)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Monitoring
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Health monitoring platform, per-tenant status, dan system metrics
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{data.system.db_size}</p>
                <p className="text-xs text-muted-foreground">Database Size</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Wifi className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{data.system.db_connections}</p>
                <p className="text-xs text-muted-foreground">DB Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <HardDrive className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{data.system.backup_count}</p>
                <p className="text-xs text-muted-foreground">Total Backups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{data.abandonedCount}</p>
                <p className="text-xs text-muted-foreground">Abandoned (30d+)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Tenant Growth + Revenue Trend */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Pertumbuhan Tenant (6 Bulan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.tenantGrowth.map((g) => {
                const max = Math.max(...data.tenantGrowth.map((x) => x.count), 1)
                return (
                  <div key={g.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 text-right">{g.month}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((g.count / max) * 100, 8)}%` }}
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
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Revenue Trend (6 Bulan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.revenueTrend.map((r) => {
                const max = Math.max(...data.revenueTrend.map((x) => x.amount), 1)
                const pct = (r.amount / max) * 100
                const isSmall = pct < 25
                return (
                  <div key={r.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">{r.month}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-6 relative">
                        <div
                          className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(pct, r.amount > 0 ? 8 : 0)}%` }}
                        >
                          {!isSmall && (
                            <span className="text-[10px] text-white font-medium whitespace-nowrap">
                              {formatRupiah(r.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSmall && (
                        <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap shrink-0">
                          {formatRupiah(r.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Tenant Health */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Per-Tenant Health</CardTitle>
              <CardDescription>
                {activeTenants.length} tenant aktif — {abandonedTenants.length} abandoned (30+ hari tidak login)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground" style={{ width: '28%' }}>RS</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground" style={{ width: '10%' }}>Status</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-center" style={{ width: '8%' }}>Users</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground text-center" style={{ width: '8%' }}>Pasien</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground" style={{ width: '22%' }}>Login Terakhir</th>
                  <th className="pb-2 font-medium text-muted-foreground" style={{ width: '12%' }}>Health</th>
                </tr>
              </thead>
              <tbody>
                {data.tenantHealth.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.slug}.{domain}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={t.is_active ? 'default' : 'secondary'}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-center tabular-nums">{t.user_count}</td>
                    <td className="py-2.5 pr-4 text-center tabular-nums">{t.patient_count}</td>
                    <td className="py-2.5 pr-4">
                      <p className="text-xs whitespace-nowrap">{formatDate(t.last_login)}</p>
                      {t.days_since_login !== null && (
                        <p className={`text-[10px] whitespace-nowrap ${t.days_since_login > 30 ? 'text-red-500' : t.days_since_login > 7 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {t.days_since_login === 0 ? 'Hari ini' : `${t.days_since_login} hari lalu`}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5">
                      {t.abandoned ? (
                        <div className="flex items-center gap-1.5 text-red-500 whitespace-nowrap">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">Abandoned</span>
                        </div>
                      ) : t.days_since_login !== null && t.days_since_login > 7 ? (
                        <div className="flex items-center gap-1.5 text-amber-500 whitespace-nowrap">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">Idle</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-500 whitespace-nowrap">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">Healthy</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Backup Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-purple-600" />
            Backup Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Backup Terakhir</p>
              <p className="text-sm font-medium mt-1">
                {data.system.last_backup ? formatDate(data.system.last_backup) : 'Belum ada backup'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Backup</p>
              <p className="text-sm font-medium mt-1">{data.system.backup_count} backup</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
