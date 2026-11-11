'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Pill,
  Stethoscope,
} from 'lucide-react'

interface Diagnosis {
  kode: string
  nama: string
  tipe: string
}

interface Prescription {
  nama_obat: string
  jumlah: number
  aturan_pakai: string
}

interface MedicalSummary {
  id: string
  visit_id: string
  visit_number: string
  tanggal: string
  room_nama: string | null
  doctor_nama: string | null
  keluhan: string | null
  pemeriksaan: string | null
  assessment: string | null
  plan: string | null
  diagnoses: Diagnosis[]
  prescriptions: Prescription[]
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
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function RekamMedisPage() {
  const [records, setRecords] = useState<MedicalSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const limit = 10

  useEffect(() => {
    if (!getToken()) { window.location.href = '/portal/login'; return }
    setLoading(true)
    portalFetch(`/medical-summaries?page=${page}&limit=${limit}`)
      .then((r) => {
        setRecords(r.data || [])
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
            <span className="font-bold text-slate-900">Rekam Medis</span>
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
        <p className="text-xs text-slate-400 mb-4">
          Hanya rekam medis yang sudah di-finalisasi oleh dokter yang ditampilkan.
        </p>

        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500 mx-auto" />
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Belum ada rekam medis</p>
            </div>
          ) : (
            records.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Header row — clickable */}
                <button
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {r.room_nama || 'Poli'} — Dr. {r.doctor_nama || '-'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(r.tanggal)}</p>
                    {r.diagnoses.length > 0 && (
                      <p className="text-xs text-teal-600 mt-1">
                        {r.diagnoses.map((d) => `${d.kode} ${d.nama}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      expanded === r.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Expanded detail */}
                {expanded === r.id && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                    {/* SOAP */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {r.keluhan && (
                        <div>
                          <p className="text-xs font-medium text-slate-500">Keluhan (S)</p>
                          <p className="text-sm text-slate-700 mt-1">{r.keluhan}</p>
                        </div>
                      )}
                      {r.pemeriksaan && (
                        <div>
                          <p className="text-xs font-medium text-slate-500">Pemeriksaan (O)</p>
                          <p className="text-sm text-slate-700 mt-1">{r.pemeriksaan}</p>
                        </div>
                      )}
                      {r.assessment && (
                        <div>
                          <p className="text-xs font-medium text-slate-500">Assessment (A)</p>
                          <p className="text-sm text-slate-700 mt-1">{r.assessment}</p>
                        </div>
                      )}
                      {r.plan && (
                        <div>
                          <p className="text-xs font-medium text-slate-500">Plan (P)</p>
                          <p className="text-sm text-slate-700 mt-1">{r.plan}</p>
                        </div>
                      )}
                    </div>

                    {/* Diagnosis */}
                    {r.diagnoses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
                          <Stethoscope className="h-3.5 w-3.5" /> Diagnosis
                        </p>
                        <div className="space-y-1">
                          {r.diagnoses.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-mono rounded">
                                {d.kode}
                              </span>
                              <span className="text-sm text-slate-700">{d.nama}</span>
                              <span className="text-[10px] text-slate-400">({d.tipe})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescriptions */}
                    {r.prescriptions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2">
                          <Pill className="h-3.5 w-3.5" /> Resep
                        </p>
                        <div className="space-y-1">
                          {r.prescriptions.map((p, i) => (
                            <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                              <span className="text-sm text-slate-700">{p.nama_obat}</span>
                              <span className="text-xs text-slate-400">
                                {p.jumlah}× — {p.aturan_pakai}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-400">{total} rekam medis</p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded hover:bg-white disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-600 px-2">{page}/{totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded hover:bg-white disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
