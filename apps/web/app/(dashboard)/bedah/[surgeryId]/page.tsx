'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Scissors, Users, Wrench, Stethoscope, Heart,
  FileText, Plus, Trash2, Save, Loader2, CheckCircle,
} from 'lucide-react'
import {
  useFullSurgeryDetail, useUpdateSurgery,
  useSetTeamMembers, useSetInstruments,
  useUpsertAnesthesia, useUpsertNursing,
} from '@/hooks/use-surgery'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'info', label: 'Info & Laporan', icon: FileText },
  { id: 'team', label: 'Tim Bedah', icon: Users },
  { id: 'instruments', label: 'Instrumen', icon: Wrench },
  { id: 'anesthesia', label: 'Anestesi', icon: Stethoscope },
  { id: 'nursing', label: 'Perioperatif', icon: Heart },
] as const

const STATUS_COLOR: Record<string, string> = {
  dijadwalkan: 'bg-blue-100 text-blue-800',
  persiapan: 'bg-yellow-100 text-yellow-800',
  berjalan: 'bg-green-100 text-green-800',
  selesai: 'bg-gray-100 text-gray-800',
  batal: 'bg-red-100 text-red-800',
}

const PERAN_LABEL: Record<string, string> = {
  operator_utama: 'Operator Utama',
  operator_asisten: 'Asisten Operator',
  anestesiolog: 'Anestesiolog',
  penata_anestesi: 'Penata Anestesi',
  perawat_instrumen: 'Perawat Instrumen',
  perawat_sirkuler: 'Perawat Sirkuler',
  perawat_onloop: 'Perawat Onloop',
  lainnya: 'Lainnya',
}

type Rec = Record<string, unknown>

export default function SurgeryDetailPage() {
  const params = useParams<{ surgeryId: string }>()
  const router = useRouter()
  const surgeryId = params.surgeryId
  const [tab, setTab] = useState<string>('info')

  const { data: res, isLoading, refetch } = useFullSurgeryDetail(surgeryId)
  const surgery = res?.data as Rec | undefined

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-60 w-full" /><Skeleton className="h-40 w-full" /></div>
  if (!surgery) return <div className="text-center py-20 text-muted-foreground">Operasi tidak ditemukan</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/bedah')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scissors className="h-5 w-5 text-red-600" />
            {String(surgery.nomor_operasi)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {String(surgery.patient_nama)} — {String(surgery.no_rekam_medis)}
          </p>
        </div>
        <Badge className={STATUS_COLOR[String(surgery.status)] || ''}>
          {String(surgery.status).toUpperCase()}
        </Badge>
        <Badge variant="outline">{String(surgery.jenis_operasi)}</Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: 'Tanggal', v: String(surgery.tanggal_operasi) },
          { l: 'Jam Mulai', v: String(surgery.jam_mulai) },
          { l: 'Durasi Est.', v: `${surgery.estimasi_durasi_menit} mnt` },
          { l: 'Ruang', v: String(surgery.ruang_operasi) },
          { l: 'Anestesi', v: String(surgery.jenis_anestesi) },
        ].map(c => (
          <Card key={c.l}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">{c.l}</div>
              <div className="font-semibold text-sm">{c.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.id ? 'border-teal-600 text-teal-600' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && <InfoTab surgery={surgery} onRefresh={refetch} />}
      {tab === 'team' && <TeamTab surgeryId={surgeryId} initial={(surgery.team as Rec[]) || []} />}
      {tab === 'instruments' && <InstrumentsTab surgeryId={surgeryId} initial={(surgery.instruments as Rec[]) || []} />}
      {tab === 'anesthesia' && <AnesthesiaTab surgeryId={surgeryId} initial={(surgery.anesthesia as Rec) || null} />}
      {tab === 'nursing' && <NursingTab surgeryId={surgeryId} initial={(surgery.nursing as Rec[]) || []} />}
    </div>
  )
}

// ═══════ INFO & LAPORAN TAB ═══════
function InfoTab({ surgery, onRefresh }: { surgery: Rec; onRefresh: () => void }) {
  const update = useUpdateSurgery()
  const [form, setForm] = useState({
    laporan_operasi: String(surgery.laporan_operasi || ''),
    diagnosis_post_op: String(surgery.diagnosis_post_op || ''),
    tindakan_aktual: String(surgery.tindakan_aktual || ''),
    komplikasi: String(surgery.komplikasi || ''),
    perdarahan_ml: surgery.perdarahan_ml ? Number(surgery.perdarahan_ml) : 0,
    jaringan_dieksisi: String(surgery.jaringan_dieksisi || ''),
    specimen_patologi: Boolean(surgery.specimen_patologi),
    durasi_aktual_menit: surgery.durasi_aktual_menit ? Number(surgery.durasi_aktual_menit) : 0,
    klasifikasi_luka: String(surgery.klasifikasi_luka || ''),
  })

  const handleSave = () => {
    update.mutate({ id: String(surgery.id), data: form }, {
      onSuccess: () => { toast.success('Laporan operasi disimpan'); onRefresh() },
      onError: () => toast.error('Gagal menyimpan'),
    })
  }

  const handleStatusChange = (newStatus: string) => {
    update.mutate({ id: String(surgery.id), data: { status: newStatus } as Record<string, unknown> }, {
      onSuccess: () => { toast.success(`Status diubah ke ${newStatus}`); onRefresh() },
      onError: (e: Error) => toast.error(e.message || 'Gagal ubah status'),
    })
  }

  const status = String(surgery.status)

  return (
    <div className="space-y-4">
      {/* Status actions */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Status & Kontrol</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {status === 'dijadwalkan' && (
            <Button size="sm" onClick={() => handleStatusChange('persiapan')}>Mulai Persiapan</Button>
          )}
          {status === 'persiapan' && (
            <Button size="sm" onClick={() => handleStatusChange('berjalan')}>Mulai Operasi</Button>
          )}
          {status === 'berjalan' && (
            <Button size="sm" variant="default" onClick={() => handleStatusChange('selesai')}>
              <CheckCircle className="h-4 w-4 mr-1" />Selesaikan Operasi
            </Button>
          )}
          {['dijadwalkan', 'persiapan'].includes(status) && (
            <Button size="sm" variant="destructive" onClick={() => handleStatusChange('batal')}>Batalkan</Button>
          )}
          {status === 'selesai' && <Badge variant="secondary">Operasi selesai</Badge>}
        </CardContent>
      </Card>

      {/* Pre-op info */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Info Pre-Operasi</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Diagnosis Pre-Op" value={String(surgery.diagnosis_pre_op)} />
          <Row label="Rencana Tindakan" value={String(surgery.tindakan_rencana)} />
          <Row label="Kode ICD-9-CM" value={String(surgery.icd9cm_code || '-')} />
        </CardContent>
      </Card>

      {/* Post-op report */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Laporan Operasi (Post-Op)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Diagnosis Post-Op" value={form.diagnosis_post_op} onChange={v => setForm(f => ({ ...f, diagnosis_post_op: v }))} />
          <Field label="Tindakan Aktual" value={form.tindakan_aktual} onChange={v => setForm(f => ({ ...f, tindakan_aktual: v }))} />
          <FieldArea label="Laporan Operasi" value={form.laporan_operasi} onChange={v => setForm(f => ({ ...f, laporan_operasi: v }))} />
          <Field label="Komplikasi" value={form.komplikasi} onChange={v => setForm(f => ({ ...f, komplikasi: v }))} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Perdarahan (ml)</label>
              <Input type="number" value={form.perdarahan_ml} onChange={e => setForm(f => ({ ...f, perdarahan_ml: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Durasi Aktual (mnt)</label>
              <Input type="number" value={form.durasi_aktual_menit} onChange={e => setForm(f => ({ ...f, durasi_aktual_menit: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Klasifikasi Luka</label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.klasifikasi_luka} onChange={e => setForm(f => ({ ...f, klasifikasi_luka: e.target.value }))}>
                <option value="">-</option>
                <option value="bersih">Bersih</option>
                <option value="bersih_terkontaminasi">Bersih Terkontaminasi</option>
                <option value="terkontaminasi">Terkontaminasi</option>
                <option value="kotor">Kotor</option>
              </select>
            </div>
          </div>
          <Field label="Jaringan Dieksisi" value={form.jaringan_dieksisi} onChange={v => setForm(f => ({ ...f, jaringan_dieksisi: v }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.specimen_patologi} onChange={e => setForm(f => ({ ...f, specimen_patologi: e.target.checked }))} />
            Specimen dikirim ke Patologi Anatomi
          </label>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Simpan Laporan
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════ TIM BEDAH TAB ═══════
function TeamTab({ surgeryId, initial }: { surgeryId: string; initial: Rec[] }) {
  const [members, setMembers] = useState(initial.map(m => ({
    nama: String(m.nama), peran: String(m.peran), no_sip: String(m.no_sip || ''), catatan: String(m.catatan || ''),
  })))
  const save = useSetTeamMembers()

  const addMember = () => setMembers([...members, { nama: '', peran: 'operator_utama', no_sip: '', catatan: '' }])
  const removeMember = (i: number) => setMembers(members.filter((_, idx) => idx !== i))
  const updateMember = (i: number, field: string, value: string) => {
    const updated = [...members]
    updated[i] = { ...updated[i], [field]: value }
    setMembers(updated)
  }

  const handleSave = () => {
    save.mutate({ id: surgeryId, members }, {
      onSuccess: () => toast.success('Tim bedah disimpan'),
      onError: () => toast.error('Gagal menyimpan'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Tim Bedah</CardTitle>
          <Button size="sm" variant="outline" onClick={addMember}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 && <p className="text-sm text-muted-foreground">Belum ada anggota tim</p>}
        {members.map((m, i) => (
          <div key={i} className="flex gap-2 items-start border rounded p-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Nama</label>
                <Input value={m.nama} onChange={e => updateMember(i, 'nama', e.target.value)} placeholder="Nama lengkap" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Peran</label>
                <select className="w-full border rounded px-2 py-1.5 text-sm" value={m.peran} onChange={e => updateMember(i, 'peran', e.target.value)}>
                  {Object.entries(PERAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">No. SIP</label>
                <Input value={m.no_sip} onChange={e => updateMember(i, 'no_sip', e.target.value)} placeholder="Opsional" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Catatan</label>
                <Input value={m.catatan} onChange={e => updateMember(i, 'catatan', e.target.value)} placeholder="Opsional" />
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeMember(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ))}
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Simpan Tim
        </Button>
      </CardContent>
    </Card>
  )
}

// ═══════ INSTRUMEN TAB ═══════
function InstrumentsTab({ surgeryId, initial }: { surgeryId: string; initial: Rec[] }) {
  const [items, setItems] = useState(initial.map(i => ({
    nama_instrumen: String(i.nama_instrumen), jumlah: Number(i.jumlah), keterangan: String(i.keterangan || ''),
    status_steril: Boolean(i.status_steril), dikembalikan: Boolean(i.dikembalikan),
  })))
  const save = useSetInstruments()

  const add = () => setItems([...items, { nama_instrumen: '', jumlah: 1, keterangan: '', status_steril: true, dikembalikan: false }])
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const update = (i: number, field: string, value: unknown) => {
    const u = [...items]; u[i] = { ...u[i], [field]: value }; setItems(u)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Instrumen Operasi</CardTitle>
          <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Belum ada instrumen</p>}
        {items.map((it, i) => (
          <div key={i} className="flex gap-2 items-center border rounded p-2">
            <div className="flex-1 grid grid-cols-5 gap-2 items-center">
              <Input value={it.nama_instrumen} onChange={e => update(i, 'nama_instrumen', e.target.value)} placeholder="Nama instrumen" className="col-span-2" />
              <Input type="number" value={it.jumlah} onChange={e => update(i, 'jumlah', Number(e.target.value))} className="w-20" />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={it.status_steril} onChange={e => update(i, 'status_steril', e.target.checked)} /> Steril
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={it.dikembalikan} onChange={e => update(i, 'dikembalikan', e.target.checked)} /> Kembali
              </label>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ))}
        <Button onClick={() => save.mutate({ id: surgeryId, instruments: items }, { onSuccess: () => toast.success('Instrumen disimpan'), onError: () => toast.error('Gagal') })} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-1" /> Simpan Instrumen
        </Button>
      </CardContent>
    </Card>
  )
}

// ═══════ ANESTESI TAB ═══════
function AnesthesiaTab({ surgeryId, initial }: { surgeryId: string; initial: Rec | null }) {
  const [form, setForm] = useState({
    jenis_anestesi: String(initial?.jenis_anestesi || ''),
    teknik: String(initial?.teknik || ''),
    obat_anestesi: String(initial?.obat_anestesi || ''),
    dosis: String(initial?.dosis || ''),
    asa_ps: String(initial?.asa_ps || ''),
    mallampati: String(initial?.mallampati || ''),
    airway_management: String(initial?.airway_management || ''),
    posisi_pasien: String(initial?.posisi_pasien || ''),
    monitoring: String(initial?.monitoring || ''),
    cairan_masuk: String(initial?.cairan_masuk || ''),
    cairan_keluar: String(initial?.cairan_keluar || ''),
    komplikasi_anestesi: String(initial?.komplikasi_anestesi || ''),
    catatan: String(initial?.catatan || ''),
  })
  const save = useUpsertAnesthesia()

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Catatan Anestesi</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Jenis Anestesi</label>
            <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.jenis_anestesi} onChange={e => set('jenis_anestesi', e.target.value)}>
              <option value="">Pilih</option>
              <option value="general">General Anesthesia</option>
              <option value="regional">Regional Anesthesia</option>
              <option value="lokal">Anestesi Lokal</option>
              <option value="sedasi">Sedasi</option>
              <option value="spinal">Spinal</option>
              <option value="epidural">Epidural</option>
              <option value="kombinasi">Kombinasi</option>
            </select>
          </div>
          <Field label="Teknik" value={form.teknik} onChange={v => set('teknik', v)} />
          <div>
            <label className="text-xs text-muted-foreground">ASA-PS</label>
            <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.asa_ps} onChange={e => set('asa_ps', e.target.value)}>
              <option value="">Pilih</option>
              {['I', 'II', 'III', 'IV', 'V', 'VI'].map(v => <option key={v} value={v}>ASA {v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Mallampati</label>
            <select className="w-full border rounded px-2 py-1.5 text-sm" value={form.mallampati} onChange={e => set('mallampati', e.target.value)}>
              <option value="">Pilih</option>
              {['I', 'II', 'III', 'IV'].map(v => <option key={v} value={v}>Kelas {v}</option>)}
            </select>
          </div>
          <Field label="Posisi Pasien" value={form.posisi_pasien} onChange={v => set('posisi_pasien', v)} />
          <Field label="Airway Management" value={form.airway_management} onChange={v => set('airway_management', v)} />
        </div>
        <FieldArea label="Obat Anestesi" value={form.obat_anestesi} onChange={v => set('obat_anestesi', v)} />
        <Field label="Dosis" value={form.dosis} onChange={v => set('dosis', v)} />
        <FieldArea label="Monitoring Intraoperatif" value={form.monitoring} onChange={v => set('monitoring', v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cairan Masuk" value={form.cairan_masuk} onChange={v => set('cairan_masuk', v)} />
          <Field label="Cairan Keluar" value={form.cairan_keluar} onChange={v => set('cairan_keluar', v)} />
        </div>
        <Field label="Komplikasi Anestesi" value={form.komplikasi_anestesi} onChange={v => set('komplikasi_anestesi', v)} />
        <FieldArea label="Catatan" value={form.catatan} onChange={v => set('catatan', v)} />
        <Button onClick={() => save.mutate({ id: surgeryId, data: form }, { onSuccess: () => toast.success('Catatan anestesi disimpan'), onError: () => toast.error('Gagal') })} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-1" /> Simpan Anestesi
        </Button>
      </CardContent>
    </Card>
  )
}

// ═══════ PERIOPERATIF TAB ═══════
function NursingTab({ surgeryId, initial }: { surgeryId: string; initial: Rec[] }) {
  const [fase, setFase] = useState<'pre' | 'intra' | 'post'>('pre')
  const existing = initial.find(n => n.fase === fase) as Rec | undefined
  const save = useUpsertNursing()
  const [form, setForm] = useState<Record<string, unknown>>({})

  const loadFase = (f: 'pre' | 'intra' | 'post') => {
    setFase(f)
    const ex = initial.find(n => n.fase === f) as Rec | undefined
    setForm(ex ? { ...ex } : { perawat_nama: '' })
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const val = (k: string) => form[k] ?? existing?.[k] ?? ''
  const bool = (k: string) => Boolean(form[k] ?? existing?.[k] ?? false)

  const handleSave = () => {
    const data = { ...form, fase, perawat_nama: String(form.perawat_nama || existing?.perawat_nama || '') }
    save.mutate({ id: surgeryId, data: data as Record<string, unknown> & { fase: 'pre' | 'intra' | 'post'; perawat_nama: string } }, {
      onSuccess: () => toast.success(`Checklist ${fase}-operatif disimpan`),
      onError: () => toast.error('Gagal'),
    })
  }

  const Check = ({ k, label }: { k: string; label: string }) => (
    <label className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
      <input type="checkbox" checked={bool(k)} onChange={e => set(k, e.target.checked)} className="rounded" />
      {label}
    </label>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2"><Heart className="h-4 w-4" /> Keperawatan Perioperatif</CardTitle>
        <div className="flex gap-1 mt-2">
          {(['pre', 'intra', 'post'] as const).map(f => (
            <Button key={f} size="sm" variant={fase === f ? 'default' : 'outline'} onClick={() => loadFase(f)}>
              {f === 'pre' ? 'Pre-Operatif' : f === 'intra' ? 'Intra-Operatif' : 'Post-Operatif'}
              {initial.find(n => n.fase === f) && <CheckCircle className="h-3 w-3 ml-1 text-green-400" />}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Nama Perawat" value={String(val('perawat_nama'))} onChange={v => set('perawat_nama', v)} />

        {fase === 'pre' && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Checklist Pre-Operatif</div>
            <Check k="identitas_verified" label="Identitas pasien diverifikasi" />
            <Check k="site_marking" label="Penandaan lokasi operasi (site marking)" />
            <Check k="consent_signed" label="Informed consent ditandatangani" />
            <Check k="puasa_verified" label="Puasa diverifikasi" />
            <Check k="alergi_checked" label="Alergi sudah dicek" />
            <Check k="gigi_palsu_removed" label="Gigi palsu/protesa dilepas" />
            <Check k="perhiasan_removed" label="Perhiasan/aksesoris dilepas" />
            <Check k="iv_line_terpasang" label="IV line terpasang" />
            <Check k="darah_tersedia" label="Darah/produk darah tersedia" />
          </div>
        )}

        {fase === 'intra' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Checklist Intra-Operatif</div>
            <Check k="time_out_done" label="Surgical Time Out dilakukan" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Counting Kasa Pre</label>
                <Input type="number" value={val('counting_kasa_pre') as string} onChange={e => set('counting_kasa_pre', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Counting Kasa Post</label>
                <Input type="number" value={val('counting_kasa_post') as string} onChange={e => set('counting_kasa_post', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Counting Instrumen Pre</label>
                <Input type="number" value={val('counting_instrumen_pre') as string} onChange={e => set('counting_instrumen_pre', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Counting Instrumen Post</label>
                <Input type="number" value={val('counting_instrumen_post') as string} onChange={e => set('counting_instrumen_post', Number(e.target.value))} />
              </div>
            </div>
            <Field label="Posisi Pasien" value={String(val('posisi_pasien'))} onChange={v => set('posisi_pasien', v)} />
            <Check k="pemakaian_diatermi" label="Diatermi digunakan" />
            <Check k="drain_terpasang" label="Drain terpasang" />
            <Check k="specimen_ada" label="Ada specimen" />
            {bool('specimen_ada') && (
              <Field label="Label Specimen" value={String(val('specimen_label'))} onChange={v => set('specimen_label', v)} />
            )}
          </div>
        )}

        {fase === 'post' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Monitoring Post-Operatif</div>
            <div>
              <label className="text-xs text-muted-foreground">Kesadaran</label>
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={val('kesadaran_post') as string} onChange={e => set('kesadaran_post', e.target.value)}>
                <option value="">Pilih</option>
                <option value="compos_mentis">Compos Mentis</option>
                <option value="somnolen">Somnolen</option>
                <option value="sopor">Sopor</option>
                <option value="koma">Koma</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Skala Nyeri (0-10)</label>
              <Input type="number" min={0} max={10} value={val('skala_nyeri_post') as string} onChange={e => set('skala_nyeri_post', Number(e.target.value))} />
            </div>
            <Field label="Kondisi Balutan" value={String(val('balutan_kondisi'))} onChange={v => set('balutan_kondisi', v)} />
            <Field label="Output Drain" value={String(val('drain_output'))} onChange={v => set('drain_output', v)} />
            <FieldArea label="Instruksi Post-Op" value={String(val('instruksi_post_op'))} onChange={v => set('instruksi_post_op', v)} />
          </div>
        )}

        <FieldArea label="Catatan" value={String(val('catatan'))} onChange={v => set('catatan', v)} />
        <Button onClick={handleSave} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-1" /> Simpan {fase === 'pre' ? 'Pre' : fase === 'intra' ? 'Intra' : 'Post'}-Operatif
        </Button>
      </CardContent>
    </Card>
  )
}

// ═══════ SHARED COMPONENTS ═══════
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="font-medium">: {value}</span>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function FieldArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <textarea className="w-full border rounded px-3 py-2 text-sm min-h-[60px] resize-y" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
