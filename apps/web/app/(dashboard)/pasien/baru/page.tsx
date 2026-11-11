'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPatientSchema, type CreatePatientInput } from '@simrs/validators'
import { useCreatePatient, useDuplicateCheck } from '@/hooks/use-patients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { SaveIndicator } from '@/components/ui/save-indicator'
import { useAutoSave } from '@/hooks/use-auto-save'

const STEPS = [
  { title: 'Data Identitas', description: 'NIK, nama, tanggal lahir' },
  { title: 'Kontak & Alamat', description: 'Alamat, telepon, email' },
  { title: 'Data Tambahan', description: 'Pekerjaan, keluarga, BPJS' },
]

export default function TambahPasienPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const createMutation = useCreatePatient()
  const dupCheck = useDuplicateCheck()
  const { saveState, markSaving, markSaved, markOffline, markError } = useAutoSave()
  const [dupResult, setDupResult] = useState<{
    isDuplicate: boolean
    patient?: { id: string; nama: string; no_rekam_medis: string } | null
  } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      jenis_kelamin: 'L',
    },
  })

  const nikValue = watch('nik')

  // Debounced duplicate check for NIK
  const checkNik = useCallback(
    (nik: string) => {
      if (nik && /^\d{16}$/.test(nik)) {
        dupCheck.mutate(nik, {
          onSuccess: (res) => setDupResult(res.data),
        })
      } else {
        setDupResult(null)
      }
    },
    [dupCheck],
  )

  useEffect(() => {
    const timer = setTimeout(() => checkNik(nikValue ?? ''), 500)
    return () => clearTimeout(timer)
  }, [nikValue, checkNik])

  // Validasi per step sebelum next
  const stepFields: (keyof CreatePatientInput)[][] = [
    ['nik', 'nama', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin'],
    ['alamat'],
    [],
  ]

  async function handleNext() {
    const fields = stepFields[step]
    if (fields && fields.length > 0) {
      const valid = await trigger(fields)
      if (!valid) return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function handlePrev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function onSubmit(data: CreatePatientInput) {
    // Bersihkan null/undefined
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null && val !== '') {
        cleaned[key] = val
      }
    }

    markSaving()
    createMutation.mutate(cleaned, {
      onSuccess: (res) => {
        if (navigator.onLine) {
          markSaved(`Pasien "${res.data?.nama}" berhasil didaftarkan`)
        } else {
          markOffline()
        }
        router.push('/pasien')
      },
      onError: (err) => {
        markError(err.message)
      },
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pasien"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Tambah Pasien Baru</h1>
          <p className="text-muted-foreground">Isi data lengkap pasien</p>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium shrink-0',
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-xs font-medium truncate">{s.title}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px flex-1', i < step ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Duplicate warning */}
      {dupResult?.isDuplicate && dupResult.patient && (
        <div className="flex items-start gap-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Pasien dengan NIK ini sudah terdaftar
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {dupResult.patient.nama} — {dupResult.patient.no_rekam_medis}
            </p>
            <Link
              href={`/pasien/${dupResult.patient.id}`}
              className="text-sm text-primary underline mt-1 inline-block"
            >
              Lihat data pasien →
            </Link>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]?.title}</CardTitle>
            <CardDescription>{STEPS[step]?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Identitas */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK *</Label>
                  <Input
                    id="nik"
                    placeholder="16 digit NIK"
                    maxLength={16}
                    {...register('nik')}
                    aria-invalid={!!errors.nik}
                  />
                  {errors.nik && (
                    <p className="text-xs text-destructive">{errors.nik.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nama">Nama Lengkap *</Label>
                  <Input
                    id="nama"
                    placeholder="Sesuai KTP"
                    {...register('nama')}
                    aria-invalid={!!errors.nama}
                  />
                  {errors.nama && (
                    <p className="text-xs text-destructive">{errors.nama.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tempat_lahir">Tempat Lahir *</Label>
                    <Input
                      id="tempat_lahir"
                      placeholder="Kota/Kabupaten"
                      {...register('tempat_lahir')}
                      aria-invalid={!!errors.tempat_lahir}
                    />
                    {errors.tempat_lahir && (
                      <p className="text-xs text-destructive">{errors.tempat_lahir.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tanggal_lahir">Tanggal Lahir *</Label>
                    <DateInput
                      id="tanggal_lahir"
                      value={watch('tanggal_lahir')}
                      onChange={(val) => setValue('tanggal_lahir', val, { shouldValidate: true })}
                      aria-invalid={!!errors.tanggal_lahir}
                    />
                    {errors.tanggal_lahir && (
                      <p className="text-xs text-destructive">{errors.tanggal_lahir.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jenis_kelamin">Jenis Kelamin *</Label>
                    <Select id="jenis_kelamin" {...register('jenis_kelamin')}>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </Select>
                    {errors.jenis_kelamin && (
                      <p className="text-xs text-destructive">{errors.jenis_kelamin.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="golongan_darah">Golongan Darah</Label>
                    <Select id="golongan_darah" {...register('golongan_darah')}>
                      <option value="">—</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Kontak & Alamat */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="alamat">Alamat *</Label>
                  <Textarea
                    id="alamat"
                    placeholder="Jalan, nomor rumah, detail alamat"
                    rows={3}
                    {...register('alamat')}
                    aria-invalid={!!errors.alamat}
                  />
                  {errors.alamat && (
                    <p className="text-xs text-destructive">{errors.alamat.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rt">RT</Label>
                    <Input id="rt" placeholder="001" maxLength={5} {...register('rt')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rw">RW</Label>
                    <Input id="rw" placeholder="002" maxLength={5} {...register('rw')} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="kode_pos">Kode Pos</Label>
                    <Input id="kode_pos" placeholder="12345" maxLength={10} {...register('kode_pos')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kelurahan">Kelurahan</Label>
                    <Input id="kelurahan" {...register('kelurahan')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kecamatan">Kecamatan</Label>
                    <Input id="kecamatan" {...register('kecamatan')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kabupaten">Kabupaten/Kota</Label>
                    <Input id="kabupaten" {...register('kabupaten')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provinsi">Provinsi</Label>
                    <Input id="provinsi" {...register('provinsi')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="no_telepon">No. Telepon</Label>
                    <Input
                      id="no_telepon"
                      placeholder="08xxxxxxxxxx"
                      {...register('no_telepon')}
                      aria-invalid={!!errors.no_telepon}
                    />
                    {errors.no_telepon && (
                      <p className="text-xs text-destructive">{errors.no_telepon.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@contoh.id"
                      {...register('email')}
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Data Tambahan */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pekerjaan">Pekerjaan</Label>
                    <Input id="pekerjaan" {...register('pekerjaan')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pendidikan">Pendidikan</Label>
                    <Select id="pendidikan" {...register('pendidikan')}>
                      <option value="">—</option>
                      <option value="Tidak Sekolah">Tidak Sekolah</option>
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA</option>
                      <option value="D3">D3</option>
                      <option value="S1">S1</option>
                      <option value="S2">S2</option>
                      <option value="S3">S3</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status_pernikahan">Status Pernikahan</Label>
                  <Select id="status_pernikahan" {...register('status_pernikahan')}>
                    <option value="">—</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </Select>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Kontak Keluarga</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nama_keluarga">Nama Keluarga</Label>
                      <Input id="nama_keluarga" {...register('nama_keluarga')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hubungan_keluarga">Hubungan</Label>
                      <Select id="hubungan_keluarga" {...register('hubungan_keluarga')}>
                        <option value="">—</option>
                        <option value="Suami">Suami</option>
                        <option value="Istri">Istri</option>
                        <option value="Ayah">Ayah</option>
                        <option value="Ibu">Ibu</option>
                        <option value="Anak">Anak</option>
                        <option value="Saudara">Saudara</option>
                        <option value="Lainnya">Lainnya</option>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="no_telepon_keluarga">No. Telepon Keluarga</Label>
                    <Input id="no_telepon_keluarga" {...register('no_telepon_keluarga')} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Data BPJS</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="no_bpjs">No. BPJS</Label>
                      <Input
                        id="no_bpjs"
                        placeholder="13 digit"
                        maxLength={13}
                        {...register('no_bpjs')}
                        aria-invalid={!!errors.no_bpjs}
                      />
                      {errors.no_bpjs && (
                        <p className="text-xs text-destructive">{errors.no_bpjs.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kelas_bpjs">Kelas BPJS</Label>
                      <Select
                        id="kelas_bpjs"
                        {...register('kelas_bpjs', { valueAsNumber: true })}
                      >
                        <option value="">—</option>
                        <option value="1">Kelas 1</option>
                        <option value="2">Kelas 2</option>
                        <option value="3">Kelas 3</option>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sebelumnya
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Selanjutnya
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan Pasien'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
