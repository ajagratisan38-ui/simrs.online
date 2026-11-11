'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Save,
  Loader2,
  Users,
  Stethoscope,
  DoorOpen,
  BedDouble,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Hash,
  CreditCard,
  Plus,
  X,
  CheckSquare,
  Activity,
} from 'lucide-react'
import { useTenantProfile, useUpdateTenantProfile } from '@/hooks/use-tenant'
import type { TenantSettings, BedPerKelas } from '@/lib/api/tenant'
import { toast } from 'sonner'

const BED_KELAS_CONFIG: Array<{ key: keyof BedPerKelas; label: string; color: string }> = [
  { key: 'vvip', label: 'VVIP', color: 'bg-purple-100 text-purple-700' },
  { key: 'vip', label: 'VIP', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'kelas_1', label: 'Kelas 1', color: 'bg-blue-100 text-blue-700' },
  { key: 'kelas_2', label: 'Kelas 2', color: 'bg-teal-100 text-teal-700' },
  { key: 'kelas_3', label: 'Kelas 3', color: 'bg-green-100 text-green-700' },
  { key: 'icu', label: 'ICU', color: 'bg-red-100 text-red-700' },
  { key: 'hcu', label: 'HCU', color: 'bg-orange-100 text-orange-700' },
  { key: 'nicu', label: 'NICU', color: 'bg-pink-100 text-pink-700' },
  { key: 'picu', label: 'PICU', color: 'bg-rose-100 text-rose-700' },
  { key: 'isolasi', label: 'Isolasi', color: 'bg-amber-100 text-amber-700' },
  { key: 'perinatologi', label: 'Perinatologi', color: 'bg-cyan-100 text-cyan-700' },
]

const DEFAULT_FACILITIES = [
  'IGD 24 Jam',
  'Rawat Inap',
  'Poliklinik Umum',
  'Poliklinik Gigi',
  'Poliklinik Spesialis',
  'Laboratorium Klinik',
  'Laboratorium Patologi Anatomi',
  'Radiologi (X-Ray)',
  'USG (Ultrasonografi)',
  'CT Scan',
  'MRI',
  'Mammografi',
  'EKG',
  'EEG',
  'Endoskopi',
  'Kamar Operasi',
  'ICU',
  'HCU',
  'NICU',
  'PICU',
  'Farmasi / Apotek',
  'Hemodialisa',
  'Fisioterapi / Rehabilitasi Medik',
  'Bank Darah (BDRS/UTD)',
  'Gizi / Instalasi Gizi',
  'CSSD (Sterilisasi)',
  'Laundry',
  'Ambulans',
  'Kamar Jenazah',
  'MCU (Medical Check Up)',
  'Rawat Jalan Eksekutif',
  'Kemoterapi',
  'Ruang Bersalin (VK)',
  'Treadmill Test',
  'Echocardiography',
  'Spirometri',
  'Audiometri',
]

export default function RumahSakitPage() {
  const { data: profile, isLoading } = useTenantProfile()
  const updateMutation = useUpdateTenantProfile()

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    kode_rs: '',
    kelas_rs: '',
    direktur: '',
    jumlah_tt: '',
    fax: '',
    website: '',
    npwp: '',
    provinsi: '',
    kabupaten: '',
    kecamatan: '',
    kode_pos: '',
    bpjs_sep_limit: '',
  })

  const [bedPerKelas, setBedPerKelas] = useState<BedPerKelas>({})
  const [fasilitas, setFasilitas] = useState<string[]>([])
  const [customFasilitas, setCustomFasilitas] = useState('')

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        address: profile.address || '',
        phone: profile.phone || '',
        email: profile.email || '',
        kode_rs: profile.settings?.kode_rs || '',
        kelas_rs: profile.settings?.kelas_rs || '',
        direktur: profile.settings?.direktur || '',
        jumlah_tt: profile.settings?.jumlah_tt?.toString() || '',
        fax: profile.settings?.fax || '',
        website: profile.settings?.website || '',
        npwp: profile.settings?.npwp || '',
        provinsi: profile.settings?.provinsi || '',
        kabupaten: profile.settings?.kabupaten || '',
        kecamatan: profile.settings?.kecamatan || '',
        kode_pos: profile.settings?.kode_pos || '',
        bpjs_sep_limit: profile.settings?.bpjs_sep_limit?.toString() || '',
      })
      setBedPerKelas(profile.settings?.bed_per_kelas || {})
      setFasilitas(profile.settings?.fasilitas || [])
    }
  }, [profile])

  const totalBedFromKelas = Object.values(bedPerKelas).reduce(
    (sum, val) => sum + (Number(val) || 0), 0,
  )

  const toggleFasilitas = (item: string) => {
    setFasilitas((prev) =>
      prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item],
    )
  }

  const addCustomFasilitas = () => {
    const trimmed = customFasilitas.trim()
    if (trimmed && !fasilitas.includes(trimmed)) {
      setFasilitas((prev) => [...prev, trimmed])
      setCustomFasilitas('')
    }
  }

  const updateBedKelas = (key: keyof BedPerKelas, val: string) => {
    setBedPerKelas((prev) => ({ ...prev, [key]: val === '' ? undefined : Number(val) }))
  }

  const handleSave = async () => {
    const settings: Partial<TenantSettings> = {}
    if (formData.kode_rs) settings.kode_rs = formData.kode_rs
    if (formData.kelas_rs) settings.kelas_rs = formData.kelas_rs
    if (formData.direktur) settings.direktur = formData.direktur
    if (formData.jumlah_tt) settings.jumlah_tt = Number(formData.jumlah_tt)
    if (formData.fax) settings.fax = formData.fax
    if (formData.website) settings.website = formData.website
    if (formData.npwp) settings.npwp = formData.npwp
    if (formData.provinsi) settings.provinsi = formData.provinsi
    if (formData.kabupaten) settings.kabupaten = formData.kabupaten
    if (formData.kecamatan) settings.kecamatan = formData.kecamatan
    if (formData.kode_pos) settings.kode_pos = formData.kode_pos
    settings.bpjs_sep_limit = formData.bpjs_sep_limit
      ? Number(formData.bpjs_sep_limit)
      : 0
    settings.bed_per_kelas = bedPerKelas
    settings.fasilitas = fasilitas

    try {
      await updateMutation.mutateAsync({
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        settings,
      })
      toast.success('Profil rumah sakit berhasil disimpan')
    } catch {
      toast.error('Gagal menyimpan profil')
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-600" />
            Pengaturan Rumah Sakit
          </h1>
          <p className="text-muted-foreground">
            Kelola profil dan informasi rumah sakit
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Simpan
        </Button>
      </div>

      {/* Stats cards */}
      {profile?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={<UserCheck className="h-5 w-5 text-teal-600" />}
            label="Total User"
            value={profile.stats.totalUsers}
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-green-600" />}
            label="Pasien"
            value={profile.stats.totalPatients}
          />
          <StatCard
            icon={<Stethoscope className="h-5 w-5 text-purple-600" />}
            label="Dokter"
            value={profile.stats.totalDoctors}
          />
          <StatCard
            icon={<DoorOpen className="h-5 w-5 text-orange-600" />}
            label="Ruangan"
            value={profile.stats.totalRooms}
          />
          <StatCard
            icon={<BedDouble className="h-5 w-5 text-red-600" />}
            label="Tempat Tidur"
            value={profile.stats.totalBeds}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identitas RS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Identitas Rumah Sakit
            </CardTitle>
            <CardDescription>Informasi dasar rumah sakit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Nama Rumah Sakit"
              icon={<Building2 className="h-4 w-4" />}
              value={formData.name}
              onChange={(v) => updateField('name', v)}
              placeholder="RSUD Contoh"
            />
            <FormField
              label="Kode RS (Kemenkes)"
              icon={<Hash className="h-4 w-4" />}
              value={formData.kode_rs}
              onChange={(v) => updateField('kode_rs', v)}
              placeholder="3301234"
            />
            <div>
              <label className="text-sm font-medium mb-1 block">Kelas RS</label>
              <select
                value={formData.kelas_rs}
                onChange={(e) => updateField('kelas_rs', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Pilih Kelas —</option>
                <option value="A">Kelas A</option>
                <option value="B">Kelas B</option>
                <option value="C">Kelas C</option>
                <option value="D">Kelas D</option>
              </select>
            </div>
            <FormField
              label="Direktur / Kepala RS"
              icon={<UserCheck className="h-4 w-4" />}
              value={formData.direktur}
              onChange={(v) => updateField('direktur', v)}
              placeholder="dr. Nama Direktur, Sp.PD"
            />
            <FormField
              label="Jumlah Tempat Tidur"
              icon={<BedDouble className="h-4 w-4" />}
              value={formData.jumlah_tt}
              onChange={(v) => updateField('jumlah_tt', v)}
              placeholder="100"
              type="number"
            />
            <FormField
              label="NPWP"
              icon={<FileText className="h-4 w-4" />}
              value={formData.npwp}
              onChange={(v) => updateField('npwp', v)}
              placeholder="00.000.000.0-000.000"
            />
            <FormField
              label="Batas SEP Harian"
              icon={<CreditCard className="h-4 w-4" />}
              value={formData.bpjs_sep_limit}
              onChange={(v) => updateField('bpjs_sep_limit', v)}
              placeholder="0 = tanpa batas"
              type="number"
              hint="Kuota maksimal SEP per hari (0 atau kosong = tanpa batas). Kasus IGD tidak terpengaruh."
            />
          </CardContent>
        </Card>

        {/* Kontak & Alamat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Kontak & Alamat
            </CardTitle>
            <CardDescription>Informasi kontak dan lokasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Alamat"
              icon={<MapPin className="h-4 w-4" />}
              value={formData.address}
              onChange={(v) => updateField('address', v)}
              placeholder="Jl. Contoh No. 123"
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Kecamatan"
                value={formData.kecamatan}
                onChange={(v) => updateField('kecamatan', v)}
                placeholder="Kecamatan"
              />
              <FormField
                label="Kabupaten/Kota"
                value={formData.kabupaten}
                onChange={(v) => updateField('kabupaten', v)}
                placeholder="Kabupaten"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Provinsi"
                value={formData.provinsi}
                onChange={(v) => updateField('provinsi', v)}
                placeholder="Provinsi"
              />
              <FormField
                label="Kode Pos"
                value={formData.kode_pos}
                onChange={(v) => updateField('kode_pos', v)}
                placeholder="12345"
              />
            </div>
            <FormField
              label="Telepon"
              icon={<Phone className="h-4 w-4" />}
              value={formData.phone}
              onChange={(v) => updateField('phone', v)}
              placeholder="021-12345678"
            />
            <FormField
              label="Fax"
              icon={<Phone className="h-4 w-4" />}
              value={formData.fax}
              onChange={(v) => updateField('fax', v)}
              placeholder="021-12345679"
            />
            <FormField
              label="Email"
              icon={<Mail className="h-4 w-4" />}
              value={formData.email}
              onChange={(v) => updateField('email', v)}
              placeholder="info@rs-contoh.id"
            />
            <FormField
              label="Website"
              icon={<Globe className="h-4 w-4" />}
              value={formData.website}
              onChange={(v) => updateField('website', v)}
              placeholder="https://rs-contoh.id"
            />
          </CardContent>
        </Card>
      </div>

      {/* Tempat Tidur per Kelas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BedDouble className="h-5 w-5" />
            Tempat Tidur per Kelas
          </CardTitle>
          <CardDescription>
            Jumlah tempat tidur berdasarkan kelas perawatan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {BED_KELAS_CONFIG.map((cfg) => (
              <div key={cfg.key} className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={bedPerKelas[cfg.key] ?? ''}
                  onChange={(e) => updateBedKelas(cfg.key, e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            ))}
          </div>
          {totalBedFromKelas > 0 && (
            <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg flex items-center justify-between">
              <span className="text-sm text-teal-700 dark:text-teal-300">Total Tempat Tidur (dari kelas)</span>
              <span className="text-lg font-bold text-teal-800 dark:text-teal-200">{totalBedFromKelas} TT</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fasilitas RS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Fasilitas Rumah Sakit
          </CardTitle>
          <CardDescription>
            Centang fasilitas yang tersedia di RS Anda, atau tambahkan fasilitas lain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckSquare className="h-4 w-4 text-teal-600" />
            {fasilitas.length} fasilitas aktif
          </div>

          {/* Checklist grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {DEFAULT_FACILITIES.map((item) => {
              const isChecked = fasilitas.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleFasilitas(item)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    isChecked
                      ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-200 ring-1 ring-teal-200 dark:ring-teal-800'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? 'border-teal-600 bg-teal-600'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isChecked && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {item}
                </button>
              )
            })}
          </div>

          {/* Custom facilities that are not in default list */}
          {fasilitas.filter((f) => !DEFAULT_FACILITIES.includes(f)).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Fasilitas Tambahan:</p>
              <div className="flex flex-wrap gap-2">
                {fasilitas
                  .filter((f) => !DEFAULT_FACILITIES.includes(f))
                  .map((f) => (
                    <Badge key={f} variant="secondary" className="gap-1 pr-1">
                      {f}
                      <button
                        onClick={() => toggleFasilitas(f)}
                        className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Add custom */}
          <div className="flex gap-2">
            <Input
              value={customFasilitas}
              onChange={(e) => setCustomFasilitas(e.target.value)}
              placeholder="Tambah fasilitas lain..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomFasilitas()
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addCustomFasilitas}
              disabled={!customFasilitas.trim()}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription info */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Informasi Langganan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-sm text-muted-foreground mr-2">Paket:</span>
                <Badge variant="default" className="capitalize">
                  {profile.subscription_plan}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground mr-2">Slug:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">{profile.slug}</code>
              </div>
              <div>
                <span className="text-sm text-muted-foreground mr-2">Status:</span>
                <Badge variant={profile.is_active ? 'default' : 'destructive'}>
                  {profile.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
              {profile.subscription_expires_at && (
                <div>
                  <span className="text-sm text-muted-foreground mr-2">Berlaku sampai:</span>
                  <span className="text-sm font-medium">
                    {new Date(profile.subscription_expires_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FormField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
}: {
  label: string
  icon?: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  hint?: string
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && (
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  )
}
