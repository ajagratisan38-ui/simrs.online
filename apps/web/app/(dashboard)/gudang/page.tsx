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
  const [fLokasi, setFLokasi] = useState('')

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
  const deleteMut = useDeleteWarehouseItem()
  const addStockMut = useAddWarehouseStock()



  const handleCreate = async () => {
    if (!fKode || !fNama) return toast.error('Kode dan Nama wajib diisi')
    try {
      await createMut.mutateAsync({
        kode: fKode, nama: fNama, kategori: fKat, satuan: fSatuan,
        harga_beli: Number(fHarga) || 0, stok_minimum: Number(fMinimum) || 5,
        lokasi: fLokasi || undefined,
      })
      toast.success('Barang berhasil ditambah')
      setShowAdd(false)
      setFKode(''); setFNama(''); setFHarga(''); setFLokasi('')
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
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Harga Beli" value={fHarga} onChange={(e) => setFHarga(e.target.value)} />
              <Input type="number" placeholder="Stok Minimum" value={fMinimum} onChange={(e) => setFMinimum(e.target.value)} />
              <Input placeholder="Lokasi (opsional)" value={fLokasi} onChange={(e) => setFLokasi(e.target.value)} />
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
                  <td className="py-2.5 pr-3 text-right">{formatRupiah(Number(item.harga_beli))}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowStockAdd(showStockAdd === item.id ? null : item.id)}
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
    </div>
  )
}
