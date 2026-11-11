'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPatientSchema, type CreatePatientInput } from '@simrs/validators'
import { usePatient, useUpdatePatient } from '@/hooks/use-patients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function EditPasienPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading } = usePatient(id)
  const updateMutation = useUpdatePatient()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
  })

  // Populate form ketika data sudah dimuat
  useEffect(() => {
    if (data?.data) {
      const p = data.data
      reset({
        nik: p.nik,
        nama: p.nama,
        tempat_lahir: p.tempat_lahir,
        tanggal_lahir: p.tanggal_lahir?.split('T')[0] ?? p.tanggal_lahir,
        jenis_kelamin: p.jenis_kelamin as 'L' | 'P',
        golongan_darah: p.golongan_darah ?? undefined,
        alamat: p.alamat,
        rt: p.rt ?? undefined,
        rw: p.rw ?? undefined,
        kelurahan: p.kelurahan ?? undefined,
        kecamatan: p.kecamatan ?? undefined,
        kabupaten: p.kabupaten ?? undefined,
        provinsi: p.provinsi ?? undefined,
        kode_pos: p.kode_pos ?? undefined,
        no_telepon: p.no_telepon ?? undefined,
        email: p.email ?? undefined,
        pekerjaan: p.pekerjaan ?? undefined,
        pendidikan: p.pendidikan ?? undefined,
        status_pernikahan: p.status_pernikahan ?? undefined,
        nama_keluarga: p.nama_keluarga ?? undefined,
        no_telepon_keluarga: p.no_telepon_keluarga ?? undefined,
        hubungan_keluarga: p.hubungan_keluarga ?? undefined,
        no_bpjs: p.no_bpjs ?? undefined,
        kelas_bpjs: p.kelas_bpjs ?? undefined,
      })
    }
  }, [data, reset])

  function onSubmit(formData: CreatePatientInput) {
    const cleaned: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(formData)) {
      if (val !== undefined && val !== null && val !== '') {
        cleaned[key] = val
      }
    }

    updateMutation.mutate(
      { id, data: cleaned },
      {
        onSuccess: () => {
          toast.success('Data pasien berhasil diperbarui')
          router.push(`/pasien/${id}`)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/pasien/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Pasien</h1>
          <p className="text-muted-foreground">
            {data?.data?.nama} — {data?.data?.no_rekam_medis}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identitas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Identitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nik">NIK *</Label>
              <Input id="nik" maxLength={16} {...register('nik')} aria-invalid={!!errors.nik} />
              {errors.nik && <p className="text-xs text-destructive">{errors.nik.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap *</Label>
              <Input id="nama" {...register('nama')} aria-invalid={!!errors.nama} />
              {errors.nama && <p className="text-xs text-destructive">{errors.nama.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tempat_lahir">Tempat Lahir *</Label>
                <Input id="tempat_lahir" {...register('tempat_lahir')} />
                {errors.tempat_lahir && <p className="text-xs text-destructive">{errors.tempat_lahir.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal_lahir">Tanggal Lahir *</Label>
                <DateInput
                  id="tanggal_lahir"
                  value={watch('tanggal_lahir')}
                  onChange={(val) => setValue('tanggal_lahir', val, { shouldValidate: true })}
                />
                {errors.tanggal_lahir && <p className="text-xs text-destructive">{errors.tanggal_lahir.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jenis_kelamin">Jenis Kelamin *</Label>
                <Select id="jenis_kelamin" {...register('jenis_kelamin')}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </Select>
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
          </CardContent>
        </Card>

        {/* Alamat & Kontak */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alamat & Kontak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat *</Label>
              <Textarea id="alamat" rows={3} {...register('alamat')} />
              {errors.alamat && <p className="text-xs text-destructive">{errors.alamat.message}</p>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rt">RT</Label>
                <Input id="rt" maxLength={5} {...register('rt')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rw">RW</Label>
                <Input id="rw" maxLength={5} {...register('rw')} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="kode_pos">Kode Pos</Label>
                <Input id="kode_pos" maxLength={10} {...register('kode_pos')} />
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
                <Input id="no_telepon" {...register('no_telepon')} />
                {errors.no_telepon && <p className="text-xs text-destructive">{errors.no_telepon.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Tambahan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Tambahan & BPJS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="no_telepon_keluarga">No. Telepon Keluarga</Label>
              <Input id="no_telepon_keluarga" {...register('no_telepon_keluarga')} />
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="no_bpjs">No. BPJS</Label>
                  <Input id="no_bpjs" maxLength={13} {...register('no_bpjs')} />
                  {errors.no_bpjs && <p className="text-xs text-destructive">{errors.no_bpjs.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kelas_bpjs">Kelas BPJS</Label>
                  <Select id="kelas_bpjs" {...register('kelas_bpjs', { valueAsNumber: true })}>
                    <option value="">—</option>
                    <option value="1">Kelas 1</option>
                    <option value="2">Kelas 2</option>
                    <option value="3">Kelas 3</option>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/pasien/${id}`}>Batal</Link>
          </Button>
          <Button type="submit" disabled={updateMutation.isPending || !isDirty}>
            {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </div>
  )
}
