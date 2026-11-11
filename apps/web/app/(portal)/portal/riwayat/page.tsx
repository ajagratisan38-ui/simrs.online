'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'

interface Visit {
  id: string
  visit_number: string
  tipe: string
  tanggal: string
  status: string
  room_nama: string | null
  doctor_nama: string | null
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
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    menunggu: 'bg-yellow-100 text-yellow-800',
    dipanggil: 'bg-blue-100 text-blue-800',
    dilayani: 'bg-green-100 text-green-800',
    selesai: 'bg-slate-100 text-slate-600',
    batal: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

export default function RiwayatPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    if (!getToken()) { window.location.href = '/portal/login'; return }
    setLoading(true)
    portalFetch(`/visits?page=${page}&limit=${limit}`)
      .then((r) => {
        setVisits(r.data || [])
        setTotal(r.meta?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / limit)

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
            <span className="font-bold text-slate-900">Riwayat Kunjungan</span>
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

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500 mx-auto" />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Belum ada riwayat kunjungan</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {visits.map((v) => (
                  <div key={v.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {v.room_nama || v.tipe}
                        </p>
                        <StatusBadge status={v.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDate(v.tanggal)} • Dr. {v.doctor_nama || '-'}
                      </p>
                      <p className="text-xs text-slate-300">{v.visit_number}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400">{total} kunjungan</p>
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
