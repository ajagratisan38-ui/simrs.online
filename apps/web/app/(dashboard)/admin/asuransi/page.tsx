'use client'

import { formatRupiah } from '@/lib/utils'
import { useState } from 'react'
import {
  Shield,
  Search,
  Plus,
  Pencil,
  Power,
  Trash2,
  Users,
  Building2,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  useInsurances,
  useCreateInsurance,
  useUpdateInsurance,
  useToggleInsurance,
  useDeleteInsurance,
  useInsuranceStats,
} from '@/hooks/use-insurance'
import { cn } from '@/lib/utils'

const TIPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'asuransi', label: 'Asuransi' },
  { value: 'perusahaan', label: 'Perusahaan' },
  { value: 'yayasan', label: 'Yayasan' },
  { value: 'kerjasama', label: 'Kerjasama' },
]

const TIPE_LABELS: Record<string, string> = {
  asuransi: 'Asuransi',
  perusahaan: 'Perusahaan',
  yayasan: 'Yayasan',
  kerjasama: 'Kerjasama',
}

const TIPE_COLORS: Record<string, string> = {
  asuransi: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  perusahaan: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  yayasan: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  kerjasama: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

export default function AsuransiPage() {
  const [search, setSearch] = useState('')
  const [tipe, setTipe] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Form state
  const [fKode, setFKode] = useState('')
  const [fNama, setFNama] = useState('')
  const [fTipe, setFTipe] = useState('asuransi')
  const [fAlamat, setFAlamat] = useState('')
  const [fTelepon, setFTelepon] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fPicNama, setFPicNama] = useState('')
  const [fPicTelepon, setFPicTelepon] = useState('')
  const [fTarif, setFTarif] = useState('100')
  const [fCatatan, setFCatatan] = useState('')

  const { data: res, isLoading } = useInsurances({
    search: search || undefined,
    tipe: tipe || undefined,
  })
  const insurances = res?.data ?? []

  const { data: statsRes } = useInsuranceStats()
  const stats = statsRes?.data

  const createMut = useCreateInsurance()
  const updateMut = useUpdateInsurance()
  const toggleMut = useToggleInsurance()
  const deleteMut = useDeleteInsurance()

  const resetForm = () => {
    setFKode(''); setFNama(''); setFTipe('asuransi'); setFAlamat('')
    setFTelepon(''); setFEmail(''); setFPicNama(''); setFPicTelepon('')
    setFTarif('100'); setFCatatan(''); setEditId(null); setShowForm(false)
  }

  const openEdit = (ins: typeof insurances[0]) => {
    setEditId(ins.id)
    setFKode(ins.kode); setFNama(ins.nama); setFTipe(ins.tipe)
    setFAlamat(ins.alamat ?? ''); setFTelepon(ins.telepon ?? '')
    setFEmail(ins.email ?? ''); setFPicNama(ins.pic_nama ?? '')
    setFPicTelepon(ins.pic_telepon ?? ''); setFTarif(String(ins.tarif_persen))
    setFCatatan(ins.catatan ?? ''); setShowForm(true)
  }

  const handleSave = async () => {
    if (!fKode || !fNama) return toast.error('Kode dan Nama wajib diisi')
    const body = {
      kode: fKode, nama: fNama, tipe: fTipe, alamat: fAlamat || undefined,
      telepon: fTelepon || undefined, email: fEmail || undefined,
      pic_nama: fPicNama || undefined, pic_telepon: fPicTelepon || undefined,
      tarif_persen: Number(fTarif) || 100, catatan: fCatatan || undefined,
    }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, data: body })
        toast.success('Asuransi berhasil diupdate')
      } else {
        await createMut.mutateAsync(body)
        toast.success('Asuransi berhasil ditambah')
      }
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Asuransi & Penjamin
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola perusahaan asuransi, penjamin, dan kerjasama
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah Asuransi
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.total_insurances}</div>
                  <div className="text-xs text-muted-foreground">Asuransi Aktif</div>
                </div>
                <Building2 className="h-8 w-8 text-blue-500 opacity-30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stats.total_members}</div>
                  <div className="text-xs text-muted-foreground">Peserta Aktif</div>
                </div>
                <Users className="h-8 w-8 text-green-500 opacity-30" />
              </div>
            </CardContent>
          </Card>
          {stats.by_tipe.map((t) => (
            <Card key={t.tipe}>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{t.count}</div>
                <div className="text-xs text-muted-foreground">
                  {TIPE_LABELS[t.tipe] || t.tipe}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editId ? 'Edit Asuransi' : 'Tambah Asuransi Baru'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Kode *</Label>
                <Input placeholder="ASR-001" value={fKode} onChange={(e) => setFKode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama *</Label>
                <Input placeholder="Nama Asuransi" value={fNama} onChange={(e) => setFNama(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipe</Label>
                <Select value={fTipe} onChange={(e) => setFTipe(e.target.value)}>
                  {TIPE_OPTIONS.filter((t) => t.value).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tarif (%)</Label>
                <Input type="number" min={0} max={100} value={fTarif} onChange={(e) => setFTarif(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Telepon</Label>
                <Input placeholder="021-xxxx" value={fTelepon} onChange={(e) => setFTelepon(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input placeholder="email@asuransi.co.id" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Alamat</Label>
                <Input placeholder="Alamat kantor" value={fAlamat} onChange={(e) => setFAlamat(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">PIC Nama</Label>
                <Input placeholder="Contact person" value={fPicNama} onChange={(e) => setFPicNama(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PIC Telepon</Label>
                <Input placeholder="08xxxx" value={fPicTelepon} onChange={(e) => setFPicTelepon(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Catatan</Label>
                <Input placeholder="Catatan internal" value={fCatatan} onChange={(e) => setFCatatan(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}>
                {editId ? 'Update' : 'Simpan'}
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari asuransi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipe} onChange={(e) => setTipe(e.target.value)} className="w-44">
          {TIPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
        </div>
      ) : insurances.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada data asuransi/penjamin</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3">Kode</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Tipe</th>
                <th className="py-2 pr-3">Telepon</th>
                <th className="py-2 pr-3">PIC</th>
                <th className="py-2 pr-3 text-right">Tarif %</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {insurances.map((ins) => (
                <tr key={ins.id} className={cn('border-b', !ins.is_active && 'opacity-50')}>
                  <td className="py-2.5 pr-3 font-mono text-xs">{ins.kode}</td>
                  <td className="py-2.5 pr-3 font-medium">{ins.nama}</td>
                  <td className="py-2.5 pr-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      TIPE_COLORS[ins.tipe] || 'bg-gray-100 text-gray-700',
                    )}>
                      {TIPE_LABELS[ins.tipe] || ins.tipe}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{ins.telepon || '—'}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{ins.pic_nama || '—'}</td>
                  <td className="py-2.5 pr-3 text-right font-mono">{ins.tarif_persen}%</td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={ins.is_active ? 'default' : 'secondary'} className="text-xs">
                      {ins.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(ins)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm"
                        onClick={() => toggleMut.mutate(ins.id, {
                          onSuccess: () => toast.success(
                            ins.is_active ? 'Asuransi dinonaktifkan' : 'Asuransi diaktifkan',
                          ),
                        })}
                      >
                        <Power className={cn('h-3.5 w-3.5', ins.is_active ? 'text-green-600' : 'text-gray-400')} />
                      </Button>
                      <Button variant="ghost" size="sm"
                        onClick={() => {
                          if (!confirm(`Hapus ${ins.nama}?`)) return
                          deleteMut.mutate(ins.id, {
                            onSuccess: () => toast.success('Asuransi dihapus'),
                            onError: (e) => toast.error(e.message),
                          })
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Claims */}
      {stats && stats.recent_claims.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Kunjungan 30 Hari Terakhir (per Asuransi)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recent_claims.map((c, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{c.insurance_nama}</span>
                  <span className="font-medium">{c.visit_count} kunjungan</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
