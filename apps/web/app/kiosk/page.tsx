'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  UserCheck,
  ArrowLeft,
  Printer,
  RotateCcw,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Building2,
  Wallet,
  ShieldCheck,
  Delete,
  XCircle,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, getTodayLocal } from '@/lib/utils'
import { listPatients } from '@/lib/api/patients'
import { listVisits } from '@/lib/api/registration'
import { listRooms, listDoctors, createVisit } from '@/lib/api/queues'
import type { Patient } from '@simrs/shared-types'
import type { VisitData } from '@/lib/api/registration'
import type { RoomOption, DoctorOption } from '@/lib/api/queues'

type Step =
  | 'welcome'
  | 'search'
  | 'patient-found'
  | 'select-poli'
  | 'select-doctor'
  | 'select-penjamin'
  | 'confirm'
  | 'ticket'
  | 'error'

interface TicketInfo {
  nomorAntrian: number
  visitNumber: string
  patientNama: string
  noRM: string
  roomNama: string
  doctorNama: string
  penjamin: string
  tanggal: string
  jam: string
}

export default function KioskPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [patient, setPatient] = useState<Patient | null>(null)
  const [todayVisits, setTodayVisits] = useState<VisitData[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null)
  const [selectedPenjamin, setSelectedPenjamin] = useState<string>('')
  const [ticket, setTicket] = useState<TicketInfo | null>(null)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [countdown, setCountdown] = useState(60)

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setCountdown(60)
    if (step !== 'welcome') {
      timeoutRef.current = setTimeout(() => {
        resetAll()
      }, 60_000)
    }
  }, [step])

  useEffect(() => {
    resetTimeout()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [step, resetTimeout])

  useEffect(() => {
    if (step === 'welcome') return
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  const resetAll = () => {
    setStep('welcome')
    setSearchInput('')
    setPatient(null)
    setTodayVisits([])
    setSelectedRoom(null)
    setSelectedDoctor(null)
    setSelectedPenjamin('')
    setTicket(null)
    setErrorMsg('')
    setLoading(false)
  }

  const [clock, setClock] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const clockTime = clock.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // ─── SEARCH ───────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!searchInput.trim()) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await listPatients({ search: searchInput.trim(), limit: 5 })
      if (res.data.length === 0) {
        setErrorMsg('Pasien tidak ditemukan.\nSilakan hubungi petugas pendaftaran.')
        setStep('error')
        return
      }
      if (res.data.length === 1) {
        await selectPatient(res.data[0])
        return
      }
      const exact = res.data.find(
        (p) =>
          p.no_rekam_medis === searchInput.trim() ||
          p.nik === searchInput.trim(),
      )
      if (exact) {
        await selectPatient(exact)
        return
      }
      await selectPatient(res.data[0])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mencari pasien')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const selectPatient = async (p: Patient) => {
    setPatient(p)
    setLoading(true)
    try {
      const today = getTodayLocal()
      const visitsRes = await listVisits({
        patient_id: p.id,
        tanggal: today,
        limit: 10,
      })
      const activeVisits = visitsRes.data.filter(
        (v) => !['batal', 'selesai', 'pulang'].includes(v.status),
      )
      setTodayVisits(activeVisits)
      setStep('patient-found')
    } catch {
      setTodayVisits([])
      setStep('patient-found')
    } finally {
      setLoading(false)
    }
  }

  const handleNewRegistration = async () => {
    setLoading(true)
    try {
      const res = await listRooms('poli')
      setRooms(res.data || [])
      setStep('select-poli')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data poli')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRoom = async (room: RoomOption) => {
    setSelectedRoom(room)
    setLoading(true)
    try {
      const res = await listDoctors(room.id)
      const available = (res.data || []).filter((d) => d.is_available)
      setDoctors(available)
      setStep('select-doctor')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data dokter')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDoctor = (doctor: DoctorOption) => {
    setSelectedDoctor(doctor)
    setStep('select-penjamin')
  }

  const handleSelectPenjamin = (penjamin: string) => {
    setSelectedPenjamin(penjamin)
    setStep('confirm')
  }

  const handleConfirm = async () => {
    if (!patient || !selectedRoom || !selectedDoctor || !selectedPenjamin) return
    setLoading(true)
    try {
      const res = await createVisit({
        patient_id: patient.id,
        tipe: 'rawat_jalan',
        room_id: selectedRoom.id,
        doctor_id: selectedDoctor.id,
        penjamin: selectedPenjamin,
        cara_masuk: 'kiosk',
      })
      const { visit, queue } = res.data
      const now = new Date()
      setTicket({
        nomorAntrian: queue?.nomor_antrian ?? 0,
        visitNumber: visit.visit_number,
        patientNama: patient.nama,
        noRM: patient.no_rekam_medis ?? '',
        roomNama: selectedRoom.nama,
        doctorNama: selectedDoctor.nama ?? '',
        penjamin: selectedPenjamin,
        tanggal: now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        jam: now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
      setStep('ticket')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftar')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = (visit: VisitData) => {
    const now = new Date()
    setTicket({
      nomorAntrian: visit.queue?.nomor_antrian ?? 0,
      visitNumber: visit.visit_number,
      patientNama: patient?.nama ?? '',
      noRM: patient?.no_rekam_medis ?? '',
      roomNama: visit.room_nama ?? '',
      doctorNama: visit.doctor_nama ?? '',
      penjamin: visit.penjamin,
      tanggal: now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      jam: now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    })
    setStep('ticket')
  }

  const handlePrint = () => window.print()

  const handleNumpad = (val: string) => {
    resetTimeout()
    if (val === 'backspace') {
      setSearchInput((prev) => prev.slice(0, -1))
    } else if (val === 'clear') {
      setSearchInput('')
    } else {
      setSearchInput((prev) => prev + val)
    }
  }

  // ─── Step indicators ──────────────────────────────────────────────

  const stepLabels = ['Cari Pasien', 'Pilih Poli', 'Pilih Dokter', 'Pembayaran', 'Konfirmasi']
  const stepMap: Record<Step, number> = {
    welcome: -1,
    search: 0,
    'patient-found': 0,
    'select-poli': 1,
    'select-doctor': 2,
    'select-penjamin': 3,
    confirm: 4,
    ticket: 5,
    error: -1,
  }
  const currentStepIdx = stepMap[step]

  return (
    <div
      className="min-h-screen bg-[#0b1a2b] text-white flex flex-col select-none"
      onClick={resetTimeout}
    >
      {/* ─── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-teal-900/80 to-teal-800/60 border-b border-teal-700/30 print:hidden">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl px-5 py-2.5 shadow-lg shadow-teal-500/20">
            <span className="text-2xl font-extrabold tracking-wider">SIMRS</span>
          </div>
          <div>
            <div className="text-xl font-bold">Anjungan Pendaftaran Mandiri</div>
            <div className="text-sm text-teal-300/80 font-medium">Self-Service Registration Kiosk</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-3xl font-mono font-bold tabular-nums">{clockTime}</div>
          {step !== 'welcome' && (
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Mulai Ulang
            </button>
          )}
        </div>
      </div>

      {/* ─── STEP INDICATOR ──────────────────────────────────────────── */}
      {currentStepIdx >= 0 && currentStepIdx <= 4 && (
        <div className="flex items-center justify-center gap-1 px-8 py-3 bg-black/20 print:hidden">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                i < currentStepIdx && 'bg-teal-500/20 text-teal-300',
                i === currentStepIdx && 'bg-teal-500 text-white',
                i > currentStepIdx && 'bg-white/5 text-white/30',
              )}>
                <span className={cn(
                  'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  i < currentStepIdx && 'bg-teal-500/30',
                  i === currentStepIdx && 'bg-white/20',
                  i > currentStepIdx && 'bg-white/10',
                )}>
                  {i < currentStepIdx ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <ChevronRight className={cn(
                  'h-3 w-3',
                  i < currentStepIdx ? 'text-teal-400/50' : 'text-white/10',
                )} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        {/* WELCOME */}
        {step === 'welcome' && (
          <div className="text-center space-y-10 max-w-2xl">
            <div className="space-y-6">
              <div className="mx-auto h-28 w-28 rounded-full bg-gradient-to-br from-teal-400/20 to-teal-600/10 border-2 border-teal-400/30 flex items-center justify-center">
                <Stethoscope className="h-14 w-14 text-teal-400" />
              </div>
              <h1 className="text-5xl font-extrabold">Selamat Datang</h1>
              <p className="text-xl text-teal-300/80 leading-relaxed">
                Silakan sentuh tombol di bawah untuk<br />memulai pendaftaran mandiri
              </p>
            </div>
            <button
              onClick={() => setStep('search')}
              className="group relative h-24 px-16 text-2xl font-bold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 rounded-2xl shadow-xl shadow-teal-500/25 transition-all hover:shadow-teal-400/30 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-4 mx-auto"
            >
              <Search className="h-7 w-7" />
              MULAI PENDAFTARAN
            </button>
            <p className="text-sm text-white/25">
              Sentuh layar untuk memulai
            </p>
          </div>
        )}

        {/* SEARCH */}
        {step === 'search' && (
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Cari Data Pasien</h2>
              <p className="text-base text-teal-300/70">
                Masukkan No. Rekam Medis atau NIK Anda
              </p>
            </div>

            {/* Input display */}
            <div className="bg-white/[0.06] rounded-2xl p-5 text-center border-2 border-teal-500/40 shadow-inner">
              <div className="text-4xl font-mono font-bold tracking-[0.3em] min-h-[52px] text-white">
                {searchInput || <span className="text-white/15 tracking-[0.5em]">______</span>}
              </div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => handleNumpad(key)}
                    className={cn(
                      'h-16 rounded-xl font-bold text-2xl transition-all active:scale-95',
                      'border border-white/10',
                      key === 'clear'
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 text-base'
                        : key === 'backspace'
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          : 'bg-white/[0.06] text-white hover:bg-white/[0.12]',
                    )}
                  >
                    {key === 'backspace' ? (
                      <Delete className="h-6 w-6 mx-auto" />
                    ) : key === 'clear' ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <XCircle className="h-4 w-4" />
                        Hapus
                      </span>
                    ) : key}
                  </button>
                ),
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('welcome')}
                className="flex-1 h-14 inline-flex items-center justify-center gap-2 text-base font-medium text-white/80 border border-white/15 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Kembali
              </button>
              <Button
                size="lg"
                onClick={handleSearch}
                disabled={loading || !searchInput.trim()}
                className="flex-1 h-14 text-base bg-teal-600 hover:bg-teal-500 rounded-xl disabled:opacity-40"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Cari Pasien
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* PATIENT FOUND */}
        {step === 'patient-found' && patient && (
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                <UserCheck className="h-8 w-8 text-teal-400" />
              </div>
              <h2 className="text-3xl font-bold">Pasien Ditemukan</h2>
            </div>

            <div className="bg-white/[0.06] rounded-2xl p-6 border border-white/[0.08] space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{patient.nama}</div>
                <div className="text-base text-teal-300 mt-1 font-mono">
                  No. RM: {patient.no_rekam_medis}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/[0.04] rounded-xl p-3.5">
                  <div className="text-white/40 text-xs mb-0.5">Tanggal Lahir</div>
                  <div className="font-semibold">
                    {patient.tanggal_lahir
                      ? new Date(patient.tanggal_lahir).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                  </div>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-3.5">
                  <div className="text-white/40 text-xs mb-0.5">Jenis Kelamin</div>
                  <div className="font-semibold">
                    {patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </div>
                </div>
              </div>
            </div>

            {todayVisits.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-teal-300 uppercase tracking-wider">
                  Pendaftaran Hari Ini
                </h3>
                {todayVisits.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between bg-white/[0.06] rounded-xl p-4 border border-white/[0.06]"
                  >
                    <div>
                      <div className="font-semibold">{v.room_nama}</div>
                      <div className="text-sm text-teal-300/70">
                        {v.visit_number} • Antrian #{v.queue?.nomor_antrian}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'text-xs font-semibold px-3 py-1 rounded-full',
                        v.status === 'menunggu' && 'bg-amber-500/20 text-amber-300',
                        v.status === 'dipanggil' && 'bg-blue-500/20 text-blue-300',
                        v.status === 'diperiksa' && 'bg-green-500/20 text-green-300',
                      )}>
                        {v.status}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCheckin(v)}
                        className="bg-teal-600 hover:bg-teal-500"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        Cetak Tiket
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('search')
                  setSearchInput('')
                }}
                className="flex-1 h-14 inline-flex items-center justify-center gap-2 text-base font-medium text-white/80 border border-white/15 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Cari Lagi
              </button>
              <Button
                size="lg"
                onClick={handleNewRegistration}
                disabled={loading}
                className="flex-1 h-14 text-base bg-teal-600 hover:bg-teal-500 rounded-xl"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Stethoscope className="h-5 w-5 mr-2" />
                    Daftar Baru ke Poli
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* SELECT POLI */}
        {step === 'select-poli' && (
          <div className="w-full max-w-3xl space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Pilih Poli Tujuan</h2>
              <p className="text-base text-teal-300/70">Sentuh poli yang ingin Anda kunjungi</p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {rooms.length === 0 ? (
                <div className="col-span-2 text-center text-white/30 py-16 text-lg">
                  Tidak ada poli tersedia saat ini
                </div>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleSelectRoom(room)}
                    disabled={loading}
                    className="h-20 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-teal-500/15 hover:border-teal-400/40 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-lg font-bold">{room.nama}</span>
                    <span className="text-xs text-teal-300/60">{room.kode}</span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setStep('patient-found')}
              className="w-full h-14 inline-flex items-center justify-center gap-2 text-base font-medium text-white/80 border border-white/15 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Kembali
            </button>
          </div>
        )}

        {/* SELECT DOCTOR */}
        {step === 'select-doctor' && (
          <div className="w-full max-w-3xl space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Pilih Dokter</h2>
              <p className="text-base text-teal-300/70">{selectedRoom?.nama}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {doctors.length === 0 ? (
                <div className="col-span-2 text-center text-white/30 py-16 text-lg">
                  Tidak ada dokter tersedia di poli ini
                </div>
              ) : (
                doctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoctor(doc)}
                    className="h-20 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-teal-500/15 hover:border-teal-400/40 transition-all active:scale-[0.98] flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-lg font-bold">{doc.nama}</span>
                    <span className="text-xs text-teal-300/60">
                      {doc.spesialisasi || 'Umum'}
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setStep('select-poli')}
              className="w-full h-14 inline-flex items-center justify-center gap-2 text-base font-medium text-white/80 border border-white/15 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Kembali
            </button>
          </div>
        )}

        {/* SELECT PENJAMIN */}
        {step === 'select-penjamin' && (
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Jenis Pembayaran</h2>
              <p className="text-base text-teal-300/70">Pilih cara pembayaran kunjungan Anda</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'umum', label: 'Umum', desc: 'Bayar sendiri', icon: Wallet, color: 'from-blue-500/20 to-blue-600/10 border-blue-400/30 hover:border-blue-400/50' },
                { value: 'bpjs', label: 'BPJS', desc: 'BPJS Kesehatan', icon: ShieldCheck, color: 'from-green-500/20 to-green-600/10 border-green-400/30 hover:border-green-400/50' },
                { value: 'asuransi', label: 'Asuransi', desc: 'Asuransi Swasta', icon: CreditCard, color: 'from-purple-500/20 to-purple-600/10 border-purple-400/30 hover:border-purple-400/50' },
                { value: 'perusahaan', label: 'Perusahaan', desc: 'Jaminan perusahaan', icon: Building2, color: 'from-amber-500/20 to-amber-600/10 border-amber-400/30 hover:border-amber-400/50' },
              ].map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectPenjamin(opt.value)}
                    className={cn(
                      'h-28 rounded-xl border bg-gradient-to-b transition-all active:scale-[0.98]',
                      'flex flex-col items-center justify-center gap-2',
                      opt.color,
                    )}
                  >
                    <Icon className="h-8 w-8" />
                    <span className="text-lg font-bold">{opt.label}</span>
                    <span className="text-xs text-white/50">{opt.desc}</span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setStep('select-doctor')}
              className="w-full h-14 inline-flex items-center justify-center gap-2 text-base font-medium text-white/80 border border-white/15 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Kembali
            </button>
          </div>
        )}

        {/* CONFIRM */}
        {step === 'confirm' && (
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Konfirmasi Pendaftaran</h2>
              <p className="text-base text-teal-300/70">Pastikan data berikut sudah benar</p>
            </div>

            <div className="bg-white/[0.06] rounded-2xl p-6 border border-white/[0.08] divide-y divide-white/[0.06]">
              <ConfirmRow label="Pasien" value={patient?.nama ?? ''} />
              <ConfirmRow label="No. RM" value={patient?.no_rekam_medis ?? ''} />
              <ConfirmRow label="Poli" value={selectedRoom?.nama ?? ''} />
              <ConfirmRow label="Dokter" value={selectedDoctor?.nama ?? ''} />
              <ConfirmRow
                label="Pembayaran"
                value={
                  selectedPenjamin === 'umum' ? 'Umum'
                    : selectedPenjamin === 'bpjs' ? 'BPJS Kesehatan'
                      : selectedPenjamin === 'asuransi' ? 'Asuransi Swasta'
                        : 'Perusahaan'
                }
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('select-penjamin')}
                className="flex-1 h-14 inline-flex items-center justify-center gap-2 text-base font-medium text-white/80 border border-white/15 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Kembali
              </button>
              <Button
                size="lg"
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 h-14 text-base bg-teal-600 hover:bg-teal-500 rounded-xl"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Konfirmasi & Daftar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* TICKET */}
        {step === 'ticket' && ticket && (
          <div className="w-full max-w-md space-y-6">
            <div className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl shadow-black/30 print:rounded-none print:shadow-none">
              {/* Ticket header */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-4 text-center text-white">
                <div className="text-xl font-extrabold tracking-wider">SIMRS</div>
                <div className="text-sm text-teal-100/80">Tiket Antrian</div>
              </div>

              {/* Queue number */}
              <div className="text-center py-6 border-b-2 border-dashed border-gray-200">
                <div className="text-xs text-gray-400 uppercase tracking-[0.3em] font-semibold mb-2">
                  Nomor Antrian Anda
                </div>
                <div className="text-[100px] font-black text-teal-600 leading-none">
                  {ticket.nomorAntrian}
                </div>
              </div>

              {/* Details */}
              <div className="px-6 py-5 space-y-2.5 text-sm">
                <TicketRow label="Pasien" value={ticket.patientNama} />
                <TicketRow label="No. RM" value={ticket.noRM} />
                <TicketRow label="No. Kunjungan" value={ticket.visitNumber} />
                <TicketRow label="Poli" value={ticket.roomNama} />
                <TicketRow label="Dokter" value={ticket.doctorNama} />
                <TicketRow label="Pembayaran" value={ticket.penjamin.toUpperCase()} />
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-100">
                <div className="text-xs text-gray-500">{ticket.tanggal}</div>
                <div className="text-xs text-gray-400">Jam: {ticket.jam}</div>
                <div className="mt-2 text-xs text-gray-500 font-medium">
                  Harap menunggu nomor antrian Anda dipanggil
                </div>
              </div>
            </div>

            <div className="flex gap-3 print:hidden">
              <Button
                size="lg"
                onClick={handlePrint}
                className="flex-1 h-14 text-base bg-teal-600 hover:bg-teal-500 rounded-xl"
              >
                <Printer className="h-5 w-5 mr-2" />
                Cetak Tiket
              </Button>
              <button
                onClick={resetAll}
                className="flex-1 h-14 inline-flex items-center justify-center gap-2 text-base font-medium text-white/80 border border-white/15 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
              >
                <CheckCircle2 className="h-5 w-5" />
                Selesai
              </button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="w-full max-w-md text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Terjadi Kesalahan</h2>
              <p className="text-lg text-amber-300 whitespace-pre-line">{errorMsg}</p>
            </div>
            <Button
              size="lg"
              onClick={resetAll}
              className="h-14 px-12 text-base bg-teal-600 hover:bg-teal-500 rounded-xl"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Mulai Ulang
            </Button>
          </div>
        )}
      </div>

      {/* LOADING OVERLAY */}
      {loading && step !== 'search' && step !== 'confirm' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 print:hidden">
          <div className="bg-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="h-12 w-12 border-3 border-teal-300/30 border-t-teal-400 rounded-full animate-spin" />
            <div className="text-lg text-white font-medium">Memuat...</div>
          </div>
        </div>
      )}

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <div className="px-8 py-3 bg-black/30 border-t border-teal-700/20 print:hidden">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-teal-300/40">
            <Clock className="h-4 w-4" />
            {step !== 'welcome' ? (
              <span>
                Kembali ke awal dalam{' '}
                <span className={cn(
                  'font-mono font-bold',
                  countdown <= 10 ? 'text-amber-400' : 'text-teal-300/60',
                )}>
                  {countdown}
                </span>{' '}
                detik
              </span>
            ) : (
              <span>Siap melayani</span>
            )}
          </div>
          <div className="text-teal-300/30 text-xs">
            SIMRS • Anjungan Pendaftaran Mandiri
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3">
      <span className="text-teal-300/70">{label}</span>
      <span className="font-bold text-lg">{value}</span>
    </div>
  )
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
