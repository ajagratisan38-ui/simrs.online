'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, ClipboardList, Save, CheckCircle, Heart, Activity,
  Thermometer, AlertTriangle, User, Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useNursingByVisit, useCreateNursing, useUpdateNursing, useFinalizeNursing,
} from '@/hooks/use-nursing'
import type { NursingAssessment } from '@/lib/api/nursing'

const PAIN_COLORS = [
  'bg-green-500', 'bg-green-400', 'bg-lime-400', 'bg-lime-500',
  'bg-yellow-400', 'bg-yellow-500', 'bg-orange-400', 'bg-orange-500',
  'bg-red-400', 'bg-red-500', 'bg-red-700',
]

const BARTHEL_OPTIONS: {
  key: string; label: string; options: { value: number; label: string }[]
}[] = [
  { key: 'barthel_makan', label: 'Makan', options: [
    { value: 0, label: 'Tidak mampu' }, { value: 5, label: 'Butuh bantuan' }, { value: 10, label: 'Mandiri' },
  ]},
  { key: 'barthel_mandi', label: 'Mandi', options: [
    { value: 0, label: 'Tergantung' }, { value: 5, label: 'Mandiri' },
  ]},
  { key: 'barthel_perawatan_diri', label: 'Perawatan Diri', options: [
    { value: 0, label: 'Butuh bantuan' }, { value: 5, label: 'Mandiri' },
  ]},
  { key: 'barthel_berpakaian', label: 'Berpakaian', options: [
    { value: 0, label: 'Tergantung' }, { value: 5, label: 'Butuh bantuan' }, { value: 10, label: 'Mandiri' },
  ]},
  { key: 'barthel_bab', label: 'BAB', options: [
    { value: 0, label: 'Inkontinensia' }, { value: 5, label: 'Kadang' }, { value: 10, label: 'Terkontrol' },
  ]},
  { key: 'barthel_bak', label: 'BAK', options: [
    { value: 0, label: 'Inkontinensia' }, { value: 5, label: 'Kadang' }, { value: 10, label: 'Terkontrol' },
  ]},
  { key: 'barthel_toileting', label: 'Toileting', options: [
    { value: 0, label: 'Tergantung' }, { value: 5, label: 'Butuh bantuan' }, { value: 10, label: 'Mandiri' },
  ]},
  { key: 'barthel_transfer', label: 'Transfer', options: [
    { value: 0, label: 'Tidak mampu' }, { value: 5, label: 'Butuh banyak bantuan' },
    { value: 10, label: 'Bantuan minimal' }, { value: 15, label: 'Mandiri' },
  ]},
  { key: 'barthel_mobilitas', label: 'Mobilitas', options: [
    { value: 0, label: 'Immobil' }, { value: 5, label: 'Kursi roda' },
    { value: 10, label: 'Jalan dengan bantuan' }, { value: 15, label: 'Mandiri' },
  ]},
  { key: 'barthel_naik_tangga', label: 'Naik Tangga', options: [
    { value: 0, label: 'Tidak mampu' }, { value: 5, label: 'Butuh bantuan' }, { value: 10, label: 'Mandiri' },
  ]},
]

export default function PengkajianKeperawatanPage() {
  const { visitId } = useParams<{ visitId: string }>()
  const router = useRouter()
  const { data: res, isLoading } = useNursingByVisit(visitId)
  const existing = res?.data as NursingAssessment | null | undefined
  const createMut = useCreateNursing()
  const updateMut = useUpdateNursing()
  const finalizeMut = useFinalizeNursing()

  const [activeSection, setActiveSection] = useState(0)
  const [form, setForm] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (existing) {
      setForm({ ...existing })
    }
  }, [existing])

  const set = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }))
  const get = (key: string, def: unknown = '') => form[key] ?? def
  const isFinal = existing?.status === 'final'

  const handleSave = async () => {
    try {
      if (existing) {
        await updateMut.mutateAsync({ id: existing.id, data: form })
        toast.success('Pengkajian berhasil diupdate')
      } else {
        await createMut.mutateAsync({ ...form, visit_id: visitId })
        toast.success('Pengkajian berhasil disimpan')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    }
  }

  const handleFinalize = async () => {
    if (!existing) return
    if (!confirm('Finalkan pengkajian? Setelah final tidak bisa diubah.')) return
    try {
      await finalizeMut.mutateAsync(existing.id)
      toast.success('Pengkajian telah difinalkan')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  // Auto-calculate scores for display
  const jatuhSkor = (() => {
    let s = 0
    if (get('jatuh_riwayat', false)) s += 25
    if (get('jatuh_diagnosis_sekunder', false)) s += 15
    if (get('jatuh_alat_bantu') === 'kruk_tongkat_walker') s += 15
    else if (get('jatuh_alat_bantu') === 'furniture') s += 30
    if (get('jatuh_terpasang_infus', false)) s += 20
    if (get('jatuh_cara_berjalan') === 'lemah') s += 10
    else if (get('jatuh_cara_berjalan') === 'terganggu') s += 20
    if (get('jatuh_status_mental') === 'lupa_keterbatasan') s += 15
    return s
  })()
  const jatuhKategori = jatuhSkor <= 24 ? 'Rendah' : jatuhSkor <= 50 ? 'Sedang' : 'Tinggi'

  const barthelSkor = BARTHEL_OPTIONS.reduce(
    (sum, b) => sum + (Number(get(b.key, b.options[b.options.length - 1].value)) || 0), 0,
  )
  const barthelKategori = barthelSkor >= 80 ? 'Mandiri'
    : barthelSkor >= 60 ? 'Ketergantungan Ringan'
    : barthelSkor >= 40 ? 'Ketergantungan Sedang'
    : barthelSkor >= 20 ? 'Ketergantungan Berat'
    : 'Ketergantungan Total'

  const nyeriSkala = Number(get('nyeri_skala', 0))

  const sections = [
    'Riwayat & Keluhan',
    'Tanda Vital',
    'Nyeri',
    'Risiko Jatuh',
    'Status Fungsional',
    'Skrining Nutrisi',
    'Psikososial & Edukasi',
  ]

  if (isLoading) return (
    <div className="space-y-4 pt-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-600" />
            Pengkajian Keperawatan
          </h1>
          {existing && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Perawat: {existing.nurse_nama} &middot;{' '}
              {new Date(existing.tanggal_pengkajian).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {existing && (
            <Badge className={cn(
              'text-xs',
              existing.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
            )}>
              {existing.status === 'final' ? 'Final' : 'Draft'}
            </Badge>
          )}
          {!isFinal && (
            <>
              <Button variant="outline" size="sm" onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Simpan
              </Button>
              {existing && (
                <Button size="sm" onClick={handleFinalize}
                  disabled={finalizeMut.isPending}
                  className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Finalkan
                </Button>
              )}
            </>
          )}
          {existing && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              Cetak
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">TD</div>
          <div className="font-bold text-sm">
            {get('tekanan_darah_sistolik') || '-'}/{get('tekanan_darah_diastolik') || '-'}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Nyeri</div>
          <div className={cn('font-bold text-sm', nyeriSkala >= 4 && 'text-orange-600', nyeriSkala >= 7 && 'text-red-600')}>
            {nyeriSkala}/10
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Risiko Jatuh</div>
          <div className={cn('font-bold text-sm',
            jatuhSkor <= 24 ? 'text-green-600' : jatuhSkor <= 50 ? 'text-yellow-600' : 'text-red-600',
          )}>
            {jatuhKategori} ({jatuhSkor})
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Barthel</div>
          <div className={cn('font-bold text-sm', barthelSkor < 60 && 'text-orange-600')}>
            {barthelSkor}/100
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">IMT</div>
          <div className="font-bold text-sm">
            {Number(get('tinggi_badan', 0)) > 0 && Number(get('berat_badan', 0)) > 0
              ? (Number(get('berat_badan', 0)) / ((Number(get('tinggi_badan', 0)) / 100) ** 2)).toFixed(1)
              : '-'}
          </div>
        </Card>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {sections.map((s, i) => (
          <button key={i} onClick={() => setActiveSection(i)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors',
              activeSection === i
                ? 'bg-teal-600 text-white font-medium'
                : 'bg-muted hover:bg-muted/80',
            )}>
            {s}
          </button>
        ))}
      </div>

      {/* Sections */}
      <Card>
        <CardContent className="pt-5 space-y-4">

          {/* Section 0: Riwayat & Keluhan */}
          {activeSection === 0 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" /> Riwayat & Keluhan
              </h3>
              <div className="space-y-3">
                <div><Label className="text-xs">Keluhan Utama</Label>
                  <Textarea value={String(get('keluhan_utama'))} onChange={(e) => set('keluhan_utama', e.target.value)} disabled={isFinal} rows={2} /></div>
                <div><Label className="text-xs">Riwayat Penyakit Sekarang</Label>
                  <Textarea value={String(get('riwayat_penyakit_sekarang'))} onChange={(e) => set('riwayat_penyakit_sekarang', e.target.value)} disabled={isFinal} rows={2} /></div>
                <div><Label className="text-xs">Riwayat Penyakit Dahulu</Label>
                  <Textarea value={String(get('riwayat_penyakit_dahulu'))} onChange={(e) => set('riwayat_penyakit_dahulu', e.target.value)} disabled={isFinal} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Riwayat Alergi</Label>
                    <Textarea value={String(get('riwayat_alergi'))} onChange={(e) => set('riwayat_alergi', e.target.value)} disabled={isFinal} rows={2} /></div>
                  <div><Label className="text-xs">Riwayat Pengobatan</Label>
                    <Textarea value={String(get('riwayat_pengobatan'))} onChange={(e) => set('riwayat_pengobatan', e.target.value)} disabled={isFinal} rows={2} /></div>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Tanda Vital */}
          {activeSection === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" /> Tanda Vital
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">TD Sistolik (mmHg)</Label>
                  <Input type="number" value={String(get('tekanan_darah_sistolik'))} onChange={(e) => set('tekanan_darah_sistolik', e.target.value)} disabled={isFinal} /></div>
                <div><Label className="text-xs">TD Diastolik (mmHg)</Label>
                  <Input type="number" value={String(get('tekanan_darah_diastolik'))} onChange={(e) => set('tekanan_darah_diastolik', e.target.value)} disabled={isFinal} /></div>
                <div><Label className="text-xs">Nadi (x/menit)</Label>
                  <Input type="number" value={String(get('nadi'))} onChange={(e) => set('nadi', e.target.value)} disabled={isFinal} /></div>
                <div><Label className="text-xs">Suhu (°C)</Label>
                  <Input type="number" step="0.1" value={String(get('suhu'))} onChange={(e) => set('suhu', e.target.value)} disabled={isFinal} /></div>
                <div><Label className="text-xs">Respirasi (x/menit)</Label>
                  <Input type="number" value={String(get('respirasi'))} onChange={(e) => set('respirasi', e.target.value)} disabled={isFinal} /></div>
                <div><Label className="text-xs">SpO2 (%)</Label>
                  <Input type="number" value={String(get('spo2'))} onChange={(e) => set('spo2', e.target.value)} disabled={isFinal} /></div>
                <div><Label className="text-xs">Tinggi Badan (cm)</Label>
                  <Input type="number" step="0.1" value={String(get('tinggi_badan'))} onChange={(e) => set('tinggi_badan', e.target.value)} disabled={isFinal} /></div>
                <div><Label className="text-xs">Berat Badan (kg)</Label>
                  <Input type="number" step="0.1" value={String(get('berat_badan'))} onChange={(e) => set('berat_badan', e.target.value)} disabled={isFinal} /></div>
              </div>
            </div>
          )}

          {/* Section 2: Nyeri */}
          {activeSection === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Heart className="h-4 w-4" /> Pengkajian Nyeri
              </h3>
              <div className="flex items-center gap-3">
                <Label className="text-xs">Ada Nyeri?</Label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={!!get('nyeri_ada', false)}
                    onChange={(e) => set('nyeri_ada', e.target.checked)} disabled={isFinal} />
                  Ya
                </label>
              </div>
              {get('nyeri_ada', false) && (
                <>
                  <div>
                    <Label className="text-xs mb-2 block">Skala Nyeri (NRS 0-10)</Label>
                    <div className="flex gap-1">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button key={i} type="button" disabled={isFinal}
                          onClick={() => set('nyeri_skala', i)}
                          className={cn(
                            'w-9 h-9 rounded-md text-xs font-bold transition-all',
                            nyeriSkala === i
                              ? `${PAIN_COLORS[i]} text-white scale-110 shadow-md`
                              : 'bg-muted hover:bg-muted/80',
                          )}>
                          {i}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                      <span>Tidak nyeri</span>
                      <span>Nyeri ringan</span>
                      <span>Nyeri sedang</span>
                      <span>Nyeri berat</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><Label className="text-xs">Lokasi</Label>
                      <Input value={String(get('nyeri_lokasi'))} onChange={(e) => set('nyeri_lokasi', e.target.value)} disabled={isFinal} placeholder="Contoh: dada kiri" /></div>
                    <div><Label className="text-xs">Karakteristik</Label>
                      <Select value={String(get('nyeri_karakteristik'))} onChange={(e) => set('nyeri_karakteristik', e.target.value)} disabled={isFinal}>
                        <option value="">Pilih</option>
                        <option value="tajam">Tajam</option>
                        <option value="tumpul">Tumpul</option>
                        <option value="berdenyut">Berdenyut</option>
                        <option value="terbakar">Terbakar</option>
                        <option value="menjalar">Menjalar</option>
                        <option value="kram">Kram</option>
                      </Select></div>
                    <div><Label className="text-xs">Durasi</Label>
                      <Select value={String(get('nyeri_durasi'))} onChange={(e) => set('nyeri_durasi', e.target.value)} disabled={isFinal}>
                        <option value="">Pilih</option>
                        <option value="terus_menerus">Terus-menerus</option>
                        <option value="hilang_timbul">Hilang timbul</option>
                        <option value="sesaat">Sesaat</option>
                      </Select></div>
                  </div>
                  <div><Label className="text-xs">Penyebab/Pencetus</Label>
                    <Input value={String(get('nyeri_penyebab'))} onChange={(e) => set('nyeri_penyebab', e.target.value)} disabled={isFinal} /></div>
                </>
              )}
            </div>
          )}

          {/* Section 3: Risiko Jatuh (Morse) */}
          {activeSection === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Risiko Jatuh (Morse Fall Scale)
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!get('jatuh_riwayat', false)}
                    onChange={(e) => set('jatuh_riwayat', e.target.checked)} disabled={isFinal} />
                  Riwayat jatuh dalam 3 bulan terakhir <span className="text-xs text-muted-foreground">(25)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!get('jatuh_diagnosis_sekunder', false)}
                    onChange={(e) => set('jatuh_diagnosis_sekunder', e.target.checked)} disabled={isFinal} />
                  Diagnosis sekunder (≥2 diagnosis medis) <span className="text-xs text-muted-foreground">(15)</span>
                </label>
                <div><Label className="text-xs">Alat Bantu Jalan</Label>
                  <Select value={String(get('jatuh_alat_bantu', 'tidak_ada'))} onChange={(e) => set('jatuh_alat_bantu', e.target.value)} disabled={isFinal}>
                    <option value="tidak_ada">Tidak ada / Tirah baring / Kursi roda (0)</option>
                    <option value="kruk_tongkat_walker">Kruk / Tongkat / Walker (15)</option>
                    <option value="furniture">Berpegangan pada furniture (30)</option>
                  </Select></div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!get('jatuh_terpasang_infus', false)}
                    onChange={(e) => set('jatuh_terpasang_infus', e.target.checked)} disabled={isFinal} />
                  Terpasang infus / heparin lock <span className="text-xs text-muted-foreground">(20)</span>
                </label>
                <div><Label className="text-xs">Cara Berjalan</Label>
                  <Select value={String(get('jatuh_cara_berjalan', 'normal'))} onChange={(e) => set('jatuh_cara_berjalan', e.target.value)} disabled={isFinal}>
                    <option value="normal">Normal / Tirah baring / Immobilisasi (0)</option>
                    <option value="lemah">Lemah (10)</option>
                    <option value="terganggu">Terganggu (20)</option>
                  </Select></div>
                <div><Label className="text-xs">Status Mental</Label>
                  <Select value={String(get('jatuh_status_mental', 'orientasi_baik'))} onChange={(e) => set('jatuh_status_mental', e.target.value)} disabled={isFinal}>
                    <option value="orientasi_baik">Orientasi baik terhadap kemampuan diri (0)</option>
                    <option value="lupa_keterbatasan">Lupa akan keterbatasan (15)</option>
                  </Select></div>
              </div>
              <Card className={cn('p-3', jatuhSkor <= 24 ? 'bg-green-50 dark:bg-green-950/20' : jatuhSkor <= 50 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-red-50 dark:bg-red-950/20')}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">Skor Total</span>
                  <span className={cn('font-bold text-lg',
                    jatuhSkor <= 24 ? 'text-green-700' : jatuhSkor <= 50 ? 'text-yellow-700' : 'text-red-700',
                  )}>
                    {jatuhSkor} — {jatuhKategori}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  0-24: Risiko Rendah &middot; 25-50: Risiko Sedang &middot; &gt;50: Risiko Tinggi
                </div>
              </Card>
            </div>
          )}

          {/* Section 4: Status Fungsional (Barthel) */}
          {activeSection === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" /> Status Fungsional (Barthel Index)
              </h3>
              <div className="space-y-3">
                {BARTHEL_OPTIONS.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2">
                    <Label className="text-xs w-32 shrink-0">{item.label}</Label>
                    <Select value={String(get(item.key, item.options[item.options.length - 1].value))}
                      onChange={(e) => set(item.key, Number(e.target.value))} disabled={isFinal}
                      className="flex-1">
                      {item.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label} ({opt.value})</option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
              <Card className={cn('p-3', barthelSkor >= 80 ? 'bg-green-50 dark:bg-green-950/20' : barthelSkor >= 40 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-red-50 dark:bg-red-950/20')}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">Skor Total</span>
                  <span className={cn('font-bold text-lg',
                    barthelSkor >= 80 ? 'text-green-700' : barthelSkor >= 40 ? 'text-yellow-700' : 'text-red-700',
                  )}>
                    {barthelSkor}/100 — {barthelKategori}
                  </span>
                </div>
              </Card>
            </div>
          )}

          {/* Section 5: Skrining Nutrisi */}
          {activeSection === 5 && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Thermometer className="h-4 w-4" /> Skrining Nutrisi
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!get('nutrisi_penurunan_bb', false)}
                    onChange={(e) => set('nutrisi_penurunan_bb', e.target.checked)} disabled={isFinal} />
                  Penurunan BB tidak direncanakan dalam 6 bulan terakhir <span className="text-xs text-muted-foreground">(skor 2)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!get('nutrisi_asupan_kurang', false)}
                    onChange={(e) => set('nutrisi_asupan_kurang', e.target.checked)} disabled={isFinal} />
                  Asupan makan kurang dalam 1 minggu terakhir <span className="text-xs text-muted-foreground">(skor 1)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!get('nutrisi_kondisi_khusus', false)}
                    onChange={(e) => set('nutrisi_kondisi_khusus', e.target.checked)} disabled={isFinal} />
                  Kondisi khusus (ICU, luka bakar, kanker, dsb) <span className="text-xs text-muted-foreground">(skor 1)</span>
                </label>
              </div>
              {(() => {
                let ns = 0
                if (get('nutrisi_penurunan_bb', false)) ns += 2
                if (get('nutrisi_asupan_kurang', false)) ns += 1
                if (get('nutrisi_kondisi_khusus', false)) ns += 1
                return (
                  <Card className={cn('p-3', ns >= 2 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20')}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">Skor Nutrisi</span>
                      <span className={cn('font-bold', ns >= 2 ? 'text-red-700' : 'text-green-700')}>
                        {ns} — {ns >= 2 ? 'Berisiko Malnutrisi' : 'Tidak Berisiko'}
                      </span>
                    </div>
                  </Card>
                )
              })()}
            </div>
          )}

          {/* Section 6: Psikososial & Edukasi */}
          {activeSection === 6 && (
            <div className="space-y-4">
              <h3 className="font-medium">Psikososial, Spiritual & Edukasi</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Status Psikososial</Label>
                  <Select value={String(get('psikososial_status'))} onChange={(e) => set('psikososial_status', e.target.value)} disabled={isFinal}>
                    <option value="">Pilih</option>
                    <option value="tenang">Tenang</option>
                    <option value="cemas">Cemas</option>
                    <option value="takut">Takut</option>
                    <option value="marah">Marah</option>
                    <option value="sedih">Sedih</option>
                  </Select></div>
                <div><Label className="text-xs">Hubungan Keluarga</Label>
                  <Select value={String(get('psikososial_hubungan_keluarga'))} onChange={(e) => set('psikososial_hubungan_keluarga', e.target.value)} disabled={isFinal}>
                    <option value="">Pilih</option>
                    <option value="baik">Baik</option>
                    <option value="kurang_baik">Kurang baik</option>
                    <option value="tidak_ada">Tidak ada keluarga</option>
                  </Select></div>
                <div><Label className="text-xs">Agama</Label>
                  <Input value={String(get('spiritual_agama'))} onChange={(e) => set('spiritual_agama', e.target.value)} disabled={isFinal} /></div>
                <div><Label className="text-xs">Kebutuhan Spiritual</Label>
                  <Input value={String(get('spiritual_kebutuhan'))} onChange={(e) => set('spiritual_kebutuhan', e.target.value)} disabled={isFinal} /></div>
              </div>
              <div className="space-y-3">
                <div><Label className="text-xs">Hambatan Edukasi</Label>
                  <Input value={String(get('edukasi_hambatan'))} onChange={(e) => set('edukasi_hambatan', e.target.value)} disabled={isFinal}
                    placeholder="Bahasa, pendengaran, penglihatan, kognitif" /></div>
                <div><Label className="text-xs">Kebutuhan Edukasi</Label>
                  <Textarea value={String(get('edukasi_kebutuhan'))} onChange={(e) => set('edukasi_kebutuhan', e.target.value)} disabled={isFinal} rows={2} /></div>
                <div><Label className="text-xs">Edukasi yang Diberikan</Label>
                  <Textarea value={String(get('edukasi_diberikan'))} onChange={(e) => set('edukasi_diberikan', e.target.value)} disabled={isFinal} rows={2} /></div>
                <div><Label className="text-xs">Perencanaan Pulang (Discharge Planning)</Label>
                  <Textarea value={String(get('discharge_plan'))} onChange={(e) => set('discharge_plan', e.target.value)} disabled={isFinal} rows={2} /></div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
