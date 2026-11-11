'use client'

import { formatRupiah } from '@/lib/utils'
import { useState } from 'react'
import {
  Warehouse,
  Search,
  Plus,
  Package,
  Trash2,
  PlusCircle,
  Pencil,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  useWarehouseItems,
  useCreateWarehouseItem,
  useUpdateWarehouseItem,
  useDeleteWarehouseItem,
  useAddWarehouseStock,
} from '@/hooks/use-warehouse'
import { cn } from '@/lib/utils'

const KATEGORI_OPTIONS = [
  { value: '', label: 'Semua Kategori' },
  { value: 'alkes', label: 'Alat Kesehatan' },
  { value: 'bhp', label: 'Bahan Habis Pakai' },
  { value: 'atk', label: 'ATK' },
  { value: 'linen', label: 'Linen' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'rt', label: 'Rumah Tangga' },
  { value: 'lain_lain', label: 'Lain-lain' },
]

const KATEGORI_LABELS: Record<string, string> = Object.fromEntries(
  KATEGORI_OPTIONS.filter((k) => k.value).map((k) => [k.value, k.label]),
)

export default function GudangPage() {
  const [search, setSearch] = useState('')
  const [kategori, setKategori] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showStockAdd, setShowStockAdd] = useState<string | null>(null)

  // Create form
  const [fKode, setFKode] = useState('')
  const [fNama, setFNama] = useState('')
  const [fKat, setFKat] = useState('lain_lain')
  const [fSatuan, setFSatuan] = useState('pcs')
  const [fHarga, setFHarga] = useState('')
  const [fMinimum, setFMinimum] = useState('5')
  const [fStokAwal, setFStokAwal] = useState('')
  const [fLokasi, setFLokasi] = useState('')

  // Edit form
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null)
  const [eNama, setENama] = useState('')
  const [eKat, setEKat] = useState('')
  const [eSatuan, setESatuan] = useState('')
  const [eHarga, setEHarga] = useState('')
  const [eMinimum, setEMinimum] = useState('')
  const [eLokasi, setELokasi] = useState('')
  const [eTambahStok, setETambahStok] = useState('')

  // Stock add form
  const [sJumlah, setSJumlah] = useState('')
  const [sBatch, setSBatch] = useState('')
  const [sSupplier, setSSupplier] = useState('')

  const { data: res, isLoading } = useWarehouseItems({
    search: search || undefined,
    kategori: kategori || undefined,
  })
  const items = res?.data ?? []

  const createMut = useCreateWarehouseItem()
  const updateMut = useUpdateWarehouseItem()
  const deleteMut = useDeleteWarehouseItem()
  const addStockMut = useAddWarehouseStock()



  const handleCreate = async () => {
    if (!fKode || !fNama) return toast.error('Kode dan Nama wajib diisi')
    try {
      const created = await createMut.mutateAsync({
        kode: fKode, nama: fNama, kategori: fKat, satuan: fSatuan,
        harga_beli: Number(fHarga) || 0, stok_minimum: Number(fMinimum) || 5,
        lokasi: fLokasi || undefined,
      })
      const stokAwal = Number(fStokAwal) || 0
      if (stokAwal > 0 && created?.data?.id) {
        await addStockMut.mutateAsync({
          item_id: created.data.id,
          jumlah: stokAwal,
        })
      }
      toast.success(`Barang berhasil ditambah${stokAwal > 0 ? ` dengan stok awal ${stokAwal}` : ''}`)
      setShowAdd(false)
      setFKode(''); setFNama(''); setFHarga(''); setFLokasi(''); setFStokAwal('')
      setFMinimum('5')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  const handleAddStock = async (itemId: string) => {
    if (!sJumlah || Number(sJumlah) <= 0) return toast.error('Jumlah harus > 0')
    try {
      await addStockMut.mutateAsync({
        item_id: itemId, jumlah: Number(sJumlah),
        batch_number: sBatch || undefined, supplier: sSupplier || undefined,
      })
      toast.success('Stok berhasil ditambahkan')
      setShowStockAdd(null); setSJumlah(''); setSBatch(''); setSSupplier('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal')
    }
  }

  const openEdit = (item: Record<string, unknown>) => {
    setEditItem(item)
    setENama(item.nama as string || '')
    setEKat(item.kategori as string || 'lain_lain')
    setESatuan(item.satuan as string || 'pcs')
    setEHarga(String(item.harga_beli ?? ''))
    setEMinimum(String(item.stok_minimum ?? '5'))
    setELokasi(item.lokasi as string || '')
    setETambahStok('')
  }

  const handleUpdate = async () => {
    if (!editItem || !eNama) return toast.error('Nama wajib diisi')
    try {
      await updateMut.mutateAsync({
        id: editItem.id as string,
        data: {
          nama: eNama,
          kategori: eKat,
          satuan: eSatuan,
          harga_beli: Number(eHarga) || 0,
          stok_minimum: Number(eMinimum) || 0,
          lokasi: eLokasi || null,
        },
      })
      const tambahStok = Number(eTambahStok) || 0
      if (tambahStok > 0) {
        await addStockMut.mutateAsync({
          item_id: editItem.id as string,
          jumlah: tambahStok,
        })
      }
      toast.success(`Barang berhasil diperbarui${tambahStok > 0 ? ` + stok ditambah ${tambahStok}` : ''}`)
      setEditItem(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui')
    }
  }

  const lowStock = items.filter((i) => i.total_stok <= i.stok_minimum)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-teal-600" />
            Gudang Umum
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manajemen barang non-farmasi
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah Barang
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4">
            <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              ⚠ {lowStock.length} barang stok rendah:
              {' '}
              {lowStock.slice(0, 5).map((i) => i.nama).join(', ')}
              {lowStock.length > 5 && ` +${lowStock.length - 5} lagi`}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add form */}
      {showAdd && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tambah Barang Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input placeholder="Kode" value={fKode} onChange={(e) => setFKode(e.target.value)} />
              <Input placeholder="Nama Barang" value={fNama} onChange={(e) => setFNama(e.target.value)} />
              <Select value={fKat} onChange={(e) => setFKat(e.target.value)}>
                {KATEGORI_OPTIONS.filter((k) => k.value).map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </Select>
              <Input placeholder="Satuan" value={fSatuan} onChange={(e) => setFSatuan(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Harga Beli" value={fHarga} onChange={(e) => setFHarga(e.target.value)} />
              <Input placeholder="Lokasi (opsional)" value={fLokasi} onChange={(e) => setFLokasi(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stok Awal</label>
                <Input type="number" placeholder="0" value={fStokAwal} onChange={(e) => setFStokAwal(e.target.value)} min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stok Minimum (alert)</label>
                <Input type="number" placeholder="5" value={fMinimum} onChange={(e) => setFMinimum(e.target.value)} min="0" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createMut.isPending}>Simpan</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari barang..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-48">
          {KATEGORI_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </Select>
      </div>

      {/* Items Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
          Belum ada barang gudang
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3">Kode</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Kategori</th>
                <th className="py-2 pr-3">Satuan</th>
                <th className="py-2 pr-3 text-right">Stok</th>
                <th className="py-2 pr-3 text-right">Min</th>
                <th className="py-2 pr-3 text-right">Harga Beli</th>
                <th className="py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2.5 pr-3 font-mono text-xs">{item.kode}</td>
                  <td className="py-2.5 pr-3 font-medium">{item.nama}</td>
                  <td className="py-2.5 pr-3">
                    <Badge variant="outline" className="text-xs">
                      {KATEGORI_LABELS[item.kategori] || item.kategori}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3">{item.satuan}</td>
                  <td className={cn(
                    'py-2.5 pr-3 text-right font-medium',
                    item.total_stok <= item.stok_minimum && 'text-red-600',
                  )}>
                    {item.total_stok}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground text-xs">
                    {item.stok_minimum}
                  </td>
                  <td className="py-2.5 pr-3 text-right">{formatRupiah(Number(item.harga_beli))}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowStockAdd(showStockAdd === item.id ? null : item.id)}
                        title="Tambah Stok"
                      >
                        <PlusCircle className="h-4 w-4 text-teal-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          deleteMut.mutate(item.id, {
                            onSuccess: () => toast.success('Barang dihapus'),
                            onError: (e) => toast.error(e.message),
                          })
                        }
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    {showStockAdd === item.id && (
                      <div className="mt-2 p-3 bg-muted rounded-lg text-left space-y-2">
                        <div className="text-xs font-medium">Tambah Stok: {item.nama}</div>
                        <div className="grid grid-cols-3 gap-2">
                          <Input type="number" placeholder="Jumlah" value={sJumlah} onChange={(e) => setSJumlah(e.target.value)} className="text-xs" />
                          <Input placeholder="Batch" value={sBatch} onChange={(e) => setSBatch(e.target.value)} className="text-xs" />
                          <Input placeholder="Supplier" value={sSupplier} onChange={(e) => setSSupplier(e.target.value)} className="text-xs" />
                        </div>
                        <Button size="sm" onClick={() => handleAddStock(item.id)} disabled={addStockMut.isPending} className="text-xs">
                          Simpan Stok
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Barang</h2>
              <button onClick={() => setEditItem(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kode</label>
                <Input value={editItem.kode as string} disabled className="bg-muted text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nama Barang *</label>
                <Input value={eNama} onChange={(e) => setENama(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kategori</label>
                  <Select value={eKat} onChange={(e) => setEKat(e.target.value)}>
                    {KATEGORI_OPTIONS.filter((k) => k.value).map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Satuan</label>
                  <Input value={eSatuan} onChange={(e) => setESatuan(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Harga Beli</label>
                  <Input type="number" value={eHarga} onChange={(e) => setEHarga(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stok Minimum</label>
                  <Input type="number" value={eMinimum} onChange={(e) => setEMinimum(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Lokasi</label>
                <Input value={eLokasi} onChange={(e) => setELokasi(e.target.value)} placeholder="Opsional" />
              </div>
              <div className="border-t pt-3 mt-1">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Tambah Stok <span className="text-muted-foreground">(opsional — stok saat ini: {(editItem as Record<string, unknown>)?.total_stok ?? 0})</span>
                </label>
                <Input type="number" placeholder="0" value={eTambahStok} onChange={(e) => setETambahStok(e.target.value)} min="0" />
                <p className="text-[11px] text-muted-foreground mt-0.5">Isi angka untuk menambah stok bersamaan dengan edit</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setEditItem(null)}>Batal</Button>
              <Button size="sm" onClick={handleUpdate} disabled={updateMut.isPending || addStockMut.isPending}>
                {updateMut.isPending || addStockMut.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
