'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  DoorOpen,
  Stethoscope,
  Calendar,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  SkipForward,
} from 'lucide-react'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const slug = typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-Slug': slug || '',
  }
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(`${apiUrl}${url}`, {
    ...opts,
    headers: { ...getAuthHeaders(), ...(opts?.headers || {}) },
  })
  return res.json()
}

interface OnboardingStatus {
  completed: boolean
  steps: {
    profile: boolean
    rooms: boolean
    doctors: boolean
    schedules: boolean
  }
  tenantName: string
  rooms_count: number
  doctors_count: number
  schedules_count: number
}

interface AddedRoom {
  kode: string
  nama: string
  tipe: string
}

interface AddedDoctor {
  name: string
  email: string
  password: string
  sip: string
  spesialisasi: string
}

const STEPS = [
  { key: 'welcome', icon: Sparkles, label: 'Selamat Datang' },
  { key: 'profile', icon: Building2, label: 'Profil RS' },
  { key: 'rooms', icon: DoorOpen, label: 'Poliklinik' },
  { key: 'doctors', icon: Stethoscope, label: 'Dokter' },
  { key: 'done', icon: CheckCircle, label: 'Selesai' },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<OnboardingStatus | null>(null)

  // Profile
  const [rsName, setRsName] = useState('')
  const [rsAddress, setRsAddress] = useState('')
  const [rsPhone, setRsPhone] = useState('')
  const [rsEmail, setRsEmail] = useState('')

  // Rooms
  const [rooms, setRooms] = useState<AddedRoom[]>([])
  const [roomKode, setRoomKode] = useState('')
  const [roomNama, setRoomNama] = useState('')
  const [roomTipe, setRoomTipe] = useState('poli')

  // Doctors
  const [doctors, setDoctors] = useState<AddedDoctor[]>([])
  const [docName, setDocName] = useState('')
  const [docEmail, setDocEmail] = useState('')
  const [docPassword, setDocPassword] = useState('')
  const [docSip, setDocSip] = useState('')
  const [docSpesialisasi, setDocSpesialisasi] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/onboarding/status')
      if (res.success) {
        setStatus(res.data)
        if (res.data.completed) {
          router.push('/dashboard')
        }
        setRsName(res.data.tenantName || '')
      }
    } catch {}
    setLoading(false)
  }, [router])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await apiFetch('/onboarding/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: rsName, address: rsAddress, phone: rsPhone, email: rsEmail,
        }),
      })
    } catch {}
    setSaving(false)
    setStep(step + 1)
  }

  const handleAddRoom = async () => {
    if (!roomKode || !roomNama) return
    setSaving(true)
    try {
      const res = await apiFetch('/onboarding/rooms', {
        method: 'POST',
        body: JSON.stringify({ kode: roomKode, nama: roomNama, tipe: roomTipe }),
      })
      if (res.success) {
        setRooms([...rooms, { kode: roomKode, nama: roomNama, tipe: roomTipe }])
        setRoomKode('')
        setRoomNama('')
      }
    } catch {}
    setSaving(false)
  }

  const handleAddDoctor = async () => {
    if (!docName || !docEmail || !docPassword) return
    setSaving(true)
    try {
      const res = await apiFetch('/onboarding/doctors', {
        method: 'POST',
        body: JSON.stringify({
          name: docName, email: docEmail, password: docPassword,
          sip: docSip, spesialisasi: docSpesialisasi,
        }),
      })
      if (res.success) {
        setDoctors([...doctors, {
          name: docName, email: docEmail, password: docPassword,
          sip: docSip, spesialisasi: docSpesialisasi,
        }])
        setDocName(''); setDocEmail(''); setDocPassword('')
        setDocSip(''); setDocSpesialisasi('')
      }
    } catch {}
    setSaving(false)
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      await apiFetch('/onboarding/complete', { method: 'POST' })
      router.push('/dashboard')
    } catch {}
    setSaving(false)
  }

  const handleSkip = async () => {
    setSaving(true)
    try {
      await apiFetch('/onboarding/skip', { method: 'POST' })
      router.push('/dashboard')
    } catch {}
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i < step
                    ? 'bg-teal-600 text-white'
                    : i === step
                      ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                      : 'bg-slate-200 text-slate-400'
                }`}
              >
                {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 sm:w-12 h-0.5 ${i < step ? 'bg-teal-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {/* WELCOME */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-teal-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Selamat Datang di SIMRS! 🎉
              </h1>
              <p className="text-slate-500 max-w-md mx-auto">
                Rumah sakit <strong>{rsName || 'Anda'}</strong> berhasil didaftarkan.
                Mari kita siapkan sistem Anda dalam beberapa langkah mudah.
              </p>
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Mulai Setup <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-2.5 text-slate-400 text-sm hover:text-slate-600 transition-colors"
                >
                  <SkipForward className="h-4 w-4" /> Lewati
                </button>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Profil Rumah Sakit</h2>
                  <p className="text-sm text-slate-400">Lengkapi informasi dasar RS Anda</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama RS</label>
                <input
                  type="text" value={rsName} onChange={(e) => setRsName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alamat</label>
                <textarea
                  value={rsAddress} onChange={(e) => setRsAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telepon</label>
                  <input
                    type="text" value={rsPhone} onChange={(e) => setRsPhone(e.target.value)}
                    placeholder="021-xxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email" value={rsEmail} onChange={(e) => setRsEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-1 px-4 py-2 text-slate-400 text-sm hover:text-slate-600"
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Lanjut <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* ROOMS */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <DoorOpen className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Poliklinik & Ruangan</h2>
                  <p className="text-sm text-slate-400">
                    Tambahkan poli / ruangan yang tersedia
                  </p>
                </div>
              </div>

              {/* Add form */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Kode</label>
                    <input
                      type="text" value={roomKode} onChange={(e) => setRoomKode(e.target.value.toUpperCase())}
                      placeholder="POLI01"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nama</label>
                    <input
                      type="text" value={roomNama} onChange={(e) => setRoomNama(e.target.value)}
                      placeholder="Poli Umum"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Tipe</label>
                    <select
                      value={roomTipe} onChange={(e) => setRoomTipe(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="poli">Poli</option>
                      <option value="igd">IGD</option>
                      <option value="ruang_inap">Ruang Inap</option>
                      <option value="ok">Kamar Operasi</option>
                      <option value="lab">Laboratorium</option>
                      <option value="radiologi">Radiologi</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAddRoom}
                  disabled={saving || !roomKode || !roomNama}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Tambah
                </button>
              </div>

              {/* Added list */}
              {rooms.length > 0 && (
                <div className="space-y-2">
                  {rooms.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.nama}</p>
                        <p className="text-xs text-slate-400">{r.kode} • {r.tipe}</p>
                      </div>
                      <button
                        onClick={() => setRooms(rooms.filter((_, j) => j !== i))}
                        className="p-1 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(status?.rooms_count || 0) + rooms.length > 0 && (
                <p className="text-xs text-slate-400">
                  Total: {(status?.rooms_count || 0) + rooms.length} ruangan ditambahkan
                </p>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 px-4 py-2 text-slate-400 text-sm hover:text-slate-600"
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Lanjut <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* DOCTORS */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Dokter</h2>
                  <p className="text-sm text-slate-400">
                    Tambahkan dokter pertama RS Anda
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nama Dokter *</label>
                    <input
                      type="text" value={docName} onChange={(e) => setDocName(e.target.value)}
                      placeholder="dr. Ahmad"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Email *</label>
                    <input
                      type="email" value={docEmail} onChange={(e) => setDocEmail(e.target.value)}
                      placeholder="dokter@email.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Password *</label>
                    <input
                      type="password" value={docPassword} onChange={(e) => setDocPassword(e.target.value)}
                      placeholder="Min 8 karakter"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">No. SIP</label>
                    <input
                      type="text" value={docSip} onChange={(e) => setDocSip(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Spesialisasi</label>
                  <input
                    type="text" value={docSpesialisasi} onChange={(e) => setDocSpesialisasi(e.target.value)}
                    placeholder="Umum / Spesialis Penyakit Dalam / ..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <button
                  onClick={handleAddDoctor}
                  disabled={saving || !docName || !docEmail || docPassword.length < 8}
                  className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Tambah Dokter
                </button>
              </div>

              {doctors.length > 0 && (
                <div className="space-y-2">
                  {doctors.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{d.name}</p>
                        <p className="text-xs text-slate-400">
                          {d.email} {d.spesialisasi ? `• ${d.spesialisasi}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setDoctors(doctors.filter((_, j) => j !== i))}
                        className="p-1 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 px-4 py-2 text-slate-400 text-sm hover:text-slate-600"
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  Lanjut <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Setup Selesai!
              </h2>
              <p className="text-slate-500 max-w-md mx-auto">
                RS <strong>{rsName}</strong> siap digunakan.
                {rooms.length > 0 && ` ${rooms.length} poli ditambahkan.`}
                {doctors.length > 0 && ` ${doctors.length} dokter didaftarkan.`}
                {' '}Anda bisa menambahkan data lainnya dari menu Pengaturan kapan saja.
              </p>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Masuk ke Dashboard'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
