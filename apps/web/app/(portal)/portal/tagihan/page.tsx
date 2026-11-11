'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  CreditCard,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CheckCircle,
  Clock,
} from 'lucide-react'

interface Bill {
  id: string
  bill_number: string
  tanggal: string
  total_amount: number
  paid_amount: number
  status: string
  visit_number: string | null
  room_nama: string | null
}

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('portal-token') : null
}

async function portalFetch(endpoint: string) {
  const token = getToken()
  const res = await fetch(`${getApiUrl()}/portal${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Gagal memuat data')
  return res.json()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

export default function TagihanPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<string>('')
  const limit = 20

  useEffect(() => {
    if (!getToken()) { window.location.href = '/portal/login'; return }
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (filter) params.set('status', filter)
    portalFetch(`/bills?${params}`)
      .then((r) => {
        setBills(r.data || [])
        setTotal(r.meta?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filter])

  const totalPages = Math.ceil(total / limit)

  const totalOutstanding = bills
    .filter((b) => b.status !== 'paid')
    .reduce((s, b) => s + (b.total_amount - b.paid_amount), 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/portal" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Tagihan</span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('portal-token')
              localStorage.removeItem('portal-patient')
              window.location.href = '/portal/login'
            }}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Outstanding card */}
        {totalOutstanding > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600 font-medium">Total Belum Dibayar</p>
              <p className="text-xl font-bold text-orange-800">{formatRupiah(totalOutstanding)}</p>
            </div>
            <CreditCard className="h-8 w-8 text-orange-300" />
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2">
          {['', 'unpaid', 'partial', 'paid'].map((f) => {
            const labels: Record<string, string> = {
              '': 'Semua', unpaid: 'Belum Bayar', partial: 'Sebagian', paid: 'Lunas',
            }
            return (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {labels[f]}
              </button>
            )
          })}
        </div>

        {/* Bills */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500 mx-auto" />
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Tidak ada tagihan</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <div key={b.id} className="px-5 py-3.5 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {b.bill_number}
                          </p>
                          {b.status === 'paid' ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                              <CheckCircle className="h-3 w-3" /> Lunas
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium">
                              <Clock className="h-3 w-3" />
                              {b.status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(b.tanggal)} • {b.room_nama || b.visit_number || '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatRupiah(b.total_amount)}
                        </p>
                        {b.status !== 'paid' && b.paid_amount > 0 && (
                          <p className="text-xs text-slate-400">
                            Dibayar: {formatRupiah(b.paid_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400">{total} tagihan</p>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-slate-600 px-2">{page}/{totalPages}</span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
