'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity,
  User,
  Calendar,
  CreditCard,
  FileText,
  LogOut,
  Clock,
  Loader2,
  ChevronRight,
  Stethoscope,
  AlertTriangle,
} from 'lucide-react'

interface PortalPatient {
  id: string
  no_rekam_medis: string
  nama: string
  nik: string
  tanggal_lahir: string
  jenis_kelamin: string
  no_bpjs: string | null
  alergi: string[]
}

interface PortalVisit {
  id: string
  visit_number: string
  tipe: string
  tanggal: string
  status: string
  room_nama: string | null
  doctor_nama: string | null
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'
}

function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('portal-token')
}

function getPortalPatient(): PortalPatient | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem('portal-patient')
    return data ? JSON.parse(data) : null
  } catch { return null }
}

async function portalFetch(endpoint: string) {
  const token = getPortalToken()
  const res = await fetch(`${getApiUrl()}/portal${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Gagal memuat data')
  return res.json()
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    menunggu: 'bg-yellow-100 text-yellow-800',
    dipanggil: 'bg-blue-100 text-blue-800',
    dilayani: 'bg-green-100 text-green-800',
    selesai: 'bg-slate-100 text-slate-600',
    batal: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

export default function PortalDashboard() {
  const [patient, setPatient] = useState<PortalPatient | null>(null)
  const [upcoming, setUpcoming] = useState<PortalVisit[]>([])
  const [recent, setRecent] = useState<PortalVisit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const p = getPortalPatient()
    if (!p || !getPortalToken()) {
      window.location.href = '/portal/login'
      return
    }
    setPatient(p)

    Promise.all([
      portalFetch('/visits/upcoming').then((r) => setUpcoming(r.data || [])),
      portalFetch('/visits?limit=5').then((r) => setRecent(r.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('portal-token')
    localStorage.removeItem('portal-patient')
    window.location.href = '/portal/login'
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Portal Pasien</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:inline">{patient.nama}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-slate-100 text-slate-400"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Halo, {patient.nama.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            No. RM: {patient.no_rekam_medis}
            {patient.no_bpjs && ` • BPJS: ${patient.no_bpjs}`}
          </p>
        </div>

        {/* Alergi warning */}
        {patient.alergi && patient.alergi.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-800">Alergi:</p>
              <p className="text-xs text-red-600">{patient.alergi.join(', ')}</p>
            </div>
          </div>
        )}

        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              Jadwal Mendatang
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-teal-500 mx-auto" />
            </div>
          ) : upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{v.room_nama || 'Poli'}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(v.tanggal)} • Dr. {v.doctor_nama || '-'}
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              Tidak ada jadwal mendatang
            </p>
          )}
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Link href="/portal/riwayat" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all group">
            <Clock className="h-5 w-5 text-teal-600 mb-2" />
            <p className="text-sm font-medium text-slate-900">Riwayat Kunjungan</p>
            <p className="text-xs text-slate-400 mt-1">Lihat semua kunjungan Anda</p>
            <ChevronRight className="h-4 w-4 text-slate-300 mt-2 group-hover:text-teal-500 transition-colors" />
          </Link>

          <Link href="/portal/tagihan" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all group">
            <CreditCard className="h-5 w-5 text-teal-600 mb-2" />
            <p className="text-sm font-medium text-slate-900">Tagihan</p>
            <p className="text-xs text-slate-400 mt-1">Status pembayaran</p>
            <ChevronRight className="h-4 w-4 text-slate-300 mt-2 group-hover:text-teal-500 transition-colors" />
          </Link>

          <Link href="/portal/rekam-medis" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all group">
            <FileText className="h-5 w-5 text-teal-600 mb-2" />
            <p className="text-sm font-medium text-slate-900">Rekam Medis</p>
            <p className="text-xs text-slate-400 mt-1">Ringkasan diagnosis & resep</p>
            <ChevronRight className="h-4 w-4 text-slate-300 mt-2 group-hover:text-teal-500 transition-colors" />
          </Link>
        </div>

        {/* Recent visits */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-teal-600" />
              Kunjungan Terakhir
            </h2>
            <Link href="/portal/riwayat" className="text-xs text-teal-600 hover:text-teal-700">
              Lihat semua →
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-teal-500 mx-auto" />
            </div>
          ) : recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm text-slate-900">
                      {v.room_nama || v.tipe} — Dr. {v.doctor_nama || '-'}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(v.tanggal)}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              Belum ada riwayat kunjungan
            </p>
          )}
        </div>

        {/* Patient info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-teal-600" />
            Data Diri
          </h2>
          <dl className="grid sm:grid-cols-2 gap-3">
            {[
              ['Nama', patient.nama],
              ['No. RM', patient.no_rekam_medis],
              ['NIK', `${patient.nik.slice(0, 4)}****${patient.nik.slice(-4)}`],
              ['Tanggal Lahir', formatDate(patient.tanggal_lahir)],
              ['Jenis Kelamin', patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'],
              ['BPJS', patient.no_bpjs || '-'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
