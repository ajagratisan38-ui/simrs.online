'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  AlertTriangle,
  Car,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  UserCheck,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { usePatients } from '@/hooks/use-patients'
import { BpjsPesertaInfo } from '@/components/bpjs/bpjs-peserta-info'
import { SepDetail } from '@/components/bpjs/sep-detail'
import { useCreateVisit } from '@/hooks/use-queues'
import { useRooms, useDoctors } from '@/hooks/use-queues'
import { useActiveSubstitute } from '@/hooks/use-doctors'
import { useBedsByRoom, useValidateKelas } from '@/hooks/use-inpatient'
import { useBpjsPeserta, useBpjsRujukan, useCreateSep, useSepQuotaCheck } from '@/hooks/use-bpjs'
import { useInsuranceDropdown, usePatientActiveInsurances } from '@/hooks/use-insurance'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Patient } from '@simrs/shared-types'
import type { BpjsSepData } from '@/lib/api/bpjs'
import { DateInput } from '@/components/ui/date-input'
import { SaveIndicator } from '@/components/ui/save-indicator'
import { useAutoSave } from '@/hooks/use-auto-save'

const STEPS = ['Pilih Pasien', 'Detail Kunjungan', 'Penjamin']

interface TicketData {
  visitNumber: string
  nomorAntrian: number
  patientNama: string
  roomNama: string
  doctorNama: string
  penjamin: string
  noSep?: string
  isLakaLantas?: boolean
}

export function RegistrationForm() {
  const [step, setStep] = useState(0)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)

  // Form state
  const [tipe, setTipe] = useState<'rawat_jalan' | 'igd' | 'rawat_inap'>('rawat_jalan')
  const [roomId, setRoomId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [bedId, setBedId] = useState('')
  const [keluhanUtama, setKeluhanUtama] = useState('')
  const [caraMasuk, setCaraMasuk] = useState('datang_sendiri')
  const [noRujukan, setNoRujukan] = useState('')
  const [penjamin, setPenjamin] = useState('umum')
  const [insuranceId, setInsuranceId] = useState('')
  const [noSep, setNoSep] = useState('')
  const [createdSep, setCreatedSep] = useState<BpjsSepData | null>(null)

  // Laka Lantas state
  const [isLakaLantas, setIsLakaLantas] = useState(false)
  const [lakaExpanded, setLakaExpanded] = useState(false)
  const [lakaPenjamin, setLakaPenjamin] = useState('1') // 1=Jasa Raharja
  const [lakaTglKejadian, setLakaTglKejadian] = useState('')
  const [lakaKeterangan, setLakaKeterangan] = useState('')
  const [lakaNoLP, setLakaNoLP] = useState('')
  const [lakaPropinsi, setLakaPropinsi] = useState('')
  const [lakaKabupaten, setLakaKabupaten] = useState('')
  const [lakaKecamatan, setLakaKecamatan] = useState('')

  // Patient search for step 0
  const [patientSearch, setPatientSearch] = useState('')
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPatientSearch(patientSearch), 400)
    return () => clearTimeout(t)
  }, [patientSearch])
  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    search: debouncedPatientSearch,
    limit: 20,
    page: 1,
  })
  const patientsList = patientsData?.data ?? []

  const createVisit = useCreateVisit()
  const createSep = useCreateSep()
  const { saveState, markSaving, markSaved, markOffline, markError } = useAutoSave()

  // Lookup data
  const roomTipe = tipe === 'rawat_jalan' ? 'poli' : tipe === 'igd' ? 'igd' : 'rawat_inap'
  const { data: roomsData } = useRooms(roomTipe)
  const { data: doctorsData } = useDoctors(roomId || undefined)

  const rooms = roomsData?.data ?? []
  const doctors = doctorsData?.data ?? []

  // Check if selected doctor has active substitution
  const selectedDoctor = doctors.find((d) => d.id === doctorId)
  const doctorUnavailable = selectedDoctor && !selectedDoctor.is_available
  const { data: activeSubRes } = useActiveSubstitute(
    doctorUnavailable ? doctorId : '',
  )
  const activeSub = activeSubRes?.data

  // Bed data (only for rawat_inap)
  const { data: bedsInRoom } = useBedsByRoom(
    tipe === 'rawat_inap' && roomId ? roomId : null,
  )
  const availableBeds = bedsInRoom?.filter((b) => b.status === 'tersedia') ?? []

  // Auto-select bed if only one available
  useEffect(() => {
    if (tipe === 'rawat_inap' && availableBeds.length === 1 && !bedId) {
      setBedId(availableBeds[0].id)
    }
    // Clear bedId if selected bed no longer in available list
    if (bedId && availableBeds.length > 0 && !availableBeds.find((b) => b.id === bedId)) {
      setBedId('')
    }
  }, [availableBeds, tipe, bedId])

  // BPJS auto-check
  const noBpjs = selectedPatient?.no_bpjs || undefined
  const {
    data: pesertaRes,
    isLoading: pesertaLoading,
    isError: pesertaError,
    error: pesertaErr,
  } = useBpjsPeserta(penjamin === 'bpjs' ? noBpjs : undefined)
  const peserta = pesertaRes?.data

  // BPJS kelas validation (rawat_inap + BPJS)
  const hakKelasLive = peserta?.jnsKelas?.kode
    ? Number(peserta.jnsKelas.kode)
    : null
  const hakKelasFromPatient = selectedPatient?.kelas_bpjs ?? null
  const hakKelasForValidation =
    tipe === 'rawat_inap' && penjamin === 'bpjs' && roomId
      ? (hakKelasLive ?? hakKelasFromPatient)
      : null
  const { data: kelasValidation } = useValidateKelas(
    hakKelasForValidation !== null ? roomId : null,
    hakKelasForValidation,
  )

  // SEP quota check (active when penjamin is BPJS)
  const isIGDVisit = tipe === 'igd'
  const { data: sepQuotaRes } = useSepQuotaCheck(isIGDVisit, penjamin === 'bpjs')
  const sepQuota = sepQuotaRes?.data

  // BPJS rujukan auto-check
  const {
    data: rujukanRes,
    isLoading: rujukanLoading,
  } = useBpjsRujukan(penjamin === 'bpjs' ? noBpjs : undefined)
  const rujukanList = rujukanRes?.data ?? []

  // Insurance dropdown & patient active insurance
  const { data: insDropdownRes } = useInsuranceDropdown()
  const insuranceOptions = insDropdownRes?.data ?? []
  const { data: patientInsRes } = usePatientActiveInsurances(
    (penjamin === 'asuransi' || penjamin === 'perusahaan') && selectedPatient
      ? selectedPatient.id
      : '',
  )
  const patientInsurances = patientInsRes?.data ?? []

  // When penjamin changes away from BPJS, reset SEP state
  useEffect(() => {
    if (penjamin !== 'bpjs') {
      setNoSep('')
      setCreatedSep(null)
    }
    if (penjamin !== 'asuransi' && penjamin !== 'perusahaan') {
      setInsuranceId('')
    }
  }, [penjamin])

  // Auto-expand laka lantas section when toggled on
  useEffect(() => {
    if (isLakaLantas) {
      setLakaExpanded(true)
      if (!lakaTglKejadian) {
        const today = new Date().toISOString().slice(0, 10)
        setLakaTglKejadian(today)
      }
    }
  }, [isLakaLantas]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePatientSelect(patient: Patient) {
    setSelectedPatient(patient)
    setStep(1)
  }

  function clearPatient() {
    setSelectedPatient(null)
    setStep(0)
  }

  function canGoNext(): boolean {
    if (step === 0) return !!selectedPatient
    if (step === 1) {
      const baseOk = tipe === 'rawat_inap'
        ? !!roomId && !!doctorId && !!bedId
        : !!roomId && !!doctorId
      // Laka lantas: must fill required fields before proceeding
      if (isLakaLantas) {
        if (!lakaTglKejadian || !lakaKeterangan || lakaKeterangan.length < 3) return false
      }
      return baseOk
    }
    if (step === 2) {
      if (penjamin === 'bpjs') {
        // Block if SEP quota exceeded (except IGD)
        if (sepQuota && !sepQuota.allowed) return false
        // Need either existing SEP or active peserta
        if (!noSep && !createdSep) {
          // Must have an active peserta to auto-create SEP
          return !!peserta?.aktif
        }
        return true
      }
      if ((penjamin === 'asuransi' || penjamin === 'perusahaan') && !insuranceId) {
        return false
      }
      return true
    }
    return false
  }

  async function handleSubmit() {
    if (!selectedPatient) return

    markSaving()

    try {
      let finalNoSep = noSep

      // Auto-create SEP if BPJS and no SEP yet
      if (penjamin === 'bpjs' && !noSep && !createdSep && peserta?.aktif) {
        const selectedRoom = rooms.find((r) => r.id === roomId)

        const sepInput: Record<string, unknown> = {
          noKartu: peserta.noKartu,
          tglSep: new Date().toISOString().slice(0, 10),
          ppkPelayanan: peserta.kdProviderPst?.kdProvider || '',
          jnsPelayanan: '2',
          klsRawatHak: peserta.jnsKelas?.kode || '3',
          noMR: selectedPatient.no_rekam_medis || '',
          diagAwal: '',
          poliTujuan: selectedRoom?.kode || '',
          noTelp: peserta.noHP || selectedPatient.no_telepon || '0',
          user: 'pendaftaran',
        }

        // Wire laka lantas data into SEP creation
        if (isLakaLantas) {
          sepInput.jaminanLakaLantas = {
            penjamin: lakaPenjamin,
            tglKejadian: lakaTglKejadian,
            keterangan: lakaKeterangan,
            noSEPSuplesi: '',
            kdPropinsi: lakaPropinsi,
            kdKabupaten: lakaKabupaten,
            kdKecamatan: lakaKecamatan,
          }
        }

        const sepResult = await createSep.mutateAsync(
          sepInput as unknown as Parameters<typeof createSep.mutateAsync>[0],
        )

        if (sepResult.data) {
          setCreatedSep(sepResult.data)
          finalNoSep = sepResult.data.noSep
          setNoSep(finalNoSep)
        }
      }

      // Create visit
      const data: Record<string, unknown> = {
        patient_id: selectedPatient.id,
        tipe,
        room_id: roomId,
        doctor_id: doctorId,
        cara_masuk: caraMasuk,
        penjamin,
        is_laka_lantas: isLakaLantas,
      }
      if (tipe === 'rawat_inap' && bedId) data.bed_id = bedId
      if (keluhanUtama.trim()) data.keluhan_utama = keluhanUtama.trim()
      if (caraMasuk === 'rujukan' && noRujukan.trim()) data.no_rujukan = noRujukan.trim()
      if (penjamin === 'bpjs' && finalNoSep) data.no_sep = finalNoSep
      if ((penjamin === 'asuransi' || penjamin === 'perusahaan') && insuranceId) {
        data.insurance_id = insuranceId
      }

      // Attach laka lantas data
      if (isLakaLantas) {
        data.laka_lantas_data = {
          penjamin_laka: lakaPenjamin,
          tgl_kejadian: lakaTglKejadian,
          keterangan: lakaKeterangan,
          no_lp_polisi: lakaNoLP || undefined,
          lokasi_propinsi: lakaPropinsi || undefined,
          lokasi_kabupaten: lakaKabupaten || undefined,
          lokasi_kecamatan: lakaKecamatan || undefined,
        }
      }

      const selectedRoom = rooms.find((r) => r.id === roomId)
      const submitDoctor = doctors.find((d) => d.id === doctorId)

      const res = await new Promise<{ success: boolean; data: unknown }>((resolve, reject) => {
        createVisit.mutate(data, {
          onSuccess: resolve,
          onError: reject,
        })
      })

      if (navigator.onLine) {
        markSaved()
      } else {
        markOffline()
      }

      const resData = res.data as Record<string, unknown> | undefined
      const visit = resData?.visit as Record<string, unknown> | undefined
      const queue = resData?.queue as Record<string, unknown> | undefined

      setTicketData({
        visitNumber: (visit?.visit_number as string) ?? '',
        nomorAntrian: (queue?.nomor_antrian as number) ?? 0,
        patientNama: selectedPatient.nama,
        roomNama: selectedRoom?.nama ?? '',
        doctorNama: activeSub ? (activeSub.substitute_nama ?? submitDoctor?.nama ?? '') : (submitDoctor?.nama ?? ''),
        penjamin,
        noSep: finalNoSep || undefined,
        isLakaLantas,
      })
      setTicketOpen(true)
      toast.success('Pendaftaran berhasil')

      // Reset form
      setSelectedPatient(null)
      setStep(0)
      setTipe('rawat_jalan')
      setRoomId('')
      setDoctorId('')
      setBedId('')
      setKeluhanUtama('')
      setCaraMasuk('datang_sendiri')
      setNoRujukan('')
      setPenjamin('umum')
      setNoSep('')
      setCreatedSep(null)
      setIsLakaLantas(false)
      setLakaExpanded(false)
      setLakaPenjamin('1')
      setLakaTglKejadian('')
      setLakaKeterangan('')
      setLakaNoLP('')
      setLakaPropinsi('')
      setLakaKabupaten('')
      setLakaKecamatan('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mendaftarkan'
      markError(message)
      toast.error(message)
    }
  }

  const isSubmitting = createVisit.isPending || createSep.isPending

  return (
    <>
      {/* Save indicator */}
      <div className="flex justify-end mb-2">
        <SaveIndicator state={saveState} />
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                'flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium shrink-0',
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className="hidden sm:block text-xs truncate">{s}</span>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px flex-1', i < step ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Pilih Pasien */}
      {step === 0 && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Cari nama, NIK, atau No RM..."
              className="pl-10"
            />
          </div>

          {/* Selected patient banner */}
          {selectedPatient && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-primary bg-primary/5">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{selectedPatient.nama}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedPatient.no_rekam_medis} · NIK: {selectedPatient.nik}
                  {selectedPatient.no_bpjs && ` · BPJS: ${selectedPatient.no_bpjs}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearPatient} className="shrink-0 text-xs">
                Ganti
              </Button>
            </div>
          )}

          {/* Patient list */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {patientsLoading ? 'Memuat...' : `${patientsData?.meta?.total ?? patientsList.length} pasien`}
                  {debouncedPatientSearch && ` · Hasil pencarian "${debouncedPatientSearch}"`}
                </span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <Link href="/pasien/baru">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Pasien Baru
                </Link>
              </Button>
            </div>

            <div className="max-h-[340px] overflow-y-auto divide-y">
              {patientsLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Memuat data pasien...
                </div>
              ) : patientsList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {debouncedPatientSearch ? 'Pasien tidak ditemukan' : 'Belum ada data pasien'}
                  </p>
                </div>
              ) : (
                patientsList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePatientSelect(p)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-muted/50',
                      selectedPatient?.id === p.id && 'bg-primary/5 border-l-2 border-l-primary',
                    )}
                  >
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      selectedPatient?.id === p.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      {p.nama.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        selectedPatient?.id === p.id && 'text-primary',
                      )}>
                        {p.nama}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.no_rekam_medis} · NIK: {p.nik}
                        {p.no_bpjs && (
                          <span className="ml-1">
                            · <CreditCard className="h-2.5 w-2.5 inline" /> {p.no_bpjs}
                          </span>
                        )}
                      </p>
                    </div>
                    {selectedPatient?.id === p.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Detail Kunjungan */}
      {step === 1 && (
        <div className="space-y-4">
          {selectedPatient && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm">
              <span className="font-medium">{selectedPatient.nama}</span>
              <span className="text-muted-foreground">({selectedPatient.no_rekam_medis})</span>
            </div>
          )}

          {/* Tipe kunjungan */}
          <div className="space-y-2">
            <Label>Tipe Kunjungan</Label>
            <div className="flex gap-3">
              {([
                { val: 'rawat_jalan' as const, label: 'Rawat Jalan' },
                { val: 'igd' as const, label: 'IGD' },
                { val: 'rawat_inap' as const, label: 'Rawat Inap' },
              ]).map(({ val, label }) => (
                <label
                  key={val}
                  className={cn(
                    'flex-1 flex items-center justify-center px-4 py-3 rounded-md border cursor-pointer text-sm transition-colors',
                    tipe === val
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="tipe"
                    value={val}
                    checked={tipe === val}
                    onChange={() => {
                      setTipe(val)
                      setRoomId('')
                      setDoctorId('')
                      setBedId('')
                    }}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Poli / Ruangan */}
          <div className="space-y-2">
            <Label htmlFor="room_id">
              {tipe === 'rawat_jalan' ? 'Poli' : tipe === 'igd' ? 'Ruangan IGD' : 'Ruangan Rawat Inap'} *
            </Label>
            <Select
              id="room_id"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value)
                setDoctorId('')
                setBedId('')
              }}
            >
              <option value="">
                Pilih {tipe === 'rawat_jalan' ? 'poli' : tipe === 'igd' ? 'ruangan' : 'ruangan rawat inap'}...
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.kode} — {r.nama}
                  {tipe === 'rawat_inap' && r.tarif_per_hari
                    ? ` (${formatRupiah(r.tarif_per_hari)}/hari${r.kelas ? ` · Kelas ${r.kelas}` : ''})`
                    : ''}
                </option>
              ))}
            </Select>
          </div>

          {/* Bed (rawat inap) */}
          {tipe === 'rawat_inap' && roomId && (
            <div className="space-y-2">
              <Label htmlFor="bed_id">Tempat Tidur (Bed) *</Label>
              {availableBeds.length === 0 ? (
                <p className="text-sm text-amber-600 py-2">
                  Tidak ada bed tersedia di ruangan ini. Pilih ruangan lain.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableBeds.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBedId(b.id)}
                      className={cn(
                        'rounded-lg border-2 p-2.5 text-xs font-medium transition-all text-center',
                        bedId === b.id
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm'
                          : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-primary/50 hover:bg-primary/5 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
                      )}
                    >
                      {b.nomor}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BPJS Kelas Validation Warning */}
          {tipe === 'rawat_inap' && penjamin === 'bpjs' && roomId && kelasValidation && kelasValidation.pesanWarning && (
            <Card className={
              kelasValidation.selisih === 'naik_kelas'
                ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'
                : 'border-orange-300 bg-orange-50 dark:bg-orange-950/30'
            }>
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                    kelasValidation.selisih === 'naik_kelas'
                      ? 'text-amber-600'
                      : 'text-orange-600'
                  }`} />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">
                      {kelasValidation.selisih === 'naik_kelas'
                        ? 'Naik Kelas Rawat'
                        : 'Turun Kelas Rawat'}
                    </p>
                    <p className={
                      kelasValidation.selisih === 'naik_kelas'
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-orange-700 dark:text-orange-300'
                    }>
                      {kelasValidation.pesanWarning}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-[10px]">
                        Hak: {kelasValidation.kelasNama.hak}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className={`text-[10px] ${
                        kelasValidation.selisih === 'naik_kelas'
                          ? 'border-amber-400 bg-amber-100 text-amber-700'
                          : 'border-orange-400 bg-orange-100 text-orange-700'
                      }`}>
                        Ruangan: {kelasValidation.kelasNama.room}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kelas match confirmation */}
          {tipe === 'rawat_inap' && penjamin === 'bpjs' && roomId && kelasValidation && !kelasValidation.pesanWarning && kelasValidation.roomKelas !== null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Kelas ruangan sesuai dengan hak kelas BPJS pasien ({kelasValidation.kelasNama.hak})
              </p>
            </div>
          )}

          {/* Dokter */}
          <div className="space-y-2">
            <Label htmlFor="doctor_id">Dokter *</Label>
            <Select
              id="doctor_id"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={!roomId}
            >
              <option value="">Pilih dokter...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                  {d.spesialisasi ? ` (${d.spesialisasi})` : ''}
                  {!d.is_available ? ' ⚠ Cuti' : ''}
                </option>
              ))}
            </Select>

            {/* Substitution info banner */}
            {doctorUnavailable && activeSub && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <UserCheck className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {selectedDoctor?.nama} sedang berhalangan
                  </p>
                  <p className="text-amber-600 dark:text-amber-500 mt-0.5">
                    Akan ditangani oleh{' '}
                    <span className="font-semibold">{activeSub.substitute_nama}</span>
                    {activeSub.substitute_spesialisasi && (
                      <span> ({activeSub.substitute_spesialisasi})</span>
                    )}
                  </p>
                  <p className="text-amber-500 dark:text-amber-600 mt-0.5">
                    Periode: {new Date(activeSub.tanggal_mulai).toLocaleDateString('id-ID')} — {new Date(activeSub.tanggal_selesai).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            )}
            {doctorUnavailable && !activeSub && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-red-700 dark:text-red-400">
                    {selectedDoctor?.nama} sedang tidak tersedia
                  </p>
                  <p className="text-red-600 dark:text-red-500 mt-0.5">
                    Belum ada dokter pengganti yang ditunjuk. Silakan pilih dokter lain.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Keluhan utama */}
          <div className="space-y-2">
            <Label htmlFor="keluhan">Keluhan Utama</Label>
            <Textarea
              id="keluhan"
              value={keluhanUtama}
              onChange={(e) => setKeluhanUtama(e.target.value)}
              placeholder="Keluhan yang dialami pasien"
              rows={2}
            />
          </div>

          {/* Cara masuk */}
          <div className="space-y-2">
            <Label htmlFor="cara_masuk">Cara Masuk</Label>
            <Select
              id="cara_masuk"
              value={caraMasuk}
              onChange={(e) => setCaraMasuk(e.target.value)}
            >
              <option value="datang_sendiri">Datang Sendiri</option>
              <option value="rujukan">Rujukan</option>
              <option value="kontrol">Kontrol</option>
            </Select>
          </div>

          {caraMasuk === 'rujukan' && (
            <div className="space-y-2">
              <Label htmlFor="no_rujukan">No. Rujukan</Label>
              <Input
                id="no_rujukan"
                value={noRujukan}
                onChange={(e) => setNoRujukan(e.target.value)}
                placeholder="Nomor rujukan"
              />
            </div>
          )}

          {/* Laka Lantas (Kecelakaan Lalu Lintas) */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                if (!isLakaLantas) {
                  setIsLakaLantas(true)
                } else {
                  setLakaExpanded(!lakaExpanded)
                }
              }}
              className={cn(
                'flex items-center justify-between w-full px-4 py-3 text-sm transition-colors',
                isLakaLantas
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                  : 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30',
              )}
            >
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-600" />
                <span className="font-medium">Kecelakaan Lalu Lintas (Laka Lantas)</span>
                {isLakaLantas && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5">AKTIF</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isLakaLantas ? (
                  <span className="text-xs text-muted-foreground">Klik untuk mengaktifkan</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsLakaLantas(false)
                        setLakaExpanded(false)
                        setLakaTglKejadian('')
                        setLakaKeterangan('')
                        setLakaNoLP('')
                        setLakaPropinsi('')
                        setLakaKabupaten('')
                        setLakaKecamatan('')
                        setLakaPenjamin('1')
                      }}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Nonaktifkan
                    </button>
                    {lakaExpanded ? (
                      <ChevronUp className="h-4 w-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-amber-600" />
                    )}
                  </>
                )}
              </div>
            </button>

            {isLakaLantas && lakaExpanded && (
              <div className="p-4 space-y-4 border-t border-amber-200 dark:border-amber-800 bg-white dark:bg-background">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Wajib diisi jika pasien datang karena kecelakaan lalu lintas.
                  Data ini diperlukan untuk klaim Jasa Raharja dan pelaporan.
                </p>

                {/* Row 1: Tanggal + Penjamin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="laka_tgl">Tanggal Kejadian *</Label>
                    <DateInput
                      id="laka_tgl"
                      value={lakaTglKejadian}
                      onChange={(val) => setLakaTglKejadian(val)}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laka_penjamin">Penjamin Laka *</Label>
                    <Select
                      id="laka_penjamin"
                      value={lakaPenjamin}
                      onChange={(e) => setLakaPenjamin(e.target.value)}
                    >
                      <option value="1">Jasa Raharja PT</option>
                      <option value="2">BPJS Ketenagakerjaan</option>
                      <option value="3">TASPEN PT</option>
                      <option value="4">ASABRI PT</option>
                      <option value="0">Tidak Ada Penjamin</option>
                    </Select>
                  </div>
                </div>

                {/* Keterangan / Kronologi */}
                <div className="space-y-2">
                  <Label htmlFor="laka_ket">Keterangan / Kronologi Kejadian *</Label>
                  <Textarea
                    id="laka_ket"
                    value={lakaKeterangan}
                    onChange={(e) => setLakaKeterangan(e.target.value)}
                    placeholder="Uraikan kronologi kecelakaan: kapan, dimana, bagaimana kejadiannya"
                    rows={3}
                  />
                  {isLakaLantas && lakaKeterangan.length > 0 && lakaKeterangan.length < 3 && (
                    <p className="text-xs text-red-500">Keterangan minimal 3 karakter</p>
                  )}
                </div>

                {/* No. LP Kepolisian */}
                <div className="space-y-2">
                  <Label htmlFor="laka_lp">No. LP Kepolisian</Label>
                  <Input
                    id="laka_lp"
                    value={lakaNoLP}
                    onChange={(e) => setLakaNoLP(e.target.value)}
                    placeholder="Nomor laporan polisi (opsional)"
                  />
                </div>

                {/* Lokasi Kejadian */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Lokasi Kejadian
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="laka_prop" className="text-xs">Propinsi</Label>
                      <Input
                        id="laka_prop"
                        value={lakaPropinsi}
                        onChange={(e) => setLakaPropinsi(e.target.value)}
                        placeholder="Kode propinsi"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="laka_kab" className="text-xs">Kabupaten</Label>
                      <Input
                        id="laka_kab"
                        value={lakaKabupaten}
                        onChange={(e) => setLakaKabupaten(e.target.value)}
                        placeholder="Kode kabupaten"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="laka_kec" className="text-xs">Kecamatan</Label>
                      <Input
                        id="laka_kec"
                        value={lakaKecamatan}
                        onChange={(e) => setLakaKecamatan(e.target.value)}
                        placeholder="Kode kecamatan"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kode lokasi sesuai referensi BPJS (opsional, diperlukan untuk klaim)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Penjamin (with BPJS integration) */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Penjamin</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['umum', 'bpjs', 'asuransi', 'perusahaan'] as const).map((p) => (
                <label
                  key={p}
                  className={cn(
                    'flex items-center justify-center px-3 py-2.5 rounded-md border cursor-pointer text-sm transition-colors',
                    penjamin === p
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'hover:bg-muted',
                  )}
                >
                  <input
                    type="radio"
                    name="penjamin"
                    value={p}
                    checked={penjamin === p}
                    onChange={() => setPenjamin(p)}
                    className="sr-only"
                  />
                  {p === 'umum' ? 'Umum'
                    : p === 'bpjs' ? 'BPJS'
                    : p === 'asuransi' ? 'Asuransi'
                    : 'Perusahaan'}
                </label>
              ))}
            </div>
          </div>

          {/* Insurance/Perusahaan selection */}
          {(penjamin === 'asuransi' || penjamin === 'perusahaan') && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>
                  {penjamin === 'asuransi' ? 'Pilih Asuransi' : 'Pilih Perusahaan'}
                </Label>
                <Select
                  value={insuranceId}
                  onChange={(e) => setInsuranceId(e.target.value)}
                >
                  <option value="">
                    -- Pilih {penjamin === 'asuransi' ? 'Asuransi' : 'Perusahaan'} --
                  </option>
                  {insuranceOptions
                    .filter((ins) =>
                      penjamin === 'asuransi'
                        ? ins.tipe === 'asuransi' || ins.tipe === 'yayasan'
                        : ins.tipe === 'perusahaan' || ins.tipe === 'kerjasama',
                    )
                    .map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nama} ({ins.kode})
                      </option>
                    ))}
                </Select>
              </div>
              {patientInsurances.length > 0 && (
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                      Kepesertaan Asuransi Pasien:
                    </p>
                    <div className="space-y-1">
                      {patientInsurances.map((pi) => (
                        <button
                          key={pi.id}
                          type="button"
                          onClick={() => setInsuranceId(pi.insurance_id)}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
                            insuranceId === pi.insurance_id
                              ? 'bg-blue-200 dark:bg-blue-800 font-medium'
                              : 'hover:bg-blue-100 dark:hover:bg-blue-900/40',
                          )}
                        >
                          <span className="font-medium">{pi.insurance_nama}</span>
                          <span className="text-muted-foreground ml-2">
                            No. Polis: {pi.no_polis}
                            {pi.kelas ? ` · Kelas ${pi.kelas}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {!insuranceId && (
                <p className="text-xs text-amber-600">
                  Pilih asuransi/perusahaan untuk melanjutkan
                </p>
              )}
            </div>
          )}

          {/* SEP Quota Status */}
          {penjamin === 'bpjs' && sepQuota && !sepQuota.quota.isUnlimited && (
            <Card className={
              !sepQuota.allowed
                ? 'border-red-300 bg-red-50 dark:bg-red-950/30'
                : sepQuota.message
                  ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'
                  : 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
            }>
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  {!sepQuota.allowed ? (
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  ) : sepQuota.message ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-xs font-semibold ${
                        !sepQuota.allowed
                          ? 'text-red-700 dark:text-red-300'
                          : sepQuota.message
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-emerald-700 dark:text-emerald-300'
                      }`}>
                        Kuota SEP Hari Ini
                      </p>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {sepQuota.quota.used} / {sepQuota.quota.limit}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          !sepQuota.allowed
                            ? 'bg-red-500'
                            : sepQuota.quota.remaining <= 5
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (sepQuota.quota.used / sepQuota.quota.limit) * 100)}%`,
                        }}
                      />
                    </div>
                    {sepQuota.message && (
                      <p className={`text-xs ${
                        !sepQuota.allowed
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {sepQuota.message}
                      </p>
                    )}
                    {!sepQuota.message && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Sisa kuota: {sepQuota.quota.remaining} SEP
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BPJS Section */}
          {penjamin === 'bpjs' && (
            <div className="space-y-4">
              {/* No BPJS warning */}
              {!selectedPatient?.no_bpjs && (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
                  <CardContent className="pt-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Pasien belum memiliki No. BPJS. Tambahkan melalui halaman edit pasien
                      atau ganti penjamin.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* BPJS Peserta Info (auto-fetched) */}
              {selectedPatient?.no_bpjs && (
                <BpjsPesertaInfo
                  peserta={peserta}
                  isLoading={pesertaLoading}
                  isError={pesertaError}
                  errorMessage={pesertaErr?.message}
                  expectedKelas={selectedPatient.kelas_bpjs ?? undefined}
                />
              )}

              {/* Rujukan list */}
              {rujukanLoading && (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengecek rujukan...
                </div>
              )}
              {rujukanList.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Rujukan Aktif ({rujukanList.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {rujukanList.slice(0, 3).map((ruj, i) => (
                      <div
                        key={i}
                        className="p-2 border rounded-md text-xs space-y-1 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => setNoRujukan(ruj.noKunjungan)}
                      >
                        <div className="flex justify-between">
                          <span className="font-mono font-medium">{ruj.noKunjungan}</span>
                          <span className="text-muted-foreground">{ruj.tglKunjungan}</span>
                        </div>
                        <p className="text-muted-foreground">
                          {ruj.diagnosa?.nama} · {ruj.provPerujuk?.nama}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* SEP section */}
              {createdSep ? (
                <SepDetail sep={createdSep} compact />
              ) : (
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="no_sep">No. SEP (opsional)</Label>
                      <Input
                        id="no_sep"
                        value={noSep}
                        onChange={(e) => setNoSep(e.target.value)}
                        placeholder="Kosongkan untuk auto-generate saat submit"
                      />
                      <p className="text-xs text-muted-foreground">
                        Jika dikosongkan, SEP akan otomatis dibuat saat pendaftaran.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Kembali
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext()}
          >
            Lanjut
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!canGoNext() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                {createSep.isPending ? 'Membuat SEP...' : 'Mendaftar...'}
              </>
            ) : (
              'Daftarkan'
            )}
          </Button>
        )}
      </div>

      {/* Ticket Modal (preview only — not printed) */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogClose onClose={() => setTicketOpen(false)} />
        <DialogHeader>
          <DialogTitle className="text-center">Pendaftaran Berhasil</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {ticketData && (
            <TicketPreview data={ticketData} />
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setTicketOpen(false)}>
            Tutup
          </Button>
          <Button onClick={() => window.print()}>
            Cetak
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Hidden print container — portaled to body so it's outside <main> */}
      {ticketOpen && ticketData && typeof document !== 'undefined' && createPortal(
        <div id="ticket-print" className="hidden">
          <TicketPrintLayout data={ticketData} />
        </div>,
        document.body,
      )}
    </>
  )
}

// ==================== TICKET PREVIEW (screen) ====================

function TicketPreview({ data }: { data: TicketData }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="text-center space-y-4">
      <p className="text-xs text-muted-foreground">{dateStr}, {timeStr}</p>

      <div className="py-4">
        <p className="text-sm text-muted-foreground mb-1">Nomor Antrian</p>
        <p className="text-7xl font-bold text-primary leading-none">
          {data.nomorAntrian}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <InfoRow label="No. Kunjungan" value={data.visitNumber} mono />
        <InfoRow label="Pasien" value={data.patientNama} />
        <InfoRow label="Poli" value={data.roomNama} />
        <InfoRow label="Dokter" value={data.doctorNama} />
        <InfoRow label="Penjamin" value={data.penjamin.toUpperCase()} />
        {data.noSep && <InfoRow label="No. SEP" value={data.noSep} mono />}
        {data.isLakaLantas && (
          <div className="flex justify-between py-1.5 border-b">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-amber-500 text-white text-xs">Laka Lantas</Badge>
          </div>
        )}
        <InfoRow
          label="Est. Tunggu"
          value={`±${Math.max(data.nomorAntrian, 1) * 10} menit`}
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

// ==================== TICKET PRINT LAYOUT (thermal 80mm) ====================

function TicketPrintLayout({ data }: { data: TicketData }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="ticket-thermal">
      {/* Header */}
      <div className="ticket-header">
        <h1>SIMRS</h1>
        <p>Sistem Informasi Manajemen Rumah Sakit</p>
      </div>

      {/* Date/time */}
      <div className="ticket-datetime">
        {dateStr}, {timeStr}
      </div>

      {/* Queue number */}
      <div className="ticket-number">
        <p className="ticket-number-label">NOMOR ANTRIAN</p>
        <p className="ticket-number-value">{data.nomorAntrian}</p>
      </div>

      {/* Separator */}
      <div className="ticket-separator" />

      {/* Info rows */}
      <div className="ticket-info">
        <div className="ticket-row">
          <span>No. Kunjungan</span>
          <span>{data.visitNumber}</span>
        </div>
        <div className="ticket-row">
          <span>Pasien</span>
          <span>{data.patientNama}</span>
        </div>
        <div className="ticket-row">
          <span>Poli</span>
          <span>{data.roomNama}</span>
        </div>
        <div className="ticket-row">
          <span>Dokter</span>
          <span>{data.doctorNama}</span>
        </div>
        <div className="ticket-row">
          <span>Penjamin</span>
          <span>{data.penjamin.toUpperCase()}</span>
        </div>
        {data.noSep && (
          <div className="ticket-row">
            <span>No. SEP</span>
            <span>{data.noSep}</span>
          </div>
        )}
        {data.isLakaLantas && (
          <div className="ticket-row">
            <span>Status</span>
            <span>** LAKA LANTAS **</span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="ticket-separator" />

      {/* Footer */}
      <div className="ticket-footer">
        <p>Est. waktu tunggu: ±{Math.max(data.nomorAntrian, 1) * 10} menit</p>
        <p>Mohon menunggu di ruang tunggu</p>
        <p>Terima kasih</p>
      </div>
    </div>
  )
}
