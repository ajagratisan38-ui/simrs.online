'use client'

import { usePlatformDomain } from '@/hooks/use-platform-domain'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Loader2,
  Eye,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react'
import { useState } from 'react'
import {
  usePaymentsPending,
  useRevenueSummary,
  useTransactions,
} from '@/hooks/use-tenants-admin'
import { useVerifyPayment } from '@/hooks/use-registration'
import { SERVER_BASE_URL } from '@/lib/api/client'

function formatRupiah(n: number): string {
  return `Rp ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function PaymentsPage() {
  const domain = usePlatformDomain()
  const { data: pending, isLoading: pendingLoading } = usePaymentsPending()
  const { data: revenue, isLoading: revenueLoading } = useRevenueSummary()
  const { data: txResult } = useTransactions()
  const verifyMutation = useVerifyPayment()
  const [tab, setTab] = useState<'pending' | 'verified' | 'all'>('pending')
  const [proofUrl, setProofUrl] = useState<string | null>(null)

  const allTx = txResult || []
  const verified = allTx.filter((t) => t.status === 'paid')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Verifikasi Pembayaran
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola pembayaran masuk dan verifikasi transaksi tenant
        </p>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hari Ini', value: revenue?.daily || 0, icon: DollarSign, color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Minggu Ini', value: revenue?.weekly || 0, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
          { label: 'Bulan Ini', value: revenue?.monthly || 0, icon: CreditCard, color: 'bg-indigo-100 text-indigo-600' },
          { label: 'Total', value: revenue?.total || 0, icon: CheckCircle, color: 'bg-amber-100 text-amber-600' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {revenueLoading ? '...' : formatRupiah(item.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'pending', label: 'Pending Verification', count: pending?.length || 0 },
          { key: 'verified', label: 'Verified', count: verified.length },
          { key: 'all', label: 'Semua Transaksi', count: allTx.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'pending' | 'verified' | 'all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-800 border text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'pending' && (
        <Card>
          <CardContent className="pt-6">
            {pendingLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500" />
              </div>
            ) : !pending?.length ? (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada pembayaran pending
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map((p) => (
                  <div key={p.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{p.nama_rs}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.requested_slug}.{domain} — {p.admin_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Paket: <span className="font-medium capitalize">{p.plan_code}</span> — {formatDate(p.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600">
                          {formatRupiah(p.total_amount)}
                        </p>
                        <Badge variant={p.status === 'payment_uploaded' ? 'default' : 'secondary'}>
                          {p.status === 'payment_uploaded' ? 'Bukti Diterima' : 'Menunggu Bayar'}
                        </Badge>
                      </div>
                    </div>

                    {/* Payment proof */}
                    {p.payment_proof_url && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => setProofUrl(p.payment_proof_url)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <Eye className="h-3.5 w-3.5" /> Lihat Bukti
                        </button>
                        <a
                          href={`${SERVER_BASE_URL}${p.payment_proof_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Buka Tab Baru
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => verifyMutation.mutate(p.id)}
                        disabled={verifyMutation.isPending}
                      >
                        {verifyMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        )}
                        Verif & Aktifkan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'verified' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaksi Terverifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            {verified.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada transaksi terverifikasi
              </p>
            ) : (
              <div className="space-y-2">
                {verified.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{tx.tenant_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.plan_name} — {tx.payment_method} — {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{formatRupiah(tx.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Semua Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            {allTx.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada transaksi
              </p>
            ) : (
              <div className="space-y-2">
                {allTx.slice(0, 50).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{tx.tenant_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.plan_name} — {tx.type} — {tx.payment_method || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatRupiah(tx.amount)}</p>
                      <Badge variant={tx.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proof modal */}
      {proofUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProofUrl(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Bukti Pembayaran</p>
              <button onClick={() => setProofUrl(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                Tutup
              </button>
            </div>
            {proofUrl.endsWith('.pdf') ? (
              <div className="text-center py-8">
                <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <a
                  href={`${SERVER_BASE_URL}${proofUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Buka PDF →
                </a>
              </div>
            ) : (
              <img
                src={`${SERVER_BASE_URL}${proofUrl}`}
                alt="Bukti Pembayaran"
                className="w-full rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
