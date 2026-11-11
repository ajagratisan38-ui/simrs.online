'use client'

import { formatRupiah } from '@/lib/utils'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Loader2,
  ShoppingCart,
  Building2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import {
  usePurchaseOrders,
  useCreatePO,
  useSuppliers,
  useCreateSupplier,
  useDeleteSupplier,
} from '@/hooks/use-purchase-order'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'

type DrugSearchResult = {
  id: string
  nama: string
  kode: string
  satuan_kecil: string
  harga_beli: number
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Disetujui',
  ordered: 'Dipesan',
  received: 'Diterima',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
  draft: 'secondary',
  approved: 'default',
  ordered: 'default',
  received: 'success',
  completed: 'success',
  cancelled: 'destructive',
}


interface POItemDraft {
  drug_id: string
  drug_nama: string
  satuan: string
  jumlah: number
  harga_satuan: number
}

export default function PurchaseOrderPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const searchParam = useMemo(() => search.trim() || undefined, [search])
  const { data: poRes, isLoading, isFetching } = usePurchaseOrders({
    page,
    limit: 20,
    status: statusFilter || undefined,
    search: searchParam,
  })
  const orders = poRes?.data ?? []
  const meta = poRes?.meta

  const { data: suppRes } = useSuppliers()
  const suppliers = suppRes?.data ?? []

  // --- Create PO dialog ---
  const [showCreatePO, setShowCreatePO] = useState(false)
  const [poSupplierId, setPOSupplierId] = useState('')
  const [poCatatan, setPOCatatan] = useState('')
  const [poDiskon, setPODiskon] = useState(0)
  const [poPpn, setPOPpn] = useState(11)
  const [poItems, setPOItems] = useState<POItemDraft[]>([])
  const [drugSearch, setDrugSearch] = useState('')
  const [drugResults, setDrugResults] = useState<DrugSearchResult[]>([])
  const [searchingDrugs, setSearchingDrugs] = useState(false)

  const createPOMut = useCreatePO()

  // --- Supplier dialog ---
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [suppForm, setSuppForm] = useState({ kode: '', nama: '', telepon: '', alamat: '', kota: '' })
  const createSuppMut = useCreateSupplier()
  const deleteSuppMut = useDeleteSupplier()

  const searchDrugs = useCallback(async (q: string) => {
    if (q.length < 2) { setDrugResults([]); return }
    setSearchingDrugs(true)
    try {
      const res = await apiClient<{ success: boolean; data: DrugSearchResult[] }>(
        `/drugs/search?q=${encodeURIComponent(q)}&limit=10`,
      )
      setDrugResults(res.data || [])
    } catch {
      setDrugResults([])
    } finally {
      setSearchingDrugs(false)
    }
  }, [])

  const addDrugToItems = (drug: DrugSearchResult) => {
    if (poItems.some((i) => i.drug_id === drug.id)) {
      toast.error('Obat sudah ada di daftar')
      return
    }
    setPOItems([...poItems, {
      drug_id: drug.id,
      drug_nama: drug.nama,
      satuan: drug.satuan_kecil,
      jumlah: 1,
      harga_satuan: drug.harga_beli,
    }])
    setDrugSearch('')
    setDrugResults([])
  }

  const removeItem = (idx: number) => {
    setPOItems(poItems.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: 'jumlah' | 'harga_satuan', value: number) => {
    setPOItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    ))
  }

  const subtotal = poItems.reduce((s, i) => s + i.jumlah * i.harga_satuan, 0)
  const ppnAmount = Math.round((subtotal - poDiskon) * poPpn / 100)
  const grandTotal = subtotal - poDiskon + ppnAmount

  const handleCreatePO = async () => {
    if (!poSupplierId) { toast.error('Pilih supplier'); return }
    if (poItems.length === 0) { toast.error('Tambahkan minimal 1 item'); return }
    try {
      await createPOMut.mutateAsync({
        supplier_id: poSupplierId,
        catatan: poCatatan || undefined,
        diskon: poDiskon,
        ppn_persen: poPpn,
        items: poItems,
      })
      toast.success('Purchase Order berhasil dibuat')
      setShowCreatePO(false)
      resetPOForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat PO')
    }
  }

  const resetPOForm = () => {
    setPOSupplierId('')
    setPOCatatan('')
    setPODiskon(0)
    setPOPpn(11)
    setPOItems([])
    setDrugSearch('')
    setDrugResults([])
  }

  const handleCreateSupplier = async () => {
    if (!suppForm.kode || !suppForm.nama) { toast.error('Kode dan Nama wajib diisi'); return }
    try {
      await createSuppMut.mutateAsync(suppForm)
      toast.success('Supplier berhasil ditambahkan')
      setShowSupplierDialog(false)
      setSuppForm({ kode: '', nama: '', telepon: '', alamat: '', kota: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambah supplier')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-teal-600" />
            Purchase Order
          </h1>
          <p className="text-muted-foreground">Kelola pembelian obat ke supplier</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSupplierDialog(true)}>
            <Building2 className="h-4 w-4 mr-2" />
            Supplier
          </Button>
          <Button onClick={() => { resetPOForm(); setShowCreatePO(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Buat PO
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor PO / supplier..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            autoComplete="off"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        {isFetching && !isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* PO List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada Purchase Order</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono font-medium">{po.nomor_po}</TableCell>
                    <TableCell>{po.supplier_nama}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(po.tanggal_po).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{po.item_count} item</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(Number(po.grand_total))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[po.status] || 'outline'}>
                        {STATUS_LABELS[po.status] || po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/farmasi/purchase-order/${po.id}`}>Detail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {meta.page} dari {meta.totalPages} ({meta.total} PO)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* === CREATE PO DIALOG === */}
      <Dialog open={showCreatePO} onOpenChange={setShowCreatePO}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Purchase Order Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Supplier select */}
            <div>
              <Label>Supplier</Label>
              <Select value={poSupplierId} onChange={(e) => setPOSupplierId(e.target.value)}>
                <option value="">Pilih Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.kode} — {s.nama}</option>
                ))}
              </Select>
            </div>

            {/* Drug search + add */}
            <div>
              <Label>Tambah Obat</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari obat..."
                  className="pl-8"
                  value={drugSearch}
                  onChange={(e) => { setDrugSearch(e.target.value); searchDrugs(e.target.value) }}
                  autoComplete="off"
                />
                {drugResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {drugResults.map((drug) => (
                      <button
                        key={drug.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between"
                        onClick={() => addDrugToItems(drug)}
                      >
                        <span>{drug.nama} ({drug.kode})</span>
                        <span className="text-muted-foreground">{formatRupiah(drug.harga_beli)}/{drug.satuan_kecil}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchingDrugs && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            {/* Items table */}
            {poItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obat</TableHead>
                    <TableHead className="w-24">Jumlah</TableHead>
                    <TableHead className="w-36">Harga Satuan</TableHead>
                    <TableHead className="text-right w-32">Subtotal</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems.map((item, idx) => (
                    <TableRow key={item.drug_id}>
                      <TableCell>
                        <div className="text-sm font-medium">{item.drug_nama}</div>
                        <div className="text-xs text-muted-foreground">{item.satuan}</div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.jumlah}
                          onChange={(e) => updateItem(idx, 'jumlah', parseInt(e.target.value) || 1)}
                          className="w-20 h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={item.harga_satuan}
                          onChange={(e) => updateItem(idx, 'harga_satuan', parseFloat(e.target.value) || 0)}
                          className="w-32 h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(item.jumlah * item.harga_satuan)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Totals */}
            {poItems.length > 0 && (
              <div className="space-y-2 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Diskon</span>
                  <Input
                    type="number"
                    min={0}
                    value={poDiskon}
                    onChange={(e) => setPODiskon(parseFloat(e.target.value) || 0)}
                    className="w-32 h-7 text-right"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span>PPN (%)</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={poPpn}
                    onChange={(e) => setPOPpn(parseFloat(e.target.value) || 0)}
                    className="w-20 h-7 text-right"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span>PPN ({poPpn}%)</span>
                  <span>{formatRupiah(ppnAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Grand Total</span>
                  <span>{formatRupiah(grandTotal)}</span>
                </div>
              </div>
            )}

            {/* Catatan */}
            <div>
              <Label>Catatan (opsional)</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                value={poCatatan}
                onChange={(e) => setPOCatatan(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePO(false)}>Batal</Button>
            <Button onClick={handleCreatePO} disabled={createPOMut.isPending}>
              {createPOMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Buat PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === SUPPLIER DIALOG === */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kelola Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Add supplier form */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tambah Supplier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Kode</Label>
                    <Input
                      value={suppForm.kode}
                      onChange={(e) => setSuppForm({ ...suppForm, kode: e.target.value })}
                      placeholder="SUP001"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nama</Label>
                    <Input
                      value={suppForm.nama}
                      onChange={(e) => setSuppForm({ ...suppForm, nama: e.target.value })}
                      placeholder="PT Kimia Farma"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Telepon</Label>
                    <Input
                      value={suppForm.telepon}
                      onChange={(e) => setSuppForm({ ...suppForm, telepon: e.target.value })}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kota</Label>
                    <Input
                      value={suppForm.kota}
                      onChange={(e) => setSuppForm({ ...suppForm, kota: e.target.value })}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleCreateSupplier}
                  disabled={createSuppMut.isPending}
                  className="w-full"
                >
                  {createSuppMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Tambah Supplier
                </Button>
              </CardContent>
            </Card>

            {/* Supplier list */}
            <div className="space-y-2">
              {suppliers.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 border rounded-md text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{s.kode}</span>
                    <span className="font-medium">{s.nama}</span>
                    {s.kota && <span className="text-muted-foreground ml-1">— {s.kota}</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={async () => {
                      if (!confirm(`Hapus supplier "${s.nama}"?`)) return
                      try {
                        await deleteSuppMut.mutateAsync(s.id)
                        toast.success('Supplier dihapus')
                      } catch {
                        toast.error('Gagal menghapus supplier')
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              ))}
              {suppliers.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">Belum ada supplier</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
