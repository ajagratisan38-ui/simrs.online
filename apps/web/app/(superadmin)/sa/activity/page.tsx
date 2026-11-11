'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Activity,
  Search,
  Loader2,
  Clock,
  User,
  Globe,
  CheckCircle,
  XCircle,
  CreditCard,
  Settings,
  RefreshCw,
} from 'lucide-react'
import { useActivityLog } from '@/hooks/use-registration'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  approve_registration: { label: 'Approve RS', color: 'bg-emerald-100 text-emerald-800' },
  reject_registration: { label: 'Reject RS', color: 'bg-red-100 text-red-800' },
  verify_payment: { label: 'Verifikasi Bayar', color: 'bg-blue-100 text-blue-800' },
  retry_provision: { label: 'Retry Provision', color: 'bg-purple-100 text-purple-800' },
  update_settings: { label: 'Update Settings', color: 'bg-yellow-100 text-yellow-800' },
  toggle_tenant: { label: 'Toggle Tenant', color: 'bg-orange-100 text-orange-800' },
  delete_tenant: { label: 'Hapus Tenant', color: 'bg-red-100 text-red-800' },
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function SAActivityPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useActivityLog({ page, limit: 50 })

  const totalPages = Math.ceil((data?.meta?.total || 0) / 50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Riwayat aktivitas semua super admin di platform
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
            </div>
          ) : !data?.data?.length ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Belum ada aktivitas tercatat</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.data.map((log) => {
                const actionInfo = ACTION_LABELS[log.action] || {
                  label: log.action,
                  color: 'bg-gray-100 text-gray-800',
                }

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="shrink-0 mt-0.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${actionInfo.color}`}
                      >
                        {actionInfo.label}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.admin_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(log.created_at)}
                        </span>
                        {log.ip_address && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {log.ip_address}
                          </span>
                        )}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
