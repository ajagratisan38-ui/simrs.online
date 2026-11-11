'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePlatformDomain } from '@/hooks/use-platform-domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Building2,
  Users,
  Stethoscope,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  Activity,
  FileText,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Mail,
  Phone,
  Package,
  CalendarClock,
  LogIn,
  Globe,
} from 'lucide-react'
import { useTenantDetail, useToggleTenant } from '@/hooks/use-tenants-admin'

function formatRupiah(n: number): string {
  return `Rp ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ isActive, expiresAt }: { isActive: boolean; expiresAt: string | null }) {
  if (!isActive) return <Badge variant="destructive">Suspended</Badge>
  if (!expiresAt) return <Badge variant="default">Aktif</Badge>
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return <Badge variant="destructive">Expired</Badge>
  if (days <= 14) return <Badge className="bg-amber-500 text-white">{days} hari lagi</Badge>
  return <Badge variant="default">Aktif</Badge>
}

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const domain = usePlatformDomain()
  const tenantId = params.id as string
  const { data: tenant, isLoading } = useTenantDetail(tenantId)
  const toggleMutation = useToggleTenant()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Tenant tidak ditemukan</p>
        <Link href="/sa/tenants">
          <Button variant="link" className="mt-2">← Kembali</Button>
        </Link>
      </div>
    )
  }

  const daysRemaining = tenant.subscription_expires_at
    ? Math.ceil((new Date(tenant.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const statItems = [
    { label: 'Users', value: tenant.stats.totalUsers, icon: Users, max: tenant.plan?.max_users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' },
    { label: 'Pasien', value: tenant.stats.totalPatients, icon: FileText, max: tenant.plan?.max_patients, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
    { label: 'Dokter', value: tenant.stats.totalDoctors, icon: Stethoscope, max: tenant.plan?.max_doctors, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
    { label: 'Kunjungan', value: tenant.stats.totalVisits, icon: Calendar, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
    { label: 'Tagihan', value: tenant.stats.totalBills, icon: CreditCard, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950' },
  ]

  const usageBars = tenant.plan ? [
    { label: 'Users', used: tenant.stats.totalUsers, max: tenant.plan.max_users },
    { label: 'Pasien', used: tenant.stats.totalPatients, max: tenant.plan.max_patients },
    { label: 'Dokter', used: tenant.stats.totalDoctors, max: tenant.plan.max_doctors },
  ] : []

  return (
    <div className="space-y-4">
      {/* Header — compact */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {tenant.name}
            </h1>
            <StatusBadge isActive={tenant.is_active} expiresAt={tenant.subscription_expires_at} />
            {tenant.onboarding_completed && (
              <span className="text-emerald-500 text-xs">✓ Onboarded</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{tenant.slug}.{domain}</p>
        </div>
        <Button
          size="sm"
          variant={tenant.is_active ? 'outline' : 'default'}
          onClick={() => toggleMutation.mutate({ id: tenant.id, isActive: !tenant.is_active })}
          disabled={toggleMutation.isPending}
        >
          {tenant.is_active ? (
            <><ToggleRight className="h-4 w-4 mr-1 text-emerald-500" /> Aktif</>
          ) : (
            <><ToggleLeft className="h-4 w-4 mr-1" /> Nonaktif</>
          )}
        </Button>
      </div>

      {/* Stat Cards — full width row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {statItems.map((s) => {
          const pct = s.max ? Math.min((s.value / Math.max(s.max, 1)) * 100, 100) : 0
          const isWarning = s.max ? pct >= 90 : false
          return (
            <Card key={s.label} className="overflow-hidden">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`shrink-0 w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight">{s.value.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {s.label}
                    {s.max != null && (
                      <span className={isWarning ? ' text-red-500 font-medium' : ''}>
                        {' '}/ {s.max}
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main content — two columns */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left: Info RS — compact 2-col grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" /> Info RS
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2.5">
              <InfoRow icon={Globe} label="Slug" value={`${tenant.slug}.${domain}`} />
              <InfoRow icon={MapPin} label="Alamat" value={tenant.address || '-'} />
              <InfoRow icon={Mail} label="Email" value={tenant.email || '-'} />
              <InfoRow icon={Phone} label="Telepon" value={tenant.phone || '-'} />

              <div className="border-t pt-2.5 mt-2.5" />

              <InfoRow icon={Package} label="Paket" value={tenant.plan?.name || tenant.subscription_plan || '-'} />
              <InfoRow
                icon={CalendarClock}
                label="Langganan"
                value={
                  `${formatDateShort(tenant.subscription_started_at)} → ${formatDateShort(tenant.subscription_expires_at)}`
                }
              />
              {daysRemaining != null && (
                <div className="flex items-center gap-2 text-xs pl-6">
                  <span className={
                    daysRemaining <= 7 ? 'text-red-500 font-medium' :
                    daysRemaining <= 30 ? 'text-amber-500 font-medium' :
                    'text-emerald-500'
                  }>
                    {daysRemaining > 0 ? `${daysRemaining} hari tersisa` : 'Expired'}
                  </span>
                </div>
              )}
              <InfoRow icon={LogIn} label="Login Terakhir" value={formatDate(tenant.last_login_at)} />
              <InfoRow icon={Calendar} label="Terdaftar" value={formatDate(tenant.created_at)} />
            </div>
          </CardContent>
        </Card>

        {/* Right: Usage + Subscription History */}
        <div className="lg:col-span-3 space-y-4">
          {/* Usage Bars */}
          {usageBars.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Penggunaan vs Limit</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  {usageBars.map((u) => {
                    const pct = Math.min((u.used / Math.max(u.max, 1)) * 100, 100)
                    return (
                      <div key={u.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{u.label}</span>
                          <span className={pct >= 90 ? 'text-red-500 font-medium' : 'font-medium'}>
                            {u.used} / {u.max}
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                          {pct.toFixed(0)}%
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription History */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" /> Riwayat Langganan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {tenant.subscriptionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Belum ada riwayat</p>
              ) : (
                <div className="space-y-1">
                  {tenant.subscriptionHistory.map((tx: Record<string, unknown>, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {String(tx.plan_name || tx.type || '-')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {String(tx.type || '')} · {String(tx.payment_method || '-')} · {formatDateShort(String(tx.created_at || ''))}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold">{formatRupiah(Number(tx.amount || 0))}</p>
                        <Badge
                          variant={tx.status === 'paid' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {String(tx.status || '-')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User List — compact table */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            User ({tenant.users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {tenant.users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">Belum ada user</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 px-1 font-medium text-xs text-muted-foreground">Nama</th>
                    <th className="pb-2 px-1 font-medium text-xs text-muted-foreground">Email</th>
                    <th className="pb-2 px-1 font-medium text-xs text-muted-foreground">Role</th>
                    <th className="pb-2 px-1 font-medium text-xs text-muted-foreground w-10">Aktif</th>
                    <th className="pb-2 px-1 font-medium text-xs text-muted-foreground">Login Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {tenant.users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-1.5 px-1 font-medium">{u.name}</td>
                      <td className="py-1.5 px-1 text-muted-foreground text-xs">{u.email}</td>
                      <td className="py-1.5 px-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{u.role}</Badge>
                      </td>
                      <td className="py-1.5 px-1 text-center">
                        {u.is_active ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 inline" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400 inline" />
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-xs text-muted-foreground">
                        {formatDate(u.last_login_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm leading-tight break-words">{value}</p>
      </div>
    </div>
  )
}
