'use client'

import { useState } from 'react'
import {
  Package, Plus, Search, Wrench, ArrowRightLeft, AlertTriangle,
  Trash2, Edit, TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DateInput, formatTanggal } from '@/components/ui/date-input'
import { getTodayLocal } from '@/lib/utils'
import {
  useAssets, useAsset, useCreateAsset, useUpdateAsset, useDeleteAsset,
  useAssetStats, useDepreciationReport, useAddMaintenance, useMaintenances,
  useAddMutation, useMutations, useGenerateAssetKode,
} from '@/hooks/use-assets'
import type {
  Asset, AssetKategori, AssetKondisi, AssetMaintenance,
} from '@/lib/api/assets'

const KATEGORI_LABELS: Record<string, string> = {
  medis: 'Medis', non_medis: 'Non Medis', kendaraan: 'Kendaraan',
  bangunan: 'Bangunan', it: 'IT', furniture: 'Furniture',
  elektronik: 'Elektronik', lainnya: 'Lainnya',
}

const KONDISI_LABELS: Record<string, string> = {
  baik: 'Baik', rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat', dalam_perbaikan: 'Dalam Perbaikan',
}

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif', tidak_aktif: 'Non-Aktif',
  dihapuskan: 'Dihapuskan', dijual: 'Dijual', hilang: 'Hilang',
}

const MAINT_TIPE: Record<string, string> = {
  perbaikan: 'Perbaikan', pemeliharaan_rutin: 'Pemeliharaan Rutin',
  kalibrasi: 'Kalibrasi', penggantian_part: 'Penggantian Part', lainnya: 'Lainnya',
}

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function kondisiBadge(k: string) {
  const colors: Record<string, string> = {
    baik: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    rusak_ringan: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    rusak_berat: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    dalam_perbaikan: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  }
  return <Badge className={colors[k] || ''}>{KONDISI_LABELS[k] || k}</Badge>
}


export default function AssetManagementPage() {
  const [tab, setTab] = useState<'list' | 'maintenance' | 'mutation' | 'depreciation'>('list')

  const tabs = [
    { key: 'list', label: 'Daftar Aset', icon: Package },
    { key: 'maintenance', label: 'Pemeliharaan', icon: Wrench },
    { key: 'mutation', label: 'Mutasi', icon: ArrowRightLeft },
    { key: 'depreciation', label: 'Penyusutan', icon: TrendingDown },
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Aset</h1>
          <p className="text-muted-foreground">Kelola aset tetap, pemeliharaan, mutasi, dan penyusutan</p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && <AssetList />}
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'mutation' && <MutationTab />}
      {tab === 'depreciation' && <DepreciationTab />}
    </div>
  )
}

// ── ASSET LIST TAB ──

function AssetList() {
  const [search, setSearch] = useState('')
  const [kategori, setKategori] = useState<string>('')
  const [kondisi, setKondisi] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, isLoading } = useAssets({
    search: search || undefined,
    kategori: kategori || undefined,
    kondisi: kondisi || undefined,
    page,
    limit: 20,
  })
  const { data: statsData } = useAssetStats()
  const deleteAsset = useDeleteAsset()

  const assets = data?.data || []
  const meta = data?.meta
  const stats = statsData?.data

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Total Aset</p>
              <p className="text-2xl font-bold">{stats.total_aset}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Nilai Perolehan</p>
              <p className="text-base font-bold truncate">{formatRp(stats.total_nilai_perolehan)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Nilai Buku</p>
              <p className="text-base font-bold text-blue-600 truncate">{formatRp(stats.total_nilai_buku)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Total Penyusutan</p>
              <p className="text-base font-bold text-orange-600 truncate">{formatRp(stats.total_penyusutan)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Biaya Pemeliharaan</p>
              <p className="text-base font-bold text-red-600 truncate">{formatRp(stats.total_biaya_pemeliharaan)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && (stats.alerts.perlu_kalibrasi.length > 0 || stats.alerts.garansi_akan_habis.length > 0) && (
        <Card className="border-yellow-300 dark:border-yellow-700">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Peringatan</span>
            </div>
            {stats.alerts.perlu_kalibrasi.length > 0 && (
              <p className="text-sm">{stats.alerts.perlu_kalibrasi.length} aset perlu kalibrasi dalam 3 bulan ke depan</p>
            )}
            {stats.alerts.garansi_akan_habis.length > 0 && (
              <p className="text-sm">{stats.alerts.garansi_akan_habis.length} aset garansi akan habis dalam 3 bulan</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_170px_170px_auto] gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, kode, merk, serial..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={kategori || 'all'} onValueChange={v => { setKategori(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {Object.entries(KATEGORI_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kondisi || 'all'} onValueChange={v => { setKondisi(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger><SelectValue placeholder="Semua Kondisi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kondisi</SelectItem>
            {Object.entries(KONDISI_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" /> Tambah Aset
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm table-fixed">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 w-[110px] whitespace-nowrap">Kode</th>
              <th className="text-left p-3 w-auto whitespace-nowrap">Nama Aset</th>
              <th className="text-left p-3 w-[100px] whitespace-nowrap">Kategori</th>
              <th className="text-left p-3 w-[120px] whitespace-nowrap">Lokasi</th>
              <th className="text-left p-3 w-[110px] whitespace-nowrap">Kondisi</th>
              <th className="text-right p-3 w-[130px] whitespace-nowrap">Nilai Perolehan</th>
              <th className="text-right p-3 w-[120px] whitespace-nowrap">Nilai Buku</th>
              <th className="text-center p-3 w-[80px] whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Memuat...</td></tr>
            ) : assets.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Belum ada data aset</td></tr>
            ) : assets.map(a => (
              <tr key={a.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(a.id)}>
                <td className="p-3 font-mono text-xs whitespace-nowrap">{a.kode}</td>
                <td className="p-3">
                  <div className="font-medium truncate">{a.nama}</div>
                  {a.merk && <div className="text-xs text-muted-foreground truncate">{a.merk} {a.model || ''}</div>}
                </td>
                <td className="p-3"><Badge variant="outline" className="whitespace-nowrap">{KATEGORI_LABELS[a.kategori] || a.kategori}</Badge></td>
                <td className="p-3 text-xs truncate">{a.lokasi_ruangan || '-'}</td>
                <td className="p-3">{kondisiBadge(a.kondisi)}</td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap">{formatRp(a.harga_perolehan)}</td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap">{formatRp(a.nilai_buku)}</td>
                <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 justify-center">
                    <Button variant="ghost" size="icon" onClick={() => setEditAsset(a)} title="Edit">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => { if (confirm(`Hapus aset "${a.nama}"?`)) deleteAsset.mutate(a.id) }}
                      title="Hapus"
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

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="px-3 py-1 text-sm">Hal {page} / {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {(showCreate || editAsset) && (
        <AssetFormDialog
          asset={editAsset}
          onClose={() => { setShowCreate(false); setEditAsset(null) }}
        />
      )}

      {detailId && (
        <AssetDetailDialog id={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}

// ── ASSET FORM DIALOG ──

function AssetFormDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const isEdit = !!asset
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()

  const [form, setForm] = useState({
    kode: asset?.kode || '',
    nama: asset?.nama || '',
    kategori: asset?.kategori || 'medis',
    merk: asset?.merk || '',
    model: asset?.model || '',
    serial_number: asset?.serial_number || '',
    tanggal_pembelian: asset?.tanggal_pembelian || '',
    harga_perolehan: asset?.harga_perolehan || 0,
    vendor: asset?.vendor || '',
    no_faktur: asset?.no_faktur || '',
    umur_ekonomis_tahun: asset?.umur_ekonomis_tahun || 5,
    nilai_residu: asset?.nilai_residu || 0,
    metode_penyusutan: asset?.metode_penyusutan || 'garis_lurus',
    lokasi_gedung: asset?.lokasi_gedung || '',
    lokasi_lantai: asset?.lokasi_lantai || '',
    lokasi_ruangan: asset?.lokasi_ruangan || '',
    penanggung_jawab: asset?.penanggung_jawab || '',
    kondisi: asset?.kondisi || 'baik',
    garansi_mulai: asset?.garansi_mulai || '',
    garansi_berakhir: asset?.garansi_berakhir || '',
    interval_kalibrasi_bulan: asset?.interval_kalibrasi_bulan || 0,
    catatan: asset?.catatan || '',
  })

  const { data: kodeData } = useGenerateAssetKode(form.kategori)

  const handleSubmit = async () => {
    const payload = { ...form }
    if (!isEdit && kodeData?.data?.kode && !form.kode) {
      payload.kode = kodeData.data.kode
    }
    if (isEdit) {
      await updateAsset.mutateAsync({ id: asset!.id, data: payload as Partial<Asset> })
    } else {
      await createAsset.mutateAsync(payload as Partial<Asset>)
    }
    onClose()
  }

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }))

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Aset' : 'Tambah Aset Baru'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Kode Aset</Label>
            <Input
              value={form.kode || kodeData?.data?.kode || ''}
              onChange={e => set('kode', e.target.value)}
              placeholder="Auto-generate"
            />
          </div>
          <div>
            <Label>Nama Aset *</Label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="CT-Scan GE Revolution" />
          </div>
          <div>
            <Label>Kategori</Label>
            <Select value={form.kategori} onValueChange={v => set('kategori', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(KATEGORI_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Merk</Label>
            <Input value={form.merk} onChange={e => set('merk', e.target.value)} placeholder="GE Healthcare" />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Revolution CT" />
          </div>
          <div>
            <Label>Serial Number</Label>
            <Input value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
          </div>
          <div>
            <Label>Harga Perolehan (Rp) *</Label>
            <Input type="number" value={form.harga_perolehan} onChange={e => set('harga_perolehan', Number(e.target.value))} />
          </div>
          <div>
            <Label>Tanggal Pembelian</Label>
            <DateInput value={form.tanggal_pembelian} onChange={v => set('tanggal_pembelian', v)} />
          </div>
          <div>
            <Label>Vendor / Supplier</Label>
            <Input value={form.vendor} onChange={e => set('vendor', e.target.value)} />
          </div>
          <div>
            <Label>No. Faktur</Label>
            <Input value={form.no_faktur} onChange={e => set('no_faktur', e.target.value)} />
          </div>
          <div>
            <Label>Umur Ekonomis (tahun)</Label>
            <Input type="number" value={form.umur_ekonomis_tahun} onChange={e => set('umur_ekonomis_tahun', Number(e.target.value))} />
          </div>
          <div>
            <Label>Nilai Residu (Rp)</Label>
            <Input type="number" value={form.nilai_residu} onChange={e => set('nilai_residu', Number(e.target.value))} />
          </div>
          <div>
            <Label>Metode Penyusutan</Label>
            <Select value={form.metode_penyusutan} onValueChange={v => set('metode_penyusutan', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="garis_lurus">Garis Lurus</SelectItem>
                <SelectItem value="saldo_menurun">Saldo Menurun Ganda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Kondisi</Label>
            <Select value={form.kondisi} onValueChange={v => set('kondisi', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(KONDISI_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lokasi Gedung</Label>
            <Input value={form.lokasi_gedung} onChange={e => set('lokasi_gedung', e.target.value)} placeholder="Gedung A" />
          </div>
          <div>
            <Label>Lokasi Lantai</Label>
            <Input value={form.lokasi_lantai} onChange={e => set('lokasi_lantai', e.target.value)} placeholder="Lantai 2" />
          </div>
          <div>
            <Label>Lokasi Ruangan</Label>
            <Input value={form.lokasi_ruangan} onChange={e => set('lokasi_ruangan', e.target.value)} placeholder="Ruang Radiologi" />
          </div>
          <div>
            <Label>Penanggung Jawab</Label>
            <Input value={form.penanggung_jawab} onChange={e => set('penanggung_jawab', e.target.value)} />
          </div>
          <div>
            <Label>Garansi Mulai</Label>
            <DateInput value={form.garansi_mulai} onChange={v => set('garansi_mulai', v)} />
          </div>
          <div>
            <Label>Garansi Berakhir</Label>
            <DateInput value={form.garansi_berakhir} onChange={v => set('garansi_berakhir', v)} />
          </div>
          <div>
            <Label>Interval Kalibrasi (bulan)</Label>
            <Input type="number" value={form.interval_kalibrasi_bulan} onChange={e => set('interval_kalibrasi_bulan', Number(e.target.value))} placeholder="0 = tidak perlu" />
          </div>
          <div className="col-span-2">
            <Label>Catatan</Label>
            <Textarea value={form.catatan} onChange={e => set('catatan', e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={!form.nama || createAsset.isPending || updateAsset.isPending}>
            {isEdit ? 'Simpan Perubahan' : 'Tambah Aset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── ASSET DETAIL DIALOG ──

function AssetDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useAsset(id)
  const asset = data?.data

  if (isLoading || !asset) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent><p className="text-center py-8">Memuat...</p></DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset.nama}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Kode:</span> <span className="font-mono">{asset.kode}</span></div>
            <div><span className="text-muted-foreground">Kategori:</span> {KATEGORI_LABELS[asset.kategori]}</div>
            <div><span className="text-muted-foreground">Merk/Model:</span> {asset.merk} {asset.model}</div>
            <div><span className="text-muted-foreground">Serial:</span> {asset.serial_number || '-'}</div>
            <div><span className="text-muted-foreground">Lokasi:</span> {[asset.lokasi_gedung, asset.lokasi_lantai, asset.lokasi_ruangan].filter(Boolean).join(' - ') || '-'}</div>
            <div><span className="text-muted-foreground">PJ:</span> {asset.penanggung_jawab || '-'}</div>
            <div><span className="text-muted-foreground">Kondisi:</span> {kondisiBadge(asset.kondisi)}</div>
            <div><span className="text-muted-foreground">Status:</span> <Badge>{STATUS_LABELS[asset.status]}</Badge></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-3 text-center">
                <p className="text-xs text-muted-foreground">Harga Perolehan</p>
                <p className="font-bold">{formatRp(asset.harga_perolehan)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 text-center">
                <p className="text-xs text-muted-foreground">Nilai Buku</p>
                <p className="font-bold text-blue-600">{formatRp(asset.nilai_buku)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 text-center">
                <p className="text-xs text-muted-foreground">Penyusutan/Tahun</p>
                <p className="font-bold text-orange-600">{formatRp(asset.penyusutan_per_tahun)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full"
                style={{ width: `${Math.min(asset.persentase_penyusutan, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{asset.persentase_penyusutan}% tersusut</span>
            <span className="text-xs">| {asset.umur_tersisa_bulan} bln tersisa</span>
          </div>

          {asset.maintenances.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Riwayat Pemeliharaan</h4>
              <div className="space-y-1">
                {asset.maintenances.slice(0, 5).map(m => (
                  <div key={m.id} className="flex justify-between text-xs border-b py-1">
                    <span>{formatTanggal(m.tanggal)} — {MAINT_TIPE[m.tipe] || m.tipe}: {m.deskripsi}</span>
                    <span className="font-mono">{formatRp(m.biaya)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {asset.mutations.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Riwayat Mutasi</h4>
              <div className="space-y-1">
                {asset.mutations.slice(0, 5).map(m => (
                  <div key={m.id} className="text-xs border-b py-1">
                    {formatTanggal(m.tanggal)} — {m.tipe}: {m.dari_lokasi} → {m.ke_lokasi || '-'} {m.alasan ? `(${m.alasan})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── MAINTENANCE TAB ──

function MaintenanceTab() {
  const [showAdd, setShowAdd] = useState(false)
  const [tipeFilter, setTipeFilter] = useState('')
  const { data, isLoading } = useMaintenances({ tipe: tipeFilter || undefined })
  const items = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Select value={tipeFilter} onValueChange={v => setTipeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipe Pemeliharaan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            {Object.entries(MAINT_TIPE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" /> Tambah Record</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Tanggal</th>
              <th className="text-left p-3">Aset</th>
              <th className="text-left p-3">Tipe</th>
              <th className="text-left p-3">Deskripsi</th>
              <th className="text-left p-3">Teknisi</th>
              <th className="text-right p-3">Biaya</th>
              <th className="text-left p-3">Hasil</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Memuat...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Belum ada data pemeliharaan</td></tr>
            ) : items.map((m: AssetMaintenance) => (
              <tr key={m.id} className="border-t">
                <td className="p-3 text-xs whitespace-nowrap">{formatTanggal(m.tanggal)}</td>
                <td className="p-3"><span className="font-mono text-xs">{m.asset_kode}</span> {m.asset_nama}</td>
                <td className="p-3"><Badge variant="outline">{MAINT_TIPE[m.tipe] || m.tipe}</Badge></td>
                <td className="p-3 max-w-[200px] truncate">{m.deskripsi}</td>
                <td className="p-3 text-xs">{m.teknisi || '-'}</td>
                <td className="p-3 text-right font-mono text-xs">{formatRp(m.biaya)}</td>
                <td className="p-3">
                  <Badge className={m.hasil === 'selesai' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {m.hasil}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <MaintenanceFormDialog onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function MaintenanceFormDialog({ onClose }: { onClose: () => void }) {
  const addMaint = useAddMaintenance()
  const [form, setForm] = useState({
    asset_id: '', tipe: 'perbaikan', tanggal: getTodayLocal(),
    deskripsi: '', teknisi: '', vendor: '', biaya: 0, hasil: 'selesai',
    tanggal_selanjutnya: '', catatan: '',
  })
  const { data: assetsData } = useAssets({ limit: 200 })
  const assetOptions = assetsData?.data || []

  const set = (f: string, v: unknown) => setForm(prev => ({ ...prev, [f]: v }))

  const handleSubmit = async () => {
    await addMaint.mutateAsync(form)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Tambah Record Pemeliharaan</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Aset *</Label>
            <Select value={form.asset_id} onValueChange={v => set('asset_id', v)}>
              <SelectTrigger><SelectValue placeholder="Pilih aset" /></SelectTrigger>
              <SelectContent>
                {assetOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.kode} — {a.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipe</Label>
            <Select value={form.tipe} onValueChange={v => set('tipe', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MAINT_TIPE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tanggal</Label>
            <DateInput value={form.tanggal} onChange={v => set('tanggal', v)} />
          </div>
          <div className="col-span-2">
            <Label>Deskripsi *</Label>
            <Textarea value={form.deskripsi} onChange={e => set('deskripsi', e.target.value)} rows={2} />
          </div>
          <div><Label>Teknisi</Label><Input value={form.teknisi} onChange={e => set('teknisi', e.target.value)} /></div>
          <div><Label>Biaya (Rp)</Label><Input type="number" value={form.biaya} onChange={e => set('biaya', Number(e.target.value))} /></div>
          <div>
            <Label>Hasil</Label>
            <Select value={form.hasil} onValueChange={v => set('hasil', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="selesai">Selesai</SelectItem>
                <SelectItem value="perlu_tindak_lanjut">Perlu Tindak Lanjut</SelectItem>
                <SelectItem value="gagal">Gagal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Jadwal Selanjutnya</Label><DateInput value={form.tanggal_selanjutnya} onChange={v => set('tanggal_selanjutnya', v)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={!form.asset_id || !form.deskripsi || addMaint.isPending}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── MUTATION TAB ──

function MutationTab() {
  const [showAdd, setShowAdd] = useState(false)
  const { data, isLoading } = useMutations({})
  const items = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}><ArrowRightLeft className="h-4 w-4 mr-2" /> Tambah Mutasi</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Tanggal</th>
              <th className="text-left p-3">Aset</th>
              <th className="text-left p-3">Tipe</th>
              <th className="text-left p-3">Dari</th>
              <th className="text-left p-3">Ke</th>
              <th className="text-left p-3">Alasan</th>
              <th className="text-left p-3">BA</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Memuat...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Belum ada data mutasi</td></tr>
            ) : items.map(m => (
              <tr key={m.id} className="border-t">
                <td className="p-3 text-xs whitespace-nowrap">{formatTanggal(m.tanggal)}</td>
                <td className="p-3"><span className="font-mono text-xs">{m.asset_kode}</span> {m.asset_nama}</td>
                <td className="p-3"><Badge variant="outline">{m.tipe}</Badge></td>
                <td className="p-3 text-xs">{m.dari_lokasi || '-'}</td>
                <td className="p-3 text-xs">{m.ke_lokasi || '-'}</td>
                <td className="p-3 text-xs max-w-[150px] truncate">{m.alasan || '-'}</td>
                <td className="p-3 text-xs">{m.no_berita_acara || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <MutationFormDialog onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function MutationFormDialog({ onClose }: { onClose: () => void }) {
  const addMut = useAddMutation()
  const [form, setForm] = useState({
    asset_id: '', tipe: 'pindah', tanggal: getTodayLocal(),
    ke_lokasi: '', alasan: '', nilai_jual: 0, no_berita_acara: '', disetujui_oleh: '', catatan: '',
  })
  const { data: assetsData } = useAssets({ limit: 200 })
  const assetOptions = assetsData?.data || []

  const set = (f: string, v: unknown) => setForm(prev => ({ ...prev, [f]: v }))

  const handleSubmit = async () => {
    await addMut.mutateAsync(form)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Tambah Mutasi Aset</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Aset *</Label>
            <Select value={form.asset_id} onValueChange={v => set('asset_id', v)}>
              <SelectTrigger><SelectValue placeholder="Pilih aset" /></SelectTrigger>
              <SelectContent>
                {assetOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.kode} — {a.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipe Mutasi</Label>
            <Select value={form.tipe} onValueChange={v => set('tipe', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pindah">Pindah Lokasi</SelectItem>
                <SelectItem value="penghapusan">Penghapusan</SelectItem>
                <SelectItem value="penjualan">Penjualan</SelectItem>
                <SelectItem value="hibah">Hibah</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Tanggal</Label><DateInput value={form.tanggal} onChange={v => set('tanggal', v)} /></div>
          {form.tipe === 'pindah' && (
            <div className="col-span-2"><Label>Lokasi Tujuan *</Label><Input value={form.ke_lokasi} onChange={e => set('ke_lokasi', e.target.value)} placeholder="Ruang Radiologi Lt.2" /></div>
          )}
          {form.tipe === 'penjualan' && (
            <div><Label>Nilai Jual (Rp)</Label><Input type="number" value={form.nilai_jual} onChange={e => set('nilai_jual', Number(e.target.value))} /></div>
          )}
          <div className="col-span-2"><Label>Alasan</Label><Textarea value={form.alasan} onChange={e => set('alasan', e.target.value)} rows={2} /></div>
          <div><Label>No. Berita Acara</Label><Input value={form.no_berita_acara} onChange={e => set('no_berita_acara', e.target.value)} /></div>
          <div><Label>Disetujui Oleh</Label><Input value={form.disetujui_oleh} onChange={e => set('disetujui_oleh', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSubmit} disabled={!form.asset_id || addMut.isPending}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── DEPRECIATION TAB ──

function DepreciationTab() {
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const { data, isLoading } = useDepreciationReport(tahun)
  const report = data?.data

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label>Tahun:</Label>
        <Input type="number" value={tahun} onChange={e => setTahun(Number(e.target.value))} className="w-[100px]" />
      </div>

      {report?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Total Aset Aktif</p>
              <p className="text-2xl font-bold">{report.summary.total_aset}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Total Perolehan</p>
              <p className="text-lg font-bold">{formatRp(report.summary.total_harga_perolehan)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Total Nilai Buku</p>
              <p className="text-lg font-bold text-blue-600">{formatRp(report.summary.total_nilai_buku)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Penyusutan Tahun Ini</p>
              <p className="text-lg font-bold text-orange-600">{formatRp(report.summary.total_penyusutan_tahun_ini)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Kode</th>
              <th className="text-left p-3">Nama</th>
              <th className="text-left p-3">Kategori</th>
              <th className="text-right p-3">Harga Perolehan</th>
              <th className="text-center p-3">Umur (th)</th>
              <th className="text-center p-3">Metode</th>
              <th className="text-right p-3">Penyusutan/Thn</th>
              <th className="text-right p-3">Akum. Penyusutan</th>
              <th className="text-right p-3">Nilai Buku</th>
              <th className="text-center p-3">Sisa (bln)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Memuat...</td></tr>
            ) : !report?.data?.length ? (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Tidak ada data</td></tr>
            ) : report.data.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-mono text-xs">{a.kode}</td>
                <td className="p-3">{a.nama}</td>
                <td className="p-3"><Badge variant="outline">{KATEGORI_LABELS[a.kategori] || a.kategori}</Badge></td>
                <td className="p-3 text-right font-mono text-xs">{formatRp(a.harga_perolehan)}</td>
                <td className="p-3 text-center">{a.umur_ekonomis_tahun}</td>
                <td className="p-3 text-center text-xs">{a.metode_penyusutan === 'garis_lurus' ? 'GL' : 'SM'}</td>
                <td className="p-3 text-right font-mono text-xs">{formatRp(a.penyusutan_per_tahun)}</td>
                <td className="p-3 text-right font-mono text-xs text-orange-600">{formatRp(a.total_penyusutan)}</td>
                <td className="p-3 text-right font-mono text-xs text-blue-600">{formatRp(a.nilai_buku)}</td>
                <td className="p-3 text-center">{a.umur_tersisa_bulan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
