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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { listPatients } from '@/lib/api/patients'
import { listVisits, createVisit } from '@/lib/api/registration'
import { listRooms, listDoctors } from '@/lib/api/queues'
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

  // Data
  const [patient, setPatient] = useState<Patient | null>(null)
  const [todayVisits, setTodayVisits] = useState<VisitData[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null)
  const [selectedPenjamin, setSelectedPenjamin] = useState<string>('')
  const [ticket, setTicket] = useState<TicketInfo | null>(null)

  // Auto-return to welcome after 60s of inactivity
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
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

  // Clock
  const [clock, setClock] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const clockTime = clock.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // --- SEARCH PATIENT ---
  const handleSearch = async () => {
    if (!searchInput.trim()) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await listPatients({ search: searchInput.trim(), limit: 5 })
      if (res.data.length === 0) {
        setErrorMsg('Pasien tidak ditemukan. Silakan hubungi petugas pendaftaran.')
        setStep('error')
        return
      }
      if (res.data.length === 1) {
        await selectPatient(res.data[0])
        return
      }
      // Multiple results — pick the exact match first
      const exact = res.data.find(
        (p) =>
          p.no_rekam_medis === searchInput.trim() ||
          p.nik === searchInput.trim(),
      )
      if (exact) {
        await selectPatient(exact)
        return
      }
      // Just pick first one
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
      const today = new Date().toISOString().split('T')[0]
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

  // --- LOAD ROOMS ---
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

  // --- LOAD DOCTORS ---
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

  // --- CREATE VISIT ---
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

  // --- CHECK-IN (show existing ticket) ---
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

  // --- PRINT ---
  const handlePrint = () => {
    window.print()
  }

  // --- NUMPAD ---
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

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-teal-900 via-slate-900 to-teal-950 text-white flex flex-col select-none"
      onClick={resetTimeout}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/30 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-teal-600 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold tracking-wider">SIMRS</span>
          </div>
          <div>
            <div className="text-xl font-semibold">Anjungan Pendaftaran Mandiri</div>
            <div className="text-sm text-teal-300">Self-Service Registration Kiosk</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-mono font-bold">{clockTime}</div>
          {step !== 'welcome' && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetAll}
              className="text-white border-white/20"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Mulai Ulang
            </Button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex items-center justify-center p-8">
        {/* WELCOME */}
        {step === 'welcome' && (
          <div className="text-center space-y-12 max-w-2xl">
            <div className="space-y-4">
              <Stethoscope className="h-24 w-24 mx-auto text-teal-400" />
              <h1 className="text-5xl font-bold">Selamat Datang</h1>
              <p className="text-xl text-teal-300">
                Silakan sentuh tombol di bawah untuk memulai pendaftaran
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setStep('search')}
              className="h-24 px-16 text-2xl bg-teal-600 hover:bg-teal-500 rounded-2xl shadow-lg shadow-teal-600/30"
            >
              <Search className="h-8 w-8 mr-4" />
              MULAI PENDAFTARAN
            </Button>
            <p className="text-sm text-white/30">
              Sentuh layar atau tekan tombol untuk memulai
            </p>
          </div>
        )}

        {/* SEARCH */}
        {step === 'search' && (
          <div className="w-full max-w-xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Cari Data Pasien</h2>
              <p className="text-lg text-teal-300">
                Masukkan No. Rekam Medis atau NIK
              </p>
            </div>

            {/* Input display */}
            <div className="bg-white/10 rounded-2xl p-6 text-center border-2 border-teal-500/50">
              <div className="text-4xl font-mono font-bold tracking-widest min-h-[56px]">
                {searchInput || <span className="text-white/20">_ _ _ _ _ _</span>}
              </div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map(
                (key) => (
                  <Button
                    key={key}
                    variant="outline"
                    onClick={() => handleNumpad(key)}
                    className={cn(
                      'h-16 text-2xl font-bold rounded-xl border-white/20 text-white',
                      key === 'clear' && 'text-base text-red-400',
                      key === 'backspace' && 'text-base text-yellow-400',
                    )}
                  >
                    {key === 'backspace' ? '⌫' : key === 'clear' ? 'Hapus' : key}
                  </Button>
                ),
              )}
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep('welcome')}
                className="flex-1 h-16 text-lg text-white border-white/20 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Kembali
              </Button>
              <Button
                size="lg"
                onClick={handleSearch}
                disabled={loading || !searchInput.trim()}
                className="flex-1 h-16 text-lg bg-teal-600 hover:bg-teal-500 rounded-xl"
              >
                {loading ? (
                  <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Cari
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* PATIENT FOUND */}
        {step === 'patient-found' && patient && (
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center space-y-2">
              <UserCheck className="h-16 w-16 mx-auto text-teal-400" />
              <h2 className="text-3xl font-bold">Pasien Ditemukan</h2>
            </div>

            {/* Patient info card */}
            <div className="bg-white/10 rounded-2xl p-8 border border-white/10 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{patient.nama}</div>
                <div className="text-lg text-teal-300 mt-1">
                  No. RM: {patient.no_rekam_medis}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-white/50">Tanggal Lahir</div>
                  <div className="font-medium">
                    {patient.tanggal_lahir
                      ? new Date(patient.tanggal_lahir).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-white/50">Jenis Kelamin</div>
                  <div className="font-medium">
                    {patient.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </div>
                </div>
              </div>
            </div>

            {/* Today's visits */}
            {todayVisits.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-teal-300">
                  Pendaftaran Hari Ini
                </h3>
                {todayVisits.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between bg-white/10 rounded-xl p-4 border border-white/10"
                  >
                    <div>
                      <div className="font-semibold">{v.room_nama}</div>
                      <div className="text-sm text-teal-300">
                        {v.visit_number} • Antrian #{v.queue?.nomor_antrian}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={cn(
                          'text-sm px-3 py-1',
                          v.status === 'menunggu' && 'bg-yellow-500/20 text-yellow-300',
                          v.status === 'dipanggil' && 'bg-blue-500/20 text-blue-300',
                          v.status === 'diperiksa' && 'bg-green-500/20 text-green-300',
                        )}
                      >
                        {v.status}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleCheckin(v)}
                        className="bg-teal-600 hover:bg-teal-500"
                      >
                        Cetak Tiket
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setStep('search')
                  setSearchInput('')
                }}
                className="flex-1 h-16 text-lg text-white border-white/20 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Cari Lagi
              </Button>
              <Button
                size="lg"
                onClick={handleNewRegistration}
                disabled={loading}
                className="flex-1 h-16 text-lg bg-teal-600 hover:bg-teal-500 rounded-xl"
              >
                {loading ? (
                  <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <div className="w-full max-w-3xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Pilih Poli Tujuan</h2>
              <p className="text-lg text-teal-300">
                Sentuh poli yang ingin Anda kunjungi
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
              {rooms.length === 0 ? (
                <div className="col-span-2 text-center text-white/40 py-12 text-lg">
                  Tidak ada poli tersedia saat ini
                </div>
              ) : (
                rooms.map((room) => (
                  <Button
                    key={room.id}
                    variant="outline"
                    onClick={() => handleSelectRoom(room)}
                    disabled={loading}
                    className="h-24 text-xl font-semibold text-white border-white/20 rounded-2xl hover:bg-teal-600/30 hover:border-teal-400/50 flex flex-col gap-1"
                  >
                    <span>{room.nama}</span>
                    <span className="text-sm text-teal-300 font-normal">
                      {room.kode}
                    </span>
                  </Button>
                ))
              )}
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep('patient-found')}
              className="w-full h-14 text-lg text-white border-white/20 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Kembali
            </Button>
          </div>
        )}

        {/* SELECT DOCTOR */}
        {step === 'select-doctor' && (
          <div className="w-full max-w-3xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Pilih Dokter</h2>
              <p className="text-lg text-teal-300">
                {selectedRoom?.nama}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
              {doctors.length === 0 ? (
                <div className="col-span-2 text-center text-white/40 py-12 text-lg">
                  Tidak ada dokter yang tersedia di poli ini
                </div>
              ) : (
                doctors.map((doc) => (
                  <Button
                    key={doc.id}
                    variant="outline"
                    onClick={() => handleSelectDoctor(doc)}
                    className="h-24 text-lg font-semibold text-white border-white/20 rounded-2xl hover:bg-teal-600/30 hover:border-teal-400/50 flex flex-col gap-1"
                  >
                    <span>{doc.nama}</span>
                    <span className="text-sm text-teal-300 font-normal">
                      {doc.spesialisasi || 'Umum'}
                    </span>
                  </Button>
                ))
              )}
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep('select-poli')}
              className="w-full h-14 text-lg text-white border-white/20 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Kembali
            </Button>
          </div>
        )}

        {/* SELECT PENJAMIN */}
        {step === 'select-penjamin' && (
          <div className="w-full max-w-xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Pilih Jenis Pembayaran</h2>
              <p className="text-lg text-teal-300">
                Cara pembayaran kunjungan Anda
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { value: 'umum', label: 'Umum / Bayar Sendiri', desc: 'Pembayaran tunai atau kartu' },
                { value: 'bpjs', label: 'BPJS Kesehatan', desc: 'Menggunakan kartu BPJS' },
                { value: 'asuransi', label: 'Asuransi Swasta', desc: 'Menggunakan kartu asuransi' },
                { value: 'perusahaan', label: 'Perusahaan / Jaminan', desc: 'Ditanggung perusahaan' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  onClick={() => handleSelectPenjamin(opt.value)}
                  className="h-20 text-left text-white border-white/20 rounded-2xl hover:bg-teal-600/30 hover:border-teal-400/50 flex flex-col items-start px-8"
                >
                  <span className="text-xl font-semibold">{opt.label}</span>
                  <span className="text-sm text-teal-300 font-normal">{opt.desc}</span>
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep('select-doctor')}
              className="w-full h-14 text-lg text-white border-white/20 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Kembali
            </Button>
          </div>
        )}

        {/* CONFIRM */}
        {step === 'confirm' && (
          <div className="w-full max-w-xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Konfirmasi Pendaftaran</h2>
              <p className="text-lg text-teal-300">Periksa data berikut</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-8 space-y-4 border border-white/10">
              <ConfirmRow label="Pasien" value={patient?.nama ?? ''} />
              <ConfirmRow label="No. RM" value={patient?.no_rekam_medis ?? ''} />
              <ConfirmRow label="Poli" value={selectedRoom?.nama ?? ''} />
              <ConfirmRow label="Dokter" value={selectedDoctor?.nama ?? ''} />
              <ConfirmRow
                label="Pembayaran"
                value={
                  selectedPenjamin === 'umum'
                    ? 'Umum'
                    : selectedPenjamin === 'bpjs'
                      ? 'BPJS'
                      : selectedPenjamin === 'asuransi'
                        ? 'Asuransi'
                        : 'Perusahaan'
                }
              />
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep('select-penjamin')}
                className="flex-1 h-16 text-lg text-white border-white/20 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Kembali
              </Button>
              <Button
                size="lg"
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 h-16 text-lg bg-teal-600 hover:bg-teal-500 rounded-xl"
              >
                {loading ? (
                  <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <div className="w-full max-w-md space-y-8">
            {/* Printable ticket */}
            <div className="bg-white text-black rounded-2xl p-8 space-y-6 print:rounded-none print:shadow-none print:p-4">
              <div className="text-center border-b-2 border-dashed border-gray-300 pb-4">
                <div className="text-lg font-bold text-teal-700">SIMRS</div>
                <div className="text-sm text-gray-500">Tiket Antrian</div>
              </div>

              <div className="text-center space-y-2">
                <div className="text-sm text-gray-500 uppercase tracking-widest">
                  Nomor Antrian
                </div>
                <div className="text-8xl font-black text-teal-700 leading-none">
                  {ticket.nomorAntrian}
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2 text-sm">
                <TicketRow label="Pasien" value={ticket.patientNama} />
                <TicketRow label="No. RM" value={ticket.noRM} />
                <TicketRow label="No. Kunjungan" value={ticket.visitNumber} />
                <TicketRow label="Poli" value={ticket.roomNama} />
                <TicketRow label="Dokter" value={ticket.doctorNama} />
                <TicketRow
                  label="Pembayaran"
                  value={ticket.penjamin.toUpperCase()}
                />
              </div>

              <div className="border-t-2 border-dashed border-gray-300 pt-4 text-center text-xs text-gray-400">
                <div>{ticket.tanggal}</div>
                <div>Jam: {ticket.jam}</div>
                <div className="mt-2">
                  Harap menunggu nomor antrian Anda dipanggil
                </div>
              </div>
            </div>

            {/* Actions (hidden on print) */}
            <div className="flex gap-4 print:hidden">
              <Button
                size="lg"
                onClick={handlePrint}
                className="flex-1 h-16 text-lg bg-teal-600 hover:bg-teal-500 rounded-xl"
              >
                <Printer className="h-5 w-5 mr-2" />
                Cetak Tiket
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={resetAll}
                className="flex-1 h-16 text-lg text-white border-white/20 rounded-xl"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Selesai
              </Button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="w-full max-w-md text-center space-y-8">
            <AlertTriangle className="h-20 w-20 mx-auto text-yellow-400" />
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Terjadi Kesalahan</h2>
              <p className="text-lg text-yellow-300">{errorMsg}</p>
            </div>
            <Button
              size="lg"
              onClick={resetAll}
              className="h-16 px-12 text-lg bg-teal-600 hover:bg-teal-500 rounded-xl"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Mulai Ulang
            </Button>
          </div>
        )}
      </div>

      {/* LOADING OVERLAY */}
      {loading && step !== 'search' && step !== 'confirm' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 print:hidden">
          <div className="bg-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-3 border-teal-300/30 border-t-teal-400 rounded-full animate-spin" />
            <div className="text-lg text-white">Memuat...</div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="px-8 py-3 bg-black/30 text-center text-sm text-teal-300/50 print:hidden">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>
            Halaman ini akan kembali ke awal setelah 60 detik tidak ada aktivitas
          </span>
        </div>
      </div>
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
      <span className="text-teal-300">{label}</span>
      <span className="font-semibold text-lg">{value}</span>
    </div>
  )
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
