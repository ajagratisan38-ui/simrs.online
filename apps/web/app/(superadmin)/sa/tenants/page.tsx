'use client'

import { formatRupiah } from '@/lib/utils'
import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { usePlatformDomain } from '@/hooks/use-platform-domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building2,
  Search,
  Users,
  Stethoscope,
  UserCheck,
  Power,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  Package,
} from 'lucide-react'
import {
  useTenantsList,
  useToggleTenant,
  useDeleteTenant,
  useTenantSubscription,
} from '@/hooks/use-tenants-admin'
import { toast } from 'sonner'
import type { TenantListItem } from '@/lib/api/super-admin'


function TenantCard({ tenant, isOwner, domain }: { tenant: TenantListItem; isOwner: boolean; domain: string }) {
  const [expanded, setExpanded] = useState(false)
  const toggleMut = useToggleTenant()
  const deleteMut = useDeleteTenant()
  const { data: subscription } = useTenantSubscription(expanded ? tenant.id : '')

  const isExpiring = tenant.subscription_expires_at &&
    new Date(tenant.subscription_expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000

  const daysLeft = tenant.subscription_expires_at
    ? Math.ceil((new Date(tenant.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card className={!tenant.is_active ? 'opacity-60' : undefined}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold">{tenant.name}</h3>
              <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                {tenant.is_active ? 'Aktif' : 'Nonaktif'}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {tenant.subscription_plan}
              </Badge>
              {isExpiring && daysLeft !== null && daysLeft > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {daysLeft} hari lagi
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tenant.slug}.{domain}
              {tenant.email ? ` — ${tenant.email}` : ''}
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {tenant.stats?.totalUsers || 0} user
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCheck className="h-3 w-3" />
            {tenant.stats?.totalPatients || 0} pasien
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Stethoscope className="h-3 w-3" />
            {tenant.stats?.totalDoctors || 0} dokter
          </div>
          {tenant.admin && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Admin: {tenant.admin.email}
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Detail info */}
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alamat</span>
                  <span>{tenant.address || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telepon</span>
                  <span>{tenant.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dibuat</span>
                  <span>{new Date(tenant.created_at).toLocaleDateString('id-ID')}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="capitalize font-medium">{tenant.subscription_plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mulai</span>
                  <span>
                    {tenant.subscription_started_at
                      ? new Date(tenant.subscription_started_at).toLocaleDateString('id-ID')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expired</span>
                  <span className={isExpiring ? 'text-red-600 font-medium' : ''}>
                    {tenant.subscription_expires_at
                      ? new Date(tenant.subscription_expires_at).toLocaleDateString('id-ID')
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Subscription usage */}
            {subscription && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Penggunaan</h4>
                {subscription.usage && (
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Users</span>
                      <p className="font-medium">
                        {subscription.usage.users} / {subscription.limits?.maxUsers || '∞'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pasien</span>
                      <p className="font-medium">
                        {subscription.usage.patients} / {subscription.limits?.maxPatients || '∞'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dokter</span>
                      <p className="font-medium">
                        {subscription.usage.doctors} / {subscription.limits?.maxDoctors || '∞'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Link href={`/sa/tenants/${tenant.id}`}>
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Detail
                </Button>
              </Link>
              {isOwner && (
                <Button
                  size="sm"
                  variant={tenant.is_active ? 'outline' : 'default'}
                  onClick={() =>
                    toggleMut.mutate(
                      { id: tenant.id, isActive: !tenant.is_active },
                      {
                        onSuccess: () => toast.success(
                          tenant.is_active ? 'Tenant dinonaktifkan' : 'Tenant diaktifkan',
                        ),
                      },
                    )
                  }
                  disabled={toggleMut.isPending}
                >
                  <Power className="h-3.5 w-3.5 mr-1.5" />
                  {tenant.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
              )}
              {isOwner && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm(`Hapus tenant "${tenant.name}" beserta semua datanya? Aksi ini tidak bisa dibatalkan.`)) {
                      deleteMut.mutate(tenant.id, {
                        onSuccess: () => toast.success('Tenant dihapus'),
                      })
                    }
                  }}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Hapus
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function SATenantsPage() {
  const { user } = useAuthStore()
  const isOwner = user?.saRole === 'owner'
  const domain = usePlatformDomain()
  const [search, setSearch] = useState('')
  const { data: tenants, isLoading } = useTenantsList()

  const filtered = tenants?.filter((t) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      t.name.toLowerCase().includes(s) ||
      t.slug.toLowerCase().includes(s) ||
      t.email?.toLowerCase().includes(s) ||
      t.admin?.email.toLowerCase().includes(s)
    )
  })

  const activeCount = filtered?.filter((t) => t.is_active).length || 0
  const inactiveCount = (filtered?.length || 0) - activeCount

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kelola Tenant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Semua rumah sakit yang terdaftar di platform
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-lg border">
          <span className="text-lg font-bold text-emerald-600">{activeCount}</span>
          <span className="text-xs text-muted-foreground ml-1.5">Aktif</span>
        </div>
        <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-lg border">
          <span className="text-lg font-bold text-slate-400">{inactiveCount}</span>
          <span className="text-xs text-muted-foreground ml-1.5">Nonaktif</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Cari nama RS, slug, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tenant list */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
        </div>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Tidak ditemukan' : 'Belum ada tenant'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TenantCard key={t.id} tenant={t} isOwner={isOwner} domain={domain} />
          ))}
        </div>
      )}
    </div>
  )
}
